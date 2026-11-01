import type { ScaleMode } from "../lib/scale"

export function PreviewPanel({
  src,
  outUrl,
  outSize,
  percent,
  mode,
  onDownload,
  onClear,
}: {
  src: string | null
  outUrl: string | null
  outSize: { w: number; h: number } | null
  percent: number
  mode: ScaleMode
  onDownload: () => void
  onClear: () => void
}) {
  if (!src && !outUrl) return null

  // result-only card when we have output; otherwise preview of original
  const hasResult = Boolean(outUrl && outSize)

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium text-zinc-500">Preview</p>
        <h2 className="text-lg font-bold text-white">
          {hasResult ? "Preview & Download" : "Preview"}
        </h2>
        {hasResult && outSize && (
          <p className="text-xs text-zinc-400">
            Result: {outSize.w} × {outSize.h} px · {mode} at {percent}%
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {src && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-zinc-500">
              {hasResult ? "Original" : "Original preview"}
            </span>
            <div className="overflow-auto rounded-xl bg-black p-3 flex justify-center">
              <img
                src={src}
                alt="original preview"
                className="max-h-[360px] max-w-full object-contain rounded-lg"
              />
            </div>
          </div>
        )}

        {outUrl && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-zinc-500">Result</span>
            <div className="overflow-auto rounded-xl bg-black p-3 flex justify-center">
              <img
                src={outUrl}
                alt="scaled preview"
                className="max-h-[360px] max-w-full object-contain rounded-lg"
                style={{
                  imageRendering: mode === "pixelate" ? "pixelated" : "auto",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {hasResult && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onDownload}
            className="w-full rounded-full bg-white py-3 text-base font-semibold text-black hover:bg-zinc-100 transition-colors"
          >
            Download PNG
          </button>
          <button
            type="button"
            onClick={onClear}
            className="w-full rounded-full border border-zinc-700 bg-zinc-800 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Clear result
          </button>
        </div>
      )}
    </section>
  )
}
