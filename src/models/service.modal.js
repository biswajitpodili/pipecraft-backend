import * as z from "zod";

export const ServiceModelSchema = z.object({
    serviceId: z.string(),
    title: z.string().min(2).max(100),
    description: z.string().min(10).max(1000),
    features: z.array(z.string().min(2).max(200)).optional(),
    isActive: z.boolean().default(true),
    createdAt: z.string().default(new Date().toISOString()),
    updatedAt: z.string().optional(),
});