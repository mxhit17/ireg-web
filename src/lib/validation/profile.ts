import { z } from "zod";

/** Mirrors UpdateProfileDto: name 2–150 chars. */
export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your full name")
    .max(150, "Name is too long"),
});
export type ProfileValues = z.infer<typeof profileSchema>;
