import mongoose, { Schema, Document, Model } from 'mongoose';

export type PaymentMethod = 'cod' | 'jazzcash' | 'easypaisa';
export type PaymentStatus =
  | 'pending'
  | 'waiting_verification'
  | 'paid'
  | 'rejected'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export interface IPaymentProof {
  transactionId: string;
  paidAmount: number;
  screenshotUrl: string;
  screenshotPublicId?: string;
  note?: string;
  submittedAt: Date;
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
}

export interface IOrderDocument extends Document {
  orderNumber: string;
  user?: mongoose.Types.ObjectId;
  customerType: 'registered' | 'guest';
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items: Array<{
    product: mongoose.Types.ObjectId;
    variant?: string;
    name: string;
    image: string;
    price: number;
    quantity: number;
    total: number;
    sku: string;
  }>;
  shippingAddress: {
    firstName: string;
    lastName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  billingAddress?: {
    firstName: string;
    lastName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  subtotal: number;
  shippingCost: number;
  discount: number;
  tax: number;
  total: number;
  couponCode?: string;
  couponDiscount?: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentProof?: IPaymentProof;
  paymentIntentId?: string;
  status: string;
  trackingNumber?: string;
  courierName?: string;
  trackingUrl?: string;
  dispatchedAt?: Date;
  trackingHistory: Array<{
    status: string;
    message: string;
    timestamp: Date;
    location?: string;
  }>;
  estimatedDelivery?: Date;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variant: String,
    name: { type: String, required: true },
    image: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    total: { type: Number, required: true, min: 0 },
    sku: { type: String, required: true },
  },
  { _id: false }
);

const addressSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
  },
  { _id: false }
);

const trackingSchema = new Schema(
  {
    status: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    location: String,
  },
  { _id: false }
);

const paymentProofSchema = new Schema(
  {
    transactionId: { type: String, required: true, trim: true },
    paidAmount: { type: Number, required: true, min: 0 },
    screenshotUrl: { type: String, required: true },
    screenshotPublicId: String,
    note: { type: String, maxlength: 500 },
    submittedAt: { type: Date, default: Date.now },
    verifiedAt: Date,
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: String,
  },
  { _id: false }
);

const orderSchema = new Schema<IOrderDocument>(
  {
    orderNumber: { type: String, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    customerType: { type: String, enum: ['registered', 'guest'], default: 'registered' },
    customerName: String,
    customerEmail: String,
    customerPhone: String,
    items: [orderItemSchema],
    shippingAddress: { type: addressSchema, required: true },
    billingAddress: addressSchema,
    subtotal: { type: Number, required: true, min: 0 },
    shippingCost: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    couponCode: String,
    couponDiscount: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ['cod', 'jazzcash', 'easypaisa'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: [
        'pending',
        'waiting_verification',
        'paid',
        'rejected',
        'failed',
        'refunded',
        'partially_refunded',
      ],
      default: 'pending',
      index: true,
    },
    paymentProof: paymentProofSchema,
    paymentIntentId: String,
    status: {
      type: String,
      enum: [
        'pending',
        'pending_confirmation',
        'confirmed',
        'processing',
        'shipped',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'refunded',
        'return_requested',
        'returned',
      ],
      default: 'pending',
      index: true,
    },
    trackingNumber: String,
    courierName: String,
    trackingUrl: String,
    dispatchedAt: Date,
    trackingHistory: [trackingSchema],
    estimatedDelivery: Date,
    notes: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `AYZ-${Date.now()}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, paymentMethod: 1 });
orderSchema.index({ createdAt: -1 });

export const Order: Model<IOrderDocument> = mongoose.model<IOrderDocument>('Order', orderSchema);
