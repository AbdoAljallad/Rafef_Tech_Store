# Frontend Phase 1 Verification Checklist

Scope: project setup, routing, auth shell, protected layout, permissions, radial home shell, ticker shell, shared components, theme tokens, placeholders, and app-level resilience.

## Required Checks

- `npm run typecheck` passes.
- `npm run build` passes.
- `/login` renders Russian-first login UI.
- Pressing Enter on the login form submits the form.
- Protected routes redirect unauthenticated users to `/login`.
- Authenticated layout contains header, user card, permission-aware navigation, main content, and persistent ticker.
- Module placeholders render only through permission-aware routes.
- Radial home has the largest center Rafef Tech circle.
- Radial home module circles are equal size and placed around a circular orbit on desktop.
- Radial home has keyboard-focusable links.
- Mobile radial fallback avoids text overlap.
- Ticker handles loading, empty, and backend-unavailable states without crashing.
- Skip link appears on keyboard focus and moves focus to main content.
- App-level error boundary shows a Russian fallback if rendering fails.
- Route-level error page keeps the rest of the app shell recoverable.
- Theme tokens exist for colors, typography, layout spacing, radius, and assets.
- No direct database access exists in frontend code.
- No business module functionality is implemented in Phase 1.

## Current API Boundaries

- Auth placeholder endpoints: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`.
- Ticker placeholder endpoint: `/api/events/ticker`.
- No business API calls are wired yet.
