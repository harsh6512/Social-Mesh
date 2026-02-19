import toast from "react-hot-toast";


const GoogleAuthButton = ({ isPending }: { isPending: boolean }) => {
  const handleGoogleAuth = async () => {

    window.location.href = "/api/v1/auth/google";

  };

  return (
    <button
      type="button"
      onClick={handleGoogleAuth}
      disabled={isPending}
      className="w-full rounded-full flex items-center justify-center gap-3 border border-gray-700 hover:bg-neutral-900 text-white py-3 my-6 bg-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className="text-lg font-medium">Continue with Google</span>
      <img
        src="https://www.svgrepo.com/show/475656/google-color.svg"
        alt="Google"
        className="w-5 h-5"
      />
    </button>
  );
};

export { GoogleAuthButton };