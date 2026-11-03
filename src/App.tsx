import { useEffect, useState } from "react"
import { Routes, Route, Navigate, useNavigate, useLocation, useBlocker } from "react-router-dom"
import { canvasToUrl } from "./lib/scale"
import { compose, type CropOp, type Op, type ResizeOp, type Size } from "./lib/pipeline"
import { buildDownloadName } from "./lib/buildDownloadName"
import { decodeImageFile, isHeicLike, isTiffLike } from "./lib/heic"
import { WelcomeScreen } from "./screens/WelcomeScreen"
import { EditorScreen } from "./screens/EditorScreen"
import { CropToolScreen } from "./screens/CropToolScreen"
import { ResizeToolScreen } from "./screens/ResizeToolScreen"
import { ConfirmDialog } from "./components/ui"

export default function App() {
  const [file, setFile] = useState<File | null>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [origSize, setOrigSize] = useState<Size | null>(null)
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null)
  const [ops, setOps] = useState<Op[]>([])
  const [error, setError] = useState<string | null>(null)
  const [decoding, setDecoding] = useState(false)
  const [pendingName, setPendingName] = useState<string | null>(null)
  const [wordmarkConfirmOpen, setWordmarkConfirmOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const hasFile = !!file

  // block pop exits from /editor when an image is loaded, allow internal tool transitions
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !!file &&
      currentLocation.pathname === "/editor" &&
      !nextLocation.pathname.startsWith("/editor/"),
  )

  const showBlockerModal = blocker.state === "blocked"

  // revoke previous object URL when src changes or on unmount, no setState here
  useEffect(() => {
    return () => {
      if (src) URL.revokeObjectURL(src)
    }
  }, [src])

  function clearEditorState() {
    try {
      if (src) URL.revokeObjectURL(src)
    } catch (e: unknown) {
      setError(String(e))
      return
    }
    setFile(null)
    setSrc(null)
    setImgEl(null)
    setOrigSize(null)
    setOps([])
    setError(null)
  }

  async function onFilePicked(f: File | null) {
    if (!f) return
    if (decoding) return
    const isStandardImage = f.type.startsWith("image/")
    const heicLike = isHeicLike(f)
    const tiffLike = isTiffLike(f)
    if (!isStandardImage && !heicLike && !tiffLike) {
      setError("Please pick an image file")
      return
    }
    setDecoding(true)
    setPendingName(f.name)
    setError(null)
    const start = Date.now()
    let intermediateUrl: string | null = null
    try {
      let url: string
      if (heicLike || tiffLike) {
        const decoded = await decodeImageFile(f)
        url = decoded.blobUrl
        intermediateUrl = url
      } else {
        url = URL.createObjectURL(f)
        intermediateUrl = url
      }
      const elapsed = Date.now() - start
      if (elapsed < 200) await new Promise((r) => setTimeout(r, 200 - elapsed))
      if (src) {
        try {
          URL.revokeObjectURL(src)
        } catch {}
      }
      setFile(f)
      setSrc(url)
      setOrigSize(null)
      setImgEl(null)
      setOps([])
      setError(null)
      intermediateUrl = null
      navigate("/editor")
    } catch (e: unknown) {
      if (intermediateUrl) {
        try {
          URL.revokeObjectURL(intermediateUrl)
        } catch {}
      }
      const msg = e instanceof Error ? e.message : String(e)
      // decode helpers throw correct messages; fallback to generic per type
      if (msg && (msg.includes("Failed to decode") || msg.includes("Failed to load"))) {
        setError(msg)
      } else if (heicLike) {
        setError("Failed to decode HEIC image")
      } else if (tiffLike) {
        setError("Failed to decode TIFF image")
      } else {
        setError(msg || "Failed to decode HEIC image")
      }
    } finally {
      setDecoding(false)
      setPendingName(null)
    }
  }

  function applyOp(op: CropOp | ResizeOp) {
    setOps((prev) => [...prev, op])
    navigate("/editor", { replace: true })
  }

  function handleReset() {
    setOps([])
  }

  function handleClearImage() {
    let revokeError: unknown = null
    try {
      if (src) URL.revokeObjectURL(src)
    } catch (e: unknown) {
      revokeError = e
      setError(String(e))
    }
    try {
      setFile(null)
      setSrc(null)
      setImgEl(null)
      setOrigSize(null)
      setOps([])
      if (!revokeError) setError(null)
      navigate("/", { replace: true })
    } catch (e: unknown) {
      setError(String(e))
    }
  }

  function handleDownload() {
    if (!imgEl || !origSize || !file) return
    try {
      const result = compose(imgEl, origSize, ops, 1)
      const lower = file.name.toLowerCase()
      const isHeicOrTiff =
        lower.endsWith(".heic") ||
        lower.endsWith(".heif") ||
        lower.endsWith(".tif") ||
        lower.endsWith(".tiff") ||
        isHeicLike(file) ||
        isTiffLike(file)
      let effectiveName = file.name
      if (isHeicOrTiff) {
        effectiveName = file.name.replace(/\.[^.]+$/, ".png")
      }
      const ext = effectiveName.toLowerCase().split(".").pop() ?? "png"
      const isJpeg = ext === "jpg" || ext === "jpeg"
      const url = canvasToUrl(result.canvas, isJpeg ? "jpeg" : "png")
      const a = document.createElement("a")
      a.href = url
      a.download = buildDownloadName(effectiveName, new Date())
      a.click()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function handleWordmarkClick() {
    if (!hasFile) {
      handleClearImage()
      return
    }
    // at /editor with image, show confirm instead of instant clear
    if (location.pathname === "/editor") {
      setWordmarkConfirmOpen(true)
      return
    }
    handleClearImage()
  }

  function handleWordmarkConfirm() {
    setWordmarkConfirmOpen(false)
    handleClearImage()
  }

  function handleWordmarkCancel() {
    setWordmarkConfirmOpen(false)
  }

  function handleBlockerConfirm() {
    clearEditorState()
    blocker.proceed?.()
  }

  function handleBlockerCancel() {
    blocker.reset?.()
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

  // loading screen reused while decoding, shows skeleton + spinner minimum 200ms
  const decodingScreen = (
    <div className="relative flex flex-col min-h-[100dvh] bg-zinc-950">
      <div className="flex items-center justify-between h-[72px] px-6 border-b border-white/[0.08] bg-[rgba(9,9,11,0.86)] backdrop-blur-[22px] shrink-0">
        <h1 className="text-[19px] font-bold tracking-[-.02em] text-white leading-none">Photoscaler</h1>
      </div>
      <div className="flex-1 min-h-0 px-3 pt-4 flex flex-col">
        <div className="relative flex-1 rounded-[18px] overflow-hidden bg-zinc-900 border border-white/[0.08] flex flex-col items-center justify-center gap-5 min-h-[320px]">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(255,255,255,.04) 25%, rgba(255,255,255,.10) 37%, rgba(255,255,255,.04) 63%)",
              backgroundSize: "400px 100%",
              animation: "shimmer 1.4s linear infinite",
            }}
          />
          <div
            className="w-11 h-11 rounded-full border-[3px] border-white/20 border-t-white relative"
            style={{ animation: "spin .9s linear infinite" }}
          />
          <p
            className="text-[14px] font-medium text-white relative"
            style={{ animation: "pulse-soft 2.2s ease-in-out infinite" }}
          >
            Loading image…
          </p>
        </div>
        {pendingName && (
          <p className="text-center text-[11px] text-zinc-500 pt-3.5 pb-1.5 tabular-nums tracking-wide">
            {pendingName}
          </p>
        )}
      </div>
      <div className="border-t border-white/[0.08] bg-[rgba(9,9,11,0.86)] backdrop-blur-[22px] px-6 pt-4 pb-7 flex flex-col gap-3.5 shrink-0">
        <div className="flex items-center justify-center gap-3 opacity-30">
          <span className="h-11 w-11 rounded-full grid place-items-center bg-white/10 text-zinc-300">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2" />
            </svg>
          </span>
          <span className="h-11 w-11 rounded-full grid place-items-center bg-white/10 text-zinc-300">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3h18v18H3zM9 3v18M12 3v18" />
            </svg>
          </span>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes shimmer{0%{background-position:-200px 0}100%{background-position:200px 0}}@keyframes pulse-soft{0%,100%{opacity:.55}50%{opacity:1}}`}</style>
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center">
      {error && (
        <p className="fixed top-2 left-1/2 -translate-x-1/2 z-50 text-sm text-red-500 bg-zinc-900 px-3 py-1.5 rounded-full border border-red-900">
          {error}
        </p>
      )}

      {hiddenImg}

      {showBlockerModal && (
        <ConfirmDialog
          title="Clear image?"
          body="Going back will remove the image and all edits and return to the start."
          confirmLabel="Clear"
          cancelLabel="Cancel"
          onConfirm={handleBlockerConfirm}
          onCancel={handleBlockerCancel}
        />
      )}

      {wordmarkConfirmOpen && !showBlockerModal && (
        <ConfirmDialog
          title="Clear image?"
          body="This will remove the image and all edits and return to the start."
          confirmLabel="Clear"
          cancelLabel="Cancel"
          onConfirm={handleWordmarkConfirm}
          onCancel={handleWordmarkCancel}
        />
      )}

      <div className="w-full max-w-md flex-1 flex flex-col min-h-[100dvh]">
        <Routes>
          <Route
            path="/"
            element={
              decoding ? (
                decodingScreen
              ) : (
                <WelcomeScreen
                  fileName={file?.name ?? null}
                  fileSizeKb={file ? Number((file.size / 1024).toFixed(0)) : null}
                  onFile={onFilePicked}
                  disabled={decoding}
                />
              )
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
                  onReset={handleReset}
                  onDownload={handleDownload}
                  onOpenTool={(tool) =>
                    navigate(tool === "crop" ? "/editor/crop" : "/editor/resize")
                  }
                  onWordmarkClick={handleWordmarkClick}
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
