import type { ScaleMode } from "../lib/scale"
import { Chip } from "./ui"

const PRESETS = [25, 50, 100, 150, 200, 400]
const MAX_SIDE = 8000

function clampPercent(raw: number, origW: number | null): number {
  if (origW == null || origW <= 0) return Math.max(10, Math.min(400, raw))
  const maxPercent = Math.floor((MAX_SIDE / origW) * 100)
  const upper = Math.max(10, maxPercent)
  return Math.min(upper, Math.max(10, raw))
}

export function ResizeToolPage({
  percent,
  onPercent,
  mode,
  onMode,
  origSize,
  onApply,
  onBack,
}: {
  percent: number
  onPercent: (n: number) => void
  mode: ScaleMode
  onMode: (m: ScaleMode) => void
  origSize: { w: number; h: number } | null
  onApply: () => void
  onBack: () => void
}) {
  // derived target dimensions (aspect-locked)
  const targetW = origSize ? Math.round((origSize.w * percent) / 100) : null
  const targetH = origSize ? Math.round((origSize.h * percent) / 100) : null
  const maxPercent = origSize ? Math.floor((MAX_SIDE / origSize.w) * 100) : 400

  function handleWidthChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    if (raw === "") return
    const newW = Number(raw)
    if (!Number.isFinite(newW) || newW <= 0) return
    if (!origSize) return
    const rawPercent = Math.round((newW / origSize.w) * 100)
    const clamped = clampPercent(rawPercent, origSize.w)
    onPercent(clamped)
  }

  function handlePercentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = Number(e.target.value)
    if (!Number.isFinite(raw)) return
    if (raw <= 0) {
      onPercent(10)
      return
    }
    onPercent(clampPercent(Math.round(raw), origSize?.w ?? null))
  }

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    onPercent(clampPercent(Number(e.target.value), origSize?.w ?? null))
  }

  function handlePreset(p: number) {
    onPercent(clampPercent(p, origSize?.w ?? null))
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full bg-zinc-800 px-4 py-1.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          ← Back
        </button>
        <h2 className="text-sm font-bold text-white">Resize</h2>
        <div className="w-16" />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-500">Scale · {percent}%</span>
          {origSize && (
            <span className="text-xs text-zinc-400">
              Output: {Math.round((origSize.w * percent) / 100)} × {Math.round((origSize.h * percent) / 100)} px
            </span>
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
              max={origSize ? Math.max(10, maxPercent) : 800}
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
            placeholder={origSize ? String(targetW) : "—"}
            value={targetW ?? ""}
            onChange={handleWidthChange}
            disabled={!origSize}
            min={origSize ? Math.max(1, Math.round((origSize.w * 10) / 100)) : undefined}
            max={origSize ? MAX_SIDE : undefined}
            className="flex-1 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white text-center focus:outline-none focus:border-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <span className="text-xs text-zinc-500 shrink-0">
            × {targetH ?? "—"} px
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-xs font-medium text-zinc-500">Interpolation</span>
        <div className="flex gap-2">
          <Chip active={mode === "smooth"} onClick={() => onMode("smooth")}>
            Blur (smooth)
          </Chip>
          <Chip active={mode === "pixelate"} onClick={() => onMode("pixelate")}>
            Pixelate (sharp)
          </Chip>
        </div>
        <p className="text-xs text-zinc-500">
          {mode === "smooth" ? "Bilinear-like · good for photos" : "Nearest-neighbor · keeps hard pixels"}
        </p>
      </div>

      <button
        type="button"
        onClick={onApply}
        className="w-full rounded-full bg-white py-3 text-base font-semibold text-black hover:bg-zinc-100 transition-colors"
      >
        Apply
      </button>
    </section>
  )
}
