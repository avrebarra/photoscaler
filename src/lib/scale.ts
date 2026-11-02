// ponytail rung 4: browser native Canvas API - no deps

export type ScaleMode = "smooth" | "pixelate" | "noise"

// apply grain post-pass — native ImageData, no deps
export function applyNoise(canvas: HTMLCanvasElement, noiseStrength: number): void {
  const strength = Math.max(0, Math.min(100, noiseStrength))
  if (strength === 0) return
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data
  // grain magnitude: strength 0→0, 100→~50 per channel
  const magnitude = (strength / 100) * 50
  for (let i = 0; i < data.length; i += 4) {
    // per-pixel grain; apply same signed delta to R,G,B for film-like grain
    // with small per-channel variation for color speckle
    const grain = (Math.random() * 2 - 1) * magnitude
    data[i] = Math.max(0, Math.min(255, data[i] + grain + (Math.random() * 2 - 1) * 8))
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + grain + (Math.random() * 2 - 1) * 8))
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + grain + (Math.random() * 2 - 1) * 8))
  }
  ctx.putImageData(imageData, 0, 0)
}

export function scaleImage(
  img: HTMLImageElement,
  percent: number,
  mode: ScaleMode,
  noiseStrength: number = 35,
): { canvas: HTMLCanvasElement; width: number; height: number } {
  if (!Number.isFinite(percent) || percent < 10) {
    throw new Error("Invalid percent: must be >= 10")
  }
  if (mode === "noise") {
    if (!Number.isFinite(noiseStrength)) throw new Error("Invalid noiseStrength")
    if (noiseStrength < 0 || noiseStrength > 100) throw new Error("Invalid noiseStrength")
  }

  const clampedStrength = Math.max(0, Math.min(100, noiseStrength))

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

  // noise mode still scales smoothly then adds grain
  const smooth = mode === "smooth" || mode === "noise"
  ctx.imageSmoothingEnabled = smooth
  // @ts-ignore - quality is optional but nice for smooth/noise mode
  if (smooth) ctx.imageSmoothingQuality = "high"

  ctx.drawImage(img, 0, 0, width, height)

  if (mode === "noise") {
    applyNoise(canvas, clampedStrength)
  }

  return { canvas, width, height }
}

export function canvasToUrl(canvas: HTMLCanvasElement, type: "png" | "jpeg" = "png"): string {
  return canvas.toDataURL(type === "png" ? "image/png" : "image/jpeg", 0.92)
}
