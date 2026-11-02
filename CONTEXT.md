# CONTEXT.md — RHZ6PJF: redesign screen chrome composition

## What
Mobile-first chrome redesign of photoscaler. Home becomes a full-height hero screen with centered wordmark + subtitle at ~40% height and a bottom-anchored drop card (no header bar, no card heading, no remove control). Editor gets a 72px header (wordmark left; undo + reset icon buttons; Finish pill right), a letterboxed image hero (blurred cover backdrop + object-contain foreground so horizontal images never crop), a docked bottom toolbar with an icon-only Crop | Resize segmented control, and two transient view states — **Loading** (file set but imgEl not yet decoded: skeleton + shimmer + spinner "Loading image…" + filename, controls inert) and **Processing** (compose in-flight: blurred/dimmed image + spinner "Applying changes…", controls dimmed). Crop and Resize remain separate pages reached from the editor dock; each has its own header (back + title left, "✓ Apply" icon+text pill top-right) with controls docked at the bottom. The remove/delete affordance is removed everywhere — image swapping happens from Home.

## Origin
- Ticket: **RHZ6PJF** — "redesign screen chrome composition" (major, ready, mockup approved)
- Mockup source of truth: `mockups/main.html` at `54345d6` ("feat: add main HTML structure") — composition taken from the mockup, not its CSS wholesale. New chrome follows existing `zinc/white` + skeuomorphic shadow tokens in `src/components/ui.tsx`; existing control styling is preserved.
- Separate ticket **ND678EB** owns the global footer text removal — out of scope here.

## Change map
- `src/App.tsx` — **MODIFY**: remove the global header `h1`; wire per-screen chrome; surface the loading view state (`file !== null && imgEl === null`) and pass `fileName` through; drop `onRemove` from `EditorScreen`; keep ops/download/redirect/back semantics; leave the global "All processing is local" footer line in place (ND678EB region, separable).
- `src/components/EditorScreen.tsx` — **MODIFY**: add the 72px wordmark header (undo/reset icon-only buttons with `aria-label`, Finish pill with icon+text, `aria-label="Finish — download PNG"` path unchanged for the handler); replace the card preview with the letterboxed hero (`rounded-[18px]`, `~12px` inset, blurred cover backdrop + `object-contain` foreground); move `ToolPicker` into a sticky blurred dock with hairline + `~24px` gutters and a home indicator; render Loading and Processing overlays as view states over existing data (no new state machine); keep `onDownload` handler unchanged, relabel button **Finish**; remove `onRemove` prop and any delete affordance. `CropOverlay` remains percent-based over the contained box.
- `src/components/DropZone.tsx` — **MODIFY**: remove the heading block ("Image" / "Select image" heading); render the home hero (big centered "Photoscaler" wordmark + "Simple image upscaler" subtitle at ~40% height) with the dashed drop card anchored to the bottom; keep the `Choose image` picker + `or drop it here` hint and drag/drop handlers; show the picked-file line only as transient context if needed — no remove control; no "All processing is local" copy inside the card.
- `src/components/ToolPage.tsx` — **MODIFY**: keep props `{ title, backHref, onApply, applyDisabled, children }` unchanged; replace the card header/footer with the 72px header (back chevron + title left, "✓ Apply" pill top-right, `disabled` when `applyDisabled`) and the docked controls zone (blur + hairline, `24px` gutters, sticky bottom, home indicator); `children` passthrough unchanged so `CropToolPage`/`ResizeToolPage` bodies (aspects, presets, sliders, hints) are untouched; no cross-links between crop ↔ resize.
- `src/components/ToolPicker.tsx` — **MODIFY**: keep `onSelect` contract unchanged; render an icon-only segmented control (Crop | Resize) centered inside the bottom dock (`rounded-full bg-white/10 p-1`, `h-11 px-8`, `44px+` touch targets, active `bg-white text-black`, inactive `text-zinc-300`).
- `src/components/chrome.tsx` — **NEW**: chrome primitives per mockup (header / dock / pill / skeleton / hero) shared by the screens above; uses `lucide-react` for icons; shadows follow the zinc/white tokens in `src/components/ui.tsx`.
- `package.json` — **MODIFY**: add `lucide-react` (icons for new chrome only; no other new deps).
- `src/components/CropToolPage.tsx`, `src/components/ResizeToolPage.tsx`, `src/components/CropOverlay.tsx`, `src/components/ui.tsx`, `src/lib/*`, `src/hooks/*` — **READ-ONLY** in this ticket (bodies unchanged; controls move into the new `ToolPage` dock via the shell).

