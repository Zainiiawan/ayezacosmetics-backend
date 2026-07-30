import express, { Request, Response } from 'express';
import { validate } from '../middleware/validate';
import { adminOnly } from '../middleware/auth';
import { createCouponSchema, applyCouponSchema } from '../shared';
import { Coupon } from '../models/Coupon';
import { NotFoundError, ForbiddenError } from '../utils/errors';

const router = express.Router();

router.get('/', adminOnly, async (_req: Request, res: Response) => {
  const coupons = await Coupon.find({}).sort({ createdAt: -1 }).limit(500);
  res.json({ success: true, message: 'Coupons fetched', data: coupons });
});

router.post('/', adminOnly, validate(createCouponSchema), async (req: Request, res: Response) => {
  const created = await Coupon.create(req.body);
  res.status(201).json({ success: true, message: 'Coupon created', data: created });
});

router.put('/:couponId', adminOnly, validate(createCouponSchema.partial()), async (req: Request, res: Response) => {
  const { couponId } = req.params;
  const updated = await Coupon.findByIdAndUpdate(couponId, req.body, { new: true, runValidators: true });
  if (!updated) throw new NotFoundError('Coupon');
  res.json({ success: true, message: 'Coupon updated', data: updated });
});

router.delete('/:couponId', adminOnly, async (req: Request, res: Response) => {
  const { couponId } = req.params;
  const updated = await Coupon.findByIdAndUpdate(couponId, { isActive: false }, { new: true });
  if (!updated) throw new NotFoundError('Coupon');
  res.json({ success: true, message: 'Coupon disabled' });
});

router.post('/validate', validate(applyCouponSchema), async (req: Request, res: Response) => {
  const { code, cartTotal } = req.body;
  const coupon = await Coupon.findOne({ code: String(code).toUpperCase() });
  if (!coupon) return res.json({ success: true, message: 'Coupon validation', data: { isValid: false, discount: 0 } });

  if (!coupon.isValid()) return res.json({ success: true, message: 'Coupon validation', data: { isValid: false, discount: 0 } });

  // For buy_x_get_y we need cart context; frontend can still use subtotal-only validation for percentage/fixed.
  const discount = coupon.type === 'free_shipping' ? 0 : coupon.calculateDiscount(cartTotal);

  res.json({
    success: true,
    message: 'Coupon validation',
    data: { isValid: true, discount, coupon },
  });
});

export default router;

