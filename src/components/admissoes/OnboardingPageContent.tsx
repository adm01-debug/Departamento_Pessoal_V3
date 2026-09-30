import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Rocket, CheckCircle2, Mail, ListTodo, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { cardVariants } from '@/components/dashboard/MetricCard';
// MOCK VISUAL — ver src/mocks/admissoesMock.ts
import { isAdmissoesMockEnabled, getMockOnboarding, mockConcluirTarefaOnboarding } from '@/mocks/admissoesMock';

/**
 * Teto do `custom` (posição do card na fila da cascata) — MESMA trava de
 * `ColaboradorDirectoryGrid.tsx`/`DIRECTORY_MAX_STAGGER_INDEX`. A lista de
 * integrações em andamento pode ser longa: com a cadência real do `cardVariants`
 * (0.08s por card) o último card entraria segundos depois do primeiro. Do 6º
 * card em diante todos entram na mesma leva, preservando a leitura esquerda →
 * direita, linha de cima antes da de baixo.
 */
const ONBOARDING_MAX_STAGGER_INDEX = 5;

export default function OnboardingPageContent() {
  const queryClient = useQueryClient();
  // MOCK VISUAL — ver src/mocks/admissoesMock.ts (dev + VITE_ADMISSOES_MOCK=true).
  const mockAtivo = isAdmissoesMockEnabled();

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
  });

  const getProgresso = (tarefas: any[]) => {
    if (!tarefas || tarefas.length === 0) return 0;
    const concluidas = tarefas.filter((t) => t.concluida).length;
    return Math.round((concluidas / tarefas.length) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    /* `AnimatePresence` local, sem props — mesmo motivo (e mesma correção) do
       `OnboardingDashboard.tsx`: a rota de Admissões já vem de um
       `<AnimatePresence initial={false}>` (`PageTransition.tsx`) e esse
       `initial={false}` é lido por CONTEXTO por todo `motion.*` descendente,
       suprimindo o keyframe `hidden` desta tela. Aberto aqui, o contexto novo
       (initial=true) devolve a entrada em cascata — a mesma dos KPI Cards do
       Dashboard Executivo, reaproveitada de `cardVariants` (não recriada). Não
       adiciona elemento nenhum ao DOM: cada card continua sendo o MESMO
       `<div>` que envolve o `<Card>` (o wrapper é o grid item; movê-lo para o
       `<Card>` mudaria a altura dos cards da linha). */
    <AnimatePresence>
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {onboarding
            .filter((o) => getProgresso(o.tarefas) < 100)
            .map((colab, index) => (
              <motion.div
                key={colab.id}
                custom={Math.min(index, ONBOARDING_MAX_STAGGER_INDEX)}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
              >
                <Card className="border-border/40 hover:shadow-elevated transition-all overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg font-display">{colab.nome}</CardTitle>
                        <CardDescription>
                          {colab.cargo} • {colab.departamento}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                        Início em: {new Date(colab.data_prevista).toLocaleDateString('pt-BR')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-medium uppercase text-muted-foreground">
                        <span>Progresso do Onboarding</span>
                        <span>{getProgresso(colab.tarefas)}%</span>
                      </div>
                      <Progress value={getProgresso(colab.tarefas)} className="h-1.5 bg-muted" />
                    </div>

                    <div className="space-y-2 pt-2">
                      <p className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground uppercase">
                        <ListTodo className="h-3 w-3" /> Tarefas Críticas
                      </p>
                      {colab.tarefas?.map((tarefa: any) => (
                        <div
                          key={tarefa.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/10 group"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors',
                                tarefa.concluida ? 'bg-success border-success' : 'border-muted-foreground/30'
                              )}
                            >
                              {tarefa.concluida && <CheckCircle2 className="h-3 w-3 text-white" />}
                            </div>
                            <span
                              className={cn(
                                'text-xs font-medium',
                                tarefa.concluida && 'line-through text-muted-foreground'
                              )}
                            >
                              {tarefa.titulo}
                            </span>
                          </div>
                          {!tarefa.concluida && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[10px] hover:bg-success/10 hover:text-success opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => concluirTarefa.mutate(tarefa.id)}
                            >
                              Concluir
                            </Button>
                          )}
                        </div>
                      ))}
                      {(!colab.tarefas || colab.tarefas.length === 0) && (
                        <p className="text-[10px] text-muted-foreground text-center py-2">
                          Nenhuma tarefa pendente para esta etapa.
                        </p>
                      )}
                    </div>

                    <Button variant="outline" className="w-full rounded-xl text-xs gap-2 border-dashed">
                      <Mail className="h-3.5 w-3.5" /> Enviar E-mail de Boas-Vindas
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
        </div>

        {onboarding.length === 0 && (
          <Card className="rounded-2xl border-dashed border-2 p-12 text-center text-muted-foreground">
            <Rocket className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="font-display font-medium">Nenhum onboarding ativo</p>
            <p className="text-sm">Inicie uma nova admissão para ver a jornada aqui.</p>
          </Card>
        )}
      </div>
    </AnimatePresence>
  );
}
