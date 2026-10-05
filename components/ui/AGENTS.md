# AGENTS.md

These instructions apply to `components/ui/` and override the root guidance only
for this directory.

## Purpose

- This directory contains shadcn/ui-style primitives and reusable
  design-system components.
- Treat these files as low-level UI building blocks, not feature components.
- Keep components generic, composable, and unopinionated.

## Repo Setup

- shadcn config lives in `components.json`.
- The repo uses the `new-york` style, TypeScript, `rsc: false`, Tailwind CSS
  variables, base color `slate`, and no Tailwind prefix.
- Import aliases are `@/components` and `@/lib/utils`; UI components are placed
  under `components/ui/` and imported as `@/components/ui/<component>`.
- Icons should use the existing icon packages already in the repo
  (`@/components/icons`, the in-house icon set; browse it at `/dev/icons`). Do not add another icon library; add a glyph to the set instead.

## Component Boundaries

- Reuse an existing primitive before creating a new one.
- Do not add business logic, API calls, routing logic, analytics, auth/session
  logic, product-specific config, or tenant/company-specific behavior here.
- Do not import feature code, page components, page hooks, API services, Zustand
  stores, route helpers, sidebar config, or validation schemas from this
  directory.
- Prefer dependencies on React, Radix primitives, `class-variance-authority`,
  `cn`, and sibling `components/ui` primitives.
- Some existing primitives wrap component-specific libraries such as Recharts,
  Vaul, cmdk, react-day-picker, input-otp, sonner, and resizable panels. Only
  use those dependencies when extending the primitive that already owns that
  integration.
- Avoid adding new `components/ui` imports from `components/common`; existing
  legacy imports should not be used as a pattern for new primitives.

## shadcn Updates

- When adding a shadcn component, prefer the official shadcn CLI or the repo's
  existing workflow.
- Check `components.json` before choosing paths, aliases, style, icon library,
  or Tailwind settings.
- Keep generated shadcn components close to upstream unless the task requires a
  targeted repo-specific adjustment.
- Preserve existing public APIs unless the task explicitly requires changing
  them.
- Do not introduce new UI libraries or production dependencies unless the user
  explicitly asks for them.

## Styling

- Use Tailwind classes and existing design tokens from `tailwind.config.ts` and
  `styles/globals.css`.
- Prefer CSS variables already defined by the theme (`bg-background`,
  `text-foreground`, `border-input`, `text-muted-foreground`, etc.).
- Do not hard-code one-off app colors, spacing scales, shadows, or border
  radii for product-specific needs.
- Do not invent a new variant when an existing `cva` variant or `className`
  composition can handle the use case.
- Preserve dark mode behavior and focus-visible styles.
- Use `cn` for class composition.

## Component APIs

- Type components with TypeScript and avoid `any`.
- Preserve `ref` forwarding where it exists.
- Preserve `asChild` support where the component uses Radix `Slot`.
- Preserve existing `class-variance-authority` variant APIs.
- Keep props minimal and generic. Do not add feature-specific props such as
  `isBillingPage`, `isAdminUser`, `companyUuid`, or `trackingId`.
- Prefer named exports that match the existing component style in this
  directory.

## Accessibility

- Preserve semantic HTML and native behavior.
- Preserve keyboard interactions, labels, ARIA attributes, roles, screen-reader
  text, and focus-visible states.
- Prefer native semantics before adding ARIA.
- For dialogs, popovers, dropdowns, tabs, accordions, forms, and menus, preserve
  Radix/shadcn accessibility behavior.

## Tests And Checks

- This repo does not currently have Storybook or a dedicated `typecheck` script.
  Add stories or typecheck commands only if the repo later introduces those
  workflows or the task explicitly asks for them.
- Add or update unit/component tests when a primitive has interaction logic.
- For docs-only changes, no build is required.
- For code changes, run the narrowest relevant check first, then `npm run lint`;
  <!-- run `npm run build` when the change affects runtime behavior or exported UI
  APIs. -->
- If a relevant check cannot be run, report exactly why.
