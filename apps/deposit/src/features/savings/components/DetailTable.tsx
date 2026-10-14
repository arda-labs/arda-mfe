import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

/** Read-only table of preformatted cells for the savings detail tabs. */
export function DetailTable({
  headers,
  rows,
  empty,
}: {
  headers: string[]
  rows: string[][]
  empty: string
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            {headers.map((header) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={headers.length} className="py-4 text-center text-muted-foreground">
                {empty}
              </TableCell>
            </TableRow>
          )}
          {rows.map((row, idx) => (
            <TableRow key={idx}>
              {row.map((cell, cellIdx) => (
                <TableCell key={cellIdx}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
