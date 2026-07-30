import express, { Request, Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { adminOnly } from '../middleware/auth';
import { createCategorySchema } from '../shared';
import { Category, Subcategory } from '../models/Category';
import { Product } from '../models/Product';
import { NotFoundError } from '../utils/errors';

const router = express.Router();

const createSubcategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  image: z
    .object({
      url: z.string().url(),
      publicId: z.string(),
      alt: z.string().optional(),
    })
    .optional(),
  isActive: z.boolean().optional().default(true),
  order: z.number().int().optional().default(0),
});

router.get('/', async (_req: Request, res: Response) => {
  const categories = await Category.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
  const categoryIds = categories.map((c) => c._id);

  const counts = await Product.aggregate([
    { $match: { category: { $in: categoryIds }, isActive: true } },
    { $group: { _id: '$category', productCount: { $sum: 1 } } },
  ]);

  const countMap = new Map(counts.map((c) => [String(c._id), c.productCount]));

  res.json({
    success: true,
    message: 'Categories fetched',
    data: categories.map((c) => ({ ...c.toJSON(), productCount: countMap.get(String(c._id)) ?? 0 })),
  });
});

router.get('/:slug', async (req: Request, res: Response) => {
  const { slug } = req.params;
  const category = await Category.findOne({ slug, isActive: true });
  if (!category) throw new NotFoundError('Category');

  const subcategories = await Subcategory.find({ category: category._id, isActive: true }).sort({ order: 1, createdAt: -1 });

  return res.json({
    success: true,
    message: 'Category fetched',
    data: { category, subcategories },
  });
});

// ============================
// Admin
// ============================
router.post('/', adminOnly, validate(createCategorySchema), async (req: Request, res: Response) => {
  const created = await Category.create(req.body);
  res.status(201).json({ success: true, message: 'Category created', data: created });
});

router.put('/:categoryId', adminOnly, validate(createCategorySchema.partial()), async (req: Request, res: Response) => {
  const { categoryId } = req.params;
  const updated = await Category.findByIdAndUpdate(categoryId, req.body, { new: true, runValidators: true });
  if (!updated) throw new NotFoundError('Category');
  res.json({ success: true, message: 'Category updated', data: updated });
});

router.delete('/:categoryId', adminOnly, async (req: Request, res: Response) => {
  const { categoryId } = req.params;
  const updated = await Category.findByIdAndUpdate(categoryId, { isActive: false }, { new: true });
  if (!updated) throw new NotFoundError('Category');
  res.json({ success: true, message: 'Category disabled' });
});

router.post(
  '/:categoryId/subcategories',
  adminOnly,
  validate(createSubcategorySchema),
  async (req: Request, res: Response) => {
    const categoryId = Array.isArray(req.params.categoryId)
      ? req.params.categoryId[0]
      : req.params.categoryId;
    const category = await Category.findById(categoryId);
    if (!category || !category.isActive) throw new NotFoundError('Category');

    const created = await Subcategory.create({
      ...req.body,
      category: new Types.ObjectId(categoryId),
    });

    res.status(201).json({ success: true, message: 'Subcategory created', data: created });
  }
);

export default router;

