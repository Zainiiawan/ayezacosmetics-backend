import express, { Request, Response } from 'express';
import { z } from 'zod';
import mongoose, { Types } from 'mongoose';
import { authenticate, optionalAuthenticate, adminOnly, requireEmailVerification } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors';
import { Cart } from '../models/Cart';
import { Coupon } from '../models/Coupon';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { User } from '../models/User';
import {
  updateOrderStatusSchema,
  ORDER_STATUS_LABELS,
} from '../shared';
import { sendOrderConfirmationEmail, sendOrderStatusEmail, sendNewOrderNotificationEmail } from '../utils/email';
import { createNotification, notifyAdmins } from '../utils/notifications';
import { Settings } from '../models/Settings';
import { ShippingRate } from '../models/ShippingRate';

const router = express.Router();

const applyProductDiscount = (product: any, basePrice: number): number => {
  const discount = product.discount;
  if (!discount || discount.type == null || discount.value == null) return basePrice;

  const now = new Date();
  const { startDate, endDate, type, value } = discount;
  const active = (!startDate || startDate <= now) && (!endDate || endDate >= now);
  if (!active) return basePrice;
  if (!Number.isFinite(basePrice) || !Number.isFinite(Number(value))) return basePrice;

  if (type === 'percentage') return basePrice * (1 - Number(value) / 100);
  if (type === 'fixed') return Math.max(0, basePrice - Number(value));
  return basePrice;
};


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

const guestInfoSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
});

const checkoutSchema = z.object({
  shippingAddress: shippingAddressSchema,
  billingAddress: shippingAddressSchema.optional(),
  paymentMethod: z.enum(['cod', 'jazzcash', 'easypaisa']),
  couponCode: z.string().min(1).optional(),
  notes: z.string().max(500).optional(),
  guestInfo: guestInfoSchema.optional(),
  items: z.array(z.object({
    productId: z.string(),
    variant: z.string().optional(),
    quantity: z.number().min(1),
  })).optional(),
});

