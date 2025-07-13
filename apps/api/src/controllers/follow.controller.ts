import { Response } from 'express';
import { followSchemas } from '@repo/common/schemas';

import { prisma } from '../db/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validationErrors } from '../utils/validationErrors.js';

import { AuthenticatedRequest } from '../types/AuthenticatedRequest.js';

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

    if (followerId === followingId) throw new ApiError(400, "You cannot follow yourself");

    const followingProfile = await prisma.profile.findUnique({
        where: { userId: followingId },
        select: { id: true }
    })

    if (!followingProfile?.id) {
        throw new ApiError(404, "Following profile not found");
    }

    const followerProfileId = req.user.profile.id;
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
            .json(new ApiResponse(200, {}, "User unfollowed successfully"));
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
        .json(new ApiResponse(200, {}, "User followed successfully"));
});

const getFollowers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const cursorParam = req.query.cursor as string | undefined;
    const userIdParam = req.params.id;

    if (!userIdParam) throw new ApiError(400, "User ID is required");

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
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const cursorParam = req.query.cursor as string | undefined;
    const userIdParam = req.params.id

    if (!userIdParam) throw new ApiError(400, "User id is required")
    const userId = parseInt(userIdParam)

    if (isNaN(userId)) throw new ApiError(400, "Invalid user IDs")
    const userProfile = await prisma.profile.findUnique({
        where: { userId },
        select: { id: true },
    });

    const cursor = cursorParam ? parseInt(cursorParam) : undefined
    if (cursor && isNaN(cursor)) throw new ApiError(400, "Invalid Cursor")

    const following = await prisma.follow.findMany({
        where: {
            follower: {
                userId,
            }
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
        }
    })

    const hasMore = following.length > limit
    const results = hasMore ? following.slice(0, limit) : following

    type FollowingResult = {
        id: number;
        follower: {
            profilePic: string | null;
            user: {
                fullName: string;
                username: string;
            };
        };
    };

    const formattedFollowing = results.map((f: FollowingResult) => ({
        id: f.id,
        profilePic: f.follower?.profilePic,
        fullName: f.follower?.user?.fullName,
        username: f.follower?.user?.username
    }));

    const nextCursor = hasMore ? results[results.length - 1].id : null
    return res
        .status(200)
        .json(new ApiResponse(200, { following: formattedFollowing, nextCursor, hasMore }, "User following fetched successfully"))
})

const removeFollower = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.id;
    const followerIdParams = req.params.id;//The id of the user of who is following the current user

    if (!followerIdParams) throw new ApiError(400, "Follower id is required");

    const followerId = parseInt(followerIdParams);
    if (isNaN(followerId)) throw new ApiError(400, "Invalid follower id");

    const followerProfile =await prisma.profile.findUnique({
            where: { userId: followerId },
            select: { id: true }
        })

    if (!followerProfile) throw new ApiError(404, "Follower profile doesn't exist");

    const result = await prisma.follow.deleteMany({
        where: {
            followerId: followerProfile.id,
            followingId: req.user.profile.id,
        }
    });

    if (result.count === 0) {
        throw new ApiError(400, "This user is not following you");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "The follower was removed successfully"));
});

const getFollowSuggestions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.id;
    const userProfileID =req.user.profile.id
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const cursorParam = req.query.cursor as string | undefined;
    const cursor = cursorParam ? parseInt(cursorParam) : undefined;

    if (cursorParam && isNaN(cursor!)) throw new ApiError(400, "Invalid cursor");

    const suggestions = await prisma.profile.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
        orderBy: { id: 'desc' },
        where: {
            userId: { not: userId },
            NOT: {
                followers: {
                    some: {
                        followerId: userProfileID
                    }
                }
            }
        },
        select: {
            id: true,
            profilePic: true,
            user: {
                select: {
                    username: true,
                    fullName: true,
                }
            }
        },
    });

    const hasMore = suggestions.length > limit;
    const results = hasMore ? suggestions.slice(0, limit) : suggestions;
    const nextCursor = hasMore ? results[results.length - 1].id : null;

    type suggestionsResult = {
        id: number,
        profilePic: string | null,
        user: {
            username: string,
            fullName: string,
        }
    }

    const formattedSuggestions = results.map((profile: suggestionsResult) => ({
        id: profile.id,
        profilePic: profile.profilePic,
        fullName: profile.user.fullName,
        username: profile.user.username
    }));

    return res.status(200).json(
        new ApiResponse(200, {
            suggestions: formattedSuggestions,
            hasMore,
            nextCursor
        }, "Follow suggestions fetched successfully")
    );
});

