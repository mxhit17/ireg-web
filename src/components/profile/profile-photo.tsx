"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/user/user-avatar";
import { useUploadProfilePhoto } from "@/hooks/use-profile";
import { isApiError } from "@/lib/api/errors";
import { ACCEPTED_IMAGE_TYPES, prepareImageForUpload, validateImage } from "@/lib/image";
import { cn } from "@/lib/utils";
import type { User } from "@/types/auth";

/**
 * The profile picture with upload: click the avatar / camera button, or drop an image on it.
 * Large photos are downscaled in the browser, then sent to PATCH profile/photo.
 */
export function ProfilePhoto({ user, className }: { user: User; className?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const upload = useUploadProfilePhoto();

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const problem = validateImage(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    const prepared = await prepareImageForUpload(file);
    upload.mutate(prepared, {
      onError: (err) =>
        toast.error(isApiError(err) ? err.message : "Couldn't upload your photo. Please try again."),
    });
  }

  const busy = upload.isPending;

  return (
    <div className={cn("relative w-fit shrink-0 self-start sm:self-auto", className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        disabled={busy}
        aria-label="Change profile photo"
        className={cn(
          "group relative block cursor-pointer rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
          dragging && "ring-4 ring-primary/40",
        )}
      >
        <UserAvatar user={user} className="size-24 text-3xl ring-4 ring-white sm:size-28 sm:text-4xl" />
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-full bg-slate-900/45 text-white transition-opacity",
            busy ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
          )}
        >
          {busy ? <Loader2 className="size-7 animate-spin" /> : <Camera className="size-7" />}
        </span>
      </button>

      <span
        aria-hidden
        className="pointer-events-none absolute right-0.5 bottom-0.5 flex size-8 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-md sm:right-1 sm:bottom-1"
      >
        <Camera className="size-4" />
      </span>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = ""; // allow re-selecting the same file
        }}
      />
    </div>
  );
}
