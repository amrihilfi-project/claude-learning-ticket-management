import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required.").refine((v) => v.trim().length >= 3, "Name must be at least 3 characters."),
  email: z.string().min(1, "Email is required.").email({ message: "Enter a valid email address." }),
  password: z.string().min(1, "Password is required.").min(8, "Password must be at least 8 characters."),
  role: z.enum(["ADMIN", "AGENT"]),
});
