# IREG Web — Indian Real Estate Guide

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · TanStack Query v5

## Getting started

```bash
cp .env.example .env.local   # points at the deployed Railway API by default
npm install
npm run dev                  # http://localhost:3000
```

Running the NestJS backend locally on port 3000 too? Start the web app on another port
(`npm run dev -- -p 3001`) and set `IREG_API_URL=http://localhost:3000/api` in `.env.local`.

## How auth works

```
Browser ──/api/session/*──▶ Next.js route handlers ──▶ NestJS  auth/login · auth/refresh · auth/verify-otp · auth/me
Browser ──/backend/*──────▶ Next.js rewrite ─────────▶ NestJS  (every other API call)
```

- **Refresh token** → `ireg_rt` **httpOnly** cookie, set by our route handlers. JavaScript can never read it.
- **Access token** → kept **in memory only** (`src/lib/auth/token-store.ts`), never in localStorage.
- **Persistent login**: on every page load `useSession()` calls `/api/session/refresh`, which swaps the
  cookie for a fresh access token + the user. "Keep me signed in" ⇒ 30-day sliding cookie; unticked ⇒
  session cookie that ends when the browser closes.
- **Auto refresh**: `api.*` (`src/lib/api/client.ts`) retries once after a 401 using a single-flight
  refresh (safe with rotating refresh tokens). If the refresh fails on a members-only page, the user is
  sent to `/login?next=…`.
- **Public browsing**: visitors without an account land on Threads & Search, with **Log in** / **Sign up**
  at the top right (and "Log in" in place of Profile in the mobile tab bar). They can read project
  pages, ratings and discussions, the Knowledge Base, blogs and the consultation services. Saving,
  rating, commenting, reacting, replying and booking send them to `/login?next=<page>` (with a short
  toast) so they come straight back — see `useRequireLogin()` in `src/hooks/use-auth.ts`.
  Logging out also lands on Threads & Search, and the login screens have "Continue without logging in".
- **Route guard**: `src/middleware.ts` (and `AuthGate` on the client) let anyone open the pages matched
  by `isPublicPath()` in `src/lib/auth/constants.ts`; every other page sends signed-out visitors to
  `/login?next=…`. Signed-in users are sent away from `/login`, `/signup`, `/verify-otp`. To make a new
  page public, add a pattern there.
- Signed-out visitors don't retry the session refresh on every request: after one failed refresh the
  client remembers it (`tokenStore.markSignedOut()`) until the next login. Queries that only make sense
  when signed in (saved projects, my rating, my consultations) are disabled for them.
- **Signup flow**: `/signup` → `POST auth/register` → `/verify-otp?email=…` → `POST auth/verify-otp`.
  If verification returns tokens the user is signed straight in; otherwise they land on `/login` with
  their email prefilled.

## Profile (`/profile`)

- `GET  user-and-admin-management/profile` → `useProfile()`
- `PATCH user-and-admin-management/profile` `{ name }` → `useUpdateProfile()`
- `PATCH user-and-admin-management/profile/photo` (multipart `file`) → `useUploadProfilePhoto()`

Photos are checked in the browser (JPG/PNG/WebP, ≤ 10 MB), downscaled to ≤ 1024 px, then uploaded.
The new photo appears instantly (optimistic) and is rolled back if the upload fails. Name/photo
changes are mirrored into the session user so the header updates without a refetch.
Response shapes are normalised in `src/lib/api/normalize.ts` (e.g. the photo may come back as
`profile_image_url`, `avatar_url`, …) — tighten it once the backend DTOs are final.

## Navigation

The Figma bottom navigation is a top tab bar on the web (`src/components/layout/app-nav.tsx`):
Threads & Search (`/`), Knowledge Base, Blogs, Consultation, Profile. Desktop shows the first four
inline in the header with the avatar for Profile; below `lg` all five sit under the app bar.
Knowledge Base, Blogs and Consultation are "coming soon" pages for now.

## Home / threads (`/`)

