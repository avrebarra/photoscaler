import { useCallback, useRef } from "react"
import type { CropAspect, CropRect } from "../lib/crop"
import { containRect } from "../lib/crop"
import { useContainerSize } from "../hooks/useContainerSize"
import { useCropDrag } from "../hooks/useCropDrag"

export function CropOverlay({ naturalSize, rect, aspect, onRectChange, zoomScale }: CropOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const containerSize = useContainerSize(containerRef)
  const handlePointerDown = useCropDrag(containerRef, naturalSize, aspect, rect, onRectChange)

  const onContainerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
  }, [])

  if (!rect) return null

  const hasSize = containerSize.w > 0 && containerSize.h > 0
  const disp = hasSize ? containRect(containerSize, naturalSize) : null
  const left = disp ? disp.x + (rect.x / naturalSize.w) * disp.w : (rect.x / naturalSize.w) * 100
  const top = disp ? disp.y + (rect.y / naturalSize.h) * disp.h : (rect.y / naturalSize.h) * 100
  const rw = disp ? (rect.width / naturalSize.w) * disp.w : (rect.width / naturalSize.w) * 100
  const rh = disp ? (rect.height / naturalSize.h) * disp.h : (rect.height / naturalSize.h) * 100
  const rectStyle: React.CSSProperties = disp
    ? { left, top, width: rw, height: rh }
    : { left: `${left}%`, top: `${top}%`, width: `${rw}%`, height: `${rh}%` }

  // keep chrome at constant screen size when parent is zoomed via transform scale
  const z = zoomScale ?? 1
  const inv = z !== 0 && z !== 1 ? 1 / z : 1
  const chromeActive = inv !== 1
  const rectChromeStyle: React.CSSProperties = chromeActive
    ? { borderWidth: `${2 * inv}px`, boxShadow: `0 0 0 ${1 * inv}px rgba(0,0,0,0.4)` }
    : {}
  const hs = 12 * inv
  const ho = 6 * inv
  const handleChrome = (pos: string): React.CSSProperties => {
    if (!chromeActive) return {}
    const base: React.CSSProperties = {
      width: `${hs}px`,
      height: `${hs}px`,
      borderWidth: `${1 * inv}px`,
    }
    if (pos === "tl") return { ...base, top: `${-ho}px`, left: `${-ho}px` }
    if (pos === "tr") return { ...base, top: `${-ho}px`, right: `${-ho}px` }
    if (pos === "bl") return { ...base, bottom: `${-ho}px`, left: `${-ho}px` }
    if (pos === "br") return { ...base, bottom: `${-ho}px`, right: `${-ho}px` }
    if (pos === "n")
      return { ...base, top: `${-ho}px`, left: "50%", transform: "translateX(-50%)" }
    if (pos === "s")
      return { ...base, bottom: `${-ho}px`, left: "50%", transform: "translateX(-50%)" }
    if (pos === "w")
      return { ...base, left: `${-ho}px`, top: "50%", transform: "translateY(-50%)" }
    if (pos === "e")
      return { ...base, right: `${-ho}px`, top: "50%", transform: "translateY(-50%)" }
    return base
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 touch-none"
      onMouseDown={onContainerMouseDown}
    >
      <div className="absolute inset-0 bg-black/50 pointer-events-none" />
      <div
        className="absolute border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)] touch-none cursor-move"
        style={{ ...rectStyle, backgroundColor: "transparent", ...rectChromeStyle }}
        onMouseDown={handlePointerDown("move")}
        onTouchStart={handlePointerDown("move")}
      >
        {(
          [
            ["tl", "-top-1.5 -left-1.5 cursor-nw-resize"],
            ["tr", "-top-1.5 -right-1.5 cursor-ne-resize"],
            ["bl", "-bottom-1.5 -left-1.5 cursor-sw-resize"],
            ["br", "-bottom-1.5 -right-1.5 cursor-se-resize"],
          ] as const
        ).map(([h, cls]) => (
          <span
            key={h}
            className={`absolute h-3 w-3 rounded-sm border border-zinc-900 bg-white shadow ${cls}`}
            style={handleChrome(h)}
            onMouseDown={handlePointerDown("resize", h)}
            onTouchStart={handlePointerDown("resize", h)}
          />
        ))}
        {aspect === "free" &&
          (
            [
              ["n", "left-1/2 -top-1.5 -translate-x-1/2 cursor-n-resize"],
              ["s", "left-1/2 -bottom-1.5 -translate-x-1/2 cursor-s-resize"],
              ["w", "top-1/2 -left-1.5 -translate-y-1/2 cursor-w-resize"],
              ["e", "top-1/2 -right-1.5 -translate-y-1/2 cursor-e-resize"],
            ] as const
          ).map(([h, cls]) => (
            <span
              key={h}
              className={`absolute h-3 w-3 rounded-sm border border-zinc-900 bg-white shadow hidden sm:block ${cls}`}
              style={handleChrome(h)}
              onMouseDown={handlePointerDown("resize", h)}
              onTouchStart={handlePointerDown("resize", h)}
            />
          ))}
      </div>
    </div>
  )
}

export type CropOverlayProps = {
  naturalSize: { w: number; h: number }
  rect: CropRect | null
  aspect: CropAspect
  onRectChange: (rect: CropRect) => void
  onAspectChange: (aspect: CropAspect) => void
  zoomScale?: number
}
