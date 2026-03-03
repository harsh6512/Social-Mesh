const PostFeedSkeleton = ({ count = 2 }: { count?: number }) => {
	return (
		<div className="p-6 space-y-6">
			{Array.from({ length: count }).map((_, i) => (
				<div
					key={i}
					className="animate-pulse border-b border-gray-800 pb-6"
				>
					{/* header */}
					<div className="flex items-center gap-3 mb-4">
						<div className="w-12 h-12 rounded-full bg-gray-700" />
						<div className="w-32 h-4 bg-gray-700 rounded" />
					</div>

					{/* media */}
					<div className="w-full h-80 bg-gray-700 rounded-2xl" />

					{/* actions */}
					<div className="flex gap-6 mt-4">
						<div className="w-12 h-4 bg-gray-700 rounded" />
						<div className="w-12 h-4 bg-gray-700 rounded" />
					</div>
				</div>
			))}
		</div>
	);
};

export  { PostFeedSkeleton };