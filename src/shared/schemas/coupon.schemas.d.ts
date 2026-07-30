import { z } from 'zod';
export declare const createCouponSchema: z.ZodObject<{
    code: z.ZodString;
    type: z.ZodEnum<["percentage", "fixed", "buy_x_get_y", "free_shipping"]>;
    value: z.ZodNumber;
    minOrderAmount: z.ZodOptional<z.ZodNumber>;
    maxDiscountAmount: z.ZodOptional<z.ZodNumber>;
    buyXGetY: z.ZodOptional<z.ZodObject<{
        buyQuantity: z.ZodNumber;
        getQuantity: z.ZodNumber;
        getProductIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        discountPercentage: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        buyQuantity: number;
        getQuantity: number;
        getProductIds?: string[] | undefined;
        discountPercentage?: number | undefined;
    }, {
        buyQuantity: number;
        getQuantity: number;
        getProductIds?: string[] | undefined;
        discountPercentage?: number | undefined;
    }>>;
    applicableProducts: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    applicableCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    usageLimit: z.ZodOptional<z.ZodNumber>;
    perUserLimit: z.ZodOptional<z.ZodNumber>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    isActive: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    type: "fixed" | "percentage" | "buy_x_get_y" | "free_shipping";
    isActive: boolean;
    value: number;
    code: string;
    minOrderAmount?: number | undefined;
    maxDiscountAmount?: number | undefined;
    buyXGetY?: {
        buyQuantity: number;
        getQuantity: number;
        getProductIds?: string[] | undefined;
        discountPercentage?: number | undefined;
    } | undefined;
    applicableProducts?: string[] | undefined;
    applicableCategories?: string[] | undefined;
    usageLimit?: number | undefined;
    perUserLimit?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    type: "fixed" | "percentage" | "buy_x_get_y" | "free_shipping";
    value: number;
    code: string;
    isActive?: boolean | undefined;
    minOrderAmount?: number | undefined;
    maxDiscountAmount?: number | undefined;
    buyXGetY?: {
        buyQuantity: number;
        getQuantity: number;
        getProductIds?: string[] | undefined;
        discountPercentage?: number | undefined;
    } | undefined;
    applicableProducts?: string[] | undefined;
    applicableCategories?: string[] | undefined;
    usageLimit?: number | undefined;
    perUserLimit?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
export declare const createDiscountSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodEnum<["percentage", "fixed"]>;
    value: z.ZodNumber;
    applicableProducts: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    applicableCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    isActive: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    type: "fixed" | "percentage";
    name: string;
    isActive: boolean;
    value: number;
    applicableProducts?: string[] | undefined;
    applicableCategories?: string[] | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    type: "fixed" | "percentage";
    name: string;
    value: number;
    isActive?: boolean | undefined;
    applicableProducts?: string[] | undefined;
    applicableCategories?: string[] | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type CreateDiscountInput = z.infer<typeof createDiscountSchema>;
//# sourceMappingURL=coupon.schemas.d.ts.map