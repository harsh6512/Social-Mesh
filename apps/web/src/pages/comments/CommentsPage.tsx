import {
    useInfiniteQuery,
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import { useParams, Link } from "react-router-dom";
import type { QueryFunctionContext } from "@tanstack/react-query";
import { ArrowLeft, Send, Trash2, MessageSquare } from "lucide-react";

import { ApiError } from "../../lib/apiError";
import { handleApiError } from "../../lib/handleApiError";
import avatarPlaceholder from "../../assets/avatar-placeholder.png";

import type { AuthUser } from "../../types/auth.types";
import type { Comment, CommentsResponse } from "../../types/comment.types";

const LIMIT = 10;


const fetchComments = async ({
    pageParam,
    queryKey,
}: QueryFunctionContext<readonly unknown[]>): Promise<CommentsResponse> => {
    const [, postId] = queryKey as [string, string];
    const cursor = pageParam as number | null;

    const url = new URL(`/api/v1/comments/${postId}`, window.location.origin);
    url.searchParams.append("limit", LIMIT.toString());

    if (cursor) {
        url.searchParams.append("cursor", cursor.toString());
    }

    const res = await fetch(url.toString());
    const result = await res.json();

    if (!res.ok) {
        throw new ApiError(res.status, result.message, result.errors, result.data);
    }

    return result.data;
};


const CommentsPage = () => {
    const { postId } = useParams<{ postId: string }>();
    const queryClient = useQueryClient();

    const [newComment, setNewComment] = useState("");

    const authUser = queryClient.getQueryData<AuthUser>(["authUser"]);

    const {
        data,
        error,
        isLoading,
        hasNextPage,
        fetchNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery<CommentsResponse, ApiError>({
        queryKey: ["comments", postId!],
        queryFn: fetchComments,
        initialPageParam: null,
        getNextPageParam: (lastPage) =>
            lastPage.hasMore ? lastPage.nextCursor : undefined,
        enabled: !!postId,
    });


    const { mutate: postComment, isPending: isPosting } = useMutation<
        Comment,
        ApiError,
        void
    >({
        mutationFn: async () => {
            const res = await fetch(`/api/v1/comments/${postId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // FIX: trim content before sending
                body: JSON.stringify({ content: newComment.trim() }),
            });

            const result = await res.json();

            if (!res.ok) {
                throw new ApiError(res.status, result.message, result.errors, result.data);
            }

            return result.data.comment as Comment;
        },
        onSuccess: () => {
            setNewComment("");
            queryClient.invalidateQueries({ queryKey: ["comments", postId] });
        },
        onError: (err) => handleApiError(err),
    });

    const { mutate: deleteComment } = useMutation<
        void,
        ApiError,
        number,
        { previousComments: InfiniteData<CommentsResponse> | undefined }
    >({
        mutationFn: async (commentId) => {
            const res = await fetch(`/api/v1/comments/${commentId}`, {
                method: "DELETE",
            });

            const result = await res.json();

            if (!res.ok) {
                throw new ApiError(res.status, result.message, result.errors, result.data);
            }
        },

        onMutate: async (deletedCommentId) => {
            await queryClient.cancelQueries({ queryKey: ["comments", postId] });

            const previousComments =
                queryClient.getQueryData<InfiniteData<CommentsResponse>>([
                    "comments",
                    postId,
                ]);

            queryClient.setQueryData<InfiniteData<CommentsResponse>>(
                ["comments", postId],
                (oldData) => {
                    if (!oldData) return oldData;

                    return {
                        ...oldData,
                        pages: oldData.pages.map((page) => ({
                            ...page,
                            comments: page.comments.filter(
                                (c) => c.id !== deletedCommentId
                            ),
                        })),
                    };
                }
            );

            return { previousComments };
        },

        onError: (err, _, context) => {
            if (context?.previousComments) {
                queryClient.setQueryData(["comments", postId], context.previousComments);
            }
            handleApiError(err);
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["comments", postId] });
        },
    });

    const { ref: loadMoreRef, inView } = useInView({ threshold: 0.1 });

    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    useEffect(() => {
        if (error) handleApiError(error);
    }, [error]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && newComment.trim() && !isPosting) {
            postComment();
        }
    };

    const comments = data?.pages.flatMap((page) => page.comments) ?? [];

    return (
        <div className="flex justify-center w-full min-h-screen bg-base-100 text-base-content">
            <div className="w-full max-w-2xl border-x border-base-300 flex flex-col relative">

                <div className="sticky top-0 z-20 backdrop-blur-md bg-base-100/80 border-b border-base-300">
                    <div className="px-4 py-3 flex items-center">
                        <Link
                            to="/"
                            className="p-2 rounded-full hover:bg-base-200 transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </Link>

                        <h1 className="text-xl font-bold ml-4">Comments</h1>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pb-24">

                    {isLoading && (
                        <div className="flex justify-center mt-32">
                            <span className="loading loading-spinner loading-md text-primary" />
                        </div>
                    )}

                    {!isLoading && comments.length === 0 && (
                        <div className="flex flex-col items-center mt-32 opacity-60">
                            <MessageSquare size={32} />
                            <p className="text-xl font-bold mt-4">No comments yet</p>
                        </div>
                    )}

                    {comments.map((c) => (
                        <div
                            key={c.id}
                            className="flex gap-4 p-5 border-b border-base-300 group"
                        >
                            {/* FIX: added alt attributes for accessibility */}
                            <img
                                src={c.author.profilePic || avatarPlaceholder}
                                alt={`${c.author.username}'s avatar`}
                                className="w-10 h-10 rounded-full object-cover"
                            />

                            <div className="flex-1">
                                <div className="flex justify-between">

                                    <div className="flex gap-2">
                                        <span className="font-bold text-sm">
                                            {c.author.username}
                                        </span>

                                        <span className="text-xs opacity-60">
                                            {new Date(c.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>

                                    {c.isOwner && (
                                        <button
                                            onClick={() => deleteComment(c.id)}
                                            className="opacity-0 group-hover:opacity-100 text-error"
                                            aria-label="Delete comment"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>

                                <p className="text-sm mt-1">{c.content}</p>
                            </div>
                        </div>
                    ))}

                    <div ref={loadMoreRef} className="h-16 flex justify-center items-center">
                        {isFetchingNextPage && (
                            <span className="loading loading-spinner loading-md text-primary" />
                        )}
                    </div>
                </div>

                <div className="absolute bottom-0 w-full bg-base-100 border-t border-base-300 p-4">
                    <div className="flex gap-3 items-center">

                        <img
                            src={authUser?.profile?.profilePic || avatarPlaceholder}
                            alt="Your avatar"
                            className="w-9 h-9 rounded-full object-cover hidden sm:block"
                        />

                        <input
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Post your reply..."
                            className="flex-1 bg-base-200 rounded-full px-5 py-2.5"
                            disabled={isPosting}
                        />

                        <button
                            onClick={() => postComment()}
                            disabled={!newComment.trim() || isPosting}
                            className="p-2.5 text-primary"
                            aria-label="Post comment"
                        >
                            {isPosting ? (
                                <span className="loading loading-spinner loading-xs" />
                            ) : (
                                <Send size={20} />
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export { CommentsPage };