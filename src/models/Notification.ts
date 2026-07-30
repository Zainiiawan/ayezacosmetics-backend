import mongoose, { Schema, Document, Model } from 'mongoose';

export type NotificationType =
  | 'order_placed'
  | 'payment_received'
  | 'payment_approved'
  | 'payment_rejected'
  | 'order_processing'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_cancelled'
  | 'general';

export interface INotificationDocument extends Document {
  user: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  order?: mongoose.Types.ObjectId;
  link?: string;
  isRead: boolean;
  meta?: Record<string, unknown>;
}

const notificationSchema = new Schema<INotificationDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'order_placed',
        'payment_received',
        'payment_approved',
        'payment_rejected',
        'order_processing',
        'order_shipped',
        'order_delivered',
        'order_cancelled',
        'general',
      ],
      required: true,
    },
    title: { type: String, required: true, maxlength: 120 },
    message: { type: String, required: true, maxlength: 500 },
    order: { type: Schema.Types.ObjectId, ref: 'Order', index: true },
    link: String,
    isRead: { type: Boolean, default: false, index: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });

export const Notification: Model<INotificationDocument> = mongoose.model<INotificationDocument>(
  'Notification',
  notificationSchema
);
