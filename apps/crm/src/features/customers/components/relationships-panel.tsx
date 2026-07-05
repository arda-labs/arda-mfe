import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import type { Customer } from "../api"
import {
  useCreateCustomerRelationship,
  useCustomerRelationships,
  useCustomers,
} from "../queries"
import {
  relationshipSchema,
  selectOptions,
  type RelationshipFormValues,
} from "../shared/schemas"
import { relationLabel } from "../shared/form-utils"
import { EmptyTable, Panel } from "../shared/ui"

export function RelationshipsPanel({ customer }: { customer: Customer }) {
  const relationshipsQuery = useCustomerRelationships(customer.id)
  const approvedCustomersQuery = useCustomers({ status: "ACTIVE" })
  const createRelationship = useCreateCustomerRelationship(customer.id)
  const candidates = (approvedCustomersQuery.data ?? []).filter(
    (item) => item.id !== customer.id
  )
  const form = useForm<RelationshipFormValues>({
    resolver: zodResolver(relationshipSchema),
    defaultValues: {
      relatedCustomerId: "",
      relationType: "",
      relationCode: "",
      reciprocalRelationCode: "",
      status: "ACTIVE",
    },
  })

  const submit = form.handleSubmit(async (values) => {
    await createRelationship.mutateAsync(values)
    form.reset({
      relatedCustomerId: "",
      relationType: "",
      relationCode: "",
      reciprocalRelationCode: "",
      status: "ACTIVE",
    })
  })

  return (
    <Panel title="Người có liên quan">
      <form
        className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5"
        onSubmit={submit}
      >
        <FormField
          label="Mã khách hàng(*)"
          error={form.formState.errors.relatedCustomerId?.message}
        >
          <Controller
            control={form.control}
            name="relatedCustomerId"
            render={({ field }) => (
              <Select
                value={field.value || "none"}
                onValueChange={(value) =>
                  field.onChange(value === "none" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn khách hàng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Chọn khách hàng --</SelectItem>
                  {candidates.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.customerCode || item.id} - {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <FormField
          label="Loại quan hệ(*)"
          error={form.formState.errors.relationType?.message}
        >
          <Input {...form.register("relationType")} />
        </FormField>
        <FormField
          label="Mã quan hệ(*)"
          error={form.formState.errors.relationCode?.message}
        >
          <Controller
            control={form.control}
            name="relationCode"
            render={({ field }) => (
              <RelationSelect value={field.value} onChange={field.onChange} />
            )}
          />
        </FormField>
        <FormField
          label="Mã QH đối ứng(*)"
          error={form.formState.errors.reciprocalRelationCode?.message}
        >
          <Controller
            control={form.control}
            name="reciprocalRelationCode"
            render={({ field }) => (
              <RelationSelect value={field.value} onChange={field.onChange} />
            )}
          />
        </FormField>
        <FormField
          label="Trạng thái quan he(*)"
          error={form.formState.errors.status?.message}
        >
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectOptions.status.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <div className="md:col-span-2 xl:col-span-5">
          <Button
            type="submit"
            disabled={createRelationship.isPending || !candidates.length}
          >
            <Plus className="size-4" />
            Thêm mới
          </Button>
        </div>
      </form>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>TT</TableHead>
            <TableHead>Mã khách hàng</TableHead>
            <TableHead>Tên khách hàng</TableHead>
            <TableHead>Địa chỉ</TableHead>
            <TableHead>Tên quan hệ</TableHead>
            <TableHead>Tên quan hệ đối ứng</TableHead>
            <TableHead>Trạng thái quan he</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(relationshipsQuery.data ?? []).map((item, index) => (
            <TableRow key={item.id}>
              <TableCell>{index + 1}</TableCell>
                <TableCell className="font-mono text-xs">
                {item.relatedCustomerCode || item.relatedCustomerId}
              </TableCell>
              <TableCell>{item.relatedCustomerName || "-"}</TableCell>
              <TableCell className="max-w-64 truncate">
                {item.relatedCustomerAddress || "-"}
              </TableCell>
              <TableCell>{relationLabel(item.relationCode)}</TableCell>
              <TableCell>
                {relationLabel(item.reciprocalRelationCode)}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{item.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
          {!relationshipsQuery.data?.length ? (
            <EmptyTable colSpan={7} text="Chưa có quan hệ khách hàng." />
          ) : null}
        </TableBody>
      </Table>
    </Panel>
  )
}

export function RelationSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Select
      value={value || "none"}
      onValueChange={(next) => onChange(next === "none" ? "" : next)}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">-- Chọn Mã quan hệ --</SelectItem>
        {selectOptions.relation.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}