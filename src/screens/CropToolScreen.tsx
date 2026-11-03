import { useEffect, useReducer, useRef, useState } from "react"
import { Eye, Scan } from "lucide-react"
import type { CropAspect, CropRect } from "../lib/crop"
import { containRect } from "../lib/crop"
import { type CropOp, conformRectToAspect, defaultCropRect, type Op, type Size } from "../lib/pipeline"
import { useComposedImage } from "../hooks/useComposedImage"
import { useContainerSize } from "../hooks/useContainerSize"
import { usePinchZoom } from "../hooks/usePinchZoom"
import { CropOverlay } from "../components/CropOverlay"
import { DimensionBadge } from "../components/chrome"
import { ToolPage, ToolDock } from "../components/ToolPage"

const ASPECTS: { label: string; value: CropAspect }[] = [
  { label: "Free", value: "free" },
  { label: "1:1", value: "1:1" },
  { label: "4:3", value: "4:3" },
  { label: "16:9", value: "16:9" },
  { label: "Original", value: "original" },
]

const SETTLE_MS = 500
const ANIM_MS = 250

// crop tool: zoom-to-fit crop with settle-triggered fit and single transform layer
export function CropToolScreen({ imgEl, origSize, baseOps, onApply }: CropToolScreenProps) {
  const { url, stageSize } = useComposedImage(imgEl, origSize, baseOps)
  const [draft, setDraft] = useReducer(
    (prev: CropRect | null, next: CropRect | null | ((p: CropRect | null) => CropRect | null)) =>
      typeof next === "function" ? (next as (p: CropRect | null) => CropRect | null)(prev) : next,
    null as CropRect | null,
  )
  const [aspect, setAspect] = useState<CropAspect>("free")
  const [view, setView] = useState<"fit" | "full">("full")
  const [isAnimating, setIsAnimating] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)
  const heroSize = useContainerSize(heroRef)
  const pinch = usePinchZoom(heroRef)
  const lastTapRef = useRef(0)

  const settleRef = useRef<number | null>(null)
  const animRef = useRef<number | null>(null)
  const isDraggingRef = useRef(false)
  const dragStartSizeRef = useRef<{ width: number; height: number } | null>(null)
  const prevSizeRef = useRef<{ width: number; height: number } | null>(null)
  const viewRef = useRef(view)
  const draftRef = useRef(draft)
  const isAnimatingRef = useRef(isAnimating)
  const [lockedFitT, setLockedFitT] = useState<{ scale: number; tx: number; ty: number } | null>(null)
  const lockedDraftSizeRef = useRef<{ width: number; height: number } | null>(null)
  const lockedFitTRef = useRef<{ scale: number; tx: number; ty: number } | null>(null)
  const panStartRef = useRef<{
    x: number
    y: number
    tx: number
    ty: number
    draft: CropRect
    scale: number
    full: { x: number; y: number; scale: number }
    fit: { x: number; y: number }
  } | null>(null)
  const isPanningRef = useRef(false)

  // keep refs in sync
  useEffect(() => {
    viewRef.current = view
  }, [view])
  useEffect(() => {
    draftRef.current = draft
  }, [draft])
  useEffect(() => {
    isAnimatingRef.current = isAnimating
  }, [isAnimating])
  useEffect(() => {
    isDraggingRef.current = isDragging
  }, [isDragging])
  useEffect(() => {
    lockedFitTRef.current = lockedFitT
  }, [lockedFitT])

  // seed / reseed the centered 80 percent draft whenever the stage changes
  useEffect(() => {
    if (!origSize || stageSize.w < 1) return
    setDraft((prev) => {
      if (prev && prev.x + prev.width <= stageSize.w && prev.y + prev.height <= stageSize.h) {
        return prev
      }
      return defaultCropRect(stageSize)
    })
  }, [origSize, stageSize])

  // reset to full on entry and stage change
  useEffect(() => {
    if (!origSize || stageSize.w < 1) return
    setView("full")
    setIsAnimating(false)
    setLockedFitT(null)
    lockedDraftSizeRef.current = null
    prevSizeRef.current = null
    if (settleRef.current) {
      clearTimeout(settleRef.current)
      settleRef.current = null
    }
    if (animRef.current) {
      clearTimeout(animRef.current)
      animRef.current = null
    }
  }, [origSize, stageSize.w, stageSize.h])

  // disable pinch when fitted
  useEffect(() => {
    if (view === "fit") pinch.reset()
  }, [view]) // eslint-disable-line react-hooks/exhaustive-deps

  // track dragging via window capture listeners, scoped to hero
  // in fit view, dragging pans the image under a fixed crop rect (no zoom change)
  useEffect(() => {
    const isHandle = (target: Element | null) => {
      if (!target) return false
      const el = target instanceof Element ? target : (target as unknown as Element).parentElement
      if (!el) return false
      return !!el.closest('span[class*="cursor-"]')
    }
    const pointFrom = (e: Event) => {
      if (e instanceof MouseEvent) return { x: e.clientX, y: e.clientY }
      if (e instanceof TouchEvent) {
        const t = e.touches[0] || e.changedTouches[0]
        if (t) return { x: t.clientX, y: t.clientY }
      }
      return null
    }
    const onDown = (e: Event) => {
      const hero = heroRef.current
      if (!hero) return
      const target = e.target as Node | null
      if (!target || !hero.contains(target as Node)) return
      const pt = pointFrom(e)
      // fit view pan: if not on handle, start panning the image under fixed rect
      if (viewRef.current === "fit" && !isHandle(target as Element) && draftRef.current && heroSize.w > 0 && stageSize.w > 0) {
        const cur = draftRef.current
        const locked = lockedFitTRef.current
        const h = heroSize
        const s = stageSize
        const full = containRect(h, s)
        const innerHero = { w: h.w * 0.8, h: h.h * 0.8 }
        const fitVirtual = containRect(innerHero, { w: cur.width, h: cur.height })
        const fit = {
          x: fitVirtual.x + h.w * 0.1,
          y: fitVirtual.y + h.h * 0.1,
        }
        const scale = locked?.scale ?? (full.scale === 0 ? 1 : fitVirtual.scale / full.scale)
        const tx = locked?.tx ?? (full.scale === 0 ? 0 : fit.x - (full.x + cur.x * full.scale) * scale)
        const ty = locked?.ty ?? (full.scale === 0 ? 0 : fit.y - (full.y + cur.y * full.scale) * scale)
        if (pt) {
          panStartRef.current = { x: pt.x, y: pt.y, tx, ty, draft: cur, scale, full, fit }
          isPanningRef.current = true
        }
      }
      isDraggingRef.current = true
      setIsDragging(true)
      const cur = draftRef.current
      dragStartSizeRef.current = cur ? { width: cur.width, height: cur.height } : null
    }
    const onMove = (e: Event) => {
      if (!isPanningRef.current || !panStartRef.current) return
      if (viewRef.current !== "fit") return
      const pt = pointFrom(e)
      if (!pt) return
      const start = panStartRef.current
      const dx = pt.x - start.x
      const dy = pt.y - start.y
      const scale = start.scale
      const full = start.full
      const stDraft = start.draft
      // new draft is inverse of pan, clamped to stage bounds
      const rawX = stDraft.x - dx / (full.scale * scale)
      const rawY = stDraft.y - dy / (full.scale * scale)
      const maxX = Math.max(0, stageSize.w - stDraft.width)
      const maxY = Math.max(0, stageSize.h - stDraft.height)
      const clampedX = Math.min(maxX, Math.max(0, rawX))
      const clampedY = Math.min(maxY, Math.max(0, rawY))
      // recompute tx/ty from clamped draft so rect stays fixed
      const clampedDx = (stDraft.x - clampedX) * full.scale * scale
      const clampedDy = (stDraft.y - clampedY) * full.scale * scale
      const newTx = start.tx + clampedDx
      const newTy = start.ty + clampedDy
      setLockedFitT({ scale, tx: newTx, ty: newTy })
      // update draft position without changing size, keep aspect
      setDraft({ x: Math.round(clampedX), y: Math.round(clampedY), width: stDraft.width, height: stDraft.height })
    }
    const onUp = () => {
      const wasPanning = isPanningRef.current
      if (wasPanning) {
        isPanningRef.current = false
        panStartRef.current = null
      }
      if (!isDraggingRef.current) return
      isDraggingRef.current = false
      setIsDragging(false)
      const cur = draftRef.current
      const start = dragStartSizeRef.current
      dragStartSizeRef.current = null
      if (!cur || !start) return
      const resized = start.width !== cur.width || start.height !== cur.height
      // full view: resize triggers settle to fit
      if (viewRef.current === "full") {
        if (!resized) return
        if (settleRef.current) clearTimeout(settleRef.current)
        settleRef.current = window.setTimeout(() => {
          if (isDraggingRef.current) return
          setView("fit")
          setIsAnimating(true)
          if (animRef.current) clearTimeout(animRef.current)
          animRef.current = window.setTimeout(() => setIsAnimating(false), ANIM_MS)
        }, SETTLE_MS)
        return
      }
      // fit view: panning never triggers settle; resize still handled by effect
      if (viewRef.current === "fit") {
        return
      }
    }
    window.addEventListener("mousedown", onDown, true)
    window.addEventListener("touchstart", onDown, true)
    window.addEventListener("mousemove", onMove, true)
    window.addEventListener("touchmove", onMove, true)
    window.addEventListener("mouseup", onUp, true)
    window.addEventListener("touchend", onUp, true)
    return () => {
      window.removeEventListener("mousedown", onDown, true)
      window.removeEventListener("touchstart", onDown, true)
      window.removeEventListener("mousemove", onMove, true)
      window.removeEventListener("touchmove", onMove, true)
      window.removeEventListener("mouseup", onUp, true)
      window.removeEventListener("touchend", onUp, true)
    }
  }, [heroSize, stageSize])

  // cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (settleRef.current) clearTimeout(settleRef.current)
      if (animRef.current) clearTimeout(animRef.current)
    }
  }, [])

  // settle-triggered fit: resize width/height change while in full view
  useEffect(() => {
    if (!draft) return
    if (!prevSizeRef.current) {
      prevSizeRef.current = { width: draft.width, height: draft.height }
      return
    }
    const prev = prevSizeRef.current
    const resized = prev.width !== draft.width || prev.height !== draft.height
    prevSizeRef.current = { width: draft.width, height: draft.height }
    if (view !== "full") return
    if (!resized) return
    if (isDraggingRef.current) return
    if (settleRef.current) clearTimeout(settleRef.current)
    settleRef.current = window.setTimeout(() => {
      if (isDraggingRef.current) return
      setView("fit")
      setIsAnimating(true)
      if (animRef.current) clearTimeout(animRef.current)
      animRef.current = window.setTimeout(() => setIsAnimating(false), ANIM_MS)
    }, SETTLE_MS)
    return () => {
      if (settleRef.current) {
        clearTimeout(settleRef.current)
        settleRef.current = null
      }
    }
  }, [draft, view])

  // fit view: lock zoom while repositioning, only resize re-fits after settle
  useEffect(() => {
    if (view !== "fit" || !draft) return
    if (isDragging) return
    if (!lockedDraftSizeRef.current) return
    const prev = lockedDraftSizeRef.current
    const resized = prev.width !== draft.width || prev.height !== draft.height
    if (!resized) return
    if (settleRef.current) clearTimeout(settleRef.current)
    settleRef.current = window.setTimeout(() => {
      if (isDraggingRef.current) return
      const h = heroSize.w > 0 ? heroSize : null
      const s = stageSize.w > 0 ? stageSize : null
      const cur = draftRef.current
      if (!h || !s || !cur) return
      const nextFit = computeFitTransform(h, s, cur)
      setLockedFitT(nextFit)
      lockedDraftSizeRef.current = { width: cur.width, height: cur.height }
      setIsAnimating(true)
      if (animRef.current) clearTimeout(animRef.current)
      animRef.current = window.setTimeout(() => setIsAnimating(false), ANIM_MS)
    }, SETTLE_MS)
    return () => {
      if (settleRef.current) {
        clearTimeout(settleRef.current)
        settleRef.current = null
      }
    }
  }, [draft, view, isDragging, heroSize, stageSize])

  function handleAspect(a: CropAspect) {
    setAspect(a)
    if (!draft) return
    const next = conformRectToAspect(draft, a, stageSize)
    setDraft({
      x: Math.round(next.x),
      y: Math.round(next.y),
      width: Math.round(next.width),
      height: Math.round(next.height),
    })
  }

  function handleApply() {
    if (!draft || !origSize) return
    onApply({ type: "crop", rect: draft, aspect })
  }

  function toggleView() {
    const next = view === "fit" ? "full" : "fit"
    if (settleRef.current) {
      clearTimeout(settleRef.current)
      settleRef.current = null
    }
    if (next === "fit" && draft && heroSize.w > 0 && stageSize.w > 0) {
      const nextFit = computeFitTransform(heroSize, stageSize, draft)
      setLockedFitT(nextFit)
      lockedDraftSizeRef.current = { width: draft.width, height: draft.height }
    }
    setView(next)
    setIsAnimating(true)
    if (animRef.current) clearTimeout(animRef.current)
    animRef.current = window.setTimeout(() => {
      setIsAnimating(false)
      if (next === "full") {
        setLockedFitT(null)
        lockedDraftSizeRef.current = null
      }
    }, ANIM_MS)
  }

  function handleHeroTap() {
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      toggleView()
      lastTapRef.current = 0
      return
    }
    lastTapRef.current = now
  }

  function handleRectChange(rect: CropRect) {
    // in fit view, move (same w/h) is handled by panning the image under a fixed rect
    if (viewRef.current === "fit") {
      if (isPanningRef.current) return
      const cur = draftRef.current
      if (cur && rect.width === cur.width && rect.height === cur.height) return
    }
    setDraft(rect)
  }

  // fit transform maps draft rect to 80 percent of hero (10 percent margin each side) so handles stay visible
  const hasHero = heroSize.w > 0 && heroSize.h > 0 && stageSize.w > 0 && !!draft
  const fitT = hasHero && draft ? computeFitTransform(heroSize, stageSize, draft) : null

  // keep lockedFitT in sync when entering fit via full->fit settle (fitT becomes available after view flips)
  useEffect(() => {
    if (view === "fit" && fitT && !lockedFitT && !isDragging) {
      setLockedFitT(fitT)
      if (draft) lockedDraftSizeRef.current = { width: draft.width, height: draft.height }
    }
  }, [view, fitT, lockedFitT, isDragging, draft])

  const displayUrl = url

  const pinchActive = view === "full"
  const bindProps = pinchActive ? (pinch.bind() as unknown as Record<string, unknown>) : {}
  const badgeVisible = !!origSize && stageSize.w > 0 && stageSize.h > 0 && !!url

  const displayFitT = view === "fit" ? (lockedFitT ?? fitT) : null
  const overlayZoom = view === "fit" && displayFitT ? displayFitT.scale : 1

  // one transformed layer hosts image + overlay
  let layerStyle: React.CSSProperties | undefined
  if (view === "fit" && displayFitT) {
    layerStyle = {
      transform: `translate(${displayFitT.tx}px, ${displayFitT.ty}px) scale(${displayFitT.scale})`,
      transformOrigin: "0 0",
      transition: isDragging ? "none" : isAnimating ? `transform ${ANIM_MS}ms ease-out` : "none",
    }
  } else if (pinchActive && (pinch.scale !== 1 || pinch.tx !== 0 || pinch.ty !== 0)) {
    layerStyle = {
      transform: `translate(${pinch.tx}px, ${pinch.ty}px) scale(${pinch.scale})`,
      transformOrigin: "center center",
    }
  } else if (isAnimating && view === "full" && (lockedFitT ?? fitT)) {
    layerStyle = {
      transform: "translate(0px, 0px) scale(1)",
      transformOrigin: "0 0",
      transition: `transform ${ANIM_MS}ms ease-out`,
    }
  }

  return (
    <ToolPage title="Crop" backHref="/editor" onApply={handleApply} applyDisabled={!draft}>
      <div className="flex-1 min-h-0 flex flex-col px-3 pt-4">
        <div
          ref={heroRef}
          onClick={handleHeroTap}
          className="relative flex-1 rounded-[18px] overflow-hidden bg-black min-h-[320px] select-none"
          {...bindProps}
        >
          {displayUrl && stageSize.w > 0 && draft ? (
            <>
              <div className="absolute inset-0" style={layerStyle}>
                <img
                  src={displayUrl}
                  alt="crop canvas"
                  className="absolute inset-0 h-full w-full object-contain"
                  style={{ transition: "opacity 180ms ease" }}
                />
                <CropOverlay
                  naturalSize={stageSize}
                  rect={draft}
                  aspect={aspect}
                  onRectChange={handleRectChange}
                  onAspectChange={() => {}}
                  zoomScale={overlayZoom}
                />
              </div>
              <button
                type="button"
                aria-label={view === "fit" ? "Show original" : "Show result"}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleView()
                }}
                className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-black/60 backdrop-blur grid place-items-center text-white border border-white/20 active:scale-95 transition"
              >
                {view === "fit" ? <Eye size={16} /> : <Scan size={16} />}
              </button>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs text-zinc-500">Rendering…</span>
            </div>
          )}
          <DimensionBadge w={stageSize.w} h={stageSize.h} visible={badgeVisible} />
        </div>
      </div>

      <ToolDock>
        <div className="flex gap-2 justify-between">
          {ASPECTS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => handleAspect(p.value)}
              className={`flex-1 h-11 rounded-full text-[13px] font-medium transition active:scale-[0.98] ${
                aspect === p.value ? "bg-white text-black" : "bg-white/10 text-zinc-300"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500 px-1">
          Drag to move, handles to resize. {aspect !== "free" ? "Ratio locked." : "Free ratio."}
        </p>
      </ToolDock>
    </ToolPage>
  )
}

// map draft rect to 80 percent of hero (10 percent margin each side) so handles stay fully visible
function computeFitTransform(
  hero: { w: number; h: number },
  stage: Size,
  draft: CropRect,
): { scale: number; tx: number; ty: number } {
  const full = containRect(hero, stage)
  if (full.scale === 0) return { scale: 1, tx: 0, ty: 0 }
  const innerHero = { w: hero.w * 0.8, h: hero.h * 0.8 }
  const fitVirtual = containRect(innerHero, { w: draft.width, h: draft.height })
  if (fitVirtual.scale === 0) return { scale: 1, tx: 0, ty: 0 }
  const fit = {
    x: fitVirtual.x + hero.w * 0.1,
    y: fitVirtual.y + hero.h * 0.1,
    w: fitVirtual.w,
    h: fitVirtual.h,
    scale: fitVirtual.scale,
  }
  const scale = fit.scale / full.scale
  const x_d = full.x + draft.x * full.scale
  const y_d = full.y + draft.y * full.scale
  const tx = fit.x - x_d * scale
  const ty = fit.y - y_d * scale
  return { scale, tx, ty }
}

type CropToolScreenProps = {
  imgEl: HTMLImageElement | null
  origSize: Size | null
  baseOps: Op[]
  onApply: (op: CropOp) => void
}
