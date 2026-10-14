import { useRef } from "react"
import { Camera } from "lucide-react"
import { Button } from "@workspace/ui/components/button"

export function ImagePicker({
  label,
  url,
  onPick,
  pickLabel,
  changeLabel,
  disabled,
}: {
  label: string
  url?: string
  onPick: (file: File) => void
  pickLabel: string
  changeLabel: string
  disabled?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex aspect-[1.58] items-center justify-center overflow-hidden rounded-md border bg-muted">
        {url ? <img src={url} alt={label} className="h-full w-full object-contain" /> : <Camera className="size-8 text-muted-foreground" />}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onPick(file)
          e.target.value = ""
        }}
      />
      <Button type="button" variant="outline" size="sm" className="w-full" disabled={disabled} onClick={() => input.current?.click()}>
        {url ? changeLabel : pickLabel}
      </Button>
    </div>
  )
}
