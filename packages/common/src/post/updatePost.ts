import z from 'zod'

export const updatePostSchema=z.object({
    caption:z.string()
    .max(500,"Caption is too long (maximum 500 characters)")
    .trim()
    .optional()
})

export type updatePostData=z.infer<typeof updatePostSchema>