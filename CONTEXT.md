# CONTEXT — workpool/DHXFMVN-tool-based-editor-flow-like-snapseed

## What this branch is for
Replace long-form Pick→Options→Preview stack with Snapseed-style tool flow: select image → live preview + bottom tool picker (Crop, Resize) → sub-page per tool → Apply returns to updated preview. Download stays on main editor screen.

## Origin
Ticket DHXFMVN — tool-based-editor-flow-like-snapseed. Spec defines routes, signatures, state persistence, router base, dark tokens.

## Change map (diff → intent)
- `package.json` — add react-router-dom + vitest/jsdom/testing-library
- `src/main.tsx` — wrap App with BrowserRouter
- `src/App.tsx` — route state + tool orchestration (holds file/src/origSize/percent/mode/outUrl/outSize/cropRect/cropAspect/error; handleScale/handleDownload central; routes / /editor /editor/crop /editor/resize)
- `src/components/ToolPicker.tsx` — new bottom picker (Crop | Resize)
- `src/components/CropToolPage.tsx` — absorbs crop overlay + aspect chips
- `src/components/ResizeToolPage.tsx` — absorbs OptionsPanel scale/mode controls
- `vite.config.ts` — add vitest jsdom config
- `src/routes.test.tsx` — route navigation tests (5 cases)
- `src/cropPersistence.test.tsx` — crop persistence + back navigation (3 cases)

## Status
**Status:** Ready for review
- [x] add react-router-dom + main.tsx wrapper
- [x] create ToolPicker / CropToolPage / ResizeToolPage
- [x] refactor App.tsx to routes (BrowserRouter history stack, crop persists, download on main editor only)
- [x] verify tsc -b && vite build clean
- [x] add 2+ tests (8 tests pass)

## Review notes
Reuse scaleImage/cropImage/normalizeRect as-is; preserve monochrome dark tokens (zinc-950/900/800); MAX_SIDE 8000 guard unchanged; errors via error state never swallowed. Old PreviewPanel/OptionsPanel kept but unused — no break. Verify: pick → /editor, ToolPicker → sub-page, Apply → /editor, Back → history, crop persists across tool switches.
