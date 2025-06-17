import { User } from "../generated/prisma/index.js";

type SanitizedUser = Omit<User, 'password' | 'refreshToken'>

function sanitizeUser(user: User): SanitizedUser {
  const { password, refreshToken, ...safeUser } = user;
  return safeUser;
}

export {
    sanitizeUser
}

