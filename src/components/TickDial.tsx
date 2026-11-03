import { useEffect, useRef, useState } from "react"

const TICK_START = 0
const EDGE_PADDING = 60
const VELOCITY_THRESHOLD = 0.45
const DRAG_VELOCITY_SCALE = 6
const INERTIA_BASE = 90
const RANGE_REF = 200
const HOLD_DELAY_MS = 300
const HOLD_INTERVAL_MS = 85
const WHEEL_THRESHOLD = 28
const DRAG_DIVISOR = 3

export function TickDial({ percent, minPercent, maxPercent, onChange }: TickDialProps) {
  const clampInt = (v: number) => Math.round(Math.max(minPercent, Math.min(maxPercent, v)))
  const clampFloat = (v: number) => Math.max(minPercent, Math.min(maxPercent, v))

  const [dragging, setDragging] = useState(false)
  const [atBound, setAtBound] = useState<null | "min" | "max">(null)

  const fracRef = useRef(percent)
  const stripRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const velRef = useRef(0)
  const lastXRef = useRef(0)
  const lastTRef = useRef(0)

  const holdStartRef = useRef(0)
  const holdTimeoutRef = useRef<number | null>(null)
  const holdIntervalRef = useRef<number | null>(null)
  const holdDirRef = useRef(0)
  const holdActiveRef = useRef(false)

  useEffect(() => {
    fracRef.current = percent
    const el = stripRef.current
    if (!el) return
    el.style.transition = "none"
    el.style.transform = `translate3d(${-percent * 10}px, 0, 0)`
    el.style.setProperty("--frac", String(percent))
  }, [percent])

  useEffect(() => {
    return () => {
      if (holdTimeoutRef.current != null) window.clearTimeout(holdTimeoutRef.current)
      if (holdIntervalRef.current != null) window.clearInterval(holdIntervalRef.current)
    }
  }, [])

  function updateStrip(frac: number, animate: boolean) {
    const el = stripRef.current
    if (!el) return
    const x = -frac * 10
    el.style.transition = animate ? "transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)" : "none"
    el.style.transform = `translate3d(${x}px, 0, 0)`
    el.style.setProperty("--frac", String(frac))
  }

  function setBound(next: number) {
    if (next <= minPercent) setAtBound("min")
    else if (next >= maxPercent) setAtBound("max")
    else setAtBound(null)
  }

  function clearHold() {
    if (holdTimeoutRef.current != null) window.clearTimeout(holdTimeoutRef.current)
    if (holdIntervalRef.current != null) window.clearInterval(holdIntervalRef.current)
    holdTimeoutRef.current = null
    holdIntervalRef.current = null
    holdActiveRef.current = false
    holdDirRef.current = 0
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = e.currentTarget
    cancelAnimationFrame(rafRef.current)
    const startX = e.clientX
    const startFrac = fracRef.current
    let curFrac = startFrac
    velRef.current = 0
    lastXRef.current = startX
    lastTRef.current = performance.now()
    setDragging(true)
    el.setPointerCapture(e.pointerId)

    const onMove = (ev: PointerEvent) => {
      const now = performance.now()
      const dx = ev.clientX - startX
      const dt = Math.max(1, now - lastTRef.current)
      const instVel = (ev.clientX - lastXRef.current) / dt
      velRef.current = instVel * -0.33
      lastXRef.current = ev.clientX
      lastTRef.current = now

      // base mapping
      let next = startFrac - dx / DRAG_DIVISOR
      // velocity proportional boost when above threshold
      if (Math.abs(velRef.current) >= VELOCITY_THRESHOLD) {
        const rangeScale = getRangeScale(minPercent, maxPercent)
        const boost = velRef.current * DRAG_VELOCITY_SCALE * rangeScale
        next += boost
      }
      if (next < minPercent) {
        const over = minPercent - next
        next = minPercent - Math.pow(over, 0.72) * 0.5
      } else if (next > maxPercent) {
        const over = next - maxPercent
        next = maxPercent + Math.pow(over, 0.72) * 0.5
      }
      curFrac = next
      fracRef.current = next

      updateStrip(next, false)
      const intNext = clampInt(next)
      setBound(intNext)
      if (intNext !== percent) onChange(intNext)
    }

    const onUp = (ev: PointerEvent) => {
      try {
        el.releasePointerCapture(ev.pointerId)
      } catch {}
      el.removeEventListener("pointermove", onMove as unknown as EventListener)
      el.removeEventListener("pointerup", onUp as unknown as EventListener)
      el.removeEventListener("pointercancel", onUp as unknown as EventListener)
      setDragging(false)

      // inertia scaled by velocity and range
      let target = curFrac
      if (Math.abs(velRef.current) >= VELOCITY_THRESHOLD) {
        const rangeScale = getRangeScale(minPercent, maxPercent)
        const inertia = velRef.current * INERTIA_BASE * rangeScale
        target = clampFloat(curFrac + inertia)
      }
      target = clampFloat(target)
      const snapped = clampInt(target)
      fracRef.current = snapped
      updateStrip(snapped, true)
      setBound(snapped)
      if (snapped !== percent) onChange(snapped)
      window.setTimeout(() => setAtBound(null), 260)
    }

    el.addEventListener("pointermove", onMove as unknown as EventListener)
    el.addEventListener("pointerup", onUp as unknown as EventListener)
    el.addEventListener("pointercancel", onUp as unknown as EventListener)
  }

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    e.preventDefault()
    cancelAnimationFrame(rafRef.current)
    const dir = Math.sign(e.deltaY)
    if (dir === 0) return
    const rangeScale = getRangeScale(minPercent, maxPercent)
    const absDelta = Math.abs(e.deltaY)
    let step = 1
    if (absDelta >= WHEEL_THRESHOLD) {
      // smooth proportional matching drag factor
      const extra = Math.round((absDelta / 50) * rangeScale * 1.2)
      step = Math.min(12, Math.max(1, 1 + extra))
    }
    const signed = dir > 0 ? -step : step
    const next = clampInt(fracRef.current + signed)
    fracRef.current = next
    updateStrip(next, true)
    setBound(next)
    if (next !== percent) onChange(next)
    window.setTimeout(() => setAtBound(null), 220)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    cancelAnimationFrame(rafRef.current)
    let dir: number | null = null
    if (e.key === "ArrowRight" || e.key === "ArrowUp") dir = 1
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") dir = -1
    else if (e.key === "Home") {
      e.preventDefault()
      const next = minPercent
      fracRef.current = next
      updateStrip(next, true)
      setBound(next)
      onChange(next)
      window.setTimeout(() => setAtBound(null), 220)
      return
    } else if (e.key === "End") {
      e.preventDefault()
      const next = maxPercent
      fracRef.current = next
      updateStrip(next, true)
      setBound(next)
      onChange(next)
      window.setTimeout(() => setAtBound(null), 220)
      return
    }
    if (dir == null) return
    e.preventDefault()

    // single press always 1 percent
    const next = clampInt(percent + dir)
    fracRef.current = next
    updateStrip(next, true)
    setBound(next)
    if (next !== percent) onChange(next)
    window.setTimeout(() => setAtBound(null), 220)

    // hold acceleration setup, only for arrow keys
    if (holdActiveRef.current && holdDirRef.current === dir) return
    clearHold()
    holdDirRef.current = dir
    holdStartRef.current = performance.now()
    holdActiveRef.current = true

    const tickHold = () => {
      const elapsed = performance.now() - holdStartRef.current
      if (elapsed < HOLD_DELAY_MS) return
      const rangeScale = getRangeScale(minPercent, maxPercent)
      const step = getHoldStep(elapsed, rangeScale)
      const accelerated = clampInt(fracRef.current + holdDirRef.current * step)
      if (accelerated === fracRef.current) return
      fracRef.current = accelerated
      updateStrip(accelerated, true)
      setBound(accelerated)
      onChange(accelerated)
    }

    holdTimeoutRef.current = window.setTimeout(() => {
      holdIntervalRef.current = window.setInterval(tickHold, HOLD_INTERVAL_MS)
    }, HOLD_DELAY_MS)
  }

  function handleKeyUp(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "ArrowDown") {
      clearHold()
    }
  }

  // dynamic range — was hardcoded 0..1000 so max 8000 left strip empty beyond 1000
  const tickStart = TICK_START
  const tickEnd = Math.ceil(maxPercent) + EDGE_PADDING
  const ticks: number[] = []
  for (let i = tickStart; i <= tickEnd; i++) ticks.push(i)

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Scale dial"
      aria-valuenow={percent}
      aria-valuemin={minPercent}
      aria-valuemax={maxPercent}
      aria-valuetext={`${percent}%`}
      onPointerDown={handlePointerDown}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onBlur={clearHold}
      className={`relative h-[52px] rounded-xl bg-zinc-950 border-2 overflow-hidden touch-none select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors duration-200 ${dragging ? "border-zinc-700 cursor-grabbing" : "border-zinc-800 cursor-ew-resize"} ${atBound ? "brightness-110" : ""}`}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-zinc-950 via-transparent to-zinc-950 opacity-60"
        style={
          {
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
          } as React.CSSProperties
        }
      />

      <div
        ref={stripRef}
        className="absolute inset-y-0 left-1/2 will-change-transform"
        style={{
          transform: `translate3d(${-percent * 10}px, 0, 0)`,
          width: `${(tickEnd - tickStart) * 10}px`,
          marginLeft: `${-tickStart * 10}px`,
        }}
      >
        {ticks.map((i) => {
          const isMajor = i % 10 === 0
          const isMid = i % 5 === 0
          const h = isMajor ? 18 : isMid ? 12 : 7
          const opacity = isMajor ? 0.9 : isMid ? 0.45 : 0.22
          const showLabel = isMajor && i % 25 === 0 && i >= minPercent - 25 && i <= maxPercent + 25
          return (
            <span
              key={i}
              className="absolute bottom-[14px] w-[2px] bg-white pointer-events-none"
              style={{
                left: `${i * 10}px`,
                height: `${h}px`,
                opacity,
                transform: "translateX(-1px)",
              }}
            >
              {showLabel && (
                <em className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-medium tracking-wide text-white/55 tabular-nums not-italic">
                  {i}
                </em>
              )}
            </span>
          )
        })}
        {/* red limit markers at min and max */}
        <span
          aria-hidden
          className="absolute bottom-[14px] w-[2px] bg-red-500 pointer-events-none"
          style={{ left: `${minPercent * 10}px`, height: "20px", transform: "translateX(-1px)" }}
        />
        <span
          aria-hidden
          className="absolute bottom-[14px] w-[2px] bg-red-500 pointer-events-none"
          style={{ left: `${maxPercent * 10}px`, height: "20px", transform: "translateX(-1px)" }}
        />
      </div>

      <div
        className={`absolute left-1/2 top-0 h-full w-0 -translate-x-1/2 pointer-events-none transition-transform duration-200 ${dragging ? "scale-y-[1.04]" : ""}`}
      >
        <div
          className={`h-full w-px mx-auto transition-colors duration-200 ${atBound ? "bg-white" : dragging ? "bg-white/95" : "bg-white/90"} ${atBound ? "shadow-[0_0_10px_rgba(255,255,255,0.6)]" : ""}`}
        />
        <div
          className={`absolute top-0 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-white -mt-[1px] transition-all duration-200 ${dragging ? "scale-125 shadow-[0_2px_10px_rgba(255,255,255,0.5)]" : ""} ${atBound ? "scale-150 shadow-[0_0_12px_rgba(255,255,255,0.7)]" : ""}`}
        />
        <div className="absolute bottom-[10px] left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-white/90 shadow-[0_1px_6px_rgba(0,0,0,0.6)]" />
      </div>

      <span
        className={`pointer-events-none absolute right-2 top-1.5 text-[9px] font-medium tracking-widest text-white/25 transition-opacity duration-300 ${dragging ? "opacity-0" : "opacity-100"}`}
      >
        DRAG
      </span>
    </div>
  )
}

