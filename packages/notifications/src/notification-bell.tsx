import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Bell, CheckCheck } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { cn } from "@workspace/ui/lib/utils"
import { notificationsApi } from "./api"
import {
  browserNotificationsSupported,
  getBrowserNotificationPermission,
  isBrowserNotificationPreferred,
  requestBrowserNotificationPermission,
  setBrowserNotificationPreferred,
} from "./browser-notification"
import { useNotificationsStore } from "./store"
import type { NotificationItem } from "./types"

export function NotificationBell() {
  const { t } = useTranslation("notifications")
  const [open, setOpen] = useState(false)
  const [browserPermission, setBrowserPermission] = useState(
    getBrowserNotificationPermission
  )
  const [browserPreferred, setBrowserPreferred] = useState(
    isBrowserNotificationPreferred
  )
  const { notifications, unreadCount, setNotifications, markAllRead } =
    useNotificationsStore()

  useEffect(() => {
    if (!open) return
    setBrowserPermission(getBrowserNotificationPermission())
    setBrowserPreferred(isBrowserNotificationPreferred())
  }, [open])

  const loadNotifications = () => {
    notificationsApi
      .list()
      .then((res) => setNotifications(res.notifications))
      .catch(() => {})
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) loadNotifications()
  }

  const handleMarkAllRead = () => {
    markAllRead()
    notificationsApi.markAllRead().catch(loadNotifications)
  }

  const handleEnableBrowser = async () => {
    const result = await requestBrowserNotificationPermission()
    setBrowserPermission(result)
    setBrowserPreferred(isBrowserNotificationPreferred())
  }

  const handleDisableBrowser = () => {
    setBrowserNotificationPreferred(false)
    setBrowserPreferred(false)
  }

  const showBrowserPrompt =
    browserNotificationsSupported() &&
    browserPermission !== "denied" &&
    !(browserPermission === "granted" && browserPreferred)

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title={t("open")}
          className="relative size-8"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-medium leading-none text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-96 p-0">
        <div className="flex h-11 items-center justify-between border-b px-3">
          <p className="text-sm font-semibold">{t("title")}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="h-8 gap-1.5 px-2 text-xs"
          >
            <CheckCheck className="size-3.5" />
            {t("mark_all_read")}
          </Button>
        </div>
        {showBrowserPrompt ? (
          <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
            <p className="min-w-0 flex-1 text-xs text-muted-foreground">
              Nhận thông báo hệ thống khi đang ở tab khác
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 shrink-0 text-xs"
              onClick={() => void handleEnableBrowser()}
            >
              {t("browser.enable")}
            </Button>
          </div>
        ) : null}
        {browserPermission === "granted" && browserPreferred ? (
          <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
            <p className="text-xs text-muted-foreground">{t("browser.enabled")}</p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 shrink-0 text-xs"
              onClick={handleDisableBrowser}
            >
              Tắt
            </Button>
          </div>
        ) : null}
        {browserPermission === "denied" ? (
          <div className="border-b px-3 py-2 text-xs text-muted-foreground">
            {t("browser.denied")}
          </div>
        ) : null}
        {notifications.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            {t("empty")}
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="p-1">
              {notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  close={() => setOpen(false)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  )
}

function NotificationRow({
  notification,
  close,
}: {
  notification: NotificationItem
  close: () => void
}) {
  const { t } = useTranslation("notifications")
  const markRead = useNotificationsStore((state) => state.markRead)
  const unread = !notification.readAt
  const params = notification.params ?? {}
  const title = notification.titleKey
    ? t(notification.titleKey, params)
    : notification.title
  const body = notification.bodyKey
    ? t(notification.bodyKey, params)
    : notification.body

  const handleClick = () => {
    if (unread) {
      markRead(notification.id)
      notificationsApi.markRead(notification.id).catch(() => {})
    }
    if (notification.href) {
      close()
      window.location.assign(notification.href)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex w-full gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted",
        unread && "bg-primary/5"
      )}
    >
      <span
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          unread ? "bg-primary" : "bg-transparent"
        )}
      />
      <span className="min-w-0 flex-1 space-y-1">
        <span className="block truncate font-medium">{title}</span>
        {body && (
          <span className="line-clamp-2 block text-xs text-muted-foreground">
            {body}
          </span>
        )}
        <span className="block text-[11px] text-muted-foreground">
          {formatNotificationTime(notification.createdAt)}
        </span>
      </span>
    </button>
  )
}

function formatNotificationTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date)
}
