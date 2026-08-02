import express, { Request, Response } from 'express';
import { adminOnly } from '../middleware/auth';
import { Order } from '../models/Order';
import { Product } from '../models/Product';

const router = express.Router();

router.get('/summary', adminOnly, async (_req: Request, res: Response) => {
  const [paidOrdersAgg, byStatus, topProducts, lowStockCount] = await Promise.all([
    Order.aggregate([
      { $match: { paymentStatus: { $in: ['paid', 'partially_refunded'] } } },
      { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Product.aggregate([
      { $match: { isActive: true } },
      { $sort: { soldCount: -1 } },
      { $limit: 10 },
      { $project: { name: 1, slug: 1, soldCount: 1, rating: 1, reviewCount: 1, basePrice: 1 } },
    ]),
    Product.countDocuments({
      isActive: true,
      $expr: { $lt: ['$stock', { $ifNull: ['$lowStockThreshold', 30] }] },
    }),
  ]);

  const revenue = paidOrdersAgg[0]?.revenue ?? 0;
  const paidOrders = paidOrdersAgg[0]?.orders ?? 0;

  const ordersByStatus = byStatus.reduce((acc: any, row: any) => {
    acc[row._id] = row.count;
    return acc;
  }, {});

  res.json({
    success: true,
    message: 'Analytics summary fetched',
    data: {
      revenue,
      paidOrders,
      ordersByStatus,
      topProducts,
      lowStockCount,
    },
  });
});

export default router;

