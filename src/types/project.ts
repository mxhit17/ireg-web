/** Enums from the Prisma schema (src/generated/prisma/enums.ts in the backend). */
export type ProjectStatus = "UPCOMING" | "ONGOING" | "COMPLETED" | "SOLD_OUT" | "UNKNOWN";
export type ProjectType =
  | "APARTMENT"
  | "VILLA"
  | "PLOT"
  | "BUILDER_FLOOR"
  | "COMMERCIAL"
  | "TOWNSHIP"
  | "OTHER";

export type RatingCategoryCode =
  | "LOCATION_CONNECTIVITY"
  | "AMENITIES_FACILITIES"
  | "SURROUNDING_ENVIRONMENT"
  | "CONSTRUCTION_QUALITY"
  | "SIZE_LAYOUTS";

/**
 * A project as shown in lists. Normalised from both `popularity/popular` (snake_case + builder_name +
 * images[].imageUrl) and `projects/search` (project_images[].image_url, no builder).
 */
export interface ProjectSummary {
  id: string;
  name: string;
  slug: string | null;
  builderName: string | null;
  type: ProjectType | null;
  status: ProjectStatus | null;
  location: string | null;
  locality: string | null;
  city: string | null;
  state: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  currency: string;
  imageUrl: string | null;
  /** Only present for popular projects (30-day activity from project_stats). */
  stats?: {
    views30d: number;
    saves30d: number;
    comments30d: number;
  };
}

/** Item of GET user-and-admin-management/users/me/saved-projects (no images/location in this API). */
export interface SavedProject {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  type: ProjectType | null;
  savedAt: string | null;
}

/** GET projects/:id/ratings */
export interface ProjectRatings {
  project_id: string;
  overall_rating: number | null;
  total_ratings: number;
  categories: {
    code: RatingCategoryCode;
    name: string;
    average_rating: number | null;
    total_ratings: number;
  }[];
}

export interface CommentAuthor {
  id: string;
  name: string;
}

export type CommentReaction = "LIKE" | "DISLIKE" | null;

/** Top-level comment (GET projects/:id/comments) or reply (GET comments/:id/replies), normalised. */
export interface ProjectComment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: CommentAuthor | null;
  userId: string | null;
  replyCount: number;
  parentId: string | null;
  /** null = the API didn't send counts (it doesn't yet). */
  likeCount: number | null;
  dislikeCount: number | null;
  myReaction: CommentReaction;
}

/** The 5 rating categories, in display order (labels match the Figma rating sheet). */
export const RATING_CATEGORIES: { code: RatingCategoryCode; label: string }[] = [
  { code: "LOCATION_CONNECTIVITY", label: "Location & Connectivity" },
  { code: "AMENITIES_FACILITIES", label: "Amenities & Facilities" },
  { code: "SURROUNDING_ENVIRONMENT", label: "Surrounding & Environment" },
  { code: "CONSTRUCTION_QUALITY", label: "Construction Quality" },
  { code: "SIZE_LAYOUTS", label: "Size and Layouts" },
];

/** GET projects/:id/my-rating, normalised. */
export interface MyRating {
  overall: number | null;
  scores: Partial<Record<RatingCategoryCode, number | null>>;
}

export interface TopDiscussion {
  comment: ProjectComment;
  /** First reply, when the comment has any (Figma shows one nested reply on the card). */
  reply: ProjectComment | null;
}

export interface TopDiscussions {
  items: TopDiscussion[];
  total: number;
}
