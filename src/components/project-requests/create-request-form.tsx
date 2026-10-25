"use client";

import Link from "next/link";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, Send } from "lucide-react";

import { FormAlert, FormField } from "@/components/auth/form-field";
import { ImageDropzone } from "@/components/project-requests/image-dropzone";
import { SimilarProjects } from "@/components/project-requests/similar-projects";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCreateProjectRequest } from "@/hooks/use-project-requests";
import { isApiError } from "@/lib/api/errors";
import { prepareImageForUpload } from "@/lib/image";
import { cn } from "@/lib/utils";
import { projectRequestSchema, type ProjectRequestValues } from "@/lib/validation/project-request";
import type { ProjectRequest } from "@/types/project-request";

/**
 * Figma "create-project-screen": photo, Builder Name, Project Name, Location → button.
 * Sends POST projects/requests; an admin reviews it before the project goes live.
 */
export function CreateRequestForm() {
  const create = useCreateProjectRequest();
  const [sent, setSent] = useState<ProjectRequest | { name: string } | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectRequestValues>({
    resolver: zodResolver(projectRequestSchema),
    defaultValues: { image: null, builderName: "", name: "", address: "" },
  });
  const nameValue = useWatch({ control, name: "name" }) ?? "";

  const onSubmit = handleSubmit(async (values) => {
    const image = await prepareImageForUpload(values.image as File, { maxDimension: 1600 });
    create.mutate(
      { builderName: values.builderName, name: values.name, address: values.address, image },
      {
        onSuccess: (req) => {
          setSent(req ?? { name: values.name });
          reset();
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
      },
    );
  });

  if (sent) {
    return (
      <Card className="flex flex-col items-center gap-4 px-6 py-12 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-green-50 text-green-600">
          <CheckCircle2 className="size-8" aria-hidden />
        </span>
        <div>
          <h2 className="text-xl font-bold">Request sent!</h2>
          <p className="mx-auto mt-1 max-w-md text-[15px] text-muted-foreground">
            Thanks — our team will review <span className="font-semibold text-foreground">{sent.name}</span>. Once it&apos;s
            approved it will appear on IREG for everyone to discuss and rate. We&apos;ll email you if it can&apos;t be added.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild variant="outline">
            <Link href="/projects/requests">View my requests</Link>
          </Button>
          <Button onClick={() => setSent(null)}>Send another</Button>
        </div>
      </Card>
    );
  }

  const errorMessage = create.error
    ? isApiError(create.error)
      ? create.error.message
      : "Couldn't send your request. Please try again."
    : null;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      {errorMessage && <FormAlert>{errorMessage}</FormAlert>}

      <div className="grid gap-2">
        <Controller
          control={control}
          name="image"
          render={({ field }) => (
            <ImageDropzone
              value={field.value}
              onChange={field.onChange}
              invalid={!!errors.image}
              describedBy={errors.image ? "image-error" : undefined}
            />
          )}
        />
        {errors.image && (
          <p id="image-error" role="alert" className="text-[13px] font-medium text-destructive">
            {errors.image.message}
          </p>
        )}
      </div>

      <FormField id="builderName" label="Builder Name" error={errors.builderName?.message}>
        <Input
          id="builderName"
          placeholder="e.g. Prestige Group"
          autoComplete="organization"
          aria-invalid={!!errors.builderName}
          aria-describedby={errors.builderName ? "builderName-error" : undefined}
          {...register("builderName")}
        />
      </FormField>

      <FormField id="name" label="Project Name" error={errors.name?.message}>
        <Input
          id="name"
          placeholder="e.g. Prestige Lakeside Habitat"
          autoComplete="off"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
          {...register("name")}
        />
      </FormField>
      <SimilarProjects query={nameValue} className="-mt-2" />

      <FormField
        id="address"
        label="Project Address"
        error={errors.address?.message}
        hint="Street or landmark, area and city — e.g. Varthur Road, Whitefield, Bengaluru"
      >
        <textarea
          id="address"
          rows={2}
          placeholder="Where is the project?"
          aria-invalid={!!errors.address}
          aria-describedby={errors.address ? "address-error" : "address-hint"}
          className={cn(
            "w-full resize-y rounded-lg border border-input bg-field px-4 py-3 text-[15px] leading-relaxed outline-none placeholder:text-subtle-foreground",
            "focus-visible:border-primary focus-visible:bg-background focus-visible:ring-[3px] focus-visible:ring-primary/15",
            "aria-invalid:border-destructive",
          )}
          {...register("address")}
        />
      </FormField>

      <Button type="submit" size="lg" className="mt-2 h-[52px] w-full text-lg" disabled={create.isPending}>
        {create.isPending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
        {create.isPending ? "Sending request…" : "Send Request"}
      </Button>
      <p className="-mt-2 text-center text-xs text-muted-foreground">
        An IREG admin reviews every request before the project goes live.
      </p>
    </form>
  );
}
