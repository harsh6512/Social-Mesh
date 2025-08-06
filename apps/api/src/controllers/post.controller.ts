import { Response } from 'express';

import { PostSchemas } from '@repo/common/schemas';

import { prisma } from '../db/index.js';
import { redis } from '../lib/redis.js';

import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { validationErrors } from '../utils/validationErrors.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

import { AuthenticatedRequest } from '../types/AuthenticatedRequest.js';
import { PostResult } from '../types/post.types.js';

import { PostType } from '../generated/prisma/index.js';

const createPost = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const postType = req.params.postType
    const { caption } = req.body

    interface MulterFiles {
        media?: Express.Multer.File[]; //media might not be there for tweet type
        thumbnail?: Express.Multer.File[]; //thumbnail might not be there for video type
    }

    const files = req.files as MulterFiles | undefined
    const mediaUrl = files?.media?.[0]?.path
    
    const uploadMedia = async (filePath: string) => {
        const uploaded = await uploadOnCloudinary(filePath)
        if (!uploaded?.url) throw new ApiError(400, "Error while uploading media")
        return uploaded
    }

    switch (postType) {
        case "Image": {
            const userInput = {
                postType,
                mediaUrl,
                caption
            }

            const validationResult = PostSchemas.createPostSchema.safeParse(userInput)
            if (!validationResult.success) validationErrors(validationResult)

            const uploaded = await uploadMedia(mediaUrl!)

            const post = await prisma.post.create({
                data: {
                    type: postType,
                    caption,
                    isPublished: true,
                    authorId: req.user.profile.id,
                    mediaUrl: uploaded.url,
                },
                select: {
                    id: true,
                    type: true,
                    caption: true,
                    isPublished: true,
                    mediaUrl: true,
                    createdAt: true,
                    updatedAt: true,
                }
            })

            return res
                .status(201)
                .json(new ApiResponse(201, post, "Post uploaded successfully"))
        }

        case "Video": {
            const thumbnailUrl = files?.thumbnail?.[0]?.path
            const userInput = {
                postType,
                mediaUrl,
                thumbnailUrl,
                caption
            }

            const validationResult = PostSchemas.createPostSchema.safeParse(userInput)
            if (!validationResult.success) validationErrors(validationResult)

            const videoUploaded = await uploadMedia(mediaUrl!)

            let thumbnailUploaded = null
            if (thumbnailUrl) {
                thumbnailUploaded = await uploadMedia(thumbnailUrl)
            }

            const post = await prisma.post.create({
                data: {
                    type: postType,
                    caption,
                    isPublished: true,
                    authorId: req.user.profile.id,
                    mediaUrl: videoUploaded.url,
                    thumbnailUrl: thumbnailUploaded?.url || null,
                    duration: videoUploaded.duration || 0,
                },
                select: {
                    id: true,
                    type: true,
                    caption: true,
                    isPublished: true,
                    mediaUrl: true,
                    thumbnailUrl: true,
                    createdAt: true,
                    updatedAt: true,
                }
            })

            return res
                .status(201)
                .json(new ApiResponse(201, post, "Post uploaded successfully"))
        }

        case "Tweet": {
            const userInput = {
                postType,
                caption,
                mediaUrl
            }
            const validationResult = PostSchemas.createPostSchema.safeParse(userInput)
            if (!validationResult.success) validationErrors(validationResult)
            let uploadedMediaUrl = null
            if (mediaUrl) {
                const uploaded = await uploadMedia(mediaUrl)
                uploadedMediaUrl = uploaded.url
            }

            const post = await prisma.post.create({
                data: {
                    type: postType,
                    caption,
                    isPublished: true,
                    authorId: req.user.profile.id,
                    mediaUrl: uploadedMediaUrl,
                }, select: {
                    id: true,
                    type: true,
                    caption: true,
                    isPublished: true,
                    createdAt: true,
                    updatedAt: true,
                    mediaUrl: true,
                }
            })

            return res
                .status(201)
                .json(new ApiResponse(201, post, "Post uploaded successfully"))
        }

        default:
            throw new ApiError(400, "Invalid post type")
    }
})

const deletePost = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const postIdParam = req.params.postId
    if (!postIdParam) throw new ApiError(400, "Post id is required")

    const postId = parseInt(postIdParam)
    if (isNaN(postId)) throw new ApiError(400, "Invalid post id")

    const post = await prisma.post.findUnique({
        where: {
            id: postId
        },
        select: {
            id: true,
            authorId: true,
        }
    })

    if (!post) throw new ApiError(404, "Post not found")

    if (post.authorId !== req.user?.profile.id) throw new ApiError(403, "Unauthorized Request")

    await prisma.post.delete({ where: { id: postId } });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Post deleted successfully"))
})

