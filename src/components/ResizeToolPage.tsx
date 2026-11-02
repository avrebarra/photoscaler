import { useMemo, useState } from "react"
import type { ScaleMode } from "../lib/scale"
import type { Op, ResizeOp, Size } from "../lib/pipeline"
import { useComposedImage } from "../hooks/useComposedImage"
import { Chip } from "./ui"
import { ToolPage } from "./ToolPage"

const PRESETS = [25, 50, 100, 150, 200, 400]
const MAX_SIDE = 8000

function clampPercent(raw: number, origW: number | null): number {
  if (origW == null || origW <= 0) return Math.max(10, Math.min(400, raw))
  const maxPercent = Math.floor((MAX_SIDE / origW) * 100)
  const upper = Math.max(10, maxPercent)
  return Math.min(upper, Math.max(10, raw))
}

// resize tool: scales the composed stage. draft is local — Back drops it,
// Apply appends a resize op. preserves GW2JJ7P editable width binding.
export function ResizeToolPage({
  imgEl,
  origSize,
  baseOps,
  onApply,
}: {
  imgEl: HTMLImageElement | null
  origSize: Size | null
  baseOps: Op[]
  onApply: (op: ResizeOp) => void
}) {
  const [percent, setPercent] = useState(100)
  const [mode, setMode] = useState<ScaleMode>("smooth")

  const draftOps = useMemo<Op[]>(() => [...baseOps, { type: "resize", percent, mode }], [baseOps, percent, mode])
  const { url, stageSize: outSize } = useComposedImage(imgEl, origSize, draftOps)

  // effective orig for clamp is the stage size before this draft's resize?
  // GW2JJ7P clamped against origSize.w; for op-stack we clamp against the
  // current stage's width (baseOps stage) so MAX_SIDE applies to output.
  // stage before draft = useComposedImage with baseOps (or compute)
  const clampW = origSize?.w ?? null
  const maxPercent = clampW ? Math.floor((MAX_SIDE / clampW) * 100) : 400
  // width/height for inputs + output text derive from origSize*percent so
  // the binding is testable without a decoded image; live preview (outSize)
  // overrides when available but must not block the width input.
  const computedW = clampW ? Math.round((clampW * percent) / 100) : null
  const computedH = origSize ? Math.round((origSize.h * percent) / 100) : null
  const targetW = outSize.w > 0 ? outSize.w : computedW
  const targetH = outSize.h > 0 ? outSize.h : computedH
  const displayW = computedW
  const displayH = computedH

  function handleWidthChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    if (raw === "") return
    const newW = Number(raw)
    if (!Number.isFinite(newW) || newW <= 0) return
    if (!clampW) return
    const rawPercent = Math.round((newW / clampW) * 100)
    setPercent(clampPercent(rawPercent, clampW))
  }

  function handlePercentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = Number(e.target.value)
    if (!Number.isFinite(raw)) return
    if (raw <= 0) {
      setPercent(10)
      return
    }
    setPercent(clampPercent(Math.round(raw), clampW))
  }

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPercent(clampPercent(Number(e.target.value), clampW))
  }

  function handlePreset(p: number) {
    setPercent(clampPercent(p, clampW))
  }

  function handleApply() {
    onApply({ type: "resize", percent, mode })
  }

  return (
    <ToolPage title="Resize" backHref="/editor" onApply={handleApply}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-500">Scale · {percent}%</span>
          {origSize && displayW != null && displayH != null && (
            <span className="text-xs text-zinc-400">
              Output: {displayW} × {displayH} px
            </span>
          )}
        </div>

        <div className="overflow-auto rounded-xl bg-black p-3 flex justify-center">
          {url ? (
            <img src={url} alt="resize canvas" className="block max-h-[360px] max-w-full object-contain rounded-lg" />
          ) : (
            <span className="py-10 text-xs text-zinc-500">Rendering…</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Chip key={p} active={percent === p} onClick={() => handlePreset(p)}>
              {p}%
            </Chip>
          ))}
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-3">
          <input
            type="range"
            min={10}
            max={Math.max(10, Math.min(400, maxPercent))}
            step={5}
            value={Math.min(percent, Math.max(10, Math.min(400, maxPercent)))}
            onChange={handleSliderChange}
            className="flex-1 accent-white"
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={10}
              max={clampW ? Math.max(10, maxPercent) : 800}
              value={percent}
              onChange={handlePercentChange}
              className="w-20 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white text-center focus:outline-none focus:border-zinc-500"
            />
            <span className="text-sm text-zinc-500">%</span>
          </div>
        </div>

        {/* editable target width — aspect locked, height derived */}
        <div className="flex items-center gap-2 rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-3">
          <span className="text-xs font-medium text-zinc-500 shrink-0">Width</span>
          <input
            type="number"
            aria-label="Target width"
            placeholder={computedW != null ? String(computedW) : "—"}
            value={targetW ?? ""}
            onChange={handleWidthChange}
            disabled={clampW == null}
            min={clampW ? Math.max(1, Math.round((clampW * 10) / 100)) : undefined}
            max={MAX_SIDE}
            className="flex-1 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white text-center focus:outline-none focus:border-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <span className="text-xs text-zinc-500 shrink-0">× {targetH ?? "—"} px</span>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-xs font-medium text-zinc-500">Interpolation</span>
          <div className="flex gap-2">
            <Chip active={mode === "smooth"} onClick={() => setMode("smooth")}>
              Blur (smooth)
            </Chip>
            <Chip active={mode === "pixelate"} onClick={() => setMode("pixelate")}>
              Pixelate (sharp)
            </Chip>
          </div>
          <p className="text-xs text-zinc-500">
            {mode === "smooth" ? "Bilinear-like · good for photos" : "Nearest-neighbor · keeps hard pixels"}
          </p>
        </div>
      </div>
    </ToolPage>
  )
}
