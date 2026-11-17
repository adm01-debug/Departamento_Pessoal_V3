import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { ColaboradorFilters } from '@/components/colaboradores/ColaboradorFilters';
import { TableCell, TableRow } from '@/components/ui/table';
import { ColaboradorStatus } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { useVinculosResumo } from '@/hooks/useVinculos';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Eye, Edit, Users, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useExcelExport } from '@/hooks/useExcelExport';
import { usePDFExport } from '@/hooks/usePDFExport';
import { useColaboradores } from '@/hooks/useColaboradores';
import { usePiiMask } from '@/hooks/usePiiMask';
import { registrarAcessoPII } from '@/services/piiAccessLogService';
import { useEmpresas } from '@/hooks/useEmpresas';
import { colaboradorService } from '@/services/colaboradorService';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EntityPageContainer } from '@/components/layout/EntityPageContainer';
import { ColaboradorKpiCards } from '@/components/colaboradores/ColaboradorKpiCards';
import { ColaboradorDirectoryGrid } from '@/components/colaboradores/ColaboradorDirectoryGrid';
import { ColaboradorTable, COLABORADOR_TABLE_COLUMNS } from '@/components/colaboradores/ColaboradorTable';
import { ColaboradorViewSwitcher, type ColaboradorViewMode } from '@/components/colaboradores/ColaboradorViewSwitcher';
import type { Colaborador } from '@/types/entities';
import { loggerService } from '@/services/loggerService';

