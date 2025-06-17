import { Request } from "express";
import { User } from "../generated/prisma/index.js";

export interface AuthenticatedRequest extends Request {
  user: Omit<User, "password" | "refreshToken">;
}
