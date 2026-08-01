import express, { Request, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { Product } from '../models/Product';
import { Cart } from '../models/Cart';
import { Coupon } from '../models/Coupon';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors';

const router = express.Router();

const addItemSchema = z.object({
  productId: z.string().min(1),
  variant: z.string().optional(),
  quantity: z.number().int().min(1),
});

const updateQtySchema = z.object({
  quantity: z.number().int().min(1),
});

const couponApplySchema = z.object({
  code: z.string().min(1).max(30),
});

type CartItemInput = z.infer<typeof addItemSchema>;

const getMainImage = (product: any) => {
  const main = (product.images ?? []).find((i: any) => i.isMain);
  return main ?? (product.images ?? [])[0];
};

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

const computeCartTotals = (items: any[]) => {
  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  return { subtotal, itemCount };
};

const resolveCartItem = async (input: CartItemInput) => {
  const product = await Product.findById(input.productId).populate('category subcategory brand');
  if (!product || !product.isActive) throw new NotFoundError('Product');
  if (product.isComingSoon) throw new BadRequestError('This product is coming soon.');

  const variant =
    input.variant
      ? product.variants.find((v: any) => v.sku === input.variant || v.value === input.variant || v.name === input.variant)
      : product.variants.find((v: any) => v.isActive) ?? product.variants[0];

  const chosenVariant = variant ?? null;

  const qtyRequested = input.quantity;
  const availableStock = chosenVariant ? chosenVariant.stock : product.stock;
  const maxQuantity = availableStock;
  if (availableStock <= 0) throw new BadRequestError('Selected item is out of stock');
  if (qtyRequested > maxQuantity) throw new BadRequestError(`Quantity exceeds available stock (max ${maxQuantity})`);

  const unitBasePrice = chosenVariant ? chosenVariant.price : product.basePrice;
  const unitPrice = applyProductDiscount(product, unitBasePrice);
  const compareAtPrice = chosenVariant?.compareAtPrice ?? product.compareAtPrice ?? unitBasePrice;

  const mainImage = getMainImage(product);
  const image = chosenVariant?.images?.[0] ? chosenVariant.images[0] : mainImage;

  return {
    productId: product._id,
    variantSku: chosenVariant?.sku ?? undefined,
    name: product.name,
    image: image?.url,
    price: unitPrice,
    compareAtPrice,
    quantity: qtyRequested,
    sku: chosenVariant?.sku ?? product.sku,
    slug: product.slug,
    maxQuantity,
    total: unitPrice * qtyRequested,
  };
};

router.get('/', authenticate, async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    return res.json({
      success: true,
      message: 'Empty cart',
      data: {
        items: [],
        subtotal: 0,
        itemCount: 0,
        couponCode: undefined,
        couponDiscount: 0,
      },
    });
  }
  return res.json({ success: true, message: 'Cart fetched', data: cart });
});

router.post('/items', authenticate, validate(addItemSchema), async (req: Request, res: Response) => {
  const { productId, variant, quantity } = req.body;
  const userId = req.user!._id;

  const newItem = await resolveCartItem({ productId, variant, quantity });

  const cart = await Cart.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, items: [], subtotal: 0, itemCount: 0, couponDiscount: 0 } },
    { new: true, upsert: true }
  );

  const variantKey = newItem.variantSku ?? '';
  const existingIdx = (cart.items ?? []).findIndex(
    (i: any) => String(i.product) === String(newItem.productId) && String(i.variant ?? '') === variantKey
  );

  if (existingIdx >= 0) {
    const existing = cart.items[existingIdx];
    const mergedQty = existing.quantity + newItem.quantity;
    if (mergedQty > newItem.maxQuantity) throw new BadRequestError(`Quantity exceeds available stock (max ${newItem.maxQuantity})`);
    const updatedQty = mergedQty;
    
    existing.quantity = updatedQty;
    existing.maxQuantity = newItem.maxQuantity;
    existing.price = newItem.price;
    existing.compareAtPrice = newItem.compareAtPrice;
    existing.sku = newItem.sku;
    existing.slug = newItem.slug;
    existing.total = newItem.price * updatedQty;
  } else {
    cart.items = [
      ...(cart.items ?? []),
      {
        product: newItem.productId,
        variant: newItem.variantSku,
        name: newItem.name,
        image: newItem.image,
        price: newItem.price,
        compareAtPrice: newItem.compareAtPrice,
        quantity: newItem.quantity,
        sku: newItem.sku,
        slug: newItem.slug,
        maxQuantity: newItem.maxQuantity,
        total: newItem.total,
      },
    ];
  }

  const totals = computeCartTotals(cart.items ?? []);
  cart.subtotal = totals.subtotal;
  cart.itemCount = totals.itemCount;

  // Recompute coupon discount (if present).
  if (cart.couponCode) {
    const coupon = await Coupon.findOne({ code: cart.couponCode });
    if (coupon && coupon.isValid()) {
      const cartItemsForDiscount = await Promise.all(
        (cart.items ?? []).map(async (i: any) => ({
          productId: new Types.ObjectId(i.product),
          quantity: i.quantity,
          unitPrice: i.price,
        }))
      );
      cart.couponDiscount =
        coupon.calculateDiscount(cart.subtotal, { cartItems: cartItemsForDiscount }) ?? 0;
    } else {
      cart.couponDiscount = 0;
      cart.couponCode = undefined;
    }
  }

  await cart.save();
  return res.json({ success: true, message: 'Item added to cart', data: cart });
});

