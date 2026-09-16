"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { signUp } from "@/services/auth";
import { applyFieldErrors, messageFromError } from "@/lib/api/errors";
import { signUpSchema, type SignUpInput } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldHint, Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AuthDivider, AuthHeading } from "@/components/auth/auth-layout";
import { InlineSwitchLink } from "@/components/auth/auth-aside";
import {
  GitHubAuthButton,
  RequestedScopes,
} from "@/components/auth/github-auth-button";
import {
  PasswordField,
  PasswordStrengthMeter,
} from "@/components/auth/password-field";
import { SubmitError } from "@/components/auth/submit-error";

/** Field names the form owns, used to route server-side validation errors. */
const FIELDS = ["name", "email", "password"] as const;

/**
 * SignUpForm — account creation.
 *
 * GitHub is presented first and given the primary style, because it is the path
 * that actually produces a working install: an email account with no repository
 * connection cannot show a single score. Credentials remain available for teams
 * whose GitHub org requires an admin to approve the App separately.
 *
 * On success the user goes to /onboarding rather than /app — a new account has
 * no connected repository yet, and dropping someone into an empty dashboard is
 * how a product teaches them it is empty.
 */
export function SignUpForm() {
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    // Re-validate as the user corrects a field, but don't shout on first blur.
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { name: "", email: "", password: "", acceptTerms: true },
  });

  const password = watch("password");

  async function onSubmit(values: SignUpInput) {
    setFormError(null);
    try {
      await signUp(values);
      router.push("/onboarding");
    } catch (error) {
      const unmatched = applyFieldErrors(error, FIELDS, (field, message) =>
        setError(field as (typeof FIELDS)[number], { message }),
      );

      // Only fall back to the banner when nothing landed on a field, so the
      // user never sees the same sentence twice in two places.
      if (unmatched.length > 0) {
        setFormError(unmatched.join(" "));
      } else if (!hasFieldErrors(error)) {
        setFormError(
          messageFromError(error, "We couldn't create your account. Try again."),
        );
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading
        title="Create your RepoGuard account"
        description="Connect a repository and RepoGuard scores its history on the first pass."
      />

      <div className="flex flex-col gap-3">
        <GitHubAuthButton label="Continue with GitHub" next="/onboarding" />
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
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Ada Lovelace"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "name-error" : undefined}
            {...register("name")}
          />
          <FieldError id="name-error">{errors.name?.message}</FieldError>
        </Field>

        <Field>
          <Label htmlFor="email">Work email</Label>
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
          <Label htmlFor="password">Password</Label>
          <PasswordField
            id="password"
            autoComplete="new-password"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={
              errors.password ? "password-error" : "password-hint"
            }
            {...register("password")}
          />
          <PasswordStrengthMeter value={password} />
          {errors.password ? (
            <FieldError id="password-error">
              {errors.password.message}
            </FieldError>
          ) : (
            <FieldHint id="password-hint">
              At least 10 characters, including a letter and a number.
            </FieldHint>
          )}
        </Field>

        <Controller
          control={control}
          name="acceptTerms"
          render={({ field }) => (
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="acceptTerms"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                onBlur={field.onBlur}
                ref={field.ref}
                aria-invalid={errors.acceptTerms ? true : undefined}
                aria-describedby={
                  errors.acceptTerms ? "terms-error" : undefined
                }
                className="mt-0.5"
              />
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="acceptTerms"
                  className="text-[13px] font-normal leading-relaxed text-muted-foreground"
                >
                  I agree to the Terms of Service and Privacy Policy.
                </Label>
                <FieldError id="terms-error">
                  {errors.acceptTerms?.message}
                </FieldError>
              </div>
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
          Create account
        </Button>
      </form>

      <div className="border-t border-border pt-6">
        <InlineSwitchLink
          prompt="Already have an account?"
          label="Sign in"
          href="/login"
        />
      </div>
    </div>
  );
}

/** True when the API returned at least one field-level error. */
function hasFieldErrors(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "fieldErrors" in error &&
    Boolean((error as { fieldErrors?: unknown }).fieldErrors)
  );
}
