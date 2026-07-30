import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { Notification } from '../models/Notification';
import { NotFoundError } from '../utils/errors';

const router = express.Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const limit = Math.min(Number((req.query as any).limit ?? 30), 100);
  const unreadOnly = String((req.query as any).unreadOnly ?? '') === 'true';

  const filter: Record<string, unknown> = { user: userId };
  if (unreadOnly) filter.isRead = false;

  const [items, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).limit(limit),
    Notification.countDocuments({ user: userId, isRead: false }),
  ]);

  res.json({
    success: true,
    message: 'Notifications fetched',
    data: { items, unreadCount },
  });
});

router.patch('/read-all', authenticate, async (req: Request, res: Response) => {
  await Notification.updateMany({ user: req.user!._id, isRead: false }, { $set: { isRead: true } });
  res.json({ success: true, message: 'All notifications marked as read' });
});

router.patch('/:id/read', authenticate, async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const notif = await Notification.findOne({ _id: id, user: req.user!._id });
  if (!notif) throw new NotFoundError('Notification');
  notif.isRead = true;
  await notif.save();
  res.json({ success: true, message: 'Notification marked as read', data: notif });
});

export default router;
