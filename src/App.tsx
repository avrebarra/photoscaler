import { useEffect, useRef, useState } from "react"
import { canvasToUrl, scaleImage, type ScaleMode } from "./lib/scale"
import { cropImage, normalizeRect, type CropAspect, type CropRect } from "./lib/crop"
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

  // crop — before scale
  const [cropRect, setCropRect] = useState<CropRect | null>(null)
  const [cropAspect, setCropAspect] = useState<CropAspect>("free")

  const imgRef = useRef<HTMLImageElement>(null)

  // create object url when file picked
  useEffect(() => {
    if (!file) {
      setSrc(null)
      setOrigSize(null)
      setOutUrl(null)
      setOutSize(null)
      setCropRect(null)
      setCropAspect("free")
      return
    }
    const url = URL.createObjectURL(file)
    setSrc(url)
    setOutUrl(null)
    setOutSize(null)
    setCropRect(null)
    setCropAspect("free")
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
      const MAX_SIDE = 8000
      let source: HTMLImageElement | HTMLCanvasElement = imgRef.current
      let sourceW = imgRef.current.naturalWidth
      let sourceH = imgRef.current.naturalHeight

      // crop before scale
      if (cropRect && origSize) {
        const normalized = normalizeRect(cropRect, origSize)
        const cropped = cropImage(imgRef.current, normalized)
        // cropImage already guards MAX_SIDE; keep explicit check for parity
        if (cropped.width > MAX_SIDE || cropped.height > MAX_SIDE) {
          throw new Error(
            `Output too large: ${cropped.width}×${cropped.height} (max ${MAX_SIDE}px side)`,
          )
        }
        source = cropped.canvas
        sourceW = cropped.width
        sourceH = cropped.height
      }

      let canvas: HTMLCanvasElement
      let width: number
      let height: number

      if (source instanceof HTMLCanvasElement) {
        const scale = percent / 100
        width = Math.max(1, Math.round(sourceW * scale))
        height = Math.max(1, Math.round(sourceH * scale))
        if (width > MAX_SIDE || height > MAX_SIDE) {
          throw new Error(`Output too large: ${width}×${height} (max ${MAX_SIDE}px side)`)
        }
        canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) throw new Error("Canvas not supported")
        ctx.imageSmoothingEnabled = mode === "smooth"
        // @ts-ignore
        if (mode === "smooth") ctx.imageSmoothingQuality = "high"
        ctx.drawImage(source, 0, 0, width, height)
      } else {
        const res = scaleImage(source, percent, mode)
        canvas = res.canvas
        width = res.width
        height = res.height
      }

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
    const cropSuffix = cropRect ? "-crop" : ""
    a.download = `${base}${cropSuffix}-${percent}pct-${mode}.png`
    a.click()
  }

  function handleCropAspectChange(aspect: CropAspect) {
    setCropAspect(aspect)
    if (!cropRect || !origSize) return
    if (aspect === "free") return
    try {
      let ratio: number
      if (aspect === "1:1") ratio = 1
      else if (aspect === "4:3") ratio = 4 / 3
      else if (aspect === "16:9") ratio = 16 / 9
      else ratio = origSize.w / origSize.h
      const cx = cropRect.x + cropRect.width / 2
      const cy = cropRect.y + cropRect.height / 2
      let newW = cropRect.width
      let newH = cropRect.height
      const currentRatio = newW / newH
      if (Math.abs(currentRatio - ratio) < 0.01) return
      if (currentRatio > ratio) {
        newW = newH * ratio
      } else {
        newH = newW / ratio
      }
      newW = Math.min(newW, origSize.w)
      newH = Math.min(newH, origSize.h)
      if (newW < 1) newW = 1
      if (newH < 1) newH = 1
      let nx = cx - newW / 2
      let ny = cy - newH / 2
      nx = Math.max(0, Math.min(nx, origSize.w - newW))
      ny = Math.max(0, Math.min(ny, origSize.h - newH))
      const next = normalizeRect({ x: nx, y: ny, width: newW, height: newH }, origSize)
      setCropRect(next)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function handleCropReset() {
    setCropRect(null)
    setCropAspect("free")
    setOutUrl(null)
    setOutSize(null)
    setError(null)
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
          naturalSize={origSize}
          cropRect={cropRect}
          cropAspect={cropAspect}
          onCropRectChange={setCropRect}
          onCropAspectChange={handleCropAspectChange}
          onCropReset={handleCropReset}
          onCropError={setError}
        />

        <OptionsPanel
          percent={percent}
          onPercent={setPercent}
          mode={mode}
          onMode={setMode}
          origSize={
            cropRect ? { w: Math.round(cropRect.width), h: Math.round(cropRect.height) } : origSize
          }
          error={error}
          onScale={handleScale}
          disabled={!src}
        />

        <p className="text-center text-xs text-zinc-500">
          All processing is local — image never leaves your browser. Phase 2: Capacitor wrapper +
          Share intent.
        </p>
      </div>
    </div>
  )
}
