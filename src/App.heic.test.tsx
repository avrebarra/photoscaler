import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { describe, it, expect, vi, beforeEach } from "vitest"
import App from "./App"

function renderApp(initialEntries: string[] = ["/"]) {
  const router = createMemoryRouter([{ path: "*", element: <App /> }], {
    initialEntries,
    initialIndex: initialEntries.length - 1,
  })
  return render(<RouterProvider router={router} />)
}

vi.mock("./lib/heic", async () => {
  const actual = await vi.importActual("./lib/heic") as Record<string, unknown>
  return {
    ...actual,
    decodeImageFile: vi.fn(),
    isHeicLike: actual.isHeicLike,
    isTiffLike: actual.isTiffLike,
  }
})

import { decodeImageFile } from "./lib/heic"

function createFile(name: string, type: string, content = "fake"): File {
  return new File([content], name, { type })
}

async function pickFile(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  expect(input).toBeTruthy()
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

describe("heic/tiff input end to end", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    // ensure URL mocks are tracking
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url")
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
  })

  it("success path: heic mock decode navigates to editor and shows loading at least 200ms", async () => {
    const mockDecode = vi.mocked(decodeImageFile)
    mockDecode.mockResolvedValue({ blobUrl: "blob:decoded-heic", width: 100, height: 80 })

    renderApp()

    // initial welcome
    expect(screen.getByText("Choose image")).toBeInTheDocument()

    const heicFile = createFile("photo.heic", "", "heic-bytes")
    // pick via input (empty mime tests extension fallback)
    const picker = async () => pickFile(heicFile)
    const start = Date.now()
    await picker()

    // loading screen should appear (reuse spinner/skeleton)
    expect(await screen.findByText("Loading image…")).toBeInTheDocument()

    // still loading, picker disabled, no navigation yet
    // wait for decode + 200ms minimum + navigation
    await waitFor(() => expect(screen.getByText("Finish")).toBeInTheDocument(), { timeout: 2000 })

    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(180)
    expect(mockDecode).toHaveBeenCalledTimes(1)
    // no error banner
    expect(screen.queryByText("Failed to decode HEIC image")).not.toBeInTheDocument()
    expect(screen.queryByText("Failed to decode TIFF image")).not.toBeInTheDocument()
  })

  it("success path: all 4 extensions accepted via extension fallback when mime empty", async () => {
    const mockDecode = vi.mocked(decodeImageFile)
    mockDecode.mockResolvedValue({ blobUrl: "blob:decoded", width: 50, height: 50 })

    for (const name of ["a.heic", "b.HEIF", "c.tif", "d.TIFF"]) {
      const { unmount } = renderApp()
      mockDecode.mockClear()
      const f = createFile(name, "", "bytes")
      await pickFile(f)
      await waitFor(() => expect(screen.getByText("Finish")).toBeInTheDocument(), { timeout: 2000 })
      expect(mockDecode).toHaveBeenCalled()
      unmount()
    }
  })

  it("error path: heic decode throws shows banner and never navigates to editor", async () => {
    const mockDecode = vi.mocked(decodeImageFile)
    mockDecode.mockRejectedValue(new Error("Failed to decode HEIC image"))

    renderApp()

    const heicFile = createFile("bad.heic", "image/heic", "bad")
    await pickFile(heicFile)

    await waitFor(() => expect(screen.getByText("Failed to decode HEIC image")).toBeInTheDocument(), { timeout: 2000 })
    // still on welcome, not editor
    expect(screen.getByText("Choose image")).toBeInTheDocument()
    expect(screen.queryByText("Finish")).not.toBeInTheDocument()
    // intermediate blob revoked on failure
    // decode mock that throws does not create blob, but App should handle revocation path
  })

  it("error path: tiff decode throws shows tiff banner", async () => {
    const mockDecode = vi.mocked(decodeImageFile)
    mockDecode.mockRejectedValue(new Error("Failed to decode TIFF image"))

    renderApp()

    const tiffFile = createFile("scan.tiff", "image/tiff", "bad")
    await pickFile(tiffFile)

    await waitFor(() => expect(screen.getByText("Failed to decode TIFF image")).toBeInTheDocument(), { timeout: 2000 })
    expect(screen.getByText("Choose image")).toBeInTheDocument()
  })

  it("accept attribute widens to include heic/heif/tif/tiff", async () => {
    renderApp()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input.accept).toContain(".heic")
    expect(input.accept).toContain(".heif")
    expect(input.accept).toContain(".tif")
    expect(input.accept).toContain(".tiff")
    expect(input.accept).toContain("image/*")
  })

  it("standard images bypass decode (direct object URL)", async () => {
    const mockDecode = vi.mocked(decodeImageFile)
    const createSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:standard")

    renderApp()

    const pngFile = createFile("photo.png", "image/png", "pngbytes")
    await pickFile(pngFile)

    await waitFor(() => expect(screen.getByText("Finish")).toBeInTheDocument(), { timeout: 2000 })
    expect(mockDecode).not.toHaveBeenCalled()
    expect(createSpy).toHaveBeenCalled()
  })
})
