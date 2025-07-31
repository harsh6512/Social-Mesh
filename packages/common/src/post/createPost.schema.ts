import {z} from 'zod'

export const createPostSchema = z.discriminatedUnion('postType', [
  z.object({
    postType: z.literal('Image'),
    mediaUrl: z.string(),
    caption: z.string().max(500,"Caption is too long (maximum 500 characters)").trim().optional(),
  }),
  z.object({
    postType: z.literal('Video'),
    mediaUrl: z.string(),
    thumbnailUrl: z.string().optional(), 
    caption: z.string().max(500,"Caption is too long (maximum 500 characters)").trim().optional(),
  }),
  z.object({
    postType: z.literal('Tweet'),
    caption: z.string().max(500,"Caption is too long (maximum 500 characters)").trim(),
    mediaUrl: z.string().optional(),
  }),
])

export type CreatePostData = z.infer<typeof createPostSchema>