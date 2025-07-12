// CommentResult defines the shape of comment data returned by the prisma
export type CommentResult = {
  id: number,
  content: string,
  createdAt:Date,
  post?: {
    isPublished: boolean
  },
  author: {
    profilePic: string | null,
    user: {
      username: string
    }
  }
};
