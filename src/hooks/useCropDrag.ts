import { useRef } from "react"
import { containRect, ratioForAspect } from "../lib/crop"
import type { CropAspect, CropRect } from "../lib/crop"

export function useCropDrag(
  containerRef: React.RefObject<HTMLDivElement | null>,
  naturalSize: { w: number; h: number },
  aspect: CropAspect,
  rect: CropRect | null,
  onRectChange: (r: CropRect) => void,
) {
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
        const disp = containRect({ w: rectEl.width, h: rectEl.height }, naturalSize)
        if (disp.w === 0 || disp.h === 0) return
        const scaleX = naturalSize.w / disp.w
        const scaleY = naturalSize.h / disp.h

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
            const h = dragRef.current.handle ?? "br"
            let newW = start.width
            let newH = start.height
            let newX = start.x
            let newY = start.y
            const dnx = dx * scaleX
            const dny = dy * scaleY
            if (h.includes("e") || h === "br" || h === "tr") newW = start.width + dnx
            if (h.includes("w") || h === "bl" || h === "tl") {
              newW = start.width - dnx
              newX = start.x + dnx
            }
            if (h.includes("s") || h === "br" || h === "bl") newH = start.height + dny
            if (h.includes("n") || h === "tr" || h === "tl") {
              newH = start.height - dny
              newY = start.y + dny
            }
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
            if (newW < 1) {
              if (h.includes("w") || h === "tl" || h === "bl") newX += newW - 1
              newW = 1
            }
            if (newH < 1) {
              if (h.includes("n") || h === "tl" || h === "tr") newY += newH - 1
              newH = 1
            }
            if (ratio !== null) {
              const absDx = Math.abs(newW - start.width)
              const absDy = Math.abs(newH - start.height)
              if (absDx > absDy) newH = newW / ratio
              else newW = newH * ratio
              if (h.includes("w") || h === "tl" || h === "bl") newX = start.x + start.width - newW
              if (h.includes("n") || h === "tl" || h === "tr") newY = start.y + start.height - newH
              if (newW < 1) newW = 1
              if (newH < 1) newH = 1
            }
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
          onRectChange(next)
        } catch {}
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

  return handlePointerDown
}
