# CONTEXT.md — workpool/B3D6S3F-refine-ui-mobile-photo-editor-aesthetic

## What this branch is for

Refine Photoscaler UI to a mobile photo-editor aesthetic — dark monochrome editor look, component split, phone-width column. Keep current flow (pick → options → preview → download) and ALL logic unchanged; Tailwind-only styling. Reference image `docs/ui-reference-mobile-editor.png` is dark theme, large-radius elevated cards, pill chips, full-width primary pill CTA at bottom, bold white headings + muted small labels. Electric blue accent in reference replaced with monochrome (white/black) per user choice.

## Origin

- epiq ticket **B3D6S3F** — `refine-ui-mobile-photo-editor-aesthetic` (tag: major, ready)
- Hub main == local main @ `91867fa` before claim

## Change map

- `src/components/ui.tsx` — **CREATE** shared primitives `Chip` and `PrimaryButton` (monochrome pills, rounded-full, tokens per spec)
- `src/components/DropZone.tsx` — **CREATE** presentational drop zone (drag-drop restyled, dashed well, file meta + remove, dark card)
- `src/components/OptionsPanel.tsx` — **CREATE** options card (percent presets as Chips, range + number inputs, mode Chips, output dims, error slot, primary CTA)
- `src/components/PreviewPanel.tsx` — **CREATE** preview/result card (near-black image wells rounded-xl, original/result display, download + clear CTAs)
- `src/App.tsx` — **MODIFY** JSX only to compose new components; logic (state, handlers, imgRef, useEffect, 8000px guard, canvasToUrl naming) unchanged
- `src/index.css` — **MODIFY only if dark base needs a touch** beyond Tailwind classes (otherwise leave as-is)
- `tailwind.config.js` — **MODIFY only if a token needs extending** (optional)

## Status

In Progress

## Review notes

- Logic contract untouched; verify via diff of state/handler blocks in App.tsx
- Tokens pinned: `bg-zinc-950` app, `bg-zinc-900`/`border-zinc-800` cards, `bg-zinc-950`/`bg-black` wells, `text-white font-bold` headings, `text-xs font-medium text-zinc-500` labels, `text-zinc-400` meta, active chip `bg-white text-black`, inactive `bg-zinc-800 text-zinc-300`, CTA `bg-white text-black rounded-full py-3`, errors `text-red-500 text-sm`, column `max-w-md mx-auto`, radius cards `rounded-2xl` / wells `rounded-xl` / pills `rounded-full`.
- `npx tsc -b && npx vite build` + `npx oxlint` + `npx prettier --check` must be clean; deps unchanged.
