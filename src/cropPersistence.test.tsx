import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom"
import { useState } from "react"
import { ToolPicker } from "./components/ToolPicker"
import { CropToolPage } from "./components/CropToolPage"
import { ResizeToolPage } from "./components/ResizeToolPage"
import type { CropRect } from "./lib/crop"
import { describe, it, expect } from "vitest"

/* crop persistence harness — mimics App state that holds cropRect across tool switches */
function Harness() {
  const [cropRect, setCropRect] = useState<CropRect | null>({
    x: 10,
    y: 10,
    width: 80,
    height: 80,
  })
  const [cropAspect, setCropAspect] = useState<"free" | "1:1" | "4:3" | "16:9" | "original">("free")
  const [percent, setPercent] = useState(200)
  const [mode, setMode] = useState<"smooth" | "pixelate">("smooth")
  const navigate = useNavigate()
  const naturalSize = { w: 100, h: 100 }
  const src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII="

  return (
    <Routes>
      <Route
        path="/editor"
        element={
          <>
            <div data-testid="editor">editor</div>
            <div data-testid="crop-state">{cropRect ? `${cropRect.width}x${cropRect.height}` : "no-crop"}</div>
            <ToolPicker
              onSelect={(t) => {
                if (t === "crop") navigate("/editor/crop")
                else navigate("/editor/resize")
              }}
            />
          </>
        }
      />
      <Route
        path="/editor/crop"
        element={
          <CropToolPage
            cropRect={cropRect}
            cropAspect={cropAspect}
            onCropRectChange={setCropRect}
            onCropAspectChange={setCropAspect}
            onApply={() => navigate("/editor")}
            onBack={() => navigate(-1)}
            src={src}
            naturalSize={naturalSize}
            onReset={() => setCropRect(null)}
          />
        }
      />
      <Route
        path="/editor/resize"
        element={
          <ResizeToolPage
            percent={percent}
            onPercent={setPercent}
            mode={mode}
            onMode={setMode}
            origSize={cropRect ? { w: Math.round(cropRect.width), h: Math.round(cropRect.height) } : naturalSize}
            onApply={() => navigate("/editor")}
            onBack={() => navigate(-1)}
          />
        }
      />
    </Routes>
  )
}

function renderHarness(initial: string) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Harness />
    </MemoryRouter>,
  )
}

describe("crop persistence", () => {
  it("preserves crop rect when switching from crop to resize and back", async () => {
    renderHarness("/editor")

    // go to crop
    fireEvent.click(screen.getByText("Crop"))
    expect(await screen.findByText("Crop aspect")).toBeInTheDocument()
    // crop state visible via aspect chips; go back to editor
    fireEvent.click(screen.getByText("Apply"))
    expect(await screen.findByTestId("editor")).toBeInTheDocument()
    expect(screen.getByTestId("crop-state").textContent).toBe("80x80")

    // go to resize
    fireEvent.click(screen.getByText("Resize"))
    expect(await screen.findByText("Resize")).toBeInTheDocument()

    // apply resize and return
    fireEvent.click(screen.getByText("Apply"))
    expect(await screen.findByTestId("editor")).toBeInTheDocument()
    // crop should still be there
    expect(screen.getByTestId("crop-state").textContent).toBe("80x80")

    // go back to crop — still same rect
    fireEvent.click(screen.getByText("Crop"))
    expect(await screen.findByText("Crop aspect")).toBeInTheDocument()
    // crop overlay should still be present (not Enable crop button)
    expect(screen.queryByText("Enable crop")).not.toBeInTheDocument()
  })

  it("back navigates via history stack", async () => {
    renderHarness("/editor")
    fireEvent.click(screen.getByText("Crop"))
    expect(await screen.findByText("Crop aspect")).toBeInTheDocument()
    // Back button should return to editor via history
    fireEvent.click(screen.getByText("← Back"))
    expect(await screen.findByTestId("editor")).toBeInTheDocument()
  })

  it("reset clears crop but apply preserves until reset", async () => {
    renderHarness("/editor/crop")
    // initially has crop, so Apply and Reset visible
    expect(await screen.findByText("Crop aspect")).toBeInTheDocument()
    fireEvent.click(screen.getByText("Reset"))
    expect(await screen.findByText("Enable crop")).toBeInTheDocument()
  })
})
