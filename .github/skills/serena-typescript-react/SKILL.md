---
name: serena-typescript-react
description: "Use Serena MCP for RAWTIX TypeScript and React work: map symbols, trace references, understand TanStack routes and Supabase integrations, perform safe refactors, and verify changes."
argument-hint: "[task or symbol to investigate]"
user-invocable: true
---

# Serena TypeScript/React workflow

Use this skill when a task needs codebase understanding or a coordinated change across RAWTIX symbols.

## Procedure

1. Confirm the task scope and identify the route, component, hook, utility, or integration involved.
2. Use Serena's symbol-aware inspection to get an overview of the relevant file and locate the target definition.
3. Find references and callers before changing exported symbols, shared hooks, routes, database helpers, or order flows.
4. Trace the smallest complete path through UI, state, data access, and error handling. Treat Supabase and Midtrans responses as untrusted input.
5. Make the smallest coherent edit. Prefer symbol-level operations when available; preserve existing names, types, and module boundaries unless the task requires otherwise.
6. Re-inspect changed symbols and their references. Check for stale imports, route-tree implications, and changed response shapes.
7. Run the narrowest useful verification:
   - `npm run lint` for TypeScript/React style and correctness;
   - `npm run build` for route bundling and production type/build integration;
   - an existing focused test command when the repository provides one.
8. Report the files changed, validation commands run, and any prerequisite that could not be verified.

## Project boundaries

- Work only in the active `rawtix-main` workspace.
- Do not modify `.env` files or add secrets to MCP configuration.
- Do not replace existing repository tools blindly; use Serena for semantic exploration and the repository's normal tools for validation.
