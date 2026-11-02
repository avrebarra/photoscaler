export function buildDownloadName(name: string, date: Date): string {
  const base = name.replace(/\.[^.]+$/, "") || "image"
  const ext = name.match(/\.([^.]+)$/)?.[1] ?? "png"
  const pad = (n: number) => String(n).padStart(2, "0")
  const timestamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `${base}-${timestamp}.${ext}`
}
