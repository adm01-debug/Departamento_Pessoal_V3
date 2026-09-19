import { useCallback, useState } from 'react';
import { ColaboradorFilters } from '@/components/colaboradores/ColaboradorFilters';
import { ColaboradorKpiCards } from '@/components/colaboradores/ColaboradorKpiCards';
import { ColaboradorTable } from '@/components/colaboradores/ColaboradorTable';
import { ColaboradorPagination } from '@/components/colaboradores/ColaboradorPagination';
import { ColaboradorDirectoryGrid } from '@/components/colaboradores/ColaboradorDirectoryGrid';
import { ColaboradorViewMode } from '@/components/colaboradores/ColaboradorViewSwitcher';
import { Button, buttonVariants } from '@/components/ui/button';
import { FlowHoverButton } from '@/components/ui/flow-hover-button';
import { cn } from '@/lib/utils';
import { Users, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useExcelExport } from '@/hooks/useExcelExport';
import { usePDFExport } from '@/hooks/usePDFExport';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { useCargos } from '@/hooks/useCargos';
import { useColaboradores } from '@/hooks/useColaboradores';
import { useVinculosResumo } from '@/hooks/useVinculos';
import { useEmpresas } from '@/hooks/useEmpresas';
import { colaboradorService } from '@/services/colaboradorService';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageLayout } from '@/components/layout';
import { PageTitle } from '@/components/PageTitle';
import { EmptyList, EmptySearch } from '@/components/ui/empty-state';
import { SyncErrorState } from '@/components/ui/sync-error-state';
import { TableSkeleton } from '@/components/ui/module-skeleton';
import { loggerService } from '@/services/loggerService';

