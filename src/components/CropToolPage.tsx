import type { CropAspect, CropRect } from "../lib/crop"
import { CropOverlay } from "./CropOverlay"
import { Chip } from "./ui"

const CROP_PRESETS: { label: string; value: CropAspect }[] = [
  { label: "Free", value: "free" },
  { label: "1:1", value: "1:1" },
  { label: "4:3", value: "4:3" },
  { label: "16:9", value: "16:9" },
  { label: "Original", value: "original" },
]

export function CropToolPage({
  cropRect,
  cropAspect,
  onCropRectChange,
  onCropAspectChange,
  onApply,
  onBack,
  src,
  naturalSize,
  onReset,
}: {
  cropRect: CropRect | null
  cropAspect: CropAspect
  onCropRectChange: (r: CropRect | null) => void
  onCropAspectChange: (a: CropAspect) => void
  onApply: () => void
  onBack: () => void
  src?: string | null
  naturalSize?: { w: number; h: number } | null
  onReset?: () => void
}) {
  function handleEnableCrop() {
    if (!naturalSize) return
    const w = naturalSize.w
    const h = naturalSize.h
    const cw = Math.max(1, Math.round(w * 0.8))
    const ch = Math.max(1, Math.round(h * 0.8))
    const x = Math.round((w - cw) / 2)
    const y = Math.round((h - ch) / 2)
    let rect: CropRect = { x, y, width: cw, height: ch }
    if (cropAspect !== "free") {
      let ratio: number
      if (cropAspect === "1:1") ratio = 1
      else if (cropAspect === "4:3") ratio = 4 / 3
      else if (cropAspect === "16:9") ratio = 16 / 9
      else ratio = w / h
      const cx = x + cw / 2
      const cy = y + ch / 2
      let newW = cw
      let newH = ch
      if (newW / newH > ratio) newW = newH * ratio
      else newH = newW / ratio
      newW = Math.round(newW)
      newH = Math.round(newH)
      rect = {
        x: Math.max(0, Math.round(cx - newW / 2)),
        y: Math.max(0, Math.round(cy - newH / 2)),
        width: newW,
        height: newH,
      }
    }
    onCropRectChange(rect)
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full bg-zinc-800 px-4 py-1.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          ← Back
        </button>
        <h2 className="text-sm font-bold text-white">Crop</h2>
        <div className="w-16" />
      </div>

      {src && naturalSize ? (
        <div className="flex flex-col gap-3">
          <div className="overflow-auto rounded-xl bg-black p-3 flex justify-center">
            <div className="relative inline-block max-h-[360px]">
              <img
                src={src}
                alt="crop preview"
                className="max-h-[360px] max-w-full object-contain rounded-lg block"
              />
              {cropRect && (
                <CropOverlay
                  naturalSize={naturalSize}
                  rect={cropRect}
                  aspect={cropAspect}
                  onRectChange={onCropRectChange}
                  onAspectChange={onCropAspectChange}
                />
              )}
            </div>
          </div>

          {!cropRect ? (
            <button
              type="button"
              onClick={handleEnableCrop}
              className="w-full rounded-full bg-white py-3 text-base font-semibold text-black hover:bg-zinc-100 transition-colors"
            >
              Enable crop
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-zinc-500">Crop aspect</span>
              <div className="flex flex-wrap gap-2">
                {CROP_PRESETS.map((p) => (
                  <Chip
                    key={p.value}
                    active={cropAspect === p.value}
                    onClick={() => onCropAspectChange(p.value)}
                  >
                    {p.label}
                  </Chip>
                ))}
              </div>
              <p className="text-xs text-zinc-500">
                Drag to move, handles to resize. {cropAspect !== "free" ? "Ratio locked." : "Free ratio."}
              </p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">No image loaded</p>
      )}

      <div className="flex gap-2">
        {cropRect && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="flex-1 rounded-full border border-zinc-700 bg-zinc-800 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Reset
          </button>
        )}
        <button
          type="button"
          onClick={onApply}
          className="flex-1 rounded-full bg-white py-3 text-base font-semibold text-black hover:bg-zinc-100 transition-colors"
        >
          Apply
        </button>
      </div>
    </section>
  )
}
