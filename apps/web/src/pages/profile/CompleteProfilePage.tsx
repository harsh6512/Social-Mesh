import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import avatarPlaceholder from "../../assets/avatar-placeholder.png";
import { ApiError } from "../../lib/apiError";
import { handleApiError } from "../../lib/handleApiError";
import { ProfileSchemas } from "@repo/common/schemas";
import type { AuthUser } from "../../types/auth.types";

type GoogleProfileData = ProfileSchemas.completeProfileData;
type NormalProfileData = ProfileSchemas.oauthCompleteProfileData;

const CompleteProfilePage = () => {
  const queryClient = useQueryClient();
  const authUser = queryClient.getQueryData<AuthUser>(["authUser"]);
  const isGoogle = authUser?.provider === "Google";

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profilePic, setProfilePic] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { mutate: completeProfile, isPending } = useMutation<
    void,
    ApiError,
    GoogleProfileData | NormalProfileData
  >({
    mutationFn: async (data) => {
      const endpoint = isGoogle
        ? "/api/v1/profiles/oauth/complete-profile"
        : "/api/v1/profiles/complete-profile";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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

    onSuccess: () => {
      toast.success("Profile updated successfully");
      setFieldErrors({});
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },

    onError: (error) => {
      setFieldErrors({});

      if (error instanceof ApiError && error.errors.length > 0) {
        const errors = error.errors.reduce((acc, { field, message }) => {
          acc[field] = message;
          return acc;
        }, {} as Record<string, string>);

        setFieldErrors(errors);
        toast.error(error.message);
        return;
      }

      handleApiError(error);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});

    // ✅ Build the correct payload based on provider
    const data: GoogleProfileData | NormalProfileData = isGoogle
      ? { username, bio, profilePic }
      : { bio, profilePic };

    completeProfile(data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setProfilePic(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-lg bg-base-100 border border-gray-800 rounded-3xl shadow-2xl p-6 sm:p-10">
        <h2 className="text-3xl font-bold text-center mb-8 text-white">
          Almost There! Let's Complete Your Profile
        </h2>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Profile Image */}
          <div className="flex flex-col items-center gap-5">
            <div className="avatar">
              <div className="w-28 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                <img
                  src={profilePic || avatarPlaceholder}
                  alt="Profile Preview"
                  className="object-cover"
                />
              </div>
            </div>

            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isPending}
              className="file-input file-input-bordered file-input-primary w-full max-w-xs rounded-full"
            />
            {fieldErrors.profilePic && (
              <p className="text-error text-sm">{fieldErrors.profilePic}</p>
            )}
          </div>

          {/* Username only for Google */}
          {isGoogle && (
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text text-lg">Username</span>
              </label>
              <input
                type="text"
                name="username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isPending}
                className={`input input-bordered input-primary w-full rounded-full px-6 text-lg ${
                  fieldErrors.username ? "input-error" : ""
                }`}
              />
              {fieldErrors.username && (
                <p className="text-error text-sm mt-1">{fieldErrors.username}</p>
              )}
            </div>
          )}

          {/* Bio */}
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text text-lg">Bio</span>
            </label>
            <textarea
              name="bio"
              placeholder="Tell us about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={isPending}
              className={`textarea textarea-bordered textarea-primary w-full rounded-2xl p-5 text-lg leading-relaxed resize-none ${
                fieldErrors.bio ? "textarea-error" : ""
              }`}
              rows={4}
            />
            {fieldErrors.bio && (
              <p className="text-error text-sm mt-1">{fieldErrors.bio}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="btn btn-primary w-full rounded-full mt-6 text-lg h-12"
          >
            {isPending ? "Saving..." : "Save & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
};

export { CompleteProfilePage };