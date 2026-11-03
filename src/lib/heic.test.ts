import { describe, it, expect } from "vitest"
import { isHeicLike, isTiffLike } from "./heic"

function file(name: string, type: string): File {
  return new File(["x"], name, { type })
}

describe("isHeicLike", () => {
  it("true for .heic/.heif case-insensitive", () => {
    expect(isHeicLike(file("a.heic", ""))).toBe(true)
    expect(isHeicLike(file("a.HEIC", ""))).toBe(true)
    expect(isHeicLike(file("a.HeIf", ""))).toBe(true)
    expect(isHeicLike(file("a.heif", ""))).toBe(true)
  })
  it("true for mime image/heic|heif", () => {
    expect(isHeicLike(file("a.jpg", "image/heic"))).toBe(true)
    expect(isHeicLike(file("a.jpg", "image/heif"))).toBe(true)
  })
  it("false for other", () => {
    expect(isHeicLike(file("a.jpg", "image/jpeg"))).toBe(false)
    expect(isHeicLike(file("a.tif", "image/tiff"))).toBe(false)
    expect(isHeicLike(file("a.png", ""))).toBe(false)
  })
})

describe("isTiffLike", () => {
  it("true for .tif/.tiff case-insensitive", () => {
    expect(isTiffLike(file("a.tif", ""))).toBe(true)
    expect(isTiffLike(file("a.TIF", ""))).toBe(true)
    expect(isTiffLike(file("a.tiff", ""))).toBe(true)
    expect(isTiffLike(file("a.TIFF", ""))).toBe(true)
  })
  it("true for mime image/tiff", () => {
    expect(isTiffLike(file("a.jpg", "image/tiff"))).toBe(true)
  })
  it("false for other", () => {
    expect(isTiffLike(file("a.heic", "image/heic"))).toBe(false)
    expect(isTiffLike(file("a.jpg", "image/jpeg"))).toBe(false)
  })
})
