"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertCircle, Loader2, SearchX } from "lucide-react";

import { ProjectCard, ProjectCardSkeleton } from "@/components/projects/project-card";
import { Button } from "@/components/ui/button";
import { useInView } from "@/hooks/use-in-view";
import { useProjectSearch } from "@/hooks/use-projects";
import { isApiError } from "@/lib/api/errors";

/** Shared responsive grid for thread cards (1 → 2 → 3 columns). */
export function ProjectGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

export function FeedState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-white px-6 py-14 text-center">
      {icon}
      <p className="text-lg font-bold">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Search results for `q` (GET projects/search) with infinite scroll. */
export function ProjectSearchResults({ q, onClear }: { q: string; onClear: () => void }) {
  const query = useProjectSearch({ q });
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  const { ref: sentinelRef, inView: nearEnd } = useInView<HTMLDivElement>({ rootMargin: "600px", once: false });
  const { hasNextPage, isFetchingNextPage, fetchNextPage, isError } = query;
  useEffect(() => {
    if (nearEnd && hasNextPage && !isFetchingNextPage && !isError) fetchNextPage();
  }, [nearEnd, hasNextPage, isFetchingNextPage, isError, fetchNextPage]);

  if (query.isPending) {
    return (
      <ProjectGrid>
        {Array.from({ length: 6 }, (_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </ProjectGrid>
    );
  }

  if (query.isError && items.length === 0) {
    return (
      <FeedState
        icon={<AlertCircle className="size-8 text-destructive" />}
        title="Search failed"
        body={isApiError(query.error) ? query.error.message : "Please check your connection and try again."}
        action={
          <Button onClick={() => query.refetch()} disabled={query.isFetching}>
            {query.isFetching && <Loader2 className="animate-spin" />}
            Try again
          </Button>
        }
      />
    );
  }

  if (items.length === 0) {
    return (
      <FeedState
        icon={<SearchX className="size-8 text-subtle-foreground" />}
        title={`No projects match “${q}”`}
        body="Try a project name, a locality like “Whitefield”, or a city. Still missing? Ask us to add it."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={onClear}>
              Back to home
            </Button>
            <Button asChild>
              <Link href="/projects/new">Create Project</Link>
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <>
      <ProjectGrid>
        {items.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
        {isFetchingNextPage && Array.from({ length: 3 }, (_, i) => <ProjectCardSkeleton key={`more-${i}`} />)}
      </ProjectGrid>
      <div ref={sentinelRef} className="flex min-h-12 items-center justify-center">
        {isError ? (
          <Button variant="outline" onClick={() => fetchNextPage()}>
            Couldn&apos;t load more — try again
          </Button>
        ) : hasNextPage ? (
          !isFetchingNextPage && (
            <Button variant="outline" onClick={() => fetchNextPage()}>
              Load more results
            </Button>
          )
        ) : (
          <p className="text-sm text-subtle-foreground">That&apos;s every match.</p>
        )}
      </div>
    </>
  );
}
