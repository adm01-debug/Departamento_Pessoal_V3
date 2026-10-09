import { PageTitle } from '@/components/PageTitle';
import { useState, useMemo, useRef } from 'react';
import { useDesligamentos } from '@/hooks/useDesligamentos';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { UserMinus, Plus, Calculator, FileSpreadsheet, History, List } from 'lucide-react';
import { motion, MotionConfig } from 'framer-motion';
import { MOTION_REDUCED_MODE } from '@/lib/motionMode';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { desligamentoService } from '@/services/desligamentoService';
import { useQueryClient } from '@tanstack/react-query';
import { useDataAccessLog } from '@/hooks/useDataAccessLog';
import { useEmpresas } from '@/hooks/useEmpresas';
import { exportarDesligamentosExcel } from '@/utils/desligamentoExcel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SlidingIndicator } from '@/components/ui/sliding-indicator';
import { loggerService } from '@/services/loggerService';
import {
  DesligamentoKPIs,
  DesligamentoAtencaoBanner,
  TurnoverChart,
  GestaoDesligamentos,
  DesligamentoDetailSheet,
  NovoDesligamentoDialog,
  TrilhaAuditoriaDesligamentos,
} from '@/components/desligamentos';
import { resumoAtencao, type DesligamentoLike } from '@/components/desligamentos/desligamentosDerivacoes';
import { EntradaPresenca, entradaCard } from '@/components/desligamentos/entradaCards';
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
  /** Aba ativa da navegação Gestão/Trilha — controlada para alimentar o
   *  `SlidingIndicator` (o mesmo indicador deslizante da Jornada de Onboarding). */
  const [aba, setAba] = useState<'lista' | 'auditoria'>('lista');

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
    // `reducedMotion="user"`: com "reduzir movimento" ligado no sistema, o
    // Framer desliga o DESLOCAMENTO (o `y` da entrada) e mantém o fade — a
    // animação de referência continua a mesma para quem não pediu redução, e a
    // preferência do sistema é respeitada SEM mexer em configuração global.
    // `MOTION_REDUCED_MODE` = `'user'` em produção; só vira `'never'` no dev com
    // o override explícito ligado (ver `src/lib/motionMode.ts`).
    <MotionConfig reducedMotion={MOTION_REDUCED_MODE}>
      <PageTitle title="Desligamentos" description="Gestão de desligamentos" />
      <PageLayout
        title="Desligamentos"
        description="Controle completo de desligamentos e rescisões"
        icon={<UserMinus className="h-5 w-5 text-primary-foreground" />}
        gradient="from-destructive to-destructive/70"
        actions={
          <div className="flex flex-wrap gap-2">
            {/* AÇÕES DO CABEÇALHO — três botões, três leituras semânticas:
                "Exportar Excel" (success) e "Calculadora de Rescisão" (warning)
                usam SUPERFÍCIE TRANSLÚCIDA + contorno fino + glow suave, no mesmo
                acabamento do "Novo Desligamento" (destructive) — nada de tinta
                cheia. A customização vive AQUI, na página: `Button` (compartilhado
                por todo o app) não muda. Todo o par cor/glow sai dos tokens
                Semânticos do tema (`--success` / `--warning`), então o par
                claro/escuro continua coerente — os valores são só a OPACIDADE da
                superfície, do contorno e do glow. O glow é ESTÁTICO (nunca
                animado) e sobe um degrau no hover, com transição de 200ms. */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportarDesligamentosExcel(lista)}
              className="rounded-xl font-body border-success/40 bg-success/10 text-success shadow-[0_0_16px_hsl(var(--success)/0.14)] transition-all duration-200 hover:border-success/55 hover:bg-success/15 hover:text-success hover:shadow-[0_0_22px_hsl(var(--success)/0.28)] focus-visible:ring-success/50"
              disabled={lista.length === 0}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/calculadora-rescisao')}
              className="rounded-xl font-body border-warning/40 bg-warning/10 text-warning shadow-[0_0_16px_hsl(var(--warning)/0.14)] transition-all duration-200 hover:border-warning/55 hover:bg-warning/15 hover:text-warning hover:shadow-[0_0_22px_hsl(var(--warning)/0.28)] focus-visible:ring-warning/50"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Calculadora de Rescisão
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowNovo(true)}
              className="rounded-xl bg-gradient-to-r from-destructive-vivid to-destructive-vivid/80 hover:opacity-90 shadow-glow-destructive hover:shadow-glow-destructive font-body"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Desligamento
            </Button>
          </div>
        }
      >
        <Tabs value={aba} onValueChange={(v) => setAba(v as 'lista' | 'auditoria')} className="space-y-5">
          {/* Navegação Gestão/Auditoria: o grupo entra como UM bloco coordenado
              (nunca palavra/ícone a palavra/ícone), na ordem de leitura: ANTES do
              conteúdo da aba. Reusa a MESMA entrada de referência do sistema
              (`entradaCard`, de `ui/entrada-cards.tsx`) — nenhuma animação nova.
              `EntradaPresenca` libera o keyframe `hidden` que o `initial={false}`
              do `PageTransition` bloqueia. A `key` é estável, então entrar/sair
              das abas NÃO reanima a navegação: ela toca uma vez por montagem da
              página, junto do restante da cascata. */}
          <EntradaPresenca>
            <motion.div {...entradaCard(0)}>
              {/* MESMA composição COMPACTA da TabList "Em andamento / Concluídos"
                  da Jornada de Onboarding: `inline-grid` (shrink-to-fit) — a
                  TabList NÃO ocupa a largura da página, só o necessário aos dois
                  botões. O indicador ÚNICO `SlidingIndicator` (peça compartilhada
                  de `ui/sliding-indicator.tsx`) desliza por `transform`
                  (CSS puro/GPU, 420ms, cubic-bezier(0.22,1,0.36,1)) entre as duas
                  colunas IGUAIS (`grid-cols-2`, que o próprio indicador exige para
                  medir 50%). Nunca há fade nem dois indicadores ao mesmo tempo: o
                  gatilho ativo fica com fundo transparente
                  (`data-[state=active]:bg-transparent`) e o texto em verde-lima
                  (`text-primary`), deixando só a pílula de borda visível — que
                  acompanha apenas o botão ativo. Cada gatilho é
                  `flex items-center justify-center` (sem `w-full`): o item de grid
                  já estica para a largura da própria coluna e o conjunto
                  ícone + texto fica centralizado dentro dela. `atual` acompanha a
                  aba ativa (0 = Gestão, 1 = Trilha). */}
              <TabsList className="relative inline-grid h-10 grid-cols-2 gap-0 rounded-xl border border-border/40 bg-muted/40 p-1">
                <SlidingIndicator atual={aba === 'auditoria' ? 1 : 0} />
                <TabsTrigger
                  value="lista"
                  className="relative z-10 flex items-center justify-center gap-2 rounded-lg border border-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                >
                  <List className="h-4 w-4" /> Gestão de Desligamentos
                </TabsTrigger>
                <TabsTrigger
                  value="auditoria"
                  className="relative z-10 flex items-center justify-center gap-2 rounded-lg border border-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                >
                  <History className="h-4 w-4" /> Trilha de Auditoria
                </TabsTrigger>
              </TabsList>
            </motion.div>
          </EntradaPresenca>

          <TabsContent value="lista" className="space-y-4">
            {/* A cascata de entrada é dos PRÓPRIOS cards (cada `MetricCard`
                abaixo já usa `cardVariants` com o `index` do mapa). O wrapper só
                existe para o `exit` quando os dados saem de cena — dar
                `initial`/`animate` a ele somaria um SEGUNDO movimento ao mesmo
                grupo.
                `EntradaPresenca` (e NÃO `AnimatePresence initial={false}`) é o que
                faz a cascata tocar de verdade: o `initial={false}` do
                `PageTransition` bloqueia o keyframe inicial de todo `motion.*`
                descendente. */}
            <EntradaPresenca>
              {temDados && (
                <motion.div exit={{ opacity: 0 }}>
                  <DesligamentoKPIs desligamentos={lista} />
                </motion.div>
              )}
            </EntradaPresenca>

            {temDados && <DesligamentoAtencaoBanner resumo={resumo} onVerProcessos={verProcessosAtencao} index={5} />}

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
    </MotionConfig>
  );
}
