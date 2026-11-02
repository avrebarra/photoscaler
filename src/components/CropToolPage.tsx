import { useEffect, useState } from "react"
import type { CropAspect, CropRect } from "../lib/crop"
import {
  type CropOp,
  conformRectToAspect,
  defaultCropRect,
  type Op,
  type Size,
} from "../lib/pipeline"
import { useComposedImage } from "../hooks/useComposedImage"
import { CropOverlay } from "./CropOverlay"
import { ToolPage, ToolDock } from "./ToolPage"

const ASPECTS: { label: string; value: CropAspect }[] = [
  { label: "Free", value: "free" },
  { label: "1:1", value: "1:1" },
  { label: "4:3", value: "4:3" },
  { label: "16:9", value: "16:9" },
  { label: "Original", value: "original" },
]

// crop tool: crops the composed stage (everything applied so far). the draft
// is seeded immediately — no Enable button — and lives locally until Apply.
export function CropToolPage({
  imgEl,
  origSize,
  baseOps,
  onApply,
}: {
  imgEl: HTMLImageElement | null
  origSize: Size | null
  baseOps: Op[]
  onApply: (op: CropOp) => void
}) {
  const { url, stageSize } = useComposedImage(imgEl, origSize, baseOps)
  const [draft, setDraft] = useState<CropRect | null>(null)
  const [aspect, setAspect] = useState<CropAspect>("free")

  // seed / reseed the centered 80% draft whenever the stage changes
  // (first mount, or returning after another tool applied an op)
  useEffect(() => {
    if (!origSize || stageSize.w < 1) return
    setDraft((prev) => {
      if (prev && prev.width > 0 && stageSize.w === prev.width + prev.height) return prev
      if (prev && stageSize.w > 0) {
        if (prev.x + prev.width <= stageSize.w && prev.y + prev.height <= stageSize.h) return prev
      }
      return defaultCropRect(stageSize)
    })
  }, [origSize, stageSize])

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

  return (
    <ToolPage title="Crop" backHref="/editor" onApply={handleApply} applyDisabled={!draft}>
      {/* hero — letterboxed: blurred cover backdrop + object-contain foreground, overlay percent-based */}
      <div className="flex-1 min-h-0 flex flex-col px-3 pt-4">
        <div className="relative flex-1 rounded-[18px] overflow-hidden bg-black min-h-[320px]">
          {url && stageSize.w > 0 && draft ? (
            <>
              <img
                src={url}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full object-cover blur-2xl scale-110 opacity-40"
              />
              <img
                src={url}
                alt="crop canvas"
                className="absolute inset-0 h-full w-full object-contain"
              />
              <CropOverlay
                naturalSize={stageSize}
                rect={draft}
                aspect={aspect}
                onRectChange={setDraft}
                onAspectChange={() => {}}
              />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs text-zinc-500">Rendering…</span>
            </div>
          )}
        </div>
      </div>

      {/* dock — horizontal centered chips, mockup parity; hint copy kept below row in small text */}
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
