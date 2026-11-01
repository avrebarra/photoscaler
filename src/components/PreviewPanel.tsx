import type { ScaleMode } from "../lib/scale"
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

export function PreviewPanel({
  src,
  outUrl,
  outSize,
  percent,
  mode,
  onDownload,
  onClear,
  naturalSize,
  cropRect,
  cropAspect,
  onCropRectChange,
  onCropAspectChange,
  onCropReset,
  onCropError: _onCropError,
}: {
  src: string | null
  outUrl: string | null
  outSize: { w: number; h: number } | null
  percent: number
  mode: ScaleMode
  onDownload: () => void
  onClear: () => void
  naturalSize?: { w: number; h: number } | null
  cropRect?: CropRect | null
  cropAspect?: CropAspect
  onCropRectChange?: (rect: CropRect) => void
  onCropAspectChange?: (aspect: CropAspect) => void
  onCropReset?: () => void
  onCropError?: (msg: string) => void
}) {
  if (!src && !outUrl) return null

  // result-only card when we have output; otherwise preview of original
  const hasResult = Boolean(outUrl && outSize)

  const canCrop = Boolean(src && naturalSize)

  function handleEnableCrop() {
    if (!naturalSize || !onCropRectChange) return
    const w = naturalSize.w
    const h = naturalSize.h
    // start with centered 80% rect
    const cw = Math.max(1, Math.round(w * 0.8))
    const ch = Math.max(1, Math.round(h * 0.8))
    const x = Math.round((w - cw) / 2)
    const y = Math.round((h - ch) / 2)
    // if aspect is not free, adjust to ratio immediately
    let rect: CropRect = { x, y, width: cw, height: ch }
    if (cropAspect && cropAspect !== "free") {
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
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium text-zinc-500">Preview</p>
        <h2 className="text-lg font-bold text-white">
          {hasResult ? "Preview & Download" : "Preview"}
        </h2>
        {hasResult && outSize && (
          <p className="text-xs text-zinc-400">
            Result: {outSize.w} × {outSize.h} px · {mode} at {percent}%
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {src && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">
                {hasResult ? "Original" : "Original preview"}
              </span>
              {canCrop && !cropRect && (
                <button
                  type="button"
                  onClick={handleEnableCrop}
                  className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  Crop
                </button>
              )}
              {cropRect && onCropReset && (
                <button
                  type="button"
                  onClick={onCropReset}
                  className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  Reset crop
                </button>
              )}
            </div>

            <div className="overflow-auto rounded-xl bg-black p-3 flex justify-center">
              <div className="relative inline-block max-h-[360px]">
                <img
                  src={src}
                  alt="original preview"
                  className="max-h-[360px] max-w-full object-contain rounded-lg block"
                />
                {naturalSize &&
                  cropRect &&
                  onCropRectChange &&
                  cropAspect &&
                  onCropAspectChange && (
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

            {/* crop presets — only when cropping */}
            {cropRect && cropAspect && onCropAspectChange && (
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
                  Drag to move, handles to resize.{" "}
                  {cropAspect !== "free" ? "Ratio locked." : "Free ratio."}
                </p>
              </div>
            )}
          </div>
        )}

        {outUrl && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-zinc-500">Result</span>
            <div className="overflow-auto rounded-xl bg-black p-3 flex justify-center">
              <img
                src={outUrl}
                alt="scaled preview"
                className="max-h-[360px] max-w-full object-contain rounded-lg"
                style={{
                  imageRendering: mode === "pixelate" ? "pixelated" : "auto",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {hasResult && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onDownload}
            className="w-full rounded-full bg-white py-3 text-base font-semibold text-black hover:bg-zinc-100 transition-colors"
          >
            Download PNG
          </button>
          <button
            type="button"
            onClick={onClear}
            className="w-full rounded-full border border-zinc-700 bg-zinc-800 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Clear result
          </button>
        </div>
      )}
    </section>
  )
}