const updatePost = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const postIdParam = req.params.postId
    const { caption } = req.body

    if (!postIdParam) throw new ApiError(400, "Post id is required")

    const postId = parseInt(postIdParam)
    if (isNaN(postId)) throw new ApiError(400, "Invalid post id")

    const [post, validationResult] = await Promise.all([
        prisma.post.findUnique({
            where: { id: postId },
            select: {
                id: true,
                authorId: true,
                caption: true,
            }
        }),
        PostSchemas.updatePostSchema.safeParse({ caption })
    ])

    if (!post) throw new ApiError(404, "Post not found")

    if (!validationResult.success) validationErrors(validationResult)

    if (post.authorId != req.user.profile.id) throw new ApiError(403, "Unauthorized Request")

    const updatedPost = await prisma.post.update({
        where: { id: postId },
        data: {
            caption: validationResult.data.caption ?? post.caption
        },
        select: {
            id: true,
            type: true,
            caption: true,
            isPublished: true,
            createdAt: true,
            updatedAt: true,
            author: {
                select: {
                    profilePic: true,
                    user: {
                        select: {
                            username: true,
                        }
                    }
                }
            },
            mediaUrl: true,
            thumbnailUrl: true,
            duration: true
        }
    })

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPost, "Post updated successfully"))
})

const togglePublishStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const postIdParam = req.params.postId;
    const userProfileId = req.user.profile.id;

    if (!postIdParam) throw new ApiError(400, "Post id is required");

    const postId = parseInt(postIdParam);
    if (isNaN(postId)) throw new ApiError(400, "Invalid post Id");

    const post = await prisma.post.findFirst({
        where: { id: postId },
        select: { authorId: true, isPublished: true }
    });

    if (!post) throw new ApiError(404, "Post not found");

    if (post.authorId !== userProfileId) throw new ApiError(403, "Unauthorized Request");

    const updatedPost = await prisma.post.updateMany({
        where: { id: postId },
        data: { isPublished: !post.isPublished }
    });

    if (updatedPost.count === 0) {
        throw new ApiError(500, "Error while updating published status");
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Published status updated")
    );
});

const getPostById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
            type: true,
            isPublished: true,
            caption: true,
            mediaUrl: true,
            thumbnailUrl: true,
            duration: true,
            author: {
                select: {
                    profilePic: true,
                    user: {
                        select: {
                            username: true,
                        }
                    }
                }
            },
            _count: {
                select: {
                    comments: true,
                    postLikes: true,
                }
            },
        }
    })

    if (!post || !post.isPublished) throw new ApiError(404, "Post not found")

    const formattedPost = (post: PostResult) => ({
        id: post.id,
        type: post.type,
        caption: post.caption,
        isPublished: post.isPublished,
        author: {
            username: post.author.user.username,
            profilePic: post.author.profilePic,
        },
        totalComments: post._count.comments,
        totalLikes: post._count.postLikes,
        mediaUrl: post.mediaUrl,
        thumbnail: post.thumbnailUrl,
        duration:post.duration,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, formattedPost(post), "Post fetched successfully"))
})

const getDraftPosts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userProfileId = req.user.profile.id

    const posts = await prisma.post.findMany({
        where: {
            authorId: userProfileId,
            isPublished: false
        },
        select: {
            id: true,
            type: true,
            caption: true,
            mediaUrl: true,
            thumbnailUrl: true,
            duration: true,
        }
    });

    if (posts.length == 0) {
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "No posts in draft"))
    }

    return res
        .status(200)
        .json(new ApiResponse(200, posts, "User drafts fetched succesfully"))
})

