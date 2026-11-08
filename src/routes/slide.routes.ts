import express, { Request, Response } from 'express';
import { z } from 'zod';
import { adminOnly } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { Slide } from '../models/Slide';
import { NotFoundError } from '../utils/errors';

const router = express.Router();

const imageSchema = z.object({
  url: z.string().url(),
  publicId: z.string().optional(),
});

// links are either a page on the store ("/shop") or a full https address
const linkSchema = z
  .string()
  .max(300)
  .refine((v) => v === '' || v.startsWith('/') || /^https?:\/\//.test(v), 'Link must start with / or http');

const slideSchema = z.object({
  image: imageSchema,
  mobileImage: imageSchema.nullable().optional(),
  title: z.string().max(120).optional(),
  subtitle: z.string().max(300).optional(),
  buttonText: z.string().max(40).optional(),
  link: linkSchema.optional(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const reorderSchema = z.object({
  ids: z.array(z.string()).min(1),
});

// GET active slides (public, for the homepage)
router.get('/', async (_req: Request, res: Response) => {
  const slides = await Slide.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
  res.json({ success: true, message: 'Slides fetched', data: slides });
});

// GET every slide, hidden ones included (Admin)
router.get('/all', adminOnly, async (_req: Request, res: Response) => {
  const slides = await Slide.find().sort({ order: 1, createdAt: 1 });
  res.json({ success: true, message: 'Slides fetched', data: slides });
});

// POST create a slide (Admin); new slides go to the end
router.post('/', adminOnly, validate(slideSchema), async (req: Request, res: Response) => {
  const { mobileImage, ...rest } = req.body;
  const last = await Slide.findOne().sort({ order: -1 });
  const slide = await Slide.create({
    ...rest,
    ...(mobileImage ? { mobileImage } : {}),
    order: req.body.order ?? (last ? last.order + 1 : 0),
  });
  res.status(201).json({ success: true, message: 'Slide created', data: slide });
});

// PUT reorder slides (Admin): ids in the new order
router.put('/reorder', adminOnly, validate(reorderSchema), async (req: Request, res: Response) => {
  const ids: string[] = req.body.ids;
  await Promise.all(ids.map((id, order) => Slide.updateOne({ _id: id }, { order })));
  const slides = await Slide.find().sort({ order: 1, createdAt: 1 });
  res.json({ success: true, message: 'Slides reordered', data: slides });
});

// PUT update a slide (Admin)
router.put('/:id', adminOnly, validate(slideSchema.partial()), async (req: Request, res: Response) => {
  const { mobileImage, ...rest } = req.body;
  const update: Record<string, unknown> = { ...rest };
  const unset: Record<string, 1> = {};
  if (mobileImage === null) unset.mobileImage = 1;
  else if (mobileImage) update.mobileImage = mobileImage;
  const slide = await Slide.findByIdAndUpdate(
    req.params.id,
    { $set: update, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
    { new: true, runValidators: true }
  );
  if (!slide) throw new NotFoundError('Slide');
  res.json({ success: true, message: 'Slide updated', data: slide });
});

// DELETE a slide (Admin)
router.delete('/:id', adminOnly, async (req: Request, res: Response) => {
  const slide = await Slide.findByIdAndDelete(req.params.id);
  if (!slide) throw new NotFoundError('Slide');
  res.json({ success: true, message: 'Slide deleted', data: null });
});

export default router;
