export type Post = {
	id: number;
	type: "Tweet" | "Image" | "Video";
	caption?: string;
	mediaUrl?: string;
	thumbnail?: string | null;
	duration?: number | null;
	totalLikes: number;
	totalComments: number;
	isLiked: boolean;
	author: {
		username: string;
		profilePic?: string | null;
	};
};

export type PostProps = {
	post: Post;
};