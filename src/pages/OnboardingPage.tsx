/**
 * Rota `/onboarding` (item "Onboarding" da sidebar).
 *
 * REDESENHO: a listagem deixou de ser uma pilha de cards ALTOS com o checklist
 * sempre aberto e passou a ser a MESMA grade de cards compactos da aba
 * "Onboarding" do módulo de Admissões — reusa `OnboardingCard` (dashboard de
 * acompanhamento) e `OnboardingDetalheDialog` (checklist completo, aberto por
 * "Ver onboarding"). Assim as duas portas da área de onboarding mostram a mesma
 * linguagem, sem uma segunda cópia que pudesse divergir.
 *
 * As abas "Em Andamento" e "Concluídos" dividem o MESMO dado por progresso; o
 * mock demonstrativo continua alimentando as duas. A aba "Gestão de Kits"
 * segue como estava (fora do escopo do redesenho).
 */
import { PageTitle } from '@/components/PageTitle';
import { PageLayout } from '@/components/layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Rocket, CheckCircle2, Clock, UserPlus, Package, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';
import { cardVariants } from '@/components/dashboard/MetricCard';
// MOCK VISUAL — ver src/mocks/admissoesMock.ts
import { isAdmissoesMockEnabled, getMockOnboarding, mockConcluirTarefaOnboarding } from '@/mocks/admissoesMock';
import { OnboardingCard, type OnboardingAcoes } from '@/components/admissoes/OnboardingCard';
import { OnboardingDetalheDialog } from '@/components/admissoes/OnboardingDetalheDialog';
import { progressoOnboarding, type ColaboradorOnboarding } from '@/components/admissoes/onboardingDerivacoes';

/** Teto do `custom` da cascata (mesma trava das outras grades do produto). */
const MAX_STAGGER_INDEX = 5;

export default function OnboardingPage() {
  const [activeTab, setActiveTab] = useState('ativos');
  const qc = useQueryClient();
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
      qc.invalidateQueries({ queryKey: ['onboarding-list'] });
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

  const lista = onboarding as ColaboradorOnboarding[];
  const emAndamento = lista.filter((o) => progressoOnboarding(o.tarefas).valor < 100);
  const concluidos = lista.filter((o) => {
    const p = progressoOnboarding(o.tarefas);
    return p.total > 0 && p.valor >= 100;
  });

  return (
    <>
      <PageTitle title="Onboarding" description="Acompanhamento de novos colaboradores" />
      <PageLayout
        title="Jornada de Onboarding"
        description="Gestão de boas-vindas, equipamentos e acessos 10/10"
        icon={<Rocket className="h-5 w-5 text-primary-foreground" />}
        gradient="from-indigo-600 to-purple-600"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="ativos" className="rounded-lg gap-2">
              <Clock className="h-4 w-4" /> Em Andamento
            </TabsTrigger>
            <TabsTrigger value="concluidos" className="rounded-lg gap-2">
              <CheckCircle2 className="h-4 w-4" /> Concluídos
            </TabsTrigger>
            <TabsTrigger value="kits" className="rounded-lg gap-2">
              <Package className="h-4 w-4" /> Gestão de Kits
            </TabsTrigger>
          </TabsList>

          {/* `AnimatePresence` local (ver comentário em OnboardingPageContent). */}
          <AnimatePresence>
            <TabsContent value="ativos">
              {isLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : emAndamento.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {emAndamento.map((colaborador, index) => (
                    <motion.div
                      key={String(colaborador.id)}
                      custom={Math.min(index, MAX_STAGGER_INDEX)}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      className="h-full"
                    >
                      <OnboardingCard colaborador={colaborador} acoes={acoes} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <Card className="rounded-2xl border-2 border-dashed border-border/50 p-12 text-center text-muted-foreground">
                  <Rocket className="mx-auto mb-4 h-12 w-12 opacity-20" />
                  <p className="font-display font-medium">Nenhum onboarding ativo</p>
                  <p className="text-sm">Inicie uma nova admissão para ver a jornada aqui.</p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="concluidos">
              {concluidos.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {concluidos.map((colaborador, index) => (
                    <motion.div
                      key={String(colaborador.id)}
                      custom={Math.min(index, MAX_STAGGER_INDEX)}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      className="h-full"
                    >
                      <OnboardingCard colaborador={colaborador} acoes={acoes} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <Card className="rounded-2xl border-2 border-dashed border-border/50 p-12 text-center text-muted-foreground">
                  <CheckCircle2 className="mx-auto mb-4 h-12 w-12 opacity-20 text-success" />
                  <p className="font-display font-medium">Histórico de Integrações Concluídas</p>
                  <p className="text-sm">Todos os colaboradores recentes já estão 100% integrados.</p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="kits">
              <div className="grid gap-6 md:grid-cols-3">
                <Card className="flex flex-col items-center gap-3 border-border/40 bg-card/50 p-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-medium">Kit Desenvolvedor</h3>
                    <p className="text-xs text-muted-foreground">MacBook M3, Monitor 27", Headset</p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full rounded-xl">
                    Gerenciar Kit
                  </Button>
                </Card>
                <button className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5">
                  <UserPlus className="h-8 w-8 opacity-20" />
                  <span className="text-sm font-medium">Novo Perfil de Kit</span>
                </button>
              </div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </PageLayout>

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
