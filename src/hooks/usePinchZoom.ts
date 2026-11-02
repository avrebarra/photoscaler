import { useCallback, useEffect, useRef, useState } from "react"
import { useGesture } from "@use-gesture/react"

type UsePinchZoomOpts = {
  min?: number
  max?: number
}

type UsePinchZoomReturn = {
  scale: number
  tx: number
  ty: number
  reset: () => void
  bind: ReturnType<typeof useGesture>
}

// view-only pinch zoom for preview images — local transform, no pipeline side effects
export function usePinchZoom(
  ref: React.RefObject<HTMLElement | null>,
  opts?: UsePinchZoomOpts,
): UsePinchZoomReturn {
  const min = opts?.min ?? 1
  const max = opts?.max ?? 4

  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)

  const scaleRef = useRef(1)
  const txRef = useRef(0)
  const tyRef = useRef(0)
  const lastTapRef = useRef(0)

  // clamp pan so blank edges never show
  const clampPan = useCallback(
    (nextTx: number, nextTy: number, nextScale: number) => {
      if (nextScale <= 1) return { x: 0, y: 0 }
      const el = ref.current
      if (!el) return { x: nextTx, y: nextTy }
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return { x: nextTx, y: nextTy }
      const maxX = ((nextScale - 1) * rect.width) / 2
      const maxY = ((nextScale - 1) * rect.height) / 2
      return {
        x: Math.max(-maxX, Math.min(maxX, nextTx)),
        y: Math.max(-maxY, Math.min(maxY, nextTy)),
      }
    },
    [ref],
  )

  const reset = useCallback(() => {
    scaleRef.current = 1
    txRef.current = 0
    tyRef.current = 0
    setScale(1)
    setTx(0)
    setTy(0)
  }, [])

  // desktop double-click reset (useGesture has no onDoubleClick gesture)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onDbl = () => {
      try {
        reset()
      } catch (e) {
        console.error("[pinch-zoom]", e)
      }
    }
    el.addEventListener("dblclick", onDbl)
    return () => el.removeEventListener("dblclick", onDbl)
  }, [ref, reset])

  const bind = useGesture(
    {
      // pinch: two-finger or trackpad pinch, scale in offset[0]
      onPinch: ({ offset: [d] }) => {
        try {
          const clamped = Math.max(min, Math.min(max, d))
          scaleRef.current = clamped
          const { x, y } = clampPan(txRef.current, tyRef.current, clamped)
          txRef.current = x
          tyRef.current = y
          setScale(clamped)
          setTx(x)
          setTy(y)
        } catch (e) {
          console.error("[pinch-zoom]", e)
        }
      },
      // drag: pan when zoomed, tap sequence for double-tap reset
      onDrag: ({ offset: [ox, oy], tap }) => {
        try {
          if (tap) {
            const now = Date.now()
            if (now - lastTapRef.current < 300) reset()
            lastTapRef.current = now
            return
          }
          if (scaleRef.current <= 1) return
          const { x, y } = clampPan(ox, oy, scaleRef.current)
          txRef.current = x
          tyRef.current = y
          setTx(x)
          setTy(y)
        } catch (e) {
          console.error("[pinch-zoom]", e)
        }
      },
      // desktop ctrl+wheel parity — pinch already covers wheel, this keeps page zoom blocked
      onWheel: ({ event }) => {
        try {
          const wheelEvent = event as WheelEvent
          if (!wheelEvent.ctrlKey) return
          // prevent page zoom, pinch handler will have already updated if mapped — keep in sync
          wheelEvent.preventDefault()
        } catch (e) {
          console.error("[pinch-zoom]", e)
        }
      },
    },
    {
      // scale maps to offset[0] starting from current scale
      pinch: {
        from: () => [scaleRef.current, 0],
        scaleBounds: { min, max },
        rubberband: true,
      },
      drag: {
        from: () => [txRef.current, tyRef.current],
        filterTaps: true,
        // prevent browser scroll/zoom while dragging
        preventDefault: true,
      },
      wheel: {
        preventDefault: true,
      },
    },
  )

  return { scale, tx, ty, reset, bind }
}
