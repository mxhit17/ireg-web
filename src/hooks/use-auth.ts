"use client";

import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { api, postLocal, refreshSession } from "@/lib/api/client";
import { LOGIN_ROUTE, safeNextPath } from "@/lib/auth/constants";
import { tokenStore } from "@/lib/auth/token-store";
import type {
  LoginInput,
  RegisterInput,
  Session,
  SessionResponse,
  User,
  VerifyOtpInput,
  VerifyOtpResponse,
} from "@/types/auth";

/**
 * The current session. `data` is `{ user }` when signed in, `null` when signed out.
 * On first mount it restores the session from the httpOnly refresh cookie — this is
 * what makes login persist across reloads and browser restarts.
 */
export const sessionQuery = queryOptions({
  queryKey: ["auth", "session"] as const,
  queryFn: async (): Promise<Session | null> => {
    const result = await refreshSession();
    if (result.status !== "authenticated" || !result.user) return null;
    return { user: result.user };
  },
  staleTime: Infinity,
  gcTime: Infinity,
  refetchOnWindowFocus: false,
  retry: 1,
});

export const authKeys = {
  session: sessionQuery.queryKey,
};

/** Replace (or clear) the signed-in user everywhere the session is read. */
export function setSessionUser(queryClient: QueryClient, user: User | null) {
  const next: Session | null = user ? { user } : null;
  queryClient.setQueryData(sessionQuery.queryKey, () => next);
}

/** Merge fields into the signed-in user (e.g. after a profile edit) without refetching. */
export function patchSessionUser(queryClient: QueryClient, patch: Partial<User>) {
  queryClient.setQueryData(sessionQuery.queryKey, (old) =>
    old ? { user: { ...old.user, ...patch } } : old,
  );
}

export function useSession() {
  return useQuery(sessionQuery);
}

export function useCurrentUser() {
  return useSession().data?.user ?? null;
}

export function useLogin(next?: string | null) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: LoginInput) => postLocal<SessionResponse>("/api/session/login", input),
    onSuccess: (data) => {
      tokenStore.set(data.accessToken);
      if (data.user) setSessionUser(queryClient, data.user);
      else queryClient.invalidateQueries({ queryKey: sessionQuery.queryKey });
      toast.success(data.user?.name ? `Welcome back, ${data.user.name.split(" ")[0]}!` : "Welcome back!");
      router.replace(safeNextPath(next));
      router.refresh();
    },
  });
}

export function useRegister() {
  const router = useRouter();

  return useMutation({
    mutationFn: (input: RegisterInput) =>
      api.post<unknown>(
        "auth/register",
        { ...input, email: input.email.trim().toLowerCase(), name: input.name.trim() },
        { auth: false },
      ),
    onSuccess: (_data, input) => {
      toast.success("Account created! We've emailed you a verification code.");
      router.push(`/verify-otp?email=${encodeURIComponent(input.email.trim().toLowerCase())}`);
    },
  });
}

export function useVerifyOtp() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: VerifyOtpInput) => postLocal<VerifyOtpResponse>("/api/session/verify-otp", input),
    onSuccess: (data, input) => {
      if (data.accessToken && data.user) {
        tokenStore.set(data.accessToken);
        setSessionUser(queryClient, data.user);
        toast.success("Email verified — welcome to IREG!");
        router.replace("/");
        router.refresh();
        return;
      }
      toast.success("Email verified! Sign in to continue.");
      router.replace(`${LOGIN_ROUTE}?email=${encodeURIComponent(input.email)}&verified=1`);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => postLocal<{ ok: true }>("/api/session/logout"),
    onSettled: () => {
      tokenStore.clear();
      queryClient.clear();
      setSessionUser(queryClient, null);
      router.replace(LOGIN_ROUTE);
      router.refresh();
    },
  });
}
