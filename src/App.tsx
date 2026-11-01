import { useEffect, useRef, useState } from "react"
import { canvasToUrl, scaleImage, type ScaleMode } from "./lib/scale"

const PRESETS = [25, 50, 100, 150, 200, 400]

export default function App() {
  // input
  const [file, setFile] = useState<File | null>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [origSize, setOrigSize] = useState<{ w: number; h: number } | null>(null)

  // options
  const [percent, setPercent] = useState(200)
  const [mode, setMode] = useState<ScaleMode>("smooth")

  // result
  const [outUrl, setOutUrl] = useState<string | null>(null)
  const [outSize, setOutSize] = useState<{ w: number; h: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const imgRef = useRef<HTMLImageElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // create object url when file picked
  useEffect(() => {
    if (!file) {
      setSrc(null)
      setOrigSize(null)
      setOutUrl(null)
      setOutSize(null)
      return
    }
    const url = URL.createObjectURL(file)
    setSrc(url)
    setOutUrl(null)
    setOutSize(null)
    setError(null)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function onFilePicked(f: File | null) {
    if (!f) return
    if (!f.type.startsWith("image/")) {
      setError("Please pick an image file")
      return
    }
    setFile(f)
  }

  function handleScale() {
    if (!imgRef.current || !imgRef.current.complete) {
      setError("Image not loaded yet")
      return
    }
    try {
      setError(null)
      const { canvas, width, height } = scaleImage(imgRef.current, percent, mode)
      setOutUrl(canvasToUrl(canvas, "png"))
      setOutSize({ w: width, h: height })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function handleDownload() {
    if (!outUrl) return
    const a = document.createElement("a")
    const base = file?.name.replace(/\.[^.]+$/, "") || "image"
    a.href = outUrl
    a.download = `${base}-${percent}pct-${mode}.png`
    a.click()
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight">Photoscaler</h1>
          <span className="text-xs text-zinc-500">Phase 1 - Web only | Capacitor later</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 flex flex-col gap-6">
        {/* step 1: pick */}
        <section className="rounded-lg border bg-white p-4 flex flex-col gap-3">
          <h2 className="font-semibold">1 - Select image (single)</h2>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files[0]
              if (f) onFilePicked(f)
            }}
            className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 p-6 text-center"
          >
            <p className="text-sm text-zinc-600">Drag & drop an image here, or</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Choose image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="text-xs text-zinc-500">
                {file.name} - {(file.size / 1024).toFixed(0)} KB
              </p>
            )}
          </div>

          {src && (
            <div className="flex flex-col gap-2">
              <div className="overflow-auto rounded border bg-zinc-50 p-2 flex justify-center">
                {/* hidden img used for canvas scaling */}
                <img
                  ref={imgRef}
                  src={src}
                  alt="original"
                  className="max-h-[320px] max-w-full object-contain"
                  onLoad={(e) => {
                    const img = e.currentTarget
                    setOrigSize({ w: img.naturalWidth, h: img.naturalHeight })
                  }}
                />
              </div>
              {origSize && (
                <p className="text-xs text-zinc-500">
                  Original: {origSize.w} x {origSize.h} px
                </p>
              )}
              <button
                onClick={() => {
                  setFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ""
                }}
                className="self-start text-xs underline text-zinc-600"
              >
                Remove
              </button>
            </div>
          )}
        </section>

        {/* step 2: options */}
        <section className="rounded-lg border bg-white p-4 flex flex-col gap-4">
          <h2 className="font-semibold">2 - Options</h2>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Scale - {percent}%</label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPercent(p)}
                  className={`rounded border px-3 py-1.5 text-sm font-medium ${
                    percent === p
                      ? "bg-black text-white border-black"
                      : "bg-white hover:bg-zinc-100"
                  }`}
                >
                  {p}%
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={10}
                max={400}
                step={5}
                value={percent}
                onChange={(e) => setPercent(Number(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                min={10}
                max={800}
                value={percent}
                onChange={(e) => setPercent(Math.max(10, Number(e.target.value) || 10))}
                className="w-20 rounded border px-2 py-1 text-sm"
              />
              <span className="text-sm text-zinc-500">%</span>
            </div>
            {origSize && (
              <p className="text-xs text-zinc-500">
                Output: {Math.round((origSize.w * percent) / 100)} x{" "}
                {Math.round((origSize.h * percent) / 100)} px
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Interpolation</span>
            <div className="flex gap-2">
              <button
                onClick={() => setMode("smooth")}
                className={`flex-1 rounded border px-3 py-2 text-sm font-medium ${
                  mode === "smooth"
                    ? "bg-black text-white border-black"
                    : "bg-white hover:bg-zinc-100"
                }`}
              >
                Blur (smooth)
              </button>
              <button
                onClick={() => setMode("pixelate")}
                className={`flex-1 rounded border px-3 py-2 text-sm font-medium ${
                  mode === "pixelate"
                    ? "bg-black text-white border-black"
                    : "bg-white hover:bg-zinc-100"
                }`}
              >
                Pixelate (sharp)
              </button>
            </div>
            <p className="text-xs text-zinc-500">
              {mode === "smooth"
                ? "Bilinear-like - good for photos"
                : "Nearest-neighbor - keeps hard pixels"}
            </p>
          </div>

          <button
            onClick={handleScale}
            disabled={!src}
            className="rounded bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Upscale / Scale
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </section>

        {/* step 3: preview + download */}
        {outUrl && outSize && (
          <section className="rounded-lg border bg-white p-4 flex flex-col gap-3">
            <h2 className="font-semibold">3 - Preview & Download</h2>
            <p className="text-xs text-zinc-500">
              Result: {outSize.w} x {outSize.h} px - {mode} at {percent}%
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-zinc-600">Original</span>
                <div className="overflow-auto rounded border bg-zinc-50 p-2 flex justify-center">
                  {src && (
                    <img
                      src={src}
                      alt="original preview"
                      className="max-h-[360px] max-w-full object-contain"
                    />
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-zinc-600">Result</span>
                <div className="overflow-auto rounded border bg-zinc-50 p-2 flex justify-center">
                  <img
                    src={outUrl}
                    alt="scaled preview"
                    className="max-h-[360px] max-w-full object-contain"
                    style={{ imageRendering: mode === "pixelate" ? "pixelated" : "auto" }}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="rounded bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Download PNG
              </button>
              <button
                onClick={() => {
                  setOutUrl(null)
                  setOutSize(null)
                }}
                className="rounded border px-4 py-2 text-sm font-medium hover:bg-zinc-100"
              >
                Clear result
              </button>
            </div>
          </section>
        )}

        <p className="text-xs text-zinc-400 text-center">
          All processing is local - image never leaves your browser. Phase 2: Capacitor wrapper +
          Share intent.
        </p>
      </main>
    </div>
  )
}
