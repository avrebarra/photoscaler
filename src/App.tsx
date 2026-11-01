import { useEffect, useRef, useState } from "react"
import { canvasToUrl, scaleImage, type ScaleMode } from "./lib/scale"
import { DropZone } from "./components/DropZone"
import { OptionsPanel } from "./components/OptionsPanel"
import { PreviewPanel } from "./components/PreviewPanel"

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
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6">
        <header className="flex items-center justify-between py-2">
          <h1 className="text-xl font-bold tracking-tight text-white">Photoscaler</h1>
          <span className="text-xs font-medium text-zinc-500">Phase 1 · Web only</span>
        </header>

        {/* hidden measuring img — keeps scaleImage/origSize logic unchanged */}
        {src && (
          <img
            ref={imgRef}
            src={src}
            alt=""
            className="hidden"
            onLoad={(e) => {
              const img = e.currentTarget
              setOrigSize({ w: img.naturalWidth, h: img.naturalHeight })
            }}
          />
        )}

        <DropZone
          fileName={file?.name ?? null}
          fileSizeKb={file ? Number((file.size / 1024).toFixed(0)) : null}
          onFile={onFilePicked}
          onRemove={() => setFile(null)}
        />

        <OptionsPanel
          percent={percent}
          onPercent={setPercent}
          mode={mode}
          onMode={setMode}
          origSize={origSize}
          error={error}
          onScale={handleScale}
          disabled={!src}
        />

        <PreviewPanel
          src={src}
          outUrl={outUrl}
          outSize={outSize}
          percent={percent}
          mode={mode}
          onDownload={handleDownload}
          onClear={() => {
            setOutUrl(null)
            setOutSize(null)
          }}
        />

        <p className="text-center text-xs text-zinc-500">
          All processing is local — image never leaves your browser. Phase 2: Capacitor wrapper +
          Share intent.
        </p>
      </div>
    </div>
  )
}
