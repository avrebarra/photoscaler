import type { Op, Size } from "../lib/pipeline"
import { useComposedImage } from "../hooks/useComposedImage"
import { ToolPicker } from "../components/ToolPicker"
import { ChromeHeader, BarBtn, PillBtn, Dock } from "../components/chrome"
import { Undo2, Download } from "lucide-react"

export function EditorScreen({
  fileName,
  imgEl,
  origSize,
  ops,
  onUndo,
  onDownload,
  onOpenTool,
}: {
  fileName?: string | null
  imgEl: HTMLImageElement | null
  origSize: Size | null
  ops: Op[]
  onUndo: () => void
  onDownload: () => void
  onOpenTool: (tool: "crop" | "resize") => void
}) {
  const { url, stageSize } = useComposedImage(imgEl, origSize, ops)
  const hasOps = ops.length > 0

  const isLoading = !!fileName && !imgEl
  const isProcessing = !!imgEl && !!origSize && !url

  return (
    <div className="flex flex-col min-h-[100dvh] bg-zinc-950">
      <ChromeHeader wordmark>
        <BarBtn label="Undo" onClick={onUndo} dim={!hasOps} disabled={!hasOps}>
          <Undo2 size={18} strokeWidth={1.8} />
        </BarBtn>
        <PillBtn label="Finish — download PNG" onClick={onDownload}>
          <Download size={17} strokeWidth={1.8} />
          Finish
        </PillBtn>
      </ChromeHeader>

      <div className="flex-1 min-h-0 flex flex-col">
        {/* letterboxed hero */}
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
            <div className="relative flex-1 rounded-[18px] overflow-hidden bg-black min-h-[320px]">
              {url ? (
                <>
                  <img
                    src={url}
                    alt={hasOps ? "edited preview" : "original preview"}
                    className={`absolute inset-0 h-full w-full object-contain ${isProcessing ? "opacity-50 blur-md scale-105" : ""}`}
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
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-zinc-500 pt-3.5 pb-1.5 tabular-nums tracking-wide shrink-0">
          {isLoading && fileName
            ? fileName
            : origSize && stageSize.w > 0
              ? `${stageSize.w} × ${stageSize.h} px`
              : ""}
        </p>
      </div>

      <Dock>
        <div className={isLoading || isProcessing ? "opacity-30 pointer-events-none" : ""}>
          <ToolPicker onSelect={onOpenTool} />
        </div>
      </Dock>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes shimmer{0%{background-position:-200px 0}100%{background-position:200px 0}}@keyframes pulse-soft{0%,100%{opacity:.55}50%{opacity:1}}`}</style>
    </div>
  )
}
