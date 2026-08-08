import { PageTitle } from '@/components/PageTitle';
import { cn } from '@/lib/utils';
import { PageLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Rocket, CheckCircle2, Clock, UserPlus, Package, Mail, ListTodo, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

export default function OnboardingPage() {
  const [activeTab, setActiveTab] = useState('ativos');
  const qc = useQueryClient();

  const { data: onboarding = [], isLoading } = useQuery({
    queryKey: ['onboarding-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admissoes')
        .select(`
          *,
          tarefas:tarefas_onboarding(*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const concluirTarefa = useMutation({
    mutationFn: async (tarefaId: string) => {
      const { error } = await supabase
        .from('tarefas_onboarding')
        .update({ concluida: true, concluida_em: new Date().toISOString() })
        .eq('id', tarefaId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['onboarding-list'] });
      toast.success('Tarefa concluída!');
    }
  });

  const getProgresso = (tarefas: any[]) => {
    if (!tarefas || tarefas.length === 0) return 0;
    const concluidas = tarefas.filter(t => t.concluida).length;
    return Math.round((concluidas / tarefas.length) * 100);
  };

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

          <TabsContent value="ativos">
            {isLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {onboarding
                  .filter(o => getProgresso(o.tarefas) < 100)
                  .map((colab) => (
                    <motion.div key={colab.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <Card className="border-border/40 hover:shadow-elevated transition-all overflow-hidden">
                        <div className="h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg font-display">{colab.nome}</CardTitle>
                              <CardDescription>{colab.cargo} • {colab.departamento}</CardDescription>
                            </div>
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                              D-{Math.ceil((new Date(colab.data_prevista).getTime() - new Date().getTime()) / (1000 * 3600 * 24))} dias
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[11px] font-bold uppercase text-muted-foreground">
                              <span>Progresso do Onboarding</span>
                              <span>{getProgresso(colab.tarefas)}%</span>
                            </div>
                            <Progress value={getProgresso(colab.tarefas)} className="h-1.5 bg-muted" />
                          </div>

                          <div className="space-y-2 pt-2">
                            <p className="text-xs font-bold flex items-center gap-1.5 text-muted-foreground uppercase">
                              <ListTodo className="h-3 w-3" /> Tarefas Críticas
                            </p>
                            {colab.tarefas?.map((tarefa: any) => (
                              <div key={tarefa.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/10 group">
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors",
                                    tarefa.concluida ? "bg-success border-success" : "border-muted-foreground/30"
                                  )}>
                                    {tarefa.concluida && <CheckCircle2 className="h-3 w-3 text-white" />}
                                  </div>
                                  <span className={cn("text-xs font-medium", tarefa.concluida && "line-through text-muted-foreground")}>
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
                          </div>

                          <Button variant="outline" className="w-full rounded-xl text-xs gap-2 border-dashed">
                            <Mail className="h-3.5 w-3.5" /> Enviar E-mail de Boas-Vindas
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="concluidos">
            <Card className="rounded-2xl border-dashed border-2 p-12 text-center text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-20 text-success" />
              <p className="font-display font-medium">Histórico de Integrações Concluídas</p>
              <p className="text-sm">Todos os colaboradores recentes já estão 100% integrados.</p>
            </Card>
          </TabsContent>

          <TabsContent value="kits">
             <div className="grid gap-6 md:grid-cols-3">
               <Card className="p-6 flex flex-col items-center text-center gap-3 border-border/40 bg-card/50">
                 <div className="h-12 w-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                   <Package className="h-6 w-6" />
                 </div>
                 <div>
                   <h3 className="font-bold">Kit Desenvolvedor</h3>
                   <p className="text-xs text-muted-foreground">MacBook M3, Monitor 27", Headset</p>
                 </div>
                 <Button variant="outline" size="sm" className="rounded-xl w-full">Gerenciar Kit</Button>
               </Card>
               <button className="border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2 hover:border-primary/40 hover:bg-primary/5 transition-all text-muted-foreground">
                 <UserPlus className="h-8 w-8 opacity-20" />
                 <span className="text-sm font-bold">Novo Perfil de Kit</span>
               </button>
             </div>
          </TabsContent>
        </Tabs>
      </PageLayout>
    </>
  );
}
