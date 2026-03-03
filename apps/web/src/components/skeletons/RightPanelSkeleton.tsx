const RightPanelSkeleton = ({ count = 4 }: { count?: number }) => {
	return (
		<>
			{Array.from({ length: count }).map((_, i) => (
				<div
					key={i}
					className="flex items-center justify-between animate-pulse"
				>
					{/* LEFT SIDE */}
					<div className="flex gap-3 items-center">
						{/* Avatar */}
						<div className="w-12 h-12 rounded-full bg-gray-700" />

						{/* Name + Username */}
						<div className="flex flex-col gap-2">
							<div className="w-28 h-4 bg-gray-700 rounded" />
							<div className="w-20 h-3 bg-gray-700 rounded" />
						</div>
					</div>

					{/* Follow button placeholder */}
					<div className="w-16 h-7 bg-gray-700 rounded-full" />
				</div>
			))}
		</>
	);
};

export  {RightPanelSkeleton};