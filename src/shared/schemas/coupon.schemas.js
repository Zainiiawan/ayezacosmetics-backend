"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDiscountSchema = exports.createCouponSchema = void 0;
const zod_1 = require("zod");
// ==========================================
// Coupon Schemas
// ==========================================
exports.createCouponSchema = zod_1.z.object({
    code: zod_1.z.string().min(3, 'Code must be at least 3 characters').max(20).toUpperCase(),
    type: zod_1.z.enum(['percentage', 'fixed', 'buy_x_get_y', 'free_shipping']),
    value: zod_1.z.number().min(0, 'Value must be positive'),
    minOrderAmount: zod_1.z.number().min(0).optional(),
    maxDiscountAmount: zod_1.z.number().min(0).optional(),
    buyXGetY: zod_1.z.object({
        buyQuantity: zod_1.z.number().int().min(1),
        getQuantity: zod_1.z.number().int().min(1),
        getProductIds: zod_1.z.array(zod_1.z.string()).optional(),
        discountPercentage: zod_1.z.number().min(0).max(100).optional(),
    }).optional(),
    applicableProducts: zod_1.z.array(zod_1.z.string()).optional(),
    applicableCategories: zod_1.z.array(zod_1.z.string()).optional(),
    usageLimit: zod_1.z.number().int().min(1).optional(),
    perUserLimit: zod_1.z.number().int().min(1).optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    isActive: zod_1.z.boolean().optional().default(true),
});
exports.createDiscountSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Discount name is required'),
    type: zod_1.z.enum(['percentage', 'fixed']),
    value: zod_1.z.number().min(0, 'Value must be positive'),
    applicableProducts: zod_1.z.array(zod_1.z.string()).optional(),
    applicableCategories: zod_1.z.array(zod_1.z.string()).optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    isActive: zod_1.z.boolean().optional().default(true),
});
//# sourceMappingURL=coupon.schemas.js.map