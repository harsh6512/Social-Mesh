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

const isUserOwner = async (postId: number, profileId: number): Promise<boolean> => {
    const post = await prisma.post.findUnique({
        where: {
            id: postId,
        },
        select: {
            authorId: true,
        }
    });

    return post?.authorId === profileId;
};

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
            const [userProfile, validationResult] = await Promise.all([
                prisma.profile.findUnique({
                    where: { id: req.user.id },
                    select: { id: true }
                }),
                PostSchemas.createPostSchema.safeParse(userInput)
            ])

            if (!validationResult.success) validationErrors(validationResult)
            if (!userProfile) throw new ApiError(404, "Profile doesn't exist")

            const uploaded = await uploadMedia(mediaUrl!)

            const post = await prisma.post.create({
                data: {
                    type: postType,
                    caption,
                    isPublished: true,
                    authorId: userProfile.id,
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
            const [userProfile, validationResult] = await Promise.all([
                prisma.profile.findUnique({
                    where: { id: req.user.id },
                    select: { id: true }
                }),
                PostSchemas.createPostSchema.safeParse(userInput)
            ])

            if (!validationResult.success) validationErrors(validationResult)
            if (!userProfile) throw new ApiError(404, "Profile doesn't exist")

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
                    authorId: userProfile.id,
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
            const [userProfile, validationResult] = await Promise.all([
                prisma.profile.findUnique({
                    where: { id: req.user.id },
                    select: { id: true }
                }),
                PostSchemas.createPostSchema.safeParse(userInput)
            ])

            if (!validationResult.success) validationErrors(validationResult)
            if (!userProfile) throw new ApiError(404, "Profile doesn't exist")

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
                    authorId: userProfile.id,
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
                    author:{
                        select:{
                            user:{
                                select:{
                                    id:true,
                                    username:true,
                                    fullName:true,
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

    if (post.authorId !== req.user?.id) throw new ApiError(403, "Unauthorized Request")

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

    if (post.authorId != req.user?.id) throw new ApiError(403, "Unauthorized Request")

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
                    author:{
                        select:{
                            user:{
                                select:{
                                    id:true,
                                    username:true,
                                    fullName:true,
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

export {
    createPost,
    deletePost,
    updatePost,
}