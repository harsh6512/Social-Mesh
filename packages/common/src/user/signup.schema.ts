import { z } from 'zod'

export const signupSchema = z.object({
  fullName: z.string(),
  username: z.string(),
  email: z.string().email(),
  password: z.string().min(6),
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