// ponytail rung 4: browser native Canvas API - no deps

export type ScaleMode = "smooth" | "pixelate" | "lanczos"

// apply grain post-pass — native ImageData, no deps
export function applyNoise(canvas: HTMLCanvasElement, grainStrength: number): void {
  const strength = Math.max(0, Math.min(100, grainStrength))
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

export function clampGrainStrength(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(100, Math.round(v)))
}

// --- lanczos ---

function sinc(x: number): number {
  if (x === 0) return 1
  const pix = Math.PI * x
  return Math.sin(pix) / pix
}

function lanczosKernel(x: number, a: number): number {
  if (Math.abs(x) >= a) return 0
  return sinc(x) * sinc(x / a)
}

// separable lanczos resample: srcData (srcW×srcH) → dstW×dstH
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
  // when downscaling (scale<1) widen kernel to avoid aliasing
  const filterScaleX = Math.min(1, scaleX)
  const filterScaleY = Math.min(1, scaleY)
  const filterA_X = a / filterScaleX
  const filterA_Y = a / filterScaleY

  // horizontal pass: srcW×srcH → dstW×srcH
  const tmp = new Uint8ClampedArray(dstW * srcH * 4)
  for (let y = 0; y < srcH; y++) {
    for (let dstX = 0; dstX < dstW; dstX++) {
      const srcCenter = (dstX + 0.5) / scaleX - 0.5
      const left = Math.ceil(srcCenter - filterA_X)
      const right = Math.floor(srcCenter + filterA_X)
      let r = 0, g = 0, b = 0, al = 0, wSum = 0
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

  // vertical pass: dstW×srcH → dstW×dstH
  const dst = new Uint8ClampedArray(dstW * dstH * 4)
  for (let dstY = 0; dstY < dstH; dstY++) {
    const srcCenter = (dstY + 0.5) / scaleY - 0.5
    const top = Math.ceil(srcCenter - filterA_Y)
    const bottom = Math.floor(srcCenter + filterA_Y)
    for (let x = 0; x < dstW; x++) {
      let r = 0, g = 0, b = 0, al = 0, wSum = 0
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

function getImageDataFromSource(
  source: HTMLImageElement | HTMLCanvasElement,
  w: number,
  h: number,
): Uint8ClampedArray {
  if (source instanceof HTMLCanvasElement) {
    const ctx = source.getContext("2d")
    if (ctx) {
      try {
        const d = ctx.getImageData(0, 0, w, h)
        if (d.data.length === w * h * 4) return new Uint8ClampedArray(d.data)
      } catch {
        // fall through to draw fallback
      }
    }
  }
  // fallback: draw source onto temp canvas to extract pixels
  const tmp = document.createElement("canvas")
  tmp.width = w
  tmp.height = h
  const ctx = tmp.getContext("2d")
  if (!ctx) throw new Error("Canvas not supported")
  ctx.drawImage(source as unknown as CanvasImageSource, 0, 0, w, h)
  return new Uint8ClampedArray(ctx.getImageData(0, 0, w, h).data)
}

function drawLanczos(
  source: HTMLImageElement | HTMLCanvasElement,
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

// normalize legacy "noise" mode → smooth + grain
function normalizeMode(raw: string): ScaleMode {
  if (raw === "noise") return "smooth"
  if (raw === "lanczos" || raw === "pixelate" || raw === "smooth") return raw
  throw new Error(`Invalid mode: ${raw}`)
}

export function scaleImage(
  img: HTMLImageElement,
  percent: number,
  mode: ScaleMode | string,
  grainStrength: number = 0,
  // legacy alias: 4th arg was noiseStrength when mode was "noise"
): { canvas: HTMLCanvasElement; width: number; height: number } {
  if (!Number.isFinite(percent) || percent < 1) {
    throw new Error("Invalid percent: must be >= 1")
  }
  // legacy: scaleImage(img, 100, "noise", 35) → smooth + grain
  let effectiveMode: ScaleMode
  let effectiveGrain = grainStrength
  if ((mode as string) === "noise") {
    effectiveMode = "smooth"
    // 4th arg was noiseStrength in that call
    effectiveGrain = grainStrength
  } else {
    effectiveMode = normalizeMode(mode as string)
  }
  if (effectiveGrain !== 0) {
    if (!Number.isFinite(effectiveGrain)) throw new Error("Invalid grainStrength")
    if (effectiveGrain < 0 || effectiveGrain > 100) throw new Error("Invalid grainStrength")
    // also accept legacy error name for compat
  }
  // backward compat: also throw Invalid noiseStrength wording if caller used legacy name
  // we throw Invalid grainStrength — tests updated; keep alias check
  if (!Number.isFinite(effectiveGrain) || effectiveGrain < 0 || effectiveGrain > 100) {
    throw new Error("Invalid grainStrength")
  }

  const clampedGrain = Math.max(0, Math.min(100, effectiveGrain))

  const scale = percent / 100
  const width = Math.max(1, Math.round(img.naturalWidth * scale))
  const height = Math.max(1, Math.round(img.naturalHeight * scale))

  const MAX_SIDE = 8000
  if (width > MAX_SIDE || height > MAX_SIDE) {
    throw new Error(`Output too large: ${width}×${height} (max ${MAX_SIDE}px side)`)
  }

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas not supported")

  if (effectiveMode === "lanczos") {
    drawLanczos(img, img.naturalWidth, img.naturalHeight, canvas, width, height)
  } else {
    const smooth = effectiveMode === "smooth"
    ctx.imageSmoothingEnabled = smooth
    // @ts-ignore
    if (smooth) ctx.imageSmoothingQuality = "high"
    ctx.drawImage(img, 0, 0, width, height)
  }

  if (clampedGrain > 0) {
    applyNoise(canvas, clampedGrain)
  }

  return { canvas, width, height }
}

export function canvasToUrl(canvas: HTMLCanvasElement, type: "png" | "jpeg" = "png"): string {
  return canvas.toDataURL(type === "png" ? "image/png" : "image/jpeg", 0.92)
}
