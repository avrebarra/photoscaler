# CONTEXT — workpool/PGZ62RW-add-crop-image-feature

## What this branch is for

Add inline crop on the original-image preview — draggable/resizable rectangle with free + preset ratios (1:1, 4:3, 16:9, original), applied **before** scaling; cropped result replaces source for Scale → Preview → Download, with Reset to restore original. 100% client-side Canvas, no new deps.

## Origin

- epiq ticket **PGZ62RW** — `add-crop-image-feature` (tag: minor, ready)
- Based on **B3D6S3F** shell (`workpool/B3D6S3F-refine-ui-mobile-photo-editor-aesthetic`) — UI refine component split is the base; this branch composes crop into that shell per spec.
- Hub main @ `91867fa` before claim; merge `origin/workpool/B3D6S3F-refine-ui-mobile-photo-editor-aesthetic` (f9bbce0) into PGZ62RW in clone (fast-forward, no conflicts) — see git log.

## Change map

- `src/lib/crop.ts` — **CREATE** pure Canvas crop utility: `CropRect`, `CropAspect`, `cropImage(source, rect)` (drawImage, MAX_SIDE guard, zero-area/invalid throws), `normalizeRect(rect, naturalSize)` (clamp to [0,w]×[0,h], reject zero-area)
- `src/components/CropOverlay.tsx` — **CREATE** inline draggable/resizable overlay (mouse+touch, Tailwind, zinc tokens): rect in natural coords → percent overlay, drag + 4 corner handles, preset chips enforce ratio, never throws
- `src/App.tsx` — **MODIFY** add crop state (`cropRect`, `cropAspect`, derived cropped size), pipeline `croppedCanvas → scaleImage` (crop before scale), Reset handler, MAX_SIDE checks after crop and scale, errors → existing `error` state (text-red-500)
- `src/components/PreviewPanel.tsx` — **MODIFY** host `CropOverlay` + aspect preset chips + Reset on the original preview hero; props extended to mount overlay; shell component split preserved
- `src/lib/scale.ts`, `src/main.tsx`, `index.html`, `vite.config.ts`, `tailwind.config.js`, `src/index.css`, `public/*` — **READ-ONLY**

## Status

**Status:** Ready for review

- [x] claim workpool/PGZ62RW-add-crop-image-feature in innocent-porcupine, rebase main, merge B3D6S3F shell
- [x] CONTEXT.md initial commit
- [x] create src/lib/crop.ts (contract + guards)
- [x] create src/components/CropOverlay.tsx (drag/resize + presets)
- [x] wire App.tsx pipeline + PreviewPanel host
- [x] verify `npx tsc -b && npx vite build` + `npx oxlint` + `npx prettier --check` clean
- [x] hub store

## Review notes

- Visual tokens match B3D6S3F: zinc-950/900/800, rounded-2xl cards, rounded-xl wells, rounded-full pills, Chip/ui.tsx primitives where sensible.
- Reuse ladder: scale.ts + canvasToUrl + Tailwind + native `drawImage(sx,sy,sw,sh)`; no new deps.
- Guards: MAX_SIDE=8000 after cropImage and after scaleImage; errors surfaced via App error state, never swallowed; CropOverlay never throws.
- Out-of-scope: no backend/persistence/rotation/flip/multi-crop stack/upload.
- DoD: `npx tsc -b && npx vite build` clean, no new deps, oxlint/prettier pass, cropImage contract matched, CropOverlay inline drag/resize mouse+touch with presets, Reset restores original, no regression when crop unused.
