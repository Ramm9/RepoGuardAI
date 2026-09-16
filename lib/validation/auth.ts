import { z } from "zod";

/**
 * Auth validation schemas.
 *
 * Kept out of the form components so the same rules can be reused by a route
 * handler, a test, or a second surface later. Messages are written as sentences
 * the user can act on — "Enter your email address" rather than "Required".
 *
 * Client-side validation is a convenience, never a control. The backend
 * re-validates everything; these schemas exist to fail fast and explain well.
 */

const email = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .email("That doesn't look like a valid email address.");

export const signInSchema = z.object({
  email,
  // No shape rules on sign-in: an existing password must be accepted as-is,
  // and telling a user their stored password is "too short" is nonsense.
  password: z.string().min(1, "Enter your password."),
  remember: z.boolean(),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your name.")
    .max(80, "That name is too long."),
  email,
  password: z
    .string()
    .min(10, "Use at least 10 characters.")
    .regex(/[a-zA-Z]/, "Include at least one letter.")
    .regex(/[0-9]/, "Include at least one number."),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "Accept the terms to continue." }),
  }),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

/* -------------------------------------------------------------------------- */
/*  Password strength                                                          */
/* -------------------------------------------------------------------------- */

export type PasswordStrength = "empty" | "weak" | "fair" | "strong";

export interface PasswordAssessment {
  strength: PasswordStrength;
  /** 0–4, for the segmented meter. */
  score: number;
  label: string;
}

/**
 * A deliberately simple, transparent strength estimate.
 *
 * Not an entropy model — it scores the things the policy actually asks for, so
 * the meter and the validation message can never disagree with each other.
 */
export function assessPassword(value: string): PasswordAssessment {
  if (!value) return { strength: "empty", score: 0, label: "—" };

  let score = 0;
  if (value.length >= 10) score += 1;
  if (value.length >= 16) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value) && /[^a-zA-Z0-9]/.test(value)) score += 1;

  if (score <= 1) return { strength: "weak", score: Math.max(score, 1), label: "Weak" };
  if (score === 2) return { strength: "fair", score, label: "Fair" };
  return { strength: "strong", score, label: "Strong" };
}
