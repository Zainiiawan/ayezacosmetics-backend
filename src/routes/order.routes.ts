import express, { Request, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { authenticate, adminOnly, requireEmailVerification } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors';
import { Cart } from '../models/Cart';
import { Coupon } from '../models/Coupon';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { User } from '../models/User';
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_COST,
  updateOrderStatusSchema,
  ORDER_STATUS_LABELS,
} from '../shared';
import { sendOrderConfirmationEmail, sendOrderStatusEmail } from '../utils/email';
import { createNotification, notifyAdmins } from '../utils/notifications';

const router = express.Router();

const shippingAddressSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(1),
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(1),
});

const checkoutSchema = z.object({
  shippingAddress: shippingAddressSchema,
  billingAddress: shippingAddressSchema.optional(),
  paymentMethod: z.enum(['cod', 'jazzcash', 'easypaisa']),
  couponCode: z.string().min(1).optional(),
  notes: z.string().max(500).optional(),
});

router.post('/', authenticate, requireEmailVerification, validate(checkoutSchema), async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const cart = await Cart.findOne({ user: userId });
  if (!cart || (cart.items ?? []).length === 0) throw new BadRequestError('Cart is empty');

  const { shippingAddress, billingAddress, paymentMethod, couponCode: couponCodeFromBody, notes } = req.body;
  const couponCode = couponCodeFromBody ?? cart.couponCode;
  const subtotal = cart.subtotal ?? 0;

  let shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  let couponDiscount = 0;

  if (couponCode) {
    const coupon = await Coupon.findOne({ code: String(couponCode).toUpperCase() });
    if (!coupon) throw new NotFoundError('Coupon');
    if (!coupon.isValid()) throw new ForbiddenError('Coupon is not valid');

    if (coupon.perUserLimit && coupon.usedBy?.length) {
      const alreadyUsed = (coupon.usedBy ?? []).some((u) => String(u) === String(userId));
      if (alreadyUsed) throw new ForbiddenError('Coupon usage limit reached for this user');
    }

    if (coupon.type === 'free_shipping') {
      shippingCost = 0;
    } else {
      const cartItemsForDiscount = (cart.items ?? []).map((i: any) => ({
        productId: new Types.ObjectId(i.product),
        quantity: i.quantity,
        unitPrice: i.price,
      }));
      let eligibleCartTotal = subtotal;
      let eligibleCartItems = cartItemsForDiscount;
      if (coupon.applicableProducts && coupon.applicableProducts.length > 0) {
        const allowed = new Set(coupon.applicableProducts.map((id) => String(id)));
        eligibleCartItems = cartItemsForDiscount.filter((i) => allowed.has(i.productId.toString()));
        eligibleCartTotal = (cart.items ?? [])
          .filter((ci: any) => allowed.has(String(ci.product)))
          .reduce((sum: number, ci: any) => sum + ci.total, 0);
      }
      couponDiscount = coupon.calculateDiscount(eligibleCartTotal, { cartItems: eligibleCartItems }) ?? 0;
    }
  }

  const tax = 0;
  const total = Math.max(0, subtotal + shippingCost + tax - couponDiscount);

  const isCod = paymentMethod === 'cod';
  const initialStatus = isCod ? 'pending_confirmation' : 'pending';
  const initialPaymentStatus = 'pending';
  const initialMessage = isCod
    ? 'Order placed. Awaiting admin confirmation (Cash on Delivery).'
    : `Order placed. Please send payment via ${paymentMethod === 'jazzcash' ? 'JazzCash' : 'Easypaisa'} and submit your transaction proof.`;

  const order = await Order.create({
    user: userId,
    items: (cart.items ?? []).map((i: any) => ({
      product: new Types.ObjectId(i.product),
      variant: i.variant,
      name: i.name,
      image: i.image,
      price: i.price,
      quantity: i.quantity,
      total: i.total,
      sku: i.sku,
    })),
    shippingAddress,
    billingAddress,
    subtotal,
    shippingCost,
    discount: couponDiscount,
    tax,
    total,
    couponCode: couponCode ? String(couponCode).toUpperCase() : undefined,
    couponDiscount,
    paymentMethod,
    paymentStatus: initialPaymentStatus,
    status: initialStatus,
    notes,
    trackingHistory: [
      {
        status: initialStatus,
        message: initialMessage,
        timestamp: new Date(),
      },
    ],
  });

  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (!product || !product.isActive) throw new NotFoundError('Product');

    const variant = item.variant
      ? product.variants.find((v: any) => v.sku === item.variant || v.value === item.variant)
      : product.variants.find((v: any) => v.sku === item.sku) ?? null;

    if (variant) {
      if (variant.stock < item.quantity) {
        throw new BadRequestError(`Insufficient stock for ${product.name}`);
      }
      variant.stock -= item.quantity;
    }

    if (product.stock < item.quantity) {
      const sumVariantStock = (product.variants ?? []).reduce(
        (sum: number, v: any) => sum + (v.stock ?? 0),
        0
      );
      if (sumVariantStock < item.quantity) {
        throw new BadRequestError(`Insufficient stock for ${product.name}`);
      }
      product.stock = Math.max(0, sumVariantStock);
    } else {
      product.stock -= item.quantity;
    }
    product.soldCount = (product.soldCount ?? 0) + item.quantity;
    await product.save();
  }

  if (couponCode) {
    const coupon = await Coupon.findOne({ code: String(couponCode).toUpperCase() });
    if (coupon) {
      coupon.usageCount = (coupon.usageCount ?? 0) + 1;
      coupon.usedBy = [...(coupon.usedBy ?? []), new Types.ObjectId(String(userId))];
      await coupon.save();
    }
  }

  cart.items = [];
  cart.subtotal = 0;
  cart.itemCount = 0;
  cart.couponCode = undefined;
  cart.couponDiscount = 0;
  await cart.save();

  const user = await User.findById(userId);
  if (user) {
    try {
      await sendOrderConfirmationEmail(user.email, user.firstName, order);
    } catch {
      // never fail checkout on email
    }
  }

  await createNotification({
    userId: String(userId),
    type: 'order_placed',
    title: 'Order Placed',
    message: `Your order ${order.orderNumber} has been placed successfully.`,
    orderId: order._id,
    link: `/account/orders/${order._id}`,
  });

  void notifyAdmins({
    type: 'general',
    title: 'New Order',
    message: `New order ${order.orderNumber} — ${paymentMethod.toUpperCase()} — Rs.${total.toLocaleString()}`,
    orderId: order._id,
    link: `/admin/orders`,
  });

  return res.status(201).json({ success: true, message: 'Order created', data: order });
});

