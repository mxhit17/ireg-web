"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { FormAlert, FormField } from "@/components/auth/form-field";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "@/hooks/use-auth";
import { isApiError } from "@/lib/api/errors";
import { loginSchema, type LoginValues } from "@/lib/validation/auth";

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next");
  const justVerified = params.get("verified") === "1";
  const login = useLogin(next);

  const {
    register,
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: params.get("email") ?? "", password: "", remember: true },
  });

  const onSubmit = handleSubmit((values) => login.mutate(values));

  const errorMessage = login.error
    ? isApiError(login.error)
      ? login.error.message
      : "Something went wrong. Please try again."
    : null;
  const needsVerification = !!errorMessage && /verif/i.test(errorMessage);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[1.75rem] leading-tight font-extrabold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Sign in to join the discussion, rate projects and keep your saved list.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="grid gap-5">
        {justVerified && !errorMessage && (
          <FormAlert tone="success">Your email is verified. Sign in to get started.</FormAlert>
        )}
        {errorMessage && (
          <FormAlert>
            {errorMessage}
            {needsVerification && (
              <>
                {" "}
                <Link
                  href={`/verify-otp?email=${encodeURIComponent(getValues("email"))}`}
                  className="font-semibold underline underline-offset-2"
                >
                  Verify your email
                </Link>
              </>
            )}
          </FormAlert>
        )}

        <FormField id="email" label="Email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            autoFocus={!params.get("email")}
            {...register("email")}
          />
        </FormField>

        <FormField id="password" label="Password" error={errors.password?.message}>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            autoFocus={!!params.get("email")}
            {...register("password")}
          />
        </FormField>

        <div className="flex items-center gap-2.5">
          <Controller
            control={control}
            name="remember"
            render={({ field }) => (
              <Checkbox
                id="remember"
                checked={field.value}
                onCheckedChange={(v) => field.onChange(v === true)}
              />
            )}
          />
          <Label htmlFor="remember" className="cursor-pointer font-medium text-muted-foreground">
            Keep me signed in
          </Label>
        </div>

        <Button type="submit" size="lg" className="mt-1 w-full" disabled={login.isPending}>
          {login.isPending && <Loader2 className="animate-spin" />}
          {login.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-8 text-center text-[15px] text-muted-foreground">
        New to IREG?{" "}
        <Link
          href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
          className="font-bold text-primary hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
