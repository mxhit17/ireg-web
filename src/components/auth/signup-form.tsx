"use client";

import Link from "next/link";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2 } from "lucide-react";

import { FormAlert, FormField } from "@/components/auth/form-field";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegister } from "@/hooks/use-auth";
import { isApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import { signupSchema, type SignupValues } from "@/lib/validation/auth";

export function SignupForm() {
  const registerUser = useRegister();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "", acceptTerms: false },
  });

  const password = useWatch({ control, name: "password" }) ?? "";

  const onSubmit = handleSubmit(({ name, email, password }) =>
    registerUser.mutate({ name, email, password }),
  );

  const errorMessage = registerUser.error
    ? isApiError(registerUser.error)
      ? registerUser.error.message
      : "Something went wrong. Please try again."
    : null;
  const alreadyExists = !!errorMessage && /exist|already|registered|taken/i.test(errorMessage);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[1.75rem] leading-tight font-extrabold tracking-tight">Create your account</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Join buyers and residents sharing what it&apos;s really like to own in a project.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="grid gap-5">
        {errorMessage && (
          <FormAlert>
            {errorMessage}
            {alreadyExists && (
              <>
                {" "}
                <Link href="/login" className="font-semibold underline underline-offset-2">
                  Sign in instead
                </Link>
              </>
            )}
          </FormAlert>
        )}

        <FormField id="name" label="Full name" error={errors.name?.message}>
          <Input
            id="name"
            autoComplete="name"
            placeholder="e.g. Ananya Sharma"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "name-error" : undefined}
            autoFocus
            {...register("name")}
          />
        </FormField>

        <FormField id="email" label="Email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
        </FormField>

        <FormField id="password" label="Password" error={errors.password?.message}>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : "password-strength"}
            {...register("password")}
          />
          <PasswordStrength password={password} />
        </FormField>

        <FormField id="confirmPassword" label="Confirm password" error={errors.confirmPassword?.message}>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
            {...register("confirmPassword")}
          />
        </FormField>

        <div className="grid gap-2">
          <div className="flex items-start gap-2.5">
            <Controller
              control={control}
              name="acceptTerms"
              render={({ field }) => (
                <Checkbox
                  id="acceptTerms"
                  className="mt-0.5"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                  aria-invalid={!!errors.acceptTerms}
                />
              )}
            />
            <Label htmlFor="acceptTerms" className="cursor-pointer leading-snug font-medium text-muted-foreground">
              I agree to the IREG Terms of Use and Privacy Policy, and to keep discussions respectful.
            </Label>
          </div>
          {errors.acceptTerms && (
            <p role="alert" className="text-[13px] font-medium text-destructive">
              {errors.acceptTerms.message}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" className="mt-1 w-full" disabled={registerUser.isPending}>
          {registerUser.isPending && <Loader2 className="animate-spin" />}
          {registerUser.isPending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-8 text-center text-[15px] text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

const CHECKS = [
  { label: "8+ characters", test: (p: string) => p.length >= 8 },
  { label: "A number", test: (p: string) => /\d/.test(p) },
  { label: "A letter", test: (p: string) => /[a-z]/i.test(p) },
];

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  return (
    <ul id="password-strength" className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
      {CHECKS.map((c) => {
        const ok = c.test(password);
        return (
          <li
            key={c.label}
            className={cn("flex items-center gap-1.5 transition-colors", ok ? "text-success" : "text-subtle-foreground")}
          >
            <Check className={cn("size-3.5", !ok && "opacity-40")} strokeWidth={3} aria-hidden />
            {c.label}
            <span className="sr-only">{ok ? "(met)" : "(not met)"}</span>
          </li>
        );
      })}
    </ul>
  );
}
