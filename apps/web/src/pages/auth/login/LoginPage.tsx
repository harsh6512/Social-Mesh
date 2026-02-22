import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import AuthLeftPanel from "../../../components/auth/AuthLeftPanel";
import { AuthSchemas } from "@repo/common/schemas";
import { ApiError } from "../../../lib/apiError";
import { handleApiError } from "../../../lib/handleApiError";
import { Link } from "react-router-dom";
import { GoogleAuthButton } from "../../../components/auth/GoogleAuthButton"


const LoginPage = () => {
  const [formData, setFormData] = useState<AuthSchemas.SigninData>({
    username: "",
    password: "",
  });

  const { mutate: login, isPending } = useMutation<void, ApiError, AuthSchemas.SigninData>({
    mutationFn: async (data) => {
      const res = await fetch("/api/v1/auth/signin", {
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
      toast.success("Login successful");
    },
    onError: (error) => {
      if (error instanceof ApiError && error.statusCode === 400) {
        toast.error("Invalid credentials. Please try again.");
        return;
      } else if (error instanceof ApiError && error.statusCode === 500) {
        toast.error("Internal server error. Please try again later");
      }
      handleApiError(error);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    login(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="grid min-h-screen lg:grid-cols-2 gap-16">
        <AuthLeftPanel />

        <div className="flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-black border border-gray-800 rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-white text-center mb-8">
              Login to Social Mesh
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <input
                  type="text"
                  name="username"
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleInputChange}
                  disabled={isPending}
                  className="input w-full bg-black border border-gray-700 text-white placeholder-gray-500 rounded-xl py-4 px-5 text-base focus:border-blue-500 focus:outline-none transition-colors disabled:opacity-50"
                />
              </div>

              <div className="mb-2">
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isPending}
                  className="input w-full bg-black border border-gray-700 text-white placeholder-gray-500 rounded-xl py-4 px-5 text-base focus:border-blue-500 focus:outline-none transition-colors disabled:opacity-50"
                />
              </div>

              <div className="mb-6 text-right">
                <Link
                  to="/forgot-password"
                  className="text-sm text-blue-500 hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <button
                type="submit"
                disabled={isPending}
                className={`w-full mb-6 rounded-full text-white py-3 text-lg font-semibold flex items-center justify-center transition-colors
                ${isPending ? "bg-blue-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"}`}
              >
                {isPending ? "Logging in..." : "Login"}
              </button>
            </form>

            <div className="divider text-gray-500">OR</div>

            <GoogleAuthButton isPending={isPending} />

            <p className="text-center mt-6 text-sm text-gray-400">
              Don't have an account?{" "}
              <Link to="/signup" className="text-blue-500 hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
};

export { LoginPage };