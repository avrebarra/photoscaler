import { useEffect, useState } from "react"
import { Routes, Route, Navigate, useNavigate } from "react-router-dom"
import { canvasToUrl } from "./lib/scale"
import { compose, type CropOp, type Op, type ResizeOp, type Size } from "./lib/pipeline"
import { WelcomeScreen } from "./screens/WelcomeScreen"
import { EditorScreen } from "./screens/EditorScreen"
import { CropToolScreen } from "./screens/CropToolScreen"
import { ResizeToolScreen } from "./screens/ResizeToolScreen"

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

  const hasFile = !!file

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center">
      {error && (
        <p className="fixed top-2 left-1/2 -translate-x-1/2 z-50 text-sm text-red-500 bg-zinc-900 px-3 py-1.5 rounded-full border border-red-900">
          {error}
        </p>
      )}

      {hiddenImg}

      <div className="w-full max-w-md flex-1 flex flex-col min-h-[100dvh]">
        <Routes>
          <Route
            path="/"
            element={
              <WelcomeScreen
                fileName={file?.name ?? null}
                fileSizeKb={file ? Number((file.size / 1024).toFixed(0)) : null}
                onFile={onFilePicked}
              />
            }
          />

          <Route
            path="/editor"
            element={
              !hasFile ? (
                <Navigate to="/" replace />
              ) : (
                <EditorScreen
                  fileName={file?.name ?? null}
                  imgEl={imgEl}
                  origSize={origSize}
                  ops={ops}
                  onUndo={() => setOps((prev) => prev.slice(0, -1))}
                  onDownload={handleDownload}
                  onOpenTool={(tool) =>
                    navigate(tool === "crop" ? "/editor/crop" : "/editor/resize")
                  }
                />
              )
            }
          />

          <Route
            path="/editor/crop"
            element={
              !hasFile ? (
                <Navigate to="/" replace />
              ) : (
                <CropToolScreen imgEl={imgEl} origSize={origSize} baseOps={ops} onApply={applyOp} />
              )
            }
          />

          <Route
            path="/editor/resize"
            element={
              !hasFile ? (
                <Navigate to="/" replace />
              ) : (
                <ResizeToolScreen
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
      </div>
    </div>
  )
}
