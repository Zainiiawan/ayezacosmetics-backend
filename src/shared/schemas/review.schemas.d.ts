import { z } from 'zod';
export declare const createReviewSchema: z.ZodObject<{
    product: z.ZodString;
    rating: z.ZodNumber;
    title: z.ZodString;
    body: z.ZodString;
    images: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    product: string;
    rating: number;
    title: string;
    body: string;
    images?: string[] | undefined;
}, {
    product: string;
    rating: number;
    title: string;
    body: string;
    images?: string[] | undefined;
}>;
export declare const updateReviewModerationSchema: z.ZodObject<{
    isApproved: z.ZodBoolean;
    moderationNote: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    isApproved: boolean;
    moderationNote?: string | undefined;
}, {
    isApproved: boolean;
    moderationNote?: string | undefined;
}>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewModerationInput = z.infer<typeof updateReviewModerationSchema>;
//# sourceMappingURL=review.schemas.d.ts.map