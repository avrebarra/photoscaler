import type { ReactNode } from "react"

export function Chip({ active, onClick, children }: ChipProps) {
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

export function PrimaryButton({ onClick, disabled, children }: PrimaryButtonProps) {
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

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col">
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative mt-auto mx-2 mb-2 rounded-[24px] border border-white/[0.08] bg-[rgba(9,9,11,0.96)] backdrop-blur-[22px] px-5 pt-4 pb-5 flex flex-col gap-4 shadow-[0_20px_50px_rgba(0,0,0,.5)]"
      >
        <div className="flex flex-col gap-1">
          <span className="text-[14.5px] font-semibold text-white">{title}</span>
          <span className="text-[13px] text-zinc-400">{body}</span>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            aria-label={cancelLabel}
            onClick={onCancel}
            className="flex-1 h-11 rounded-full bg-white/10 text-white text-[14px] font-semibold active:bg-white/15 transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            aria-label={confirmLabel}
            onClick={onConfirm}
            className="flex-1 h-11 rounded-full bg-white text-black text-[14px] font-semibold active:scale-[0.98] transition"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

type ChipProps = {
  active: boolean
  onClick: () => void
  children: ReactNode
}

type PrimaryButtonProps = {
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}

type ConfirmDialogProps = {
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}
