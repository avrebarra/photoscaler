import { useEffect, useReducer, useRef } from "react"
import { compose, previewScale, stageSize, type Op, type Size } from "../lib/pipeline"
import { canvasToUrl } from "../lib/scale"

// live compose: walks op list and returns data URL plus stage size.
// preview composes at display resolution so scrub stays fast,
// full-res is only for Download and Apply.
export function useComposedImage(
  base: HTMLImageElement | HTMLCanvasElement | null,
  origSize: Size | null,
  ops: Op[],
  debounceMs = 50,
): { url: string | null; stageSize: Size } {
  const [url, setUrl] = useReducer(
    (_: string | null, next: string | null) => next,
    null as string | null,
  )
  const prevUrl = useRef<string | null>(null)
  const stage: Size = origSize ? stageSize(origSize, ops) : { w: 0, h: 0 }

  useEffect(() => {
    if (!base || !origSize) {
      prevUrl.current = null
      setUrl(null)
      return
    }
    if (base instanceof HTMLImageElement && (!base.complete || base.naturalWidth === 0)) {
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      try {
        const finalStage = stageSize(origSize, ops)
        const s = previewScale(finalStage, 900)
        const result = compose(base, origSize, ops, s)
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
