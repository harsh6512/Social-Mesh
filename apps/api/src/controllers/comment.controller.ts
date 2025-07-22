import { Response } from 'express';

import { CommentSchemas } from '@repo/common/schemas';

import { prisma } from '../db/index.js';

import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { validationErrors } from '../utils/validationErrors.js';

import { AuthenticatedRequest } from '../types/AuthenticatedRequest.js';
import { CommentResult } from '../types/comment.types.js';

import { sendNotification } from '../services/sendNotification.js';

const postComment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const postIdParam = req.params.postId
    const { content } = req.body

    if (!postIdParam) throw new ApiError(400, "Post id is required")

    const postId = parseInt(postIdParam)
    if (isNaN(postId)) throw new ApiError(400, "Invalid post id")

    const [post, validationResult] = await Promise.all([
        prisma.post.findUnique({
            where: {
                id: postId,
                isPublished: true,
            },
            select: {
                id: true,
                author: {
                    select: {
                        userId: true
                    }
                }
            }
        }),
        CommentSchemas.commentSchema.safeParse({ content })
    ])

    if (!post) throw new ApiError(404, "Post not found")
    if (!validationResult.success) validationErrors(validationResult)

    const comment = await prisma.comment.create({
        data: {
            content,
            authorId: req.user.profile.id,
            postId,
        },
        select: {
            id: true,
        }
    })

    // Not sending  notification if commenting on own post
    if (post.author.userId !== req.user.id) {
        const tokens = await prisma.fcmToken.findMany({
            where: {
                userId: post.author.userId, //finding the token for the post author
            },
            select: {
                token: true,
            }
        })

        const tokenStrings = tokens.map((t:  { token: string }) => t.token)
        
        await sendNotification(
            tokenStrings,
            {
                type: "Comment",
                message: `${req.user.username} commented on your post`,
                postId: postId,
                senderId: req.user.id,
                recipientId: post.author.userId,
            }
        )
    }

    return res
        .status(201)
        .json(new ApiResponse(201, { commentId: comment.id }, "Comment posted successfully"))
})

const deleteComment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const commentIdParam = req.params.commentId
    const userProfileId = req.user.profile.id

    if (!commentIdParam) throw new ApiError(400, "Comment id is required")

    const commentId = parseInt(commentIdParam)
    if (isNaN(commentId)) throw new ApiError(400, "Invalid comment id")

    const comment = await prisma.comment.findUnique({
        where: {
            id: commentId,
        },
        select: {
            id: true,
            authorId: true,
            post: {
                select: {
                    authorId: true,
                }
            }
        }
    })

    if (!comment) throw new ApiError(404, "Comment not found")

    if (comment.authorId !== userProfileId && comment.post.authorId !== userProfileId) {
        throw new ApiError(403, "Unauthorized Request")
    }

    await prisma.comment.delete({
        where: {
            id: commentId
        }
    })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Comment deleted successfully"))
})

const editComment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const commentIdParam = req.params.commentId
    const { content } = req.body

    if (!commentIdParam) throw new ApiError(400, "Comment id is required")

    const commentId = parseInt(commentIdParam)
    if (isNaN(commentId)) throw new ApiError(400, "Invalid comment id")

    const [comment, validationResult] = await Promise.all([
        prisma.comment.findUnique({
            where: {
                id: commentId,
            },
            select: {
                id: true,
                authorId: true,
                post: {
                    select: {
                        isPublished: true,
                    }
                }
            }
        }),
        CommentSchemas.commentSchema.safeParse({ content })
    ])

    if (!validationResult.success) validationErrors(validationResult)

    if (!comment || comment.post?.isPublished !== true) {
        throw new ApiError(404, "Comment not found")
    }

    if (comment.authorId !== req.user.profile.id) {
        throw new ApiError(403, "Unauthorized Request")
    }

    await prisma.comment.update({
        where: {
            id: commentId,
        },
        data: {
            content,
        },
        select: {
            id: true,
        }
    })

    return res
        .status(200)
        .json(new ApiResponse(200, { commentId: comment.id }, "Comment updated successfully"))
})

const getCommentById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const commentIdParam = req.params.commentId

    if (!commentIdParam) throw new ApiError(400, "Comment id is required")

    const commentId = parseInt(commentIdParam)
    if (isNaN(commentId)) throw new ApiError(400, "Invalid comment id")

    const comment = await prisma.comment.findUnique({
        where: {
            id: commentId
        },
        select: {
            id: true,
            content: true,
            createdAt: true,
            post: {
                select: {
                    isPublished: true
                }
            },
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

    if (!comment || comment.post?.isPublished !== true) {
        throw new ApiError(404, "Comment not found")
    }

    const formattedComment = {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        author: {
            username: comment.author.user.username,
            profilePic: comment.author.profilePic,
        }
    }

    return res
        .status(200)
        .json(new ApiResponse(200, { comment: formattedComment }, "Comment fetched successfully"))
})

const getPostComments = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const postIdParam = req.params.postId
    const limit = Math.min(parseInt(req.query.limit as string) | 10, 50)
    const cursorParam = req.query.cursor as string | undefined

    if (!postIdParam) throw new ApiError(400, "Post id param is required")

    const postId = parseInt(postIdParam)
    if (isNaN(postId)) throw new ApiError(400, "Invalid post id")

    const cursor = cursorParam ? parseInt(cursorParam) : undefined
    if (cursorParam && isNaN(cursor!)) throw new ApiError(400, "Invalid cursor id")

    const post = await prisma.post.findUnique({
        where: {
            id: postId,
            isPublished: true,
        },
        select: {
            id: true,
        }
    }
    )

    if (!post) throw new ApiError(404, "Post not found")

    const comments = await prisma.comment.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
        orderBy: { createdAt: "desc" },
        where: {
            postId
        },
        select: {
            id: true,
            content: true,
            createdAt: true,
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

    const hasMore = comments.length > limit
    const paginatedComments = hasMore ? comments.slice(0, limit) : comments
    const nextCursor = hasMore ? paginatedComments[paginatedComments.length - 1]?.id : null;

    const formattedComments = paginatedComments.map((comment: CommentResult) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        author: {
            username: comment.author.user.username,
            profilePic: comment.author.profilePic,
        }
    }))

    return res
        .status(200)
        .json(new ApiResponse(200, { comments: formattedComments, hasMore, nextCursor }, "Comments fetched successfully"))
})

export {
    postComment,
    deleteComment,
    editComment,
    getCommentById,
    getPostComments,
}