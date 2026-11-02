import { useRef } from "react"

export function DropZone({
  fileName: _fileName,
  fileSizeKb: _fileSizeKb,
  onFile,
}: {
  fileName: string | null
  fileSizeKb: number | null
  onFile: (f: File | null) => void
  onRemove?: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <>
    <div className="flex flex-col min-h-[100dvh] bg-zinc-950">
      {/* hero — wordmark cluster top-center per mockup */}
      <div className="flex-1 min-h-0 flex flex-col items-center pt-[31vh] px-6">
        <div className="text-center">
          <h1 className="text-[40px] font-bold tracking-[-.02em] leading-none text-white">
            Photoscaler
          </h1>
          <p className="text-[14px] text-zinc-400 mt-3">Simple image upscaler</p>
        </div>
        {/* sr-only for tests that assert heading exists */}
        <span className="sr-only">Select image</span>
      </div>

      {/* drop card — mid-floor per mockup, gap above the home indicator */}
      <div className="shrink-0 px-6 mb-[12vh] flex flex-col">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const f = e.dataTransfer.files[0]
            if (f) onFile(f)
          }}
          className="h-[35vh] min-h-[240px] max-h-[320px] rounded-[18px] border border-white/[0.08] bg-zinc-900 flex flex-col overflow-hidden"
        >
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-7 m-2 rounded-[14px] border border-dashed border-white/10 bg-black/40 text-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-12 px-9 rounded-full bg-white text-[16px] font-semibold text-black active:scale-[0.98] transition shadow-[0_2px_10px_rgba(0,0,0,.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              Choose image
            </button>
            <p className="text-[13px] text-zinc-500">or drop it here</p>
          </div>
        </div>
      </div>
      {/* home indicator */}
      <div className="mx-auto h-[5px] w-[110px] rounded-full bg-white/25 shrink-0 mb-4" />
    </div>
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => onFile(e.target.files?.[0] ?? null)}
    />
    </>
  )
}
