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
import { Chip } from "./ui"
import { ToolPage } from "./ToolPage"

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
    // keep existing draft on aspect switches; only reseed on stage growth
    // or first mount. simplest: reseed when draft is null or stage changed
    // substantially — for now reseed on every stageSize change, preserving
    // aspect via conform. user can immediately drag anyway.
    setDraft((prev) => {
      if (prev && prev.width > 0 && stageSize.w === prev.width + prev.height) return prev
      // if already seeded and stage hasn't meaningfully changed, keep it
      if (prev && stageSize.w > 0) {
        // stageSize is the new base for crops; keep prev only if it still fits
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
      <div className="flex flex-col gap-3">
        <div className="overflow-auto rounded-xl bg-black p-3 flex justify-center shadow-[inset_0_2px_8px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(0,0,0,0.4)]">
          <div className="relative inline-block">
            {url && stageSize.w > 0 && draft ? (
              <>
                <img
                  src={url}
                  alt="crop canvas"
                  className="block max-h-[360px] max-w-full object-contain rounded-lg"
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
              <span className="py-10 text-xs text-zinc-500">Rendering…</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-zinc-500">Crop aspect</span>
          <div className="flex flex-wrap gap-2">
            {ASPECTS.map((p) => (
              <Chip key={p.value} active={aspect === p.value} onClick={() => handleAspect(p.value)}>
                {p.label}
              </Chip>
            ))}
          </div>
          <p className="text-xs text-zinc-500">
            Drag to move, handles to resize. {aspect !== "free" ? "Ratio locked." : "Free ratio."}
          </p>
        </div>
      </div>
    </ToolPage>
  )
}
