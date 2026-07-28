import { ReactNode } from 'react';
import { PageTitle } from '@/components/PageTitle';
import { PageLayout } from '@/components/layout';
import { DataTableToolbar } from '@/components/ui/data-table-toolbar';
import { EmptyList, EmptySearch } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { FilterX, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { SyncErrorState } from '@/components/ui/sync-error-state';
import { GridCardSkeleton } from '@/components/ui/module-skeleton';

interface EntityGridPageContainerProps<T> {
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
  error: any;
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
  entityName: string;
  renderItem: (item: T, index: number) => ReactNode;
  stats?: ReactNode;
  gridClassName?: string;
  skeletonCount?: number;
  customFilters?: ReactNode;
}

export function EntityGridPageContainer<T extends { id: string | number }>({
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
  renderItem,
  stats,
  gridClassName = "grid gap-4 md:grid-cols-2 lg:grid-cols-3",
  skeletonCount = 6,
  customFilters,
  onAdd,
  addLabel
}: EntityGridPageContainerProps<T>) {
  const totalPages = Math.ceil(total / pageSize);
  const hasFilters = search !== '';

  return (
    <>
      <PageTitle title={pageTitle} description={pageDescription} />
      <PageLayout
        title={title}
        description={description}
        icon={icon}
        gradient={gradient}
        actions={actions}
      >
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
          <div className={gridClassName}>
            {Array.from({ length: skeletonCount }).map((_, i) => <GridCardSkeleton key={i} />)}
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
          <div className="space-y-8">
            <div className={`${gridClassName} relative`}>
              {isFetching && !isLoading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-2xl">
                  <Spinner size="lg" />
                </div>
              )}
              
              {items.map((item, i) => renderItem(item, i))}
            </div>

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
