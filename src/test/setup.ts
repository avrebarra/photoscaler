import "@testing-library/jest-dom/vitest"

// canvas mock with per-canvas backing store so ImageData round-trips
// and grain mutation is observable in tests. jsdom has no real canvas.
type MockCtx = {
  canvas: HTMLCanvasElement
  drawImage: () => void
  fillRect: (x: number, y: number, w: number, h: number) => void
  getImageData: (x: number, y: number, w: number, h: number) => ImageData
  putImageData: (d: ImageData, x: number, y: number) => void
  fillStyle: string
  imageSmoothingEnabled: boolean
  imageSmoothingQuality: string
}

const canvasStores = new WeakMap<HTMLCanvasElement, Uint8ClampedArray>()

function getStore(canvas: HTMLCanvasElement): Uint8ClampedArray {
  let s = canvasStores.get(canvas)
  const expected = canvas.width * canvas.height * 4
  if (!s || s.length !== expected) {
    s = new Uint8ClampedArray(expected)
    // default transparent black; tests that fill will overwrite
    canvasStores.set(canvas, s)
  }
  return s
}

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  // oxlint-disable-next-line @typescript-eslint/no-this-alias, typescript/no-this-alias
  value: function (this: HTMLCanvasElement, type: string) {
    if (type !== "2d") return null
    const canvas = this
    // ensure store exists for current dimensions
    getStore(canvas)
    const ctx: MockCtx = {
      canvas,
      fillStyle: "#000000",
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
      // @ts-ignore mock signature
      drawImage(source: CanvasImageSource, ..._rest: unknown[]) {
        // propagate source pixels if source is a canvas with a store
        const store = getStore(canvas)
        if (source instanceof HTMLCanvasElement) {
          const srcStore = canvasStores.get(source)
          if (srcStore && srcStore.length > 0) {
            // fill dest with source's first pixel repeated (good enough for grain test)
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
            // no source data — fill with neutral red for visibility
            for (let i = 0; i < store.length; i += 4) {
              store[i] = 200
              store[i + 1] = 100
              store[i + 2] = 100
              store[i + 3] = 255
            }
          }
        } else if (source instanceof HTMLImageElement) {
          // image element — fill dest with opaque red so noise has something to mutate
          for (let i = 0; i < store.length; i += 4) {
            store[i] = 180
            store[i + 1] = 90
            store[i + 2] = 90
            store[i + 3] = 255
          }
        }
      },
      fillRect(_x: number, _y: number, _w: number, _h: number) {
        const store = getStore(canvas)
        // parse fillStyle hex or named
        let r = 255, g = 0, b = 0
        if (ctx.fillStyle === "red") { r = 255; g = 0; b = 0 }
        else if (ctx.fillStyle.startsWith("#")) {
          const hex = ctx.fillStyle.slice(1)
          if (hex.length === 6) {
            r = parseInt(hex.slice(0, 2), 16)
            g = parseInt(hex.slice(2, 4), 16)
            b = parseInt(hex.slice(4, 6), 16)
          }
        }
        for (let i = 0; i < store.length; i += 4) {
          store[i] = r; store[i + 1] = g; store[i + 2] = b; store[i + 3] = 255
        }
      },
      getImageData(_x: number, _y: number, w: number, h: number) {
        const store = getStore(canvas)
        // return a copy sized to requested rect (assume 0,0 full canvas in tests)
        const len = w * h * 4
        const data = new Uint8ClampedArray(len)
        data.set(store.subarray(0, Math.min(len, store.length)))
        return { data, width: w, height: h, colorSpace: "srgb" } as unknown as ImageData
      },
      putImageData(imageData: ImageData, _x: number, _y: number) {
        const store = getStore(canvas)
        store.set(imageData.data.subarray(0, Math.min(store.length, imageData.data.length)))
      },
      createImageData(w: number, h: number) {
        return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h, colorSpace: "srgb" } as unknown as ImageData
      },
    }
    // allow ctx.canvas assignment reads in pipeline (ctx.canvas)
    Object.defineProperty(ctx, "canvas", { value: canvas, writable: false })
    return ctx as unknown as CanvasRenderingContext2D
  },
  writable: true,
  configurable: true,
})

// when canvas dimensions change, reset store
const origWidthDesc = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, "width")
const origHeightDesc = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, "height")
if (origWidthDesc && origHeightDesc) {
  // patch via proxy: on width/height set, invalidate store
  // simpler: monkey-patch createElement to hook width setter — but WeakMap lazy handles it
}

// mock URL.createObjectURL
if (!URL.createObjectURL) {
  // @ts-ignore
  URL.createObjectURL = () => "blob:mock-url"
}
if (!URL.revokeObjectURL) {
  // @ts-ignore
  URL.revokeObjectURL = () => {}
}
