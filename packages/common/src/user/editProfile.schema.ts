import {z} from 'zod'

export const editProfileSchema=z.object({
  bio: z.string().optional(),
  profilePic: z.string().optional(),
  accountType: z.enum(["Public", "Private"]).optional()
})


export type editProfileData=z.infer<typeof editProfileSchema>