// pure Canvas op-stack compose engine — no React
import { type CropRect, type CropAspect, ratioForAspect } from "./crop"
export { ratioForAspect }
import type { ScaleMode } from "./scale"
import { applyNoise } from "./scale"

// ops are anchored: a crop's rect is in absolute pixels of its base (the
// composite of all prior ops); resize is relative, so it needs no base coords.
export type CropOp = { type: "crop"; rect: CropRect; aspect: CropAspect }
export type ResizeOp = { type: "resize"; percent: number; mode: ScaleMode; noiseStrength?: number }
export type Op = CropOp | ResizeOp

export type Size = { w: number; h: number }

export const MAX_SIDE = 8000

// stage sizes through the op walk — pure, no canvas
export function stageSizes(orig: Size, ops: Op[]): Size[] {
  const sizes: Size[] = [{ w: orig.w, h: orig.h }]
  let cur = sizes[0]
  for (const op of ops) {
    if (op.type === "crop") {
      cur = {
        w: Math.max(1, Math.round(op.rect.width)),
        h: Math.max(1, Math.round(op.rect.height)),
      }
    } else {
      const s = op.percent / 100
      cur = { w: Math.max(1, Math.round(cur.w * s)), h: Math.max(1, Math.round(cur.h * s)) }
    }
    sizes.push(cur)
  }
  return sizes
}

// size of the base the next op would anchor to
export function stageSize(orig: Size, ops: Op[]): Size {
  return stageSizes(orig, ops)[ops.length]
}

// clamp + center a rect to the full stage so the draft respects the base bounds
export function defaultCropRect(size: Size): CropRect {
  const w = Math.max(1, Math.round(size.w * 0.8))
  const h = Math.max(1, Math.round(size.h * 0.8))
  return {
    x: Math.round((size.w - w) / 2),
    y: Math.round((size.h - h) / 2),
    width: w,
    height: h,
  }
}

export function conformRectToAspect(rect: CropRect, aspect: CropAspect, size: Size): CropRect {
  const ratio = ratioForAspect(aspect, size)
  if (ratio === null) return rect
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  let w = rect.width
  let h = rect.height
  if (w / h > ratio) w = h * ratio
  else h = w / ratio
  w = Math.min(w, size.w)
  h = Math.min(h, size.h)
  if (w < 1) w = 1
  if (h < 1) h = 1
  return {
    x: Math.max(0, Math.min(cx - w / 2, size.w - w)),
    y: Math.max(0, Math.min(cy - h / 2, size.h - h)),
    width: w,
    height: h,
  }
}

export type ComposeResult = {
  canvas: HTMLCanvasElement
  width: number
  height: number
}

// scale factor so the composed preview's base fits maxLongSide
export function previewScale(size: Size, maxLongSide = 1200): number {
  const long = Math.max(size.w, size.h)
  return long > 0 ? Math.min(1, maxLongSide / long) : 1
}

function scaleRect(rect: CropRect, s: number): CropRect {
  return {
    x: Math.round(rect.x * s),
    y: Math.round(rect.y * s),
    width: Math.max(1, Math.round(rect.width * s)),
    height: Math.max(1, Math.round(rect.height * s)),
  }
}

type ComposeSource = HTMLImageElement | HTMLCanvasElement

// walk the op list from base — one drawImage per op, no cached intermediates.
// scale < 1 renders a preview (guardless); scale = 1 is full-resolution and
// enforces MAX_SIDE per-op, not only on the final output.
export function compose(base: ComposeSource, origSize: Size, ops: Op[], scale: number): ComposeResult {
  if (!origSize || origSize.w < 1 || origSize.h < 1) throw new Error("Invalid base size")
  let source: ComposeSource = base
  let cur: Size = origSize

  for (const op of ops) {
    const s = scale
    let next: Size
    let draw: (dst: CanvasRenderingContext2D, w: number, h: number) => void

    if (op.type === "crop") {
      const rect = scaleRect(op.rect, s)
      const srcRect = rect
      next = { w: srcRect.width, h: srcRect.height }
      draw = (ctx) => {
        ctx.drawImage(source, srcRect.x, srcRect.y, srcRect.width, srcRect.height, 0, 0, srcRect.width, srcRect.height)
      }
    } else {
      // validate resize op
      if (!Number.isFinite(op.percent) || op.percent < 10) {
        throw new Error("Invalid percent: must be >= 10")
      }
      if (op.mode === "noise") {
        const ns = op.noiseStrength ?? 35
        if (!Number.isFinite(ns) || ns < 0 || ns > 100) throw new Error("Invalid noiseStrength")
      }
      const rs = op.percent / 100
      const w = Math.max(1, Math.round(cur.w * rs))
      const h = Math.max(1, Math.round(cur.h * rs))
      next = { w, h }
      const smooth = op.mode === "smooth" || op.mode === "noise"
      const mode = op.mode
      const noiseStrength = op.mode === "noise" ? (op.noiseStrength ?? 35) : 0
      draw = (ctx, dw, dh) => {
        ctx.imageSmoothingEnabled = smooth
        // @ts-ignore - quality is optional but nice for smooth/noise mode
        if (smooth) ctx.imageSmoothingQuality = "high"
        ctx.drawImage(source, 0, 0, cur.w, cur.h, 0, 0, dw, dh)
        // post-scale grain pass for noise mode — applied on the drawn canvas
        // via ImageData so it rides the composed pixels
        if (mode === "noise") {
          // we need the canvas; ctx.canvas is the target canvas
          const canvas = ctx.canvas as HTMLCanvasElement
          const strength = Math.max(0, Math.min(100, noiseStrength))
          if (strength > 0) applyNoise(canvas, strength)
        }
      }
    }

    if (scale === 1 && (next.w > MAX_SIDE || next.h > MAX_SIDE)) {
      throw new Error(`Output too large: ${next.w}×${next.h} (max ${MAX_SIDE}px side)`)
    }

    const canvas = document.createElement("canvas")
    canvas.width = next.w
    canvas.height = next.h
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas not supported")
    draw(ctx, next.w, next.h)
    source = canvas
    cur = next
  }

  // empty stack: still produce a real canvas — blob URLs need one
  if (source === base) {
    const w = Math.max(1, Math.round(cur.w * scale))
    const h = Math.max(1, Math.round(cur.h * scale))
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas not supported")
    ctx.drawImage(source, 0, 0, w, h)
    source = canvas
    cur = { w, h }
  }

  return { canvas: source as HTMLCanvasElement, width: cur.w, height: cur.h }
}