// supporting functions

export function getRangeScale(minPercent: number, maxPercent: number): number {
  const range = maxPercent - minPercent
  if (range <= 0) return 1
  const s = range / RANGE_REF
  return Math.max(0.5, Math.min(5, s))
}

export function getWheelStep(deltaY: number, rangeScale: number): number {
  const absDelta = Math.abs(deltaY)
  if (absDelta < WHEEL_THRESHOLD) return 1
  const extra = Math.round((absDelta / 50) * rangeScale * 1.2)
  return Math.min(12, Math.max(1, 1 + extra))
}

export function computeDragNext(startFrac: number, dx: number, velocity: number, minPercent: number, maxPercent: number): number {
  let next = startFrac - dx / DRAG_DIVISOR
  if (Math.abs(velocity) >= VELOCITY_THRESHOLD) {
    const rangeScale = getRangeScale(minPercent, maxPercent)
    next += velocity * DRAG_VELOCITY_SCALE * rangeScale
  }
  return next
}

export function computeInertiaTarget(curFrac: number, velocity: number, minPercent: number, maxPercent: number): number {
  if (Math.abs(velocity) < VELOCITY_THRESHOLD) return curFrac
  const rangeScale = getRangeScale(minPercent, maxPercent)
  const raw = curFrac + velocity * INERTIA_BASE * rangeScale
  return Math.max(minPercent, Math.min(maxPercent, raw))
}

export function getHoldStep(elapsed: number, rangeScale: number): number {
  const over = Math.max(0, elapsed - HOLD_DELAY_MS)
  // ramp from 1 percent upward proportionally
  const ramp = Math.floor(over / 280)
  const base = 1 + ramp * Math.max(1, Math.round(rangeScale * 1.4))
  return Math.min(18, Math.max(1, base))
}

// types

type TickDialProps = {
  percent: number
  minPercent: number
  maxPercent: number
  onChange(next: number): void
}
