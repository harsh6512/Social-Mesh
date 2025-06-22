import {z} from 'zod'

export const passwordSchema = z.object({
  password: z.string().min(6),
})

export type passwordData = z.infer<typeof passwordSchema>