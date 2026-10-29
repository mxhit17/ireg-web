"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Eye, FileWarning, Loader2, PencilLine, Send, Undo2 } from "lucide-react";

import { FormField } from "@/components/auth/form-field";
import { TopicContent } from "@/components/knowledge/topic-content";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateTopic, useKnowledgeCategories, useKnowledgeTopic, usePublishTopic, useUpdateTopic } from "@/hooks/use-knowledge";
import { timeAgo } from "@/lib/format";
import { knowledgeDrafts } from "@/lib/knowledge-drafts";
import { cn } from "@/lib/utils";
import { KNOWLEDGE_LEVELS, type ContentStatus, type KnowledgeTopic, type TopicInput } from "@/types/knowledge";

type FormValues = Omit<TopicInput, "status">;
type Errors = Partial<Record<keyof FormValues, string>>;

const EMPTY: FormValues = { categoryId: "", title: "", level: "BEGINNER", definition: "", simpleExplanation: "" };

const fromTopic = (t: KnowledgeTopic): FormValues => ({
  categoryId: t.categoryId,
  title: t.title,
  level: t.level,
  definition: t.definition,
  simpleExplanation: t.simpleExplanation ?? "",
});

function validate(v: FormValues): Errors {
  const e: Errors = {};
  if (!v.categoryId) e.categoryId = "Choose a category";
  const title = v.title.trim();
  if (title.length < 2) e.title = "Enter a title";
  else if (title.length > 250) e.title = "Use at most 250 characters";
  if (v.definition.trim().length < 10) e.definition = "Write a definition (at least 10 characters)";
  return e;
}

/** Only the fields that changed — PATCH accepts any subset. */
function diff(a: FormValues, b: FormValues): Partial<FormValues> {
  const out: Partial<FormValues> = {};
  (Object.keys(a) as (keyof FormValues)[]).forEach((k) => {
    if (a[k].trim() !== b[k].trim()) (out as Record<string, string>)[k] = a[k];
  });
  return out;
}

// ---------------------------------------------------------------------------
// New topic
// ---------------------------------------------------------------------------

export function NewTopicEditor({ defaultCategoryId }: { defaultCategoryId?: string }) {
  const router = useRouter();
  const create = useCreateTopic();
  const [values, setValues] = useState<FormValues>({ ...EMPTY, categoryId: defaultCategoryId ?? "" });
  const [pendingAs, setPendingAs] = useState<ContentStatus | null>(null);

  function save(status: ContentStatus) {
    setPendingAs(status);
    create.mutate(
      { ...values, status },
      {
        onSuccess: (topic) => {
          if (!topic) return router.push("/knowledge-base");
          router.replace(
            status === "PUBLISHED"
              ? `/knowledge-base/${topic.category?.slug ?? "_"}/${topic.slug}`
              : `/knowledge-base/manage/${topic.id}`,
          );
        },
        onSettled: () => setPendingAs(null),
      },
    );
  }

  return (
    <EditorShell title="New topic" values={values} onChange={setValues} busy={create.isPending}>
      {(check) => (
        <>
          <Button type="button" variant="outline" disabled={create.isPending} onClick={() => check() && save("DRAFT")}>
            {pendingAs === "DRAFT" && <Loader2 className="animate-spin" />}
            Save as draft
          </Button>
          <Button type="button" disabled={create.isPending} onClick={() => check() && save("PUBLISHED")}>
            {pendingAs === "PUBLISHED" ? <Loader2 className="animate-spin" /> : <Send />}
            Publish
          </Button>
        </>
      )}
    </EditorShell>
  );
}

// ---------------------------------------------------------------------------
// Edit existing topic
// ---------------------------------------------------------------------------

/**
 * Published topics load by slug (public GET). Drafts can't be fetched — there's no admin read
 * endpoint — so they come from the snapshot this browser saved when the draft was written.
 */
