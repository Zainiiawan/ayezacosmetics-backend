import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IShippingRateDocument extends Document {
  city: string;
  cost: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const shippingRateSchema = new Schema<IShippingRateDocument>(
  {
    city: { type: String, required: true, unique: true, trim: true, index: true },
    cost: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Normalize city to title case before save
shippingRateSchema.pre('save', function (next) {
  if (this.city) {
    this.city = this.city.trim().toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  }
  next();
});

export const ShippingRate: Model<IShippingRateDocument> = mongoose.model<IShippingRateDocument>('ShippingRate', shippingRateSchema);
