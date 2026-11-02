import type { ScaleMode } from "../lib/scale"
import { Chip } from "./ui"

const PRESETS = [25, 50, 100, 150, 200, 400]

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
            <Chip key={p} active={percent === p} onClick={() => onPercent(p)}>
              {p}%
            </Chip>
          ))}
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-3">
          <input
            type="range"
            min={10}
            max={400}
            step={5}
            value={percent}
            onChange={(e) => onPercent(Number(e.target.value))}
            className="flex-1 accent-white"
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={10}
              max={800}
              value={percent}
              onChange={(e) => onPercent(Math.max(10, Number(e.target.value) || 10))}
              className="w-20 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white text-center focus:outline-none focus:border-zinc-500"
            />
            <span className="text-sm text-zinc-500">%</span>
          </div>
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