const getFollowersByIntention = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userIdParam = req.params.id
    const intention = req.params.intention
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50)
    const cursorParam = req.query.cursor as string | undefined

    if (!userIdParam) throw new ApiError(400, "User id is required")
    const userId = parseInt(userIdParam)

    if (isNaN(userId)) throw new ApiError(400, "Invalid user id")

    if (userId !== req.user.id) throw new ApiError(401, "Unauthorized Request") //user cannot filter other account followers

    const validationResult = followSchemas.intentionSchema.safeParse({ intention });
    if (!validationResult.success) {
        validationErrors(validationResult);
    }

    const cursor = cursorParam ? parseInt(cursorParam) : undefined
    if (cursorParam && isNaN(cursor!)) throw new ApiError(400, "Invalid cursor")

    const followers = await prisma.follow.findMany({
        where: {
            followingId:req.user.profile.id, 
            intention: intention
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
    })
    const hasMore = followers.length > limit
    const results = hasMore ? followers.slice(0, limit) : followers

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

    return res
        .status(200)
        .json(new ApiResponse(200, { followers: formattedFollowers, nextCursor, hasMore }, "The followers fetched successfully"))
})

const getFollowingByIntention = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userIdParam = req.params.id;
    const intention = req.params.intention;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const cursorParam = req.query.cursor as string | undefined;

    if (!userIdParam) throw new ApiError(400, "User id is required");
    const userId = parseInt(userIdParam);

    if (isNaN(userId)) throw new ApiError(400, "Invalid user id");

    if (userId !== req.user.id) throw new ApiError(401, "Unauthorized Request"); // user cannot filter other account following

    const validationResult = followSchemas.intentionSchema.safeParse({ intention });
    if (!validationResult.success) {
        validationErrors(validationResult);
    }

    const cursor = cursorParam ? parseInt(cursorParam) : undefined;
    if (cursorParam && isNaN(cursor!)) throw new ApiError(400, "Invalid cursor");

    const following = await prisma.follow.findMany({
        where: {
            followerId: req.user.profile.id,
            intention: intention
        },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
        orderBy: {
            id: 'asc',
        },
        select: {
            id: true,
            following: {
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

    const hasMore = following.length > limit;
    const results = hasMore ? following.slice(0, limit) : following;

    type FollowingResult = {
        id: number;
        following: {
            profilePic: string | null;
            user: {
                fullName: string;
                username: string;
            };
        };
    };

    const formattedFollowing = results.map((f: FollowingResult) => ({
        id: f.id,
        profilePic: f.following?.profilePic,
        fullName: f.following?.user?.fullName,
        username: f.following?.user?.username
    }));

    const nextCursor = hasMore ? results[results.length - 1].id : null;

    return res
        .status(200)
        .json(new ApiResponse(200, { following: formattedFollowing, nextCursor, hasMore }, "Following fetched successfully"));
});

const followStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const accountIdParam = req.params.id;
    const userId = req.user.id;

    if (!accountIdParam) throw new ApiError(400, "Account id is required");

    const accountId = parseInt(accountIdParam);
    if (isNaN(accountId)) throw new ApiError(400, "Invalid account id");

    const followRecord = await prisma.follow.findFirst({
        where: {
            follower: {
                userId
            },
            following: {
                userId: accountId
            },
        },
        select: {
            id: true,
        }
    });


    const isFollowing = !!followRecord;

    return res
        .status(200)
        .json(new ApiResponse(200, { isFollowing }, isFollowing ? "User is following" : "User is not following"));
});

export {
    followUnfollowUser,
    getFollowers,
    getFollowing,
    removeFollower,
    getFollowSuggestions,
    getFollowersByIntention,
    getFollowingByIntention,
    followStatus
}