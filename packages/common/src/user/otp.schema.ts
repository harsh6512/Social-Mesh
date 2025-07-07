import {z} from 'zod'

export const OTPSchema = z.object({
  otp: z.string().length(6, "OTP is invalid (must be exactly 6 digits)").regex(/^\d+$/, "OTP must contain only numbers")
});

export type OTPInputData = z.infer<typeof OTPSchema>;