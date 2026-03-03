import { useState } from "react";
import { Heart, MessageCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

import avatarPlaceholder from "../../assets/avatar-placeholder.png";
import { ApiError } from "../../lib/apiError";
import { handleApiError } from "../../lib/handleApiError";
import type { PostProps } from "../../types/post.types"

const Post = ({ post }: PostProps) => {
	const navigate = useNavigate();
	const owner = post.author;

	const [isLiked, setIsLiked] = useState(post.isLiked);
	const [likesCount, setLikesCount] = useState(post.totalLikes);

	const postType = post.type.toLowerCase();

	const { mutate: toggleLike, isPending } = useMutation<
		void,
		ApiError,
		void,
		{ previousIsLiked: boolean }
	>({
		mutationFn: async () => {
			const res = await fetch(`/api/v1/likes/post/${post.id}`, {
				method: "POST",
			});

			const result = await res.json();

			if (!res.ok) {
				throw new ApiError(
					res.status,
					result.message,
					result.errors,
					result.data
				);
			}
		},

		onMutate: () => {
			const previousIsLiked = isLiked;
			setIsLiked((prev) => !prev);
			setLikesCount((prev) => (previousIsLiked ? prev - 1 : prev + 1));
			return { previousIsLiked };
		},

		onError: (error, _, context) => {
			// rollback to pre-mutation state
			setIsLiked(context!.previousIsLiked);
			setLikesCount((prev) => (context!.previousIsLiked ? prev + 1 : prev - 1));
			handleApiError(error);
		},
	});

	const handleLike = () => {
		if (isPending) return;
		toggleLike();
	};

	const goToLikesPage = () => {
		navigate(`/posts/${post.id}/likes`);
	};

	return (
		<div className="border-b border-gray-800 p-5 hover:bg-gray-800/20 transition-colors duration-200">
			{/* ===== PROFILE ===== */}
			<div className="flex gap-3 items-center mb-3">
				<Link
					to={`/profile/${owner.username}`}
					className="flex gap-3 items-center group"
				>
					<img
						src={owner.profilePic || avatarPlaceholder}
						className="w-12 h-12 rounded-full object-cover bg-gray-700"
						alt={`${owner.username}'s avatar`}
					/>

					<span className="font-bold text-lg text-gray-100 group-hover:underline">
						@{owner.username}
					</span>
				</Link>
			</div>

			<div className="flex flex-col gap-3">
				{postType === "image" && post.mediaUrl && (
					<div className="mt-2 rounded-2xl overflow-hidden border border-gray-700 bg-gray-900 flex justify-center">
						<img
							src={post.mediaUrl}
							className="w-full h-auto max-h-[550px] object-contain"
							alt="Post content"
							loading="lazy"
						/>
					</div>
				)}

				{postType === "video" && post.mediaUrl && (
					<div className="mt-2 rounded-2xl overflow-hidden border border-gray-700 bg-black">
						<video
							src={post.mediaUrl}
							poster={post.thumbnail ?? undefined}
							controls
							className="w-full max-h-[550px]"
							preload="metadata"
						/>
					</div>
				)}
			</div>

			<div className="flex gap-6 mt-4 mb-3 text-gray-500 select-none">
				<button
					onClick={handleLike}
					disabled={isPending}
					aria-label={isLiked ? "Unlike post" : "Like post"}
					className={`flex gap-2 items-center group p-2 -m-2 rounded-full transition-all duration-200 ${
						isLiked ? "text-pink-500" : "hover:text-pink-500"
					}`}
				>
					<div className="p-2 rounded-full group-hover:bg-pink-500/10 transition-colors -m-2">
						<Heart size={20} className={isLiked ? "fill-pink-500" : ""} />
					</div>

					<span
						onClick={(e) => {
							e.stopPropagation();
							goToLikesPage();
						}}
						className="text-sm font-medium hover:underline cursor-pointer"
					>
						{likesCount}
					</span>
				</button>

				<Link
					to={`/post/${post.id}`}
					className="flex gap-2 items-center group p-2 -m-2 rounded-full transition-all duration-200 hover:text-sky-400"
				>
					<div className="p-2 rounded-full group-hover:bg-sky-400/10 transition-colors -m-2">
						<MessageCircle size={20} />
					</div>

					<span className="text-sm font-medium">{post.totalComments}</span>
				</Link>
			</div>

			{post.caption && (
				<div className="text-base text-gray-200 mt-2">
					<Link
						to={`/profile/${owner.username}`}
						className="font-bold text-gray-100 hover:underline mr-2"
					>
						{owner.username}
					</Link>

					<span className="whitespace-pre-wrap leading-relaxed">
						{post.caption}
					</span>
				</div>
			)}
		</div>
	);
};

export { Post };