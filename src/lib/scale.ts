// ponytail rung 4: browser native Canvas API - no deps

export type ScaleMode = "smooth" | "pixelate"

export function scaleImage(
  img: HTMLImageElement,
  percent: number,
  mode: ScaleMode,
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const scale = percent / 100
  const width = Math.max(1, Math.round(img.naturalWidth * scale))
  const height = Math.max(1, Math.round(img.naturalHeight * scale))

  // guard: avoid OOM on huge upscale
  const MAX_SIDE = 8000
  if (width > MAX_SIDE || height > MAX_SIDE) {
    throw new Error(`Output too large: ${width}×${height} (max ${MAX_SIDE}px side)`)
  }

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas not supported")

  ctx.imageSmoothingEnabled = mode === "smooth"
  // @ts-ignore - quality is optional but nice for blur mode
  if (mode === "smooth") ctx.imageSmoothingQuality = "high"

  ctx.drawImage(img, 0, 0, width, height)
  return { canvas, width, height }
}

export function canvasToUrl(canvas: HTMLCanvasElement, type: "png" | "jpeg" = "png"): string {
  return canvas.toDataURL(type === "png" ? "image/png" : "image/jpeg", 0.92)
}
