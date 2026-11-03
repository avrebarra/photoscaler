import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import "./index.css"
import App from "./App.tsx"

const basename = import.meta.env.BASE_URL === "./" ? "/" : import.meta.env.BASE_URL

const router = createBrowserRouter([{ path: "*", element: <App /> }], { basename })

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
