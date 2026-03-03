import { Bell, PlusSquare, User, Video } from "lucide-react";
import { Link } from "react-router-dom";

const LeftSidebar = () => {
	return (
		<div className="w-60 border-r border-gray-800 flex flex-col py-8 px-5 gap-6 sticky top-0 h-screen">

			{/* Notifications */}
			<Link
				to="/notifications"
				className="flex items-center gap-4 px-4 py-3 rounded-xl 
				text-base font-semibold
				hover:bg-base-200 hover:scale-[1.03]
				transition-all duration-200 ease-in-out"
			>
				<Bell size={26} />
				<span>Notifications</span>
			</Link>

			{/* Create Post */}
			<Link
				to="/create"
				className="flex items-center gap-4 px-4 py-3 rounded-xl 
				text-base font-semibold bg-primary text-primary-content
				hover:scale-[1.03]
				transition-all duration-200 ease-in-out shadow-lg"
			>
				<PlusSquare size={26} />
				<span>Create Post</span>
			</Link>

			{/* Quick Connect */}
			<Link
				to="/quick-connect"
				className="flex items-center gap-4 px-4 py-3 rounded-xl 
				text-base font-semibold
				hover:bg-base-200 hover:scale-[1.03]
				transition-all duration-200 ease-in-out"
			>
				<Video size={26} />
				<span>Quick Connect</span>
			</Link>

			{/* Profile */}
			<Link
				to="/profile/me"
				className="flex items-center gap-4 px-4 py-3 rounded-xl 
				text-base font-semibold mt-auto
				hover:bg-base-200 hover:scale-[1.03]
				transition-all duration-200 ease-in-out"
			>
				<User size={26} />
				<span>Profile</span>
			</Link>

		</div>
	);
};

export { LeftSidebar };