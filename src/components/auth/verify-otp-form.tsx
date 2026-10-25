"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Loader2, MailCheck } from "lucide-react";

import { FormAlert, FormField } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useVerifyOtp } from "@/hooks/use-auth";
import { isApiError } from "@/lib/api/errors";
import { otpSchema } from "@/lib/validation/auth";

const OTP_LENGTH = 6;

export function VerifyOtpForm() {
  const params = useSearchParams();
  const emailFromUrl = params.get("email") ?? "";

  const [email, setEmail] = useState(emailFromUrl);
  const [otp, setOtp] = useState("");
  const [fieldError, setFieldError] = useState<{ email?: string; otp?: string }>({});
  const verify = useVerifyOtp();

  function submit(code = otp) {
    const parsed = otpSchema.safeParse({ email, otp: code });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setFieldError({ email: f.email?.[0], otp: f.otp?.[0] });
      return;
    }
    setFieldError({});
    verify.mutate(parsed.data);
  }

  const errorMessage = verify.error
    ? isApiError(verify.error)
      ? verify.error.message
      : "Something went wrong. Please try again."
    : null;

  return (
    <div>
      <div className="mb-8">
        <span className="mb-5 flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <MailCheck className="size-6" aria-hidden />
        </span>
        <h1 className="text-[1.75rem] leading-tight font-extrabold tracking-tight">Verify your email</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          {emailFromUrl ? (
            <>
              We sent a 6-digit code to <span className="font-semibold text-foreground">{emailFromUrl}</span>.
              Enter it below to activate your account.
            </>
          ) : (
            "Enter the email you signed up with and the 6-digit code we sent you."
          )}
        </p>
      </div>

      <form
        noValidate
        className="grid gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {errorMessage && <FormAlert>{errorMessage}</FormAlert>}

        {!emailFromUrl && (
          <FormField id="email" label="Email" error={fieldError.email}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!fieldError.email}
            />
          </FormField>
        )}

        <div className="grid gap-2">
          <label htmlFor="otp" className="text-sm font-semibold">
            Verification code
          </label>
          <InputOTP
            id="otp"
            maxLength={OTP_LENGTH}
            pattern={REGEXP_ONLY_DIGITS}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus={!!emailFromUrl}
            value={otp}
            onChange={(v) => {
              setOtp(v);
              if (fieldError.otp) setFieldError((f) => ({ ...f, otp: undefined }));
            }}
            onComplete={(v: string) => submit(v)}
            disabled={verify.isPending}
            aria-invalid={!!fieldError.otp}
          >
            <InputOTPGroup>
              {Array.from({ length: OTP_LENGTH }, (_, i) => (
                <InputOTPSlot key={i} index={i} aria-invalid={!!fieldError.otp} />
              ))}
            </InputOTPGroup>
          </InputOTP>
          {fieldError.otp && (
            <p role="alert" className="text-[13px] font-medium text-destructive">
              {fieldError.otp}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={verify.isPending}>
          {verify.isPending && <Loader2 className="animate-spin" />}
          {verify.isPending ? "Verifying…" : "Verify email"}
        </Button>
      </form>

      <div className="mt-8 grid gap-2 text-center text-[15px] text-muted-foreground">
        <p>
          Didn&apos;t get the code? Check your spam folder — it can take a minute to arrive.
        </p>
        <p>
          Wrong email?{" "}
          <Link href="/signup" className="font-bold text-primary hover:underline">
            Sign up again
          </Link>{" "}
          ·{" "}
          <Link href="/login" className="font-bold text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
