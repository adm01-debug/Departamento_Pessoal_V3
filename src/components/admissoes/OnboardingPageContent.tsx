/**
 * Área de ONBOARDING do módulo de Admissões (aba "Onboarding" de
 * `AdmissoesPage`).
 *
 * REDESENHO: antes era uma lista de cards ALTOS com o checklist completo sempre
 * aberto (pouca informação útil por área). Agora é uma GRADE responsiva de cards
 * compactos — um painel de acompanhamento operacional, não uma pilha de
 * formulários. Cada card (ver `OnboardingCard.tsx`) traz avatar, cargo •
 * departamento, % e barra de progresso, a régua de marcos (Pré-onboarding → 30
 * dias), a PRÓXIMA AÇÃO com prazo e responsável e os micro status
 * (concluídas/pendentes/em risco). O checklist completo saiu daqui e mora no
 * detalhe (`OnboardingDetalheDialog.tsx`), aberto por "Ver onboarding".
 *
 * DADOS: nenhuma query nova. Continua lendo `admissoes` com
 * `tarefas:tarefas_onboarding(*)` (mock demonstrativo preservado) e a MESMA
 * mutation de "Concluir" tarefa. Esta tela só mudou COMO apresenta — a régua de
 * negócio (progresso, prazo, risco) fica em `onboardingDerivacoes.ts`.
 *
 * GRADE: 1 coluna no mobile, 2 a partir de `sm`, 3 em `xl` e 4 em `2xl` — mesma
 * escada de breakpoints das outras grades do produto.
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { cardVariants } from '@/components/dashboard/MetricCard';
// MOCK VISUAL — ver src/mocks/admissoesMock.ts
import { isAdmissoesMockEnabled, getMockOnboarding, mockConcluirTarefaOnboarding } from '@/mocks/admissoesMock';
import { OnboardingCard, type OnboardingAcoes } from './OnboardingCard';
import { OnboardingDetalheDialog } from './OnboardingDetalheDialog';
import { inicioDoDia } from './admissoesDerivacoes';
import { progressoOnboarding, resumoOnboarding, type ColaboradorOnboarding } from './onboardingDerivacoes';

/**
 * Teto do `custom` (posição do card na fila da cascata) — MESMA trava de
 * `ColaboradorDirectoryGrid.tsx`. A lista pode ser longa: sem o teto, com a
 * cadência do `cardVariants` (0.08s por card) o último card entraria segundos
 * depois do primeiro. Do 6º card em diante todos entram na mesma leva.
 */
const ONBOARDING_MAX_STAGGER_INDEX = 5;

