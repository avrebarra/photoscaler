import { useState } from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { buildDownloadName } from "./App"

// isolated handleDownload-like component to test error handling without App image-load plumbing
function makeDownloader(opts: { compose: () => { canvas: HTMLCanvasElement }; canvasToUrl: () => string; fileName: string }) {
  return function Downloader() {
    const [error, setError] = useState<string | null>(null)
    function handleDownload() {
      try {
        void opts.compose()
        const _url = opts.canvasToUrl()
        const a = document.createElement("a")
        a.href = _url
        ;(a as unknown as { download: string }).download = buildDownloadName(opts.fileName, new Date(2025, 11, 2, 14, 30, 0))
        a.click()
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e))
      }
    }
    return (
      <div>
        <button onClick={handleDownload}>Download PNG</button>
        {error && <p role="alert">{error}</p>}
      </div>
    )
  }
}

describe("handleDownload — timestamp + error handling", () => {
  it("success path: download name is <stem>-<timestamp>.<ext>, no -edited", () => {
    const fakeCanvas = document.createElement("canvas")
    let capturedDownload = ""
    const origCreate = document.createElement.bind(document)
    const spy = vi.spyOn(document, "createElement").mockImplementation((tagName: string, opts?: ElementCreationOptions) => {
      if (tagName === "a") {
        const a = origCreate(tagName, opts) as HTMLAnchorElement
        let dl = ""
        Object.defineProperty(a, "download", {
          get: () => dl,
          set: (v: string) => {
            dl = v
            capturedDownload = v
          },
          configurable: true,
        })
        a.click = vi.fn()
        return a as unknown as HTMLElement
      }
      return origCreate(tagName, opts)
    })

    const Downloader = makeDownloader({
      compose: () => ({ canvas: fakeCanvas }),
      canvasToUrl: () => "data:image/png;base64,mock",
      fileName: "photo.jpg",
    })
    render(<Downloader />)
    fireEvent.click(screen.getByText("Download PNG"))

    expect(capturedDownload).toBe("photo-20251202T143000.jpg")
    expect(capturedDownload).toMatch(/^photo-\d{8}T\d{6}\.jpg$/)
    expect(capturedDownload).not.toContain("-edited")
    expect(capturedDownload).not.toContain("-noise")

    // png variant
    capturedDownload = ""
    const DownloaderPng = makeDownloader({
      compose: () => ({ canvas: fakeCanvas }),
      canvasToUrl: () => "data:image/png;base64,mock",
      fileName: "image.png",
    })
    const { unmount } = render(<DownloaderPng />)
    // second component's button — need to query all
    const btns = screen.getAllByText("Download PNG")
    fireEvent.click(btns[btns.length - 1])
    expect(capturedDownload).toBe("image-20251202T143000.png")
    unmount()

    spy.mockRestore()
  })

  it("error path: compose throws → error shown, no download click", () => {
    let clickCalled = false
    const origCreate = document.createElement.bind(document)
    const spy = vi.spyOn(document, "createElement").mockImplementation((tagName: string, opts?: ElementCreationOptions) => {
      if (tagName === "a") {
        const a = origCreate(tagName, opts) as HTMLAnchorElement
        a.click = vi.fn(() => {
          clickCalled = true
        })
        return a as unknown as HTMLElement
      }
      return origCreate(tagName, opts)
    })

    const Downloader = makeDownloader({
      compose: () => {
        throw new Error("compose boom")
      },
      canvasToUrl: () => "data:image/png;base64,mock",
      fileName: "photo.jpg",
    })
    render(<Downloader />)
    fireEvent.click(screen.getByText("Download PNG"))

    expect(screen.getByRole("alert")).toHaveTextContent("compose boom")
    expect(clickCalled).toBe(false)

    spy.mockRestore()
  })

  it("error path: canvasToUrl throws → error shown, no download", () => {
    const fakeCanvas = document.createElement("canvas")
    const Downloader = makeDownloader({
      compose: () => ({ canvas: fakeCanvas }),
      canvasToUrl: () => {
        throw new Error("canvas boom")
      },
      fileName: "photo.jpg",
    })
    render(<Downloader />)
    fireEvent.click(screen.getAllByText("Download PNG").pop()!)
    expect(screen.getByRole("alert")).toHaveTextContent("canvas boom")
  })
})
