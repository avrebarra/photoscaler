import type { ReactNode } from "react"
import { Link } from "react-router-dom"

// shared tool-page shell: back header + title + tool body + apply footer.
// backHref is path-based — deep links can never eject the app.
export function ToolPage({
  title,
  backHref,
  onApply,
  applyDisabled,
  children,
}: {
  title: string
  backHref: string
  onApply: () => void
  applyDisabled?: boolean
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link
          to={backHref}
          className="rounded-full bg-zinc-800 px-4 py-1.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-colors no-underline"
        >
          ← Back
        </Link>
        <h2 className="text-sm font-bold text-white">{title}</h2>
        <div className="w-16" />
      </div>

      {children}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onApply}
          disabled={applyDisabled}
          className="flex-1 rounded-full bg-white py-3 text-base font-semibold text-black hover:bg-zinc-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Apply
        </button>
      </div>
    </section>
  )
}
