import ChatSVG from "../../assets/chat.svg";

const AuthLeftPanel = () => {
  return (
    <div className="hidden lg:flex items-center justify-center">
      <div className="max-w-2xl w-full px-20 mt-12 flex flex-col gap-12">
        
        {/* Text */}
        <div>
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Discover your people.
          </h1>
          <p className="text-lg text-gray-400 max-w-lg">
            Find where you belong — in the Social Mesh.
          </p>
        </div>

        {/* Illustration (slightly up from bottom) */}
        <img
          src={ChatSVG}
          alt="Social Mesh Illustration"
          className="w-[360px] max-w-full -mt-4"
        />
      </div>
    </div>
  );
};

export default AuthLeftPanel;
