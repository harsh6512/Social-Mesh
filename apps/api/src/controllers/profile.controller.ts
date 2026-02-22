import { Request, Response, CookieOptions } from 'express';
import { ProfileSchemas } from '@repo/common/schemas';

import { prisma } from '../db/index.js';
import type { Prisma } from '@prisma/client';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadOnCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';
import { validationErrors } from '../utils/validationErrors.js';
import {
    generateAccessAndRefreshTokens,
} from "../services/jwt.service.js";

import { AuthenticatedRequest } from '../types/AuthenticatedRequest.js';
import { sanitizeUser } from '../utils/sanitizeUser.js';

const completeProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  const bio = req.body.bio ?? null;
  const profilePicPath = req.file?.path;

  const userInput = { bio, profilePic: profilePicPath };

  const [userWithProfile, validationResult] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        provider: true,
        profile: {
          select: {
            id: true,
            bio: true,
            profilePic: true
          }
        }
      }
    }),
    ProfileSchemas.completeProfileSchema.safeParse(userInput)
  ]);

  if (!userWithProfile) {
    throw new ApiError(404, "User not found");
  }

  if (userWithProfile.provider !== "Credentials") {
    throw new ApiError(
      403,
      "This route is only accessible for users who signed up with email/password"
    );
  }

  if (!validationResult.success) {
    validationErrors(validationResult);
  }

  if (
    userWithProfile.profile?.bio ||
    userWithProfile.profile?.profilePic
  ) {
    throw new ApiError(400, "You have already completed your profile");
  }

  let profilePicUrl: string | null = null;

  if (profilePicPath) {
    const uploaded = await uploadOnCloudinary(profilePicPath);

    if (!uploaded || !uploaded.url) {
      throw new ApiError(400, "Error while uploading the profile pic");
    }

    profilePicUrl = uploaded.url;
  }

  const updatedProfile = await prisma.profile.update({
    where: {
      userId: userId
    },
    data: {
      bio: bio,
      profilePic: profilePicUrl
    }
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedProfile, "Profile completed successfully")
    );
});

const editProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  const { bio } = req.body ?? {};
  const profilePic = req.file?.path;

  const userInput = { bio, profilePic };

  const [existingProfile, validationResult] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId },
      select: {
        id: true,
        bio: true,
        profilePic: true,
      },
    }),
    ProfileSchemas.editProfileSchema.safeParse(userInput),
  ]);

  if (!existingProfile) {
    throw new ApiError(404, "Profile not found");
  }

  if (!validationResult.success) {
    validationErrors(validationResult);
  }

  let profilePicUrl: string | null = null;
  if (userInput.profilePic) {
    const uploaded = await uploadOnCloudinary(userInput.profilePic);

    if (!uploaded || !uploaded.url) {
      throw new ApiError(400, "Error while uploading the profile pic");
    }

    profilePicUrl = uploaded.url;

    if (existingProfile.profilePic) {
      const publicId = existingProfile.profilePic
        .split("?")[0]
        .split("/")
        .pop()
        ?.replace(/\.[^/.]+$/, "");

      if (publicId) {
        const response = await deleteFromCloudinary(publicId);

        if (response?.result !== "ok") {
          console.error("Failed to delete old profile picture from Cloudinary");
        }
      }
    }
  }

  const updatedProfile = await prisma.profile.update({
    where: { userId },
    data: {
      bio: userInput.bio ?? existingProfile.bio,
      profilePic: profilePicUrl ?? existingProfile.profilePic,
    },
  });

  if (!updatedProfile) {
    throw new ApiError(500, "Error while updating the profile");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedProfile, "The profile was updated successfully"));
});

const oauthCompleteProfile = asyncHandler(async (req: Request, res: Response) => {
  const { username, email, bio } = req.body; 
  const profilePicPath = req.file?.path;

  if (!email) {
    throw new ApiError(401, "Unauthorized request");
  }

  const userInput = {
    username,
    bio,
    profilePic: profilePicPath,
  };

  const validationResult = ProfileSchemas.oauthCompleteProfileSchema.safeParse(userInput);

  if (!validationResult.success) validationErrors(validationResult);

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      username: true,
      profile: { select: { id: true } },
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.profile) {
    throw new ApiError(400, "Profile already completed");
  }

  // Determine final username: use provided or keep existing
  const finalUsername = username?.toLowerCase() || user.username.toLowerCase();

  // Check username uniqueness only if they're changing it
  if (finalUsername !== user.username.toLowerCase()) {
    const existingUser = await prisma.user.findUnique({
      where: { username: finalUsername }
    });

    if (existingUser) {
      throw new ApiError(409, "Username already taken");
    }
  }

  let profilePicUrl: string | null = null;

  if (profilePicPath) {
    const uploaded = await uploadOnCloudinary(profilePicPath);

    if (!uploaded?.url) {
      throw new ApiError(400, "Error uploading profile picture");
    }

    profilePicUrl = uploaded.url;
  }

  const updatedUser = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    return tx.user.update({
      where: { id: user.id },
      data: {
        username: finalUsername,
        profile: {
          create: {
            bio,
            profilePic: profilePicUrl,
          },
        },
      },
      include: {
        profile: true,
      },
    });
  });

  const safeUser = sanitizeUser(updatedUser);
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(safeUser);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken }
  });

  const options: CookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  return res
    .status(200)
    .clearCookie("completeProfileToken")
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, safeUser, "User profile completed successfully"));
});


const getMYProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id
  const profile = await prisma.profile.findUnique({
    where: {
      userId: userId
    },
    select: {
      bio: true,
      profilePic: true,
      user: {
        select: {
          fullName: true,
          username: true,
        }
      },
      _count: {
        select: {
          followers: true,
          following: true,
        }
      }
    }
  })
  if (!profile) {
    throw new ApiError(404, "Profile not found")
  }
  return res
    .status(200)
    .json(new ApiResponse(200, profile, "Profile fetched successfully"))
})

const getPublicProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userIdParam = req.params.id
  const currentUserId = req.user?.id

  if (!userIdParam) {
    throw new ApiError(400, "User ID is required")
  }

  const userId = parseInt(userIdParam)

  const [profile, isFollower] = await Promise.all([
    prisma.profile.findUnique({
      where: {
        userId: userId
      },
      select: {
        bio: true,
        profilePic: true,
        user: {
          select: {
            fullName: true,
            username: true,
          }
        },
        _count: {
          select: {
            followers: true,
            following: true,
          }
        }
      }
    }),
    (currentUserId && currentUserId !== userId) ? prisma.follow.findFirst({
      where: {
        followerId: currentUserId,
        followingId: userId
      }
    }) : null
  ])
  if (!profile) {
    throw new ApiError(404, "Profile not found")
  }

  const data = {
    ...profile,
    isFollowing: currentUserId && currentUserId !== userId ? !!isFollower : false
  }
  return res
    .status(200)
    .json(new ApiResponse(200, data, "Profile fetched successfully"))
})

export {
  completeProfile,
  editProfile,
  oauthCompleteProfile,
  getMYProfile,
  getPublicProfile
}