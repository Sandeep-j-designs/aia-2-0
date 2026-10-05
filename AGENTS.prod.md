# AGENTS.md

This file tells coding agents how to work safely and productively in this repository.

## Repo Snapshot

- This is a **multi-tenant accounting app**. All data is scoped to a company (`companyUuid` from the user session). Every API route and data query must respect company scope.
- Next.js 14 Pages Router. Route entrypoints live under `pages/`; this repo does not use the App Router.
- Main stack: React 18, TypeScript, Prisma, Tailwind CSS, NextAuth, Zustand, React Query, Zod, react-hook-form, Jest, Playwright.
- Use Node `v24` and `npm`. Do not switch package managers.
- Some local workflows depend on Docker, Postgres, Prisma migrations, and external Korefi service endpoints (MDS, ATIS, DMS).

## App Wiring

- Global wiring lives in `pages/_app.tsx`: `SessionProvider`, `QueryClientProvider`, `EnvProvider`.
- Global effects: `AuthEffects` (cross-tab logout), `SetupGuard` (Tally historical data check), `AppConfigPoller` (feature flags), `UserCompaniesSync` (Zustand company hydration).
- `BulkUpload` and `Toaster` (sonner) are already mounted globally.
- Do not add duplicate providers, toasters, polling loops, or app-wide effects inside feature pages.

## Directory Map

- `pages/`: thin route entrypoints that delegate to feature components.
- `pages/api/`: backend HTTP surface. All API routes live here.
- `components/<feature>/`: feature UI grouped by domain (`accounts-payable`, `accounts-receivable`, `transactions`, `dashboard`, `configuration`, `customers`, `vendors`).
- `components/<feature>/common/`: feature-scoped shared components reused within one domain.
- `components/common/`: reusable cross-feature components (charts, data-table, filters, PageHeader, modal, etc.).
- `components/ui/`: shadcn-style low-level primitives (button, dialog, sheet, table, skeleton, etc.). Config in `components.json`; also follow
  `components/ui/AGENTS.md`.
- `components/sidebar-layout/`: authenticated page shell (`SidebarLayout`).
- `hooks/`: shared hooks. `hooks/pages/`: page-specific controller and orchestration hooks.
- `config/pages/`: static page config, display definitions, table metadata, mock data. Keep these out of route files.
- `config/sidebar/`: sidebar nav definitions. Only change when the task explicitly requires nav changes.
- `types/pages/`: page-specific contracts. `utils/pages/`: page-specific helpers.
- `schemas/`: form validation schemas (Zod + react-hook-form). `lib/validation-schemas/`: API route validation schemas (Zod).
- `lib/api/`: API-facing helper modules. `services/`: typed fetch wrappers (`fetchJson<T>()`) for calling `/api/` routes.
- `lib/server/`: server-only implementation code such as Prisma queries, secret-backed provider clients, and webhook processing. Organize it by domain and never import it from browser-facing modules.
- `stores/`: Zustand stores — `appConfigStore`, `useUserCompaniesStore`, `bulkUploadModalStore`. Do not create new stores without justification.
- `prisma/`: schema and migrations. `__tests__/`: Jest tests. `tests/e2e/`: Playwright tests.
- `.github/workflows/`: CI, security scan, versioning, deploy. `.husky/`: pre-commit runs `lint-staged` + `build`.

## Core Patterns

### Page Pattern

- `pages/<route>/index.tsx` is a thin wrapper that imports and renders the feature component from `components/<feature>/`.
- The feature component wraps with `withSession` HOC (`hooks/withSession.tsx`), renders inside `SidebarLayout`, and uses `PageHeader` or `PageTopBar`.
- Orchestration logic lives in `hooks/pages/<feature>/`. Static config lives in `config/pages/<feature>/`.
- Route state parsing/serializing helpers live in `utils/pages/<feature>/`.
- Extend the local feature pattern before inventing a new one. If a feature already has `components`, `hooks/pages`, `config/pages`, `types/pages`, and `utils/pages` siblings, keep new work in that structure.

### URL State Sync

- Every list page (transactions, AP, AR, dashboard, customers, vendors, statements) syncs filters, tabs, and pagination to the URL using `useRoutedListState` from `hooks/useRoutedListState.ts`.
- Signature: `{ router, managedKeys, state, parse, serialize, onRouteStateChange }` returns `{ isRouteHydrated, syncRouteState }`.
- Call `syncRouteState(nextState)` when the user changes filters, tabs, or pagination. The hook handles `router.replace` and deduplication.
- When adding a new list page, define `QUERY_KEYS`, `parse*RouteState`, and `serialize*RouteState` in `utils/pages/<feature>/route-state.ts`. Follow the transactions or dashboard pattern.

