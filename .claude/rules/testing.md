# Testing Rules

Applies to: `src/**`

## Current State

No test framework is configured. Testing is done manually in the browser.

## When Adding Tests

If a test framework is added later (Vitest is the natural choice for Vite projects):
- Unit test hooks and pure utility functions in `src/lib/` and `src/hooks/`.
- Do not test Tailwind class strings — test behavior and data transformations.
- Mock `src/lib/api.ts` at the module level in tests, not individual `fetch` calls.

## Manual Testing Checklist

Before marking a UI task complete:
- Test in both light and dark mode.
- Test auth-gated routes both authenticated and unauthenticated.
- Check that `npm run lint` and `npm run build` pass with zero errors.
