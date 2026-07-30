import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISettingsDocument extends Document {
  defaultShippingCost: number;
  freeShippingThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}

const settingsSchema = new Schema<ISettingsDocument>(
  {
    defaultShippingCost: { type: Number, required: true, default: 200, min: 0 },
    freeShippingThreshold: { type: Number, required: true, default: 5000, min: 0 },
  },
  { timestamps: true }
);

export const Settings: Model<ISettingsDocument> = mongoose.model<ISettingsDocument>('Settings', settingsSchema);
