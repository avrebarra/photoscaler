import type { ReactNode } from "react"

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-[0.98] ${
        active
          ? "bg-white text-black shadow-[0_2px_8px_rgba(0,0,0,0.5),0_1px_2px_rgba(0,0,0,0.4)] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.35),inset_0_1px_2px_rgba(0,0,0,0.2)]"
          : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 shadow-[0_1px_4px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)] active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]"
      }`}
    >
      {children}
    </button>
  )
}

export function PrimaryButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-full py-3 text-base font-semibold transition-all active:scale-[0.98] ${
        disabled
          ? "bg-white text-black opacity-40 cursor-not-allowed shadow-none"
          : "bg-white text-black hover:bg-zinc-100 shadow-[0_3px_12px_rgba(0,0,0,0.5),0_1px_3px_rgba(0,0,0,0.4)] active:shadow-[inset_0_2px_6px_rgba(0,0,0,0.25),inset_0_1px_2px_rgba(0,0,0,0.2)]"
      }`}
    >
      {children}
    </button>
  )
}
