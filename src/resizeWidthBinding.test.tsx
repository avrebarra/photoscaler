import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { ResizeToolPage } from "./components/ResizeToolPage"
import { useState } from "react"

describe("resize width ↔ percent binding", () => {
  it("width→percent: typing 500 with orig 1000×750 calls onPercent(50) and output derives 500×375", () => {
    const onPercent = vi.fn()
    render(
      <ResizeToolPage
        percent={200}
        onPercent={onPercent}
        mode="smooth"
        onMode={() => {}}
        origSize={{ w: 1000, h: 750 }}
        onApply={() => {}}
        onBack={() => {}}
      />,
    )
    // initial output text 2000×1500
    expect(screen.getByText(/Output: 2000 × 1500 px/)).toBeInTheDocument()
    // width input shows targetW 2000
    const widthInput = screen.getByLabelText("Target width") as HTMLInputElement
    expect(widthInput.value).toBe("2000")
    // type new width 500
    fireEvent.change(widthInput, { target: { value: "500" } })
    expect(onPercent).toHaveBeenCalledWith(50)
  })

  it("percent→width sync: changing percent prop updates width input and output text", () => {
    const { rerender } = render(
      <ResizeToolPage
        percent={200}
        onPercent={() => {}}
        mode="smooth"
        onMode={() => {}}
        origSize={{ w: 1000, h: 750 }}
        onApply={() => {}}
        onBack={() => {}}
      />,
    )
    expect((screen.getByLabelText("Target width") as HTMLInputElement).value).toBe("2000")
    expect(screen.getByText(/Output: 2000 × 1500 px/)).toBeInTheDocument()

    rerender(
      <ResizeToolPage
        percent={50}
        onPercent={() => {}}
        mode="smooth"
        onMode={() => {}}
        origSize={{ w: 1000, h: 750 }}
        onApply={() => {}}
        onBack={() => {}}
      />,
    )
    expect((screen.getByLabelText("Target width") as HTMLInputElement).value).toBe("500")
    expect(screen.getByText(/Output: 500 × 375 px/)).toBeInTheDocument()
  })

  it("clamp to 8000px: typing huge width clamps to maxPercent", () => {
    const onPercent = vi.fn()
    // orig 1000 → maxPercent floor(8000/1000*100)=800
    render(
      <ResizeToolPage
        percent={100}
        onPercent={onPercent}
        mode="smooth"
        onMode={() => {}}
        origSize={{ w: 1000, h: 750 }}
        onApply={() => {}}
        onBack={() => {}}
      />,
    )
    const widthInput = screen.getByLabelText("Target width")
    fireEvent.change(widthInput, { target: { value: "9000" } })
    // 9000/1000*100=900 → clamped to 800
    expect(onPercent).toHaveBeenCalledWith(800)
  })

  it("clamp with large orig (4000px) lowers effective max to 200", () => {
    const onPercent = vi.fn()
    render(
      <ResizeToolPage
        percent={100}
        onPercent={onPercent}
        mode="smooth"
        onMode={() => {}}
        origSize={{ w: 4000, h: 3000 }}
        onApply={() => {}}
        onBack={() => {}}
      />,
    )
    const widthInput = screen.getByLabelText("Target width")
    // maxWidth 8000, orig 4000 => maxPercent 200
    fireEvent.change(widthInput, { target: { value: "12000" } })
    expect(onPercent).toHaveBeenCalledWith(200)
    // typing within range works
    onPercent.mockClear()
    fireEvent.change(widthInput, { target: { value: "2000" } })
    expect(onPercent).toHaveBeenCalledWith(50)
  })

  it("origSize null → width input disabled and empty, invalid/empty ignored", () => {
    const onPercent = vi.fn()
    render(
      <ResizeToolPage
        percent={200}
        onPercent={onPercent}
        mode="smooth"
        onMode={() => {}}
        origSize={null}
        onApply={() => {}}
        onBack={() => {}}
      />,
    )
    const widthInput = screen.getByLabelText("Target width") as HTMLInputElement
    expect(widthInput.disabled).toBe(true)
    expect(widthInput.value).toBe("")
    // empty / NaN ignored
    fireEvent.change(widthInput, { target: { value: "" } })
    expect(onPercent).not.toHaveBeenCalled()
    fireEvent.change(widthInput, { target: { value: "abc" } })
    expect(onPercent).not.toHaveBeenCalled()
  })

  it("bidirectional: slider change updates percent and width sync via parent state (harness)", () => {
    function Harness() {
      const [percent, setPercent] = useState(200)
      const origSize = { w: 1000, h: 750 }
      return (
        <ResizeToolPage
          percent={percent}
          onPercent={setPercent}
          mode="smooth"
          onMode={() => {}}
          origSize={origSize}
          onApply={() => {}}
          onBack={() => {}}
        />
      )
    }
    render(<Harness />)
    const widthInput = screen.getByLabelText("Target width") as HTMLInputElement
    expect(widthInput.value).toBe("2000")
    // move slider to 50
    const range = document.querySelector('input[type="range"]') as HTMLInputElement
    fireEvent.change(range, { target: { value: "50" } })
    expect(widthInput.value).toBe("500")
    expect(screen.getByText(/Output: 500 × 375 px/)).toBeInTheDocument()
    // now type width 1000 → percent 100 → slider moves
    fireEvent.change(widthInput, { target: { value: "1000" } })
    expect(widthInput.value).toBe("1000")
    expect(screen.getByText(/Output: 1000 × 750 px/)).toBeInTheDocument()
    expect(screen.getByText("Scale · 100%")).toBeInTheDocument()
    // percent number input also reflects 100 (along with slider) — check at least one exists
    expect(screen.getAllByDisplayValue("100").length).toBeGreaterThanOrEqual(1)
  })
})
