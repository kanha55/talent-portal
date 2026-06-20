import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(32, "Username must be 32 characters or fewer.")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be 128 characters or fewer.");

export const accountEmailSchema = z.email("Enter a valid email address.");

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Full name is required."),
  username: usernameSchema,
  email: accountEmailSchema,
  password: passwordSchema,
});

export const signInSchema = z.object({
  email: accountEmailSchema,
  password: z.string().min(1, "Password is required."),
});

export function formatZodError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid input.";
}
