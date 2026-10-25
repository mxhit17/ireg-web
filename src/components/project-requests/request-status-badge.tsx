import { CheckCircle2, Clock, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { RequestStatus } from "@/types/project-request";

const STYLES: Record<RequestStatus, { label: string; className: string; Icon: typeof Clock }> = {
  PENDING: { label: "In review", className: "bg-amber-50 text-amber-800 ring-amber-200", Icon: Clock },
  APPROVED: { label: "Approved", className: "bg-green-50 text-green-800 ring-green-200", Icon: CheckCircle2 },
  REJECTED: { label: "Rejected", className: "bg-red-50 text-red-700 ring-red-200", Icon: XCircle },
};

export function RequestStatusBadge({ status, className }: { status: RequestStatus; className?: string }) {
  const { label, className: c, Icon } = STYLES[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset", c, className)}>
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}
