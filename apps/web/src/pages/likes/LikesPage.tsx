import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { useParams, Link } from "react-router-dom";
import type { QueryFunctionContext } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { ApiError } from "../../lib/apiError";
import { handleApiError } from "../../lib/handleApiError";
import avatarPlaceholder from "../../assets/avatar-placeholder.png";

import type { LikesResponse } from "../../types/likes.types";
import { LikesSkeleton } from "../../components/skeletons/LikesSkeleton";

const LIMIT = 10;

type LikesQueryKey = ["postLikes", string];

const fetchLikes = async ({
	pageParam,
	queryKey,
}: QueryFunctionContext<LikesQueryKey>): Promise<LikesResponse> => {
	const [, postId] = queryKey;
	const cursor = pageParam as number | null;

	const url = new URL(`/api/v1/likes/post/${postId}`, window.location.origin);

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

const LikesPage = () => {
	const { postId } = useParams<{ postId: string }>();

	const {
		data,
		error,
		isLoading,
		hasNextPage,
		fetchNextPage,
		isFetchingNextPage,
	} = useInfiniteQuery({
		queryKey: ["postLikes", postId ?? ""] as LikesQueryKey,
		queryFn: fetchLikes,
		initialPageParam: null as number | null,
		getNextPageParam: (lastPage: LikesResponse) =>
			lastPage.hasMore ? lastPage.nextCursor : undefined,
		enabled: !!postId,
	});

	/* ========= ERROR HANDLING ========= */

	useEffect(() => {
		if (error) handleApiError(error as ApiError);
	}, [error]);

	/* ========= INFINITE SCROLL ========= */

	const { ref: loadMoreRef, inView } = useInView({ threshold: 0.1 });

	useEffect(() => {
		if (inView && hasNextPage && !isFetchingNextPage) {
			fetchNextPage();
		}
	}, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

	/* ========================================= */

	if (isLoading) {
	return (
		<div className="flex justify-center w-full min-h-screen bg-base-100">
			<div className="w-full max-w-2xl border-x border-gray-800">
				
				{/* HEADER */}
				<div className="sticky top-0 z-20 backdrop-blur bg-base-100/80 border-b border-gray-800">
					<div className="px-6 py-5 flex items-center justify-center relative">
						<Link
							to="/"
							className="absolute left-6 p-2 rounded-full hover:bg-base-200 transition"
						>
							<ArrowLeft size={22} />
						</Link>
						<h1 className="text-2xl font-bold tracking-wide">Likes</h1>
					</div>
				</div>

				<LikesSkeleton />
			</div>
		</div>
	);
}

	if (error) {
	return (
		<div className="flex justify-center w-full min-h-screen bg-base-100">
			<div className="w-full max-w-2xl border-x border-gray-800 flex items-center justify-center">
				<div className="flex flex-col items-center text-center gap-2">
					<p className="text-error font-medium text-lg">
						Failed to load likes.
					</p>
					<p className="text-sm opacity-60">
						Please try again later.
					</p>
				</div>
			</div>
		</div>
	);
}

	const likes = data?.pages.flatMap((page: LikesResponse) => page.likes) ?? [];

	if (!likes.length) {
		return (
			<div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
				<p className="text-lg font-semibold">No likes yet</p>
				<p className="text-sm mt-2">Be the first to like this post.</p>
			</div>
		);
	}

	return (
		<div className="flex justify-center w-full min-h-screen bg-base-100">
			<div className="w-full max-w-2xl border-x border-gray-800">

				{/* HEADER */}
				<div className="sticky top-0 z-20 backdrop-blur bg-base-100/80 border-b border-gray-800">
					<div className="px-6 py-5 flex items-center justify-center relative">
						<Link
							to="/"
							className="absolute left-6 p-2 rounded-full hover:bg-base-200 transition"
						>
							<ArrowLeft size={22} />
						</Link>
						<h1 className="text-2xl font-bold tracking-wide">Likes</h1>
					</div>
				</div>

				{/* LIST */}
				<div className="flex flex-col gap-4 p-6">
					{likes.map((user) => (
						<Link
							key={user.id}
							to={`/profile/${user.username}`}
							className="
								block
								p-5 rounded-2xl
								bg-base-200/40 backdrop-blur-lg
								border border-base-300/40
								hover:scale-[1.01]
								hover:bg-base-200/70
								transition-all duration-200
								group
							"
						>
							<div className="flex items-center gap-4">
								<img
									src={user.profilePic || avatarPlaceholder}
									className="w-14 h-14 rounded-full object-cover"
									alt={user.username}
								/>
								<div className="flex flex-col">
									<span className="font-bold text-lg group-hover:underline">
										{user.fullName}
									</span>
									<span className="text-sm opacity-60">
										@{user.username}
									</span>
								</div>
							</div>
						</Link>
					))}

					{/* LOAD MORE TRIGGER */}
					<div ref={loadMoreRef} className="h-16 flex justify-center items-center">
						{isFetchingNextPage && (
							<span className="loading loading-spinner loading-md" />
						)}
					</div>
				</div>

			</div>
		</div>
	);
};

export { LikesPage };