export default function ColaboradoresPage() {
  const navigate = useNavigate();
  const { exportarExcel } = useExcelExport();
  const { exportarPDF } = usePDFExport();
  const { empresaAtual } = useEmpresas();
  const pii = usePiiMask();
  // Tabela segue sendo o padrão (é o que o RH já conhece); a grade de cartões
  // da `muri` entra como alternativa, não como substituta.
  const [viewMode, setViewMode] = useState<ColaboradorViewMode>('tabela');

  const {
    colaboradores,
    total,
    isLoading,
    isFetching,
    error,
    page,
    setPage,
    pageSize,
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
    cargosDisponiveis,
  } = useColaboradores();

  // Uma consulta so para a pagina inteira (`.in('colaborador_id', ids)`), nao
  // uma por linha — ver vinculoService.contarPassagensPorColaboradores. Alimenta
  // o selo de recontratacao na tabela E na grade: a grade ja sabia desenhar o
  // selo, mas ninguem passava o dado, entao ele nunca aparecia.
  const { data: passagensPorId } = useVinculosResumo(colaboradores.map((c) => c.id));

  const handlePageChange = useCallback(
    (p: number) => {
      setPage(p);
    },
    [setPage]
  );

  // Reset page when search or filters change
  const handleSearchChange = useCallback(
    (val: string) => {
      setSearch(val);
      setPage(1);
    },
    [setSearch, setPage]
  );

  const handleStatusChange = useCallback(
    (val: string) => {
      setStatus(val);
      setPage(1);
    },
    [setStatus, setPage]
  );

  const handleDeptoChange = useCallback(
    (val: string) => {
      setDepartamento(val);
      setPage(1);
    },
    [setDepartamento, setPage]
  );

  const handleCargoChange = useCallback(
    (val: string) => {
      setCargo(val);
      setPage(1);
    },
    [setCargo, setPage]
  );

  const statusOptions = [
    { value: 'ativo', label: 'Ativos' },
    { value: 'inativo', label: 'Inativos' },
    { value: 'desligado', label: 'Desligados' },
    { value: 'ferias', label: 'Em Férias' },
    { value: 'afastado', label: 'Afastados' },
  ];

  const handleExportExcel = async () => {
    if (!empresaAtual?.id) return;
    try {
      toast.info('Preparando exportação completa...', {
        description: 'Isso pode levar alguns segundos dependendo do tamanho da base.',
      });

      const { data } = await colaboradorService.listar({
        pageSize: 5000,
        filters: {
          empresaId: empresaAtual.id,
          status: status === 'all' ? undefined : status,
          departamento: departamento === 'all' ? undefined : departamento,
          cargo: cargo === 'all' ? undefined : cargo,
        },
        search: search || undefined,
      });

      if (!data.length) {
        toast.error('Nenhum dado encontrado para exportar');
        return;
      }

      void registrarAcessoPII('colaboradores', 'export', {
        empresaId: empresaAtual.id,
        registroCount: data.length,
      });
      // Sem papel de PII o export leva a mesma visão mascarada da tela.
      const linhas = data.map((r) => pii.deep(r) as Record<string, unknown>);
      exportarExcel('Relatório de Colaboradores', linhas, [
        'nome_completo',
        'cpf',
        'cargo',
        'departamento',
        'status',
        'data_admissao',
        'email',
      ]);
    } catch (err) {
      loggerService.error('Falha ao exportar dados', {}, err instanceof Error ? err : new Error(String(err)));
      toast.error('Falha ao exportar dados');
    }
  };

  const handleExportPDF = async () => {
    if (!empresaAtual?.id) return;
    try {
      toast.info('Preparando PDF...', {
        description: 'Gerando documento com os filtros atuais.',
      });

      const { data } = await colaboradorService.listar({
        pageSize: 1000,
        filters: {
          empresaId: empresaAtual.id,
          status: status === 'all' ? undefined : status,
          departamento: departamento === 'all' ? undefined : departamento,
          cargo: cargo === 'all' ? undefined : cargo,
        },
        search: search || undefined,
      });

      if (!data.length) {
        toast.error('Nenhum dado encontrado para exportar');
        return;
      }

      void registrarAcessoPII('colaboradores', 'export', {
        empresaId: empresaAtual.id,
        registroCount: data.length,
      });
      const linhas = data.map((r) => pii.deep(r) as Record<string, unknown>);
      exportarPDF('Relatório de Colaboradores', linhas, ['nome_completo', 'cpf', 'cargo', 'departamento', 'status']);
    } catch (err) {
      loggerService.error(
        'Falha ao exportar PDF',
        { empresaId: empresaAtual?.id },
        err instanceof Error ? err : new Error(String(err))
      );
      toast.error('Falha ao exportar PDF');
    }
  };

  return (
    <EntityPageContainer<Colaborador>
      pageTitle="Colaboradores"
      pageDescription="Gestão de colaboradores"
      title="Colaboradores"
      description={`Gestão analítica de ${total} talentos da organização`}
      icon={<Users className="h-5 w-5 text-primary-foreground" />}
      gradient="from-primary to-primary-glow"
      entityName="colaborador"
      items={colaboradores}
      total={total}
      isLoading={isLoading}
      isFetching={isFetching}
      error={error}
      page={page}
      pageSize={pageSize}
      search={search}
      onPageChange={handlePageChange}
      onSearchChange={handleSearchChange}
      onRefetch={refetch}
      actions={
        <div className="flex items-center gap-2">
          <ColaboradorViewSwitcher value={viewMode} onChange={setViewMode} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-11 rounded-xl gap-2 px-4 shadow-xs bg-card/50">
                <Download className="h-4 w-4" />
                <span>Exportar Dados</span>
              </Button>
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
            onClick={() => navigate('/colaboradores/novo')}
            className="h-11 rounded-xl px-6 gap-2 bg-primary text-primary-foreground shadow-glow hover:shadow-glow-lg transition-all"
          >
            <Users className="h-4 w-4" />
            Novo Colaborador
          </Button>
        </div>
      }
      stats={
        <ColaboradorKpiCards
          statusOptions={statusOptions}
          activeStatus={status}
          /* Mesmo comportamento do bloco inline anterior: clicar no KPI já
             ativo volta o filtro para "all". A decisão fica aqui porque é a
             página que é dona do estado do filtro. */
          onToggle={(statusKey) => setStatus(status === statusKey ? 'all' : statusKey)}
          summary={summary as Record<string, number> | null | undefined}
          isLoading={isLoading}
        />
      }
      customFilters={
        <ColaboradorFilters
          onSearchChange={handleSearchChange}
          onStatusChange={handleStatusChange}
          onDeptoChange={handleDeptoChange}
          onCargoChange={handleCargoChange}
          /* Opções vindas dos valores gravados em `colaboradores` (texto livre),
             não das tabelas mestre: ver colaboradorService.listarOpcoesFiltro.
             O componente espera {id, nome} — o próprio nome serve de id aqui. */
          departamentos={departamentosDisponiveis.map((nome) => ({ id: nome, nome }))}
          cargos={cargosDisponiveis.map((nome) => ({ id: nome, nome }))}
          currentFilters={{
            search,
            status,
            departamento,
            cargo,
          }}
        />
      }
      /* Contagem de colunas do esqueleto de carregamento. A tabela que desenha
         de fato e a `ColaboradorTable`, entao as colunas vem dela — assim o
         esqueleto nunca fica com numero de colunas diferente do conteudo. */
      columns={COLABORADOR_TABLE_COLUMNS}
      /* As DUAS visoes entram por `renderBody`: a grade de cartoes e a tabela
         densa da `muri` (6 colunas, com Admissao e o selo de recontratacao).
         A tabela genérica do container nao e mais usada nesta pagina; o resto
         (paginacao, filtros, KPIs, estados de erro/vazio) segue igual. */
      renderBody={
        viewMode === 'diretorio' ? (
          <ColaboradorDirectoryGrid items={colaboradores} isFetching={isFetching} passagensPorId={passagensPorId} />
        ) : (
          <ColaboradorTable items={colaboradores} isFetching={isFetching} passagensPorId={passagensPorId} />
        )
      }
    />
  );
}
