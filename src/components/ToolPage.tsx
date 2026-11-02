import type { ReactNode } from "react"
import { Check } from "lucide-react"
import { ChromeHeader, Dock, PillBtn } from "./chrome"

// shared tool-page shell: 72px header (back + title left, Apply pill right) + content + docked controls zone.
// props unchanged — children passthrough holds Crop/Resize bodies.
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
    <div className="flex flex-col min-h-[100dvh] bg-zinc-950">
      <ChromeHeader title={title} backHref={backHref}>
        <PillBtn label={`Apply ${title.toLowerCase()}`} onClick={onApply} disabled={applyDisabled}>
          <Check size={17} strokeWidth={2} />
          Apply
        </PillBtn>
      </ChromeHeader>

      <div className="flex-1 min-h-0 flex flex-col px-6 pt-4 pb-2">{children}</div>

      {/* bottom dock chrome — controls live in children (Crop/Resize bodies are read-only),
          dock provides the blurred hairline + home indicator per spec */}
      <div className="shrink-0 border-t border-white/[0.08] bg-[rgba(9,9,11,0.86)] backdrop-blur-[22px] px-6 pt-3 pb-7 flex flex-col items-center">
        <div className="h-[5px] w-[110px] rounded-full bg-white/25" />
      </div>
    </div>
  )
}

/* helper for tool bodies to wrap their controls in the dock look */
export function ToolDock({ children }: { children: ReactNode }) {
  return <Dock>{children}</Dock>
}
