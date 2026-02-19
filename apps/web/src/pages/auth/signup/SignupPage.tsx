import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import AuthLeftPanel from "../../../components/auth/AuthLeftPanel";
import { AuthSchemas } from "@repo/common/schemas";
import { ApiError } from "../../../lib/apiError";
import { handleApiError } from "../../../lib/handleApiError";
import { GoogleAuthButton } from "../../../components/auth/GoogleAuthButton"

const SignupPage = () => {
  const [formData, setFormData] = useState<AuthSchemas.SignupData>({
    fullName: "",
    username: "",
    email: "",
    password: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { mutate: signup, isPending } = useMutation<void, ApiError, AuthSchemas.SignupData>({
    mutationFn: async (data) => {
      const res = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new ApiError(res.status, result.message, result.errors, result.data);
      }
    },
    onSuccess: () => {
      toast.success("Account created successfully");
      setFieldErrors({});
    },
    onError: (error) => {
      setFieldErrors({});

      // Signup: show field specific errors
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
    signup(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const inputClass = (field: string) =>
    `input w-full bg-black border ${fieldErrors[field] ? "border-red-500" : "border-gray-700"
    } text-white placeholder-gray-500 rounded-xl py-4 px-5 text-base focus:outline-none transition-colors disabled:opacity-50`;

  return (
    <div className="min-h-screen bg-black">
      <div className="grid min-h-screen lg:grid-cols-2 gap-16">
        <AuthLeftPanel />

        <div className="flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-black border border-gray-800 rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-white text-center mb-8">
              Welcome to Social Mesh
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <input
                  type="text"
                  name="fullName"
                  placeholder="Full Name"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  disabled={isPending}
                  className={inputClass("fullName")}
                />
                {fieldErrors.fullName && (
                  <p className="text-red-500 text-sm mt-1 ml-1">
                    {fieldErrors.fullName}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <input
                  type="text"
                  name="username"
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleInputChange}
                  disabled={isPending}
                  className={inputClass("username")}
                />
                {fieldErrors.username && (
                  <p className="text-red-500 text-sm mt-1 ml-1">
                    {fieldErrors.username}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isPending}
                  className={inputClass("email")}
                />
                {fieldErrors.email && (
                  <p className="text-red-500 text-sm mt-1 ml-1">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="mb-6">
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isPending}
                  className={inputClass("password")}
                />
                {fieldErrors.password && (
                  <p className="text-red-500 text-sm mt-1 ml-1">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isPending}
                className={`w-full mb-6 rounded-full text-white py-3 text-lg font-semibold flex items-center justify-center transition-colors
                ${isPending
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600"
                  }`}
              >
                {isPending ? "Signing up..." : "Sign Up"}
              </button>
            </form>

            <div className="divider text-gray-500">OR</div>

            <GoogleAuthButton isPending={isPending} />

            <p className="text-center mt-6 text-sm text-gray-400">
              Already have an account?{" "}
              <a href="/login" className="text-blue-500 hover:underline">
                Login
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );

};

export { SignupPage };