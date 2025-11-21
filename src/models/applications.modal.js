import * as z from "zod";

export const ApplicationSchema = z.object({
  applicationId: z.string(),
  careerId: z.string(),
  applicantName: z.string().min(2).max(100),
  applicantEmail: z.string().email(),
  applicantPhone: z.string().min(7).max(15).optional(),
  resumeLink: z.string().url(),
  coverLetter: z.string().min(10).max(5000).optional(),
  appliedAt: z.string().default(new Date().toISOString()),
});
