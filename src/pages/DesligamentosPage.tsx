import { PageTitle } from '@/components/PageTitle';
import { useState, useMemo, useRef } from 'react';
import { useDesligamentos } from '@/hooks/useDesligamentos';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { UserMinus, Plus, Calculator, FileSpreadsheet, History, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { desligamentoService } from '@/services/desligamentoService';
import { useQueryClient } from '@tanstack/react-query';
import { useDataAccessLog } from '@/hooks/useDataAccessLog';
import { useEmpresas } from '@/hooks/useEmpresas';
import { exportarDesligamentosExcel } from '@/utils/desligamentoExcel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PontoAuditTimeline } from '@/components/ponto/PontoAuditTimeline';
import { loggerService } from '@/services/loggerService';
import {
  DesligamentoKPIs,
  DesligamentoAtencaoBanner,
  TurnoverChart,
  GestaoDesligamentos,
  DesligamentoDetailSheet,
  NovoDesligamentoDialog,
} from '@/components/desligamentos';
import { resumoAtencao, type DesligamentoLike } from '@/components/desligamentos/desligamentosDerivacoes';
import type { LooseRow } from '@/types/db';
// MOCK VISUAL — ver src/mocks/desligamentosMock.ts.
import { bloquearEscritaDesligamento } from '@/mocks/desligamentosMock';

/**
 * Área de Desligamentos — RECONSTRUÇÃO VISUAL completa (uma única área
 * operacional, sem subáreas): header → KPIs → faixa de atenção → gráfico →
 * Gestão de Desligamentos (tabela/cards) + a aba "Trilha de Auditoria".
 * Toda a composição reusa os componentes do design system (`MetricCard`,
 * `Tabs`, `Card`, motion helpers). Nenhum dado é inventado.
 */
export default function DesligamentosPage() {
  const { desligamentos, isLoading } = useDesligamentos();
  const { empresaAtual } = useEmpresas();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const gestaoRef = useRef<HTMLDivElement>(null);

  useDataAccessLog('desligamentos', empresaAtual?.id, empresaAtual?.id);

  const [selectedDesligamento, setSelectedDesligamento] = useState<LooseRow<'desligamentos'> | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showNovo, setShowNovo] = useState(false);
  const [atencaoAtiva, setAtencaoAtiva] = useState(false);

  const lista = useMemo(() => (desligamentos || []) as DesligamentoLike[], [desligamentos]);
  const temDados = !isLoading && lista.length > 0;

  const hojeMs = useMemo(() => {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime();
  }, []);

  const resumo = useMemo(() => resumoAtencao(lista, hojeMs), [lista, hojeMs]);

  const openDetail = (d: DesligamentoLike) => {
    setSelectedDesligamento(d as unknown as LooseRow<'desligamentos'>);
    setShowDetail(true);
  };

  const verProcessosAtencao = () => {
    setAtencaoAtiva(true);
    gestaoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleExcluir = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // MOCK VISUAL — ver src/mocks/desligamentosMock.ts.
    if (bloquearEscritaDesligamento('Excluir desligamento')) return;
    if (!confirm('Tem certeza que deseja excluir este desligamento?')) return;
    try {
      await desligamentoService.excluir(id, empresaAtual?.id);
      queryClient.invalidateQueries({ queryKey: ['desligamentos'] });
      toast.success('Desligamento excluído');
    } catch (err) {
      loggerService.error(
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
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportarDesligamentosExcel(lista)}
              className="rounded-xl font-body"
              disabled={lista.length === 0}
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
              Calculadora de Rescisão
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
        <Tabs defaultValue="lista" className="space-y-5">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="lista" className="rounded-lg gap-2">
              <List className="h-4 w-4" /> Gestão de Desligamentos
            </TabsTrigger>
            <TabsTrigger value="auditoria" className="rounded-lg gap-2">
              <History className="h-4 w-4" /> Trilha de Auditoria
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lista" className="space-y-4">
            <AnimatePresence initial={false}>
              {temDados && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <DesligamentoKPIs desligamentos={lista} />
                </motion.div>
              )}
            </AnimatePresence>

            {temDados && (
              <DesligamentoAtencaoBanner resumo={resumo} onVerProcessos={verProcessosAtencao} index={5} />
            )}

            {temDados && <TurnoverChart desligamentos={lista} index={6} />}

            <div ref={gestaoRef}>
              <GestaoDesligamentos
                desligamentos={lista}
                isLoading={isLoading}
                onOpenDetalhes={openDetail}
                onNovo={() => setShowNovo(true)}
                onExcluir={handleExcluir}
                onCalcular={() => navigate('/calculadora-rescisao')}
                atencaoAtiva={atencaoAtiva}
                onLimparAtencao={() => setAtencaoAtiva(false)}
              />
            </div>
          </TabsContent>

          <TabsContent value="auditoria">
            <PontoAuditTimeline filterTabela="desligamentos" />
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
