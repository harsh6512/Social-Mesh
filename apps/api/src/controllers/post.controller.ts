import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { validationErrors } from '../utils/validationErrors.js';
import { prisma } from '../db/index.js'
import { Response } from 'express'
import { AuthenticatedRequest } from '../types/AuthenticatedRequest.js';
import { PostSchemas } from '@repo/common/schemas';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
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
                imageUrl: mediaUrl,
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
                    imagePost: {
                        create: {
                            imageUrl: uploaded.url,
                        },
                    }
                },
                select: {
                    id: true,
                    type: true,
                    caption: true,
                    isPublished: true,
                    imagePost: {
                        select: {
                            id: true,
                            imageUrl: true,
                        }
                    }
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
                videoUrl: mediaUrl,
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
                    videoPost: {
                        create: {
                            videoUrl: videoUploaded.url,
                            thumbnailUrl: thumbnailUploaded?.url || null,
                            duration: videoUploaded.duration || 0,
                        },
                    }
                },
                select: {
                    id: true,
                    type: true,
                    caption: true,
                    isPublished: true,
                    videoPost: {
                        select: {
                            id: true,
                            videoUrl: true,
                            thumbnailUrl: true,
                        }
                    }
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
                    tweetPost: {
                        create: {
                            mediaUrl: uploadedMediaUrl,
                        },
                    }
                }, select: {
                    id: true,
                    type: true,
                    caption: true,
                    isPublished: true,
                    createdAt: true,
                    updatedAt: true,
                    author: {
                        select: {
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                    fullName: true,
                                }
                            }
                        }
                    },
                    tweetPost: {
                        select: {
                            id: true,
                            mediaUrl: true,
                        }
                    }
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
                type: true,
            }
        }),
        PostSchemas.updatePostSchema.safeParse({ caption })
    ])

    if (!post) throw new ApiError(404, "Post not found")

    if (!validationResult.success) validationErrors(validationResult)

    if (post.authorId != req.user.profile.id) throw new ApiError(403, "Unauthorized Request")

    const mediaIncludes = {
        Image: { imagePost: { select: { id: true, imageUrl: true } } },
        Video: { videoPost: { select: { id: true, videoUrl: true, thumbnailUrl: true } } },
        Tweet: { tweetPost: { select: { id: true, mediaurl: true } } },
    }

    const type = post.type as PostType
    const includeMedia = mediaIncludes[type] || {}

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
                    user: {
                        select: {
                            id: true,
                            username: true,
                            fullName: true,
                        }
                    }
                }
            },
            ...includeMedia
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

    const postType = await prisma.post.findUnique({
        where: {
            id: postId,
        },
        select: {
            type: true,
        }
    })
    const mediaIncludes = {
        Image: { imagePost: { select: { id: true, imageUrl: true } } },
        Video: { videoPost: { select: { id: true, videoUrl: true, thumbnailUrl: true } } },
        Tweet: { tweetPost: { select: { id: true, mediaurl: true } } },
    }

    const type = postType.type as PostType
    const includeMedia = mediaIncludes[type] || {}

    const post = await prisma.post.findFirst({
        where: {
            id: postId,
        },
        select: {
            id: true,
            type: true,
            isPublished: true,
            caption: true,
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
            ...includeMedia
        }
    })
    if (!post || !post.isPublished) throw new ApiError(404, "Post not found")

    type PostResult = {
        id: number;
        type: "Image" | "Video" | "Tweet";
        isPublished: boolean;
        caption?: string | null;
        author: {
            profilePic: string | null;
            user: {
                username: string;
            };
        };
        _count: {
            comments: number;
            postLikes: number;
        };
        imagePost?: {
            id: number;
            imageUrl: string;
        };
        videoPost?: {
            id: number;
            videoUrl: string;
            thumbnailUrl: string | null;
        };
        tweetPost?: {
            id: number;
            mediaurl: string;
        };
    };

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
        media:
            post.type === "Image"
                ? post.imagePost
                : post.type === "Video"
                    ? post.videoPost
                    : post.type === "Tweet"
                        ? post.tweetPost
                        : null,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, formattedPost(post), "Post fetched successfully"))
})

export {
    createPost,
    deletePost,
    updatePost,
    togglePublishStatus,
    getPostById,
}