import {z} from 'zod'

export const passwordSchema = z.object({
  password: z.string().min(6,"Password is too short (minimum 6 characters)"),
})

export type passwordData = z.infer<typeof passwordSchema>