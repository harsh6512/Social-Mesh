import {z} from 'zod'

export const oauthCompleteProfileSchema=z.object({
    username: z.string().max(30, "Username is too long (maximum 30 characters)").optional(),
    bio:z.string().max(300,"Bio is too long (maximum 300 characters)").optional(),
    profilePic:z.string().optional(),
})

export type oauthCompleteProfileData=z.infer<typeof oauthCompleteProfileSchema>