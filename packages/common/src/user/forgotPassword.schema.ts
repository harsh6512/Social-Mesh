import { z } from 'zod'

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address").max(255,"Email address is too long (maximum 255 characters)"),
})

export type forgotPasswordData = z.infer<typeof forgotPasswordSchema>