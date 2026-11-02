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

describe("noise mode", () => {
  it("scaleImage noise modifies pixels vs smooth (grain applied)", () => {
    const img = makeImg(10, 10)
    const smooth = scaleImage(img, 100, "smooth")
    const noisy = scaleImage(img, 100, "noise", 80)
    expect(smooth.canvas.width).toBe(noisy.canvas.width)
    const sData = smooth.canvas
      .getContext("2d")!
      .getImageData(0, 0, smooth.canvas.width, smooth.canvas.height).data
    const nData = noisy.canvas
      .getContext("2d")!
      .getImageData(0, 0, noisy.canvas.width, noisy.canvas.height).data
    // at least one channel differs due to grain
    let diff = 0
    for (let i = 0; i < sData.length; i++) if (sData[i] !== nData[i]) diff++
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

  it("compose with noise op produces grain vs smooth", () => {
    const base = makeBase(20, 20)
    const smoothOp: Op = { type: "resize", percent: 100, mode: "smooth" }
    const noiseOp: Op = { type: "resize", percent: 100, mode: "noise", noiseStrength: 60 }
    const s = compose(base, { w: 20, h: 20 }, [smoothOp], 1)
    const n = compose(base, { w: 20, h: 20 }, [noiseOp], 1)
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

  it("scaleImage throws on invalid noiseStrength", () => {
    const img = makeImg(10, 10)
    expect(() => scaleImage(img, 100, "noise", NaN)).toThrow(/Invalid noiseStrength/)
    expect(() => scaleImage(img, 100, "noise", -1)).toThrow(/Invalid noiseStrength/)
    expect(() => scaleImage(img, 100, "noise", 101)).toThrow(/Invalid noiseStrength/)
  })

  it("compose throws on invalid noiseStrength and MAX_SIDE", () => {
    const base = makeBase(10, 10)
    expect(() =>
      compose(
        base,
        { w: 10, h: 10 },
        [{ type: "resize", percent: 100, mode: "noise", noiseStrength: 200 }],
        1,
      ),
    ).toThrow(/Invalid noiseStrength/)
    expect(() =>
      compose(
        base,
        { w: 4000, h: 4000 },
        [{ type: "resize", percent: 300, mode: "noise", noiseStrength: 35 }],
        1,
      ),
    ).toThrow(/Output too large/)
  })

  it("ResizeToolPage shows Noise chip and grain slider when selected", () => {
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
    expect(screen.getByText("Noise (grain)")).toBeInTheDocument()
    // slider hidden initially
    expect(screen.queryByLabelText("Grain strength")).not.toBeInTheDocument()
    fireEvent.click(screen.getByText("Noise (grain)"))
    expect(screen.getByLabelText("Grain strength")).toBeInTheDocument()
    expect(screen.getByLabelText("Grain strength value")).toBeInTheDocument()
    const slider = screen.getByLabelText("Grain strength") as HTMLInputElement
    expect(slider.value).toBe("35")
    fireEvent.change(slider, { target: { value: "80" } })
    expect((screen.getByLabelText("Grain strength value") as HTMLInputElement).value).toBe("80")
  })
})
