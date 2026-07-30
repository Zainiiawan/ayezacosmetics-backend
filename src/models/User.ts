import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         email: { type: string }
 *         firstName: { type: string }
 *         lastName: { type: string }
 *         role: { type: string, enum: [customer, admin] }
 *         isEmailVerified: { type: boolean }
 */

export interface IUserDocument extends Document {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  role: 'customer' | 'admin';
  isEmailVerified: boolean;
  isActive: boolean;
  googleId?: string;
  addresses: Array<{
    label: string;
    firstName: string;
    lastName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isDefault: boolean;
  }>;
  wishlist: mongoose.Types.ObjectId[];
  emailVerificationToken?: string;
  emailVerificationExpiry?: Date;
  otpCode?: string;
  otpExpiry?: Date;
  otpAttempts: number;
  otpLastSent?: Date;
  passwordResetToken?: string;
  passwordResetExpiry?: Date;
  refreshTokens: string[];
  lastLogin?: Date;
  compare: mongoose.Types.ObjectId[];
  recentlyViewed: Array<{
    product: mongoose.Types.ObjectId;
    viewedAt: Date;
  }>;
  comparePassword(candidatePassword: string): Promise<boolean>;
  getFullName(): string;
}

const addressSchema = new Schema({
  label: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String, required: true },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true, default: 'Pakistan' },
  isDefault: { type: Boolean, default: false },
}, { _id: true });

const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      select: false,
      minlength: 8,
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    avatar: { type: String },
    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
    },
    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    googleId: { type: String, sparse: true, index: true },
    addresses: [addressSchema],
    wishlist: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    compare: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    recentlyViewed: [
      {
        product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
        viewedAt: { type: Date, default: Date.now, index: true },
      },
    ],
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpiry: { type: Date, select: false },
    otpCode: { type: String, select: false },
    otpExpiry: { type: Date, select: false },
    otpAttempts: { type: Number, default: 0, select: false },
    otpLastSent: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpiry: { type: Date, select: false },
    refreshTokens: { type: [String], select: false, default: [] },
    lastLogin: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        const r = ret as any;
        delete r.password;
        delete r.refreshTokens;
        delete r.emailVerificationToken;
        delete r.emailVerificationExpiry;
        delete r.otpCode;
        delete r.otpExpiry;
        delete r.otpAttempts;
        delete r.otpLastSent;
        delete r.passwordResetToken;
        delete r.passwordResetExpiry;
        return r;
      },
    },
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Get full name
userSchema.methods.getFullName = function (): string {
  return `${this.firstName} ${this.lastName}`;
};

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

export const User: Model<IUserDocument> = mongoose.model<IUserDocument>('User', userSchema);