export default function OnboardingPageContent() {
  const queryClient = useQueryClient();
  // MOCK VISUAL — ver src/mocks/admissoesMock.ts (dev + VITE_ADMISSOES_MOCK=true).
  const mockAtivo = isAdmissoesMockEnabled();

  const [colaboradorDetalhe, setColaboradorDetalhe] = useState<ColaboradorOnboarding | null>(null);
  const [tarefaConcluindo, setTarefaConcluindo] = useState<string | null>(null);

  const { data: onboarding = [], isLoading } = useQuery({
    queryKey: ['onboarding-list'],
    queryFn: async () => {
      // MOCK VISUAL — lista fictícia de integrações (com tarefas).
      if (mockAtivo) return getMockOnboarding();
      const { data, error } = await supabase
        .from('admissoes')
        .select(
          `
          *,
          tarefas:tarefas_onboarding(*)
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const concluirTarefa = useMutation({
    mutationFn: async (tarefaId: string) => {
      // MOCK VISUAL — baixa a tarefa fictícia em memória (nada é gravado no banco).
      if (mockConcluirTarefaOnboarding(tarefaId)) return;
      const { error } = await supabase
        .from('tarefas_onboarding')
        .update({ concluida: true, concluida_em: new Date().toISOString() })
        .eq('id', tarefaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-list'] });
      toast.success('Tarefa concluída!');
    },
    onSettled: () => setTarefaConcluindo(null),
  });

  const concluir = (tarefaId: string) => {
    setTarefaConcluindo(tarefaId);
    concluirTarefa.mutate(tarefaId);
  };

  const enviarEmail = (colaborador: ColaboradorOnboarding) => {
    toast.success(`E-mail de boas-vindas enviado para ${colaborador.nome ?? 'o colaborador'}.`);
  };

  const acoes: OnboardingAcoes = {
    onVerOnboarding: (colaborador) => setColaboradorDetalhe(colaborador),
    onEnviarEmail: enviarEmail,
    onConcluirProxima: (tarefa) => {
      if (tarefa.id != null) concluir(String(tarefa.id));
    },
  };

  // Resumo do topo — mesma régua dos cards (uma passada só, sem recomputar).
  const resumoGeral = useMemo(() => {
    const hoje = inicioDoDia(new Date());
    let concluidos = 0;
    let emRisco = 0;
    (onboarding as ColaboradorOnboarding[]).forEach((colaborador) => {
      const progresso = progressoOnboarding(colaborador.tarefas);
      if (progresso.total > 0 && progresso.valor >= 100) concluidos += 1;
      if (resumoOnboarding(colaborador.tarefas, hoje).atrasadas > 0) emRisco += 1;
    });
    return { total: onboarding.length, concluidos, emRisco };
  }, [onboarding]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* `AnimatePresence` local, sem props — mesmo motivo (e mesma correção) do
          `OnboardingDashboard.tsx`: a rota de Admissões já vem de um
          `<AnimatePresence initial={false}>` (`PageTransition.tsx`) e esse
          `initial={false}` é lido por CONTEXTO por todo `motion.*` descendente,
          suprimindo o keyframe `hidden` desta tela. Aberto aqui, o contexto novo
          devolve a entrada em cascata — a mesma dos KPI Cards do Dashboard,
          reaproveitada de `cardVariants` (não recriada). */}
      <AnimatePresence>
        <div className="space-y-4">
          {/* RESUMO DO TOPO — leitura de dashboard, não de formulário */}
          {resumoGeral.total > 0 && (
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="font-display text-sm font-semibold text-foreground">
                {resumoGeral.total} colaborador{resumoGeral.total > 1 ? 'es' : ''} em onboarding
              </p>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {resumoGeral.total - resumoGeral.concluidos} em andamento
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  {resumoGeral.concluidos} concluído{resumoGeral.concluidos === 1 ? '' : 's'}
                </span>
                {resumoGeral.emRisco > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-destructive-vivid">
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive-vivid" />
                    {resumoGeral.emRisco} em risco
                  </span>
                )}
              </p>
            </div>
          )}

          {/* GRADE DE CARDS COMPACTOS */}
          {resumoGeral.total > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {(onboarding as ColaboradorOnboarding[]).map((colaborador, index) => (
                <motion.div
                  key={String(colaborador.id)}
                  custom={Math.min(index, ONBOARDING_MAX_STAGGER_INDEX)}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  className="h-full"
                >
                  <OnboardingCard colaborador={colaborador} acoes={acoes} />
                </motion.div>
              ))}
            </div>
          )}

          {/* ESTADO VAZIO */}
          {resumoGeral.total === 0 && (
            <Card
              className={cn(
                'rounded-2xl border-2 border-dashed border-border/50 p-12 text-center text-muted-foreground'
              )}
            >
              <Rocket className="mx-auto mb-4 h-12 w-12 opacity-20" />
              <p className="font-display font-medium">Nenhum onboarding ativo</p>
              <p className="text-sm">Inicie uma nova admissão para ver a jornada aqui.</p>
            </Card>
          )}
        </div>
      </AnimatePresence>

      <OnboardingDetalheDialog
        colaborador={colaboradorDetalhe}
        open={!!colaboradorDetalhe}
        onOpenChange={(aberto) => !aberto && setColaboradorDetalhe(null)}
        onConcluirTarefa={concluir}
        tarefaConcluindo={tarefaConcluindo}
        onEnviarEmail={enviarEmail}
      />
    </>
  );
}
