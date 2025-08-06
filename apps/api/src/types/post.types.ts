// PostResult defines the shape of post data returned  by the prisma,
export type PostResult = {
  id: number;
  type: "Image" | "Video" | "Tweet";
  isPublished?: boolean; // Optional: not every time isPublished will be selected in query
  caption?: string | null;
  author: {
    profilePic: string | null;
    user: {
      username: string;
    };
  };
  _count: { // Optional: not every time count will be selected in query
    comments: number;
    postLikes: number;
  };
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  duration: number | null
};
