import {z} from 'zod'

export const tokenSchema=z.object({
    token:z.string().max(255,"Invalid token format")
})

export type tokenData=z.infer<typeof tokenSchema>