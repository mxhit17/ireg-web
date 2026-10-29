"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Eye, FileWarning, Loader2, PencilLine, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { FormField } from "@/components/auth/form-field";
import { BlogArticleContent } from "@/components/blogs/blog-content";
import { DeleteBlogDialog } from "@/components/blogs/delete-blog-dialog";
import { ImageDropzone } from "@/components/project-requests/image-dropzone";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useBlog, useCreateBlog, usePublishBlog, useUpdateBlog } from "@/hooks/use-blogs";
import { blogDrafts } from "@/lib/blog-drafts";
import { readingTime, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Blog, BlogInput, BlogStatus } from "@/types/blog";

type Errors = Partial<Record<keyof BlogInput, string>>;

const EMPTY: BlogInput = { title: "", excerpt: "", body: "", sourceName: "", sourceUrl: "" };

const fromBlog = (b: Blog): BlogInput => ({
  title: b.title,
  excerpt: b.excerpt ?? "",
  body: b.body,
  sourceName: b.sourceName ?? "",
  sourceUrl: b.sourceUrl ?? "",
});

function validate(v: BlogInput): Errors {
  const e: Errors = {};
  const title = v.title.trim();
  if (!title) e.title = "Enter a title";
  else if (title.length > 300) e.title = "Use at most 300 characters";
  if (v.body.trim().length < 20) e.body = "Write the blog (at least 20 characters)";
  if (v.excerpt.trim().length > 500) e.excerpt = "Keep the summary under 500 characters";
  if (v.sourceName.trim().length > 200) e.sourceName = "Use at most 200 characters";
  const url = v.sourceUrl.trim();
  if (url) {
    try {
      const u = new URL(url);
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error();
    } catch {
      e.sourceUrl = "Enter a full link starting with https://";
    }
  }
  return e;
}

/** Only the fields that changed — PATCH accepts any subset. */
function diff(a: BlogInput, b: BlogInput): Partial<BlogInput> {
  const out: Partial<BlogInput> = {};
  (Object.keys(a) as (keyof BlogInput)[]).forEach((k) => {
    if (a[k].trim() !== b[k].trim()) out[k] = a[k];
  });
  return out;
}

const articleHref = (b: Pick<Blog, "slug">) => `/blogs/${b.slug}`;

// ---------------------------------------------------------------------------
// New blog (Figma "create-blog-screen")
// ---------------------------------------------------------------------------

export function NewBlogEditor() {
  const router = useRouter();
  const create = useCreateBlog();
  const publish = usePublishBlog();
  const [values, setValues] = useState<BlogInput>(EMPTY);
  const [cover, setCover] = useState<File | null>(null);
  const [pendingAs, setPendingAs] = useState<BlogStatus | null>(null);
  const busy = create.isPending || publish.isPending;

  async function save(status: BlogStatus) {
    setPendingAs(status);
    try {
      // The API always creates a DRAFT; publishing is a second call.
      const blog = await create.mutateAsync({ input: values, cover });
      if (!blog) return router.push("/blogs");
      if (status === "PUBLISHED") {
        try {
          const published = await publish.mutateAsync(blog.id);
          return router.replace(articleHref(published ?? blog));
        } catch {
          // Saved as a draft but publishing failed (toast shown) — keep editing the draft.
          return router.replace(`/blogs/manage/${blog.id}`);
        }
      }
      toast.success("Draft saved");
      router.replace(`/blogs/manage/${blog.id}`);
    } catch {
      /* toast from the hook */
    } finally {
      setPendingAs(null);
    }
  }

  return (
    <EditorShell title="Create blog" values={values} onChange={setValues} cover={cover} onCover={setCover} busy={busy}>
      {(check) => (
        <>
          <Button type="button" variant="outline" disabled={busy} onClick={() => check() && save("DRAFT")}>
            {pendingAs === "DRAFT" && <Loader2 className="animate-spin" />}
            Save as draft
          </Button>
          <Button type="button" disabled={busy} onClick={() => check() && save("PUBLISHED")}>
            {pendingAs === "PUBLISHED" ? <Loader2 className="animate-spin" /> : <Send />}
            Post
          </Button>
        </>
      )}
    </EditorShell>
  );
}

// ---------------------------------------------------------------------------
// Edit existing blog
// ---------------------------------------------------------------------------

/**
 * Published blogs load by slug (public GET). Drafts can't be fetched — there's no admin read
 * endpoint — so they come from the snapshot this browser saved when the draft was written.
 */
