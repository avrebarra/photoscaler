import type { Op, Size } from "../lib/pipeline"
import { useComposedImage } from "../hooks/useComposedImage"
import { ToolPicker } from "./ToolPicker"

// editor home: composed preview as the hero, tools below, export actions.
// scaling lives only inside the Resize tool — no main-screen Scale button.
export function EditorScreen({
  imgEl,
  origSize,
  ops,
  onUndo,
  onReset,
  onDownload,
  onRemove,
  onOpenTool,
}: {
  imgEl: HTMLImageElement | null
  origSize: Size | null
  ops: Op[]
  onUndo: () => void
  onReset: () => void
  onDownload: () => void
  onRemove: () => void
  onOpenTool: (tool: "crop" | "resize") => void
}) {
  const { url, stageSize } = useComposedImage(imgEl, origSize, ops)
  const hasOps = ops.length > 0

  return (
    <>
      {/* composed preview */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-4 shadow-[0_4px_16px_rgba(0,0,0,0.5),0_1px_3px_rgba(0,0,0,0.4)]">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-zinc-500">Preview</p>
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold text-white">
              {hasOps ? "Edited preview" : "Preview"}
            </h2>
            {origSize && stageSize.w > 0 && (
              <span className="text-xs text-zinc-400">
                {stageSize.w} × {stageSize.h} px
              </span>
            )}
          </div>
        </div>

        <div className="overflow-auto rounded-xl bg-black p-3 flex justify-center shadow-[inset_0_2px_8px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(0,0,0,0.4)]">
          {url ? (
            <img
              src={url}
              alt={hasOps ? "edited preview" : "original preview"}
              className="block max-h-[360px] max-w-full object-contain rounded-lg"
            />
          ) : (
            <span className="py-10 text-xs text-zinc-500">Rendering…</span>
          )}
        </div>
      </section>

      <ToolPicker onSelect={onOpenTool} />

      {/* export + history actions */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onDownload}
          className="w-full rounded-full bg-white py-3 text-base font-semibold text-black hover:bg-zinc-100 transition-all active:scale-[0.98] shadow-[0_3px_12px_rgba(0,0,0,0.5),0_1px_3px_rgba(0,0,0,0.4)] active:shadow-[inset_0_2px_6px_rgba(0,0,0,0.25),inset_0_1px_2px_rgba(0,0,0,0.2)]"
        >
          Download PNG
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onUndo}
            disabled={!hasOps}
            className="flex-1 rounded-full border border-zinc-700 bg-zinc-800 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-all active:scale-[0.98] shadow-[0_1px_4px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)] active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] disabled:shadow-none disabled:active:scale-100"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={!hasOps}
            className="flex-1 rounded-full border border-zinc-700 bg-zinc-800 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-all active:scale-[0.98] shadow-[0_1px_4px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)] active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] disabled:shadow-none disabled:active:scale-100"
          >
            Reset
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="self-start text-xs font-medium text-zinc-400 underline underline-offset-4 hover:text-zinc-200"
      >
        Remove image
      </button>
    </>
  )
}