export function EditTopicEditor({ id, slug }: { id: string; slug: string | null }) {
  const remote = useKnowledgeTopic(slug);
  const [base, setBase] = useState<KnowledgeTopic | null>(null);
  const [checkedLocal, setCheckedLocal] = useState(false);

  useEffect(() => {
    if (base) return;
    if (remote.data && remote.data.id === id) return setBase(remote.data);
    if (!slug || remote.isError || (remote.data && remote.data.id !== id)) {
      const local = knowledgeDrafts.get(id);
      if (local) setBase(local);
      setCheckedLocal(true);
    }
  }, [base, remote.data, remote.isError, id, slug]);

  if (!base) {
    if (!checkedLocal) {
      return (
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-[420px] rounded-2xl" />
        </div>
      );
    }
    return (
      <Card className="mx-auto flex max-w-lg flex-col items-center gap-3 px-6 py-12 text-center">
        <FileWarning className="size-8 text-subtle-foreground" />
        <p className="text-lg font-bold">Can&apos;t open this topic</p>
        <p className="text-sm text-muted-foreground">
          Published topics open from their page. Drafts can only be edited from the browser that saved them until the
          backend offers an endpoint to list drafts.
        </p>
        <Button asChild variant="outline" className="mt-1">
          <Link href="/knowledge-base">Back to Knowledge Base</Link>
        </Button>
      </Card>
    );
  }

  return <EditLoaded key={base.id} topic={base} onSaved={setBase} />;
}

function EditLoaded({ topic, onSaved }: { topic: KnowledgeTopic; onSaved: (t: KnowledgeTopic) => void }) {
  const router = useRouter();
  const update = useUpdateTopic(topic.id, topic.slug);
  const publish = usePublishTopic();
  const original = useMemo(() => fromTopic(topic), [topic]);
  const [values, setValues] = useState<FormValues>(original);
  const [action, setAction] = useState<"save" | "publish" | "unpublish" | null>(null);
  const changes = diff(values, original);
  const dirty = Object.keys(changes).length > 0;
  const busy = update.isPending || publish.isPending;
  const published = topic.status === "PUBLISHED";

  const pageHref = (t: KnowledgeTopic) => `/knowledge-base/${t.category?.slug ?? "_"}/${t.slug}`;

  async function run(kind: "save" | "publish" | "unpublish") {
    setAction(kind);
    try {
      let latest: KnowledgeTopic | null = topic;
      if (kind === "unpublish") {
        latest = await update.mutateAsync({ ...changes, status: "DRAFT" });
      } else if (dirty) {
        latest = await update.mutateAsync(changes);
      }
      if (kind === "publish") latest = await publish.mutateAsync(topic.id);
      if (latest) {
        onSaved(latest);
        setValues(fromTopic(latest));
        if (kind === "publish") router.push(pageHref(latest));
        else if (kind === "save" && published) router.push(pageHref(latest));
      }
    } catch {
      /* toasts come from the mutation hooks */
    } finally {
      setAction(null);
    }
  }

  return (
    <EditorShell
      title="Edit topic"
      status={topic.status}
      updatedAt={topic.updatedAt}
      viewHref={published ? pageHref(topic) : undefined}
      values={values}
      onChange={setValues}
      busy={busy}
    >
      {(check) =>
        published ? (
          <>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => run("unpublish")}>
              {action === "unpublish" ? <Loader2 className="animate-spin" /> : <Undo2 />}
              Move to drafts
            </Button>
            <Button type="button" disabled={busy || !dirty} onClick={() => check() && run("save")}>
              {action === "save" && <Loader2 className="animate-spin" />}
              Save changes
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="outline" disabled={busy || !dirty} onClick={() => check() && run("save")}>
              {action === "save" && <Loader2 className="animate-spin" />}
              Save draft
            </Button>
            <Button type="button" disabled={busy} onClick={() => check() && run("publish")}>
              {action === "publish" ? <Loader2 className="animate-spin" /> : <Send />}
              Publish
            </Button>
          </>
        )
      }
    </EditorShell>
  );
}

// ---------------------------------------------------------------------------
// Shared form + live preview
// ---------------------------------------------------------------------------

const fieldBox =
  "w-full rounded-lg border border-input bg-field px-4 py-3 text-[15px] outline-none placeholder:text-subtle-foreground focus-visible:border-primary focus-visible:bg-white focus-visible:ring-[3px] focus-visible:ring-primary/15 aria-invalid:border-destructive";

