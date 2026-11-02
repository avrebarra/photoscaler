# CONTEXT — workpool/DHXFMVN-tool-based-editor-flow-like-snapseed

## What this branch is for
Replace long-form Pick→Options→Preview stack with Snapseed-style tool flow: select image → live preview + bottom tool picker (Crop, Resize) → sub-page per tool → Apply returns to updated preview. Download stays on main editor screen.

## Origin
Ticket DHXFMVN — tool-based-editor-flow-like-snapseed. Spec defines routes, signatures, state persistence, router base, dark tokens.

## Change map (diff → intent)
- `package.json` — add react-router-dom dep
- `src/main.tsx` — wrap App with BrowserRouter
- `src/App.tsx` — route state + tool orchestration (holds file/src/origSize/percent/mode/outUrl/outSize/cropRect/cropAspect/error; handleScale/handleDownload central; routes / /editor /editor/crop /editor/resize)
- `src/components/ToolPicker.tsx` — new bottom picker
- `src/components/CropToolPage.tsx` — absorbs crop overlay
- `src/components/ResizeToolPage.tsx` — absorbs OptionsPanel scale/mode
- `vite.config.ts` / `index.html` — no router base change needed (SPA)
- tests — route navigation + crop persistence

## Status
**Status:** In Progress
- [ ] add react-router-dom + main.tsx wrapper
- [ ] create ToolPicker / CropToolPage / ResizeToolPage
- [ ] refactor App.tsx to routes
- [ ] verify tsc -b && vite build
- [ ] add 2+ tests

## Review notes
Reuse scaleImage/cropImage/normalizeRect as-is; preserve monochrome dark tokens; MAX_SIDE 8000 guard unchanged; errors via error state.
