import { useRef, useState } from "react"

export function DragSlider({ value, min, max, onChange, tickAt, ariaLabel }: DragSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  function setFromPointer(e: PointerEvent | React.PointerEvent<HTMLDivElement>) {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onChange(Math.round(min + frac * (max - min)))
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(true)
    setFromPointer(e)
    const move = (ev: PointerEvent) => setFromPointer(ev)
    const up = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
      setDragging(false)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
  }

  const frac = max > min ? (value - min) / (max - min) : 0
  const showTick = tickAt != null && tickAt >= min && tickAt <= max

  return (
    <div data-component="DragSlider" className="flex flex-col gap-2">
      <div className="relative h-10 flex items-center cursor-grab active:cursor-grabbing touch-none select-none">
        <div
          ref={trackRef}
          onPointerDown={onPointerDown}
          role="slider"
          tabIndex={0}
          aria-label={ariaLabel ?? "slider"}
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuetext={`${value}`}
          onKeyDown={(e) => {
            let next: number | null = null
            if (e.key === "ArrowRight" || e.key === "ArrowUp") next = value + 1
            else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = value - 1
            else if (e.key === "Home") next = min
            else if (e.key === "End") next = max
            if (next == null) return
            e.preventDefault()
            onChange(Math.round(Math.max(min, Math.min(max, next))))
          }}
          className="relative h-2 w-full rounded-full bg-zinc-800 overflow-visible focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-white/90"
            style={{ width: `${frac * 100}%` }}
          />
          {showTick && (
            <span
              className="absolute top-1/2 -translate-y-1/2 h-4 w-px bg-white/30"
              style={{ left: `${((tickAt! - min) / (max - min)) * 100}%` }}
            />
          )}
        </div>
        <span
          className="absolute h-7 w-7 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,.5)] ring-1 ring-black/20 pointer-events-none transition-transform"
          style={{ left: `calc(${frac * 100}% - 14px)` }}
        />
      </div>
      <div className="relative flex items-baseline justify-between h-7">
        <span className="text-[10px] font-medium tracking-wide text-zinc-500 tabular-nums">{min}</span>
        <span
          className={`absolute left-1/2 -translate-x-1/2 text-[13px] font-bold tabular-nums text-white leading-none transition-opacity duration-150 ${dragging ? "opacity-100" : "opacity-0"}`}
        >
          {value}
        </span>
        <span className="text-[10px] font-medium tracking-wide text-zinc-500 tabular-nums">{max}</span>
      </div>
    </div>
  )
}

type DragSliderProps = {
  value: number
  min: number
  max: number
  onChange(value: number): void
  tickAt?: number | null
  ariaLabel?: string
}
