import { useRef } from "react"

export function DropZone({
  fileName,
  fileSizeKb,
  onFile,
  onRemove,
}: {
  fileName: string | null
  fileSizeKb: number | null
  onFile: (f: File | null) => void
  onRemove: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium text-zinc-500">Image</p>
        <h2 className="text-lg font-bold text-white">Select image</h2>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const f = e.dataTransfer.files[0]
          if (f) onFile(f)
        }}
        className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-700 bg-zinc-950 px-4 py-8 text-center"
      >
        <p className="text-sm text-zinc-400">Drag & drop an image here, or</p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-zinc-100 transition-colors"
        >
          Choose image
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        {fileName && (
          <p className="text-xs text-zinc-400">
            {fileName} · {fileSizeKb} KB
          </p>
        )}
      </div>

      {fileName && (
        <button
          type="button"
          onClick={onRemove}
          className="self-start text-xs font-medium text-zinc-400 underline underline-offset-4 hover:text-zinc-200"
        >
          Remove
        </button>
      )}
    </section>
  )
}
