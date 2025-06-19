import { z } from 'zod'

const signupSchema = z.object({
  fullName: z.string(),
  username: z.string(),
  email: z.string().email(),
  password: z.string().min(6),
  dateOfBirth: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const date = new Date(val);
      return !isNaN(date.getTime()) && date < new Date();
    }, {
      message: "Invalid or future date of birth"
    }),
});


export type SignupData = z.infer<typeof signupSchema>

const signinSchema = z.object({
  username: z.string(),
  password: z.string().min(6)
})

export type SigninData = z.infer<typeof signinSchema>

const forgetPasswordSchema = z.object({
  email: z.string().email(),
})

export type forgetPasswordData = z.infer<typeof forgetPasswordSchema>

const OTPSchema = z.object({
  otp: z.string().length(6, "OTP must be exactly 6 digits").regex(/^\d+$/, "OTP must be numeric")
});

export type OTPInputData = z.infer<typeof OTPSchema>;

const passwordSchema=z.object({
  password:z.string().min(6),
})

export type passwordData=z.infer<typeof passwordSchema>

export {
  signinSchema,
  signupSchema,
  forgetPasswordSchema,
  OTPSchema,
  passwordSchema,
}