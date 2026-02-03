import AuthLeftPanel from "../../../components/auth/AuthLeftPanel";

const SignupPage = () => {
  return (
    <div className="min-h-screen bg-black">
      <div className="grid min-h-screen lg:grid-cols-2 gap-16">

        <AuthLeftPanel />
        {/* RIGHT SIDE */}
        <div className="flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-black border border-gray-800 rounded-2xl shadow-2xl p-8">

            <h2 className="text-2xl font-bold text-white text-center mb-8">
              Welcome to Social Mesh
            </h2>

            {/* Full Name */}
            <input
              type="text"
              placeholder="Full Name"
              className="input w-full mb-4 bg-black border border-gray-700 text-white placeholder-gray-500 rounded-xl py-4 px-5 text-base"
            />

            {/* Username */}
            <input
              type="text"
              placeholder="Username"
              className="input w-full mb-4 bg-black border border-gray-700 text-white placeholder-gray-500 rounded-xl py-4 px-5 text-base"
            />

            {/* Email */}
            <input
              type="email"
              placeholder="Email"
              className="input w-full mb-4 bg-black border border-gray-700 text-white placeholder-gray-500 rounded-xl py-4 px-5 text-base"
            />

            {/* Password */}
            <input
              type="password"
              placeholder="Password"
              className="input w-full mb-6 bg-black border border-gray-700 text-white placeholder-gray-500 rounded-xl py-4 px-5 text-base"
            />

            {/* Sign Up Button */}
            <button className="w-full mb-6 rounded-full bg-blue-500 hover:bg-blue-600 border-none text-white py-3 text-lg font-semibold flex items-center justify-center">
              Sign Up
            </button>


            <div className="divider text-gray-500">OR</div>

            {/* Google Button */}
            <button className="w-full rounded-full flex items-center justify-center gap-3 border border-gray-700 hover:bg-neutral-900 text-white py-3 my-6 bg-transparent">
              <span className="text-lg font-medium">Continue with Google</span>
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                className="w-5 h-5"
              />
            </button>

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