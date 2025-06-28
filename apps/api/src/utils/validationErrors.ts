import { ApiError } from "./ApiError.js";
import { formatZodErrors } from "./zodErrorFormatter.js";
import { z } from "zod";

export const validationErrors = (result: z.SafeParseError<any>, customMessage: string = "Inputs are not correct") => {
  const formattedErrors = result.error.format() as unknown as Record<string, { _errors: string[] }>;
  const errorMessages = formatZodErrors(formattedErrors);
  throw new ApiError(400, customMessage, errorMessages);
}
