import { z } from "zod";

export const gratitudeEntrySchema = z.object({
  body: z.string().trim().min(1, "Write something you are grateful for.").max(500, "Keep your gratitude entry under 500 characters."),
});
