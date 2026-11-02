import { useLayoutEffect, useState } from "react"

export function useContainerSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setSize({ w: r.width, h: r.height })
    }
    measure()
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null
    if (ro) ro.observe(el)
    window.addEventListener("resize", measure)
    return () => {
      window.removeEventListener("resize", measure)
      if (ro) ro.disconnect()
    }
  }, [ref])

  return size
}
