# CONTEXT — workpool/GW2JJ7P-editable-target-resize-dimensions

## What this branch is for
Add editable target width in resize controls (DHXFMVN's ResizeToolPage): show computed output W×H px and make width directly editable — typing width inverse-computes scale percent (clamped to 8000px max side, aspect-locked), height derived. Bidirectional: slider/percent ↔ width, via origSize.w.

## Origin
Ticket GW2JJ7P — editable-target-resize-dimensions. Builds on DHXFMVN branch workpool/DHXFMVN-tool-based-editor-flow-like-snapseed (merged via --no-ff into this workpool).

## Change map (diff → intent)
- `src/components/ResizeToolPage.tsx` — add width number input (value=targetW=round(origSize.w*percent/100), disabled when origSize null), onChange inverse-computes clampedPercent=clamp(round(newW/origSize.w*100),10,floor(8000/origSize.w*100)), call onPercent(clamped); keep height derived; clamp helpers reused for slider/percent inputs; invalid NaN/empty ignored; show Output text already present.
- `src/App.tsx` — add clampPercent helper and wrap setPercent to enforce same bounds (10 .. floor(8000/effectiveOrigSize.w*100), floor at 10) so slider/chips/width all respect 8000px limit; pass effectiveOrigSize derived from cropRect.
- `src/resizeWidthBinding.test.tsx` — tests: width→percent conversion (1000×750 type 500 → 50%), percent→width sync, clamp boundary (type huge width → clamped to max), disabled/empty when origSize null, slider ↔ width sync.

## Status
**Status:** Done
- [x] merge DHXFMVN
- [x] edit ResizeToolPage + App clamp
- [x] tsc -b && vite build clean
- [x] width↔percent + clamp tests (vitest — 14 pass)

## Review notes
Aspect locked to source (no stretch, no toggle); max side 8000px silent clamp; invalid input ignored; image-load guard errors still surfaced via error state.
