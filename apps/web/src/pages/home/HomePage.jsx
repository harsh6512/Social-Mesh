import { Posts } from "../../components/common/Posts";
import { RightPanel } from "../../components/common/RightPanel";
import { LeftSidebar } from "../../components/common/LeftSidebar";

const HomePage = () => {
	return (
		<div className="flex max-w-6xl mx-auto w-full min-h-screen bg-base-100">

			{/* LEFT SIDEBAR */}
			<LeftSidebar />

			{/* MAIN FEED */}
			<div className="flex-1 max-w-2xl w-full border-r border-gray-800">
				<div className="sticky top-0 z-20 backdrop-blur bg-base-100/80 border-b border-gray-800">
					<div className="px-6 py-5 flex justify-center">
						<h1 className="text-2xl font-bold tracking-wide">
							SocialMesh
						</h1>
					</div>
				</div>

				<Posts />
			</div>

			{/* RIGHT PANEL */}
			<div className="w-80 hidden xl:block px-4">
				<RightPanel />
			</div>

		</div>
	);
};

export { HomePage };