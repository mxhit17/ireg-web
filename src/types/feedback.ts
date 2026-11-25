/** "How likely are you to recommend us?" — 1 (not likely) to 10 (very likely). */
export const FEEDBACK_MIN_RATING = 1;
export const FEEDBACK_MAX_RATING = 10;
export const FEEDBACK_MESSAGE_MAX = 2000;

export interface Feedback {
  id: string;
  rating: number;
  message: string | null;
  createdAt: string;
}

export interface FeedbackInput {
  rating: number;
  message: string;
}

/** GET feedback/me */
export interface MyFeedback {
  latest: Feedback | null;
  totalSubmitted: number;
}

export interface FeedbackAuthor {
  id: string;
  name: string | null;
  email: string | null;
  profileImageUrl: string | null;
}

export interface AdminFeedback extends Feedback {
  user: FeedbackAuthor | null;
}

/** Summary over all feedback (not just the current filter). NPS buckets: 9–10 / 7–8 / 1–6. */
export interface FeedbackSummary {
  totalResponses: number;
  averageRating: number | null;
  /** −100 … 100; null when there's no feedback yet. */
  npsScore: number | null;
  promoters: number;
  passives: number;
  detractors: number;
  /** rating (1–10) → count */
  distribution: Record<number, number>;
}

export interface FeedbackFilters {
  minRating?: number;
  maxRating?: number;
  hasMessage?: boolean;
  sortBy?: "newest" | "oldest";
}

export interface AdminFeedbackPage {
  items: AdminFeedback[];
  summary: FeedbackSummary;
  page: number;
  totalItems: number;
  hasNextPage: boolean;
}
