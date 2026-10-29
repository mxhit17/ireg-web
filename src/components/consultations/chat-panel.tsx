"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AlertCircle, ArrowUp, CheckCheck, FileText, Loader2, Lock, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useChat } from "@/hooks/use-consultations";
import { bookingNotes } from "@/lib/consultation-local";
import { isApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import type { Consultation, ConsultationMessage } from "@/types/consultation";

type Viewer = "user" | "sme" | "admin";

const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
const dayFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

function dayLabel(d: Date) {
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return dayFmt.format(d);
}

/**
 * Figma "consultation-chat". Polls for new messages (no websocket yet), keeps the view pinned to
 * the bottom while you're there, and pages older messages in at the top.
 */
export function ChatPanel({
  consultation: c,
  viewer,
  meId,
  canSend,
  closedReason,
}: {
  consultation: Consultation;
  viewer: Viewer;
  meId: string | undefined;
  canSend: boolean;
  /** Shown in place of the composer when `canSend` is false. */
  closedReason: string;
}) {
  const chat = useChat(c.id, { enabled: true, meId });
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const atBottom = useRef(true);
  const restore = useRef<number | null>(null);
  const [draft, setDraft] = useState("");
  const [fromNote, setFromNote] = useState(false);
  const count = chat.messages.length;

  // The booking note ("doubts") pre-fills the first message for the client.
  useEffect(() => {
    if (viewer !== "user" || !canSend || chat.isPending || count > 0) return;
    const note = bookingNotes.get(c.id);
    if (note) {
      setDraft((d) => d || note);
      setFromNote(true);
    }
  }, [viewer, canSend, chat.isPending, count, c.id]);

  // Stay pinned to the newest message unless the reader scrolled up; keep position when older load.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (restore.current !== null) {
      el.scrollTop = el.scrollHeight - restore.current;
      restore.current = null;
    } else if (atBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [count]);

  // Grow the composer with its content (up to ~6 lines).
  useLayoutEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft]);

  async function loadOlder() {
    const el = scroller.current;
    if (el) restore.current = el.scrollHeight - el.scrollTop;
    await chat.loadOlder();
  }

  function submit() {
    const text = draft.trim();
    if (!text || chat.send.isPending) return;
    atBottom.current = true;
    chat.send.mutate(text, {
      onSuccess: () => {
        if (fromNote) bookingNotes.clear(c.id);
        setFromNote(false);
      },
      onError: () => setDraft(text),
    });
    setDraft("");
  }

  // Admins read the conversation with the expert on the right, the client on the left.
  const rightId = viewer === "admin" ? c.smeId : meId;
  const showNames = viewer === "admin";
  const lastMineIndex = chat.messages.findLastIndex((m) => m.senderId === meId && !m.pending);

  return (
    <section aria-label="Chat" className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-white">
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto bg-muted/60 px-3 py-4 sm:px-5"
        aria-live="polite"
        aria-busy={chat.isPending}
      >
        {chat.isPending ? (
          <div className="m-auto flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading messages…
          </div>
        ) : chat.isError ? (
          <div className="m-auto flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
            <AlertCircle className="size-6 text-destructive" />
            {isApiError(chat.error) ? chat.error.message : "Couldn't load messages."}
            <Button size="sm" variant="outline" onClick={() => chat.refetch()}>
              Try again
            </Button>
          </div>
        ) : count === 0 ? (
          <div className="m-auto flex max-w-xs flex-col items-center gap-2 text-center text-sm text-muted-foreground">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
              <MessageSquare className="size-6" />
            </span>
            <p className="font-semibold text-foreground">No messages yet</p>
            <p>
              {viewer === "user"
                ? `Your expert${c.sme?.name ? `, ${c.sme.name},` : ""} is ready. Send your question to start.`
                : viewer === "sme"
                  ? `Introduce yourself — ${c.user?.name ?? "your client"} is waiting for you.`
                  : "The client and expert haven't started chatting yet."}
            </p>
          </div>
        ) : (
          <>
            {chat.hasOlder && (
              <div className="mb-2 flex justify-center">
                <Button size="sm" variant="outline" onClick={loadOlder} disabled={chat.loadingOlder} className="bg-white">
                  {chat.loadingOlder && <Loader2 className="animate-spin" />}
                  Load earlier messages
                </Button>
              </div>
            )}
            {chat.messages.map((m, i) => (
              <MessageRow
                key={m.id}
                message={m}
                prev={chat.messages[i - 1]}
                right={m.senderId === rightId}
                showName={showNames || (m.senderId !== c.userId && m.senderId !== c.smeId)}
                seen={i === lastMineIndex && !!m.readAt}
              />
            ))}
          </>
        )}
      </div>

      {canSend ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="border-t border-border bg-white p-3"
        >
          {fromNote && draft && (
            <p className="mb-2 px-1 text-xs text-muted-foreground">Your question from booking — edit it if you like, then send.</p>
          )}
          <div className="flex items-end gap-2 rounded-xl border border-input bg-field py-1.5 pr-1.5 pl-4 focus-within:border-primary focus-within:bg-white focus-within:ring-[3px] focus-within:ring-primary/15">
            <label htmlFor="chat-input" className="sr-only">
              Message
            </label>
            <textarea
              id="chat-input"
              ref={input}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              maxLength={10000}
              placeholder="Write a message..."
              className="max-h-40 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-[15px] outline-none placeholder:text-subtle-foreground"
            />
            <Button type="submit" size="icon" disabled={!draft.trim() || chat.send.isPending} aria-label="Send message" className="size-9 rounded-lg">
              {chat.send.isPending ? <Loader2 className="animate-spin" /> : <ArrowUp />}
            </Button>
          </div>
          <p className="mt-1.5 hidden px-1 text-[11px] text-subtle-foreground sm:block">Enter to send · Shift + Enter for a new line</p>
        </form>
      ) : (
        <p className="flex items-center justify-center gap-2 border-t border-border bg-white px-4 py-3.5 text-center text-sm text-muted-foreground">
          <Lock className="size-4 shrink-0" /> {closedReason}
        </p>
      )}
    </section>
  );
}

