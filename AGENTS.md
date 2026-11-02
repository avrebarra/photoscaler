# AGENTS.md - photoscaler

Extends `~/.pi/agent/AGENTS.md`. Project rules below.

## Frontend - modular but single file, clear layering

Goal: clear code, fewer files, smaller surface. Applies to `src/**/*.tsx`.

- If a component gets big, break it down **in file** into subcomponents. Keep many components in the same file. Do not create many component files.
- Same for functions. Split large functions into helpers. Separate processing from execution. Use as many helpers as needed if it makes logic clearer.
- File order is strict: `1 constants (top) → 2 main component (exported, top) → 3 supporting functions (below) → 4 supporting subcomponents (bottom) → 5 types (very bottom)`. No supporting functions above main component except constants. No types at top.
- If a function is still large after splitting, add lowercase inline section comments like `// validate input`. Keep functions small.
- Keep clear layering. Do not mash everything into the component layer. Put logic where it belongs: reusable pure logic in `lib/`, data fetching and state in `hooks/`, and components as stupid and thin as possible. If it should be in lib, put it in lib. If it should be in a hook, put it in a hook.

## Code Structure - placement

Goal: predictable anatomy in every file.

- `lib/` holds reusable pure logic with no UI or state dependencies.
- `hooks/` holds data fetching and state.
- `components/` holds thin UI, as stupid as possible. No business logic in components.

## Least-code

- Follow the ponytail ladder: `YAGNI → reuse → stdlib → native → installed dep → one-liner → min code`. Prefer the earliest rung that solves the task.
- Prefer browser native (Canvas API), no deps. See `src/lib/scale.ts` (`ponytail rung 4: browser native Canvas API - no deps`).

## Wording and commentary

- Never use em dashes or en dashes in wording. This applies to code, comments, UI copy, and docs. Write as a normal human. Use commas or periods instead.
- Do not add unnecessary commentary. Only add comments when they make logic clearer.
- When commentary is needed, keep it project oriented. Do not add ticket or task references, ticket numbers, or task narration in code, comments, or logs. Ticket linkage lives only in branch, context, or commit messages.
