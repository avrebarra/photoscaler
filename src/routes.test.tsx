import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import App from "./App"
import { describe, it, expect } from "vitest"

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe("route navigation", () => {
  it("renders select screen at /", () => {
    renderAt("/")
    expect(screen.getByText("Select image")).toBeInTheDocument()
    expect(screen.getByText("Choose image")).toBeInTheDocument()
  })

  it("redirects /editor to / when no image picked", () => {
    renderAt("/editor")
    expect(screen.getByText("Select image")).toBeInTheDocument()
  })

  it("redirects /editor/crop to / when no image picked", () => {
    renderAt("/editor/crop")
    expect(screen.getByText("Select image")).toBeInTheDocument()
  })

  it("redirects /editor/resize to / when no image picked", () => {
    renderAt("/editor/resize")
    expect(screen.getByText("Select image")).toBeInTheDocument()
  })

  it("redirects unknown route to /", () => {
    renderAt("/unknown")
    expect(screen.getByText("Select image")).toBeInTheDocument()
  })
})