function MessageRow({
  message: m,
  prev,
  right,
  showName,
  seen,
}: {
  message: ConsultationMessage;
  prev: ConsultationMessage | undefined;
  right: boolean;
  showName: boolean;
  seen: boolean;
}) {
  const at = new Date(m.createdAt);
  const prevAt = prev ? new Date(prev.createdAt) : null;
  const newDay = !prevAt || prevAt.toDateString() !== at.toDateString();
  // A time stamp (Figma "16:22") above each burst: new day, 15+ minutes apart, or sender change.
  const stamp = newDay || !prevAt || at.getTime() - prevAt.getTime() > 15 * 60_000;
  const grouped = !stamp && prev?.senderId === m.senderId;

  return (
    <>
      {stamp && (
        <p className="my-2 text-center text-xs font-medium text-subtle-foreground">
          {newDay ? `${dayLabel(at)} · ` : ""}
          {timeFmt.format(at)}
        </p>
      )}
      {m.type === "SYSTEM" ? (
        <p className="mx-auto my-1 max-w-md rounded-full bg-white px-3 py-1 text-center text-xs text-muted-foreground ring-1 ring-border">
          {m.content}
        </p>
      ) : (
        <div className={cn("flex flex-col", right ? "items-end" : "items-start", grouped ? "mt-0.5" : "mt-2")}>
          {showName && !grouped && m.senderName && (
            <span className="mb-0.5 px-2 text-[11px] font-semibold text-muted-foreground">{m.senderName}</span>
          )}
          <div
            title={timeFmt.format(at)}
            className={cn(
              "max-w-[85%] rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed break-words whitespace-pre-wrap shadow-xs sm:max-w-[70%]",
              right ? "rounded-br-md bg-primary text-white" : "rounded-bl-md bg-white text-foreground ring-1 ring-border",
              m.pending && "opacity-60",
            )}
          >
            {m.content}
            {m.attachmentUrl && /^https?:\/\//i.test(m.attachmentUrl) && (
              <a
                href={m.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn("mt-1 flex items-center gap-1.5 font-semibold underline", right ? "text-white" : "text-primary")}
              >
                <FileText className="size-4" /> {m.type === "IMAGE" ? "View image" : "Open attachment"}
              </a>
            )}
          </div>
          {m.pending && <span className="px-2 text-[11px] text-subtle-foreground">Sending…</span>}
          {seen && (
            <span className="flex items-center gap-1 px-2 text-[11px] text-subtle-foreground">
              <CheckCheck className="size-3.5 text-primary" /> Seen
            </span>
          )}
        </div>
      )}
    </>
  );
}
