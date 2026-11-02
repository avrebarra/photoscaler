import type { ReactNode } from "react"
import { Check } from "lucide-react"
import { ChromeHeader, Dock, PillBtn } from "./chrome"

// shared tool-page shell: 72px header (back + title left, Apply pill right) + content.
// children passthrough holds the hero + dock (bodies provide Dock); props unchanged.
export function ToolPage({ title, backHref, onApply, applyDisabled, children }: ToolPageProps) {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-zinc-950">
      <ChromeHeader title={title} backHref={backHref}>
        <PillBtn label={`Apply ${title.toLowerCase()}`} onClick={onApply} disabled={applyDisabled}>
          <Check size={17} strokeWidth={2} />
          Apply
        </PillBtn>
      </ChromeHeader>

      <div className="flex flex-1 min-h-0 flex-col">{children}</div>
    </div>
  )
}

export function ToolDock({ children }: ToolDockProps) {
  return <Dock>{children}</Dock>
}

type ToolPageProps = {
  title: string
  backHref: string
  onApply: () => void
  applyDisabled?: boolean
  children: ReactNode
}

type ToolDockProps = {
  children: ReactNode
}
