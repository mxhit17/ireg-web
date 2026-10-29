"use client";

import { useState } from "react";
import { ExternalLink, Newspaper } from "lucide-react";

import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Cover photo with a branded placeholder when there's no image (or it fails to load). */
export function BlogCover({ src, alt = "", className }: { src: string | null; alt?: string; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const show = !!src && failed !== src;
  return (
    <div className={cn("relative overflow-hidden bg-gradient-to-br from-sky-100 via-sky-50 to-slate-100", className)}>
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailed(src)}
        />
      ) : (
        <Newspaper className="absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2 text-sky-300" strokeWidth={1.5} aria-hidden />
      )}
    </div>
  );
}

/** Blank line = new paragraph; single line breaks are kept. */
export function BlogBody({ text, className }: { text: string; className?: string }) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <div className={cn("grid gap-4 text-[15px] leading-7 text-slate-700 sm:text-base sm:leading-[1.8]", className)}>
      {paragraphs.map((p, i) => (
        <p key={i} className="break-words whitespace-pre-line">
          {p}
        </p>
      ))}
    </div>
  );
}

/** "Source : NDTV" — a link when the blog has a source URL. */
export function BlogSource({ name, url: rawUrl }: { name: string | null; url: string | null }) {
  const url = rawUrl && /^https?:\/\//i.test(rawUrl) ? rawUrl : null; // only ever link out to http(s)
  if (!name && !url) return null;
  const label = name ?? hostOf(url!);
  return (
    <span className="min-w-0 truncate">
      Source:{" "}
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="font-semibold text-primary hover:underline"
        >
          {label}
          <ExternalLink className="ml-0.5 inline size-3 align-[-1px]" aria-hidden />
        </a>
      ) : (
        <span className="font-semibold text-slate-600">{label}</span>
      )}
    </span>
  );
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Figma "blog-view": title, cover, "Source · date" row, body. Shared by the article page and the
 * admin editor's preview.
 */
export function BlogArticleContent({
  title,
  coverUrl,
  sourceName,
  sourceUrl,
  date,
  dateLabel = "Published",
  body,
  excerpt,
  as: Heading = "h1",
  actions,
}: {
  title: string;
  coverUrl: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  date: string | null;
  dateLabel?: string;
  body: string;
  excerpt?: string | null;
  as?: "h1" | "h2";
  /** e.g. share button, placed next to the title. */
  actions?: React.ReactNode;
}) {
  const when = formatDate(date);
  return (
    <article className="grid gap-4">
      <header className="flex items-start justify-between gap-3">
        <Heading className="text-2xl leading-tight font-bold tracking-tight break-words sm:text-[2rem]">
          {title || <span className="text-subtle-foreground">Untitled blog</span>}
        </Heading>
        {actions && <div className="mt-1 shrink-0">{actions}</div>}
      </header>
      {excerpt && <p className="-mt-1 text-base leading-relaxed text-muted-foreground sm:text-lg">{excerpt}</p>}

      <figure className="grid gap-2">
        <BlogCover src={coverUrl} alt="" className="aspect-[16/9] rounded-2xl sm:aspect-[2/1]" />
        <figcaption className="flex items-center justify-between gap-3 text-xs text-subtle-foreground sm:text-[13px]">
          <BlogSource name={sourceName} url={sourceUrl} />
          {when && (
            <span className="ml-auto shrink-0">
              {dateLabel} {when}
            </span>
          )}
        </figcaption>
      </figure>

      {body.trim() ? <BlogBody text={body} /> : <p className="text-subtle-foreground">Nothing written yet.</p>}
    </article>
  );
}
