import { z } from 'zod'

export const signupSchema = z.object({
  fullName: z.string().max(100, "Full name is too long (maximum 100 characters)"),
  username: z.string().max(30, "Username is too long (maximum 30 characters)"),
  email: z.string().email("Please enter a valid email address").max(255, "Email address is too long (maximum 255 characters)"),
  password: z.string().min(6, "Password is too short (minimum 6 characters)"),
  gender: z.enum(["Male", "Female", "Other"]),
  dateOfBirth: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const date = new Date(val);
      return !isNaN(date.getTime()) && date < new Date();
    }, {
      message: "Invalid or future date of birth"
    }),
});

export type SignupData = z.infer<typeof signupSchema>