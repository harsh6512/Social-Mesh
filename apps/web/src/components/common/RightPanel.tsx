import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import avatarPlaceholder from "../../assets/avatar-placeholder.png";
import useFollow from "../../hooks/useFollow";
import { LoadingSpinner } from "./LoadingSpinner";
import { RightPanelSkeleton } from "../skeletons/RightPanelSkeleton";

import { ApiError } from "../../lib/apiError";
import { handleApiError } from "../../lib/handleApiError";

import type { SuggestedUser } from "../../types/user.types";

const RightPanel = () => {
	const { follow, isPending } = useFollow();

	const {
		data: suggestedUsers,
		isLoading,
		error,
	} = useQuery<SuggestedUser[], ApiError>({
		queryKey: ["suggestedUsers"],
		queryFn: async () => {
			const res = await fetch("/api/v1/connection/suggestions?limit=4");
			const result = await res.json();

			if (!res.ok) {
				throw new ApiError(
					res.status,
					result.message,
					result.errors,
					result.data
				);
			}

			return result.data.suggestions;
		},
	});

	useEffect(() => {
		if (error) handleApiError(error);
	}, [error]);

	if (!isLoading && (!suggestedUsers || suggestedUsers.length === 0))
		return null;

	return (
		<div className="hidden xl:block w-full">
			<div className="sticky top-20">
				<div className="bg-base-200/40 backdrop-blur border border-gray-800 rounded-2xl p-5 shadow-sm">
					<h2 className="font-bold text-lg mb-4">
						Suggested for you
					</h2>

					<div className="flex flex-col gap-4">
						{isLoading && <RightPanelSkeleton count={4} />}

						{!isLoading &&
							suggestedUsers?.map((user) => (
								<Link
									to={`/profile/${user.username}`}
									key={user.id}
									className="flex items-center justify-between group"
								>
									<div className="flex gap-3 items-center">
										<img
											src={
												user.profilePic ||
												avatarPlaceholder
											}
											className="w-12 h-12 rounded-full object-cover"
											alt={user.username}
										/>

										<div className="flex flex-col">
											<span className="font-semibold text-base group-hover:underline">
												{user.fullName ||
													user.username}
											</span>

											<span className="text-sm text-gray-500">
												@{user.username}
											</span>
										</div>
									</div>

									<button
										className="btn btn-sm rounded-full bg-white text-black hover:bg-white/90"
										onClick={(e) => {
											e.preventDefault();
											follow(user.id);
										}}
										disabled={isPending}
									>
										{isPending ? (
											<LoadingSpinner size="sm" />
										) : (
											"Follow"
										)}
									</button>
								</Link>
							))}
					</div>
				</div>
			</div>
		</div>
	);
};

export { RightPanel };