import toast from "react-hot-toast";
import { ApiError } from "./apierror";

export const handleApiError = (error: unknown) => {
  if (error instanceof ApiError) {
    toast.error(error.message ?? "Something went wrong.");
    return;
  }
  toast.error("Network error. Please check your connection.");
};