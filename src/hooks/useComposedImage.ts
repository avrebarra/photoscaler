import { useEffect, useRef, useState } from "react"
import { compose, stageSize, type Op, type Size } from "../lib/pipeline"
import { canvasToUrl } from "../lib/scale"

// live compose: walks the op list and hands back a data URL plus the
// full-res stage size (what the next op anchors to). preview is full-res
// composed then displayed CSS-constrained — avoids the canvas-as-Blob bug
// and keeps correctness simple. display-res downscale can be added later
// as an optimization; getting the image on screen comes first.
export function useComposedImage(
  base: HTMLImageElement | HTMLCanvasElement | null,
  origSize: Size | null,
  ops: Op[],
  debounceMs = 80,
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
        // full-res compose; CSS constrains the <img> to 360px so no OOM
        // worry for preview — the real cost is Download which also does 1.
        const result = compose(base, origSize, ops, 1)
        const dataUrl = canvasToUrl(result.canvas, "png")
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
