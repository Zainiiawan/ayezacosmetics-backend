import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICouponDocument extends Document {
  code: string;
  type: 'percentage' | 'fixed' | 'buy_x_get_y' | 'free_shipping';
  value: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  buyXGetY?: {
    buyQuantity: number;
    getQuantity: number;
    getProductIds?: mongoose.Types.ObjectId[];
    discountPercentage?: number;
  };
  applicableProducts?: mongoose.Types.ObjectId[];
  applicableCategories?: mongoose.Types.ObjectId[];
  usageLimit?: number;
  usageCount: number;
  usedBy: mongoose.Types.ObjectId[];
  perUserLimit?: number;
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
  isValid(): boolean;
  calculateDiscount(
    cartTotal: number,
    context?: {
      cartItems?: Array<{
        productId: mongoose.Types.ObjectId;
        quantity: number;
        unitPrice: number;
      }>;
    }
  ): number;
}

const couponSchema = new Schema<ICouponDocument>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, index: true },
    type: {
      type: String,
      enum: ['percentage', 'fixed', 'buy_x_get_y', 'free_shipping'],
      required: true,
    },
    value: { type: Number, required: true, min: 0 },
    minOrderAmount: { type: Number, min: 0 },
    maxDiscountAmount: { type: Number, min: 0 },
    buyXGetY: {
      buyQuantity: { type: Number, min: 1 },
      getQuantity: { type: Number, min: 1 },
      getProductIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
      discountPercentage: { type: Number, min: 0, max: 100 },
    },
    applicableProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    applicableCategories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    usageLimit: { type: Number, min: 1 },
    usageCount: { type: Number, default: 0 },
    usedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    perUserLimit: { type: Number, min: 1 },
    startDate: Date,
    endDate: Date,
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

couponSchema.methods.isValid = function (): boolean {
  if (!this.isActive) return false;
  const now = new Date();
  if (this.startDate && this.startDate > now) return false;
  if (this.endDate && this.endDate < now) return false;
  if (this.usageLimit && this.usageCount >= this.usageLimit) return false;
  return true;
};

couponSchema.methods.calculateDiscount = function (
  cartTotal: number,
  context?: {
    cartItems?: Array<{
      productId: mongoose.Types.ObjectId;
      quantity: number;
      unitPrice: number;
    }>;
  }
): number {
  if (!this.isValid()) return 0;
  if (this.minOrderAmount && cartTotal < this.minOrderAmount) return 0;

  let discount = 0;
  if (this.type === 'percentage') {
    discount = cartTotal * (this.value / 100);
    if (this.maxDiscountAmount) discount = Math.min(discount, this.maxDiscountAmount);
  } else if (this.type === 'fixed') {
    discount = this.value;
  } else if (this.type === 'buy_x_get_y') {
    const buyXGetY = this.buyXGetY;
    if (!buyXGetY) return 0;
    const cartItems = context?.cartItems ?? [];

    const eligibleGetProductIds =
      buyXGetY.getProductIds && buyXGetY.getProductIds.length > 0
        ? buyXGetY.getProductIds.map((id: mongoose.Types.ObjectId) => id.toString())
        : null;

    const eligibleItems = eligibleGetProductIds
      ? cartItems.filter((i) => eligibleGetProductIds.includes(i.productId.toString()))
      : cartItems;

    if (eligibleItems.length === 0) return 0;

    const { buyQuantity, getQuantity } = buyXGetY;
    const unitsPerSet = buyQuantity + getQuantity;
    const totalEligibleQty = eligibleItems.reduce((sum, i) => sum + i.quantity, 0);
    const sets = Math.floor(totalEligibleQty / unitsPerSet);
    const discountedUnits = sets * getQuantity;

    if (discountedUnits <= 0) return 0;

    const discountPercentage = buyXGetY.discountPercentage ?? this.value;
    const unitPrices: number[] = [];
    for (const item of eligibleItems) {
      for (let i = 0; i < item.quantity; i += 1) {
        unitPrices.push(item.unitPrice);
      }
    }

    // Discount the most expensive eligible "get" units for maximum applied value.
    unitPrices.sort((a, b) => b - a);
    const picked = unitPrices.slice(0, discountedUnits);
    discount = picked.reduce((sum, p) => sum + p, 0) * (discountPercentage / 100);

    if (this.maxDiscountAmount) discount = Math.min(discount, this.maxDiscountAmount);
  } else if (this.type === 'free_shipping') {
    discount = 0; // Handled separately
  }

  return Math.min(discount, cartTotal);
};

export const Coupon: Model<ICouponDocument> = mongoose.model<ICouponDocument>('Coupon', couponSchema);
