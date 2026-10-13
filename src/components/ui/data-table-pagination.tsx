/**
 * Tabela/grade genérica — rodapé de paginação.
 *
 * Antes tinha controles PRÓPRIOS (primeira/última + janela de números). Agora é
 * só a ponte para o padrão único do sistema (`AppPagination`), mantendo a API
 * que os containers já usavam (`currentPage`, `totalPages`, `totalItems`,
 * `pageSize`, `onPageChange`) — e, opcionalmente, o seletor de linhas por
 * página para quem tem `setPageSize` (hooks de CRUD).
 */
import { AppPagination } from '@/components/ui/app-pagination';

interface DataTablePaginationProps {
  currentPage: number;
  /** Mantido por compatibilidade; o total de páginas é recalculado no rodapé. */
  totalPages?: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  isLoading?: boolean;
}

export function DataTablePagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
  isLoading,
}: DataTablePaginationProps) {
  // Comportamento preservado: com tudo em uma única página o rodapé não aparece.
  if (totalItems <= pageSize) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <AppPagination
      page={currentPage}
      total={totalItems}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      pageSizeOptions={pageSizeOptions}
      isLoading={isLoading}
      className="px-4 py-1.5"
      label={
        <>
          Mostrando <span className="font-semibold text-foreground">{start}-{end}</span> de{' '}
          <span className="font-semibold text-foreground">{totalItems}</span>
        </>
      }
    />
  );
}