router.get('/', authenticate, async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const page = Number((req.query as any).page ?? 1);
  const limit = Number((req.query as any).limit ?? 12);

  const [total, orders] = await Promise.all([
    Order.countDocuments({ user: userId }),
    Order.find({ user: userId }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  return res.json({
    success: true,
    message: 'Orders fetched',
    data: {
      orders,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    },
  });
});

router.get('/admin/all', adminOnly, async (req: Request, res: Response) => {
  const page = Number((req.query as any).page ?? 1);
  const limit = Number((req.query as any).limit ?? 20);
  const status = (req.query as any).status as string | undefined;
  const paymentStatus = (req.query as any).paymentStatus as string | undefined;

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;

  const [total, orders] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter)
      .populate('user', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  return res.json({
    success: true,
    message: 'Admin orders fetched',
    data: {
      orders,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    },
  });
});

router.get('/track/lookup', async (req: Request, res: Response) => {
  const orderNumber = String((req.query as any).orderNumber ?? '').trim();
  const email = String((req.query as any).email ?? '').trim().toLowerCase();

  if (!orderNumber || !email) {
    throw new BadRequestError('Order number and email are required');
  }

  const order = await Order.findOne({ orderNumber })
    .populate('user', 'email firstName lastName')
    .lean();

  if (!order) throw new NotFoundError('Order');

  const orderUser = order.user as { email?: string } | undefined;
  if (!orderUser?.email || orderUser.email.toLowerCase() !== email) {
    throw new ForbiddenError('Order not found for this email');
  }

  res.json({
    success: true,
    message: 'Order tracking fetched',
    data: {
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      total: order.total,
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      items: order.items,
      shippingAddress: order.shippingAddress,
      trackingNumber: order.trackingNumber,
      courierName: order.courierName,
      trackingUrl: order.trackingUrl,
      estimatedDelivery: order.estimatedDelivery,
      dispatchedAt: order.dispatchedAt,
      trackingHistory: order.trackingHistory,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    },
  });
});

router.get('/:orderId', authenticate, async (req: Request, res: Response) => {
  const orderId = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
  const order = await Order.findById(orderId);
  if (!order) throw new NotFoundError('Order');

  const ownerId = String(order.user);
  const requesterId = String(req.user!._id);
  if (ownerId !== requesterId && req.user!.role !== 'admin') {
    throw new ForbiddenError('You do not have access to this order');
  }
  res.json({ success: true, message: 'Order fetched', data: order });
});

router.patch(
  '/:orderId/status',
  adminOnly,
  validate(updateOrderStatusSchema),
  async (req: Request, res: Response) => {
    const orderId = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
    const {
      status,
      message,
      trackingNumber,
      courierName,
      trackingUrl,
      estimatedDelivery,
      dispatchedAt,
      location,
    } = req.body;

    const order = await Order.findById(orderId);
    if (!order) throw new NotFoundError('Order');

    // COD admin approval: pending_confirmation → processing (and mark payment pending until delivery)
    if (order.paymentMethod === 'cod' && order.status === 'pending_confirmation' && status === 'processing') {
      order.status = 'processing';
      order.trackingHistory = [
        ...(order.trackingHistory ?? []),
        {
          status: 'processing',
          message: message || 'COD order approved. Preparing your order.',
          timestamp: new Date(),
          location,
        },
      ];
    } else {
      order.status = status;
      order.trackingHistory = [
        ...(order.trackingHistory ?? []),
        {
          status,
          message: message ?? 'Status updated',
          timestamp: new Date(),
          location,
        },
      ];
    }

    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (courierName) order.courierName = courierName;
    if (trackingUrl) order.trackingUrl = trackingUrl;
    if (estimatedDelivery) order.estimatedDelivery = new Date(estimatedDelivery);
    if (dispatchedAt) order.dispatchedAt = new Date(dispatchedAt);
    if (status === 'shipped' && !order.dispatchedAt) order.dispatchedAt = new Date();

    await order.save();

    const label = ORDER_STATUS_LABELS[order.status] || order.status;
    let notifType: 'order_processing' | 'order_shipped' | 'order_delivered' | 'order_cancelled' | 'general' =
      'general';
    if (order.status === 'processing' || order.status === 'confirmed') notifType = 'order_processing';
    if (order.status === 'shipped' || order.status === 'out_for_delivery') notifType = 'order_shipped';
    if (order.status === 'delivered') notifType = 'order_delivered';
    if (order.status === 'cancelled') notifType = 'order_cancelled';

    await createNotification({
      userId: String(order.user),
      type: notifType,
      title: label,
      message: message || `Your order ${order.orderNumber} is now ${label}.`,
      orderId: order._id,
      link: `/account/orders/${order._id}`,
    });

    const user = await User.findById(order.user);
    if (user) {
      try {
        await sendOrderStatusEmail(
          user.email,
          user.firstName,
          order.orderNumber,
          order._id.toString(),
          label,
          order
        );
      } catch {
        // ignore
      }
    }

    res.json({ success: true, message: 'Order status updated', data: order });
  }
);

export default router;
