import { Response } from 'express';

import { prisma } from '../db/index.js';

import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

import { AuthenticatedRequest } from '../types/AuthenticatedRequest.js';
import { PostResult } from '../types/post.types.js';

import { sendNotification } from '../services/sendNotification.js';

const likeUnlikePost = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const postIdParam = req.params.postId
    if (!postIdParam) throw new ApiError(400, "Post id is required")

    const postId = parseInt(postIdParam)
    if (isNaN(postId)) throw new ApiError(400, "Invalid post id")

    const post = await prisma.post.findUnique({
        where: {
            id: postId,
            isPublished: true,
        },
        select: {
            id: true,
            author: {
                select: {
                    userId: true,
                }
            }
        }
    })
    if (!post) throw new ApiError(404, "Post not found")

    const isLiked = await prisma.postLike.findUnique({
        where: {
            authorId_postId: {
                authorId: req.user.profile.id,
                postId: postId,
            }
        },
        select: { id: true }
    })

    if (!isLiked) {
        await prisma.postLike.create({
            data: {
                postId: postId,
                authorId: req.user.profile.id
            }
        })

        if (post.author.userId !== req.user.id) {
            const tokens = await prisma.fcmToken.findMany({
                where: {
                    userId: post.author.userId,//finding the token for the post author
                    isActive: true
                },
                select: {
                    token: true,
                }
            })

            const tokenStrings = tokens.map((t: { token: string }) => t.token)

            await sendNotification(
                tokenStrings,
                {
                    type: "Like",
                    message: `${req.user.username} liked your post`,
                    postId: postId,
                    senderId: req.user.id,
                    recipientId: post.author.userId,
                }
            )
        }

        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Post liked successfully"))
    }

    await prisma.postLike.delete({
        where: {
            authorId_postId: {
                postId: postId,
                authorId: req.user.profile.id
            }
        }
    })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Post unliked successfully"))
});

const likeUnlikeComment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const commentIdParam = req.params.commentId
    if (!commentIdParam) throw new ApiError(400, "Comment id is required")

    const commentId = parseInt(commentIdParam)
    if (isNaN(commentId)) throw new ApiError(400, "Invalid comment id")

    const comment = await prisma.comment.findUnique({
        where: {
            id: commentId,
        },
        select: {
            id: true,
            postId: true,
            author: {
                select: {
                    id: true,
                    userId: true
                }
            }
        }
    })

    if (!comment) throw new ApiError(404, "Comment not found")

    const isLiked = await prisma.commentLike.findUnique({
        where: {
            authorId_commentId: {
                authorId: req.user.profile.id,
                commentId: commentId,
            }
        },
        select: { id: true }
    })

    if (!isLiked) {
        await prisma.commentLike.create({
            data: {
                authorId: req.user.profile.id,
                commentId: commentId,
            }
        })

        if (comment.author.userId !== req.user.id) {
            const tokens = await prisma.fcmToken.findMany({
                where: {
                    userId: comment.author.userId,//finding the token for the author of the comment
                    isActive: true
                },
                select: {
                    token: true,
                }
            })

            const tokenStrings = tokens.map((t: { token: string }) => t.token)

            await sendNotification(
                tokenStrings,
                {
                    type: "Like",
                    message: `${req.user.username} liked your comment`,
                    postId: comment.postId,
                    senderId: req.user.id,
                    recipientId: comment.author.userId,
                }
            )
        }

        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Comment liked successfully"))
    }

    await prisma.commentLike.delete({
        where: {
            authorId_commentId: {
                authorId: req.user.profile.id,
                commentId: commentId,
            }
        }
    })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Comment unliked successfully"))
})

