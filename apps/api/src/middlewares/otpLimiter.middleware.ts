import rateLimit from "express-rate-limit";
import { ApiResponse } from "../utils/ApiResponse.js";

export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res) => {
    return res
      .status(429)
      .json(
        new ApiResponse(
          429,
          null,
          "Too many OTP verification attempts. Please try again after 15 minutes."
        )
      );
  },
});