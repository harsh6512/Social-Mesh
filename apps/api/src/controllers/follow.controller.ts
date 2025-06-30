import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Response } from 'express'
import { AuthenticatedRequest } from "../types/AuthenticatedRequest.js";
import { prisma } from "../db/index.js"
import { followSchemas } from "@repo/common/schemas";
import { validationErrors } from "../utils/validationErrors.js";

const followUnfollowUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const followerId = req.user?.id;
    const followingIdParam = req.params.id;
    if (!followingIdParam) {
        throw new ApiError(400, "Following ID is required");
    }
    const followingId = parseInt(followingIdParam);
    if (isNaN(followingId)) {
        throw new ApiError(400, "Invalid following ID");
    }

    if (!followingId) throw new ApiError(400, "The following ID is required");
    if (followerId === followingId) throw new ApiError(400, "You cannot follow yourself");

    const [followerProfile, followingProfile] = await Promise.all([
        prisma.profile.findUnique({
            where: { userId: followerId },
            select: { id: true }
        }),
        prisma.profile.findUnique({
            where: { userId: followingId },
            select: { id: true }
        })
    ]);

    if (!followerProfile?.id || !followingProfile?.id) {
        throw new ApiError(404, "Follower or Following profile not found");
    }

    const followerProfileId = followerProfile.id;
    const followingProfileId = followingProfile.id;

    const existingFollow = await prisma.follow.findUnique({
        where: {
            followerId_followingId: {
                followerId: followerProfileId,
                followingId: followingProfileId,
            }
        }
    });

    if (existingFollow) {
        await prisma.follow.delete({
            where: {
                followerId_followingId: {
                    followerId: followerProfileId,
                    followingId: followingProfileId,
                }
            }
        });

        return res
            .status(200)
            .json(new ApiResponse(200, "User unfollowed successfully"));
    }

    const { intention } = req.body;

    const validationResult = followSchemas.intentionSchema.safeParse({ intention });
    if (!validationResult.success) {
        validationErrors(validationResult);
    }

    await prisma.follow.create({
        data: {
            followerId: followerProfileId,
            followingId: followingProfileId,
            intention,
        }
    });

    return res
        .status(200)
        .json(new ApiResponse(200, "User followed successfully"));
});

const getFollowers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const cursorParam = req.query.cursor as string | undefined;
    const userIdParam = req.params.id;

    if (!userIdParam)  throw new ApiError(400, "User ID is required");

    const userId = parseInt(userIdParam);
    if (isNaN(userId)) throw new ApiError(400, "Invalid user ID");
    

    const cursor = cursorParam ? parseInt(cursorParam) : undefined;
    if (cursorParam && isNaN(cursor!)) throw new ApiError(400, "Invalid cursor");


    const followers = await prisma.follow.findMany({
        where: {
            following: {
                userId,
            },
        },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
        orderBy: {
            id: 'asc',
        },
        select: {
            id: true,
            follower: {
                select: {
                    profilePic: true,
                    user: {
                        select: {
                            fullName: true,
                            username: true,
                        },
                    },
                },
            },
        },
    });

    const hasMore = followers.length > limit;
    const results = hasMore ? followers.slice(0, limit) : followers;

    type FollowerResult = {
        id: number;
        follower: {
            profilePic: string | null;
            user: {
                fullName: string;
                username: string;
            };
        };
    };
    const formattedFollowers = results.map((f: FollowerResult) => ({
        id: f.id,
        profilePic: f.follower?.profilePic,
        fullName: f.follower?.user?.fullName,
        username: f.follower?.user?.username
    }));

    const nextCursor = hasMore ? results[results.length - 1].id : null;

    return res.status(200).json(
        new ApiResponse(
            200,
            { followers: formattedFollowers, nextCursor, hasMore },
            "User followers fetched successfully"
        )
    );
});

const getFollowing = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {

})

export {
    followUnfollowUser,
    getFollowers,
    getFollowing,
}