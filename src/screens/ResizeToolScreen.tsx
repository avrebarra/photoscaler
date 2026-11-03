import { useEffect, useMemo, useRef, useState } from "react"
import type { ScaleMode } from "../lib/scale"
import type { Op, ResizeOp, Size } from "../lib/pipeline"
import { useComposedImage } from "../hooks/useComposedImage"
import { usePinchZoom } from "../hooks/usePinchZoom"
import { DimensionBadge } from "../components/chrome"
import { ToolPage, ToolDock } from "../components/ToolPage"
import { DragSlider } from "../components/DragSlider"
import { TickDial } from "../components/TickDial"

const MAX_SIDE = 8000

export function ResizeToolScreen({ imgEl, origSize, baseOps, onApply }: ResizeToolScreenProps) {
  const [subtool, setSubtool] = useState<SubtoolId>("size")
  const [percent, setPercent] = useState(100)
  const [mode, setMode] = useState<ScaleMode>("smooth")
  const [grainStrength, setGrainStrength] = useState(0)

  const draftOps = useMemo<Op[]>(() => {
    const op: ResizeOp =
      grainStrength > 0
        ? { type: "resize", percent, mode, grainStrength }
        : { type: "resize", percent, mode }
    return [...baseOps, op]
  }, [baseOps, percent, mode, grainStrength])

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
    !!origSize && computedW != null && computedH != null && computedW > 0 && computedH > 0

  function handleApply() {
    if (grainStrength > 0) {
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

          <DimensionBadge w={computedW ?? 0} h={computedH ?? 0} visible={badgeVisible} />
        </div>
      </div>

      <ToolDock>
        {subtool === "size" && <SubtoolLabel>SCALE</SubtoolLabel>}
        {subtool === "interpolation" && <SubtoolLabel>INTERPOLATION</SubtoolLabel>}
        {subtool === "grain" && <SubtoolLabel>GRAIN STRENGTH</SubtoolLabel>}

        <SubtoolTabs active={subtool} onPick={setSubtool} />

        {subtool === "size" && (
          <TickDial
            percent={percent}
            minPercent={minPercent}
            maxPercent={maxPercent}
            onChange={(next) => setPercent(clampPercent(next, origSize))}
          />
        )}
        {subtool === "interpolation" && <ChoiceControl value={mode} onPick={setMode} />}
        {subtool === "grain" && (
          <DragSlider
            value={grainStrength}
            min={0}
            max={100}
            onChange={(next) => setGrainStrength(clampGrainStrength(next))}
            ariaLabel="Grain strength"
          />
        )}
      </ToolDock>
    </ToolPage>
  )
}

// supporting functions

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
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(100, Math.round(v)))
}

// subcomponents

function SubtoolTabs({ active, onPick }: SubtoolTabsProps) {
  return (
    <div data-component="SubtoolTabs" className="flex gap-6 justify-center">
      <button
        type="button"
        aria-label="Size"
        aria-pressed={active === "size"}
        onClick={() => onPick("size")}
        className="relative flex flex-col items-center transition active:scale-[0.96]"
      >
        <span
          className={`grid place-items-center h-[52px] w-[52px] rounded-full border transition ${active === "size" ? "border-amber-400 text-white bg-white/5" : "border-white/20 text-zinc-400 active:bg-white/10"}`}
        >
          <IconScale />
        </span>
      </button>
      <button
        type="button"
        aria-label="Interpolation"
        aria-pressed={active === "interpolation"}
        onClick={() => onPick("interpolation")}
        className="relative flex flex-col items-center transition active:scale-[0.96]"
      >
        <span
          className={`grid place-items-center h-[52px] w-[52px] rounded-full border transition ${active === "interpolation" ? "border-amber-400 text-white bg-white/5" : "border-white/20 text-zinc-400 active:bg-white/10"}`}
        >
          <IconSmooth />
        </span>
      </button>
      <button
        type="button"
        aria-label="Grain"
        aria-pressed={active === "grain"}
        onClick={() => onPick("grain")}
        className="relative flex flex-col items-center transition active:scale-[0.96]"
      >
        <span
          className={`grid place-items-center h-[52px] w-[52px] rounded-full border transition ${active === "grain" ? "border-amber-400 text-white bg-white/5" : "border-white/20 text-zinc-400 active:bg-white/10"}`}
        >
          <IconGrain />
        </span>
      </button>
    </div>
  )
}

function SubtoolLabel({ children }: { children: string }) {
  return (
    <div data-component="SubtoolLabel" className="flex justify-center">
      <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-zinc-400">
        {children}
      </span>
    </div>
  )
}

function ChoiceControl({ value, onPick }: ChoiceControlProps) {
  return (
    <div
      data-component="ChoiceControl"
      className="flex rounded-full bg-zinc-900 border border-white/[0.06] p-1"
    >
      <button
        type="button"
        aria-pressed={value === "smooth"}
        onClick={() => onPick("smooth")}
        className={`flex-1 h-11 rounded-full text-[13px] font-medium transition active:scale-[0.98] ${value === "smooth" ? "bg-white text-black" : "text-zinc-400 active:bg-white/10"}`}
      >
        Blur
      </button>
      <button
        type="button"
        aria-pressed={value === "lanczos"}
        onClick={() => onPick("lanczos")}
        className={`flex-1 h-11 rounded-full text-[13px] font-medium transition active:scale-[0.98] ${value === "lanczos" ? "bg-white text-black" : "text-zinc-400 active:bg-white/10"}`}
      >
        Lanczos
      </button>
      <button
        type="button"
        aria-pressed={value === "pixelate"}
        onClick={() => onPick("pixelate")}
        className={`flex-1 h-11 rounded-full text-[13px] font-medium transition active:scale-[0.98] ${value === "pixelate" ? "bg-white text-black" : "text-zinc-400 active:bg-white/10"}`}
      >
        Pixelate
      </button>
    </div>
  )
}

function IconScale() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  )
}

function IconSmooth() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 12c.6.5 1.2 1 2.5 1C7 13 7 11 9.5 11c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    </svg>
  )
}

function IconGrain() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <circle cx="5" cy="5" r="1.6" />
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="19" cy="5" r="1.6" />
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
      <circle cx="5" cy="19" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
      <circle cx="19" cy="19" r="1.6" />
    </svg>
  )
}

// types

type SubtoolId = "size" | "interpolation" | "grain"

type ResizeToolScreenProps = {
  imgEl: HTMLImageElement | null
  origSize: Size | null
  baseOps: Op[]
  onApply: (op: ResizeOp) => void
}

type SubtoolTabsProps = {
  active: SubtoolId
  onPick(id: SubtoolId): void
}

type ChoiceControlProps = {
  value: ScaleMode
  onPick(v: ScaleMode): void
}