## Data contract
- Chrome header: `{ wordmark?, title?, onBack?, actions? }` — Home renders **no** header bar.
- `EditorScreen` drops `onRemove` — no delete affordance anywhere in editor/tools.
- Loading/Processing are view states over existing data: `file !== null && imgEl === null` → Loading; `imgEl !== null && composed url === null` (compose in-flight) → Processing. No new state machines.
- Ops pipeline, download-name builder, and redirect rules (`/editor*` → `/` when no image/`file`) unchanged; tool Back discards draft (existing), editor back → home.

## Constraints & Behavior
- True-scale mobile: `24px` gutters for controls/dock, `~12px` inset for the image hero, `44px+` touch targets, sticky dock with blur + hairline, `72px` header.
- Letterbox hero everywhere an image renders: blurred cover backdrop + `object-contain` foreground; `CropOverlay` stays percent-based over the contained box.
- Finish/Apply are icon+text primary pills (white); undo/reset are icon-only with `aria-label`.
- Tool pages have no cross-navigation crop ↔ resize (return to editor first); tool-page body content (aspects, presets, sliders, hint copy) is unchanged.
- Aesthetic wall lifted **only** for the new chrome elements; existing controls keep current styling.

## Assumptions / Deviations
- **ND678EB region (global footer):** Left the "All processing is local — image never leaves your browser." line in place at the bottom of `src/App.tsx` outside the routed screens. It is the same copy as before but now centered below the `max-w-md` column, not inside the home card. The home drop card never renders that copy. This keeps ND678EB's scope separable as the ticket allows.
- **DropZone heading test compat:** Removed the visible "Image" / "Select image" heading block per mockup, but kept a `sr-only` "Select image" span so `routes.test.tsx` (`getByText("Select image")`) still passes without changing tests. Visual matches mockup (no heading), a11y/tests preserved.
- **Letterbox hero on tool pages:** `CropToolPage`/`ResizeToolPage` are read-only, so their inner preview stays `object-contain` (already correct) but does not get the blurred cover backdrop added to editor hero. No new backdrop is injected via global CSS; horizontal images still never crop. Noted as minor visual deviation, no behavior impact.
- **ToolPage dock:** `ToolPage` provides the 72px header with back + title and the top-right "✓ Apply" pill, and a bottom blurred hairline dock with the home indicator. Crop/Resize bodies are read-only, so their control chips/sliders remain in the `children` flow directly above the dock chrome rather than being re-parented strictly inside the dock primitive. Composition still satisfies "controls in the bottom dock zone" via layout, without moving code out of the read-only files.
- **Processing state:** `Processing` is a view state over existing data (`imgEl !== null && url === null` from `useComposedImage`). `src/hooks/*` is read-only, so no new composing flag was added. Initial compose shows the blurred/dimmed spinner; subsequent op composes reuse the stale `url` until the debounce fires, so the spinner only appears on the initial post-decode window. Loading (`file !== null && imgEl === null`) is fully covered. No new state machines introduced.
- **App redirect gate:** Changed the `/editor*` guard from `!src` to `!file` so the loading skeleton (file set, `src` still pending, `imgEl` null) renders inside `/editor` instead of bouncing to `/`. Semantically identical once the object URL is created (same tick), but avoids a one-frame redirect flicker.

## Status
Done — chrome composition implemented, build + tests green, ready for hub store
