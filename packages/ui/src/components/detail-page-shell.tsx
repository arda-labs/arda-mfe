import { useEffect, useState, type ReactNode } from "react"
import { ArrowLeft } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export type DetailSectionNavItem = { id: string; label: string }

type DetailPageShellProps = {
  title: string
  /** Secondary line under the title (code, owner, last update...). */
  subtitle?: ReactNode
  /** Status badge(s) shown next to the title. */
  badges?: ReactNode
  /** Back-to-list control; the page owns navigation (router-agnostic). */
  backLabel?: string
  onBack?: () => void
  /** Header actions (Edit, "More" menu...). */
  actions?: ReactNode
  /** Sections listed in the left navigation (shown from `xl` up). */
  sections?: DetailSectionNavItem[]
  /** Sticky action bar, normally a `DetailFooterBar`. */
  footer?: ReactNode
  /** Accessible label for the section navigation. */
  sectionNavLabel?: string
  children: ReactNode
}

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0] ?? "")
  const key = ids.join("|")

  useEffect(() => {
    const list = key ? key.split("|") : []
    if (list.length === 0 || typeof IntersectionObserver === "undefined") return
    const visible = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }
        const first = list.find((id) => visible.has(id))
        if (first) setActive(first)
      },
      { rootMargin: "-80px 0px -60% 0px" }
    )
    for (const id of list) {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [key])

  return active
}

/**
 * Standard layout for a record detail page (view, edit and create modes):
 * header with back link/status/actions, optional section navigation, a
 * scrolling body capped for wide monitors, and a sticky footer for actions.
 */
export function DetailPageShell({
  title,
  subtitle,
  badges,
  backLabel,
  onBack,
  actions,
  sections = [],
  footer,
  sectionNavLabel,
  children,
}: DetailPageShellProps) {
  const active = useActiveSection(sections.map((section) => section.id))

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b bg-background px-4 py-3 sm:px-6">
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 mb-1 h-7 gap-1 px-2 text-xs text-muted-foreground"
            onClick={onBack}
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            {backLabel}
          </Button>
        ) : null}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1 border-l-2 border-brand-accent/80 pl-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-[-0.01em]">
                {title}
              </h1>
              {badges}
            </div>
            {subtitle ? (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-y-auto">
        <div
          className={cn(
            "mx-auto flex w-full gap-8 px-4 py-5 sm:px-6",
            sections.length === 0 ? "max-w-4xl" : "max-w-6xl"
          )}
        >
          {sections.length > 0 ? (
            <nav
              aria-label={sectionNavLabel}
              className="sticky top-0 hidden h-fit w-44 shrink-0 xl:block"
            >
              <ul className="space-y-0.5 border-l">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      onClick={(event) => {
                        event.preventDefault()
                        document
                          .getElementById(section.id)
                          ?.scrollIntoView({ behavior: "smooth", block: "start" })
                      }}
                      aria-current={active === section.id ? "true" : undefined}
                      className={cn(
                        "-ml-px block border-l-2 px-3 py-1.5 text-sm transition-colors",
                        active === section.id
                          ? "border-primary font-medium text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {section.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
          <div className="min-w-0 flex-1 space-y-5">{children}</div>
        </div>
      </div>

      {footer}
    </div>
  )
}
