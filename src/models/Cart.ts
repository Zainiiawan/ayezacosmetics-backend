import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICartItem {
  product: mongoose.Types.ObjectId;
  variant?: string;
  name: string;
  image: string;
  price: number;
  compareAtPrice?: number;
  quantity: number;
  sku: string;
  slug: string;
  maxQuantity: number;
  total: number;
}

export interface ICartDocument extends Document {
  user: mongoose.Types.ObjectId;
  items: ICartItem[];
  subtotal: number;
  itemCount: number;
  couponCode?: string;
  couponDiscount?: number;
}

const cartItemSchema = new Schema<ICartItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    variant: { type: String },
    name: { type: String, required: true },
    image: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    sku: { type: String, required: true },
    slug: { type: String, required: true },
    maxQuantity: { type: Number, required: true, min: 1 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const cartSchema = new Schema<ICartDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    items: { type: [cartItemSchema], default: [] },
    subtotal: { type: Number, required: true, default: 0, min: 0 },
    itemCount: { type: Number, required: true, default: 0, min: 0 },
    couponCode: { type: String },
    couponDiscount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export const Cart: Model<ICartDocument> = mongoose.model<ICartDocument>('Cart', cartSchema);

