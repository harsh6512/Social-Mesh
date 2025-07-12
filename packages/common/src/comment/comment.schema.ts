import {z} from 'zod'

export const commentSchema=z.object({
    content:z.string()
    .max(500,"Comment is too long (maximum 500 characters)")
})

export type commentData=z.infer<typeof commentSchema >
