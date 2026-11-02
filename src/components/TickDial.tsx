// tick dial — polished drag: fractional tracking, inertia, rubber-band, needle feedback
// ponytail: no deps, CSS ticks + transform, just enough animation to feel native

import { useEffect, useRef, useState } from "react"

type Props = {
  percent: number
  minPercent: number
  maxPercent: number
  onChange(next: number): void
}

export function TickDial({ percent, minPercent, maxPercent, onChange }: Props) {
  const clampInt = (v: number) => Math.round(Math.max(minPercent, Math.min(maxPercent, v)))
  const clampFloat = (v: number) => Math.max(minPercent, Math.min(maxPercent, v))

  const [dragging, setDragging] = useState(false)
  const [atBound, setAtBound] = useState<null | "min" | "max">(null)

  // fractional visual position — smooth, not stepped
  const fracRef = useRef(percent)
  const stripRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const velRef = useRef(0)
  const lastXRef = useRef(0)
  const lastTRef = useRef(0)

  // keep frac in sync when percent changes externally (keys/wheel/props)
  useEffect(() => {
    fracRef.current = percent
    updateStrip(percent, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percent])

  function updateStrip(frac: number, animate: boolean) {
    const el = stripRef.current
    if (!el) return
    // 10px per 1%
    const x = -frac * 10
    el.style.transition = animate ? "transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)" : "none"
    el.style.transform = `translate3d(${x}px, 0, 0)`
    // tick opacity/height parallax near center
    // we drive via CSS variable so ticks can scale
    el.style.setProperty("--frac", String(frac))
  }

  function setBound(next: number) {
    if (next <= minPercent) setAtBound("min")
    else if (next >= maxPercent) setAtBound("max")
    else setAtBound(null)
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
      // 3px per 1% → slower than tick spacing so drag feels weighted
      let next = startFrac - dx / 3
      // rubber-band beyond bounds
      if (next < minPercent) {
        const over = minPercent - next
        next = minPercent - Math.pow(over, 0.72) * 0.5
      } else if (next > maxPercent) {
        const over = next - maxPercent
        next = maxPercent + Math.pow(over, 0.72) * 0.5
      }
      curFrac = next
      fracRef.current = next
      // velocity for inertia
      const dt = Math.max(1, now - lastTRef.current)
      const instVel = (ev.clientX - lastXRef.current) / dt // px/ms
      velRef.current = instVel * -0.33 // convert to %/ms (px/3)
      lastXRef.current = ev.clientX
      lastTRef.current = now

      updateStrip(next, false)
      const intNext = clampInt(next)
      setBound(intNext)
      if (intNext !== percent) onChange(intNext)
    }

    const onUp = (ev: PointerEvent) => {
      try { el.releasePointerCapture(ev.pointerId) } catch {}
      el.removeEventListener("pointermove", onMove as unknown as EventListener)
      el.removeEventListener("pointerup", onUp as unknown as EventListener)
      el.removeEventListener("pointercancel", onUp as unknown as EventListener)
      setDragging(false)

      // snap + inertia: project target by velocity, then spring back if out-of-bounds
      let target = clampFloat(curFrac + velRef.current * 90)
      // if flung beyond bounds, spring back to clamp
      target = clampFloat(target)
      const snapped = clampInt(target)
      fracRef.current = snapped
      updateStrip(snapped, true)
      setBound(snapped)
      if (snapped !== percent) onChange(snapped)
      // clear bound highlight after snap settles
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
    const step = dir > 0 ? -1 : dir < 0 ? 1 : 0
    if (step === 0) return
    const next = clampInt(fracRef.current + step)
    fracRef.current = next
    updateStrip(next, true)
    setBound(next)
    onChange(next)
    window.setTimeout(() => setAtBound(null), 220)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    cancelAnimationFrame(rafRef.current)
    let next: number | null = null
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = clampInt(percent + 1)
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = clampInt(percent - 1)
    else if (e.key === "Home") next = minPercent
    else if (e.key === "End") next = maxPercent
    if (next == null) return
    e.preventDefault()
    fracRef.current = next
    updateStrip(next, true)
    setBound(next)
    onChange(next)
    window.setTimeout(() => setAtBound(null), 220)
  }

  // build tick labels every 25% + majors every 5%
  const TICK_START = 0
  const TICK_END = 1000 // cover up to 1000% so any maxPercent fits
  const ticks: number[] = []
  for (let i = TICK_START; i <= TICK_END; i++) ticks.push(i)

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
      className={`relative h-[52px] rounded-xl bg-zinc-950 border overflow-hidden touch-none select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors duration-200 ${dragging ? "border-zinc-700 cursor-grabbing" : "border-zinc-800 cursor-ew-resize"} ${atBound ? "brightness-110" : ""}`}
    >
      {/* edge fade */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-zinc-950 via-transparent to-zinc-950 opacity-60" style={{ WebkitMaskImage: "linear-gradient(to right, transparent, black 12%, black 88%, transparent)" } as React.CSSProperties} />

      {/* moving strip — GPU transform */}
      <div
        ref={stripRef}
        className="absolute inset-y-0 left-1/2 will-change-transform"
        style={{ transform: `translate3d(${-percent * 10}px, 0, 0)`, width: `${(TICK_END - TICK_START) * 10}px`, marginLeft: `${-TICK_START * 10}px` }}
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
              className="absolute bottom-[14px] w-px bg-white pointer-events-none"
              style={{
                left: `${i * 10}px`,
                height: `${h}px`,
                opacity,
                transform: "translateX(-0.5px)",
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
      </div>

      {/* center needle — scales on drag + pulses at bounds */}
      <div className={`absolute left-1/2 top-0 h-full w-0 -translate-x-1/2 pointer-events-none transition-transform duration-200 ${dragging ? "scale-y-[1.04]" : ""}`}>
        <div className={`h-full w-px mx-auto transition-colors duration-200 ${atBound ? "bg-white" : dragging ? "bg-white/95" : "bg-white/90"} ${atBound ? "shadow-[0_0_10px_rgba(255,255,255,0.6)]" : ""}`} />
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-white -mt-[1px] transition-all duration-200 ${dragging ? "scale-125 shadow-[0_2px_10px_rgba(255,255,255,0.5)]" : ""} ${atBound ? "scale-150 shadow-[0_0_12px_rgba(255,255,255,0.7)]" : ""}`} />
        <div className="absolute bottom-[10px] left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-white/90 shadow-[0_1px_6px_rgba(0,0,0,0.6)]" />
      </div>

      {/* drag hint — fades when dragging */}
      <span className={`pointer-events-none absolute right-2 top-1.5 text-[9px] font-medium tracking-widest text-white/25 transition-opacity duration-300 ${dragging ? "opacity-0" : "opacity-100"}`}>DRAG</span>
    </div>
  )
}
