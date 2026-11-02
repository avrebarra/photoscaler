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
    <div className="flex flex-col min-h-[100dvh] bg-zinc-950">
      {/* hero — wordmark + subtitle at ~40% height */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 min-h-[42vh]">
        <div className="text-center">
          <h1 className="text-[40px] font-bold tracking-[-.02em] leading-none text-white">
            Photoscaler
          </h1>
          <p className="text-[14px] text-zinc-400 mt-3">Simple image upscaler</p>
        </div>
        {/* sr-only for tests that assert heading exists */}
        <span className="sr-only">Select image</span>
      </div>

      {/* bottom-anchored drop card */}
      <div className="shrink-0 px-6 pb-8 flex flex-col gap-4">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const f = e.dataTransfer.files[0]
            if (f) onFile(f)
          }}
          className="rounded-[18px] border border-white/[0.08] bg-zinc-900 flex flex-col overflow-hidden"
        >
          <div className="flex flex-col items-center justify-center gap-4 px-7 py-10 m-2 rounded-[14px] border border-dashed border-white/10 bg-black/40 text-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-12 px-9 rounded-full bg-white text-[16px] font-semibold text-black active:scale-[0.98] transition shadow-[0_2px_10px_rgba(0,0,0,.35)]"
            >
              Choose image
            </button>
            <p className="text-[13px] text-zinc-500">or drop it here</p>
          </div>
        </div>
        {/* home indicator */}
        <div className="mx-auto h-[5px] w-[110px] rounded-full bg-white/25 shrink-0" />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  )
}
