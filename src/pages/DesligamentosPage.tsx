import { PageTitle } from '@/components/PageTitle';
import { useState, useMemo, useCallback } from 'react';
import { useDesligamentos } from '@/hooks/useDesligamentos';
import { PageLayout } from '@/components/layout';
import { UserMinus, Plus, Calculator, FileSpreadsheet, History, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { desligamentoService, type DesligamentoComColaborador } from '@/services/desligamentoService';
import { useQueryClient } from '@tanstack/react-query';
import { useDataAccessLog } from '@/hooks/useDataAccessLog';
import { useEmpresas } from '@/hooks/useEmpresas';
import { exportarDesligamentosExcel } from '@/utils/desligamentoExcel';
import { registrarAcessoPII } from '@/services/piiAccessLogService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { loggerService } from '@/services/loggerService';
import { resumoAtencao } from '@/components/desligamentos/desligamentosDerivacoes';
import {
  DesligamentoAtencaoBanner,
  DesligamentoKPIs,
  GestaoDesligamentos,
  DesligamentoDetailSheet,
  NovoDesligamentoDialog,
  TurnoverChart,
  TrilhaAuditoriaDesligamentos,
} from '@/components/desligamentos';
export default function DesligamentosPage() {
  const { desligamentos, isLoading } = useDesligamentos();
  const { empresaAtual } = useEmpresas();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useDataAccessLog('desligamentos', empresaAtual?.id, empresaAtual?.id);
  const [selectedDesligamento, setSelectedDesligamento] = useState<DesligamentoComColaborador | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showNovo, setShowNovo] = useState(false);
  const [showChart] = useState(true);
  /** Ligado pelo "Ver processos" da faixa de atenção. */
  const [soAtencao, setSoAtencao] = useState(false);
  // `useState` com inicializador, não `useMemo`: ler o relógio dentro de um
  // useMemo é efeito colateral no render (react-hooks/purity). O dia só muda a
  // cada 24h e a página recarrega muito antes disso.
  const [hojeMs] = useState(() => Date.now());
  const atencao = useMemo(() => resumoAtencao(desligamentos || [], hojeMs), [desligamentos, hojeMs]);

  /**
   * IDs do recorte que `GestaoDesligamentos` está mostrando (busca, etapa, status,
   * tipo, departamento, período e a faixa de atenção). O filtro passou a morar
   * dentro do componente junto da paginação/ordenação; o cabeçalho continua
   * exportando SÓ o que está na tela, como antes.
   */
  const [idsFiltrados, setIdsFiltrados] = useState<string[] | null>(null);
  // Identidade estável (`useCallback` sem dependências) e troca só quando os IDs
  // mudam de verdade: o componente emite num `useEffect`, então guardar um array
  // novo a cada chamada criaria laço render → efeito → render.
  const aoFiltrar = useCallback((ids: string[]) => {
    setIdsFiltrados((anterior) =>
      anterior && anterior.length === ids.length && anterior.every((v, i) => v === ids[i]) ? anterior : ids
    );
  }, []);

  /** O que o botão "Exportar Excel" do cabeçalho leva: o recorte da tela. */
  const filtered = useMemo(() => {
    const base = desligamentos || [];
    if (!idsFiltrados) return base;
    const marcados = new Set(idsFiltrados);
    return base.filter((d) => marcados.has(String(d.id)));
  }, [desligamentos, idsFiltrados]);

  /** Exportação das linhas marcadas no checkbox da tabela. */
  const exportarSelecionados = useCallback(
    (ids: string[]) => {
      const marcados = new Set(ids);
      const lista = (desligamentos || []).filter((d) => marcados.has(String(d.id)));
      if (lista.length === 0) return;
      void registrarAcessoPII('desligamentos', 'export', {
        empresaId: empresaAtual?.id,
        registroCount: lista.length,
      });
      exportarDesligamentosExcel(lista);
    },
    [desligamentos, empresaAtual?.id]
  );

  const openDetail = (d: DesligamentoComColaborador) => {
    setSelectedDesligamento(d);
    setShowDetail(true);
  };

  const handleExcluir = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Tem certeza que deseja excluir este desligamento?')) return;
    if (!empresaAtual?.id) {
      toast.error('Empresa ativa não carregada.');
      return;
    }
    try {
      await desligamentoService.excluir(id, empresaAtual.id);
      queryClient.invalidateQueries({ queryKey: ['desligamentos'] });
      toast.success('Desligamento excluído');
    } catch (err) {
      void loggerService.error(
        'Erro ao excluir desligamento',
        { id, empresaId: empresaAtual?.id },
        err instanceof Error ? err : new Error(String(err))
      );
      toast.error('Erro ao excluir desligamento');
    }
  };

  return (
    <>
      <PageTitle title="Desligamentos" description="Gestão de desligamentos" />
      <PageLayout
        title="Desligamentos"
        description="Controle completo de desligamentos e rescisões"
        icon={<UserMinus className="h-5 w-5 text-primary-foreground" />}
        gradient="from-destructive to-destructive/70"
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void registrarAcessoPII('desligamentos', 'export', {
                  empresaId: empresaAtual?.id,
                  registroCount: filtered.length,
                });
                exportarDesligamentosExcel(filtered);
              }}
              className="rounded-xl font-body"
              disabled={filtered.length === 0}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/calculadora-rescisao')}
              className="rounded-xl font-body"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Calculadora
            </Button>
            <Button
              size="sm"
              onClick={() => setShowNovo(true)}
              className="rounded-xl bg-gradient-to-r from-destructive to-destructive/70 hover:opacity-90 shadow-lg font-body"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Desligamento
            </Button>
          </div>
        }
      >
        <Tabs defaultValue="lista" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="lista" className="rounded-lg gap-2">
              <List className="h-4 w-4" /> Gestão de Desligamentos
            </TabsTrigger>
            <TabsTrigger value="auditoria" className="rounded-lg gap-2">
              <History className="h-4 w-4" /> Trilha de Auditoria
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lista" className="space-y-6">
            <div className="space-y-6">
              {/* KPIs */}
              <AnimatePresence>
                {!isLoading && Array.isArray(desligamentos) && (desligamentos?.length || 0) > 0 && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <DesligamentoKPIs desligamentos={desligamentos} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Faixa de atenção — consome `resumoAtencao`, que existia em
                  `desligamentosDerivacoes.ts` desde sempre e era chamada só
                  pelo próprio teste: o RH nunca viu esses números. */}
              {!isLoading && Array.isArray(desligamentos) && desligamentos.length > 0 && (
                <DesligamentoAtencaoBanner resumo={atencao} onVerProcessos={() => setSoAtencao((v) => !v)} index={1} />
              )}

              {/* Turnover Chart */}
              {!isLoading && Array.isArray(desligamentos) && (desligamentos?.length || 0) > 0 && showChart && (
                <TurnoverChart desligamentos={desligamentos} />
              )}

              {/* Gestão de Desligamentos — barra de filtros, pills de etapa, tabela
                  ou cards, ordenação e paginação. Resgatado da branch `muri`
                  (PR #546, fechada sem merge): até aqui a tela renderizava a
                  lista inteira de uma vez, sem paginar, sem ordenar e sem filtro
                  rápido por etapa.

                  `onOpenDetalhes` devolve o item como `DesligamentoLike` (o tipo
                  mínimo que o componente consome); reencontrar o registro
                  completo pelo id evita cast e mantém o `DetailSheet` com a
                  linha inteira. */}
              <GestaoDesligamentos
                desligamentos={desligamentos || []}
                isLoading={isLoading}
                onOpenDetalhes={(d) => {
                  const alvo = (desligamentos || []).find((x) => String(x.id) === String(d.id));
                  if (alvo) openDetail(alvo);
                }}
                onNovo={() => setShowNovo(true)}
                onExcluir={handleExcluir}
                onCalcular={() => navigate('/calculadora-rescisao')}
                atencaoAtiva={soAtencao}
                onLimparAtencao={() => setSoAtencao(false)}
                onFiltradosChange={aoFiltrar}
                onExportarSelecionados={exportarSelecionados}
              />
            </div>
          </TabsContent>

          <TabsContent value="auditoria">
            {/* Trilha da PROPRIA area, em vez da timeline generica de Ponto:
                filtros por periodo/usuario/categoria/nivel, resumo em linguagem
                humana e exportacao. PontoAuditTimeline segue servindo a area de
                Ponto, intocada. */}
            <TrilhaAuditoriaDesligamentos />
          </TabsContent>
        </Tabs>

        {/* Detail Sheet */}
        <DesligamentoDetailSheet
          desligamento={selectedDesligamento}
          open={showDetail}
          onClose={() => setShowDetail(false)}
        />

        {/* Novo Dialog */}
        <NovoDesligamentoDialog open={showNovo} onClose={() => setShowNovo(false)} />
      </PageLayout>
    </>
  );
}
