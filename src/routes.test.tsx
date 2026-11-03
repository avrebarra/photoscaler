import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import App from "./App"
import { describe, it, expect } from "vitest"

function createAppRouter(initialEntries: string[]) {
  return createMemoryRouter([{ path: "*", element: <App /> }], {
    initialEntries,
    initialIndex: initialEntries.length - 1,
  })
}

function renderAt(path: string) {
  const router = createAppRouter([path])
  return {
    router,
    ...render(<RouterProvider router={router} />),
  }
}

async function pickImage() {
  const file = new File(["dummy"], "photo.jpg", { type: "image/png" })
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  if (!input) throw new Error("file input not found")
  await userEvent.upload(input, file)
  // wait for navigation to /editor
  await waitFor(() => expect(screen.queryByText("Finish")).toBeInTheDocument())
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

  it("browser back from tool renders editor", async () => {
    const router = createAppRouter(["/"])
    render(<RouterProvider router={router} />)
    await pickImage()
    expect(router.state.location.pathname).toBe("/editor")

    await act(async () => {
      await router.navigate("/editor/crop")
    })
    expect(await screen.findByText("Crop")).toBeInTheDocument()

    await act(async () => {
      await router.navigate(-1)
    })
    await waitFor(() => expect(screen.queryByText("Crop")).not.toBeInTheDocument())
    expect(screen.getByText("Finish")).toBeInTheDocument()
    expect(router.state.location.pathname).toBe("/editor")
  })

  it("with image loaded, pop from /editor shows modal", async () => {
    const router = createAppRouter(["/"])
    render(<RouterProvider router={router} />)
    await pickImage()

    await act(async () => {
      await router.navigate(-1)
    })
    expect(await screen.findByText("Clear image?")).toBeInTheDocument()
    expect(router.state.location.pathname).toBe("/editor")
  })

  it("cancel keeps editing at /editor", async () => {
    const router = createAppRouter(["/"])
    render(<RouterProvider router={router} />)
    await pickImage()

    await act(async () => {
      await router.navigate(-1)
    })
    expect(await screen.findByText("Clear image?")).toBeInTheDocument()

    const cancelBtn = screen.getByRole("button", { name: "Cancel" })
    await userEvent.click(cancelBtn)

    await waitFor(() => expect(screen.queryByText("Clear image?")).not.toBeInTheDocument())
    expect(screen.getByText("Finish")).toBeInTheDocument()
    expect(router.state.location.pathname).toBe("/editor")
  })

  it("confirm clears to Welcome at /", async () => {
    const router = createAppRouter(["/"])
    render(<RouterProvider router={router} />)
    await pickImage()

    await act(async () => {
      await router.navigate(-1)
    })
    expect(await screen.findByText("Clear image?")).toBeInTheDocument()

    const clearBtn = screen.getByRole("button", { name: "Clear" })
    await userEvent.click(clearBtn)

    await waitFor(() => expect(screen.getByText("Select image")).toBeInTheDocument())
    expect(router.state.location.pathname).toBe("/")
  })
})
