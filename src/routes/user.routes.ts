import express, { Request, Response } from 'express';
import { z } from 'zod';
import { adminOnly } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { User } from '../models/User';
import { NotFoundError, BadRequestError } from '../utils/errors';

const router = express.Router();

const updateRoleSchema = z.object({
  role: z.enum(['admin', 'customer']),
});

router.get('/', adminOnly, async (req: Request, res: Response) => {
  const page = Number((req.query as any).page ?? 1);
  const limit = Number((req.query as any).limit ?? 20);

  const [total, users] = await Promise.all([
    User.countDocuments({}),
    User.find({})
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
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

export default router;

