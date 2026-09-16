/**
 * Barrel for every domain type.
 *
 * Import from "@/types" rather than reaching into individual modules — it keeps
 * the public surface of the data layer in one place as the API grows.
 */

export type * from "./common";
export type * from "./repository";
export type * from "./commit";
export type * from "./pull-request";
export type * from "./risk";
export type * from "./analytics";
export type * from "./account";

/** Envelope for a DRF error response, normalized by the API client. */
export interface ApiErrorShape {
  status: number;
  code: string;
  message: string;
  /** Field-level validation errors keyed by field name. */
  fieldErrors?: Record<string, string[]>;
  /** True when the failure is a lapsed GitHub credential rather than a bug. */
  requiresReauth?: boolean;
}
