"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPaymentSchema = exports.submitPaymentProofSchema = exports.applyCouponSchema = exports.updateOrderStatusSchema = exports.createOrderSchema = void 0;
const zod_1 = require("zod");
const shippingAddressSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1, 'First name is required'),
    lastName: zod_1.z.string().min(1, 'Last name is required'),
    phone: zod_1.z.string().min(1, 'Phone number is required'),
    street: zod_1.z.string().min(1, 'Street address is required'),
    city: zod_1.z.string().min(1, 'City is required'),
    state: zod_1.z.string().min(1, 'State is required'),
    postalCode: zod_1.z.string().min(1, 'Postal code is required'),
    country: zod_1.z.string().min(1, 'Country is required'),
});
exports.createOrderSchema = zod_1.z.object({
    items: zod_1.z
        .array(zod_1.z.object({
        product: zod_1.z.string().min(1),
        variant: zod_1.z.string().optional(),
        quantity: zod_1.z.number().int().min(1),
    }))
        .min(1)
        .optional(),
    shippingAddress: shippingAddressSchema,
    billingAddress: shippingAddressSchema.optional(),
    paymentMethod: zod_1.z.enum(['cod', 'jazzcash', 'easypaisa']),
    couponCode: zod_1.z.string().optional(),
    notes: zod_1.z.string().max(500).optional(),
});
exports.updateOrderStatusSchema = zod_1.z.object({
    status: zod_1.z.enum([
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
    ]),
    message: zod_1.z.string().optional(),
    trackingNumber: zod_1.z.string().optional(),
    location: zod_1.z.string().optional(),
});
exports.applyCouponSchema = zod_1.z.object({
    code: zod_1.z.string().min(1, 'Coupon code is required'),
    cartTotal: zod_1.z.number().min(0),
});
exports.submitPaymentProofSchema = zod_1.z.object({
    transactionId: zod_1.z.string().min(3, 'Transaction ID is required').max(64),
    paidAmount: zod_1.z.number().positive('Paid amount must be greater than 0'),
    screenshotUrl: zod_1.z.string().min(8, 'Screenshot is required'),
    screenshotPublicId: zod_1.z.string().optional(),
    note: zod_1.z.string().max(500).optional(),
});
exports.verifyPaymentSchema = zod_1.z.object({
    action: zod_1.z.enum(['approve', 'reject']),
    rejectionReason: zod_1.z.string().max(500).optional(),
});
//# sourceMappingURL=order.schemas.js.map