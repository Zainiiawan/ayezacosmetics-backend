import { z } from 'zod';
export declare const createProductSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    shortDescription: z.ZodOptional<z.ZodString>;
    sku: z.ZodString;
    category: z.ZodString;
    subcategory: z.ZodOptional<z.ZodString>;
    brand: z.ZodOptional<z.ZodString>;
    images: z.ZodArray<z.ZodObject<{
        url: z.ZodString;
        publicId: z.ZodString;
        alt: z.ZodOptional<z.ZodString>;
        isMain: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        publicId: string;
        alt?: string | undefined;
        isMain?: boolean | undefined;
    }, {
        url: string;
        publicId: string;
        alt?: string | undefined;
        isMain?: boolean | undefined;
    }>, "many">;
    variants: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        value: z.ZodString;
        sku: z.ZodString;
        price: z.ZodNumber;
        compareAtPrice: z.ZodOptional<z.ZodNumber>;
        stock: z.ZodNumber;
        images: z.ZodOptional<z.ZodArray<z.ZodObject<{
            url: z.ZodString;
            publicId: z.ZodString;
            alt: z.ZodOptional<z.ZodString>;
            isMain: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            url: string;
            publicId: string;
            alt?: string | undefined;
            isMain?: boolean | undefined;
        }, {
            url: string;
            publicId: string;
            alt?: string | undefined;
            isMain?: boolean | undefined;
        }>, "many">>;
        isActive: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        isActive: boolean;
        value: string;
        sku: string;
        price: number;
        stock: number;
        compareAtPrice?: number | undefined;
        images?: {
            url: string;
            publicId: string;
            alt?: string | undefined;
            isMain?: boolean | undefined;
        }[] | undefined;
    }, {
        name: string;
        value: string;
        sku: string;
        price: number;
        stock: number;
        isActive?: boolean | undefined;
        compareAtPrice?: number | undefined;
        images?: {
            url: string;
            publicId: string;
            alt?: string | undefined;
            isMain?: boolean | undefined;
        }[] | undefined;
    }>, "many">>>;
    basePrice: z.ZodNumber;
    compareAtPrice: z.ZodOptional<z.ZodNumber>;
    stock: z.ZodNumber;
    lowStockThreshold: z.ZodDefault<z.ZodNumber>;
    tags: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    attributes: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>>;
    isFeatured: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    isActive: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    seo: z.ZodOptional<z.ZodObject<{
        metaTitle: z.ZodOptional<z.ZodString>;
        metaDescription: z.ZodOptional<z.ZodString>;
        metaKeywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        canonicalUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        metaTitle?: string | undefined;
        metaDescription?: string | undefined;
        metaKeywords?: string[] | undefined;
        canonicalUrl?: string | undefined;
    }, {
        metaTitle?: string | undefined;
        metaDescription?: string | undefined;
        metaKeywords?: string[] | undefined;
        canonicalUrl?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    isActive: boolean;
    description: string;
    sku: string;
    stock: number;
    images: {
        url: string;
        publicId: string;
        alt?: string | undefined;
        isMain?: boolean | undefined;
    }[];
    category: string;
    variants: {
        name: string;
        isActive: boolean;
        value: string;
        sku: string;
        price: number;
        stock: number;
        compareAtPrice?: number | undefined;
        images?: {
            url: string;
            publicId: string;
            alt?: string | undefined;
            isMain?: boolean | undefined;
        }[] | undefined;
    }[];
    basePrice: number;
    lowStockThreshold: number;
    tags: string[];
    attributes: Record<string, string>;
    isFeatured: boolean;
    compareAtPrice?: number | undefined;
    shortDescription?: string | undefined;
    subcategory?: string | undefined;
    brand?: string | undefined;
    seo?: {
        metaTitle?: string | undefined;
        metaDescription?: string | undefined;
        metaKeywords?: string[] | undefined;
        canonicalUrl?: string | undefined;
    } | undefined;
}, {
    name: string;
    description: string;
    sku: string;
    stock: number;
    images: {
        url: string;
        publicId: string;
        alt?: string | undefined;
        isMain?: boolean | undefined;
    }[];
    category: string;
    basePrice: number;
    isActive?: boolean | undefined;
    compareAtPrice?: number | undefined;
    shortDescription?: string | undefined;
    subcategory?: string | undefined;
    brand?: string | undefined;
    variants?: {
        name: string;
        value: string;
        sku: string;
        price: number;
        stock: number;
        isActive?: boolean | undefined;
        compareAtPrice?: number | undefined;
        images?: {
            url: string;
            publicId: string;
            alt?: string | undefined;
            isMain?: boolean | undefined;
        }[] | undefined;
    }[] | undefined;
    lowStockThreshold?: number | undefined;
    tags?: string[] | undefined;
    attributes?: Record<string, string> | undefined;
    isFeatured?: boolean | undefined;
    seo?: {
        metaTitle?: string | undefined;
        metaDescription?: string | undefined;
        metaKeywords?: string[] | undefined;
        canonicalUrl?: string | undefined;
    } | undefined;
}>;
export declare const updateProductSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    shortDescription: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    sku: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    subcategory: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    brand: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    images: z.ZodOptional<z.ZodArray<z.ZodObject<{
        url: z.ZodString;
        publicId: z.ZodString;
        alt: z.ZodOptional<z.ZodString>;
        isMain: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        publicId: string;
        alt?: string | undefined;
        isMain?: boolean | undefined;
    }, {
        url: string;
        publicId: string;
        alt?: string | undefined;
        isMain?: boolean | undefined;
    }>, "many">>;
    variants: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        value: z.ZodString;
        sku: z.ZodString;
        price: z.ZodNumber;
        compareAtPrice: z.ZodOptional<z.ZodNumber>;
        stock: z.ZodNumber;
        images: z.ZodOptional<z.ZodArray<z.ZodObject<{
            url: z.ZodString;
            publicId: z.ZodString;
            alt: z.ZodOptional<z.ZodString>;
            isMain: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            url: string;
            publicId: string;
            alt?: string | undefined;
            isMain?: boolean | undefined;
        }, {
            url: string;
            publicId: string;
            alt?: string | undefined;
            isMain?: boolean | undefined;
        }>, "many">>;
        isActive: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        isActive: boolean;
        value: string;
        sku: string;
        price: number;
        stock: number;
        compareAtPrice?: number | undefined;
        images?: {
            url: string;
            publicId: string;
            alt?: string | undefined;
            isMain?: boolean | undefined;
        }[] | undefined;
    }, {
        name: string;
        value: string;
        sku: string;
        price: number;
        stock: number;
        isActive?: boolean | undefined;
        compareAtPrice?: number | undefined;
        images?: {
            url: string;
            publicId: string;
            alt?: string | undefined;
            isMain?: boolean | undefined;
        }[] | undefined;
    }>, "many">>>>;
    basePrice: z.ZodOptional<z.ZodNumber>;
    compareAtPrice: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    stock: z.ZodOptional<z.ZodNumber>;
    lowStockThreshold: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    tags: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>>;
    attributes: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>>>;
    isFeatured: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
    isActive: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
    seo: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        metaTitle: z.ZodOptional<z.ZodString>;
        metaDescription: z.ZodOptional<z.ZodString>;
        metaKeywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        canonicalUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        metaTitle?: string | undefined;
        metaDescription?: string | undefined;
        metaKeywords?: string[] | undefined;
        canonicalUrl?: string | undefined;
    }, {
        metaTitle?: string | undefined;
        metaDescription?: string | undefined;
        metaKeywords?: string[] | undefined;
        canonicalUrl?: string | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    isActive?: boolean | undefined;
    description?: string | undefined;
    sku?: string | undefined;
    compareAtPrice?: number | undefined;
    stock?: number | undefined;
    images?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
        isMain?: boolean | undefined;
    }[] | undefined;
    shortDescription?: string | undefined;
    category?: string | undefined;
    subcategory?: string | undefined;
    brand?: string | undefined;
    variants?: {
        name: string;
        isActive: boolean;
        value: string;
        sku: string;
        price: number;
        stock: number;
        compareAtPrice?: number | undefined;
        images?: {
            url: string;
            publicId: string;
            alt?: string | undefined;
            isMain?: boolean | undefined;
        }[] | undefined;
    }[] | undefined;
    basePrice?: number | undefined;
    lowStockThreshold?: number | undefined;
    tags?: string[] | undefined;
    attributes?: Record<string, string> | undefined;
    isFeatured?: boolean | undefined;
    seo?: {
        metaTitle?: string | undefined;
        metaDescription?: string | undefined;
        metaKeywords?: string[] | undefined;
        canonicalUrl?: string | undefined;
    } | undefined;
}, {
    name?: string | undefined;
    isActive?: boolean | undefined;
    description?: string | undefined;
    sku?: string | undefined;
    compareAtPrice?: number | undefined;
    stock?: number | undefined;
    images?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
        isMain?: boolean | undefined;
    }[] | undefined;
    shortDescription?: string | undefined;
    category?: string | undefined;
    subcategory?: string | undefined;
    brand?: string | undefined;
    variants?: {
        name: string;
        value: string;
        sku: string;
        price: number;
        stock: number;
        isActive?: boolean | undefined;
        compareAtPrice?: number | undefined;
        images?: {
            url: string;
            publicId: string;
            alt?: string | undefined;
            isMain?: boolean | undefined;
        }[] | undefined;
    }[] | undefined;
    basePrice?: number | undefined;
    lowStockThreshold?: number | undefined;
    tags?: string[] | undefined;
    attributes?: Record<string, string> | undefined;
    isFeatured?: boolean | undefined;
    seo?: {
        metaTitle?: string | undefined;
        metaDescription?: string | undefined;
        metaKeywords?: string[] | undefined;
        canonicalUrl?: string | undefined;
    } | undefined;
}>;
export declare const createCategorySchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    image: z.ZodOptional<z.ZodObject<{
        url: z.ZodString;
        publicId: z.ZodString;
        alt: z.ZodOptional<z.ZodString>;
        isMain: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        publicId: string;
        alt?: string | undefined;
        isMain?: boolean | undefined;
    }, {
        url: string;
        publicId: string;
        alt?: string | undefined;
        isMain?: boolean | undefined;
    }>>;
    isActive: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    isActive: boolean;
    description?: string | undefined;
    image?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
        isMain?: boolean | undefined;
    } | undefined;
}, {
    name: string;
    isActive?: boolean | undefined;
    description?: string | undefined;
    image?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
        isMain?: boolean | undefined;
    } | undefined;
}>;
export declare const createBrandSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    logo: z.ZodOptional<z.ZodObject<{
        url: z.ZodString;
        publicId: z.ZodString;
        alt: z.ZodOptional<z.ZodString>;
        isMain: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        publicId: string;
        alt?: string | undefined;
        isMain?: boolean | undefined;
    }, {
        url: string;
        publicId: string;
        alt?: string | undefined;
        isMain?: boolean | undefined;
    }>>;
    website: z.ZodOptional<z.ZodString>;
    isActive: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    isActive: boolean;
    description?: string | undefined;
    logo?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
        isMain?: boolean | undefined;
    } | undefined;
    website?: string | undefined;
}, {
    name: string;
    isActive?: boolean | undefined;
    description?: string | undefined;
    logo?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
        isMain?: boolean | undefined;
    } | undefined;
    website?: string | undefined;
}>;
export declare const productFilterSchema: z.ZodObject<{
    category: z.ZodOptional<z.ZodString>;
    subcategory: z.ZodOptional<z.ZodString>;
    brand: z.ZodOptional<z.ZodString>;
    minPrice: z.ZodOptional<z.ZodNumber>;
    maxPrice: z.ZodOptional<z.ZodNumber>;
    rating: z.ZodOptional<z.ZodNumber>;
    tags: z.ZodOptional<z.ZodString>;
    inStock: z.ZodOptional<z.ZodBoolean>;
    isFeatured: z.ZodOptional<z.ZodBoolean>;
    search: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodOptional<z.ZodEnum<["price_asc", "price_desc", "rating", "newest", "bestselling", "name_asc"]>>;
    page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    search?: string | undefined;
    rating?: number | undefined;
    category?: string | undefined;
    subcategory?: string | undefined;
    brand?: string | undefined;
    tags?: string | undefined;
    isFeatured?: boolean | undefined;
    minPrice?: number | undefined;
    maxPrice?: number | undefined;
    inStock?: boolean | undefined;
    sortBy?: "price_asc" | "price_desc" | "rating" | "newest" | "bestselling" | "name_asc" | undefined;
}, {
    search?: string | undefined;
    limit?: number | undefined;
    rating?: number | undefined;
    category?: string | undefined;
    subcategory?: string | undefined;
    brand?: string | undefined;
    tags?: string | undefined;
    isFeatured?: boolean | undefined;
    minPrice?: number | undefined;
    maxPrice?: number | undefined;
    inStock?: boolean | undefined;
    sortBy?: "price_asc" | "price_desc" | "rating" | "newest" | "bestselling" | "name_asc" | undefined;
    page?: number | undefined;
}>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type ProductFilterInput = z.infer<typeof productFilterSchema>;
//# sourceMappingURL=product.schemas.d.ts.map