const getPostLikes = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const postIdParam = req.params.postId
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50)
    const cursorParam = req.query.cursor as string | undefined
    if (!postIdParam) throw new ApiError(400, "Post id is required")

    const cursor = cursorParam ? parseInt(cursorParam) : undefined
    if (cursorParam && isNaN(cursor!)) throw new ApiError(400, "Invalid cursor id")

    const postId = parseInt(postIdParam)
    if (isNaN(postId)) throw new ApiError(400, "Invalid post id")

    const post = await prisma.post.findUnique({
        where: {
            id: postId,
            isPublished: true,
        },
        select: { id: true }
    })

    if (!post) throw new ApiError(404, "Post not found")

    const likes = await prisma.postLike.findMany({
        take: limit + 1,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        where: {
            postId: postId
        },
        select: {
            id: true,
            author: {
                select: {
                    profilePic: true,
                    user: {
                        select: {
                            username: true,
                        }
                    }
                }
            }
        }
    })

    if (likes.length === 0) {
        return res
            .status(200)
            .json(new ApiResponse(200, { formattedLikes: [], hasMore: false, nextCursor: null }, "No likes yet"))
    }

    const hasMore = likes.length > limit
    const paginatedLikes = hasMore ? likes.slice(0, limit) : likes
    const nextCursor = hasMore ? paginatedLikes[paginatedLikes.length - 1]?.id : null;

    type likesResult = {
        id: number,
        author: {
            profilePic: string | null
            user: {
                username: string,
            }
        }
    }

    const formatedlikes = paginatedLikes.map((like: likesResult) => ({
        id: like.id,
        username: like.author.user.username,
        profilePic: like.author.profilePic
    }));

    return res
        .status(200)
        .json(new ApiResponse(200, { likes: formatedlikes, hasMore, nextCursor }, "Post likes fetched successfully"))
})

const getUserLikedPosts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const profileId = req.user.profile.id
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50)
    const cursorParam = req.query.cursor as string | undefined

    const cursor = cursorParam ? parseInt(cursorParam) : undefined
    if (cursorParam && isNaN(cursor!)) throw new ApiError(400, "Invalid cursor id")

    const posts = await prisma.post.findMany({
        take: limit + 1,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        where: {
            isPublished: true,
            postLikes: {
                some: {
                    authorId: profileId
                }
            }
        },
        select: {
            id: true,
            caption: true,
            type: true,
            author: {
                select: {
                    profilePic: true,
                    user: {
                        select: {
                            username: true,
                        }
                    },
                }
            },
            _count: {
                select: {
                    comments: true,
                    postLikes: true
                }
            },
            imagePost: {
                select: {
                    id: true,
                    imageUrl: true
                }
            },
            videoPost: {
                select: {
                    id: true,
                    videoUrl: true,
                    thumbnailUrl: true
                }
            },
            tweetPost: {
                select: {
                    id: true,
                    mediaUrl: true
                }
            }
        }
    })

    if (posts.length === 0) {
        return res.
            status(200)
            .json(new ApiResponse(200, { formattedPost: [], hasMore: false, nextCursor: null }, "No liked Posts yet"))
    }

    const hasMore = posts.length > limit
    const paginatedPosts = hasMore ? posts.slice(0, limit) : posts
    const nextCursor = hasMore ? paginatedPosts[paginatedPosts.length - 1]?.id : null;

    const formattedPost = paginatedPosts.map((post: PostResult) => ({
        id: post.id,
        type: post.type,
        caption: post.caption,
        author: {
            username: post.author.user.username,
            profilePic: post.author.profilePic,
        },
        totalComments: post._count.comments,
        totalLikes: post._count.postLikes,
        media:
            post.type === "Image"
                ? post.imagePost
                : post.type === "Video"
                    ? post.videoPost
                    : post.type === "Tweet"
                        ? post.tweetPost
                        : null,
    }));

    return res
        .status(200)
        .json(new ApiResponse(200, { posts: formattedPost, hasMore, nextCursor }, "User liked posts fetched successfully"))
})

export {
    likeUnlikePost,
    likeUnlikeComment,
    getPostLikes,
    getUserLikedPosts,
}