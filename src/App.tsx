import { useEffect, useState } from "react"
import { Routes, Route, Navigate, useNavigate } from "react-router-dom"
import { canvasToUrl } from "./lib/scale"
import { compose, type CropOp, type Op, type ResizeOp, type Size } from "./lib/pipeline"
import { DropZone } from "./components/DropZone"
import { EditorScreen } from "./components/EditorScreen"
import { CropToolPage } from "./components/CropToolPage"
import { ResizeToolPage } from "./components/ResizeToolPage"

export function buildDownloadName(name: string, date: Date): string {
  const base = name.replace(/\.[^.]+$/, "") || "image"
  const ext = name.match(/\.([^.]+)$/)?.[1] ?? "png"
  const pad = (n: number) => String(n).padStart(2, "0")
  const timestamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `${base}-${timestamp}.${ext}`
}

export default function App() {
  const [file, setFile] = useState<File | null>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [origSize, setOrigSize] = useState<Size | null>(null)
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null)
  const [ops, setOps] = useState<Op[]>([])
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  // object URL lifecycle + full state reset when the file leaves
  useEffect(() => {
    if (!file) {
      setSrc(null)
      setOrigSize(null)
      setImgEl(null)
      setOps([])
      setError(null)
      return
    }
    const url = URL.createObjectURL(file)
    setSrc(url)
    setOps([])
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
    navigate("/editor")
  }

  function applyOp(op: CropOp | ResizeOp) {
    setOps((prev) => [...prev, op])
    navigate("/editor")
  }

  function handleDownload() {
    if (!imgEl || !origSize || !file) return
    try {
      const result = compose(imgEl, origSize, ops, 1)
      const url = canvasToUrl(result.canvas, "png")
      const a = document.createElement("a")
      a.href = url
      a.download = buildDownloadName(file.name, new Date())
      a.click()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const hiddenImg = src ? (
    <img
      src={src}
      alt=""
      aria-hidden
      style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
      onLoad={(e) => {
        const img = e.currentTarget
        setImgEl(img)
        setOrigSize({ w: img.naturalWidth, h: img.naturalHeight })
      }}
      onError={() => setError("Failed to load image")}
    />
  ) : null

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6">
        <header className="flex items-center justify-between py-2">
          <h1 className="text-xl font-bold tracking-tight text-white">Photoscaler</h1>
        </header>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {hiddenImg}

        <Routes>
          <Route
            path="/"
            element={
              <DropZone
                fileName={file?.name ?? null}
                fileSizeKb={file ? Number((file.size / 1024).toFixed(0)) : null}
                onFile={onFilePicked}
                onRemove={() => {
                  setFile(null)
                  navigate("/")
                }}
              />
            }
          />

          <Route
            path="/editor"
            element={
              !src ? (
                <Navigate to="/" replace />
              ) : (
                <EditorScreen
                  imgEl={imgEl}
                  origSize={origSize}
                  ops={ops}
                  onUndo={() => setOps((prev) => prev.slice(0, -1))}
                  onReset={() => setOps([])}
                  onDownload={handleDownload}
                  onRemove={() => setFile(null)}
                  onOpenTool={(tool) => navigate(tool === "crop" ? "/editor/crop" : "/editor/resize")}
                />
              )
            }
          />

          <Route
            path="/editor/crop"
            element={
              !src ? (
                <Navigate to="/" replace />
              ) : (
                <CropToolPage
                  imgEl={imgEl}
                  origSize={origSize}
                  baseOps={ops}
                  onApply={applyOp}
                />
              )
            }
          />

          <Route
            path="/editor/resize"
            element={
              !src ? (
                <Navigate to="/" replace />
              ) : (
                <ResizeToolPage
                  imgEl={imgEl}
                  origSize={origSize}
                  baseOps={ops}
                  onApply={applyOp}
                />
              )
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <p className="text-center text-xs text-zinc-500">All processing is local — image never leaves your browser.</p>
      </div>
    </div>
  )
}
