import {z} from 'zod'

export const editProfileSchema=z.object({
  bio: z.string().max(300,"Bio is too long (maximum 300 characters)").optional(),
  profilePic: z.string().optional(),
})

export type editProfileData=z.infer<typeof editProfileSchema>