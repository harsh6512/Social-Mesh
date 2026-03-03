export type LikesResponse = {
	likes: {
		id: number;
		username: string;
		fullName: string;
		profilePic: string | null;
	}[];
	hasMore: boolean;
	nextCursor: number | null;
};