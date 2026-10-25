/** Client-side checks + downscaling for profile photos before upload. */

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // what we accept from the picker (before resizing)
const MAX_DIMENSION = 1024;
const SKIP_RESIZE_BELOW_BYTES = 800 * 1024;

export function validateImage(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return "Please choose a JPG, PNG or WebP image.";
  }
  if (file.size > MAX_IMAGE_BYTES) return "That image is larger than 10 MB. Please choose a smaller one.";
  return null;
}

/**
 * Shrinks large photos to at most 1024px on the long edge (JPEG, 88% quality) so uploads are
 * fast on mobile data. Small images are sent untouched. Falls back to the original on any error.
 */
export async function prepareImageForUpload(
  file: File,
  { maxDimension = MAX_DIMENSION }: { maxDimension?: number } = {},
): Promise<File> {
  if (typeof window === "undefined" || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= SKIP_RESIZE_BELOW_BYTES) {
      bitmap.close();
      return file;
    }
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#ffffff"; // flatten transparent PNGs onto white for JPEG
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}
