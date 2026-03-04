export type Comment = {
    id: number;
    content: string;
    createdAt: string;
    isOwner: boolean;
    author: {
        username: string;
        profilePic: string | null;
    };
};

export type CommentsResponse = {
    comments: Comment[];
    hasMore: boolean;
    nextCursor: number | null;
};
