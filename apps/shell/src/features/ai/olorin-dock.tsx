import { useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { OlorinPanel, OlorinProvider } from "@workspace/ai"
import { Button } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { Sparkles } from "lucide-react"

export function OlorinDock() {
  const [open, setOpen] = useState(false)
  const { t } = useI18n()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "j") {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <>
      <Button
        type="button"
        size="icon"
        aria-label={t("ai.panel.open")}
        title={`${t("ai.panel.open")} · ${t("ai.panel.shortcut_hint")}`}
        onClick={() => setOpen(true)}
        className="fixed right-5 bottom-5 z-40 size-12 rounded-full shadow-lg"
      >
        <Sparkles className="size-5" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-[460px]"
        >
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle>{t("ai.name")}</SheetTitle>
            <SheetDescription>{t("ai.tagline")}</SheetDescription>
          </SheetHeader>
          <OlorinProvider>
            <OlorinPanel className="min-h-0 flex-1" />
          </OlorinProvider>
        </SheetContent>
      </Sheet>
    </>
  )
}
