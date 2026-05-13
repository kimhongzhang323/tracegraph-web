# Project Context

## What is TraceGraph

TraceGraph is a typed execution-graph runtime for the JVM. Developers instrument their Spring Boot applications with the TraceGraph starter, which records execution graphs that can be replayed, resumed from checkpoints, and visualized.

## This Repo

Frontend only — React 18 + Vite + TypeScript. The Spring Boot backend lives in the `TraceGraph` repo (separate GitHub project).

## Pages

| Route | Page | Auth |
|-------|------|------|
| `/` | Home — marketing/landing | Public |
| `/docs` | Documentation | Public |
| `/trace` | Trace Explorer | Protected |
| `/studio` | Graph Studio | Protected |
| `/api` | API Reference | Public |
| `/changelog` | Release notes | Public |
| `/sign-in` | Clerk sign-in | Public |
| `/sign-up` | Clerk sign-up | Public |

## Auth

Clerk (`@clerk/clerk-react`). Protected routes use `<ProtectedRoute>` wrapper. Keys come from `VITE_CLERK_PUBLISHABLE_KEY`.

## Design System

Custom Tailwind palette: `ink-*` (neutrals/grays). Dark mode via `class` strategy. `useTheme` hook manages theme toggle + localStorage persistence.