router.post('/', optionalAuthenticate, validate(checkoutSchema), async (req: Request, res: Response) => {
  const userId = req.user?._id;
  const isGuest = !userId;

  const { shippingAddress, billingAddress, paymentMethod, couponCode: couponCodeFromBody, notes, guestInfo, items: itemsFromBody } = req.body;

  if (isGuest && !guestInfo) {
    throw new BadRequestError('Guest info (name, email, phone) is required for guest checkout');
  }

  let finalItems: any[] = [];
  let subtotal = 0;
  let productDiscountTotal = 0;
  let cart: any = null;

  if (itemsFromBody && itemsFromBody.length > 0) {
    // Buy Now or Guest Checkout with direct items
    for (const item of itemsFromBody) {
      const product = await Product.findById(item.productId);
      if (!product || !product.isActive) throw new NotFoundError(`Product ${item.productId} not found`);
      if (product.isComingSoon) throw new BadRequestError(`Product ${product.name} is coming soon and cannot be ordered.`);

      const variant = item.variant
        ? product.variants.find((v: any) => v.sku === item.variant || v.value === item.variant)
        : product.variants.find((v: any) => v.sku === product.sku) ?? null;

      const originalPrice = variant ? variant.price : product.basePrice;
      const salePrice = applyProductDiscount(product, originalPrice);
      const productDiscount = Math.max(0, originalPrice - salePrice);
      const lineTotal = salePrice * item.quantity;
      subtotal += lineTotal;
      productDiscountTotal += (productDiscount * item.quantity);

      finalItems.push({
        product: product._id,
        variant: item.variant,
        name: product.name,
        image: variant && variant.images && variant.images.length > 0 ? variant.images[0].url : (product.images[0]?.url || ''),
        price: salePrice,
        originalPrice,
        salePrice,
        productDiscount,
        quantity: item.quantity,
        total: lineTotal,
        lineTotal,
        sku: variant ? variant.sku : product.sku,
      });
    }
  } else {
    // Normal Cart Checkout (must be logged in)
    if (!userId) throw new BadRequestError('Must provide items for guest checkout');
    cart = await Cart.findOne({ user: userId });
    if (!cart || (cart.items ?? []).length === 0) throw new BadRequestError('Cart is empty');
    
    for (const item of cart.items) {
      const product = await Product.findById(item.product);
      if (!product || !product.isActive) throw new NotFoundError(`Product not found`);
      if (product.isComingSoon) throw new BadRequestError(`Product ${product.name} is coming soon and cannot be ordered.`);
      
      const variant = item.variant
        ? product.variants.find((v: any) => v.sku === item.variant || v.value === item.variant)
        : product.variants.find((v: any) => v.sku === product.sku) ?? null;

      const originalPrice = variant ? variant.price : product.basePrice;
      const salePrice = applyProductDiscount(product, originalPrice);
      const productDiscount = Math.max(0, originalPrice - salePrice);
      const lineTotal = salePrice * item.quantity;
      subtotal += lineTotal;
      productDiscountTotal += (productDiscount * item.quantity);

      finalItems.push({
        product: product._id,
        variant: item.variant,
        name: product.name,
        image: item.image || (variant && variant.images && variant.images.length > 0 ? variant.images[0].url : (product.images[0]?.url || '')),
        price: salePrice,
        originalPrice,
        salePrice,
        productDiscount,
        quantity: item.quantity,
        total: lineTotal,
        lineTotal,
        sku: item.sku || (variant ? variant.sku : product.sku),
      });
    }
  }

  if (finalItems.length === 0) throw new BadRequestError('No items to checkout');

  const couponCode = couponCodeFromBody ?? (cart ? cart.couponCode : undefined);

  // Dynamic Shipping Calculation
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
  }

  let shippingCost = settings.defaultShippingCost;
  const city = shippingAddress.city.trim().toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase());
  
  const cityRate = await ShippingRate.findOne({ city, isActive: true });
  if (cityRate) {
    shippingCost = cityRate.cost;
  }

  if (subtotal >= settings.freeShippingThreshold) {
    shippingCost = 0;
  }
  let couponDiscount = 0;
  let coupon: any = null;

  if (couponCode) {
    coupon = await Coupon.findOne({ code: String(couponCode).toUpperCase() });
    if (!coupon) throw new NotFoundError('Coupon');
    if (!coupon.isValid()) throw new ForbiddenError('Coupon is not valid');

    if (coupon.perUserLimit && coupon.usedBy?.length) {
      if (userId) {
        const alreadyUsed = (coupon.usedBy ?? []).some((u: any) => String(u) === String(userId));
        if (alreadyUsed) throw new ForbiddenError('Coupon usage limit reached for this user');
      }
    }

    if (coupon.type === 'free_shipping') {
      shippingCost = 0;
    } else {
      const cartItemsForDiscount = finalItems.map((i: any) => ({
        productId: new Types.ObjectId(i.product),
        quantity: i.quantity,
        unitPrice: i.price,
      }));
      let eligibleCartTotal = subtotal;
      let eligibleCartItems = cartItemsForDiscount;
      if (coupon.applicableProducts && coupon.applicableProducts.length > 0) {
        const allowed = new Set(coupon.applicableProducts.map((id: any) => String(id)));
        eligibleCartItems = cartItemsForDiscount.filter((i: any) => allowed.has(i.productId.toString()));
        eligibleCartTotal = finalItems
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
    customerType: isGuest ? 'guest' : 'registered',
    customerName: isGuest ? `${guestInfo?.firstName} ${guestInfo?.lastName}` : `${req.user?.firstName} ${req.user?.lastName}`,
    customerEmail: isGuest ? guestInfo?.email : req.user?.email,
    customerPhone: isGuest ? guestInfo?.phone : shippingAddress.phone,
    items: finalItems.map((i: any) => ({
      product: new Types.ObjectId(i.product),
      variant: i.variant,
      name: i.name,
      image: i.image,
      price: i.price,
      originalPrice: i.originalPrice,
      salePrice: i.salePrice,
      productDiscount: i.productDiscount,
      quantity: i.quantity,
      total: i.total,
      lineTotal: i.lineTotal,
      sku: i.sku,
    })),
    shippingAddress,
    billingAddress,
    subtotal,
    shippingCost,
    productDiscount: productDiscountTotal,
    discount: couponDiscount,
    manualDiscount: 0,
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

  if (couponCode && coupon) {
    coupon.usageCount = (coupon.usageCount ?? 0) + 1;
    if (userId) {
      coupon.usedBy = [...(coupon.usedBy ?? []), new Types.ObjectId(String(userId))];
    }
    await coupon.save();
  }

  if (cart) {
    cart.items = [];
    cart.subtotal = 0;
    cart.itemCount = 0;
    cart.couponCode = undefined;
    cart.couponDiscount = 0;
    await cart.save();
  }

  try {
    await sendOrderConfirmationEmail(order.customerEmail!, order.customerName!.split(' ')[0], order);
  } catch {
    // never fail checkout on email
  }

  if (userId) {
    await createNotification({
      userId: String(userId),
      type: 'order_placed',
      title: 'Order Placed',
      message: `Your order ${order.orderNumber} has been placed successfully.`,
      orderId: order._id,
      link: `/account/orders/${order._id}`,
    });
  }

  try {
    await sendNewOrderNotificationEmail('ayezacosmtics@gmail.com', order);
  } catch {
    // ignore
  }

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
  const orderEmail = (orderUser?.email || order.customerEmail || '').toLowerCase();
  if (orderEmail !== email) {
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


const adminEditSchema = z.object({
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  shippingAddress: shippingAddressSchema.optional(),
  items: z.array(z.object({
    product: z.string(),
    variant: z.string().optional(),
    quantity: z.number().min(1),
  })).optional(),
  shippingCost: z.number().min(0).optional(),
  manualDiscount: z.number().min(0).optional(),
  manualDiscountReason: z.string().optional(),
});

router.patch(
  '/:orderId/admin-edit',
  adminOnly,
  validate(adminEditSchema),
  async (req: Request, res: Response) => {
    const orderId = req.params.orderId;
    const {
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      items,
      shippingCost,
      manualDiscount,
      manualDiscountReason,
    } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await Order.findById(orderId).session(session);
      if (!order) throw new NotFoundError('Order');

      const oldValues = order.toObject();

      let hasChanges = false;
      const changes: any = {};

      if (customerName !== undefined && customerName !== order.customerName) { order.customerName = customerName; changes.customerName = customerName; hasChanges = true; }
      if (customerEmail !== undefined && customerEmail !== order.customerEmail) { order.customerEmail = customerEmail; changes.customerEmail = customerEmail; hasChanges = true; }
      if (customerPhone !== undefined && customerPhone !== order.customerPhone) { order.customerPhone = customerPhone; changes.customerPhone = customerPhone; hasChanges = true; }
      
      if (shippingAddress) {
        order.shippingAddress = { ...order.shippingAddress, ...shippingAddress };
        changes.shippingAddress = shippingAddress;
        hasChanges = true;
      }

      if (items) {
        // Need to sync stock for removed/added items
        const oldItems = order.items;
        
        // Return stock for all old items
        for (const oldItem of oldItems) {
          const product = await Product.findById(oldItem.product).session(session);
          if (product) {
            if (oldItem.variant) {
              const variant = product.variants.find((v: any) => v.sku === oldItem.variant || v.value === oldItem.variant || v.sku === oldItem.sku);
              if (variant) variant.stock = (variant.stock ?? 0) + oldItem.quantity;
            }
            product.stock = (product.stock ?? 0) + oldItem.quantity;
            product.soldCount = Math.max(0, (product.soldCount ?? 0) - oldItem.quantity);
            await product.save({ session });
          }
        }

        // Build new items and deduct stock
        let newSubtotal = 0;
        let newProductDiscountTotal = 0;
        const newOrderItems = [];

        for (const inputItem of items) {
          const product = await Product.findById(inputItem.product).session(session);
          if (!product || !product.isActive) throw new BadRequestError(`Product ${inputItem.product} is invalid`);

          const variant = inputItem.variant
            ? product.variants.find((v: any) => v.sku === inputItem.variant || v.value === inputItem.variant)
            : product.variants.find((v: any) => v.sku === product.sku) ?? null;

          const originalPrice = variant ? variant.price : product.basePrice;
          const salePrice = applyProductDiscount(product, originalPrice);
          const productDiscount = Math.max(0, originalPrice - salePrice);
          const lineTotal = salePrice * inputItem.quantity;

          newSubtotal += lineTotal;
          newProductDiscountTotal += (productDiscount * inputItem.quantity);

          newOrderItems.push({
            product: product._id,
            variant: inputItem.variant,
            name: product.name,
            image: variant && variant.images && variant.images.length > 0 ? variant.images[0].url : (product.images[0]?.url || ''),
            price: salePrice,
            originalPrice,
            salePrice,
            productDiscount,
            quantity: inputItem.quantity,
            total: lineTotal,
            lineTotal,
            sku: variant ? variant.sku : product.sku,
          });

          // Deduct stock
          if (variant) {
            if (variant.stock < inputItem.quantity) throw new BadRequestError(`Insufficient stock for ${product.name}`);
            variant.stock -= inputItem.quantity;
          }
          if (product.stock < inputItem.quantity) {
             const sumVariantStock = (product.variants ?? []).reduce((sum: number, v: any) => sum + (v.stock ?? 0), 0);
             if (sumVariantStock < inputItem.quantity) throw new BadRequestError(`Insufficient stock for ${product.name}`);
             product.stock = Math.max(0, sumVariantStock);
          } else {
             product.stock -= inputItem.quantity;
          }
          product.soldCount = (product.soldCount ?? 0) + inputItem.quantity;
          await product.save({ session });
        }

        order.items = newOrderItems as any;
        order.subtotal = newSubtotal;
        order.productDiscount = newProductDiscountTotal;
        changes.items = newOrderItems;
        hasChanges = true;
      }

      if (shippingCost !== undefined && shippingCost !== order.shippingCost) {
        order.shippingCost = shippingCost;
        changes.shippingCost = shippingCost;
        hasChanges = true;
      }

      if (manualDiscount !== undefined && manualDiscount !== order.manualDiscount) {
        order.manualDiscount = manualDiscount;
        changes.manualDiscount = manualDiscount;
        hasChanges = true;
      }
      
      if (manualDiscountReason !== undefined && manualDiscountReason !== order.manualDiscountReason) {
        order.manualDiscountReason = manualDiscountReason;
      }

      // Final recalculation
      const safeSubtotal = order.subtotal || 0;
      const safeCoupon = order.couponDiscount || 0;
      const safeManual = order.manualDiscount || 0;
      const safeShipping = order.shippingCost || 0;
      const safeTax = order.tax || 0;

      if (safeManual > safeSubtotal) throw new BadRequestError('Manual discount cannot exceed subtotal');

      const grandTotal = Math.max(0, safeSubtotal - safeCoupon - safeManual + safeShipping + safeTax);
      order.total = grandTotal;

      if (hasChanges) {
        order.auditLog = [
          ...(order.auditLog ?? []),
          {
            timestamp: new Date(),
            adminUser: req.user!._id,
            adminName: `${req.user!.firstName} ${req.user!.lastName}`,
            actionPerformed: 'Order Edited',
            oldValues,
            newValues: order.toObject(),
          }
        ] as any;
      }

      await order.save({ session });
      await session.commitTransaction();
      session.endSession();

      // Async email out of transaction
      if (hasChanges) {
        const customerEmailAddress = order.customerEmail || (order.user ? (await User.findById(order.user))?.email : null);
        if (customerEmailAddress) {
          try {
             // We can use the existing order status email or create a new sendOrderUpdateEmail.
             // Using sendOrderConfirmationEmail as a fallback to send the updated receipt.
             await sendOrderConfirmationEmail(customerEmailAddress, order.customerName ? order.customerName.split(' ')[0] : 'Customer', order);
          } catch (e) {
             console.error('Failed to send update email', e);
          }
        }
      }

      return res.json({ success: true, message: 'Order updated successfully', data: order });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
);

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

    const previousStatus = order.status;

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

    if ((status === 'cancelled' || status === 'refunded') && previousStatus !== 'cancelled' && previousStatus !== 'refunded') {
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product) {
          if (item.variant) {
            const variant = product.variants.find(
              (v: any) => v.sku === item.variant || v.value === item.variant || v.sku === item.sku
            );
            if (variant) {
              variant.stock = (variant.stock ?? 0) + item.quantity;
            }
          }
          product.stock = (product.stock ?? 0) + item.quantity;
          product.soldCount = Math.max(0, (product.soldCount ?? 0) - item.quantity);
          await product.save();
        }
      }
    }

    await order.save();

    const label = ORDER_STATUS_LABELS[order.status] || order.status;
    let notifType: 'order_processing' | 'order_shipped' | 'order_delivered' | 'order_cancelled' | 'general' =
      'general';
    if (order.status === 'processing' || order.status === 'confirmed') notifType = 'order_processing';
    if (order.status === 'shipped' || order.status === 'out_for_delivery') notifType = 'order_shipped';
    if (order.status === 'delivered') notifType = 'order_delivered';
    if (order.status === 'cancelled') notifType = 'order_cancelled';

    if (order.user) {
      try {
        await createNotification({
          userId: String(order.user),
          type: notifType,
          title: label,
          message: message || `Your order ${order.orderNumber} is now ${label}.`,
          orderId: order._id,
          link: `/account/orders/${order._id}`,
        });
      } catch (err) {
        console.error('Notification error:', err);
      }
    }

    let customerEmail = '';
    let customerFirstName = '';

    if (order.user) {
      const user = await User.findById(order.user);
      if (user) {
        customerEmail = user.email;
        customerFirstName = user.firstName;
      }
    } else {
      customerEmail = order.customerEmail || '';
      customerFirstName = order.customerName ? order.customerName.split(' ')[0] : '';
    }

    if (customerEmail && customerFirstName) {
      try {
        await sendOrderStatusEmail(
          customerEmail,
          customerFirstName,
          order.orderNumber,
          order._id.toString(),
          label,
          order
        );
      } catch (err) {
        console.error('Email sending error:', err);
      }
    }

    res.json({ success: true, message: 'Order status updated', data: order });
  }
);

router.delete('/:orderId', adminOnly, async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const order = await Order.findById(orderId);
  if (!order) throw new NotFoundError('Order');

  // Restore stock if it wasn't already cancelled/refunded
  if (order.status !== 'cancelled' && order.status !== 'refunded') {
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        if (item.variant) {
          const variant = product.variants.find(
            (v: any) => v.sku === item.variant || v.value === item.variant || v.sku === item.sku
          );
          if (variant) {
            variant.stock = (variant.stock ?? 0) + item.quantity;
          }
        }
        product.stock = (product.stock ?? 0) + item.quantity;
        product.soldCount = Math.max(0, (product.soldCount ?? 0) - item.quantity);
        await product.save();
      }
    }
  }

  await Order.findByIdAndDelete(orderId);
  res.json({ success: true, message: 'Order deleted successfully', data: { _id: orderId } });
});

export default router;
