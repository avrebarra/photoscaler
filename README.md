# Photoscaler

Simple single-image upscaler/downscaler - pick a percentage, choose `Blur (smooth)` vs `Pixelate (nearest-neighbor)`, preview, download. 100% client-side via Canvas API.

## Stack

Vite + React + TypeScript + Tailwind. No backend. `imageSmoothingEnabled` toggles interpolation.

## Run (Phase 1 - Web)

```bash
npm install
npm run dev    # http://localhost:5173
npm run build  # dist/
```

## Flow

1. Select image (single, drag-drop or picker)
2. Choose scale % (presets 25/50/100/150/200/400 + slider/number) and mode (smooth / pixelate)
3. Scale -> preview side-by-side -> Download PNG

Guards: max 8000px side, local `URL.createObjectURL` revoked on change.

## Phase 2 (planned) - Capacitor

Wrap same `dist` with Capacitor for iOS/Android. Add Share intent (`@capacitor/share` / `capacitor-plugin-file-picker`) so "Share -> Photoscaler" opens the same flow. No code changes to `src/lib/scale.ts` needed - just `capacitor.config.ts` + native shell.
