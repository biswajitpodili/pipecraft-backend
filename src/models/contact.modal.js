import * as z from "zod";

export const ContactSchema = z.object({
  contactId: z.string(),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(7).max(15).optional(),
  companyName: z.string().min(2).max(100).optional(),
  serviceInterested: z.string().min(2).max(100).optional(),
  message: z.string().min(10).max(1000),
  createdAt: z.string().default(new Date().toISOString()),
  updatedAt: z.string().optional(),
});
