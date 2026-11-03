import { useEffect, useReducer, useRef, useState } from "react"
import { Eye, Scan } from "lucide-react"
import type { CropAspect, CropRect } from "../lib/crop"
import {
  type CropOp,
  conformRectToAspect,
  compose,
  defaultCropRect,
  type Op,
  previewScale,
  type Size,
} from "../lib/pipeline"
import { canvasToUrl } from "../lib/scale"
import { useComposedImage } from "../hooks/useComposedImage"
import { usePinchZoom } from "../hooks/usePinchZoom"
import { CropOverlay } from "../components/CropOverlay"
import { DimensionBadge } from "../components/chrome"
import { ToolPage, ToolDock } from "../components/ToolPage"

const ASPECTS: { label: string; value: CropAspect }[] = [
  { label: "Free", value: "free" },
  { label: "1:1", value: "1:1" },
  { label: "4:3", value: "4:3" },
  { label: "16:9", value: "16:9" },
  { label: "Original", value: "original" },
]

// crop tool: crops the composed stage. draft is seeded immediately and lives locally until Apply.
// result preview via live cropped compose; toggle flips between Result and Original.
export function CropToolScreen({ imgEl, origSize, baseOps, onApply }: CropToolScreenProps) {
  const { url, stageSize } = useComposedImage(imgEl, origSize, baseOps)
  const [draft, setDraft] = useReducer(
    (prev: CropRect | null, next: CropRect | null | ((p: CropRect | null) => CropRect | null)) =>
      typeof next === "function" ? (next as (p: CropRect | null) => CropRect | null)(prev) : next,
    null as CropRect | null,
  )
  const [aspect, setAspect] = useState<CropAspect>("free")
  const [showResult, setShowResult] = useState(true)
  const [zoomedUrl, setZoomedUrl] = useState<string | null>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const pinch = usePinchZoom(heroRef)
  const lastTapRef = useRef(0)

  // seed / reseed the centered 80% draft whenever the stage changes
  useEffect(() => {
    if (!origSize || stageSize.w < 1) return
    setDraft((prev) => {
      if (prev && prev.x + prev.width <= stageSize.w && prev.y + prev.height <= stageSize.h) {
        return prev
      }
      return defaultCropRect(stageSize)
    })
  }, [origSize, stageSize])

  // reset to Result on each entry or stage change
  useEffect(() => {
    if (!origSize || stageSize.w < 1) return
    setShowResult(true)
  }, [origSize, stageSize.w, stageSize.h])

  // disable pinch when zoomed, keep scale at 1
  useEffect(() => {
    if (showResult) pinch.reset()
  }, [showResult]) // eslint-disable-line react-hooks/exhaustive-deps

  // live cropped compose for zoomed preview, debounce 50ms
  useEffect(() => {
    if (!imgEl || !origSize || !draft) {
      setZoomedUrl(null)
      return
    }
    if (imgEl instanceof HTMLImageElement && (!imgEl.complete || imgEl.naturalWidth === 0)) return
    if (stageSize.w < 1 || draft.width < 1 || draft.height < 1) {
      setZoomedUrl(null)
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      try {
        const cropOp: CropOp = { type: "crop", rect: draft, aspect }
        const ops: Op[] = [...baseOps, cropOp]
        const croppedStage = { w: draft.width, h: draft.height }
        const scale = previewScale(croppedStage, 900)
        const result = compose(imgEl, origSize, ops, scale)
        let dataUrl: string
        try {
          dataUrl = canvasToUrl(result.canvas, "jpeg")
        } catch {
          dataUrl = canvasToUrl(result.canvas, "png")
        }
        if (!cancelled) setZoomedUrl(dataUrl)
      } catch (e) {
        if (!cancelled) console.error("[compose]", e)
      }
    }, 50)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [imgEl, origSize, baseOps, draft, aspect, stageSize.w, stageSize.h])

  function handleAspect(a: CropAspect) {
    setAspect(a)
    if (!draft) return
    const next = conformRectToAspect(draft, a, stageSize)
    setDraft({
      x: Math.round(next.x),
      y: Math.round(next.y),
      width: Math.round(next.width),
      height: Math.round(next.height),
    })
  }

  function handleApply() {
    if (!draft || !origSize) return
    onApply({ type: "crop", rect: draft, aspect })
  }

  function toggleResult() {
    setShowResult((v) => !v)
  }

  function handleHeroTap() {
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      toggleResult()
      lastTapRef.current = 0
      return
    }
    lastTapRef.current = now
  }

  const displayUrl = showResult && zoomedUrl ? zoomedUrl : url
  const pinchActive = !showResult
  const bindProps = pinchActive ? (pinch.bind() as unknown as Record<string, unknown>) : {}
  const badgeVisible = !!origSize && stageSize.w > 0 && stageSize.h > 0 && !!url

  return (
    <ToolPage title="Crop" backHref="/editor" onApply={handleApply} applyDisabled={!draft}>
      <div className="flex-1 min-h-0 flex flex-col px-3 pt-4">
        <div
          ref={heroRef}
          onClick={handleHeroTap}
          className="relative flex-1 rounded-[18px] overflow-hidden bg-black min-h-[320px] select-none"
          {...bindProps}
        >
          {displayUrl && stageSize.w > 0 && draft ? (
            <>
              <div
                className="absolute inset-0"
                style={
                  pinchActive && (pinch.scale !== 1 || pinch.tx !== 0 || pinch.ty !== 0)
                    ? {
                        transform: `translate(${pinch.tx}px, ${pinch.ty}px) scale(${pinch.scale})`,
                        transformOrigin: "center center",
                      }
                    : undefined
                }
              >
                <img
                  src={displayUrl}
                  alt="crop canvas"
                  className="absolute inset-0 h-full w-full object-contain"
                  style={{ transition: "opacity 180ms ease" }}
                />
              </div>
              <div style={{ transition: "opacity 180ms ease" }}>
                <CropOverlay
                  naturalSize={stageSize}
                  rect={draft}
                  aspect={aspect}
                  onRectChange={setDraft}
                  onAspectChange={() => {}}
                />
              </div>
              <button
                type="button"
                aria-label={showResult ? "Show original" : "Show result"}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleResult()
                }}
                className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-black/60 backdrop-blur grid place-items-center text-white border border-white/20 active:scale-95 transition"
              >
                {showResult ? <Eye size={16} /> : <Scan size={16} />}
              </button>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs text-zinc-500">Rendering…</span>
            </div>
          )}
          <DimensionBadge w={stageSize.w} h={stageSize.h} visible={badgeVisible} />
        </div>
      </div>

      <ToolDock>
        <div className="flex gap-2 justify-between">
          {ASPECTS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => handleAspect(p.value)}
              className={`flex-1 h-11 rounded-full text-[13px] font-medium transition active:scale-[0.98] ${
                aspect === p.value ? "bg-white text-black" : "bg-white/10 text-zinc-300"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500 px-1">
          Drag to move, handles to resize. {aspect !== "free" ? "Ratio locked." : "Free ratio."}
        </p>
      </ToolDock>
    </ToolPage>
  )
}

type CropToolScreenProps = {
  imgEl: HTMLImageElement | null
  origSize: Size | null
  baseOps: Op[]
  onApply: (op: CropOp) => void
}
