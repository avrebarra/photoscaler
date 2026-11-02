import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { ResizeToolScreen } from "./screens/ResizeToolScreen"
import { MemoryRouter } from "react-router-dom"

const renderPage = (origSize: { w: number; h: number } | null, baseOps: never[] = []) =>
  render(
    <MemoryRouter>
      <ResizeToolScreen imgEl={null} origSize={origSize} baseOps={baseOps} onApply={() => {}} />
    </MemoryRouter>
  )

describe("resize dial + badge + settings overlay", () => {
  it("badge shows output size and percent", () => {
    renderPage({ w: 1000, h: 750 })
    expect(screen.getByText("100%")).toBeInTheDocument()
    expect(screen.getByText("1000 × 750 px")).toBeInTheDocument()
  })

  it("dial at min clamps to 10px shortest side", () => {
    // 1000×750 → minSide 750 → minPercent ceil(10/750*100)=2
    renderPage({ w: 1000, h: 750 })
    const dial = screen.getByLabelText("Scale dial")
    // dial target: focus then arrow left repeatedly should clamp to min
    dial.focus()
    for (let i = 0; i < 200; i++) fireEvent.keyDown(dial, { key: "ArrowLeft" })
    // 2% of 750 = 15px, of 1000 = 20px → shortest side 15 but min bound ensures 10px reachable for larger images;
    // for this size min is 2% → output 20×15
    expect(screen.getByText("2%")).toBeInTheDocument()
    expect(screen.getByText("20 × 15 px")).toBeInTheDocument()
  })

  it("dial at max clamps to 8000px longest side", () => {
    // 1000×750 → maxSide 1000 → maxPercent floor(8000/1000*100)=800
    renderPage({ w: 1000, h: 750 })
    const dial = screen.getByLabelText("Scale dial")
    dial.focus()
    for (let i = 0; i < 800; i++) fireEvent.keyDown(dial, { key: "ArrowRight" })
    expect(screen.getByText("800%")).toBeInTheDocument()
    expect(screen.getByText("8000 × 6000 px")).toBeInTheDocument()
  })

  it("dial max lowers for large orig (4000×3000 → 200%)", () => {
    renderPage({ w: 4000, h: 3000 })
    const dial = screen.getByLabelText("Scale dial")
    expect(dial.getAttribute("aria-valuemax")).toBe("200")
    expect(dial.getAttribute("aria-valuemin")).toBe("1")
    dial.focus()
    for (let i = 0; i < 300; i++) fireEvent.keyDown(dial, { key: "ArrowRight" })
    expect(screen.getByText("200%")).toBeInTheDocument()
  })

  it("arrow keys nudge ±1% and Home/End jump to bounds", () => {
    renderPage({ w: 1000, h: 750 })
    const dial = screen.getByLabelText("Scale dial")
    dial.focus()
    fireEvent.keyDown(dial, { key: "ArrowRight" })
    expect(screen.getByText("101%")).toBeInTheDocument()
    fireEvent.keyDown(dial, { key: "ArrowLeft" })
    expect(screen.getByText("100%")).toBeInTheDocument()
    fireEvent.keyDown(dial, { key: "End" })
    expect(screen.getByText("800%")).toBeInTheDocument()
    fireEvent.keyDown(dial, { key: "Home" })
    expect(screen.getByText("2%")).toBeInTheDocument()
  })

  it("wheel over dial adjusts ±1%", () => {
    renderPage({ w: 1000, h: 750 })
    const dial = screen.getByLabelText("Scale dial")
    fireEvent.wheel(dial, { deltaY: -10 })
    expect(screen.getByText("101%")).toBeInTheDocument()
    fireEvent.wheel(dial, { deltaY: 10 })
    expect(screen.getByText("100%")).toBeInTheDocument()
  })

  it("settings overlay opens via gear and closes via Done", () => {
    renderPage({ w: 1000, h: 750 })
    expect(screen.queryByText("Resize settings")).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText("Resize settings"))
    expect(screen.getByText("Resize settings")).toBeInTheDocument()
    expect(screen.getByText("Interpolation")).toBeInTheDocument()
    // chips
    expect(screen.getByText("Blur")).toBeInTheDocument()
    expect(screen.getByText("Lanczos")).toBeInTheDocument()
    expect(screen.getByText("Pixelate")).toBeInTheDocument()
    // close via Done
    fireEvent.click(screen.getByText("Done"))
    expect(screen.queryByText("Resize settings")).not.toBeInTheDocument()
  })

  it("grain toggle reveals strength control", () => {
    renderPage({ w: 1000, h: 750 })
    fireEvent.click(screen.getByLabelText("Resize settings"))
    expect(screen.queryByLabelText("Grain strength")).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText("Enable grain"))
    expect(screen.getByLabelText("Grain strength")).toBeInTheDocument()
  })
})