### API Route Pattern

- All API routes live in `pages/api/` and follow this structure:
  1. Check `req.method`, return 405 if wrong.
  2. Validate input with `validateRequest(ZodSchema, req.query or req.body, res)` from `utils/validation.ts`. Returns validated data or sends 400 and returns falsy.
  3. Optionally call `validateCompanyId(req, res, companyId)` for company-scoped authorization.
  4. Create `apiClient` via `createApiClient({ baseURL: process.env.MDS_BASE_URL })` from `utils/apiClient.ts` to proxy to the backend.
  5. Return `res.status(200).json(response.data)`.
- **Critical**: `apiClient` auto-converts camelCase keys to snake_case on requests and snake_case to camelCase on responses. Write Zod schemas and TypeScript types in camelCase; the backend sees snake_case.
- Validation schemas for API routes go in `lib/validation-schemas/<domain>/`. There is no standard response envelope — each route returns its own shape. Error shape is typically `{ error: string }` or Zod field errors.
- Keep API routes thin: handle HTTP method checks, authentication/authorization, request parsing and validation, then map the result to an HTTP response. Move Prisma access and business orchestration to the owning module under `lib/server/<domain>/`.

### Server-Only Code

- Put code that must never run in the browser under `lib/server/`: Prisma/database access, private environment variables, secret-backed provider calls, webhook processors, and server authentication helpers.
- Do not import `lib/server/` modules from `components/`, client-side hooks, stores, or browser services.
- Organize inbound webhooks by provider and event. The HTTP route lives at `pages/api/webhooks/<provider>/<event>/index.ts`; its implementation lives at `lib/server/webhooks/<provider>/<event>/`.
- When a webhook requires multiple files, use `index.ts` for processing/orchestration and a domain-scoped `utils.ts` for payload normalization or other pure helpers. Keep helpers private in `index.ts` until they are reused or form a distinct responsibility; do not create generic utility layers prematurely.
- Keep a type private in its implementation file when it has one consumer. Put types shared within one server domain in a colocated `types.ts`. Move them to the root `types/<domain>/` only when they are shared outside that server domain; reserve `types/pages/` for page-specific contracts.
- Keep runtime constants in `config/` or the owning server module, not in `types.ts`.

### Form Pattern

- Forms use `react-hook-form` with `zodResolver` from `@hookform/resolvers/zod`.
- Schema lives in `schemas/<feature>/`. Form hook setup lives in `hooks/pages/<feature>/`.
- Submission calls `fetch("/api/...")` directly or uses a service function from `services/pages/<feature>/`.
- Reference implementations: `hooks/pages/accounts-payable/create-bill/`.

### Data Fetching

- **Dominant pattern**: direct `fetch("/api/...")` in hooks or callbacks. Most of the app uses this.
- **Service layer**: `services/common/fetchJson<T>()` and domain-specific wrappers in `services/pages/`. Use when the feature area already has one.
- **React Query**: available globally but used only for `useAppConfig` polling. Use it only if the feature area already uses `useQuery`/`useMutation`.
- **apiClient** (`utils/apiClient.ts`): Axios-based, used **server-side in API routes** to proxy to MDS/ATIS backends. Not for client-side use.
- Do not introduce a new data-fetching abstraction into a feature that already has a clear local pattern.

### Feature Flags and State

- Static flags in `feature-flags.json`. DB-backed flags via `/api/feature-flags`. Client-side: `useFeatureFlag("flag-name")`.
- App config: `useAppConfig` polls `/api/app-config` and syncs to Zustand `appConfigStore`.
- Page-level state: `useState` + `useRoutedListState` for URL-synced state. Cross-component state within a page: lift state or use a page hook from `hooks/pages/`.

## Component Lookup

**Search order** — always check in this sequence before creating anything new:

1. The feature folder (`components/<feature>/`).
2. That feature's `common/` folder if it exists.
3. `components/common/` for cross-feature shared components.
4. `components/ui/` for shadcn primitives.

**Family map:**

