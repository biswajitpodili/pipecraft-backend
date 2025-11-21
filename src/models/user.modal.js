import * as z from "zod";

export const UserModalSchema = z.object({
  userId: z.string(),
  email: z.email(),
  password: z.string(),
  name: z.string().min(2).max(100),
  phone: z.string().min(10).max(15).optional(),
  avatar: z.string().url().optional().default(""),
  age: z.number().min(0).optional(),
  role: z.enum(["admin", "user"]).default("user"),
});

export default UserModalSchema;