export function EditBlogEditor({ id, slug }: { id: string; slug: string | null }) {
  const remote = useBlog(slug);
  const [base, setBase] = useState<Blog | null>(null);
  const [checkedLocal, setCheckedLocal] = useState(false);

  useEffect(() => {
    if (base) return;
    if (remote.data && remote.data.id === id) return setBase(remote.data);
    if (!slug || remote.isError || (remote.data && remote.data.id !== id)) {
      const local = blogDrafts.get(id);
      if (local) setBase(local);
      setCheckedLocal(true);
    }
  }, [base, remote.data, remote.isError, id, slug]);

  if (!base) {
    if (!checkedLocal) {
      return (
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-[480px] rounded-2xl" />
        </div>
      );
    }
    return (
      <Card className="mx-auto flex max-w-lg flex-col items-center gap-3 px-6 py-12 text-center">
        <FileWarning className="size-8 text-subtle-foreground" />
        <p className="text-lg font-bold">Can&apos;t open this blog</p>
        <p className="text-sm text-muted-foreground">
          Published blogs open from their page. Drafts can only be edited from the browser that saved them until the
          backend offers an endpoint to list drafts.
        </p>
        <Button asChild variant="outline" className="mt-1">
          <Link href="/blogs">Back to blogs</Link>
        </Button>
      </Card>
    );
  }

  return <EditLoaded key={base.id} blog={base} onSaved={setBase} />;
}

