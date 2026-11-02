import { describe, it, expect } from "vitest"
import { buildDownloadName } from "./lib/buildDownloadName"

function localDate(y: number, m: number, d: number, h: number, min: number, s: number) {
  return new Date(y, m - 1, d, h, min, s)
}

describe("buildDownloadName", () => {
  const date = localDate(2025, 12, 2, 14, 30, 0)

  it("jpg original keeps jpg ext with timestamp suffix", () => {
    const name = buildDownloadName("photo.jpg", date)
    expect(name).toBe("photo-20251202T143000.jpg")
    expect(name).not.toContain("-edited")
    expect(name).toMatch(/^photo-\d{8}T\d{6}\.jpg$/)
  })

  it("png original keeps png ext with timestamp suffix", () => {
    const name = buildDownloadName("image.png", date)
    expect(name).toBe("image-20251202T143000.png")
    expect(name).toMatch(/^image-\d{8}T\d{6}\.png$/)
  })

  it("always timestamped, no -edited words", () => {
    const names = [
      buildDownloadName("a.jpg", date),
      buildDownloadName("b.png", date),
      buildDownloadName("c", date),
    ]
    for (const n of names) {
      expect(n).not.toContain("-edited")
      expect(n).toMatch(/-\d{8}T\d{6}\./)
    }
  })

  it("empty name falls back to image + png", () => {
    expect(buildDownloadName("", date)).toBe("image-20251202T143000.png")
    expect(buildDownloadName(".png", localDate(2025, 1, 1, 0, 0, 0))).toBe(
      "image-20250101T000000.png",
    )
  })

  it("multi-dot name keeps stem before last dot", () => {
    expect(buildDownloadName("my.photo.jpg", date)).toBe("my.photo-20251202T143000.jpg")
  })

  it("pads single-digit month/day/hour/min/sec", () => {
    const d = localDate(2025, 1, 2, 3, 4, 5)
    expect(buildDownloadName("x.jpg", d)).toBe("x-20250102T030405.jpg")
  })

  it("extension reflects original even when blob is png (jpg ext stays jpg)", () => {
    // spec: blob MIME stays image/png but ext is original
    const n = buildDownloadName("original.jpeg", date)
    expect(n).toBe("original-20251202T143000.jpeg")
    expect(n).toMatch(/\.jpeg$/)
  })
})
