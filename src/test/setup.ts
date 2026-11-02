import "@testing-library/jest-dom/vitest"

// mock canvas getContext for jsdom
Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  value: () => ({
    drawImage: () => {},
    fillRect: () => {},
    getImageData: () => ({ data: [] }),
  }),
})

// mock URL.createObjectURL
if (!URL.createObjectURL) {
  // @ts-ignore
  URL.createObjectURL = () => "blob:mock-url"
}
if (!URL.revokeObjectURL) {
  // @ts-ignore
  URL.revokeObjectURL = () => {}
}
