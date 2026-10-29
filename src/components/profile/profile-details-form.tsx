"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Lock } from "lucide-react";

import { FormAlert, FormField } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUpdateProfile } from "@/hooks/use-profile";
import { isApiError } from "@/lib/api/errors";
import { normalizeIndianMobile, profileSchema, type ProfileValues } from "@/lib/validation/profile";
import type { User } from "@/types/auth";

export function ProfileDetailsForm({ user }: { user: User }) {
  const update = useUpdateProfile();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name ?? "", phone: user.phone ?? "" },
  });

  // Keep the form in step with fresh server data (unless the user is mid-edit).
  useEffect(() => {
    if (!isDirty) reset({ name: user.name ?? "", phone: user.phone ?? "" });
  }, [user.name, user.phone, isDirty, reset]);

  const onSubmit = handleSubmit((values) => {
    const phone = values.phone ? normalizeIndianMobile(values.phone) : null;
    const changes: { name?: string; phone?: string | null } = {};
    if (values.name !== user.name) changes.name = values.name;
    if ((phone ?? null) !== (user.phone || null)) changes.phone = phone;
    const saved = { name: values.name, phone: phone ?? "" };
    if (Object.keys(changes).length === 0) {
      reset(saved);
      return;
    }
    update.mutate(changes, { onSuccess: () => reset(saved) });
  });

  const errorMessage = update.error
    ? isApiError(update.error)
      ? update.error.message
      : "Couldn't save your changes. Please try again."
    : null;

  return (
    <Card>
      <form onSubmit={onSubmit} noValidate>
        <CardHeader>
          <CardTitle>Personal details</CardTitle>
          <CardDescription>Your name is shown next to your comments and ratings. Your number stays private.</CardDescription>
        </CardHeader>

        <CardContent className="grid gap-5">
          {errorMessage && <FormAlert>{errorMessage}</FormAlert>}

          <FormField id="name" label="Full name" error={errors.name?.message}>
            <Input
              id="name"
              autoComplete="name"
              placeholder="Your full name"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
              {...register("name")}
            />
          </FormField>

          <FormField
            id="phone"
            label="Mobile number"
            error={errors.phone?.message}
            hint="Needed to pay for consultations. Not shown to other users."
          >
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="98765 43210"
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? "phone-error" : "phone-hint"}
              {...register("phone")}
            />
          </FormField>

          <FormField id="email" label="Email" hint="Used to sign in. Email changes aren't supported yet.">
            <div className="relative">
              <Input
                id="email"
                type="email"
                value={user.email}
                readOnly
                aria-readonly
                aria-describedby="email-hint"
                className="pr-11 text-muted-foreground focus-visible:bg-field"
              />
              <Lock className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-subtle-foreground" />
            </div>
          </FormField>
        </CardContent>

        <CardFooter className="justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              reset({ name: user.name ?? "", phone: user.phone ?? "" });
              update.reset();
            }}
            disabled={!isDirty || update.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!isDirty || update.isPending} className="min-w-32">
            {update.isPending && <Loader2 className="animate-spin" />}
            {update.isPending ? "Saving…" : "Save changes"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
