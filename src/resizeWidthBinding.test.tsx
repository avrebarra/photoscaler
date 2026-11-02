import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { ResizeToolPage } from "./components/ResizeToolPage"
import { MemoryRouter } from "react-router-dom"

const renderPage = (origSize: { w: number; h: number } | null, baseOps: never[] = []) =>
  render(
    <MemoryRouter>
      <ResizeToolPage imgEl={null} origSize={origSize} baseOps={baseOps} onApply={() => {}} />
    </MemoryRouter>,
  )

describe("resize width ↔ percent binding", () => {
  it("width→percent: typing 500 with orig 1000×750 sets 50% and output 500×375", () => {
    renderPage({ w: 1000, h: 750 })
    expect(screen.getByText(/Output: 1000 × 750 px/)).toBeInTheDocument()
    const widthInput = screen.getByLabelText("Target width") as HTMLInputElement
    expect(widthInput.value).toBe("1000")
    fireEvent.change(widthInput, { target: { value: "500" } })
    expect(screen.getByText("Scale · 50%")).toBeInTheDocument()
    expect(screen.getByText(/Output: 500 × 375 px/)).toBeInTheDocument()
    expect((screen.getByLabelText("Target width") as HTMLInputElement).value).toBe("500")
  })

  it("percent→width sync: preset and slider update width input and output text", () => {
    renderPage({ w: 1000, h: 750 })
    expect((screen.getByLabelText("Target width") as HTMLInputElement).value).toBe("1000")
    // click 50% preset
    fireEvent.click(screen.getByText("50%"))
    expect((screen.getByLabelText("Target width") as HTMLInputElement).value).toBe("500")
    expect(screen.getByText(/Output: 500 × 375 px/)).toBeInTheDocument()
    expect(screen.getByText("Scale · 50%")).toBeInTheDocument()
  })

  it("clamp to 8000px: typing huge width clamps to maxPercent", () => {
    // orig 1000 → maxPercent floor(8000/1000*100)=800
    renderPage({ w: 1000, h: 750 })
    const widthInput = screen.getByLabelText("Target width")
    fireEvent.change(widthInput, { target: { value: "9000" } })
    // 9000/1000*100=900 → clamped to 800 → output 8000×6000
    expect(screen.getByText("Scale · 800%")).toBeInTheDocument()
    expect(screen.getByText(/Output: 8000 × 6000 px/)).toBeInTheDocument()
  })

  it("clamp with large orig (4000px) lowers effective max to 200", () => {
    renderPage({ w: 4000, h: 3000 })
    const widthInput = screen.getByLabelText("Target width")
    fireEvent.change(widthInput, { target: { value: "12000" } })
    expect(screen.getByText("Scale · 200%")).toBeInTheDocument()
    fireEvent.change(widthInput, { target: { value: "2000" } })
    expect(screen.getByText("Scale · 50%")).toBeInTheDocument()
  })

  it("origSize null → width input disabled and empty", () => {
    renderPage(null)
    const widthInput = screen.getByLabelText("Target width") as HTMLInputElement
    expect(widthInput.disabled).toBe(true)
    expect(widthInput.value).toBe("")
  })

  it("bidirectional: slider change updates percent and width sync", () => {
    renderPage({ w: 1000, h: 750 })
    const widthInput = screen.getByLabelText("Target width") as HTMLInputElement
    expect(widthInput.value).toBe("1000")
    const range = document.querySelector('input[type="range"]') as HTMLInputElement
    fireEvent.change(range, { target: { value: "50" } })
    expect(widthInput.value).toBe("500")
    expect(screen.getByText(/Output: 500 × 375 px/)).toBeInTheDocument()
    fireEvent.change(widthInput, { target: { value: "1000" } })
    expect(widthInput.value).toBe("1000")
    expect(screen.getByText(/Output: 1000 × 750 px/)).toBeInTheDocument()
    expect(screen.getByText("Scale · 100%")).toBeInTheDocument()
  })
})
