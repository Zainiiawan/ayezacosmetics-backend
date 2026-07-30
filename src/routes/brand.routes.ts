import express, { Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { adminOnly } from '../middleware/auth';
import { createBrandSchema } from '../shared';
import { Brand } from '../models/Category';
import { NotFoundError } from '../utils/errors';

const router = express.Router();

router.get('/', async (_req: Request, res: Response) => {
  const brands = await Brand.find({ isActive: true }).sort({ createdAt: -1 });
  return res.json({ success: true, message: 'Brands fetched', data: brands });
});

router.get('/:slug', async (req: Request, res: Response) => {
  const { slug } = req.params;
  const brand = await Brand.findOne({ slug, isActive: true });
  if (!brand) throw new NotFoundError('Brand');
  res.json({ success: true, message: 'Brand fetched', data: brand });
});

// Admin CRUD
router.post('/', adminOnly, validate(createBrandSchema), async (req: Request, res: Response) => {
  const created = await Brand.create(req.body);
  res.status(201).json({ success: true, message: 'Brand created', data: created });
});

router.put('/:brandId', adminOnly, validate(createBrandSchema.partial()), async (req: Request, res: Response) => {
  const { brandId } = req.params;
  const updated = await Brand.findByIdAndUpdate(brandId, req.body, { new: true, runValidators: true });
  if (!updated) throw new NotFoundError('Brand');
  res.json({ success: true, message: 'Brand updated', data: updated });
});

router.delete('/:brandId', adminOnly, async (req: Request, res: Response) => {
  const { brandId } = req.params;
  const updated = await Brand.findByIdAndUpdate(brandId, { isActive: false }, { new: true });
  if (!updated) throw new NotFoundError('Brand');
  res.json({ success: true, message: 'Brand disabled' });
});

export default router;

