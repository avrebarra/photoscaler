import { useMemo, useState } from "react"
import type { ScaleMode } from "../lib/scale"
import type { Op, ResizeOp, Size } from "../lib/pipeline"
import { useComposedImage } from "../hooks/useComposedImage"
import { Chip } from "./ui"
import { ToolPage, ToolDock } from "./ToolPage"

const PRESETS = [25, 50, 100, 150, 200, 400]
const MAX_SIDE = 8000

function clampPercent(raw: number, origW: number | null): number {
  if (origW == null || origW <= 0) return Math.max(10, Math.min(400, raw))
  const maxPercent = Math.floor((MAX_SIDE / origW) * 100)
  const upper = Math.max(10, maxPercent)
  return Math.min(upper, Math.max(10, raw))
}

function clampNoiseStrength(v: number): number {
  if (!Number.isFinite(v)) return 35
  return Math.max(0, Math.min(100, Math.round(v)))
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
  const [noiseStrength, setNoiseStrength] = useState(35)

  const draftOps = useMemo<Op[]>(() => {
    const op: ResizeOp =
      mode === "noise"
        ? { type: "resize", percent, mode, noiseStrength }
        : { type: "resize", percent, mode }
    return [...baseOps, op]
  }, [baseOps, percent, mode, noiseStrength])
  const { url, stageSize: outSize } = useComposedImage(imgEl, origSize, draftOps)

  const clampW = origSize?.w ?? null
  const maxPercent = clampW ? Math.floor((MAX_SIDE / clampW) * 100) : 400
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
    if (mode === "noise") {
      onApply({ type: "resize", percent, mode, noiseStrength: clampNoiseStrength(noiseStrength) })
    } else {
      onApply({ type: "resize", percent, mode })
    }
  }

  return (
    <ToolPage title="Resize" backHref="/editor" onApply={handleApply}>
      {/* hero — letterboxed: blurred cover backdrop + object-contain foreground */}
      <div className="flex-1 min-h-0 flex flex-col px-3 pt-4">
        <div className="relative flex-1 rounded-[18px] overflow-hidden bg-black min-h-[320px]">
          {url ? (
            <>
              <img
                src={url}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full object-cover blur-2xl scale-110 opacity-40"
              />
              <img
                src={url}
                alt="resize canvas"
                className="absolute inset-0 h-full w-full object-contain"
              />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs text-zinc-500">Rendering…</span>
            </div>
          )}
        </div>
      </div>

      {/* dock — horizontal centered per mockup */}
      <ToolDock>
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-medium text-zinc-500">Scale · {percent}%</span>
          {displayW != null && displayH != null && (
            <span className="text-xs text-zinc-400">Output: {displayW} × {displayH} px</span>
          )}
        </div>
        {/* preset row — mockup: flex gap-1.5 justify-between, flex-1 h-10 */}
        <div className="flex gap-1.5 justify-between">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handlePreset(p)}
              className={`flex-1 h-10 rounded-full text-[12.5px] font-medium tabular-nums transition active:scale-[0.98] ${
                percent === p ? "bg-white text-black" : "bg-white/10 text-zinc-300"
              }`}
            >
              {p}%
            </button>
          ))}
        </div>

        {/* slider row — mockup: flex items-center gap-3.5 px-1.5, range flex-1 accent-white */}
        <div className="flex items-center gap-3.5 px-1.5">
          <input
            type="range"
            min={10}
            max={Math.max(10, Math.min(400, maxPercent))}
            step={5}
            value={Math.min(percent, Math.max(10, Math.min(400, maxPercent)))}
            onChange={handleSliderChange}
            className="flex-1 accent-white"
          />
          <span className="text-[14.5px] font-medium tabular-nums text-zinc-100 w-[52px] text-right">
            {percent}%
          </span>
        </div>

        {/* numeric percent input — kept for parity inside dock */}
        <div className="flex items-center gap-2 rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-3 shadow-[inset_0_1px_4px_rgba(0,0,0,0.4)]">
          <span className="text-xs font-medium text-zinc-500 shrink-0">Scale</span>
          <input
            type="number"
            min={10}
            max={clampW ? Math.max(10, maxPercent) : 800}
            value={percent}
            onChange={handlePercentChange}
            className="flex-1 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white text-center focus:outline-none focus:border-zinc-500 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]"
          />
          <span className="text-sm text-zinc-500">%</span>
        </div>

        {/* editable target width — aspect locked, height derived */}
        <div className="flex items-center gap-2 rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-3 shadow-[inset_0_1px_4px_rgba(0,0,0,0.4)]">
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
            className="flex-1 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white text-center focus:outline-none focus:border-zinc-500 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] disabled:opacity-40 disabled:cursor-not-allowed"
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
            <Chip active={mode === "noise"} onClick={() => setMode("noise")}>
              Noise (grain)
            </Chip>
          </div>
          <p className="text-xs text-zinc-500">
            {mode === "smooth"
              ? "Bilinear-like · good for photos"
              : mode === "pixelate"
                ? "Nearest-neighbor · keeps hard pixels"
                : "Smooth scale + old-photo grain · strength controls intensity"}
          </p>
        </div>

        {mode === "noise" && (
          <div className="flex flex-col gap-2 rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">Grain strength</span>
              <span className="text-xs text-zinc-400">{noiseStrength}</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                aria-label="Grain strength"
                min={0}
                max={100}
                step={1}
                value={noiseStrength}
                onChange={(e) => setNoiseStrength(clampNoiseStrength(Number(e.target.value)))}
                className="flex-1 accent-white"
              />
              <input
                type="number"
                aria-label="Grain strength value"
                min={0}
                max={100}
                value={noiseStrength}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (!Number.isFinite(v)) return
                  setNoiseStrength(clampNoiseStrength(v))
                }}
                className="w-20 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white text-center focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>
        )}
      </ToolDock>
    </ToolPage>
  )
}
