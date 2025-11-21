import * as z from "zod";

export const ProjectModelSchema = z.object({
  projectId: z.string(),
  name: z.string().min(2).max(100),
  client: z.string().min(2).max(100),
  scope: z.string().min(10).max(2000),
  image: z.string().url().optional(),
});
