import type { ColumnDef } from "@tanstack/react-table";

export const SELECT_COLUMN_ID = "select";
export const ROW_INDEX_COLUMN_ID = "row_index";

/** Fixed width for checkbox selection column (px). */
export const SELECT_COLUMN_SIZE = 40;
/** Fixed width for row index / STT column (px). */
export const ROW_INDEX_COLUMN_SIZE = 44;

type InjectRowIndexColumnOptions = {
  pageIndex: number;
  pageSize: number;
  label?: string;
};

function fixedColumnSize(size: number) {
  return {
    size,
    minSize: size,
    maxSize: size,
    enableResizing: false as const,
  };
}

export function normalizeSelectColumn<TData>(
  columns: ColumnDef<TData>[],
): ColumnDef<TData>[] {
  return columns.map((column) => {
    if (column.id !== SELECT_COLUMN_ID) return column;

    return {
      ...column,
      ...fixedColumnSize(SELECT_COLUMN_SIZE),
    };
  });
}

export function injectRowIndexColumn<TData>(
  columns: ColumnDef<TData>[],
  { pageIndex, pageSize, label = "STT" }: InjectRowIndexColumnOptions,
): ColumnDef<TData>[] {
  if (
    columns.some(
      (column) =>
        column.id === ROW_INDEX_COLUMN_ID || column.id === "stt",
    )
  ) {
    return columns;
  }

  const rowIndexColumn: ColumnDef<TData> = {
    id: ROW_INDEX_COLUMN_ID,
    header: () => label,
    cell: ({ row }) => pageIndex * pageSize + row.index + 1,
    enableSorting: false,
    enableHiding: false,
    ...fixedColumnSize(ROW_INDEX_COLUMN_SIZE),
    meta: {
      label,
    },
  };

  const selectIndex = columns.findIndex(
    (column) => column.id === SELECT_COLUMN_ID,
  );
  const insertAt = selectIndex >= 0 ? selectIndex + 1 : 0;

  return [
    ...columns.slice(0, insertAt),
    rowIndexColumn,
    ...columns.slice(insertAt),
  ];
}

export function isUtilityTableColumn(columnId: string) {
  return columnId === SELECT_COLUMN_ID || columnId === ROW_INDEX_COLUMN_ID;
}

export function utilityTableColumnClassName(columnId: string) {
  if (columnId === SELECT_COLUMN_ID) {
    return "w-5 max-w-5 py-0 text-center";
  }
  if (columnId === ROW_INDEX_COLUMN_ID) {
    return "w-6 max-w-6 px-1.5 text-center tabular-nums text-muted-foreground";
  }
  return undefined;
}
