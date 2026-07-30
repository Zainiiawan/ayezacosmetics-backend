import mongoose, { Schema, Document, Model } from 'mongoose';
import slugify from 'slugify';

// ==========================================
// Category Model
// ==========================================
export interface ICategoryDocument extends Document {
  name: string;
  slug: string;
  description?: string;
  image?: { url: string; publicId: string; alt?: string };
  parent?: mongoose.Types.ObjectId;
  isActive: boolean;
  order: number;
}

const categorySchema = new Schema<ICategoryDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },
    description: String,
    image: {
      url: String,
      publicId: String,
      alt: String,
    },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

categorySchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

export const Category: Model<ICategoryDocument> = mongoose.model<ICategoryDocument>('Category', categorySchema);

// ==========================================
// Subcategory Model
// ==========================================
export interface ISubcategoryDocument extends Document {
  name: string;
  slug: string;
  description?: string;
  image?: { url: string; publicId: string; alt?: string };
  category: mongoose.Types.ObjectId;
  isActive: boolean;
  order: number;
}

const subcategorySchema = new Schema<ISubcategoryDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },
    description: String,
    image: { url: String, publicId: String, alt: String },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

subcategorySchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

export const Subcategory: Model<ISubcategoryDocument> = mongoose.model<ISubcategoryDocument>('Subcategory', subcategorySchema);

// ==========================================
// Brand Model
// ==========================================
export interface IBrandDocument extends Document {
  name: string;
  slug: string;
  description?: string;
  logo?: { url: string; publicId: string; alt?: string };
  website?: string;
  isActive: boolean;
}

const brandSchema = new Schema<IBrandDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },
    description: String,
    logo: { url: String, publicId: String, alt: String },
    website: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

brandSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

export const Brand: Model<IBrandDocument> = mongoose.model<IBrandDocument>('Brand', brandSchema);
