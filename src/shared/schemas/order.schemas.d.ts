import { z } from 'zod';
export declare const createOrderSchema: z.ZodObject<{
    items: z.ZodOptional<z.ZodArray<z.ZodObject<{
        product: z.ZodString;
        variant: z.ZodOptional<z.ZodString>;
        quantity: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        product: string;
        quantity: number;
        variant?: string | undefined;
    }, {
        product: string;
        quantity: number;
        variant?: string | undefined;
    }>, "many">>;
    shippingAddress: z.ZodObject<{
        firstName: z.ZodString;
        lastName: z.ZodString;
        phone: z.ZodString;
        street: z.ZodString;
        city: z.ZodString;
        state: z.ZodString;
        postalCode: z.ZodString;
        country: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        firstName: string;
        lastName: string;
        phone: string;
        street: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
    }, {
        firstName: string;
        lastName: string;
        phone: string;
        street: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
    }>;
    billingAddress: z.ZodOptional<z.ZodObject<{
        firstName: z.ZodString;
        lastName: z.ZodString;
        phone: z.ZodString;
        street: z.ZodString;
        city: z.ZodString;
        state: z.ZodString;
        postalCode: z.ZodString;
        country: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        firstName: string;
        lastName: string;
        phone: string;
        street: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
    }, {
        firstName: string;
        lastName: string;
        phone: string;
        street: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
    }>>;
    paymentMethod: z.ZodEnum<["cod", "jazzcash", "easypaisa"]>;
    couponCode: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
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
    paymentMethod: "cod" | "jazzcash" | "easypaisa";
    items?: {
        product: string;
        quantity: number;
        variant?: string | undefined;
    }[] | undefined;
    billingAddress?: {
        firstName: string;
        lastName: string;
        phone: string;
        street: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
    } | undefined;
    couponCode?: string | undefined;
    notes?: string | undefined;
}, {
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
    paymentMethod: "cod" | "jazzcash" | "easypaisa";
    items?: {
        product: string;
        quantity: number;
        variant?: string | undefined;
    }[] | undefined;
    billingAddress?: {
        firstName: string;
        lastName: string;
        phone: string;
        street: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
    } | undefined;
    couponCode?: string | undefined;
    notes?: string | undefined;
}>;
export declare const updateOrderStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["pending", "pending_confirmation", "confirmed", "processing", "shipped", "out_for_delivery", "delivered", "cancelled", "refunded", "return_requested", "returned"]>;
    message: z.ZodOptional<z.ZodString>;
    trackingNumber: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "pending_confirmation" | "confirmed" | "processing" | "shipped" | "out_for_delivery" | "delivered" | "cancelled" | "refunded" | "return_requested" | "returned";
    message?: string | undefined;
    trackingNumber?: string | undefined;
    location?: string | undefined;
}, {
    status: "pending" | "pending_confirmation" | "confirmed" | "processing" | "shipped" | "out_for_delivery" | "delivered" | "cancelled" | "refunded" | "return_requested" | "returned";
    message?: string | undefined;
    trackingNumber?: string | undefined;
    location?: string | undefined;
}>;
export declare const applyCouponSchema: z.ZodObject<{
    code: z.ZodString;
    cartTotal: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    code: string;
    cartTotal: number;
}, {
    code: string;
    cartTotal: number;
}>;
export declare const submitPaymentProofSchema: z.ZodObject<{
    transactionId: z.ZodString;
    paidAmount: z.ZodNumber;
    screenshotUrl: z.ZodString;
    screenshotPublicId: z.ZodOptional<z.ZodString>;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    transactionId: string;
    paidAmount: number;
    screenshotUrl: string;
    screenshotPublicId?: string | undefined;
    note?: string | undefined;
}, {
    transactionId: string;
    paidAmount: number;
    screenshotUrl: string;
    screenshotPublicId?: string | undefined;
    note?: string | undefined;
}>;
export declare const verifyPaymentSchema: z.ZodObject<{
    action: z.ZodEnum<["approve", "reject"]>;
    rejectionReason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    action: "approve" | "reject";
    rejectionReason?: string | undefined;
}, {
    action: "approve" | "reject";
    rejectionReason?: string | undefined;
}>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;
export type SubmitPaymentProofInput = z.infer<typeof submitPaymentProofSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
//# sourceMappingURL=order.schemas.d.ts.map