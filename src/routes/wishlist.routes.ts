import express, { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { authenticate } from '../middleware/auth';
import { NotFoundError } from '../utils/errors';
import { Product } from '../models/Product';
import { User } from '../models/User';

const router = express.Router();

const asId = (value: string | string[]): string =>
  Array.isArray(value) ? value[0] : value;

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    void fn(req, res, next).catch(next);
  };

router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = String(req.user!._id);
    const user = await User.findById(userId).select('wishlist');
    if (!user) throw new NotFoundError('User');

    const productIds = user.wishlist ?? [];
    const products =
      productIds.length > 0
        ? await Product.find({ _id: { $in: productIds }, isActive: true }).populate(
            'category subcategory brand'
          )
        : [];

    res.json({ success: true, message: 'Wishlist fetched', data: products });
  })
);

router.post(
  '/:productId',
  authenticate,
  asyncHandler(async (req, res) => {
    const productId = asId(req.params.productId);
    const userId = String(req.user!._id);

    const product = await Product.findById(productId);
    if (!product || !product.isActive) throw new NotFoundError('Product');

    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User');

    const pid = new Types.ObjectId(productId);
    if (!user.wishlist.some((id) => id.toString() === pid.toString())) {
      user.wishlist.push(pid);
      await user.save();
    }

    res.status(201).json({ success: true, message: 'Added to wishlist', data: user.wishlist });
  })
);

router.delete(
  '/:productId',
  authenticate,
  asyncHandler(async (req, res) => {
    const productId = asId(req.params.productId);
    const userId = String(req.user!._id);

    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User');

    user.wishlist = user.wishlist.filter((id) => id.toString() !== productId);
    await user.save();

    res.json({ success: true, message: 'Removed from wishlist', data: user.wishlist });
  })
);

router.get(
  '/compare/list',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = String(req.user!._id);
    const user = await User.findById(userId).select('compare');
    if (!user) throw new NotFoundError('User');

    const productIds = user.compare ?? [];
    const products =
      productIds.length > 0
        ? await Product.find({ _id: { $in: productIds }, isActive: true }).populate(
            'category subcategory brand'
          )
        : [];

    res.json({ success: true, message: 'Compare list fetched', data: products });
  })
);

router.post(
  '/compare/:productId',
  authenticate,
  asyncHandler(async (req, res) => {
    const productId = asId(req.params.productId);
    const userId = String(req.user!._id);

    const product = await Product.findById(productId);
    if (!product || !product.isActive) throw new NotFoundError('Product');

    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User');

    const pid = new Types.ObjectId(productId);
    if (!user.compare.some((id) => id.toString() === pid.toString())) {
      user.compare = [...user.compare, pid].slice(-4);
      await user.save();
    }

    res.status(201).json({ success: true, message: 'Added to compare', data: user.compare });
  })
);

router.delete(
  '/compare/:productId',
  authenticate,
  asyncHandler(async (req, res) => {
    const productId = asId(req.params.productId);
    const userId = String(req.user!._id);

    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User');

    user.compare = user.compare.filter((id) => id.toString() !== productId);
    await user.save();

    res.json({ success: true, message: 'Removed from compare', data: user.compare });
  })
);

router.get(
  '/recently-viewed/list',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = String(req.user!._id);
    const user = await User.findById(userId).select('recentlyViewed');
    if (!user) throw new NotFoundError('User');

    const entries = [...(user.recentlyViewed ?? [])].sort(
      (a, b) => b.viewedAt.getTime() - a.viewedAt.getTime()
    );
    const ids = entries.map((e) => e.product);
    const products =
      ids.length > 0
        ? await Product.find({ _id: { $in: ids }, isActive: true }).populate(
            'category subcategory brand'
          )
        : [];

    const productMap = new Map(products.map((p) => [String(p._id), p]));
    const sorted = entries.map((e) => productMap.get(String(e.product))).filter(Boolean);

    res.json({ success: true, message: 'Recently viewed fetched', data: sorted });
  })
);

router.post(
  '/recently-viewed/:productId',
  authenticate,
  asyncHandler(async (req, res) => {
    const productId = asId(req.params.productId);
    const userId = String(req.user!._id);

    const product = await Product.findById(productId);
    if (!product || !product.isActive) throw new NotFoundError('Product');

    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User');

    const productObjectId = new Types.ObjectId(productId);
    const filtered = (user.recentlyViewed ?? []).filter(
      (x) => x.product.toString() !== productObjectId.toString()
    );
    user.recentlyViewed = [
      ...filtered,
      { product: productObjectId, viewedAt: new Date() },
    ].slice(-10);

    await user.save();
    res.status(201).json({ success: true, message: 'Recently viewed updated' });
  })
);

export default router;
