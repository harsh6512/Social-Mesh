import type { ErrorRequestHandler } from "express";
import { ApiError } from "../utils/ApiError.js";

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error("Error:", err);

  if (err instanceof ApiError) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Something went wrong",
      errors: err.errors || [],
      data: err.data || null,
    });
    return;
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};
