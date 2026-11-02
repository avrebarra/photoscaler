import { describe, it, expect } from "vitest"
import {
  stageSizes,
  stageSize,
  previewScale,
  conformRectToAspect,
  compose,
  type Op,
  type Size,
} from "./lib/pipeline"

const ORIG: Size = { w: 800, h: 600 }

describe("stageSizes", () => {
  it("returns just the base for an empty stack", () => {
    expect(stageSizes(ORIG, [])).toEqual([ORIG])
  })

  it("crop op takes its rect size; resize op scales relative to prior stage", () => {
    const ops: Op[] = [
      { type: "resize", percent: 50, mode: "smooth" },
      { type: "crop", rect: { x: 0, y: 0, width: 100, height: 40 }, aspect: "free" },
      { type: "resize", percent: 200, mode: "pixelate" },
    ]
    expect(stageSizes(ORIG, ops)).toEqual([
      ORIG,
      { w: 400, h: 300 },
      { w: 100, h: 40 },
      { w: 200, h: 80 },
    ])
  })

  it("stageSize is the last stage", () => {
    const ops: Op[] = [
      { type: "crop", rect: { x: 0, y: 0, width: 10, height: 20 }, aspect: "free" },
    ]
    expect(stageSize(ORIG, ops)).toEqual({ w: 10, h: 20 })
  })
})

describe("previewScale", () => {
  it("caps long side", () => {
    expect(previewScale({ w: 4000, h: 2000 })).toBe(0.3)
    expect(previewScale({ w: 800, h: 600 })).toBe(1)
  })
})

describe("conformRectToAspect", () => {
  it("keeps free rects unchanged", () => {
    const rect = { x: 10, y: 10, width: 60, height: 40 }
    expect(conformRectToAspect(rect, "free", ORIG)).toEqual(rect)
  })

  it("conforms a rect to 1:1 around center inside bounds", () => {
    const out = conformRectToAspect({ x: 10, y: 10, width: 60, height: 40 }, "1:1", ORIG)
    expect(out.width).toBeCloseTo(40)
    expect(out.height).toBeCloseTo(40)
    expect(out.x).toBeGreaterThanOrEqual(0)
    expect(out.y).toBeGreaterThanOrEqual(0)
  })
})

describe("compose", () => {
  function makeBase(w: number, h: number): HTMLCanvasElement {
    const c = document.createElement("canvas")
    c.width = w
    c.height = h
    const ctx = c.getContext("2d")!
    ctx.fillStyle = "red"
    ctx.fillRect(0, 0, w, h)
    return c
  }

  it("empty stack copies the base into a fresh canvas at scale", () => {
    const base = makeBase(200, 100)
    const out = compose(base, { w: 200, h: 100 }, [], 0.5)
    expect(out.canvas).not.toBe(base)
    expect(out.width).toBe(100)
    expect(out.height).toBe(50)
  })

  it("crop op returns the rect size", () => {
    const base = makeBase(100, 100)
    const out = compose(
      base,
      { w: 100, h: 100 },
      [{ type: "crop", rect: { x: 10, y: 10, width: 30, height: 20 }, aspect: "free" }],
      1,
    )
    expect(out.width).toBe(30)
    expect(out.height).toBe(20)
    expect(out.canvas.width).toBe(30)
  })

  it("resize op scales prior stage", () => {
    const base = makeBase(100, 100)
    const ops: Op[] = [
      { type: "resize", percent: 200, mode: "smooth" },
      { type: "crop", rect: { x: 0, y: 0, width: 40, height: 40 }, aspect: "free" },
    ]
    const out = compose(base, { w: 100, h: 100 }, ops, 1)
    expect(out.width).toBe(40)
    expect(out.height).toBe(40)
  })

  it("preview scale shrinks stage coordinates proportionally", () => {
    const base = makeBase(80, 60)
    // crop rect is in full-res stage coords; preview compose must map it
    const ops: Op[] = [
      { type: "crop", rect: { x: 40, y: 30, width: 40, height: 30 }, aspect: "free" },
    ]
    const out = compose(base, { w: 80, h: 60 }, ops, 0.5)
    expect(out.width).toBe(20)
    expect(out.height).toBe(15)
  })

  it("full-res walk throws when an op exceeds MAX_SIDE", () => {
    const base = makeBase(10, 10)
    const ops: Op[] = [{ type: "resize", percent: 900 * 100, mode: "smooth" }]
    expect(() => compose(base, { w: 10, h: 10 }, ops, 1)).toThrow(/Output too large/)
  })

  it("preview walk does not enforce MAX_SIDE", () => {
    const base = makeBase(10, 10)
    const ops: Op[] = [{ type: "resize", percent: 900 * 100, mode: "smooth" }]
    const out = compose(base, { w: 10, h: 10 }, ops, 0.1)
    expect(out.width).toBeGreaterThan(0)
  })
})
