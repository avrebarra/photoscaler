// pure decode helpers, no UI/state deps

// @ts-ignore - utif has no types
import * as UTIFModule from "utif"

// isHeicLike / isTiffLike per spec: name ends .heic/.heif/.tif/.tiff case-insensitive OR type is image/heic|image/heif|image/tiff
export function isHeicLike(file: File): boolean {
  const name = file.name.toLowerCase()
  if (name.endsWith(".heic") || name.endsWith(".heif")) return true
  const t = file.type.toLowerCase()
  return t === "image/heic" || t === "image/heif"
}

export function isTiffLike(file: File): boolean {
  const name = file.name.toLowerCase()
  if (name.endsWith(".tif") || name.endsWith(".tiff")) return true
  const t = file.type.toLowerCase()
  return t === "image/tiff"
}

export async function decodeImageFile(
  file: File,
): Promise<{ blobUrl: string; width: number; height: number }> {
  if (isHeicLike(file)) {
    return decodeHeic(file)
  }
  if (isTiffLike(file)) {
    return decodeTiff(file)
  }
  throw new Error("Failed to decode HEIC image")
}

async function decodeHeic(file: File): Promise<{ blobUrl: string; width: number; height: number }> {
  let blobUrl: string | null = null
  try {
    const buffer = await file.arrayBuffer()
    const uint8 = new Uint8Array(buffer)
    // heic-decode is CJS, dynamic import needs interop
    // @ts-ignore - heic-decode has no types
    const mod = (await import("heic-decode")) as unknown as { default: (o: { buffer: Uint8Array }) => Promise<{ width: number; height: number; data: Uint8ClampedArray }> } & ((o: { buffer: Uint8Array }) => Promise<{ width: number; height: number; data: Uint8ClampedArray }>)
    const decode = (mod as unknown as { default?: typeof mod }).default ?? mod
    const result = await (decode as unknown as (o: { buffer: Uint8Array }) => Promise<{ width: number; height: number; data: Uint8ClampedArray }>)({ buffer: uint8 })
    const { width, height, data } = result
    if (!width || !height || !data) throw new Error("decode failed")
    blobUrl = await rgbaToBlobUrl(width, height, data)
    return { blobUrl, width, height }
  } catch {
    if (blobUrl) {
      try {
        URL.revokeObjectURL(blobUrl)
      } catch {}
    }
    throw new Error("Failed to decode HEIC image")
  }
}

async function decodeTiff(file: File): Promise<{ blobUrl: string; width: number; height: number }> {
  let blobUrl: string | null = null
  try {
    const buffer = await file.arrayBuffer()
    // UTIF is imported as namespace, default export may be UTIF object
    const UTIF = (UTIFModule as unknown as { default?: typeof UTIFModule }).default ?? UTIFModule
    const ifds = (UTIF as unknown as { decode: (b: ArrayBuffer) => unknown[] }).decode(buffer)
    if (!ifds || ifds.length === 0) throw new Error("no ifd")
    const first = ifds[0] as Record<string, unknown>
    ;(UTIF as unknown as { decodeImage: (b: ArrayBuffer, ifd: unknown) => void }).decodeImage(buffer, first)
    const rgba = (UTIF as unknown as { toRGBA8: (ifd: unknown) => Uint8Array }).toRGBA8(first)
    const width = first["width"] as number
    const height = first["height"] as number
    if (!width || !height || !rgba) throw new Error("decode failed")
    const clamped = rgba instanceof Uint8ClampedArray ? rgba : new Uint8ClampedArray(rgba)
    blobUrl = await rgbaToBlobUrl(width, height, clamped)
    return { blobUrl, width, height }
  } catch {
    if (blobUrl) {
      try {
        URL.revokeObjectURL(blobUrl)
      } catch {}
    }
    throw new Error("Failed to decode TIFF image")
  }
}

async function rgbaToBlobUrl(
  width: number,
  height: number,
  rgba: Uint8ClampedArray,
): Promise<string> {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas not supported")
  // @ts-ignore - ImageData typed array variance
  const imageData = new ImageData(rgba, width, height)
  ctx.putImageData(imageData, 0, 0)
  const blob: Blob = await new Promise((resolve, reject) => {
    if (typeof canvas.toBlob === "function") {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b)
          else reject(new Error("canvas toBlob failed"))
        },
        "image/png",
      )
    } else {
      // fallback via toDataURL
      try {
        const dataUrl = canvas.toDataURL("image/png")
        const bin = atob(dataUrl.split(",")[1] ?? "")
        const arr = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
        resolve(new Blob([arr], { type: "image/png" }))
      } catch (e) {
        reject(e)
      }
    }
  })
  return URL.createObjectURL(blob)
}
