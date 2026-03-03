const LikesSkeleton = ({ count = 6 }: { count?: number }) => {
	return (
		<div className="flex flex-col gap-4 p-6">
			{Array.from({ length: count }).map((_, index) => (
				<div
					key={index}
					className="
						p-5 rounded-2xl
						bg-base-200/40
						border border-base-300/40
						animate-pulse
					"
				>
					<div className="flex items-center gap-4">
						{/* Avatar */}
						<div className="w-14 h-14 rounded-full bg-base-300" />

						{/* Text */}
						<div className="flex flex-col gap-2 w-full">
							<div className="h-4 w-40 bg-base-300 rounded" />
							<div className="h-3 w-24 bg-base-300 rounded opacity-60" />
						</div>
					</div>
				</div>
			))}
		</div>
	);
};

export { LikesSkeleton };