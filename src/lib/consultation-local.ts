import { createSnapshotStore } from "@/lib/local-snapshots";
import type { Consultation } from "@/types/consultation";

/**
 * The booking note ("Write in brief about your doubts") has no field in the API yet, and chat only
 * opens once an expert is assigned — so the note waits here and pre-fills the first chat message.
 */
const NOTES_KEY = "ireg_consultation_notes";

function readNotes(): Record<string, string> {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    const v = raw ? JSON.parse(raw) : {};
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

export const bookingNotes = {
  get: (consultationId: string): string | null => readNotes()[consultationId] ?? null,
  set(consultationId: string, note: string) {
    try {
      const all = readNotes();
      if (note.trim()) all[consultationId] = note.trim();
      else delete all[consultationId];
      localStorage.setItem(NOTES_KEY, JSON.stringify(all));
    } catch {
      /* storage unavailable — the note just won't be pre-filled */
    }
  },
  clear(consultationId: string) {
    bookingNotes.set(consultationId, "");
  },
};

/**
 * Consultations an SME or admin opened recently. Stopgap while the backend has no endpoint listing
 * an SME's assignments or all consultations for admins (see README).
 */
export const recentConsultations = createSnapshotStore<Consultation>("ireg_recent_consultations", () => true, 20);
