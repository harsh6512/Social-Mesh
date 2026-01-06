import { Response } from 'express';
import { ProfileSchemas } from '@repo/common/schemas';

import { prisma } from '../db/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadOnCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';
import { validationErrors } from '../utils/validationErrors.js';

import { AuthenticatedRequest } from '../types/AuthenticatedRequest.js';

const completeProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id

  const bio = req.body.bio ?? {}
  const profilePic = req.file?.path
  const userInput = { bio, profilePic };
  const [userWithProfile, validationResult] = await Promise.all([prisma.user.findUnique({
    where: { id: userId },
    select: {
      provider: true,
      profile: {
        select: { id: true }
      }
    }
  }),
  ProfileSchemas.completeProfileSchema.safeParse(userInput)
  ])

  if (!userWithProfile || userWithProfile.provider !== "Credentials") {
    throw new ApiError(403, "This route is only accessible for users who signed up with email/password");
  }

  if (userWithProfile.profile) {
    throw new ApiError(400, "You have already completed your profile");
  }

  if (!validationResult.success) {
    validationErrors(validationResult)
  }

  let profilePicUrl: string | null = null
  if (userInput.profilePic) {
    const uploaded = await uploadOnCloudinary(userInput.profilePic)
    if (!uploaded || !uploaded?.url) {
      throw new ApiError(400, "Error while uploading the profile pic")
    }
    profilePicUrl = uploaded.url
  }

  const profile = await prisma.profile.create({
    data: {
      userId: userId,
      bio: userInput.bio,
      profilePic: profilePicUrl,
    },
  });

  if (!profile) {
    throw new ApiError(500, "Error while completing the profile")
  }

  return res
    .status(200)
    .json(new ApiResponse(200, profile, "The profile completed successfully"))
})

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

const oauthCompleteProfile = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id

  const { bio, gender, dateOfBirth } = req.body;
  const profilePic = req.file?.path;
  const userInput = { bio, gender, dateOfBirth, profilePic };

  const [userWithProfile, validationResult] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        provider: true,
        profile: {
          select: { id: true }
        }
      }
    }),
    ProfileSchemas.oauthCompleteProfileSchema.safeParse(userInput)
  ])

  if (!userWithProfile || userWithProfile.provider !== "Google") {
    throw new ApiError(403, "Access denied: Google authentication required")
  }

  if (userWithProfile.profile) {
    throw new ApiError(400, "You have already completed your profile")
  }

  if (!validationResult.success) {
    validationErrors(validationResult)
  }

  let profilePicUrl: string | null = null
  if (userInput.profilePic) {
    const uploaded = await uploadOnCloudinary(userInput.profilePic)
    if (!uploaded || !uploaded?.url) {
      throw new ApiError(400, "Error while uploading the profile pic")
    }
    profilePicUrl = uploaded.url
  }

  const profile = await prisma.user.update({
    where: {
      id: userId
    },
    data: {
      gender: userInput.gender,
      dateOfBirth: userInput.dateOfBirth,
      profile: {
        create: {
          bio: userInput.bio,
          profilePic: profilePicUrl
        }
      }
    },
    include: {
      profile: true,
    }
  })

  if (!profile) {
    throw new ApiError(500, "Error while completing the profile")
  }

  return res
    .status(200)
    .json(new ApiResponse(200, profile, "User profile completed successfully"))
})

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