const getHomePosts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userProfileId = req.user.profile.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const cursorParam = req.query.cursor as string | undefined;

    const cursor = cursorParam ? parseInt(cursorParam) : undefined;
    if (cursorParam && isNaN(cursor!)) throw new ApiError(400, "Invalid cursor Id");

    const redisKey = `user:${userProfileId}:followingFeedDone`;
    let followingFeedDone = await redis.get(redisKey);
    let posts: PostResult[] = [];

    // Get posts from people user follows
    if (followingFeedDone !== "true") {
        posts = await prisma.post.findMany({
            take: limit + 1,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { createdAt: "desc" },
            where: {
                isPublished: true,
                author: {
                    followers: {
                        some: {
                            followerId: userProfileId
                        }
                    }
                }
            },
            select: {
                id: true,
                type: true,
                isPublished: true,
                caption: true,
                createdAt: true,
                author: {
                    select: {
                        profilePic: true,
                        user: {
                            select: { username: true }
                        }
                    }
                },
                _count: {
                    select: {
                        comments: true,
                        postLikes: true
                    }
                },
                mediaUrl: true,
                thumbnailUrl: true,
                duration: true,
            }
        });

        //If all the following posts is fetched mark as done
        if (posts.length <= limit) {
            await redis.set(redisKey, 'true', 'EX', 3600); // expires in 1 hour
        }
    }

    //If the following posts are fetched then fetch more post
    if (followingFeedDone === "true" || posts.length === 0) {
        posts = await prisma.post.findMany({
            take: limit + 1,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { createdAt: "desc" },
            where: {
                isPublished: true,
                author: {
                    followers: {
                        none: {
                            followerId: userProfileId
                        }
                    }
                }
            },
            select: {
                id: true,
                type: true,
                isPublished: true,
                caption: true,
                createdAt: true,
                author: {
                    select: {
                        profilePic: true,
                        user: {
                            select: { username: true }
                        }
                    }
                },
                _count: {
                    select: {
                        comments: true,
                        postLikes: true
                    }
                },
                mediaUrl: true,
                thumbnailUrl: true,
                duration: true,
            }
        });
    }
    const hasNextPage = posts.length > limit;
    const trimmedPosts = hasNextPage ? posts.slice(0, limit) : posts;
    const nextCursor = hasNextPage ? trimmedPosts[trimmedPosts.length - 1]?.id : null;

    const formattedPost = (post: PostResult) => ({
        id: post.id,
        type: post.type,
        caption: post.caption,
        isPublished: post.isPublished,
        author: {
            username: post.author.user.username,
            profilePic: post.author.profilePic,
        },
        totalComments: post._count.comments,
        totalLikes: post._count.postLikes,
        mediaUrl: post.mediaUrl,
        thumbnail: post.thumbnailUrl,
        duration:post.duration,
    });

    return res.status(200).json(
        new ApiResponse(200, {
            posts: trimmedPosts.map(formattedPost),
            hasNextPage,
            nextCursor,
        }, "Home posts fetched successfully")
    );
});

//User can filter what type of content they want to see
const getHomePostsByType = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userProfileId = req.user.profile.id;
    const type = req.params.type;

    if (!type) throw new ApiError(400, "Post type is required");
    
    const validationResult = PostSchemas.postTypeSchema.safeParse({type})
    if (!validationResult.success) validationErrors(validationResult)

    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const cursorParam = req.query.cursor as string | undefined;

    const cursor = cursorParam ? parseInt(cursorParam) : undefined;
    if (cursorParam && isNaN(cursor!)) throw new ApiError(400, "Invalid cursor Id");

    const redisKey = `user:${userProfileId}:followingFeedDone:${type}`;
    let followingFeedDone = await redis.get(redisKey);
    let posts: PostResult[] = [];

    if (followingFeedDone !== "true") {
        posts = await prisma.post.findMany({
            take: limit + 1,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { createdAt: "desc" },
            where: {
                isPublished: true,
                type: type,
                author: {
                    followers: {
                        some: {
                            followerId: userProfileId
                        }
                    }
                }
            },
            select: {
                id: true,
                type: true,
                isPublished: true,
                caption: true,
                createdAt: true,
                author: {
                    select: {
                        profilePic: true,
                        user: {
                            select: { username: true }
                        }
                    }
                },
                _count: {
                    select: {
                        comments: true,
                        postLikes: true
                    }
                },
                mediaUrl: true,
                thumbnailUrl: true,
                duration: true,
            }
        });

        // If all the following posts is fetched mark as done
        if (posts.length <= limit) {
            await redis.set(redisKey, 'true', 'EX', 3600)
        }
    }

    // If the following posts are fetched then fetch more post
    if (followingFeedDone === "true" || posts.length === 0) {
        posts = await prisma.post.findMany({
            take: limit + 1,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { createdAt: "desc" },
            where: {
                isPublished: true,
                type: type,
                author: {
                    followers: {
                        none: {
                            followerId: userProfileId
                        }
                    }
                }
            },
            select: {
                id: true,
                type: true,
                isPublished: true,
                caption: true,
                createdAt: true,
                author: {
                    select: {
                        profilePic: true,
                        user: {
                            select: { username: true }
                        }
                    }
                },
                _count: {
                    select: {
                        comments: true,
                        postLikes: true
                    }
                },
                
            }
        });
    }

    const hasNextPage = posts.length > limit;
    const trimmedPosts = hasNextPage ? posts.slice(0, limit) : posts;
    const nextCursor = hasNextPage ? trimmedPosts[trimmedPosts.length - 1]?.id : null;

    const formattedPost = (post: PostResult) => ({
        id: post.id,
        type: post.type,
        caption: post.caption,
        author: {
            username: post.author.user.username,
            profilePic: post.author.profilePic,
        },
        totalComments: post._count.comments,
        totalLikes: post._count.postLikes, 
        mediaUrl: post.mediaUrl,
        thumbnail: post.thumbnailUrl,
        duration:post.duration,
    });

    return res.status(200).json(
        new ApiResponse(200, {
            posts: trimmedPosts.map(formattedPost),
            hasNextPage,
            nextCursor,
        }, `${type} posts fetched successfully`)
    );
});

export {
    createPost,
    deletePost,
    updatePost,
    togglePublishStatus,
    getPostById,
    getDraftPosts,
    getHomePosts,
    getHomePostsByType
}