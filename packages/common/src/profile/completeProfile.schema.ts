import {z} from 'zod'

export const completeProfileSchema = z.object({
  bio: z.string().optional(),
  profilePic: z.string().optional(),
  accountType: z.enum(["Public", "Private"])
})

export type completeProfileData = z.infer<typeof completeProfileSchema>