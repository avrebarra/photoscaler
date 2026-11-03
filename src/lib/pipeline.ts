// pure Canvas op-stack compose engine — no React
import { type CropRect, type CropAspect, ratioForAspect } from "./crop"
export { ratioForAspect }
import type { ScaleMode } from "./scale"
import { applyNoise } from "./scale"

// ops are anchored: a crop's rect is in absolute pixels of its base (the
// composite of all prior ops); resize is relative, so it needs no base coords.
export type CropOp = { type: "crop"; rect: CropRect; aspect: CropAspect }
export type ResizeOp = {
  type: "resize"
  percent: number
  mode: ScaleMode
  grainStrength?: number
  /** @deprecated legacy alias for grainStrength */
  noiseStrength?: number
}
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

// lanczos helpers (duplicated from scale.ts for pipeline independence)
function sinc(x: number): number {
  if (x === 0) return 1
  const pix = Math.PI * x
  return Math.sin(pix) / pix
}
function lanczosKernel(x: number, a: number): number {
  if (Math.abs(x) >= a) return 0
  return sinc(x) * sinc(x / a)
}
function lanczosResample(
  srcData: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
  a: number = 3,
): Uint8ClampedArray {
  if (srcW === dstW && srcH === dstH) return new Uint8ClampedArray(srcData)
  const scaleX = dstW / srcW
  const scaleY = dstH / srcH
  const filterScaleX = Math.min(1, scaleX)
  const filterScaleY = Math.min(1, scaleY)
  const filterA_X = a / filterScaleX
  const filterA_Y = a / filterScaleY
  const tmp = new Uint8ClampedArray(dstW * srcH * 4)
  for (let y = 0; y < srcH; y++) {
    for (let dstX = 0; dstX < dstW; dstX++) {
      const srcCenter = (dstX + 0.5) / scaleX - 0.5
      const left = Math.ceil(srcCenter - filterA_X)
      const right = Math.floor(srcCenter + filterA_X)
      let r = 0,
        g = 0,
        b = 0,
        al = 0,
        wSum = 0
      for (let k = left; k <= right; k++) {
        const clamped = Math.max(0, Math.min(srcW - 1, k))
        const w = lanczosKernel((srcCenter - k) * filterScaleX, a)
        if (w === 0) continue
        const idx = (y * srcW + clamped) * 4
        r += srcData[idx]! * w
        g += srcData[idx + 1]! * w
        b += srcData[idx + 2]! * w
        al += srcData[idx + 3]! * w
        wSum += w
      }
      const outIdx = (y * dstW + dstX) * 4
      if (wSum !== 0) {
        tmp[outIdx] = Math.max(0, Math.min(255, Math.round(r / wSum)))
        tmp[outIdx + 1] = Math.max(0, Math.min(255, Math.round(g / wSum)))
        tmp[outIdx + 2] = Math.max(0, Math.min(255, Math.round(b / wSum)))
        tmp[outIdx + 3] = Math.max(0, Math.min(255, Math.round(al / wSum)))
      }
    }
  }
  const dst = new Uint8ClampedArray(dstW * dstH * 4)
  for (let dstY = 0; dstY < dstH; dstY++) {
    const srcCenter = (dstY + 0.5) / scaleY - 0.5
    const top = Math.ceil(srcCenter - filterA_Y)
    const bottom = Math.floor(srcCenter + filterA_Y)
    for (let x = 0; x < dstW; x++) {
      let r = 0,
        g = 0,
        b = 0,
        al = 0,
        wSum = 0
      for (let k = top; k <= bottom; k++) {
        const clamped = Math.max(0, Math.min(srcH - 1, k))
        const w = lanczosKernel((srcCenter - k) * filterScaleY, a)
        if (w === 0) continue
        const idx = (clamped * dstW + x) * 4
        r += tmp[idx]! * w
        g += tmp[idx + 1]! * w
        b += tmp[idx + 2]! * w
        al += tmp[idx + 3]! * w
        wSum += w
      }
      const outIdx = (dstY * dstW + x) * 4
      if (wSum !== 0) {
        dst[outIdx] = Math.max(0, Math.min(255, Math.round(r / wSum)))
        dst[outIdx + 1] = Math.max(0, Math.min(255, Math.round(g / wSum)))
        dst[outIdx + 2] = Math.max(0, Math.min(255, Math.round(b / wSum)))
        dst[outIdx + 3] = Math.max(0, Math.min(255, Math.round(al / wSum)))
      }
    }
  }
  return dst
}
function getImageDataFromSource(source: ComposeSource, w: number, h: number): Uint8ClampedArray {
  if (source instanceof HTMLCanvasElement) {
    const ctx = source.getContext("2d")
    if (ctx) {
      try {
        const d = ctx.getImageData(0, 0, w, h)
        if (d.data.length === w * h * 4) return new Uint8ClampedArray(d.data)
      } catch {
        // fallback
      }
    }
  }
  const tmp = document.createElement("canvas")
  tmp.width = w
  tmp.height = h
  const ctx = tmp.getContext("2d")
  if (!ctx) throw new Error("Canvas not supported")
  ctx.drawImage(source as unknown as CanvasImageSource, 0, 0, w, h)
  return new Uint8ClampedArray(ctx.getImageData(0, 0, w, h).data)
}
function drawLanczos(
  source: ComposeSource,
  srcW: number,
  srcH: number,
  dstCanvas: HTMLCanvasElement,
  dstW: number,
  dstH: number,
): void {
  const srcData = getImageDataFromSource(source, srcW, srcH)
  const out = lanczosResample(srcData, srcW, srcH, dstW, dstH, 3)
  const ctx = dstCanvas.getContext("2d")
  if (!ctx) throw new Error("Canvas not supported")
  const imageData = ctx.createImageData(dstW, dstH)
  imageData.data.set(out)
  ctx.putImageData(imageData, 0, 0)
}

