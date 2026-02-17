import { z } from 'zod'

export const signupSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(100, "Full name is too long (maximum 100 characters)"),
  username: z.string().min(1, "Email is required").max(30, "Username is too long (maximum 30 characters)"),
  email: z.string().min(1, "Username is required").email("Please enter a valid email address").max(255, "Email address is too long (maximum 255 characters)"),
  password: z.string().min(6, "Password is too short (minimum 6 characters)"),
});

export type SignupData = z.infer<typeof signupSchema>