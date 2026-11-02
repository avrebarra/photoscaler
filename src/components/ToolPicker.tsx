import { Crop, Scaling } from "lucide-react"

export function ToolPicker({ onSelect }: { onSelect: (tool: "crop" | "resize") => void }) {
  return (
    <div className="w-fit mx-auto flex items-center gap-3">
      <button
        type="button"
        aria-label="Crop"
        onClick={() => onSelect("crop")}
        className="h-12 w-12 rounded-full grid place-items-center bg-white text-black transition active:scale-95"
      >
        <Crop size={20} strokeWidth={1.8} />
      </button>
      <button
        type="button"
        aria-label="Resize"
        onClick={() => onSelect("resize")}
        className="h-12 w-12 rounded-full grid place-items-center bg-white/10 text-zinc-300 transition hover:bg-white/15 active:scale-95"
      >
        <Scaling size={20} strokeWidth={1.8} />
      </button>
    </div>
  )
}
