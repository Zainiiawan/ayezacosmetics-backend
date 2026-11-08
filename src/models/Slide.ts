import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISlideDocument extends Document {
  image: { url: string; publicId?: string };
  mobileImage?: { url: string; publicId?: string };
  title?: string;
  subtitle?: string;
  buttonText?: string;
  link?: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String },
  },
  { _id: false }
);

const slideSchema = new Schema<ISlideDocument>(
  {
    image: { type: imageSchema, required: true },
    mobileImage: { type: imageSchema },
    title: { type: String, trim: true, maxlength: 120 },
    subtitle: { type: String, trim: true, maxlength: 300 },
    buttonText: { type: String, trim: true, maxlength: 40 },
    link: { type: String, trim: true, maxlength: 300 },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

slideSchema.index({ isActive: 1, order: 1 });

export const Slide: Model<ISlideDocument> = mongoose.model<ISlideDocument>('Slide', slideSchema);
