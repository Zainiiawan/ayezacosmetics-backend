"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productFilterSchema = exports.createBrandSchema = exports.createCategorySchema = exports.updateProductSchema = exports.createProductSchema = void 0;
const zod_1 = require("zod");
// ==========================================
// Product Schemas
// ==========================================
const productImageSchema = zod_1.z.object({
    url: zod_1.z.string().url(),
    publicId: zod_1.z.string(),
    alt: zod_1.z.string().optional(),
    isMain: zod_1.z.boolean().optional(),
});
const productVariantSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Variant name is required'),
    value: zod_1.z.string().min(1, 'Variant value is required'),
    sku: zod_1.z.string().min(1, 'SKU is required'),
    price: zod_1.z.number().min(0, 'Price must be positive'),
    compareAtPrice: zod_1.z.number().min(0).optional(),
    stock: zod_1.z.number().int().min(0, 'Stock must be non-negative'),
    images: zod_1.z.array(productImageSchema).optional(),
    isActive: zod_1.z.boolean().default(true),
});
exports.createProductSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Product name is required').max(200),
    description: zod_1.z.string().min(10, 'Description must be at least 10 characters'),
    shortDescription: zod_1.z.string().max(500).optional(),
    sku: zod_1.z.string().min(1, 'SKU is required'),
    category: zod_1.z.string().min(1, 'Category is required'),
    subcategory: zod_1.z.string().optional(),
    brand: zod_1.z.string().optional(),
    images: zod_1.z.array(productImageSchema).min(1, 'At least one image is required'),
    variants: zod_1.z.array(productVariantSchema).optional().default([]),
    basePrice: zod_1.z.number().min(0, 'Price must be positive'),
    compareAtPrice: zod_1.z.number().min(0).optional(),
    stock: zod_1.z.number().int().min(0, 'Stock must be non-negative'),
    lowStockThreshold: zod_1.z.number().int().min(0).default(10),
    tags: zod_1.z.array(zod_1.z.string()).optional().default([]),
    attributes: zod_1.z.record(zod_1.z.string()).optional().default({}),
    isFeatured: zod_1.z.boolean().optional().default(false),
    isActive: zod_1.z.boolean().optional().default(true),
    seo: zod_1.z.object({
        metaTitle: zod_1.z.string().max(60).optional(),
        metaDescription: zod_1.z.string().max(160).optional(),
        metaKeywords: zod_1.z.array(zod_1.z.string()).optional(),
        canonicalUrl: zod_1.z.string().url().optional(),
    }).optional(),
});
exports.updateProductSchema = exports.createProductSchema.partial();
exports.createCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Category name is required').max(100),
    description: zod_1.z.string().max(500).optional(),
    image: productImageSchema.optional(),
    isActive: zod_1.z.boolean().optional().default(true),
});
exports.createBrandSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Brand name is required').max(100),
    description: zod_1.z.string().max(500).optional(),
    logo: productImageSchema.optional(),
    website: zod_1.z.string().url().optional(),
    isActive: zod_1.z.boolean().optional().default(true),
});
exports.productFilterSchema = zod_1.z.object({
    category: zod_1.z.string().optional(),
    subcategory: zod_1.z.string().optional(),
    brand: zod_1.z.string().optional(),
    minPrice: zod_1.z.coerce.number().min(0).optional(),
    maxPrice: zod_1.z.coerce.number().min(0).optional(),
    rating: zod_1.z.coerce.number().min(1).max(5).optional(),
    tags: zod_1.z.string().optional(),
    inStock: zod_1.z.coerce.boolean().optional(),
    isFeatured: zod_1.z.coerce.boolean().optional(),
    search: zod_1.z.string().optional(),
    sortBy: zod_1.z.enum(['price_asc', 'price_desc', 'rating', 'newest', 'bestselling', 'name_asc']).optional(),
    page: zod_1.z.coerce.number().int().min(1).optional().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional().default(12),
});
//# sourceMappingURL=product.schemas.js.map