import "@testing-library/jest-dom/vitest"

// canvas mock with per-canvas backing store so ImageData round-trips
// and grain mutation is observable in tests. jsdom has no real canvas.
type MockCtx = {
  canvas: HTMLCanvasElement
  drawImage: (source: CanvasImageSource, ...rest: unknown[]) => void
  fillRect: (x: number, y: number, w: number, h: number) => void
  getImageData: (x: number, y: number, w: number, h: number) => ImageData
  putImageData: (d: ImageData, x: number, y: number) => void
  fillStyle: string
  imageSmoothingEnabled: boolean
  imageSmoothingQuality: string
  createImageData: (w: number, h: number) => ImageData
}

const canvasStores = new WeakMap<HTMLCanvasElement, Uint8ClampedArray>()

function getStore(canvas: HTMLCanvasElement): Uint8ClampedArray {
  let s = canvasStores.get(canvas)
  const expected = canvas.width * canvas.height * 4
  if (!s || s.length !== expected) {
    s = new Uint8ClampedArray(expected)
    canvasStores.set(canvas, s)
  }
  return s
}

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  value: function (this: HTMLCanvasElement, type: string) {
    if (type !== "2d") return null
    getStore(this)
    const ctx: MockCtx = {
      canvas: this,
      fillStyle: "#000000",
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
      drawImage: (source: CanvasImageSource, ..._rest: unknown[]) => {
        const store = getStore(this)
        if (source instanceof HTMLCanvasElement) {
          const srcStore = canvasStores.get(source)
          if (srcStore && srcStore.length > 0) {
            const r = srcStore[0] ?? 0
            const g = srcStore[1] ?? 0
            const b = srcStore[2] ?? 0
            const a = srcStore[3] ?? 255
            for (let i = 0; i < store.length; i += 4) {
              store[i] = r
              store[i + 1] = g
              store[i + 2] = b
              store[i + 3] = a
            }
          } else {
            for (let i = 0; i < store.length; i += 4) {
              store[i] = 200
              store[i + 1] = 100
              store[i + 2] = 100
              store[i + 3] = 255
            }
          }
        } else if (source instanceof HTMLImageElement) {
          for (let i = 0; i < store.length; i += 4) {
            store[i] = 180
            store[i + 1] = 90
            store[i + 2] = 90
            store[i + 3] = 255
          }
        }
      },
      fillRect: (_x: number, _y: number, _w: number, _h: number) => {
        const store = getStore(this)
        let r = 255,
          g = 0,
          b = 0
        if (ctx.fillStyle === "red") {
          r = 255
          g = 0
          b = 0
        } else if (ctx.fillStyle.startsWith("#")) {
          const hex = ctx.fillStyle.slice(1)
          if (hex.length === 6) {
            r = parseInt(hex.slice(0, 2), 16)
            g = parseInt(hex.slice(2, 4), 16)
            b = parseInt(hex.slice(4, 6), 16)
          }
        }
        for (let i = 0; i < store.length; i += 4) {
          store[i] = r
          store[i + 1] = g
          store[i + 2] = b
          store[i + 3] = 255
        }
      },
      getImageData: (_x: number, _y: number, w: number, h: number) => {
        const store = getStore(this)
        const len = w * h * 4
        const data = new Uint8ClampedArray(len)
        data.set(store.subarray(0, Math.min(len, store.length)))
        return { data, width: w, height: h, colorSpace: "srgb" } as unknown as ImageData
      },
      putImageData: (imageData: ImageData, _x: number, _y: number) => {
        const store = getStore(this)
        store.set(imageData.data.subarray(0, Math.min(store.length, imageData.data.length)))
      },
      createImageData: (w: number, h: number) => {
        return {
          data: new Uint8ClampedArray(w * h * 4),
          width: w,
          height: h,
          colorSpace: "srgb",
        } as unknown as ImageData
      },
    }
    Object.defineProperty(ctx, "canvas", { value: this, writable: false })
    return ctx as unknown as CanvasRenderingContext2D
  },
  writable: true,
  configurable: true,
})

const origWidthDesc = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, "width")
const origHeightDesc = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, "height")
if (origWidthDesc && origHeightDesc) {
  // WeakMap lazy handles store invalidation on dimension change
}

{
  const orig = HTMLCanvasElement.prototype.toDataURL as unknown as (...a: unknown[]) => string
  // @ts-ignore
  HTMLCanvasElement.prototype.toDataURL = function (this: HTMLCanvasElement, ...args: unknown[]) {
    try {
      return (orig as unknown as (this: HTMLCanvasElement, ...a: unknown[]) => string).apply(
        this,
        args as never,
      )
    } catch {
      const type = (args[0] as string) || "image/png"
      return `data:${type};base64,mock-${this.width}x${this.height}`
    }
  }
}
if (!HTMLCanvasElement.prototype.toBlob) {
  // @ts-ignore
  HTMLCanvasElement.prototype.toBlob = function (cb: (b: Blob | null) => void) {
    cb(new Blob(["mock"], { type: "image/png" }))
  }
}

if (!URL.createObjectURL) {
  // @ts-ignore
  URL.createObjectURL = () => "blob:mock-url"
}
if (!URL.revokeObjectURL) {
  // @ts-ignore
  URL.revokeObjectURL = () => {}
}
