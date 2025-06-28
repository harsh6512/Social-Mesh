import { z } from 'zod'

export const signinSchema = z.object({
  username: z.string().max(30),
  password: z.string().min(6)
})

export type SigninData = z.infer<typeof signinSchema>