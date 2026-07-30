import express, { Request, Response } from 'express';
import { Types } from 'mongoose';
import { validate } from '../middleware/validate';
import { adminOnly, authenticate, requireEmailVerification } from '../middleware/auth';
import { createReviewSchema, updateReviewModerationSchema } from '../shared';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import { Review } from '../models/Review';
import { Order } from '../models/Order';
import { Product } from '../models/Product';

const router = express.Router();

router.get('/admin/pending', adminOnly, async (_req: Request, res: Response) => {
  const pending = await Review.find({ isApproved: false })
    .populate('user', 'firstName lastName email')
    .populate('product', 'name slug')
    .sort({ createdAt: -1 })
    .limit(200);
  res.json({ success: true, message: 'Pending reviews fetched', data: pending });
});

router.get('/:productId/stats', async (req: Request, res: Response) => {
  const productId = Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId;
  const reviews = await Review.find({ product: productId, isApproved: true });
  const totalReviews = reviews.length;
  const averageRating =
    totalReviews === 0 ? 0 : reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
  for (const r of reviews) {
    const key = r.rating as 1 | 2 | 3 | 4 | 5;
    ratingDistribution[key] += 1;
  }

  res.json({
    success: true,
    message: 'Review stats fetched',
    data: { averageRating, totalReviews, ratingDistribution },
  });
});

router.get('/:productId', async (req: Request, res: Response) => {
  const productId = Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId;

  const reviews = await Review.find({ product: productId, isApproved: true })
    .populate('user', 'firstName lastName avatar')
    .sort({ createdAt: -1 });

  res.json({ success: true, message: 'Reviews fetched', data: reviews });
});

router.post('/', authenticate, requireEmailVerification, validate(createReviewSchema), async (req: Request, res: Response) => {
  const { product, rating, title, body, images } = req.body;
  const userId = req.user!._id;

  const productDoc = await Product.findById(product);
  if (!productDoc || !productDoc.isActive) throw new NotFoundError('Product');

  const hasPurchase = await Order.findOne({
    user: new Types.ObjectId(String(userId)),
    'items.product': new Types.ObjectId(product),
    paymentStatus: { $in: ['paid', 'partially_refunded'] },
    status: { $nin: ['cancelled', 'refunded', 'returned'] },
  });

  const existing = await Review.findOne({ product, user: userId });
  if (existing) throw new BadRequestError('You have already reviewed this product');

  const created = await Review.create({
    product: new Types.ObjectId(product),
    user: new Types.ObjectId(String(userId)),
    order: hasPurchase ? hasPurchase._id : undefined,
    rating,
    title,
    body,
    images,
    isVerifiedPurchase: !!hasPurchase,
    isApproved: false,
  });

  res.status(201).json({ success: true, message: 'Review submitted for moderation', data: created });
});

router.post('/:reviewId/helpful', authenticate, async (req: Request, res: Response) => {
  const reviewId = Array.isArray(req.params.reviewId) ? req.params.reviewId[0] : req.params.reviewId;
  const userId = String(req.user!._id);
  const review = await Review.findById(reviewId);
  if (!review) throw new NotFoundError('Review');

  const already = review.helpfulVoters.some((id) => id.toString() === userId);
  if (already) {
    review.helpfulVoters = review.helpfulVoters.filter((id) => id.toString() !== userId);
    review.helpfulVotes = Math.max(0, review.helpfulVotes - 1);
  } else {
    review.helpfulVoters.push(new Types.ObjectId(userId));
    review.helpfulVotes += 1;
  }
  await review.save();
  res.json({ success: true, message: 'Helpful vote updated', data: review });
});

router.patch(
  '/:reviewId/moderate',
  adminOnly,
  validate(updateReviewModerationSchema),
  async (req: Request, res: Response) => {
    const reviewId = Array.isArray(req.params.reviewId) ? req.params.reviewId[0] : req.params.reviewId;
    const { isApproved, moderationNote } = req.body;

    const review = await Review.findById(reviewId);
    if (!review) throw new NotFoundError('Review');

    review.isApproved = isApproved;
    review.moderationNote = moderationNote;
    await review.save();

    const productId = review.product;
    const agg = await Review.aggregate([
      { $match: { product: productId, isApproved: true } },
      { $group: { _id: '$product', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const row = agg[0];
    await Product.findByIdAndUpdate(productId, {
      rating: row ? Math.round((row.avg ?? 0) * 10) / 10 : 0,
      reviewCount: row?.count ?? 0,
    });

    res.json({ success: true, message: 'Review moderation updated', data: review });
  }
);

export default router;
