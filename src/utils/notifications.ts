import { Notification, NotificationType } from '../models/Notification';
import { User } from '../models/User';
import { Types } from 'mongoose';
import { logger } from './logger';

export const createNotification = async (params: {
  userId: string | Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  orderId?: string | Types.ObjectId;
  link?: string;
  meta?: Record<string, unknown>;
}): Promise<void> => {
  try {
    await Notification.create({
      user: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      order: params.orderId,
      link: params.link,
      meta: params.meta,
    });
  } catch (error) {
    logger.error('Failed to create notification', error);
  }
};

/** Notify every active admin — e.g. new order placed */
export const notifyAdmins = async (params: {
  type: NotificationType;
  title: string;
  message: string;
  orderId?: string | Types.ObjectId;
  link?: string;
  meta?: Record<string, unknown>;
}): Promise<void> => {
  try {
    const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
    await Promise.all(
      admins.map((admin) =>
        Notification.create({
          user: admin._id,
          type: params.type,
          title: params.title,
          message: params.message,
          order: params.orderId,
          link: params.link,
          meta: params.meta,
        })
      )
    );
  } catch (error) {
    logger.error('Failed to notify admins', error);
  }
};
