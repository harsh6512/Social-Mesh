import {z} from 'zod'

export const updateUserDetailsSchema = z.object({
  fullName: z.string(),
  username: z.string(),
  email: z.string().email(),
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
})

export type updateUserDetailsData = z.infer<typeof updateUserDetailsSchema>