function EditLoaded({ blog, onSaved }: { blog: Blog; onSaved: (b: Blog) => void }) {
  const router = useRouter();
  const update = useUpdateBlog(blog.id, blog.slug);
  const publish = usePublishBlog();
  const original = useMemo(() => fromBlog(blog), [blog]);
  const [values, setValues] = useState<BlogInput>(original);
  const [cover, setCover] = useState<File | null>(null);
  const [action, setAction] = useState<"save" | "publish" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const changes = diff(values, original);
  const dirty = Object.keys(changes).length > 0 || !!cover;
  const busy = update.isPending || publish.isPending;
  const published = blog.status === "PUBLISHED";

  async function run(kind: "save" | "publish") {
    setAction(kind);
    try {
      let latest: Blog = blog;
      if (dirty) {
        // Admin update responses don't include the author — keep the one we have.
        const saved = await update.mutateAsync({ changes, cover });
        if (saved) latest = { ...saved, author: saved.author ?? blog.author };
      }
      if (kind === "publish") {
        const p = await publish.mutateAsync(blog.id);
        if (p) latest = { ...p, author: latest.author };
        return router.push(articleHref(latest));
      }
      onSaved(latest);
      setValues(fromBlog(latest));
      setCover(null);
      toast.success(published ? "Changes saved" : "Draft saved");
      if (published) router.push(articleHref(latest));
    } catch {
      /* toasts come from the mutation hooks */
    } finally {
      setAction(null);
    }
  }

  return (
    <>
      <EditorShell
        title="Edit blog"
        status={blog.status}
        updatedAt={blog.updatedAt}
        viewHref={published ? articleHref(blog) : undefined}
        values={values}
        onChange={setValues}
        cover={cover}
        onCover={setCover}
        existingCoverUrl={blog.coverImageUrl}
        date={blog.publishedAt ?? blog.createdAt}
        busy={busy}
      >
        {(check) => (
          <>
            <Button
              type="button"
              variant="ghost"
              className="mr-auto text-destructive hover:text-destructive"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 /> Delete
            </Button>
            {published ? (
              <Button type="button" disabled={busy || !dirty} onClick={() => check() && run("save")}>
                {action === "save" && <Loader2 className="animate-spin" />}
                Save changes
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" disabled={busy || !dirty} onClick={() => check() && run("save")}>
                  {action === "save" && <Loader2 className="animate-spin" />}
                  Save draft
                </Button>
                <Button type="button" disabled={busy} onClick={() => check() && run("publish")}>
                  {action === "publish" ? <Loader2 className="animate-spin" /> : <Send />}
                  Post
                </Button>
              </>
            )}
          </>
        )}
      </EditorShell>
      <DeleteBlogDialog open={confirmDelete} onOpenChange={setConfirmDelete} blog={blog} onDeleted={() => router.replace("/blogs")} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Shared form + live preview
// ---------------------------------------------------------------------------

const fieldBox =
  "w-full rounded-lg border border-input bg-field px-4 py-3 text-[15px] outline-none placeholder:text-subtle-foreground focus-visible:border-primary focus-visible:bg-white focus-visible:ring-[3px] focus-visible:ring-primary/15 aria-invalid:border-destructive";

/** Object URL for a picked file, revoked when it changes. */
function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return setUrl(null);
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

function EditorShell({
  title,
  status,
  updatedAt,
  viewHref,
  values,
  onChange,
  cover,
  onCover,
  existingCoverUrl,
  date,
  busy,
  children,
}: {
  title: string;
  status?: BlogStatus;
  updatedAt?: string;
  viewHref?: string;
  values: BlogInput;
  onChange: (v: BlogInput) => void;
  cover: File | null;
  onCover: (f: File | null) => void;
  existingCoverUrl?: string | null;
  date?: string | null;
  busy: boolean;
  /** Action buttons; `check()` validates and returns whether the form is OK. */
  children: (check: () => boolean) => React.ReactNode;
}) {
  const [errors, setErrors] = useState<Errors>({});
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const coverPreview = useObjectUrl(cover);
  const set = <K extends keyof BlogInput>(k: K, v: BlogInput[K]) => {
    onChange({ ...values, [k]: v });
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const check = () => {
    const e = validate(values);
    setErrors(e);
    if (Object.keys(e).length) {
      setTab("edit");
      document.getElementById(`blog-${Object.keys(e)[0]}`)?.focus();
      return false;
    }
    return true;
  };

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
        <Link href="/blogs" className="font-semibold text-primary hover:underline">
          Blogs
        </Link>
        <ChevronRight className="size-4 text-subtle-foreground" />
        <span className="text-muted-foreground">{title}</span>
      </nav>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {status && (
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-bold",
              status === "PUBLISHED" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700",
            )}
          >
            {status === "PUBLISHED" ? "Published" : status === "DRAFT" ? "Draft" : "Archived"}
          </span>
        )}
        {updatedAt && <span className="text-sm text-subtle-foreground">Updated {timeAgo(updatedAt)}</span>}
        {viewHref && (
          <Link href={viewHref} className="ml-auto text-sm font-semibold text-primary hover:underline">
            View live page
          </Link>
        )}
      </div>

      <div role="tablist" aria-label="Editor view" className="grid grid-cols-2 rounded-xl bg-secondary p-1 lg:hidden">
        {(["edit", "preview"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "flex cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold",
              tab === t ? "bg-white shadow-sm" : "text-muted-foreground",
            )}
          >
            {t === "edit" ? <PencilLine className="size-4" /> : <Eye className="size-4" />}
            {t === "edit" ? "Write" : "Preview"}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          noValidate
          onSubmit={(e) => e.preventDefault()}
          className={cn(
            "grid content-start gap-5 rounded-2xl border border-border bg-white p-5 sm:p-6",
            tab !== "edit" && "max-lg:hidden",
          )}
          aria-busy={busy}
        >
          <div className="grid gap-2">
            <span className="text-sm font-semibold">Cover photo (optional)</span>
            <ImageDropzone
              inputId="blog-cover"
              value={cover}
              onChange={onCover}
              existingUrl={existingCoverUrl}
              alt="Blog cover"
              className="aspect-[2/1] sm:aspect-[2/1]"
            />
          </div>

          <FormField id="blog-title" label="Title" error={errors.title}>
            <Input
              id="blog-title"
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. RERA 2.0: What New Regulations Mean for Homebuyers"
              maxLength={300}
              aria-invalid={!!errors.title}
            />
          </FormField>

          <FormField
            id="blog-excerpt"
            label="Summary (optional)"
            error={errors.excerpt}
            hint="One or two lines shown on the blog card. If empty, the start of the body is used."
          >
            <textarea
              id="blog-excerpt"
              value={values.excerpt}
              onChange={(e) => set("excerpt", e.target.value)}
              rows={2}
              aria-invalid={!!errors.excerpt}
              placeholder="The latest amendments bring stronger protections for buyers…"
              className={cn(fieldBox, "resize-y")}
            />
          </FormField>

          <FormField
            id="blog-body"
            label="Body"
            error={errors.body}
            hint={`Leave a blank line between paragraphs. ${values.body.trim() ? readingTime(values.body) : ""}`}
          >
            <textarea
              id="blog-body"
              value={values.body}
              onChange={(e) => set("body", e.target.value)}
              rows={14}
              aria-invalid={!!errors.body}
              placeholder="Write the article…"
              className={cn(fieldBox, "min-h-48 resize-y leading-relaxed")}
            />
          </FormField>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id="blog-sourceName" label="Source (optional)" error={errors.sourceName}>
              <Input
                id="blog-sourceName"
                value={values.sourceName}
                onChange={(e) => set("sourceName", e.target.value)}
                placeholder="e.g. NDTV"
                maxLength={200}
                aria-invalid={!!errors.sourceName}
              />
            </FormField>
            <FormField id="blog-sourceUrl" label="Source link (optional)" error={errors.sourceUrl}>
              <Input
                id="blog-sourceUrl"
                type="url"
                inputMode="url"
                value={values.sourceUrl}
                onChange={(e) => set("sourceUrl", e.target.value)}
                placeholder="https://…"
                aria-invalid={!!errors.sourceUrl}
              />
            </FormField>
          </div>

          <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-wrap justify-end gap-2 rounded-b-2xl border-t border-border bg-white/95 px-5 py-4 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6">
            {children(check)}
          </div>
        </form>

        <section aria-label="Preview" className={cn("grid content-start gap-3", tab !== "preview" && "max-lg:hidden")}>
          <p className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-subtle-foreground uppercase">
            <Eye className="size-3.5" /> Preview — what users will see
          </p>
          <div className="rounded-2xl border border-dashed border-border bg-background p-4 sm:p-5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
            <BlogArticleContent
              as="h2"
              title={values.title.trim()}
              excerpt={values.excerpt.trim() || null}
              coverUrl={coverPreview ?? existingCoverUrl ?? null}
              sourceName={values.sourceName.trim() || null}
              sourceUrl={values.sourceUrl.trim() || null}
              date={date ?? new Date().toISOString()}
              body={values.body}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
