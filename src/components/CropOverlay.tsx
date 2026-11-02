import { useCallback, useRef } from "react"
import type { CropAspect, CropRect } from "../lib/crop"

export type CropOverlayProps = {
  naturalSize: { w: number; h: number }
  rect: CropRect | null
  aspect: CropAspect
  onRectChange: (rect: CropRect) => void
  onAspectChange: (aspect: CropAspect) => void
}

function ratioForAspect(aspect: CropAspect, naturalSize: { w: number; h: number }): number | null {
  switch (aspect) {
    case "1:1":
      return 1
    case "4:3":
      return 4 / 3
    case "16:9":
      return 16 / 9
    case "original":
      return naturalSize.w / naturalSize.h
    case "free":
    default:
      return null
  }
}

export function CropOverlay({ naturalSize, rect, aspect, onRectChange }: CropOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    type: "move" | "resize"
    handle?: string
    startX: number
    startY: number
    startRect: CropRect
  } | null>(null)

  const getPoint = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    if ("touches" in e) {
      const t = (e as TouchEvent).touches[0] ?? (e as React.TouchEvent).touches[0]
      return t ? { x: t.clientX, y: t.clientY } : { x: 0, y: 0 }
    }
    return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY }
  }

  const handlePointerDown =
    (type: "move" | "resize", handle?: string) => (e: React.MouseEvent | React.TouchEvent) => {
      if (!rect || !containerRef.current) return
      e.preventDefault()
      e.stopPropagation()
      const p = getPoint(e as unknown as MouseEvent)
      dragRef.current = { type, handle, startX: p.x, startY: p.y, startRect: { ...rect } }

      const onMove = (ev: MouseEvent | TouchEvent) => {
        if (!dragRef.current || !containerRef.current) return
        const cur = getPoint(ev as unknown as MouseEvent)
        const dx = cur.x - dragRef.current.startX
        const dy = cur.y - dragRef.current.startY
        const el = containerRef.current!
        const rectEl = el.getBoundingClientRect()
        if (rectEl.width === 0 || rectEl.height === 0) return

        const scaleX = naturalSize.w / rectEl.width
        const scaleY = naturalSize.h / rectEl.height

        const start = dragRef.current.startRect
        const ratio = ratioForAspect(aspect, naturalSize)
        let next: CropRect = { ...start }

        try {
          if (dragRef.current.type === "move") {
            const dnx = dx * scaleX
            const dny = dy * scaleY
            let nx = start.x + dnx
            let ny = start.y + dny
            nx = Math.max(0, Math.min(nx, naturalSize.w - start.width))
            ny = Math.max(0, Math.min(ny, naturalSize.h - start.height))
            next = { x: nx, y: ny, width: start.width, height: start.height }
          } else {
            // resize via handles: tl, tr, bl, br
            const h = dragRef.current.handle ?? "br"
            let newW = start.width
            let newH = start.height
            let newX = start.x
            let newY = start.y

            const dnx = dx * scaleX
            const dny = dy * scaleY

            if (h.includes("e") || h === "br" || h === "tr") {
              newW = start.width + dnx
            }
            if (h.includes("w") || h === "bl" || h === "tl") {
              newW = start.width - dnx
              newX = start.x + dnx
            }
            if (h.includes("s") || h === "br" || h === "bl") {
              newH = start.height + dny
            }
            if (h.includes("n") || h === "tr" || h === "tl") {
              newH = start.height - dny
              newY = start.y + dny
            }
            // handle br/tr/bl/tl as corner drags — above already covers, but ensure diagonal
            if (h === "br") {
              newW = start.width + dnx
              newH = start.height + dny
            } else if (h === "tr") {
              newW = start.width + dnx
              newH = start.height - dny
              newY = start.y + dny
            } else if (h === "bl") {
              newW = start.width - dnx
              newX = start.x + dnx
              newH = start.height + dny
            } else if (h === "tl") {
              newW = start.width - dnx
              newX = start.x + dnx
              newH = start.height - dny
              newY = start.y + dny
            }

            // enforce minimum 1px
            if (newW < 1) {
              if (h.includes("w") || h === "tl" || h === "bl") newX += newW - 1
              newW = 1
            }
            if (newH < 1) {
              if (h.includes("n") || h === "tl" || h === "tr") newY += newH - 1
              newH = 1
            }

            // aspect ratio enforcement
            if (ratio !== null) {
              // decide which dimension drives: use larger delta
              const absDx = Math.abs(newW - start.width)
              const absDy = Math.abs(newH - start.height)
              if (absDx > absDy) {
                newH = newW / ratio
              } else {
                newW = newH * ratio
              }
              // re-derive x/y for handles that anchor opposite corner
              if (h.includes("w") || h === "tl" || h === "bl") {
                newX = start.x + start.width - newW
              }
              if (h.includes("n") || h === "tl" || h === "tr") {
                newY = start.y + start.height - newH
              }
              if (newW < 1) newW = 1
              if (newH < 1) newH = 1
            }

            // clamp to bounds
            if (newX < 0) {
              newW += newX
              newX = 0
            }
            if (newY < 0) {
              newH += newY
              newY = 0
            }
            if (newX + newW > naturalSize.w) newW = naturalSize.w - newX
            if (newY + newH > naturalSize.h) newH = naturalSize.h - newY
            if (newW < 1) newW = 1
            if (newH < 1) newH = 1

            next = { x: newX, y: newY, width: newW, height: newH }
          }

          // never throw — clamp already
          onRectChange(next)
        } catch {
          // CropOverlay never throws
        }
      }

      const onUp = () => {
        dragRef.current = null
        window.removeEventListener("mousemove", onMove as unknown as EventListener)
        window.removeEventListener("mouseup", onUp)
        window.removeEventListener("touchmove", onMove as unknown as EventListener)
        window.removeEventListener("touchend", onUp)
      }

      window.addEventListener("mousemove", onMove as unknown as EventListener, { passive: false })
      window.addEventListener("mouseup", onUp)
      window.addEventListener("touchmove", onMove as unknown as EventListener, { passive: false })
      window.addEventListener("touchend", onUp)
    }

  const onContainerMouseDown = useCallback((e: React.MouseEvent) => {
    // clicking outside rect does nothing; drag is only on rect
    e.preventDefault()
  }, [])

  if (!rect) return null

  // percent positions for overlay
  const leftPct = (rect.x / naturalSize.w) * 100
  const topPct = (rect.y / naturalSize.h) * 100
  const wPct = (rect.width / naturalSize.w) * 100
  const hPct = (rect.height / naturalSize.h) * 100

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 touch-none"
      onMouseDown={onContainerMouseDown}
    >
      {/* dim outside rect */}
      <div className="absolute inset-0 bg-black/50 pointer-events-none" />
      {/* rect */}
      <div
        className="absolute border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)] touch-none cursor-move"
        style={{
          left: `${leftPct}%`,
          top: `${topPct}%`,
          width: `${wPct}%`,
          height: `${hPct}%`,
          backgroundColor: "transparent",
        }}
        onMouseDown={handlePointerDown("move")}
        onTouchStart={handlePointerDown("move")}
      >
        {/* corner handles */}
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
            onMouseDown={handlePointerDown("resize", h)}
            onTouchStart={handlePointerDown("resize", h)}
          />
        ))}
        {/* edge midpoints for free aspect */}
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
              onMouseDown={handlePointerDown("resize", h)}
              onTouchStart={handlePointerDown("resize", h)}
            />
          ))}
      </div>
    </div>
  )
}
