import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ApiError } from "../lib/apiError";
import { handleApiError } from "../lib/handleApiError";

const useFollow = () => {
	const queryClient = useQueryClient();

	const { mutate: follow, isPending } = useMutation<string, ApiError, number>({
		mutationFn: async (profileId) => {
			const res = await fetch(`/api/v1/connection/${profileId}/follow`, {
				method: "POST",
			});

			const result = await res.json();

			if (!res.ok) {
				throw new ApiError(
					res.status,
					result.message,
					result.errors,
					result.data
				);
			}

			return result.message;
		},

		onSuccess: async (message) => {
			toast.success(message);

			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["suggestedUsers"] }),
				queryClient.invalidateQueries({ queryKey: ["authUser"] }),
			]);
		},

		onError: (error) => {
			if (error instanceof ApiError && error.statusCode === 400) {
				toast.error(error.message);
				return;
			}

			if (error instanceof ApiError && error.statusCode === 500) {
				toast.error("Server error. Try again later.");
				return;
			}

			handleApiError(error);
		},
	});

	return { follow, isPending };
};

export default useFollow;