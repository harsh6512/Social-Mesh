export type AuthUser = {
  id: number;
  fullName: string;
  username: string;
  email: string;
  google_id: string | null;
  provider: "Google" | "Credentials";
  createdAt: string;   
  updatedAt: string;

  profile: {
    id: number;
    bio: string;
    profilePic: string | null;
    createdAt: string;
    updatedAt: string;
    userId: number;
  } | null;
};