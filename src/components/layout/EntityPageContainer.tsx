import type { ReactNode } from 'react';
import { PageTitle } from '@/components/PageTitle';
import { PageLayout } from '@/components/layout';
import { DataTableToolbar } from '@/components/ui/data-table-toolbar';
import { Table, TableBody, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { EmptyList, EmptySearch } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { FilterX, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { SyncErrorState } from '@/components/ui/sync-error-state';
import { TableSkeleton } from '@/components/ui/module-skeleton';

interface EntityPageContainerProps<T> {
  title: string;
  description: string;
  pageTitle: string;
  pageDescription: string;
  icon: ReactNode;
  gradient: string;
  actions?: ReactNode;

  // Query State
  items: T[];
  total: number;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  isRefreshing?: boolean;
  page: number;
  pageSize: number;
  search: string;
  onPageChange: (page: number) => void;
  onSearchChange: (search: string) => void;
  onRefetch: () => void;
  onAdd?: () => void;
  addLabel?: string;

  // Customization
  searchPlaceholder?: string;
  entityName: string; // e.g., "cargo", "departamento"
  columns: { header: string; className?: string; width?: string; hidden?: 'sm' | 'md' | 'lg' | boolean }[];
  /** Dispensavel quando `renderBody` substitui a tabela inteira. */
  renderRow?: (item: T) => ReactNode;
  /** Substitui a TABELA por um corpo proprio (grade de cartoes, etc). Resto do container intacto. */
  renderBody?: ReactNode;
  stats?: ReactNode;
  customFilters?: ReactNode;
}

export function EntityPageContainer<T extends { id: string | number }>({
  title,
  description,
  pageTitle,
  pageDescription,
  icon,
  gradient,
  actions,
  items,
  total,
  isLoading,
  isFetching,
  error,
  isRefreshing,
  page,
  pageSize,
  search,
  onPageChange,
  onSearchChange,
  onRefetch,
  searchPlaceholder,
  entityName,
  columns,
  renderRow,
  renderBody,
  stats,
  customFilters,
  onAdd,
  addLabel,
}: EntityPageContainerProps<T>) {
  const totalPages = Math.ceil(total / pageSize);
  const hasFilters = search !== '';

  return (
    <>
      <PageTitle title={pageTitle} description={pageDescription} />
      <PageLayout title={title} description={description} icon={icon} gradient={gradient} actions={actions}>
        {stats}

        {customFilters || (
          <DataTableToolbar
            search={search}
            onSearchChange={onSearchChange}
            searchPlaceholder={searchPlaceholder || `Buscar por nome...`}
            onRefresh={onRefetch}
            isRefreshing={isRefreshing}
            onAdd={onAdd}
            addLabel={addLabel}
          />
        )}

        {error ? (
          <SyncErrorState error={error} onRetry={onRefetch} entityName={entityName + 's'} />
        ) : isLoading ? (
          <div className="space-y-4">
            <TableSkeleton columns={columns.filter((c) => !c.hidden).length} rows={pageSize} />
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center justify-center border border-dashed rounded-2xl bg-muted/10 p-4">
            {hasFilters ? (
              <EmptySearch search={search} onClear={() => onSearchChange('')} />
            ) : (
              <EmptyList entityName={entityName} onCreate={onAdd} />
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border/30 overflow-hidden shadow-elevated bg-card relative"
            >
              {isFetching && !isLoading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                  <Spinner size="md" />
                </div>
              )}
              {/* `renderBody` é a saída para quem precisa de outra forma de
                  listar (grade de cartões, por exemplo) sem abandonar este
                  container: paginação, filtros, stats, estados de erro/vazio e
                  o overlay de refetch continuam valendo. Ausente — o caso de
                  todos os chamadores de hoje — nada muda: a tabela por
                  `columns`/`renderRow` é renderizada igual. */}
              {renderBody ?? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/20">
                      {columns.map((col, idx) => (
                        <TableHead
                          key={idx}
                          className={`font-display font-semibold py-4 ${col.className || ''}`}
                          style={{ width: col.width }}
                        >
                          {col.header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>{renderRow ? items.map(renderRow) : null}</TableBody>
                </Table>
              )}
            </motion.div>

            <DataTablePagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={pageSize}
              onPageChange={onPageChange}
            />
          </div>
        )}
      </PageLayout>
    </>
  );
}
