import express, { Request, Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { adminOnly } from '../middleware/auth';
import { createProductSchema, productFilterSchema, updateProductSchema } from '../shared';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { Product } from '../models/Product';

const router = express.Router();

const productSortMap: Record<string, any> = {
  price_asc: { basePrice: 1 },
  price_desc: { basePrice: -1 },
  rating: { rating: -1 },
  newest: { createdAt: -1 },
  bestselling: { soldCount: -1 },
  name_asc: { name: 1 },
};

const autocompleteSchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(20).optional().default(8),
});

router.get('/autocomplete', validate(autocompleteSchema, 'query'), async (req: Request, res: Response) => {
  const search = String((req.query as any).search ?? '').trim();
  const limit = Number((req.query as any).limit ?? 8);
  if (!search) {
    return res.json({ success: true, message: 'Autocomplete', data: { items: [] } });
  }

  const items = await Product.find(
    {
      isActive: true,
      $text: { $search: search },
    },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit);

  return res.json({
    success: true,
    message: 'Autocomplete results',
    data: { items: items.map((p) => ({ _id: p._id, name: p.name, slug: p.slug })) },
  });
});

router.get(
  '/',
  validate(productFilterSchema, 'query'),
  async (req: Request, res: Response) => {
    const {
      category,
      subcategory,
      brand,
      minPrice,
      maxPrice,
      rating,
      tags,
      inStock,
      isFeatured,
      search,
      sortBy,
      page,
      limit,
    } = req.query as any;

    const filter: any = { isActive: true };

    if (category) filter.category = new Types.ObjectId(category);
    if (subcategory) filter.subcategory = new Types.ObjectId(subcategory);
    if (brand) filter.brand = new Types.ObjectId(brand);
    if (typeof minPrice === 'number') filter.basePrice = { ...(filter.basePrice ?? {}), $gte: minPrice };
    if (typeof maxPrice === 'number') filter.basePrice = { ...(filter.basePrice ?? {}), $lte: maxPrice };
    if (typeof rating === 'number') filter.rating = { ...(filter.rating ?? {}), $gte: rating };
    if (typeof inStock === 'boolean' && inStock) filter.stock = { $gt: 0 };
    if (typeof isFeatured === 'boolean') filter.isFeatured = isFeatured;
    if (tags) {
      const tagList = String(tags)
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      if (tagList.length > 0) filter.tags = { $in: tagList };
    }

    // Full-text search fallback.
    if (search) {
      filter.$text = { $search: String(search) };
    }

    const sort = sortBy ? productSortMap[sortBy] : { createdAt: -1 };

    const skip = (page - 1) * limit;
    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .populate('category subcategory brand')
        .sort(sort)
        .skip(skip)
        .limit(limit),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return res.json({
      success: true,
      message: 'Products fetched',
      data: {
        products,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  }
);

router.get('/:slug', async (req: Request, res: Response) => {
  const slug = String(req.params.slug);
  const query = Types.ObjectId.isValid(slug) 
    ? { $or: [{ _id: slug }, { slug: slug }], isActive: true }
    : { slug, isActive: true };
  const product = await Product.findOne(query).populate('category subcategory brand');
  if (!product) throw new NotFoundError('Product');

  res.json({ success: true, message: 'Product fetched', data: product });
});

// ============================
// Admin CRUD
// ============================
router.post('/', adminOnly, validate(createProductSchema), async (req: Request, res: Response) => {
  const created = await Product.create(req.body);
  return res.status(201).json({ success: true, message: 'Product created', data: created });
});

router.put('/:productId', adminOnly, validate(updateProductSchema), async (req: Request, res: Response) => {
  const { productId } = req.params;
  const updated = await Product.findByIdAndUpdate(productId, req.body, { new: true, runValidators: true });
  if (!updated) throw new NotFoundError('Product');
  return res.json({ success: true, message: 'Product updated', data: updated });
});

router.delete('/:productId', adminOnly, async (req: Request, res: Response) => {
  const { productId } = req.params;
  const updated = await Product.findByIdAndUpdate(productId, { isActive: false }, { new: true });
  if (!updated) throw new NotFoundError('Product');
  return res.json({ success: true, message: 'Product disabled' });
});

export default router;