function normalizeMode(raw: string): import("./scale").ScaleMode {
  if ((raw as string) === "noise") return "smooth"
  if (raw === "lanczos" || raw === "pixelate" || raw === "smooth")
    return raw as import("./scale").ScaleMode
  throw new Error(`Invalid mode: ${raw}`)
}

function resolveGrain(op: ResizeOp): number {
  if (op.grainStrength != null) return op.grainStrength
  if (op.noiseStrength != null) return op.noiseStrength
  return 0
}

// walk the op list from base — one drawImage per op, no cached intermediates.
// scale < 1 renders a preview at downscaled resolution for speed; scale = 1
// is full-resolution export. preview and export share identical framing.
export function compose(
  base: ComposeSource,
  origSize: Size,
  ops: Op[],
  scale: number,
): ComposeResult {
  if (!origSize || origSize.w < 1 || origSize.h < 1) throw new Error("Invalid base size")
  const isPreview = scale < 1
  let source: ComposeSource = base
  let cur: Size = origSize
  if (isPreview) {
    const pw = Math.max(1, Math.round(origSize.w * scale))
    const ph = Math.max(1, Math.round(origSize.h * scale))
    const canvas = document.createElement("canvas")
    canvas.width = pw
    canvas.height = ph
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas not supported")
    ctx.drawImage(base as unknown as CanvasImageSource, 0, 0, pw, ph)
    source = canvas
    cur = { w: pw, h: ph }
  }

  for (const op of ops) {
    let next: Size
    let draw: (dst: CanvasRenderingContext2D, w: number, h: number) => void

    if (op.type === "crop") {
      const rect = isPreview ? scaleRect(op.rect, scale) : op.rect
      const srcRect = rect
      next = { w: srcRect.width, h: srcRect.height }
      draw = (ctx) => {
        ctx.drawImage(
          source,
          srcRect.x,
          srcRect.y,
          srcRect.width,
          srcRect.height,
          0,
          0,
          srcRect.width,
          srcRect.height,
        )
      }
    } else {
      // validate resize op — allow down to 1% for true 10px shortest-side floor (large images)
      if (!Number.isFinite(op.percent) || op.percent < 1) {
        throw new Error("Invalid percent: must be >= 1")
      }
      const rawMode = (op as unknown as { mode: string }).mode
      const mode = normalizeMode(rawMode)
      const grain = resolveGrain(op as ResizeOp)
      if (grain !== 0) {
        if (!Number.isFinite(grain) || grain < 0 || grain > 100)
          throw new Error("Invalid grainStrength")
      }
      // legacy error message compat: also accept noiseStrength throw
      if (
        op.noiseStrength != null &&
        (op.noiseStrength < 0 || op.noiseStrength > 100 || !Number.isFinite(op.noiseStrength))
      ) {
        throw new Error("Invalid grainStrength")
      }
      const rs = op.percent / 100
      let w = Math.max(1, Math.round(cur.w * rs))
      let h = Math.max(1, Math.round(cur.h * rs))
      next = { w, h }
      const smooth = mode === "smooth"
      // lanczos JS resample is ~10-50× slower than GPU drawImage — only use
      // it for full-res export (scale===1). preview (scale<1) falls back to
      // high-quality smooth so slider stays responsive.
      const isLanczos = mode === "lanczos" && scale === 1
      const grainStrength = grain
      draw = (ctx, dw, dh) => {
        if (isLanczos) {
          const canvas = ctx.canvas as HTMLCanvasElement
          drawLanczos(source, cur.w, cur.h, canvas, dw, dh)
        } else {
          ctx.imageSmoothingEnabled = smooth
          // @ts-ignore - quality is optional but nice for smooth mode
          if (smooth) ctx.imageSmoothingQuality = "high"
          else ctx.imageSmoothingEnabled = false
          ctx.drawImage(source, 0, 0, cur.w, cur.h, 0, 0, dw, dh)
        }
        if (grainStrength > 0) {
          const canvas = ctx.canvas as HTMLCanvasElement
          const strength = Math.max(0, Math.min(100, grainStrength))
          if (strength > 0) applyNoise(canvas, strength)
        }
      }
    }

    if (!isPreview && (next.w > MAX_SIDE || next.h > MAX_SIDE)) {
      const ratio = MAX_SIDE / Math.max(next.w, next.h)
      next = {
        w: Math.max(1, Math.round(next.w * ratio)),
        h: Math.max(1, Math.round(next.h * ratio)),
      }
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
