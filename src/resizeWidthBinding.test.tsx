import { render, screen, fireEvent, act } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { ResizeToolScreen } from "./screens/ResizeToolScreen"
import { MemoryRouter } from "react-router-dom"
import { TickDial, getRangeScale, getHoldStep, getWheelStep, computeDragNext, computeInertiaTarget } from "./components/TickDial"

const renderPage = (origSize: { w: number; h: number } | null, baseOps: never[] = []) =>
  render(
    <MemoryRouter>
      <ResizeToolScreen imgEl={null} origSize={origSize} baseOps={baseOps} onApply={() => {}} />
    </MemoryRouter>,
  )

describe("resize subtool dock", () => {
  it("shows icon rail with three circles, scale amber-ringed, title SCALE and tick dial", () => {
    renderPage({ w: 1000, h: 750 })
    expect(screen.getByLabelText("Size")).toBeInTheDocument()
    expect(screen.getByLabelText("Interpolation")).toBeInTheDocument()
    expect(screen.getByLabelText("Grain")).toBeInTheDocument()
    expect(screen.getByText("SCALE")).toBeInTheDocument()
    const scaleDial = screen.getByLabelText("Scale dial")
    expect(scaleDial).toBeInTheDocument()
    expect(scaleDial.getAttribute("aria-valuenow")).toBe("100")
    expect(scaleDial.getAttribute("aria-valuemin")).toBe("2")
    expect(scaleDial.getAttribute("aria-valuemax")).toBe("800")
    // active scale has amber border
    const sizeBtn = screen.getByLabelText("Size").querySelector("span")
    expect(sizeBtn?.className).toMatch(/border-amber-400/)
    // tick dial shows DRAG hint
    expect(screen.getByText("DRAG")).toBeInTheDocument()
  })

  it("badge shows output size", () => {
    renderPage({ w: 1000, h: 750 })
    expect(screen.getByText("1000 × 750 px")).toBeInTheDocument()
  })

  it("slider at min clamps to 10px shortest side", () => {
    renderPage({ w: 1000, h: 750 })
    const dial = screen.getByLabelText("Scale dial")
    dial.focus()
    for (let i = 0; i < 200; i++) fireEvent.keyDown(dial, { key: "ArrowLeft" })
    expect(dial.getAttribute("aria-valuenow")).toBe("2")
    expect(screen.getByText("20 × 15 px")).toBeInTheDocument()
  })

  it("slider at max clamps to 8000px longest side", () => {
    renderPage({ w: 1000, h: 750 })
    const dial = screen.getByLabelText("Scale dial")
    dial.focus()
    for (let i = 0; i < 800; i++) fireEvent.keyDown(dial, { key: "ArrowRight" })
    expect(dial.getAttribute("aria-valuenow")).toBe("800")
    expect(screen.getByText("8000 × 6000 px")).toBeInTheDocument()
  })

  it("slider max lowers for large orig (4000×3000 → 200%)", () => {
    renderPage({ w: 4000, h: 3000 })
    const dial = screen.getByLabelText("Scale dial")
    expect(dial.getAttribute("aria-valuemax")).toBe("200")
    expect(dial.getAttribute("aria-valuemin")).toBe("1")
    dial.focus()
    for (let i = 0; i < 300; i++) fireEvent.keyDown(dial, { key: "ArrowRight" })
    expect(dial.getAttribute("aria-valuenow")).toBe("200")
  })

  it("arrow keys nudge ±1% and Home/End jump to bounds", () => {
    renderPage({ w: 1000, h: 750 })
    const dial = screen.getByLabelText("Scale dial")
    dial.focus()
    fireEvent.keyDown(dial, { key: "ArrowRight" })
    expect(dial.getAttribute("aria-valuenow")).toBe("101")
    fireEvent.keyDown(dial, { key: "ArrowLeft" })
    expect(dial.getAttribute("aria-valuenow")).toBe("100")
    fireEvent.keyDown(dial, { key: "End" })
    expect(dial.getAttribute("aria-valuenow")).toBe("800")
    fireEvent.keyDown(dial, { key: "Home" })
    expect(dial.getAttribute("aria-valuenow")).toBe("2")
  })

  it("tapping waves shows INTERPOLATION with segmented choice in slider slot", () => {
    renderPage({ w: 1000, h: 750 })
    expect(screen.getByText("SCALE")).toBeInTheDocument()
    expect(screen.getByLabelText("Scale dial")).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText("Interpolation"))
    expect(screen.getByText("INTERPOLATION")).toBeInTheDocument()
    expect(screen.getByText("Blur")).toBeInTheDocument()
    expect(screen.getByText("Lanczos")).toBeInTheDocument()
    expect(screen.getByText("Pixelate")).toBeInTheDocument()
    // slider hidden, choice shown
    expect(screen.queryByLabelText("Scale dial")).not.toBeInTheDocument()
  })

  it("tapping dot-grid shows GRAIN STRENGTH with slider at 0, no toggle", () => {
    renderPage({ w: 1000, h: 750 })
    fireEvent.click(screen.getByLabelText("Grain"))
    expect(screen.getByText("GRAIN STRENGTH")).toBeInTheDocument()
    const grain = screen.getByLabelText("Grain strength")
    expect(grain).toBeInTheDocument()
    expect(grain.getAttribute("aria-valuenow")).toBe("0")
    expect(grain.getAttribute("aria-valuemin")).toBe("0")
    expect(grain.getAttribute("aria-valuemax")).toBe("100")
    expect(screen.queryByLabelText("Enable grain")).not.toBeInTheDocument()
    expect(screen.queryByText("Enable grain")).not.toBeInTheDocument()
  })

  it("has no gear or modal settings", () => {
    renderPage({ w: 1000, h: 750 })
    expect(screen.queryByLabelText("Resize settings")).not.toBeInTheDocument()
    expect(screen.queryByText("Resize settings")).not.toBeInTheDocument()
  })
})

