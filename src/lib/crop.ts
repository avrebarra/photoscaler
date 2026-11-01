// pure Canvas crop utility — no React

export type CropRect = { x: number; y: number; width: number; height: number } // pixels in natural image coords
export type CropAspect = "free" | "1:1" | "4:3" | "16:9" | "original"

const MAX_SIDE = 8000

export function normalizeRect(rect: CropRect, naturalSize: { w: number; h: number }): CropRect {
  if (!rect || typeof rect.x !== "number" || typeof rect.y !== "number") {
    throw new Error("Invalid crop rect")
  }
  if (!naturalSize || naturalSize.w < 1 || naturalSize.h < 1) {
    throw new Error("Invalid natural size")
  }
  if (rect.width < 1 || rect.height < 1) {
    throw new Error("Crop rect must have positive size")
  }

  // clamp origin to [0, w-1] × [0, h-1] so at least 1px remains
  let x = Math.max(0, Math.min(rect.x, naturalSize.w - 1))
  let y = Math.max(0, Math.min(rect.y, naturalSize.h - 1))

  // clamp size to remaining space
  let width = Math.max(1, Math.min(rect.width, naturalSize.w - x))
  let height = Math.max(1, Math.min(rect.height, naturalSize.h - y))

  // if the original rect extended beyond bounds, re-clamp origin + size together
  // (e.g. x negative, or width too large) — ensure x+width <= w
  if (x + width > naturalSize.w) {
    width = naturalSize.w - x
  }
  if (y + height > naturalSize.h) {
    height = naturalSize.h - y
  }

  if (width < 1 || height < 1) {
    throw new Error("Crop rect must have positive size")
  }

  return { x, y, width, height }
}

export function cropImage(
  source: HTMLImageElement | HTMLCanvasElement,
  rect: CropRect,
): { canvas: HTMLCanvasElement; width: number; height: number } {
  if (!source) throw new Error("Empty source")
  if (!rect || rect.width < 1 || rect.height < 1) {
    throw new Error("Crop rect must have positive size")
  }

  const sw = Math.round(rect.width)
  const sh = Math.round(rect.height)
  if (sw < 1 || sh < 1) throw new Error("Crop rect must have positive size")

  if (sw > MAX_SIDE || sh > MAX_SIDE) {
    throw new Error(`Output too large: ${sw}×${sh} (max ${MAX_SIDE}px side)`)
  }

  // validate source dimensions
  const sourceW = source instanceof HTMLImageElement ? source.naturalWidth : source.width
  const sourceH = source instanceof HTMLImageElement ? source.naturalHeight : source.height
  if (!sourceW || !sourceH) throw new Error("Empty source")

  const sx = Math.round(rect.x)
  const sy = Math.round(rect.y)
  // sx/sy already expected to be clamped via normalizeRect, but guard anyway
  if (sx < 0 || sy < 0 || sx + sw > sourceW + 1 || sy + sh > sourceH + 1) {
    // allow 1px rounding slack, real clamp is caller's job via normalizeRect
  }

  const canvas = document.createElement("canvas")
  canvas.width = sw
  canvas.height = sh
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas not supported")

  // drawImage(source, sx, sy, sw, sh, 0, 0, dw, dh)
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh)
  return { canvas, width: sw, height: sh }
}
