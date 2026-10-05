/**
 * PROTOTYPE SUBSET of types/components/index.ts in aiaccountant-app.
 *
 * Production's version is large and pulls in feature contracts from
 * types/pages/, config/ and schemas/. Only the types the template's own
 * components need are reproduced here, VERBATIM, so a component written against
 * them compiles unchanged in production.
 *
 * Need another type from that file? Copy it in here verbatim — do not redefine
 * it with a different shape.
 */

import type { ComponentType, ReactNode } from "react";

export type TypographyVariant =
  | `title-${1 | 2 | 3}`
  | `label-${1 | 2 | 3}`
  | `body-${1 | 2 | 3 | 4}`
  | `caption-${1 | 2}`
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "sm"
  | "p"
  | "xs"
  | "blockquote"
  | "code";

export type TypographyWeight = "normal" | "medium" | "semibold" | "bold";

export interface ComboBoxOption<TValue> {
  label: string | ReactNode;
  value: TValue;
  icon?: ComponentType<{ className?: string }>;
  disabled?: boolean;
  tooltip?: ReactNode;
}

export interface ComboBoxOptionGroup<TValue> {
  label?: ReactNode;
  options: ComboBoxOption<TValue>[];
}
