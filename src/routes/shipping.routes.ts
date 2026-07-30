import express, { Request, Response } from 'express';
import { z } from 'zod';
import { adminOnly } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { ShippingRate } from '../models/ShippingRate';
import { NotFoundError, BadRequestError } from '../utils/errors';

const router = express.Router();

const shippingRateSchema = z.object({
  city: z.string().min(1),
  cost: z.number().min(0),
  isActive: z.boolean().optional(),
});

// GET all shipping rates (public - used in checkout to calculate shipping)
router.get('/', async (_req: Request, res: Response) => {
  const rates = await ShippingRate.find().sort({ city: 1 });
  res.json({ success: true, message: 'Shipping rates fetched', data: rates });
});

// POST create shipping rate (Admin)
router.post('/', adminOnly, validate(shippingRateSchema), async (req: Request, res: Response) => {
  const { city, cost, isActive } = req.body;
  
  const existing = await ShippingRate.findOne({ city: { $regex: new RegExp(`^${city}$`, 'i') } });
  if (existing) {
    throw new BadRequestError('Shipping rate for this city already exists');
  }

  const rate = await ShippingRate.create({ city, cost, isActive });
  res.status(201).json({ success: true, message: 'Shipping rate created', data: rate });
});

// PUT update shipping rate (Admin)
router.put('/:id', adminOnly, validate(shippingRateSchema), async (req: Request, res: Response) => {
  const { city, cost, isActive } = req.body;
  const id = req.params.id;

  const existing = await ShippingRate.findOne({
    city: { $regex: new RegExp(`^${city}$`, 'i') },
    _id: { $ne: id },
  });

  if (existing) {
    throw new BadRequestError('Shipping rate for this city already exists');
  }

  const rate = await ShippingRate.findByIdAndUpdate(
    id,
    { city, cost, isActive },
    { new: true, runValidators: true }
  );

  if (!rate) throw new NotFoundError('Shipping Rate');
  res.json({ success: true, message: 'Shipping rate updated', data: rate });
});

// DELETE shipping rate (Admin)
router.delete('/:id', adminOnly, async (req: Request, res: Response) => {
  const rate = await ShippingRate.findByIdAndDelete(req.params.id);
  if (!rate) throw new NotFoundError('Shipping Rate');
  res.json({ success: true, message: 'Shipping rate deleted' });
});

export default router;
