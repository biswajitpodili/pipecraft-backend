import * as z from "zod";

export const CareerSchema = z.object({
  careerId: z.string(),
  jobTitle: z.string().min(2).max(100),
  department: z.string().min(2).max(100),
  location: z.string().min(2).max(100),
  jobType: z.enum(["Full-time", "Part-time", "Contract", "Internship"]),
  experienceLevel: z.enum(["Entry Level", "Mid Level", "Senior Level", "Lead"]),
  description: z.string().min(10).max(5000),
  responsibilities: z.array(z.string().min(2).max(500)),
  requirements: z.array(z.string().min(2).max(500)),
  qualifications: z.array(z.string().min(2).max(500)).optional(),
  salary: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    currency: z.string().default("USD"),
  }).optional(),
  isActive: z.boolean().default(true),
  numberOfPositions: z.number().int().positive().default(1),
  applicationDeadline: z.string().default(new Date().toISOString()).optional(),
  createdAt: z.string().default(new Date().toISOString()),
  updatedAt: z.string().optional(),
});
