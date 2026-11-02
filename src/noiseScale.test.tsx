import { describe, it, expect } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { compose, type Op } from "./lib/pipeline"
import { scaleImage, applyNoise } from "./lib/scale"
import { ResizeToolScreen } from "./screens/ResizeToolScreen"

// helpers
function makeBase(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas")
  c.width = w
  c.height = h
  const ctx = c.getContext("2d")!
  ctx.fillStyle = "red"
  ctx.fillRect(0, 0, w, h)
  return c
}

function makeImg(w: number, h: number): HTMLImageElement {
  const img = new Image()
  Object.defineProperty(img, "naturalWidth", { value: w })
  Object.defineProperty(img, "naturalHeight", { value: h })
  return img
}

describe("grain + interpolation", () => {
  it("scaleImage grain modifies pixels vs smooth (grain applied separately)", () => {
    const img = makeImg(10, 10)
    const smooth = scaleImage(img, 100, "smooth")
    const grainy = scaleImage(img, 100, "smooth", 80)
    expect(smooth.canvas.width).toBe(grainy.canvas.width)
    const sData = smooth.canvas
      .getContext("2d")!
      .getImageData(0, 0, smooth.canvas.width, smooth.canvas.height).data
    const nData = grainy.canvas
      .getContext("2d")!
      .getImageData(0, 0, grainy.canvas.width, grainy.canvas.height).data
    let diff = 0
    for (let i = 0; i < sData.length; i++) if (sData[i] !== nData[i]) diff++
    expect(diff).toBeGreaterThan(0)
  })

  it("legacy noise mode still works via compat (smooth + grain)", () => {
    const img = makeImg(10, 10)
    const legacy = scaleImage(img, 100, "noise" as never, 80)
    expect(legacy.canvas.width).toBe(10)
    const data = legacy.canvas.getContext("2d")!.getImageData(0, 0, 10, 10).data
    // should be grainy (not uniform) — at least some diff vs plain red
    let nonRed = 0
    for (let i = 0; i < data.length; i += 4) if (data[i] !== 180) nonRed++
    expect(nonRed).toBeGreaterThan(0)
  })

  it("lanczos mode produces canvas at correct size", () => {
    const img = makeImg(10, 10)
    const lanczos = scaleImage(img, 200, "lanczos")
    expect(lanczos.width).toBe(20)
    expect(lanczos.height).toBe(20)
    expect(lanczos.canvas.width).toBe(20)
    // lanczos + grain also works
    const lg = scaleImage(img, 200, "lanczos", 60)
    expect(lg.canvas.width).toBe(20)
    const d1 = lanczos.canvas.getContext("2d")!.getImageData(0, 0, 20, 20).data
    const d2 = lg.canvas.getContext("2d")!.getImageData(0, 0, 20, 20).data
    let diff = 0
    for (let i = 0; i < d1.length; i++) if (d1[i] !== d2[i]) diff++
    expect(diff).toBeGreaterThan(0)
  })

  it("applyNoise strength 0 leaves pixels unchanged, high strength mutates", () => {
    const c = document.createElement("canvas")
    c.width = 4
    c.height = 4
    const ctx = c.getContext("2d")!
    ctx.fillStyle = "red"
    ctx.fillRect(0, 0, 4, 4)
    const before = ctx.getImageData(0, 0, 4, 4).data.slice()
    applyNoise(c, 0)
    const afterZero = ctx.getImageData(0, 0, 4, 4).data
    expect(Array.from(afterZero)).toEqual(Array.from(before))
    applyNoise(c, 100)
    const afterHundred = ctx.getImageData(0, 0, 4, 4).data
    let diff = 0
    for (let i = 0; i < before.length; i++) if (before[i] !== afterHundred[i]) diff++
    expect(diff).toBeGreaterThan(0)
  })

  it("compose with grain produces diff vs smooth", () => {
    const base = makeBase(20, 20)
    const smoothOp: Op = { type: "resize", percent: 100, mode: "smooth" }
    const grainOp: Op = { type: "resize", percent: 100, mode: "smooth", grainStrength: 60 }
    const s = compose(base, { w: 20, h: 20 }, [smoothOp], 1)
    const n = compose(base, { w: 20, h: 20 }, [grainOp], 1)
    const sData = s.canvas
      .getContext("2d")!
      .getImageData(0, 0, s.canvas.width, s.canvas.height).data
    const nData = n.canvas
      .getContext("2d")!
      .getImageData(0, 0, n.canvas.width, n.canvas.height).data
    let diff = 0
    for (let i = 0; i < sData.length; i++) if (sData[i] !== nData[i]) diff++
    expect(diff).toBeGreaterThan(0)
  })

  it("compose lanczos + grain works", () => {
    const base = makeBase(20, 20)
    const op: Op = { type: "resize", percent: 200, mode: "lanczos", grainStrength: 40 }
    const r = compose(base, { w: 20, h: 20 }, [op], 1)
    expect(r.width).toBe(40)
    expect(r.canvas.width).toBe(40)
  })

  it("scaleImage throws on invalid grainStrength", () => {
    const img = makeImg(10, 10)
    expect(() => scaleImage(img, 100, "smooth", NaN)).toThrow(/Invalid grainStrength/)
    expect(() => scaleImage(img, 100, "smooth", -1)).toThrow(/Invalid grainStrength/)
    expect(() => scaleImage(img, 100, "smooth", 101)).toThrow(/Invalid grainStrength/)
    // legacy noise alias also throws grainStrength
    expect(() => scaleImage(img, 100, "noise" as never, NaN)).toThrow(/Invalid grainStrength/)
  })

  it("compose throws on invalid grainStrength and MAX_SIDE", () => {
    const base = makeBase(10, 10)
    expect(() =>
      compose(
        base,
        { w: 10, h: 10 },
        [{ type: "resize", percent: 100, mode: "smooth", grainStrength: 200 }],
        1,
      ),
    ).toThrow(/Invalid grainStrength/)
    // legacy alias
    expect(() =>
      compose(
        base,
        { w: 10, h: 10 },
        [{ type: "resize", percent: 100, mode: "smooth", noiseStrength: 200 } as Op],
        1,
      ),
    ).toThrow(/Invalid grainStrength/)
    expect(() =>
      compose(
        base,
        { w: 4000, h: 4000 },
        [{ type: "resize", percent: 300, mode: "lanczos", grainStrength: 35 }],
        1,
      ),
    ).toThrow(/Output too large/)
  })

  it("ResizeToolPage shows interpolation chips + grain toggle", () => {
    render(
      <MemoryRouter>
        <ResizeToolScreen
          imgEl={null}
          origSize={{ w: 100, h: 100 }}
          baseOps={[]}
          onApply={() => {}}
        />
      </MemoryRouter>,
    )
    expect(screen.getByText("Lanczos (sharp)")).toBeInTheDocument()
    expect(screen.getByText("Blur (smooth)")).toBeInTheDocument()
    expect(screen.getByText("Pixelate")).toBeInTheDocument()
    expect(screen.getByLabelText("Enable grain")).toBeInTheDocument()
    // slider hidden initially
    expect(screen.queryByLabelText("Grain strength")).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText("Enable grain"))
    expect(screen.getByLabelText("Grain strength")).toBeInTheDocument()
    expect(screen.getByLabelText("Grain strength value")).toBeInTheDocument()
    const slider = screen.getByLabelText("Grain strength") as HTMLInputElement
    expect(slider.value).toBe("35")
    fireEvent.change(slider, { target: { value: "80" } })
    expect((screen.getByLabelText("Grain strength value") as HTMLInputElement).value).toBe("80")
  })
})
