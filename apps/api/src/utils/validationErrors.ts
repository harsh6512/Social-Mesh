import { ApiError } from "./ApiError.js";
import { z } from "zod";

export const validationErrors = (result: z.SafeParseError<any>, customMessage: string = "Inputs are not correct") => {
  const formattedErrors = result.error.format() as unknown as Record<string, { _errors: string[] }>;
  const errorMessages = Object.entries(formattedErrors)
    .filter(([key]) => key !== "_errors")
    .map(([field, issue]) => ({
      field,
      message: issue._errors.join(", ")
    }));
  throw new ApiError(400, customMessage, errorMessages);
}
