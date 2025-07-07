import {z} from 'zod'

export const completeProfileSchema = z.object({
  bio: z.string().max(300,"Bio is too long (maximum 300 characters)").optional(),
  profilePic: z.string().optional(),
})

export type completeProfileData = z.infer<typeof completeProfileSchema>