import type { User } from "@/types/auth";

import { api } from "./client";
import { ApiError } from "./errors";
import { extractImageUrl, extractUser } from "./normalize";

/** Endpoints from the Postman "User and Admin Management" folder. */
const PROFILE = "user-and-admin-management/profile";

export interface UpdateProfileInput {
  name?: string;
  /** `null` clears it. Needed for consultation payments (Cashfree requires a mobile number). */
  phone?: string | null;
}

export async function getProfile(): Promise<User> {
  const body = await api.get<unknown>(PROFILE);
  const user = extractUser(body);
  if (!user) throw new ApiError("We couldn't read your profile. Please try again.", 500, body);
  return user;
}

/** Returns the updated user if the API sends it back, otherwise null (caller merges the input). */
export async function updateProfile(input: UpdateProfileInput): Promise<User | null> {
  const body = await api.patch<unknown>(PROFILE, input);
  return extractUser(body);
}

export interface UploadPhotoResult {
  user: User | null;
  imageUrl: string | null;
}

export async function uploadProfilePhoto(file: File | Blob, filename = "avatar.jpg"): Promise<UploadPhotoResult> {
  const form = new FormData();
  form.append("file", file, file instanceof File ? file.name : filename);
  const body = await api.patch<unknown>(`${PROFILE}/photo`, form);
  return { user: extractUser(body), imageUrl: extractImageUrl(body) };
}
