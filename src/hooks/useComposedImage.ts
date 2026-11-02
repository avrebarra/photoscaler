import { useEffect, useRef, useState } from "react"
import { compose, previewScale, stageSize, type Op, type Size } from "../lib/pipeline"
import { canvasToUrl } from "../lib/scale"

// live compose: walks the op list and hands back a data URL plus the
// full-res stage size (what the next op anchors to). preview composes at
// display resolution (previewScale) so slider scrub stays at ~60fps even
// for 4000px photos — full-res (scale=1) is only for Download/Apply.
export function useComposedImage(
  base: HTMLImageElement | HTMLCanvasElement | null,
  origSize: Size | null,
  ops: Op[],
  debounceMs = 50,
): { url: string | null; stageSize: Size } {
  const [url, setUrl] = useState<string | null>(null)
  const prevUrl = useRef<string | null>(null)
  const stage: Size = origSize ? stageSize(origSize, ops) : { w: 0, h: 0 }

  useEffect(() => {
    if (!base || !origSize) {
      prevUrl.current = null
      setUrl(null)
      return
    }
    // guard: image element must actually be decoded
    if (base instanceof HTMLImageElement && (!base.complete || base.naturalWidth === 0)) {
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      try {
        // preview scale: fit long side to ~900px (2× container width for
        // retina) — cuts pixels ~10-20× for large photos, makes
        // toDataURL + grain + lanczos cheap. CSS object-contain handles
        // actual display size; Download path still uses scale=1.
        const finalStage = stageSize(origSize, ops)
        const s = previewScale(finalStage, 900)
        const result = compose(base, origSize, ops, s)
        // jpeg encodes much faster and is smaller than png at preview size;
        // alpha is not needed for photo preview (canvas is opaque after draw).
        let dataUrl: string
        try {
          dataUrl = canvasToUrl(result.canvas, "jpeg")
        } catch {
          dataUrl = canvasToUrl(result.canvas, "png")
        }
        if (!cancelled) {
          prevUrl.current = dataUrl
          setUrl(dataUrl)
        }
      } catch (e) {
        if (!cancelled) console.error("[compose]", e)
      }
    }, debounceMs)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [base, origSize, ops, debounceMs])

  return { url, stageSize: stage }
}
