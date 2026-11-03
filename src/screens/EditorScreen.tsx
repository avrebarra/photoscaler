import { useEffect, useRef, useState } from "react"
import type { Op, Size } from "../lib/pipeline"
import { useComposedImage } from "../hooks/useComposedImage"
import { usePinchZoom } from "../hooks/usePinchZoom"
import { ToolPicker } from "../components/ToolPicker"
import { ChromeHeader, BarBtn, PillBtn, Dock, DimensionBadge } from "../components/chrome"
import { RotateCcw, Download } from "lucide-react"

export function EditorScreen({
  fileName,
  imgEl,
  origSize,
  ops,
  onReset,
  onDownload,
  onOpenTool,
  onWordmarkClick,
}: EditorScreenProps) {
  const { url, stageSize } = useComposedImage(imgEl, origSize, ops)
  const hasOps = ops.length > 0
  const [confirmOpen, setConfirmOpen] = useState(false)

  const isLoading = !!fileName && !imgEl
  const isProcessing = !!imgEl && !!origSize && !url
  const badgeVisible =
    !!origSize && stageSize.w > 0 && stageSize.h > 0 && !isLoading && !isProcessing && !confirmOpen

  const previewRef = useRef<HTMLDivElement>(null)
  const { scale, tx, ty, reset, bind } = usePinchZoom(previewRef)

  // reset zoom when preview image changes
  useEffect(() => {
    reset()
  }, [url, reset])

  return (
    <div className="relative flex flex-col min-h-[100dvh] bg-zinc-950">
      <ChromeHeader wordmark onWordmarkClick={onWordmarkClick}>
        <BarBtn
          label="Reset changes"
          onClick={() => setConfirmOpen(true)}
          dim={!hasOps}
          disabled={!hasOps}
        >
          <RotateCcw size={18} strokeWidth={1.8} />
        </BarBtn>
        <PillBtn label="Finish, download PNG" onClick={onDownload}>
          <Download size={17} strokeWidth={1.8} />
          Finish
        </PillBtn>
      </ChromeHeader>

      <div className="flex-1 min-h-0 px-3 pt-4 flex flex-col">
        {isLoading ? (
          <div className="relative flex-1 rounded-[18px] overflow-hidden bg-zinc-900 border border-white/[0.08] flex flex-col items-center justify-center gap-5 min-h-[320px]">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(255,255,255,.04) 25%, rgba(255,255,255,.10) 37%, rgba(255,255,255,.04) 63%)",
                  backgroundSize: "400px 100%",
                  animation: "shimmer 1.4s linear infinite",
                }}
              />
              <div
                className="w-11 h-11 rounded-full border-[3px] border-white/20 border-t-white relative"
                style={{ animation: "spin .9s linear infinite" }}
              />
              <p
                className="text-[14px] font-medium text-white relative"
                style={{ animation: "pulse-soft 2.2s ease-in-out infinite" }}
              >
                Loading image…
              </p>
            </div>
          ) : (
            <div
              ref={previewRef}
              {...(bind() as object)}
              style={{ touchAction: "none" }}
              className="relative flex-1 rounded-[18px] overflow-hidden bg-black min-h-[320px]"
            >
              {url ? (
                <>
                  <img
                    src={url}
                    alt={hasOps ? "edited preview" : "original preview"}
                    style={{
                      transform: `translate(${tx}px, ${ty}px) scale(${isProcessing ? scale * 1.05 : scale})`,
                      transformOrigin: "center center",
                    }}
                    className={`absolute inset-0 h-full w-full object-contain ${isProcessing ? "opacity-50 blur-md" : ""}`}
                  />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs text-zinc-500">Rendering…</span>
                </div>
              )}
              {isProcessing && url && (
                <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center gap-5">
                  <div
                    className="w-11 h-11 rounded-full border-[3px] border-white/20 border-t-white"
                    style={{ animation: "spin .9s linear infinite" }}
                  />
                  <p
                    className="text-[14px] font-medium text-white"
                    style={{ animation: "pulse-soft 2.2s ease-in-out infinite" }}
                  >
                    Applying changes…
                  </p>
                </div>
              )}
              {isProcessing && !url && (
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-5">
                  <div
                    className="w-11 h-11 rounded-full border-[3px] border-white/20 border-t-white"
                    style={{ animation: "spin .9s linear infinite" }}
                  />
                  <p className="text-[14px] font-medium text-white">Applying changes…</p>
                </div>
              )}
              <DimensionBadge w={stageSize.w} h={stageSize.h} visible={badgeVisible} />
            </div>
          )}
      </div>

      <Dock>
        <div className={isLoading || isProcessing ? "opacity-30 pointer-events-none" : ""}>
          <ToolPicker onSelect={onOpenTool} />
        </div>
      </Dock>

      {confirmOpen && (
        <div className="absolute inset-0 z-10 flex flex-col">
          <button
            type="button"
            aria-label="Close confirmation"
            onClick={() => setConfirmOpen(false)}
            className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
          />
          <div className="relative mt-auto mx-2 mb-2 rounded-[24px] border border-white/[0.08] bg-[rgba(9,9,11,0.96)] backdrop-blur-[22px] px-5 pt-4 pb-5 flex flex-col gap-4 shadow-[0_20px_50px_rgba(0,0,0,.5)]">
            <div className="flex flex-col gap-1">
              <span className="text-[14.5px] font-semibold text-white">Reset changes?</span>
              <span className="text-[13px] text-zinc-400">
                This will clear all edits and restore the original image.
              </span>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                aria-label="Cancel"
                onClick={() => setConfirmOpen(false)}
                className="flex-1 h-10 rounded-full bg-white/10 text-white text-[13.5px] font-semibold active:scale-[0.98] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                aria-label="Reset"
                onClick={() => {
                  onReset()
                  setConfirmOpen(false)
                }}
                className="flex-1 h-10 rounded-full bg-white text-black text-[13.5px] font-semibold active:scale-[0.98] transition"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes shimmer{0%{background-position:-200px 0}100%{background-position:200px 0}}@keyframes pulse-soft{0%,100%{opacity:.55}50%{opacity:1}}`}</style>
    </div>
  )
}

type EditorScreenProps = {
  fileName?: string | null
  imgEl: HTMLImageElement | null
  origSize: Size | null
  ops: Op[]
  onReset: () => void
  onDownload: () => void
  onOpenTool: (tool: "crop" | "resize") => void
  onWordmarkClick: () => void
}
