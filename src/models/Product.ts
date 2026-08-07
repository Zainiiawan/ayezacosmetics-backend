import mongoose, { Schema, Document, Model } from 'mongoose';
import slugify from 'slugify';

export interface IProductDocument extends Document {
  name: string;
  slug: string;
  description: string;
  seoContent?: string;
  shortDescription?: string;
  sku: string;
  category: mongoose.Types.ObjectId;
  subcategory?: mongoose.Types.ObjectId;
  brand?: mongoose.Types.ObjectId;
  images: Array<{
    url: string;
    publicId: string;
    alt?: string;
    isMain?: boolean;
  }>;
  video?: {
    url: string;
    publicId: string;
  };
  variants: Array<{
    name: string;
    value: string;
    sku: string;
    price: number;
    compareAtPrice?: number;
    stock: number;
    images?: Array<{ url: string; publicId: string; alt?: string }>;
    isActive: boolean;
  }>;
  basePrice: number;
  compareAtPrice?: number;
  stock: number;
  lowStockThreshold: number;
  tags: string[];
  attributes: Map<string, string>;
  dimensions?: {
    weight?: number;
    width?: number;
    height?: number;
    depth?: number;
  };
  isFeatured: boolean;
  isActive: boolean;
  isComingSoon: boolean;
  launchDate?: Date;
  rating: number;
  reviewCount: number;
  soldCount: number;
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
    canonicalUrl?: string;
  };
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
    startDate?: Date;
    endDate?: Date;
  };
  getEffectivePrice(): number;
}

const imageSchema = new Schema({
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  alt: { type: String },
  isMain: { type: Boolean, default: false },
}, { _id: false });

const variantSchema = new Schema({
  name: { type: String, required: true },
  value: { type: String, required: true },
  sku: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  compareAtPrice: { type: Number, min: 0 },
  stock: { type: Number, default: 0, min: 0 },
  images: [imageSchema],
  isActive: { type: Boolean, default: true },
}, { _id: true });

const productSchema = new Schema<IProductDocument>(
  {
    name: { type: String, required: true, trim: true, index: 'text' },
    slug: { type: String, unique: true, index: true },
    description: { type: String, required: true },
    seoContent: { type: String },
    shortDescription: { type: String, maxlength: 500 },
    sku: { type: String, required: true, unique: true, uppercase: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    subcategory: { type: Schema.Types.ObjectId, ref: 'Subcategory', index: true },
    brand: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },
    images: [imageSchema],
    video: {
      url: { type: String },
      publicId: { type: String },
    },
    variants: [variantSchema],
    basePrice: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 30, min: 0 },
    tags: [{ type: String, lowercase: true }],
    attributes: { type: Map, of: String, default: {} },
    dimensions: {
      weight: Number,
      width: Number,
      height: Number,
      depth: Number,
    },
    isFeatured: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    isComingSoon: { type: Boolean, default: false, index: true },
    launchDate: { type: Date },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    soldCount: { type: Number, default: 0 },
    seo: {
      metaTitle: { type: String, maxlength: 60 },
      metaDescription: { type: String, maxlength: 160 },
      metaKeywords: [String],
      canonicalUrl: String,
    },
    discount: {
      type: { type: String, enum: ['percentage', 'fixed'] },
      value: { type: Number, min: 0 },
      startDate: Date,
      endDate: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Generate slug before saving
productSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// Get effective price (accounting for active discounts)
productSchema.methods.getEffectivePrice = function (): number {
  const discount = this.discount;
  if (!discount || discount.type == null || discount.value == null) return this.basePrice;

  const now = new Date();
  const discountActive =
    (!discount.startDate || discount.startDate <= now) &&
    (!discount.endDate || discount.endDate >= now);

  if (!discountActive) return this.basePrice;

  if (discount.type === 'percentage') {
    return this.basePrice * (1 - discount.value / 100);
  }
  if (discount.type === 'fixed') {
    return Math.max(0, this.basePrice - discount.value);
  }
  return this.basePrice;
};

// Indexes
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, isActive: 1, soldCount: -1 }); // Optimized for category bestselling
productSchema.index({ category: 1, isActive: 1, createdAt: -1 }); // Optimized for category newest
productSchema.index({ category: 1, isActive: 1, basePrice: 1 });  // Optimized for category price
productSchema.index({ brand: 1, isActive: 1 });
productSchema.index({ isActive: 1, soldCount: -1 }); // Optimized for /shop bestselling
productSchema.index({ isActive: 1, createdAt: -1 }); // Optimized for /shop newest
productSchema.index({ basePrice: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ soldCount: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ isFeatured: 1, isActive: 1 });

export const Product: Model<IProductDocument> = mongoose.model<IProductDocument>('Product', productSchema);
