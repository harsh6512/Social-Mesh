import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import type { QueryFunctionContext} from "@tanstack/react-query";

import { Post as PostComponent } from "./Post";
import { PostFeedSkeleton } from "../skeletons/PostFeedSkeleton";

import type { PostsResponse } from "../../types/post.types";
import type { Post } from "../../types/post.types";

import { ApiError } from "../../lib/apiError";
import { handleApiError } from "../../lib/handleApiError";

const LIMIT = 10;

type PostsQueryKey = ["posts"];

const fetchPosts = async ({
	pageParam,
}: QueryFunctionContext<PostsQueryKey>): Promise<PostsResponse> => {
	const cursor = pageParam as number | null;

	const url = new URL("/api/v1/posts/home", window.location.origin);

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

const Posts = () => {
	const {
		data,
		error,
		isLoading,
		hasNextPage,
		fetchNextPage,
		isFetchingNextPage,
	} = useInfiniteQuery({
		queryKey: ["posts"] as PostsQueryKey,
		queryFn: fetchPosts,
		initialPageParam: null as number | null,
		getNextPageParam: (lastPage: PostsResponse) =>
			lastPage.hasNextPage ? lastPage.nextCursor : undefined,
	});

	useEffect(() => {
		if (error) handleApiError(error as ApiError);
	}, [error]);

	const { ref: loadMoreRef, inView } = useInView({ threshold: 0.1 });

	useEffect(() => {
		if (inView && hasNextPage && !isFetchingNextPage) {
			fetchNextPage();
		}
	}, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

	if (isLoading) return <PostFeedSkeleton count={2} />;

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
				<p className="text-error font-medium">Failed to load posts.</p>
				<p className="text-sm text-base-content/60">Please try again later.</p>
			</div>
		);
	}

	const posts: Post[] = data?.pages.flatMap((page: PostsResponse) => page.posts) ?? [];

	if (!posts.length) {
		return (
			<div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
				<p className="font-medium">No posts yet.</p>
				<p className="text-sm text-base-content/60">
					Follow someone to see their posts here.
				</p>
			</div>
		);
	}

	return (
		<div>
			{posts.map((post: Post) => (
				<PostComponent key={post.id} post={post} />
			))}

			{/* LOAD MORE TRIGGER */}
			<div ref={loadMoreRef} className="h-16 flex justify-center items-center">
				{isFetchingNextPage && (
					<span className="loading loading-spinner loading-md" />
				)}
			</div>
		</div>
	);
};

export { Posts };