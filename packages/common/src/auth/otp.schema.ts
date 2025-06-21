import {z} from 'zod'

export const OTPSchema = z.object({
  otp: z.string().length(6, "OTP must be exactly 6 digits").regex(/^\d+$/, "OTP must be numeric")
});

export type OTPInputData = z.infer<typeof OTPSchema>;
