// PostResult defines the shape of post data returned to the client,
export type PostResult = {
  id: number;
  type: "Image" | "Video" | "Tweet";
  isPublished?: boolean; //not every time isPublished will be selected in query
  caption?: string | null;
  author: {
    profilePic: string | null;
    user: {
      username: string;
    };
  };
  _count: {
    comments: number;
    postLikes: number;
  };
  imagePost?: {
    id: number;
    imageUrl: string;
  };
  videoPost?: {
    id: number;
    videoUrl: string;
    thumbnailUrl: string | null;
  };
  tweetPost?: {
    id: number;
    mediaUrl: string;
  };
};