- `GET home?page&limit` (with the bearer token) → `useHome()` — 6 per page. One page returns both
  **Recently added** (saved projects excluded) and **Popular** (saved + that page's recent excluded);
  "Show more" on either section loads the next page. Cards are de-duplicated across pages.
- **Your saved projects** rail: `GET user-and-admin-management/users/me/saved-projects` →
  `useSavedProjects()`; each tile lazily loads `GET projects/:id` for its photo/location.
- Save/unsave on every card: `PUT|DELETE projects/:id/save` → `useToggleSave()` (optimistic).
- `?q=` in the URL switches to `GET projects/search` → `useProjectSearch()`.
- Each card lazily (when scrolled near) loads `GET projects/:id/ratings` (overall rating) and
  `GET projects/:id/comments?limit=2` + the first reply via `GET comments/:id/replies?limit=1`
  ("Top discussions", as in the Figma thread card).
- `/projects/[id]` is an interim page (header + rating breakdown); the full project view is next.

## Project page (`/projects/[id]`)

Web version of the Figma `project-view`: builder + name, location + stars, photo, **Save / Share / Rate**,
the "Start writing something" box and **Discussions**. Desktop adds a sticky sidebar with the rating
breakdown and project details (on mobile it sits after the discussions).

| Feature | API |
|---|---|
| Project | `GET projects/:id` |
| Overall + per-category rating | `GET projects/:id/ratings` |
| Rate dialog (pre-filled) | `GET projects/:id/my-rating`, `POST projects/:id/ratings` (all 5 required) |
| Discussions (10/page, newest/oldest) | `GET projects/:id/comments` |
| Replies (5/page, nested) | `GET comments/:id/replies` |
| Comment / reply | `POST projects/:id/comments` (`parentCommentId` for replies) |
| Delete (author or admin) | `DELETE comments/:id` |
| Like / dislike / clear | `PUT comments/:id/reaction` |
| Save | `PUT|DELETE projects/:id/save` |
| View tracking | `POST projects/:id/view` with a persistent `visitorId` (localStorage) |

Share uses the native share sheet when available, otherwise copies the link.

### Backend follow-up: reaction counts

The comment list endpoints don't return like/dislike counts or the caller's own reaction, so the UI
shows 👍/👎 without numbers and only remembers reactions made in the current session. The frontend
already reads `likeCount`, `dislikeCount` and `myReaction` if present (`toComment()` in
`src/lib/api/projects.ts`). In `getProjectComments` / `listReplies`, after fetching the page:

```ts
const ids = comments.map((c) => c.id);
const counts = await this.prisma.comment_reactions.groupBy({
  by: ['comment_id', 'reaction_type'],
  where: { comment_id: { in: ids } },
  _count: { _all: true },
});
const mine = userId
  ? await this.prisma.comment_reactions.findMany({
      where: { comment_id: { in: ids }, user_id: userId },
      select: { comment_id: true, reaction_type: true },
    })
  : [];
// per comment: likeCount, dislikeCount, myReaction (LIKE | DISLIKE | null)
```

…and add `@UseGuards(OptionalJwtAuthGuard)` to both GET routes so `userId` is available.
Adding `profile_image_url` to the `users` select would also let comments show real avatars.

## Project requests

Users can't create projects directly — they send a request that an admin reviews (Figma
`create-project-screen` → `project-verification-screen`).

| Screen | Route | API |
|---|---|---|
| "+ Create Project" floating button on Threads | `/` | — |
| Request form: photo, Builder Name, Project Name, Project Address → **Send Request** | `/projects/new` | `POST projects/requests` (multipart: `builder_name`, `name`, `location`, `file`) |
| My requests + status / rejection reason | `/projects/requests` | `GET projects/requests/mine` |
| Admin queue (also a banner on Threads + link in the profile menu) | `/admin/project-requests` | `GET projects/requests` |
| Admin review: **Reject** (reason emailed), **Verify** (duplicate search), **Approve Project** | `/admin/project-requests/[id]` | `POST …/:id/reject` `{ reason }`, `GET projects/search`, `POST …/:id/approve` |

The form also warns about possible duplicates while the user types the project name. Photos are
downscaled to ≤ 1600 px in the browser before upload. There's no "get request by id" endpoint, so the
review page reads the request from the pending list.

## Knowledge Base (`/knowledge-base`)

Everyone can read; only ADMINs see the write tools (the API enforces the role too).

