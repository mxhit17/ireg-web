import { z } from "zod";

/** Indian mobile: 10 digits starting 6–9; "+91", "91" or "0" prefixes and spaces/dashes are accepted. */
export function normalizeIndianMobile(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export const phoneSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || normalizeIndianMobile(v) !== null, "Enter a valid 10-digit Indian mobile number");

/** Mirrors UpdateProfileDto: name 2–150 chars, phone ≤ 30 (we require a valid Indian mobile). */
export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your full name")
    .max(150, "Name is too long"),
  phone: phoneSchema,
});
export type ProfileValues = z.infer<typeof profileSchema>;
