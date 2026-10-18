---
description: "Use when working on the RAWTIX TypeScript/React codebase with Serena MCP for symbol navigation, references, refactoring, or code structure analysis."
applyTo: "src/**/*.{ts,tsx}"
---

# Serena instructions for RAWTIX

- Treat the workspace root as the only Serena project. Do not activate or inspect unrelated projects.
- Prefer Serena's symbol-aware tools for exploring TypeScript and TSX: inspect symbol overviews, locate definitions, and find references before editing.
- Before changing a shared component, hook, route, Supabase integration, or order-related utility, inspect its callers and dependent symbols.
- Prefer the smallest symbol-level edit that preserves existing TanStack Router, React, Supabase, and Cloudflare conventions.
- Preserve strict TypeScript typing, path aliases using `@/`, existing error handling, and user-visible localization/style patterns.
- After edits, inspect the changed symbols and run the narrowest relevant repository validation (`npm run lint`, `npm run build`, or a focused test command when available).
- Never place credentials, Supabase keys, Midtrans secrets, or other environment values in source, instructions, or MCP configuration.