| Screen | Route | API |
|---|---|---|
| Categories + search (Figma `knowledge-base-list`) | `/knowledge-base?q=` | `GET knowledge/categories`, `GET knowledge/topics/search?q` |
| Topics in a category, level filter (Figma `knowledge-base-sublist`) | `/knowledge-base/[category]` | `GET knowledge/categories/:slug/topics` |
| Topic: level/tags, "Important" disclaimer, Definition, In simple words (Figma `knowledge-base-info-screen`) + prev/next and "More in…" | `/knowledge-base/[category]/[topic]` | `GET knowledge/topics/:slug` |
| Admin: **New category** dialog (home page) | — | `POST admin/knowledge/categories` |
| Admin: new topic — Save as draft / Publish, live preview | `/knowledge-base/manage/new?category=<id>` | `POST admin/knowledge/topics` |
| Admin: edit topic — Save, Publish, Move to drafts | `/knowledge-base/manage/[id]?slug=` | `PATCH admin/knowledge/topics/:id`, `POST …/:id/publish` |

Categories have no image in the API, so the Figma thumbnail is a tinted icon picked from the
category name (`category-icon.tsx`).

### Backend follow-ups

- **No way to list drafts.** Public reads return PUBLISHED only and there's no admin read, so drafts
  saved from a browser are remembered in `localStorage` (`src/lib/knowledge-drafts.ts`) and listed as
  "Your drafts" on the home page — other admins/browsers won't see them. Adding
  `GET admin/knowledge/topics?status=DRAFT` (and `GET admin/knowledge/topics/:id`) would remove this.
- **Categories can only be created**, not renamed, reordered or deleted — add
  `PATCH/DELETE admin/knowledge/categories/:id` and the UI can grow an edit dialog.
- Topic slugs are unique per category, but `GET knowledge/topics/:slug` uses `findFirst`, so two
  categories with the same topic title can collide.
- A category whose slug is `manage` would be shadowed by the admin editor route.

## Blogs (`/blogs`)

Everyone can read; only ADMINs see the write tools (the API enforces the role too).

| Screen | Route | API |
|---|---|---|
| Blog list: newest post featured, cover cards with "• 5 min read", search (Figma `blog-list`) | `/blogs?q=` | `GET blogs` |
| Article: title, cover, "Source · Published" row, body, share, more blogs (Figma `blog-view`) | `/blogs/[slug]` | `GET blogs/:slug` |
| Admin: create — cover photo, title, summary, body, source + link → **Save as draft** / **Post** (Figma `create-blog-screen`) | `/blogs/manage/new` | `POST admin/blogs` (multipart, `cover_image`), then `POST admin/blogs/:id/publish` |
| Admin: edit — Save, Post (drafts), Delete | `/blogs/manage/[id]?slug=` | `PATCH admin/blogs/:id`, `POST …/:id/publish`, `DELETE admin/blogs/:id` |

Admins get a "Create Blog" floating button on phones (as in Figma) and a header button on wider screens.
Search runs in the browser because `GET blogs` returns every published blog in one list. The body is
plain text: a blank line starts a new paragraph. Covers are downscaled to ≤ 1920 px before upload.
Edits send text changes as JSON (so optional fields can be cleared with `null`) and a new cover as a
separate file-only multipart PATCH.

### Backend follow-ups

- **No way to list drafts** (same as the Knowledge Base): drafts saved from a browser are remembered
  in `localStorage` (`src/lib/blog-drafts.ts`, built on `src/lib/local-snapshots.ts`). Add
  `GET admin/blogs?status=DRAFT` and `GET admin/blogs/:id` to replace this.
- **No unpublish** — `PATCH` doesn't accept `status`, so a published blog can only be edited or deleted.
- **No pagination** on `GET blogs`; add `limit/offset` (and `q`) once there are many posts.
- `DELETE` is a soft delete but also removes the cover from Cloudinary, so a restore would lose the image.
- A blog titled "Manage" would get the slug `manage`, which is shadowed by the editor route.

## Consultations (`/consultations`)

| Who | Screen | Route | API |
|---|---|---|---|
| Everyone | Services (Figma `consultations-home` / `consultations-offered`) + "Ongoing consultations" | `/consultations` | `GET consultation-services`, `GET consultations/me` |
| User | Book: question box, mobile number if missing, **Pay ₹500** (Figma `book-consultation`) | `/consultations/book/[serviceId]` | `POST consultations`, `POST consultations/:id/payment` → Cashfree checkout |
| User | Back from Cashfree: confirms the payment | `/consultations/payment-return?consultation_id=` | `GET consultations/:id/payment-status` (polled) |
| User / SME / Admin | Consultation: status, progress, chat-window countdown, chat (Figma `consultation-chat`) | `/consultations/[id]` | `GET consultations/:id`, `GET/POST …/messages`, `PATCH …/messages/read` |
| SME | "Your clients" on the Consultation tab: Ongoing / Completed | `/consultations` | `GET sme/consultations/ongoing`, `GET sme/consultations/completed` |
| Admin | Queue — **In progress** (filters: Needs an expert / Assigned / Ongoing; assign inline) and **Completed** | `/admin/consultations` | `GET admin/consultations`, `GET admin/consultations/completed` |
| Admin | Expert picker (queue + consultation page) | — | `GET admin/consultations/smes` |
| Admin | Assign / reassign expert, Mark as complete (on the consultation page) | `/consultations/[id]` | `POST admin/consultations/:id/assign` `{ sme_id }`, `POST …/:id/complete` |