function EditorShell({
  title,
  status,
  updatedAt,
  viewHref,
  values,
  onChange,
  busy,
  children,
}: {
  title: string;
  status?: ContentStatus;
  updatedAt?: string;
  viewHref?: string;
  values: FormValues;
  onChange: (v: FormValues) => void;
  busy: boolean;
  /** Action buttons; `check()` validates and returns whether the form is OK. */
  children: (check: () => boolean) => React.ReactNode;
}) {
  const categories = useKnowledgeCategories();
  const [errors, setErrors] = useState<Errors>({});
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const set = <K extends keyof FormValues>(k: K, v: FormValues[K]) => {
    onChange({ ...values, [k]: v });
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const check = () => {
    const e = validate(values);
    setErrors(e);
    if (Object.keys(e).length) {
      setTab("edit");
      document.getElementById(`kb-${Object.keys(e)[0]}`)?.focus();
      return false;
    }
    return true;
  };
  const categoryName = categories.data?.find((c) => c.id === values.categoryId)?.name ?? null;

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
        <Link href="/knowledge-base" className="font-semibold text-primary hover:underline">
          Knowledge Base
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

      {/* Edit / Preview switch below lg; side by side above. */}
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
          className={cn("grid content-start gap-5 rounded-2xl border border-border bg-white p-5 sm:p-6", tab !== "edit" && "max-lg:hidden")}
          aria-busy={busy}
        >
          <FormField id="kb-categoryId" label="Category" error={errors.categoryId}>
            <select
              id="kb-categoryId"
              value={values.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
              aria-invalid={!!errors.categoryId}
              disabled={categories.isPending}
              className={cn(fieldBox, "h-12 cursor-pointer py-0")}
            >
              <option value="">{categories.isPending ? "Loading categories…" : "Choose a category"}</option>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField id="kb-title" label="Title" error={errors.title}>
            <Input
              id="kb-title"
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Earnest Money / Token Amount"
              maxLength={250}
              aria-invalid={!!errors.title}
            />
          </FormField>

          <div className="grid gap-2">
            <span id="kb-level-label" className="text-sm font-semibold">
              Level
            </span>
            <div role="radiogroup" aria-labelledby="kb-level-label" className="grid grid-cols-3 gap-2">
              {KNOWLEDGE_LEVELS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  role="radio"
                  aria-checked={values.level === l.value}
                  onClick={() => set("level", l.value)}
                  className={cn(
                    "h-10 cursor-pointer rounded-lg border text-sm font-semibold transition-colors",
                    values.level === l.value
                      ? "border-primary bg-accent text-accent-foreground"
                      : "border-input bg-field text-slate-600 hover:bg-secondary",
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <FormField id="kb-definition" label="Definition" error={errors.definition} hint="The precise meaning. Line breaks are kept.">
            <textarea
              id="kb-definition"
              value={values.definition}
              onChange={(e) => set("definition", e.target.value)}
              rows={6}
              aria-invalid={!!errors.definition}
              placeholder="An earnest money deposit is a sum paid by the buyer to the seller to show serious intent…"
              className={cn(fieldBox, "resize-y")}
            />
          </FormField>

          <FormField id="kb-simpleExplanation" label="In simple words (optional)" hint="A plain-language version for first-time buyers.">
            <textarea
              id="kb-simpleExplanation"
              value={values.simpleExplanation}
              onChange={(e) => set("simpleExplanation", e.target.value)}
              rows={4}
              placeholder="It's an advance you pay to 'book' the property while the paperwork is done."
              className={cn(fieldBox, "resize-y")}
            />
          </FormField>

          <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-wrap justify-end gap-2 rounded-b-2xl border-t border-border bg-white/95 px-5 py-4 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6">
            {children(check)}
          </div>
        </form>

        <section
          aria-label="Preview"
          className={cn("grid content-start gap-3", tab !== "preview" && "max-lg:hidden")}
        >
          <p className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-subtle-foreground uppercase">
            <Eye className="size-3.5" /> Preview — what users will see
          </p>
          <div className="rounded-2xl border border-dashed border-border bg-background p-4 sm:p-5 lg:sticky lg:top-24">
            <TopicContent
              as="h2"
              title={values.title.trim()}
              level={values.level}
              categoryName={categoryName}
              definition={values.definition.trim()}
              simpleExplanation={values.simpleExplanation.trim() || null}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
