import { z } from 'zod';

export const intentionSchema = z.object({
  intention: z.enum([
    "Friendship",
    "Dating",
    "Networking",
    "Open",
    "Omegle",
    "Unspecified"
  ]),
});

export type intentionData = z.infer<typeof intentionSchema>;
