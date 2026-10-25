import { z } from "zod";

export const projectRequestSchema = z.object({
  image: z.custom<File | null>((v) => typeof File !== "undefined" && v instanceof File, "Add a photo of the project"),
  builderName: z.string().trim().min(2, "Enter the builder's name").max(250, "Builder name is too long"),
  name: z.string().trim().min(2, "Enter the project's name").max(250, "Project name is too long"),
  address: z
    .string()
    .trim()
    .min(5, "Enter the project's address (area and city)")
    .max(500, "Address is too long"),
});

export type ProjectRequestValues = z.infer<typeof projectRequestSchema>;
