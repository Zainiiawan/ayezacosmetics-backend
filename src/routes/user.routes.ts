import express, { Request, Response } from 'express';
import { z } from 'zod';
import { adminOnly } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { User } from '../models/User';
import { Settings } from '../models/Settings';
import { NotFoundError, BadRequestError } from '../utils/errors';

const router = express.Router();

const updateRoleSchema = z.object({
  role: z.enum(['admin', 'customer']),
});

router.get('/', adminOnly, async (req: Request, res: Response) => {
  const page = Number((req.query as any).page ?? 1);
  const limit = Number((req.query as any).limit ?? 20);

  const settings = await Settings.findOne();
  const vipThreshold = settings?.vipThreshold || 5000;

  const total = await User.countDocuments({});

  const users = await User.aggregate([
    { $sort: { createdAt: -1 } },
    { $skip: (page - 1) * limit },
    { $limit: limit },
    {
      $lookup: {
        from: 'orders',
        localField: '_id',
        foreignField: 'user',
        as: 'orders'
      }
    },
    {
      $addFields: {
        totalSpent: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: '$orders',
                  as: 'order',
                  cond: { $not: { $in: ['$$order.status', ['cancelled', 'refunded']] } }
                }
              },
              as: 'validOrder',
              in: '$$validOrder.total'
            }
          }
        },
        ordersCount: {
          $size: {
            $filter: {
              input: '$orders',
              as: 'order',
              cond: { $not: { $in: ['$$order.status', ['cancelled', 'refunded']] } }
            }
          }
        }
      }
    },
    {
      $addFields: {
        isVip: { $gte: ['$totalSpent', vipThreshold] }
      }
    },
    {
      $project: {
        orders: 0,
        password: 0
      }
    }
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  res.json({
    success: true,
    message: 'Users fetched',
    data: { users, pagination: { page, limit, total, totalPages } },
  });
});

router.patch('/:userId/role', adminOnly, validate(updateRoleSchema), async (req: Request, res: Response) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User');

  const { role } = req.body;
  user.role = role;
  await user.save();

  res.json({ success: true, message: 'Role updated', data: user.toJSON() });
});

router.patch('/:userId/activate', adminOnly, async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { isActive } = req.body as any;
  if (typeof isActive !== 'boolean') throw new BadRequestError('isActive must be boolean');

  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User');

  user.isActive = isActive;
  await user.save();
  res.json({ success: true, message: 'User updated', data: user.toJSON() });
});

router.delete('/:userId', adminOnly, async (req: Request, res: Response) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User');
  if (user.role === 'admin') throw new BadRequestError('Cannot delete admin users');

  await User.findByIdAndDelete(userId);
  res.json({ success: true, message: 'User deleted successfully', data: { _id: userId } });
});

export default router;
