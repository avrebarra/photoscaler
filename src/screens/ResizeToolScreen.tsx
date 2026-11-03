import { useEffect, useMemo, useRef, useState } from "react"
import { Settings, X } from "lucide-react"
import type { ScaleMode } from "../lib/scale"
import type { Op, ResizeOp, Size } from "../lib/pipeline"
import { useComposedImage } from "../hooks/useComposedImage"
import { usePinchZoom } from "../hooks/usePinchZoom"
import { Chip } from "../components/ui"
import { DimensionBadge } from "../components/chrome"
import { ToolPage, ToolDock } from "../components/ToolPage"
import { TickDial } from "../components/TickDial"

const MAX_SIDE = 8000

// resize tool: dial replaces slider, dimension badge + settings overlay (Snapseed-style).
// presets removed; numeric % / width inputs removed from main dock (available via dial drag/wheel/keys).
export function ResizeToolScreen({ imgEl, origSize, baseOps, onApply }: ResizeToolScreenProps) {
  const [percent, setPercent] = useState(100)
  const [mode, setMode] = useState<ScaleMode>("smooth")
  const [grainEnabled, setGrainEnabled] = useState(false)
  const [grainStrength, setGrainStrength] = useState(35)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const draftOps = useMemo<Op[]>(() => {
    const op: ResizeOp = grainEnabled
      ? { type: "resize", percent, mode, grainStrength }
      : { type: "resize", percent, mode }
    return [...baseOps, op]
  }, [baseOps, percent, mode, grainEnabled, grainStrength])

  const { url } = useComposedImage(imgEl, origSize, draftOps)

  const previewRef = useRef<HTMLDivElement>(null)
  const { scale, tx, ty, reset, bind } = usePinchZoom(previewRef)

  useEffect(() => {
    reset()
  }, [url, reset])

  const minPercent = (() => {
    if (!origSize || origSize.w <= 0 || origSize.h <= 0) return 10
    return Math.max(1, Math.ceil((10 / Math.min(origSize.w, origSize.h)) * 100))
  })()
  const maxPercent = (() => {
    if (!origSize || origSize.w <= 0 || origSize.h <= 0) return 400
    return Math.max(10, Math.floor((MAX_SIDE / Math.max(origSize.w, origSize.h)) * 100))
  })()

  const computedW = origSize ? Math.round((origSize.w * percent) / 100) : null
  const computedH = origSize ? Math.round((origSize.h * percent) / 100) : null
  const badgeVisible =
    !!origSize &&
    computedW != null &&
    computedH != null &&
    computedW > 0 &&
    computedH > 0 &&
    !!url &&
    !settingsOpen

  function handleApply() {
    if (grainEnabled) {
      onApply({ type: "resize", percent, mode, grainStrength: clampGrainStrength(grainStrength) })
    } else {
      onApply({ type: "resize", percent, mode })
    }
  }

  return (
    <ToolPage title="Resize" backHref="/editor" onApply={handleApply}>
      <div className="flex-1 min-h-0 flex flex-col px-3 pt-4">
        <div
          ref={previewRef}
          {...(bind() as object)}
          style={{ touchAction: "none" }}
          className="relative flex-1 rounded-[18px] overflow-hidden bg-black min-h-[320px]"
        >
          {url ? (
            <img
              src={url}
              alt="resize canvas"
              style={{
                transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                transformOrigin: "center center",
              }}
              className="absolute inset-0 h-full w-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs text-zinc-500">Rendering…</span>
            </div>
          )}

          <DimensionBadge
            w={computedW ?? 0}
            h={computedH ?? 0}
            visible={badgeVisible}
          />

          {settingsOpen && (
            <div className="absolute inset-0 z-10 flex flex-col">
              <button
                type="button"
                aria-label="Close settings"
                onClick={() => setSettingsOpen(false)}
                className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
              />
              <div className="relative mt-auto mx-2 mb-2 rounded-[24px] border border-white/[0.08] bg-[rgba(9,9,11,0.96)] backdrop-blur-[22px] px-5 pt-4 pb-5 flex flex-col gap-4 shadow-[0_20px_50px_rgba(0,0,0,.5)]">
                <div className="flex items-center justify-between">
                  <span className="text-[14.5px] font-semibold text-white">Resize settings</span>
                  <button
                    type="button"
                    aria-label="Close settings"
                    onClick={() => setSettingsOpen(false)}
                    className="h-9 w-9 rounded-full grid place-items-center text-zinc-300 active:bg-white/10 transition"
                  >
                    <X size={17} strokeWidth={2} />
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-zinc-500">Interpolation</span>
                  <div className="flex gap-2">
                    <Chip active={mode === "smooth"} onClick={() => setMode("smooth")}>
                      Blur
                    </Chip>
                    <Chip active={mode === "lanczos"} onClick={() => setMode("lanczos")}>
                      Lanczos
                    </Chip>
                    <Chip active={mode === "pixelate"} onClick={() => setMode("pixelate")}>
                      Pixelate
                    </Chip>
                  </div>
                </div>

                <div className="flex flex-col gap-2 rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs font-medium text-zinc-500">
                      Grain (on top of blur)
                    </span>
                    <input
                      type="checkbox"
                      aria-label="Enable grain"
                      checked={grainEnabled}
                      onChange={(e) => setGrainEnabled(e.target.checked)}
                      className="accent-white"
                    />
                  </label>
                  {grainEnabled && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">Grain strength</span>
                        <span className="text-xs text-zinc-400 tabular-nums">{grainStrength}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          aria-label="Grain strength"
                          min={0}
                          max={100}
                          step={1}
                          value={grainStrength}
                          onChange={(e) =>
                            setGrainStrength(clampGrainStrength(Number(e.target.value)))
                          }
                          className="flex-1 accent-white"
                        />
                        <input
                          type="number"
                          aria-label="Grain strength value"
                          min={0}
                          max={100}
                          value={grainStrength}
                          onChange={(e) => {
                            const v = Number(e.target.value)
                            if (!Number.isFinite(v)) return
                            setGrainStrength(clampGrainStrength(v))
                          }}
                          className="w-20 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white text-center focus:outline-none focus:border-zinc-500"
                        />
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="h-10 rounded-full bg-white text-black text-[13.5px] font-semibold active:scale-[0.98] transition"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ToolDock>
        <div className="flex items-center gap-2">
          <span className="flex-1 text-center text-[24px] font-bold tracking-[-.01em] text-white tabular-nums leading-none">
            {percent}%
          </span>
          <button
            type="button"
            aria-label="Resize settings"
            onClick={() => setSettingsOpen(true)}
            className="shrink-0 h-9 w-9 rounded-full grid place-items-center bg-white/10 text-zinc-300 active:bg-white/20 transition"
          >
            <Settings size={16} strokeWidth={1.8} />
          </button>
        </div>

        <TickDial
          percent={percent}
          minPercent={minPercent}
          maxPercent={maxPercent}
          onChange={(next) => setPercent(clampPercent(next, origSize))}
        />
      </ToolDock>
    </ToolPage>
  )
}

function clampPercent(raw: number, origSize: Size | null): number {
  if (!origSize || origSize.w <= 0 || origSize.h <= 0) {
    return Math.max(10, Math.min(400, Math.round(raw)))
  }
  const minSide = Math.min(origSize.w, origSize.h)
  const maxSide = Math.max(origSize.w, origSize.h)
  const minPercent = Math.max(1, Math.ceil((10 / minSide) * 100))
  const maxPercent = Math.max(10, Math.floor((MAX_SIDE / maxSide) * 100))
  return Math.min(maxPercent, Math.max(minPercent, Math.round(raw)))
}

function clampGrainStrength(v: number): number {
  if (!Number.isFinite(v)) return 35
  return Math.max(0, Math.min(100, Math.round(v)))
}

type ResizeToolScreenProps = {
  imgEl: HTMLImageElement | null
  origSize: Size | null
  baseOps: Op[]
  onApply: (op: ResizeOp) => void
}
