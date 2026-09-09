import { useI18n } from "@workspace/i18n"
import { PostingTabsShell } from "@workspace/posting-flow/posting-flow-shell"
import { ADJUSTMENT_KIND_SPECS } from "./kind-spec"
import { AdjustmentInfoTab } from "./components/info-tab"
import { AdjustmentListTab } from "./components/list-tab"

const KIND_PREFIX = "/loans/adjustments/"

/**
 * Màn điều chỉnh per-kind (route /loans/adjustments/{kind}) — mirror batch
 * screens trên PostingTabsShell: tab 1 thông tin điều chỉnh (form theo kind),
 * tab 2 danh sách điều chỉnh của kind này (server list + Trình duyệt DRAFT).
 * Remote routes là prefix-matching (không có Route element) nên kind đọc từ
 * path segment cuối.
 */
export function AdjustmentKindPage({ pathname }: { pathname: string }) {
  const { t } = useI18n()
  const kind = pathname.startsWith(KIND_PREFIX)
    ? pathname.slice(KIND_PREFIX.length).split("/")[0]
    : ""
  const spec = ADJUSTMENT_KIND_SPECS[kind as keyof typeof ADJUSTMENT_KIND_SPECS]

  if (!spec) {
    return (
      <section className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 items-center justify-center p-4">
          <p className="text-sm text-muted-foreground">
            {t("loan.adjustment_screen.unknown_kind", { kind })}
          </p>
        </div>
      </section>
    )
  }

  const kindLabel = t(spec.labelKey)

  return (
    <PostingTabsShell
      labels={{
        title: kindLabel,
        description: t(spec.descriptionKey),
      }}
      meta={
        <span className="font-mono text-xs text-muted-foreground">{spec.kind}</span>
      }
      tabs={[
        {
          id: "adjustment-info",
          label: t("loan.adjustment_screen.tab_info"),
          content: <AdjustmentInfoTab kind={spec.kind} />,
        },
        {
          id: "adjustment-list",
          label: t("loan.adjustment_screen.tab_list", { kind: kindLabel }),
          content: <AdjustmentListTab kind={spec.kind} />,
        },
      ]}
    />
  )
}
