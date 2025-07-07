import {z} from 'zod'

export const updateUserDetailsSchema = z.object({
  fullName: z.string().max(100,"Full name is too long (maximum 100 characters)").optional(),
  username: z.string().max(30,"Username is too long (maximum 30 characters)").optional(),
  email: z.string().email("Please enter a valid email address").max(255,"Email address is too long (maximum 255 characters)").optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
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
})

export type updateUserDetailsData = z.infer<typeof updateUserDetailsSchema>