"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { signIn } from "@/services/auth";
import { safeNextPath } from "@/lib/auth/redirect";
import { messageFromError } from "@/lib/api/errors";
import { signInSchema, type SignInInput } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AuthDivider, AuthHeading } from "@/components/auth/auth-layout";
import {
  InlineSwitchLink,
  LegalNote,
} from "@/components/auth/auth-aside";
import { GitHubAuthButton, RequestedScopes } from "@/components/auth/github-auth-button";
import { PasswordField } from "@/components/auth/password-field";
import { SubmitError } from "@/components/auth/submit-error";

/**
 * SignInForm — the client half of the login page.
 *
 * Separated from the route so the page itself can stay a server component and
 * wrap this in a Suspense boundary. `useSearchParams` opts a route into client
 * rendering at request time, and without that boundary `next build` fails the
 * static prerender of /login rather than degrading gracefully.
 *
 * Validation rules live in lib/validation/auth.ts and arrive through the Zod
 * resolver, so the same schema can be reused by a test or a route handler.
 */
export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formError, setFormError] = React.useState<string | null>(null);

  // Validated to a local path, so a crafted ?next=https://evil.example cannot
  // turn the login page into an open redirect.
  const next = safeNextPath(searchParams.get("next"));
  const justRegistered = searchParams.get("registered") === "1";

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "", remember: true },
  });

  async function onSubmit(values: SignInInput) {
    setFormError(null);
    try {
      await signIn(values);
      router.replace(next);
      // Re-run server components so they observe the new session cookie.
      router.refresh();
    } catch (error) {
      setFormError(messageFromError(error));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading
        title="Sign in to RepoGuard"
        description="Continue to your repositories, analyses, and open risk alerts."
      />

      {justRegistered ? (
        <div
          role="status"
          className="rounded-md border border-success/30 bg-success/10 px-3 py-2.5 text-[13px] text-foreground"
        >
          Account created. Sign in to continue.
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <GitHubAuthButton label="Sign in with GitHub" next={next} />
        <RequestedScopes />
      </div>

      <AuthDivider />

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
        <SubmitError message={formError} />

        <Field>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
          <FieldError id="email-error">{errors.email?.message}</FieldError>
        </Field>

        <Field>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground underline-offset-4 transition-colors duration-150 hover:text-foreground hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordField
            id="password"
            autoComplete="current-password"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password")}
          />
          <FieldError id="password-error">
            {errors.password?.message}
          </FieldError>
        </Field>

        {/* Radix's checkbox is a button with a hidden input, so it is driven
            through Controller rather than registered directly — RHF's onChange
            would be attached to the button, which never fires a change event. */}
        <Controller
          control={control}
          name="remember"
          render={({ field }) => (
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="remember"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                onBlur={field.onBlur}
                ref={field.ref}
              />
              <Label
                htmlFor="remember"
                className="text-[13px] font-normal text-muted-foreground"
              >
                Keep me signed in for 30 days
              </Label>
            </div>
          )}
        />

        <Button
          type="submit"
          variant="secondary"
          size="lg"
          loading={isSubmitting}
          className="mt-1 w-full"
        >
          Sign in
        </Button>
      </form>

      <div className="flex flex-col gap-4 border-t border-border pt-6">
        <InlineSwitchLink
          prompt="New to RepoGuard?"
          label="Create an account"
          href="/signup"
        />
        <LegalNote />
      </div>
    </div>
  );
}