router.patch('/items/:productId', authenticate, validate(updateQtySchema), async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { quantity } = req.body as any;

  const userId = req.user!._id;
  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw new NotFoundError('Cart');

  const itemIdx = (cart.items ?? []).findIndex((i: any) => String(i.product) === String(productId));
  if (itemIdx < 0) throw new NotFoundError('Cart item');

  const item = cart.items[itemIdx] as any;
  if (quantity > item.maxQuantity) throw new BadRequestError(`Quantity exceeds available stock (max ${item.maxQuantity})`);

  item.quantity = quantity;
  item.total = item.price * quantity;

  const totals = computeCartTotals(cart.items ?? []);
  cart.subtotal = totals.subtotal;
  cart.itemCount = totals.itemCount;

  if (cart.couponCode) {
    const coupon = await Coupon.findOne({ code: cart.couponCode });
    if (coupon && coupon.isValid()) {
      const cartItemsForDiscount = await Promise.all(
        (cart.items ?? []).map(async (i: any) => ({
          productId: new Types.ObjectId(i.product),
          quantity: i.quantity,
          unitPrice: i.price,
        }))
      );
      cart.couponDiscount =
        coupon.calculateDiscount(cart.subtotal, { cartItems: cartItemsForDiscount }) ?? 0;
    }
  }

  await cart.save();
  return res.json({ success: true, message: 'Cart updated', data: cart });
});

router.delete('/items/:productId', authenticate, async (req: Request, res: Response) => {
  const { productId } = req.params;
  const userId = req.user!._id;

  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw new NotFoundError('Cart');

  cart.items = (cart.items ?? []).filter((i: any) => String(i.product) !== String(productId));
  const totals = computeCartTotals(cart.items ?? []);
  cart.subtotal = totals.subtotal;
  cart.itemCount = totals.itemCount;
  cart.couponDiscount = 0;
  cart.couponCode = undefined;

  await cart.save();
  return res.json({ success: true, message: 'Item removed', data: cart });
});

router.delete('/', authenticate, async (req: Request, res: Response) => {
  const cart = await Cart.findOne({ user: req.user!._id });
  if (!cart) {
    return res.json({
      success: true,
      message: 'Cart cleared',
      data: { items: [], subtotal: 0, itemCount: 0, couponDiscount: 0 },
    });
  }

  cart.items = [];
  cart.subtotal = 0;
  cart.itemCount = 0;
  cart.couponDiscount = 0;
  cart.couponCode = undefined;
  await cart.save();
  return res.json({ success: true, message: 'Cart cleared', data: cart });
});

router.post('/coupon', authenticate, validate(couponApplySchema), async (req: Request, res: Response) => {
  const code = String(req.body.code).trim().toUpperCase();
  const coupon = await Coupon.findOne({ code });
  if (!coupon) throw new NotFoundError('Coupon');
  if (!coupon.isValid()) throw new ForbiddenError('Coupon is not valid');

  const cart = await Cart.findOne({ user: req.user!._id });
  if (!cart) throw new NotFoundError('Cart');
  if ((cart.items ?? []).length === 0) throw new BadRequestError('Cart is empty');

  const eligibleItems = await Promise.all(
    (cart.items ?? []).map(async (i: any) => ({
      productId: new Types.ObjectId(i.product),
      quantity: i.quantity,
      unitPrice: i.price,
      // total is not needed for buy_x_get_y calculation
    }))
  );

  const discount = coupon.type === 'free_shipping' ? 0 : coupon.calculateDiscount(cart.subtotal, { cartItems: eligibleItems });
  cart.couponCode = code;
  cart.couponDiscount = discount ?? 0;

  await cart.save();
  res.json({ success: true, message: 'Coupon applied', data: cart });
});

export default router;