The admin and SME lists are paginated (`?page&limit`, `{ data, meta }`); the screens load 30 at a
time with **Load more** and show `meta.totalItems` on the tabs. Unassigned (PAID) consultations are
highlighted with how long ago they were paid, turning amber after 24 h and red after 48 h.

How it behaves:

- **Payment** uses Cashfree's hosted checkout (their JS SDK v3 is loaded from `sdk.cashfree.com` only
  when the user pays — no npm package). Set the backend's `CASHFREE_RETURN_URL` to
  `<web origin>/consultations/payment-return` (e.g. `http://localhost:3000/consultations/payment-return`).
  The app sends that as `return_url` and retries without it if the backend rejects the origin.
- Cashfree needs the buyer's **mobile number**: the booking page asks for it when the profile has none
  and saves it to the profile (`PATCH profile { phone }`). The profile form now has a phone field too.
- The booking note ("Write in brief about your doubts") has no API field, and chat only opens once an
  expert is assigned, so it's kept in the browser and pre-fills the client's first message.
- **Chat** polls the newest 50 messages every 5 s while the tab is visible, pages older ones with
  `before`, sends optimistically, and marks the other side's messages read ("Seen"). Only text is
  supported — there's no upload endpoint for `IMAGE`/`DOCUMENT` attachments yet (they display if present).
- The chat window is `expires_at`, or `started_at + duration_days` (7) when that's empty; the composer
  closes after it. Admins can read every chat but don't reply. The page re-checks every 20 s while
  waiting for payment confirmation or an expert.
- Roles: the client sees the expert's name, the expert sees the client's, admins see both plus the
  reference ID. An admin who is also the client/expert of a consultation gets the participant view
  with the admin tools still available.

### Backend follow-ups (consultations)

1. **`GET sme/consultations/ongoing` returns only `ONGOING`.** A new assignment is `ASSIGNED` until the
   first message, so the expert can't see it in their list and can only open it from a shared link
   (there's an "Open it from its link" box under the list). Including `ASSIGNED` fixes this:
   `status: { in: [consultation_status.ASSIGNED, consultation_status.ONGOING] }` — the UI already
   handles both.
2. `expires_at` is never set and nothing expires consultations or notifies the other party on new
   messages ("a notification will go to the receiver"). Polling covers the open page only.
3. `CreateConsultationDto` has no field for the booking note.
4. No upload endpoint for `IMAGE`/`DOCUMENT` chat messages.

## Session user

`auth/me` only returns `{ id, email, roles }`, so the session routes merge it with
`user-and-admin-management/profile` (name, photo…) — see `fetchSessionUser()` in `src/lib/api/backend.ts`.
Roles are normalised to `user.roles: string[]`; use `isAdmin(user)` from `src/lib/api/normalize.ts`.

## Calling the API from new features

```ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

const projects = useQuery({
  queryKey: ["projects", { page }],
  queryFn: () => api.get("projects/search", { query: { page, limit: 20 } }),
});
```

## Structure

```
src/
  app/
    (auth)/login | signup | verify-otp   auth pages (split-screen layout)
    (app)/                               signed-in area (AuthGate + header)
    api/session/*                        login / refresh / verify-otp / logout handlers
  components/ui/                         shadcn/ui components (themed to the Figma tokens)
  components/auth/                       auth forms, shell, gate
  hooks/use-auth.ts                      useSession, useLogin, useRegister, useVerifyOtp, useLogout
  lib/api/                               browser client, server backend helper, error parsing
  lib/auth/                              cookie names, route lists, token store
  middleware.ts                          route guard
```

Design tokens (from the Figma mobile file) live in `src/app/globals.css`: primary `#0284c7`,
text `#0f172a`, borders `#e2e8f0`, inputs `#f8f9fa` / `#d9d9d9`, font Figtree.
# ireg-web