export default function ColaboradoresPage() {
  const navigate = useNavigate();
  // pageSize alto (limite do BaseService) para que o dropdown de filtro liste
  // todos os departamentos/cargos da empresa, sem afetar a paginação padrão
  // usada pelas telas administrativas de Departamentos/Cargos.
  const { departamentos } = useDepartamentos({ pageSize: 100 });
  const { cargos } = useCargos({ pageSize: 100 });
  const { exportarExcel } = useExcelExport();
  const { exportarPDF } = usePDFExport();
  const { empresaAtual } = useEmpresas();

  const {
    colaboradores,
    total,
    isLoading,
    isFetching,
    error,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    status,
    setStatus,
    departamento,
    setDepartamento,
    cargo,
    setCargo,
    refetch,
    summary,
    departamentosDisponiveis,
    cargosDisponiveis
  } = useColaboradores();

  // Une os departamentos/cargos cadastrados nas telas administrativas com os
  // valores realmente usados pelos colaboradores (colaboradorService.listarOpcoesFiltro).
  // As duas fontes podem divergir — texto livre em `colaboradores` vs. tabelas
  // mestre `departamentos`/`cargos` — e a união garante que o dropdown nunca
  // fique vazio quando uma delas não tem dados para a empresa ativa.
  const departamentosFiltro = Array.from(
    new Set([...(departamentos ?? []).map((d) => d.nome), ...(departamentosDisponiveis ?? [])])
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const cargosFiltro = Array.from(
    new Set([...(cargos ?? []).map((c) => c.nome), ...(cargosDisponiveis ?? [])])
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const [viewMode, setViewMode] = useState<ColaboradorViewMode>('tabela');

  const handlePageChange = useCallback((p: number) => {
    setPage(p);
  }, [setPage]);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, [setPageSize, setPage]);

  // Reset page when search or filters change
  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
  }, [setSearch, setPage]);

  const handleStatusChange = useCallback((val: string) => {
    setStatus(val);
    setPage(1);
  }, [setStatus, setPage]);

  const handleDeptoChange = useCallback((val: string) => {
    setDepartamento(val);
    setPage(1);
  }, [setDepartamento, setPage]);

  const handleCargoChange = useCallback((val: string) => {
    setCargo(val);
    setPage(1);
  }, [setCargo, setPage]);

  // Os cinco status refletem exatamente o enum `status_colaborador` do banco.
  const statusOptions = [
    { value: 'ativo', label: 'Ativos' },
    { value: 'pendente', label: 'Pendentes' },
    { value: 'desligado', label: 'Desligados' },
    { value: 'ferias', label: 'Em Férias' },
    { value: 'afastado', label: 'Afastados' },
  ];

  const handleExportExcel = async () => {
    if (!empresaAtual?.id) return;
    try {
      toast.info('Preparando exportação completa...', {
        description: 'Isso pode levar alguns segundos dependendo do tamanho da base.'
      });
      
      const { data } = await colaboradorService.listar({
        pageSize: 5000,
        filters: {
          empresaId: empresaAtual.id,
          status: status === 'all' ? undefined : status,
          departamento: departamento === 'all' ? undefined : departamento,
          cargo: cargo === 'all' ? undefined : cargo
        },
        search: search || undefined
      });

      if (!data.length) {
        toast.error('Nenhum dado encontrado para exportar');
        return;
      }

      exportarExcel(
        'Relatório de Colaboradores',
        data,
        ['nome_completo', 'cpf', 'cargo', 'departamento', 'status', 'data_admissao', 'email']
      );
    } catch (err) {
      loggerService.error('Falha ao exportar dados', {}, err instanceof Error ? err : new Error(String(err)));
      toast.error('Falha ao exportar dados');
    }
  };

  const handleExportPDF = async () => {
    if (!empresaAtual?.id) return;
    try {
      toast.info('Preparando PDF...', {
        description: 'Gerando documento com os filtros atuais.'
      });

      const { data } = await colaboradorService.listar({
        pageSize: 1000,
        filters: {
          empresaId: empresaAtual.id,
          status: status === 'all' ? undefined : status,
          departamento: departamento === 'all' ? undefined : departamento,
          cargo: cargo === 'all' ? undefined : cargo
        },
        search: search || undefined
      });

      if (!data.length) {
        toast.error('Nenhum dado encontrado para exportar');
        return;
      }

      exportarPDF(
        'Relatório de Colaboradores',
        data,
        ['nome_completo', 'cpf', 'cargo', 'departamento', 'status']
      );
    } catch (err) {
      loggerService.error('Falha ao exportar PDF', { empresaId: empresaAtual?.id }, err instanceof Error ? err : new Error(String(err)));
      toast.error('Falha ao exportar PDF');
    }
  };

  // colaboradorService.listar/getSummary caem nos 12 colaboradores fictícios
  // de src/mocks/colaboradoresMock.ts quando VITE_COLABORADORES_MOCK=true (dev only).
  const itemsExibidos = colaboradores;
  const totalExibido = total;
  const summaryExibido = summary as Record<string, number> | undefined;
  const isLoadingExibido = isLoading;

  // Resumo de passagens/recontratação (coluna Vínculo) — 1 query para os ids
  // da página atual, nunca uma por linha (ver useVinculosResumo).
  const colaboradorIdsExibidos = itemsExibidos.map((c) => c.id);
  const { data: passagensPorId } = useVinculosResumo(colaboradorIdsExibidos);

  const activeFilterChips = [
    status !== 'all' && {
      key: 'status',
      label: `Status: ${statusOptions.find(o => o.value === status)?.label ?? status}`,
      onRemove: () => handleStatusChange('all'),
    },
    departamento !== 'all' && {
      key: 'departamento',
      label: `Departamento: ${departamento}`,
      onRemove: () => handleDeptoChange('all'),
    },
    cargo !== 'all' && {
      key: 'cargo',
      label: `Cargo: ${cargo}`,
      onRemove: () => handleCargoChange('all'),
    },
  ].filter((f): f is { key: string; label: string; onRemove: () => void } => !!f);

  const handleClearAllFilters = () => {
    handleStatusChange('all');
    handleDeptoChange('all');
    handleCargoChange('all');
  };

  return (
    <>
      <PageTitle title="Colaboradores" description="Gestão de colaboradores" />
      <PageLayout
        title="Colaboradores"
        description={`Gestão analítica de ${totalExibido} talentos da organização`}
        icon={<Users className="h-5 w-5 text-primary-foreground" />}
        gradient="from-primary to-primary-glow"
        actions={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {/* Mesma animação "flow" (círculo que preenche o botão no hover) do
                    botão "Sincronizar" do Dashboard principal — ver DashboardHeader.tsx. */}
                <FlowHoverButton
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'sm' }),
                    'gap-2 rounded-xl border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all font-body h-8 shadow-xs before:bg-primary hover:text-primary-foreground transition-colors',
                  )}
                  icon={<Download className="h-4 w-4" />}
                >
                  <span>Exportar Dados</span>
                </FlowHoverButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl w-48">
                <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer py-2.5">
                  <FileSpreadsheet className="h-4 w-4 text-success" />
                  Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer py-2.5">
                  <FileText className="h-4 w-4 text-destructive" />
                  PDF (.pdf)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="sm"
              onClick={() => navigate('/colaboradores/novo')}
              className="h-8 rounded-xl gap-2 bg-primary text-primary-foreground shadow-glow hover:shadow-glow-lg transition-all"
            >
              <Users className="h-4 w-4" />
              Novo Colaborador
            </Button>
          </div>
        }
      >
        <ColaboradorKpiCards
          statusOptions={statusOptions}
          activeStatus={status}
          onToggle={(s) => setStatus(status === s ? 'all' : s)}
          summary={summaryExibido}
          isLoading={isLoadingExibido}
        />

        <ColaboradorFilters
          onSearchChange={handleSearchChange}
          onStatusChange={handleStatusChange}
          onDeptoChange={handleDeptoChange}
          onCargoChange={handleCargoChange}
          departamentos={departamentosFiltro}
          cargos={cargosFiltro}
          currentFilters={{ search, status, departamento, cargo }}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          activeFilterChips={activeFilterChips}
          onClearAllFilters={handleClearAllFilters}
        />

        {error ? (
          <SyncErrorState error={error} onRetry={refetch} entityName="colaboradores" />
        ) : isLoadingExibido ? (
          <div className="space-y-4">
            <TableSkeleton columns={6} rows={pageSize} />
          </div>
        ) : totalExibido === 0 ? (
          <div className="flex flex-col items-center justify-center border border-dashed rounded-2xl bg-muted/10 p-4">
            {search ? (
              <EmptySearch search={search} onClear={() => handleSearchChange('')} />
            ) : (
              <EmptyList entityName="colaborador" onCreate={() => navigate('/colaboradores/novo')} />
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {viewMode === 'diretorio' ? (
              <ColaboradorDirectoryGrid items={itemsExibidos} isFetching={isFetching} passagensPorId={passagensPorId} />
            ) : (
              <ColaboradorTable items={itemsExibidos} isFetching={isFetching} passagensPorId={passagensPorId} />
            )}
            <ColaboradorPagination
              page={page}
              pageSize={pageSize}
              total={totalExibido}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}
      </PageLayout>
    </>
  );
}
