import { Crop, Scaling } from "lucide-react"

export function ToolPicker({ onSelect }: { onSelect: (tool: "crop" | "resize") => void }) {
  return (
    <div className="mx-auto flex items-center gap-1 rounded-full bg-white/10 p-1">
      <button
        type="button"
        aria-label="Crop"
        onClick={() => onSelect("crop")}
        className="h-11 px-8 rounded-full grid place-items-center bg-white text-black transition active:scale-[0.98]"
      >
        <Crop size={19} strokeWidth={1.8} />
      </button>
      <button
        type="button"
        aria-label="Resize"
        onClick={() => onSelect("resize")}
        className="h-11 px-8 rounded-full grid place-items-center text-zinc-300 transition active:scale-[0.98] hover:bg-white/10"
      >
        <Scaling size={19} strokeWidth={1.8} />
      </button>
    </div>
  )
}
