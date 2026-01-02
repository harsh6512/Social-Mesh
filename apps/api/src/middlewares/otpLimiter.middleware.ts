import rateLimit from "express-rate-limit";

export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 requests per windowMs
  message: {
    status: 429,
    error: "Too many OTP requests. Please try again after 15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
});
