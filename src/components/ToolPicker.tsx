export function ToolPicker({ onSelect }: { onSelect: (tool: "crop" | "resize") => void }) {
  return (
    <nav className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3 flex flex-col gap-2">
      <p className="text-xs font-medium text-zinc-500">Tools</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSelect("crop")}
          className="flex-1 rounded-full bg-zinc-800 py-3 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors"
        >
          Crop
        </button>
        <button
          type="button"
          onClick={() => onSelect("resize")}
          className="flex-1 rounded-full bg-zinc-800 py-3 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors"
        >
          Resize
        </button>
      </div>
    </nav>
  )
}
