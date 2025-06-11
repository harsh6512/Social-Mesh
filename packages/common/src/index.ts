import {z} from 'zod'

const signupSchema=z.object({
    username:z.string(),
    fullName:z.string(),
    email:z.string().email(),
    password:z.string().min(6),
    dateOfBirth: z.string().refine((val) => {
    const date = new Date(val)
    return !isNaN(date.getTime()) && date < new Date()
  }, {
    message: "Invalid or future date of birth"
  }),
})

export type SignupData = z.infer<typeof signupSchema>

const signinSchema=z.object({
    username:z.string(),
    password:z.string().min(6)
})

export type SigninData=z.infer<typeof signinSchema>

export {
    signinSchema,
    signupSchema,
}