describe("velocity-aware dial", () => {
  it("slow drag yields 1 percent precision via dx/3 without boost", () => {
    const next = computeDragNext(100, 30, 0.2, 2, 800)
    expect(next).toBeCloseTo(100 - 30 / 3, 5)
    const nextNeg = computeDragNext(100, -30, -0.2, 2, 800)
    expect(nextNeg).toBeCloseTo(110, 5)
    expect(Math.round(next)).toBe(90)
  })

  it("fast drag scales proportionally and more on large ranges", () => {
    const vel = 0.7
    const small = computeDragNext(100, -60, vel, 1, 200)
    const large = computeDragNext(100, -60, vel, 2, 800)
    const smallBoost = small - (100 + 60 / 3)
    const largeBoost = large - (100 + 60 / 3)
    expect(largeBoost).toBeGreaterThan(smallBoost)
    expect(largeBoost).toBeGreaterThan(5)
    expect(smallBoost).toBeGreaterThan(1)
  })

  it("range scaling grows with (max - min)", () => {
    expect(getRangeScale(1, 200)).toBeCloseTo(1, 1)
    const mid = getRangeScale(2, 800)
    const narrow = getRangeScale(50, 150)
    expect(mid).toBeGreaterThan(narrow)
    expect(mid).toBeGreaterThan(2)
    expect(getRangeScale(2, 800)).toBeCloseTo(798 / 200, 1)
  })

  it("wheel slow stays 1 percent, fast scales proportionally", () => {
    const smallRange = getRangeScale(1, 200)
    const largeRange = getRangeScale(2, 800)
    expect(getWheelStep(10, largeRange)).toBe(1)
    expect(getWheelStep(20, largeRange)).toBe(1)
    const fastLarge = getWheelStep(60, largeRange)
    const fastSmall = getWheelStep(60, smallRange)
    expect(fastLarge).toBeGreaterThan(1)
    expect(fastLarge).toBeGreaterThan(fastSmall)
    expect(fastLarge).toBeGreaterThanOrEqual(3)
    expect(fastLarge).toBeLessThanOrEqual(12)
    const example = getWheelStep(45, largeRange)
    expect(example).toBeGreaterThanOrEqual(3)
    expect(example).toBeLessThanOrEqual(8)
  })

  it("wheel fast scroll on component yields proportional step", () => {
    const onChange = vi.fn()
    render(<TickDial percent={100} minPercent={2} maxPercent={800} onChange={onChange} />)
    const dial = screen.getByLabelText("Scale dial")
    fireEvent.wheel(dial, { deltaY: -10 })
    expect(onChange).toHaveBeenLastCalledWith(101)
    onChange.mockClear()
    fireEvent.wheel(dial, { deltaY: -60 })
    const last = onChange.mock.calls[0]?.[0] as number
    expect(last).toBeGreaterThan(102)
    expect(last).toBeLessThanOrEqual(112)
  })

  it("keyboard single press stays 1 percent", () => {
    const onChange = vi.fn()
    render(<TickDial percent={100} minPercent={2} maxPercent={800} onChange={onChange} />)
    const dial = screen.getByLabelText("Scale dial")
    dial.focus()
    fireEvent.keyDown(dial, { key: "ArrowRight" })
    expect(onChange).toHaveBeenCalledWith(101)
    onChange.mockClear()
    fireEvent.keyDown(dial, { key: "ArrowLeft" })
    expect(onChange).toHaveBeenCalledWith(99)
  })

  it("keyboard hold >300ms accelerates proportionally", () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    render(<TickDial percent={100} minPercent={2} maxPercent={800} onChange={onChange} />)
    const dial = screen.getByLabelText("Scale dial")
    dial.focus()
    onChange.mockClear()
    fireEvent.keyDown(dial, { key: "ArrowRight" })
    expect(onChange).toHaveBeenCalledWith(101)
    onChange.mockClear()
    act(() => {
      vi.advanceTimersByTime(400)
    })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(onChange.mock.calls.length).toBeGreaterThan(0)
    const acceleratedStep = (onChange.mock.calls[0]?.[0] as number) - 101
    expect(acceleratedStep).toBeGreaterThanOrEqual(1)
    const early = getHoldStep(310, getRangeScale(2, 800))
    const later = getHoldStep(900, getRangeScale(2, 800))
    expect(later).toBeGreaterThan(early)
    const smallRangeHold = getHoldStep(600, getRangeScale(1, 200))
    const largeRangeHold = getHoldStep(600, getRangeScale(2, 800))
    expect(largeRangeHold).toBeGreaterThan(smallRangeHold)
    fireEvent.keyUp(dial, { key: "ArrowRight" })
    vi.useRealTimers()
  })

  it("Home End still jump to bounds after velocity changes", () => {
    const onChange = vi.fn()
    render(<TickDial percent={100} minPercent={2} maxPercent={800} onChange={onChange} />)
    const dial = screen.getByLabelText("Scale dial")
    fireEvent.keyDown(dial, { key: "End" })
    expect(onChange).toHaveBeenCalledWith(800)
    fireEvent.keyDown(dial, { key: "Home" })
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it("inertia scales with velocity and range then snaps to integer and respects bounds", () => {
    expect(computeInertiaTarget(100, 0.2, 2, 800)).toBe(100)
    const slowInertia = computeInertiaTarget(100, 0.6, 2, 800)
    const fastInertia = computeInertiaTarget(100, 1.2, 2, 800)
    expect(Math.abs(fastInertia - 100)).toBeGreaterThan(Math.abs(slowInertia - 100))
    const narrow = computeInertiaTarget(100, 0.7, 1, 200)
    const wide = computeInertiaTarget(100, 0.7, 2, 800)
    expect(Math.abs(wide - 100)).toBeGreaterThan(Math.abs(narrow - 100))
    expect(computeInertiaTarget(795, 2, 2, 800)).toBe(800)
    expect(computeInertiaTarget(5, -2, 2, 800)).toBe(2)
    const raw = computeInertiaTarget(100, 0.7, 2, 800)
    expect(Number.isInteger(Math.round(raw))).toBe(true)
  })

  it("aria stays truthful after velocity props", () => {
    const { rerender } = render(<TickDial percent={50} minPercent={2} maxPercent={800} onChange={() => {}} />)
    const dial = screen.getByLabelText("Scale dial")
    expect(dial.getAttribute("aria-valuenow")).toBe("50")
    expect(dial.getAttribute("aria-valuemin")).toBe("2")
    expect(dial.getAttribute("aria-valuemax")).toBe("800")
    rerender(<TickDial percent={120} minPercent={5} maxPercent={400} onChange={() => {}} />)
    const dial2 = screen.getByLabelText("Scale dial")
    expect(dial2.getAttribute("aria-valuenow")).toBe("120")
    expect(dial2.getAttribute("aria-valuetext")).toBe("120%")
  })
})
