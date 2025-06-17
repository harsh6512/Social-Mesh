import jwt from "jsonwebtoken";
import { User } from "../generated/prisma/index.js";
import { ENV } from "../constants/env.js";
import { prisma } from "../db/index.js"

type AccessTokenPayload = Pick<User, "id" | "email" | "username" | "fullName">;

const generateAccessToken = (user: AccessTokenPayload): string => {
  const expiry = ENV.ACCESS_TOKEN_EXPIRY as "1h" | "2d" | "30m";
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
    },
    ENV.ACCESS_TOKEN_SECRET,
    {
      expiresIn: expiry
    }
  );
};

type RefreshTokenPayload = Pick<User, "id">;

const generateRefreshToken = (user: RefreshTokenPayload)
  : string => {
  const expiry = ENV.ACCESS_TOKEN_EXPIRY as "7d" | "30d" | "90d"
  return jwt.sign(
    {
      _id: user.id
    },
    ENV.REFRESH_TOKEN_SECRET,
    {
      expiresIn: expiry
    }
  )
}
const generateAccessAndRefreshTokens = async (
  user: AccessTokenPayload
): Promise<{ accessToken: string; refreshToken: string }> => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  return { accessToken, refreshToken };
};

export {
  generateAccessToken,
  generateRefreshToken,
  generateAccessAndRefreshTokens,
}
