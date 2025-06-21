import { z } from 'zod'

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

export type forgotPasswordData = z.infer<typeof forgotPasswordSchema>