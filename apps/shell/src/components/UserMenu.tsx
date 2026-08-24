import { useState } from "react"
import {
  Info,
  LayoutDashboard,
  LogOut,
  Palette,
  Settings,
} from "lucide-react"
import type { MessageKey } from "@workspace/i18n"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

export function UserMenu({
  initials,
  userName,
  email,
  picture,
  username,
  onLogout,
  navigate,
  t,
}: {
  initials: string
  userName: string
  email: string
  picture: string
  username: string
  onLogout: () => void
  navigate: (pathname: string) => void
  t: (key: MessageKey) => string
}) {
  const [statusOpen, setStatusOpen] = useState(false)
  const [userStatus, setUserStatus] = useState("active")
  const [customStatusText, setCustomStatusText] = useState("")

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <Avatar className="size-8 cursor-pointer">
              <AvatarImage
                src={picture}
                alt={userName || email || "User"}
                className="object-cover"
              />
              <AvatarFallback className="bg-primary/10 text-xs text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-64">
          <DropdownMenuItem
            onClick={() => navigate(`/in/${username}`)}
            className="cursor-pointer px-2 py-2 focus:bg-accent/50"
          >
            <div className="flex w-full min-w-0 items-center gap-3">
              <Avatar className="size-9">
                <AvatarImage
                  src={picture}
                  alt={userName || email || "User"}
                  className="object-cover"
                />
                <AvatarFallback className="bg-primary/10 text-xs text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {userName || email || "User"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {email}
                </p>
              </div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setStatusOpen(true)}>
            <LayoutDashboard className="size-4" />
            <span>{t("user.menu.set_status")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/my-account/profile")}>
            <Settings className="size-4" />
            <span>{t("user.menu.settings")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/settings/appearance")}>
            <Palette className="size-4" />
            <span>{t("nav.settings.appearance")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Info className="size-4" />
            <span>{t("user.menu.help_support")}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onLogout}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="size-4" />
            {t("common.action.logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("user.menu.set_status")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Quick Status
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "active", label: "Active", color: "bg-success" },
                  { value: "away", label: "Away", color: "bg-warning" },
                  { value: "busy", label: "Busy", color: "bg-destructive" },
                ].map((status) => (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => setUserStatus(status.value)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md border p-2 text-xs font-medium transition-colors hover:bg-muted",
                      userStatus === status.value
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    )}
                  >
                    <span className={cn("size-2 rounded-full", status.color)} />
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Custom Message
              </span>
              <Input
                placeholder="What's happening?"
                value={customStatusText}
                onChange={(event) => setCustomStatusText(event.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusOpen(false)}
              >
                {t("common.action.cancel")}
              </Button>
              <Button size="sm" onClick={() => setStatusOpen(false)}>
                {t("common.action.done")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
