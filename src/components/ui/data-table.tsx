// Componente tipado com @tanstack/react-table (agora declarado em devDependencies).
// Resolve o FIXME(dep-fantasma) que exigia @ts-nocheck.
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';
import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  flexRender,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
  useTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { Button } from './button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// v9 não embute mais todas as features: cada uma precisa ser registrada, e os
// row models deixaram de ser opções do hook para virar slots de `tableFeatures`.
// O core row model passou a ser automático (getCoreRowModel não existe mais).
// columnVisibilityFeature é o que expõe row.getVisibleCells().
const features = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  rowSortingFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { alphanumeric: sortFn_alphanumeric },
});

interface DataTableProps<TData extends Record<string, unknown>> {
  columns: ColumnDef<typeof features, TData, unknown>[];
  data: TData[];
}

export function DataTable<TData extends Record<string, unknown>>({ columns, data }: DataTableProps<TData>) {
  const table = useTable({ features, columns, data });

  return (
    <div>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <TableHead key={h.id}>
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                Sem resultados
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
