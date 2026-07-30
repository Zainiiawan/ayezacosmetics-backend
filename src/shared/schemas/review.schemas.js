"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateReviewModerationSchema = exports.createReviewSchema = void 0;
const zod_1 = require("zod");
// ==========================================
// Review Schemas
// ==========================================
exports.createReviewSchema = zod_1.z.object({
    product: zod_1.z.string().min(1, 'Product ID is required'),
    rating: zod_1.z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
    title: zod_1.z.string().min(1, 'Review title is required').max(100),
    body: zod_1.z.string().min(10, 'Review must be at least 10 characters').max(2000),
    images: zod_1.z.array(zod_1.z.string().url()).optional(),
});
exports.updateReviewModerationSchema = zod_1.z.object({
    isApproved: zod_1.z.boolean(),
    moderationNote: zod_1.z.string().optional(),
});
//# sourceMappingURL=review.schemas.js.map