- Page shell: `withSession` + `SidebarLayout` + `PageHeader` / `PageTopBar`.
- Tables: `common/data-table/`, `common/tanstack-data-table/`, `common/table-column/`. Feature tables in `<feature>/table/`.
- Forms/inputs: `ui/*` primitives + `common/combo-box`, `common/tree-select`, `common/decimal-input`, `common/rupee-input`, `common/form-label`, `common/error-message`.
- Charts: `common/charts/*`, `ui/chart.tsx`.
- Modals/sheets: `ui/dialog.tsx`, `ui/sheet.tsx`, `ui/drawer.tsx`, `common/modal.tsx`, `common/drawer-right.tsx`.
- Loading/empty: `common/page-loading.tsx`, `common/shimmer-ui/*`, `common/NoDataMessage.tsx`, `ui/skeleton.tsx`.
- Filters: `common/filters/*`. Feature-local filters in the owning feature folder.

**Placement rule:**

1. One-route-only component: keep in the workflow folder.
2. Reused within one feature: `components/<feature>/common/`.
3. Reused across features: `components/common/`.
4. Low-level primitive: `components/ui/`.

Do not duplicate shadcn primitives. Do not create a second chart, table, or modal system.

### Scoped UI Instructions

When working in `components/ui/`, also read and follow
`components/ui/AGENTS.md`. These scoped rules improve agent-generated UI code by
keeping primitives generic, preserving shadcn/Radix APIs and accessibility, and
preventing feature-specific logic or imports from leaking into the shared
design-system layer.

## How To Run

- Install: `npm install`
- Dev server: `npm run dev`
- Local services + migrations (dev): `npm run setup-dev`
  <!-- - Local services + migrations (test): `npm run setup-testing` -->
  <!-- - If Docker or external deps are unavailable, verify with `npm run build`, targeted Jest, or targeted Playwright. -->

## Build, Test, and Lint

- Build: `npm run build`
- Lint: `npm run lint` / `npm run lint:fix`
- Format: `npm run format:check` / `npm run format`
- Jest: `npm run test` (coverage on by default — full runs are heavy)
- Targeted Jest: `npx jest __tests__/Login.test.tsx --runInBand`
- Playwright Tally: `npm run test:tally` / Zoho: `npm run test:zoho`
- Targeted Playwright: `npx playwright test tests/e2e/features/bills/create-bill.spec.ts --project="Google Chrome"`
- Pre-commit hook runs `lint-staged` + `npm run build`. PR CI runs the same.
- Verification order: narrowest check first, then targeted tests, then `npm run build`, then broader suites only if warranted.

## Conventions

- Pages Router only. Do not migrate to App Router unless explicitly asked.
- Thin page files. Orchestration logic belongs in `components/` and `hooks/pages/`.
- TypeScript with `@/` import alias. Formatting: 2 spaces, semicolons, double quotes, `printWidth: 80`, trailing commas (ES5).
- `react-hooks/exhaustive-deps` is intentionally disabled. Do not rewrite dependency arrays.
- `@typescript-eslint/no-explicit-any` is off. Respect current ESLint rules; do not clean up unrelated warnings.
- Prefer small, targeted diffs. Extend local patterns before inventing new ones.
- Follow the conventions of the existing route family. Not every authenticated page belongs under `pages/dashboard/`.
- Some features (especially accounts receivable) have coexisting v1 and v2 subtrees. Stay in the subtree the route already points to. Do not mix v1/v2 components, hooks, or configs.

## Do-Not Rules

- Do not commit generated output: `.next/`, `coverage/`, Playwright reports, test results, build artifacts.
- Do not change GitHub Actions workflows, ECS task definitions, Docker setup, Prisma schema/migrations, auth, or middleware unless the task explicitly requires it.
- Do not edit `middleware.ts` or `config/sidebar/index.ts` unless the task explicitly requires routing or nav changes.
- Do not add production dependencies without strong justification tied to the task.
- Do not hardcode secrets, tokens, AWS values, or environment-specific credentials.
- Do not run broad E2E suites if a focused unit/build check is enough.
- Do not invent new architecture when the repo already has a clear local pattern.
- Do not add a page to `config/sidebar/index.ts` just because it is authenticated.

## What Done Means

- The requested change is implemented in the correct file or feature area.
- Relevant tests or checks were run.
- `npm run build` passes for code changes unless the task is strictly docs-only.
- No unrelated files were modified.
- No secrets or generated artifacts were added.
- The diff was sanity-checked for regressions and noisy churn.
- If something could not be verified locally, the handoff states exactly what was not verified.
