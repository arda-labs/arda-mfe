import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { useDebouncedCallback } from "@workspace/ui/hooks/use-debounced-callback"
import { cn } from "@workspace/ui/lib/utils"
import {
  listIamGroups,
  listIamUsers,
  type IamPrincipalGroup,
  type IamPrincipalUser,
} from "../iam-reference-api"

const PAGE_SIZE = 10

type PrincipalType = "USER" | "GROUP"

type PrincipalPickerProps = {
  label: string
  principalType: PrincipalType
  value: string
  onChange: (principalId: string) => void
}

function userLabel(user: IamPrincipalUser) {
  const name = user.name || user.username || user.email
  return `${name} (${user.username || user.id})`
}

function groupLabel(group: IamPrincipalGroup) {
  return `${group.code} - ${group.name}`
}

export function PrincipalPicker({
  label,
  principalType,
  value,
  onChange,
}: PrincipalPickerProps) {
  const [open, setOpen] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [displayLabel, setDisplayLabel] = useState("")

  const debouncedSearch = useDebouncedCallback((next: string) => {
    setSearch(next.trim())
    setPage(1)
  }, 300)

  useEffect(() => {
    if (!open) {
      setSearchInput("")
      setSearch("")
      setPage(1)
    }
  }, [open])

  useEffect(() => {
    setDisplayLabel("")
  }, [principalType])

  const usersQuery = useQuery({
    queryKey: ["workflow", "principal-picker", "users", page, search] as const,
    queryFn: () => listIamUsers({ page, size: PAGE_SIZE, search: search || undefined }),
    enabled: open && principalType === "USER",
    placeholderData: keepPreviousData,
  })

  const groupsQuery = useQuery({
    queryKey: ["workflow", "principal-picker", "groups", page, search] as const,
    queryFn: () => listIamGroups({ page, size: PAGE_SIZE, search: search || undefined }),
    enabled: open && principalType === "GROUP",
    placeholderData: keepPreviousData,
  })

  const activeQuery = principalType === "USER" ? usersQuery : groupsQuery
  const users = usersQuery.data?.users ?? []
  const groups = groupsQuery.data?.groups ?? []
  const totalPages = Math.max(1, activeQuery.data?.totalPages ?? 1)

  useEffect(() => {
    if (!value) {
      setDisplayLabel("")
      return
    }
    if (principalType === "USER") {
      const user = users.find((item) => item.id === value)
      if (user) setDisplayLabel(userLabel(user))
      return
    }
    const group = groups.find((item) => item.id === value)
    if (group) setDisplayLabel(groupLabel(group))
  }, [groups, principalType, users, value])

  const buttonText = useMemo(() => {
    if (displayLabel) return displayLabel
    if (value) return value
    return principalType === "USER" ? "Chọn người dùng" : "Chọn nhóm"
  }, [displayLabel, principalType, value])

  const selectUser = (user: IamPrincipalUser) => {
    onChange(user.id)
    setDisplayLabel(userLabel(user))
    setOpen(false)
  }

  const selectGroup = (group: IamPrincipalGroup) => {
    onChange(group.id)
    setDisplayLabel(groupLabel(group))
    setOpen(false)
  }

  return (
    <label className="grid gap-1 text-sm">
      <span className="text-xs font-medium text-foreground/80">{label}</span>
      <Button
        type="button"
        variant="outline"
        className="justify-between font-normal"
        onClick={() => setOpen(true)}
      >
        <span className="truncate">{buttonText}</span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="z-[260] flex max-h-[85vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4">
              <DialogTitle>
                {principalType === "USER" ? "Chọn người dùng" : "Chọn nhóm"}
              </DialogTitle>
              <DialogDescription>
                Chọn một {principalType === "USER" ? "user" : "group"} từ IAM để gán
                membership.
              </DialogDescription>
            </DialogHeader>

            <div className="border-b px-6 py-3">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(event) => {
                    const next = event.target.value
                    setSearchInput(next)
                    debouncedSearch(next)
                  }}
                  placeholder={
                    principalType === "USER"
                      ? "Tìm theo tên, username, email..."
                      : "Tìm theo mã hoặc tên nhóm..."
                  }
                  className="pl-9"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">
              {activeQuery.isLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <Spinner className="size-4" />
                  Đang tải...
                </div>
              ) : principalType === "USER" ? (
                users.length === 0 ? (
                  <div className="py-10 text-sm text-muted-foreground">
                    Không có người dùng phù hợp.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10" />
                        <TableHead>Username</TableHead>
                        <TableHead>Tên</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Trạng thái</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow
                          key={user.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => selectUser(user)}
                        >
                          <TableCell>
                            <Check
                              className={cn(
                                "size-4",
                                value === user.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {user.username || "-"}
                          </TableCell>
                          <TableCell>{user.name || "-"}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.email || "-"}
                          </TableCell>
                          <TableCell>{user.status || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )
              ) : groups.length === 0 ? (
                <div className="py-10 text-sm text-muted-foreground">
                  Không có nhóm phù hợp.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>Mã</TableHead>
                      <TableHead>Tên nhóm</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.map((group) => (
                      <TableRow
                        key={group.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => selectGroup(group)}
                      >
                        <TableCell>
                          <Check
                            className={cn(
                              "size-4",
                              value === group.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{group.code}</TableCell>
                        <TableCell>{group.name}</TableCell>
                        <TableCell>{group.status || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="flex items-center justify-between border-t px-6 py-3 text-sm">
              <span className="text-muted-foreground">
                Trang {page}/{totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || activeQuery.isFetching}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Trước
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || activeQuery.isFetching}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  Sau
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                  Đóng
                </Button>
              </div>
            </div>
        </DialogContent>
      </Dialog>
    </label>
  )
}
