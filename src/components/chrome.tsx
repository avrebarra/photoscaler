import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { Check, ArrowLeft, Undo2, RotateCcw, Download } from "lucide-react"

export { Check, ArrowLeft, Undo2, RotateCcw, Download }

/* wordmark — app text logo */
export function Wordmark({ big }: { big?: boolean }) {
  return (
    <span
      className={`font-bold tracking-[-.02em] leading-none text-white ${big ? "text-[26px]" : "text-[19px]"}`}
    >
      Photoscaler
    </span>
  )
}

export function BigWordmark() {
  return (
    <h1 className="text-[40px] font-bold tracking-[-.02em] leading-none text-white">Photoscaler</h1>
  )
}

/* header — 72px dock bar */
export function ChromeHeader({
  wordmark,
  title,
  onBack,
  backHref,
  children,
}: {
  wordmark?: boolean
  title?: string
  onBack?: string
  backHref?: string
  children?: ReactNode
}) {
  const left =
    onBack || backHref ? (
      <div className="flex items-center gap-1 -ml-1.5">
        {backHref ? (
          <Link
            to={backHref}
            aria-label="Back"
            className="h-10 w-10 rounded-full grid place-items-center text-white active:bg-white/10 transition"
          >
            <ArrowLeft size={17} strokeWidth={1.8} />
          </Link>
        ) : null}
        {title ? (
          <span className="text-[17px] font-bold tracking-[-.02em] leading-none text-white">
            {title}
          </span>
        ) : null}
      </div>
    ) : (
      <Wordmark big={wordmark} />
    )

  return (
    <div className="flex items-center justify-between h-[72px] px-6 shrink-0 border-b border-white/[0.08] bg-[rgba(9,9,11,0.86)] backdrop-blur-[22px]">
      {left}
      <div className="flex items-center gap-1">{children}</div>
    </div>
  )
}

/* ghost icon button */
export function BarBtn({
  label,
  children,
  onClick,
  disabled,
  dim,
}: {
  label: string
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  dim?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`h-11 w-11 rounded-full grid place-items-center text-zinc-300 active:bg-white/10 transition shrink-0 ${dim ? "opacity-30" : ""} disabled:opacity-30`}
    >
      {children}
    </button>
  )
}

/* primary pill — icon + text */
export function PillBtn({
  label,
  onClick,
  children,
  disabled,
}: {
  label: string
  onClick?: () => void
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="h-10 pl-2.5 pr-3.5 rounded-full bg-white text-black font-semibold text-[14px] flex items-center gap-1.5 active:scale-[0.98] transition shadow-[0_2px_10px_rgba(0,0,0,.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-40 disabled:active:scale-100 shrink-0"
    >
      {children}
    </button>
  )
}

/* dock — sticky bottom blurred bar */
export function Dock({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`shrink-0 border-t border-white/[0.08] bg-[rgba(9,9,11,0.86)] backdrop-blur-[22px] px-6 pt-4 pb-7 flex flex-col gap-3.5 ${className ?? ""}`}
    >
      {children}
    </div>
  )
}

/* letterboxed hero — blurred cover backdrop + object-contain foreground */
export function LetterboxHero({
  src,
  alt,
  overlay,
  className,
}: {
  src?: string | null
  alt?: string
  overlay?: ReactNode
  className?: string
}) {
  return (
    <div className={`relative rounded-[18px] overflow-hidden bg-black ${className ?? ""}`}>
      {src ? (
        <>
          {/* slate underlay keeps dark sources readable instead of black voids */}
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-700/40 via-zinc-800/30 to-zinc-900/30" />
          <img
            src={src}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover blur-2xl scale-110 opacity-40"
          />
          <img src={src} alt={alt ?? "preview"} className="absolute inset-0 h-full w-full object-contain" />
        </>
      ) : null}
      {overlay}
    </div>
  )
}

/* skeleton shimmer + spinner primitives for transient states */
export function Spinner() {
  return (
    <div
      className="w-11 h-11 rounded-full border-[3px] border-white/20 border-t-white"
      style={{ animation: "spin .9s linear infinite" }}
    />
  )
}

export function SkeletonOverlay() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(90deg, rgba(255,255,255,.04) 25%, rgba(255,255,255,.10) 37%, rgba(255,255,255,.04) 63%)",
        backgroundSize: "400px 100%",
        animation: "shimmer 1.4s linear infinite",
      }}
    />
  )
}
