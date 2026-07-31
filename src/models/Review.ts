import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReviewDocument extends Document {
  product: mongoose.Types.ObjectId;
  user?: mongoose.Types.ObjectId;
  guestName?: string;
  guestEmail?: string;
  order?: mongoose.Types.ObjectId;
  rating: number;
  title: string;
  body: string;
  images?: string[];
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  moderationNote?: string;
  helpfulVotes: number;
  helpfulVoters: mongoose.Types.ObjectId[];
}

const reviewSchema = new Schema<IReviewDocument>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    guestName: { type: String, trim: true },
    guestEmail: { type: String, trim: true, lowercase: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    body: { type: String, required: true, trim: true, minlength: 10, maxlength: 500 },
    images: [String],
    isVerifiedPurchase: { type: Boolean, default: false, index: true },
    isApproved: { type: Boolean, default: false, index: true },
    moderationNote: String,
    helpfulVotes: { type: Number, default: 0 },
    helpfulVoters: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// Removed rigid unique compound index {product: 1, user: 1} to allow guests and programmatic uniqueness checks.
reviewSchema.index({ product: 1, guestEmail: 1 });
reviewSchema.index({ product: 1, isApproved: 1 });
reviewSchema.index({ createdAt: -1 });

export const Review: Model<IReviewDocument> = mongoose.model<IReviewDocument>('Review', reviewSchema);
