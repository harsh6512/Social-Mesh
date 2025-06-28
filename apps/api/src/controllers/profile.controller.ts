import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Request, Response } from "express"
import { prisma } from "../db/index.js"
import { formatZodErrors } from "../utils/zodErrorFormatter.js";
import { AuthenticatedRequest } from "../types/AuthenticatedRequest.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ProfileSchemas } from "@repo/common/schemas";
import { sanitizeUser } from "../utils/sanitizeUser.js";
import { validationErrors } from "../utils/validationErrors.js";

const completeProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { bio, accountType } = req.body ?? {}
  const profilePic = req.file?.path
  const userInput = { bio, accountType, profilePic };
  const result = ProfileSchemas.completeProfileSchema.safeParse(userInput)
  if (!result.success) {
    validationErrors(result)
  }

  const existingProfile = await prisma.profile.findUnique({
    where: { userId: req.user.id },
  });

  if (existingProfile) {
    throw new ApiError(400, "You have already completed your profile");
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
      userId: req.user.id,
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
  const { bio, accountType } = req.body ?? {}
  const profilePic = req.file?.path
  const userInput = { bio, accountType, profilePic };
  const result = ProfileSchemas.editProfileSchema.safeParse(userInput);
  if (!result.success) {
    validationErrors(result)
  }

  const existingProfile = await prisma.profile.findUnique({
    where: { userId: req.user.id },
  });

  if (!existingProfile) {
    throw new ApiError(404, "Profile not found");
  }

  let profilePicUrl: string | null = null
  if (userInput.profilePic) {
    const uploaded = await uploadOnCloudinary(userInput.profilePic)
    if (!uploaded || !uploaded?.url) {
      throw new ApiError(400, "Error while uploading the profile pic")
    }
    profilePicUrl = uploaded.url
  }

  const updatedProfile = await prisma.profile.update({
    where: { userId: req.user.id },
    data: {
      bio: userInput.bio ?? existingProfile.bio,
      profilePic: profilePicUrl ?? existingProfile.profilePic,
    },
  });

  if (!updatedProfile) {
    throw new ApiError(500, "Error while updating the profile");
  }

  const safeProfile = sanitizeUser(updatedProfile);
  return res
    .status(200)
    .json(new ApiResponse(200, safeProfile, "The profile was updated successfully"));
});
const oauthCompleteProfile = asyncHandler(async (req: AuthenticatedRequest, res) => {

})
export {
  completeProfile,
  editProfile,
}