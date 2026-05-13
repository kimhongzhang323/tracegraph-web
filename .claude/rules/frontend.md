# Frontend Rules

Applies to: `src/**/*.tsx`, `src/**/*.ts`

## React

- Functional components only — no class components.
- Prefer named exports over default exports for components.
- Co-locate state as close to where it's used as possible; lift only when necessary.
- Use `useCallback`/`useMemo` only when profiling shows a real perf problem — not preemptively.
- Lazy-load all new pages in `App.tsx` using `React.lazy`.

## TypeScript

- No `any` — use `unknown` and narrow it, or define a proper type.
- Put shared types in `src/types/index.ts`; module-specific types can live next to their file.
- Prefer `interface` for object shapes, `type` for unions/aliases.

## Tailwind

- Use the custom `ink-*` color palette for grays/neutrals (defined in `tailwind.config.ts`).
- Dark mode is `class`-based — always pair `bg-white` with `dark:bg-ink-950` etc.
- No inline `style` props for colors or spacing that Tailwind can handle.

## Imports

- Use `@/` alias for all src imports — never `../../`.
- Group: external libs → internal `@/` → relative (if unavoidable).

## File Naming

- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utilities/lib: `camelCase.ts`
