import {z} from 'zod'

export const oauthCompleteProfileSchema=z.object({
    bio:z.string().max(300,"Bio is too long (maximum 300 characters)").optional(),
    gender:z.enum(["Male","Female",'Other']),
    profilePic:z.string().optional(),
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

export type googleCompleteProfileData=z.infer<typeof oauthCompleteProfileSchema>