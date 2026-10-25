export type UserRole = "USER" | "ADMIN" | (string & {});

/**
 * Session/profile user. Built from `user-and-admin-management/profile` (name, photo, dates)
 * merged with `auth/me` (roles). Extra backend fields are kept loose on purpose.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  roles?: UserRole[];
  phone?: string | null;
  profile_image_url?: string | null;
  is_verified?: boolean;
  status?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface Session {
  user: User;
}

export interface LoginInput {
  email: string;
  password: string;
  remember: boolean;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface VerifyOtpInput {
  email: string;
  otp: string;
}

/** Shape our own `/api/session/*` route handlers return to the browser. */
export interface SessionResponse {
  accessToken: string;
  user: User | null;
}

export interface VerifyOtpResponse {
  verified: true;
  message?: string;
  accessToken?: string;
  user?: User | null;
}
