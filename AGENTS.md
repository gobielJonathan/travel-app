# Travel App Agent Guide

## Project

Nuxt 3 SPA for collaborative trip planning. TypeScript, Vue 3 `<script setup>`, Tailwind CSS, Leaflet, WebSockets, and DeepSeek-backed AI endpoints.

## Workflow

1. Inspect nearby components, composables, types, and page styles before editing.
2. Keep changes local to the feature; reuse existing composables and types before adding abstractions.
3. Run `pnpm format:check` and `pnpm typecheck` after changes. Run `pnpm build` when changes affect Nuxt configuration, server routes, or production behavior.
4. Report any failed check with its exact command and error.

Done means every changed file follows existing patterns and required checks pass.

## Layout

- `pages/`: route-level screens.
- `components/`: reusable Vue components; `components/sheets/` contains bottom-sheet UI.
- `composables/`: stateful page and feature logic.
- `types/`: shared TypeScript domain types.
- `data/`: local trip seed data.
- `middleware/`: route guards and trip-plan access.
- `server/api/ai/`: server-only AI handlers.
- `server/api/workspaces/`: sync and signaling endpoints.
- `utils/`: storage, receipt reading, and rendering helpers.
- `assets/styles/`: page and component CSS.

## Conventions

- Use TypeScript and Vue `<script setup>`.
- Use Nuxt auto-imports where the project already does; avoid unnecessary imports or new dependencies.
- Keep domain shapes in `types/`; use existing types instead of inline duplicates.
- Keep state transitions and side effects in composables, not presentational components.
- Keep page-specific CSS in `assets/styles/pages/` and component-specific CSS in `assets/styles/components/`.
- Preserve SSR-disabled behavior unless the task explicitly changes it.
- Keep API keys server-only. Read runtime configuration through Nuxt server-side configuration; never expose or log secrets.
- Validate untrusted request data at server boundaries and return appropriate errors.
- Preserve keyboard access, visible focus, semantic controls, and readable contrast in UI changes.
- Match existing formatting. Do not add comments unless they explain a non-obvious constraint.

## Dependencies and Commands

Use pnpm. Check `package.json` before adding packages or scripts. Existing scripts are the source of truth for available checks:

- `pnpm dev`
- `pnpm build`
- `pnpm preview`
- `pnpm typecheck`
- `pnpm format`
- `pnpm format:check`

## Scope

Prefer the smallest working diff. Do not update generated `.nuxt/` or `.output/` files. Do not modify `.env`; use `.env.example` for documented variable names. Do not commit secrets, certificates, or local artifacts.
