import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { useAdmissoes } from '@/hooks/useAdmissoes';
import { PageLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { NovaAdmissaoDialog } from '@/components/admissoes/NovaAdmissaoDialog';
import { DetalhesAdmissaoDialog } from '@/components/admissoes/DetalhesAdmissaoDialog';
import { UserPlus, ExternalLink, LayoutDashboard, List, History, Kanban, AlertTriangle } from 'lucide-react';
import { AdmissoesKanban } from '@/components/admissoes/AdmissoesKanban';
import { useNavigate } from 'react-router-dom';
import { useEmpresas } from '@/hooks/useEmpresas';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { contratacaoService } from '@/services/contratacaoService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdmissoesDashboard } from '@/components/admissoes/AdmissoesDashboard';
import { GestaoCandidatos } from '@/components/admissoes/GestaoCandidatos';
import type { Tables } from '@/integrations/supabase/types';

export default function AdmissoesPage() {
  const navigate = useNavigate();

  const { admissoes, isLoading, error, refetch } = useAdmissoes();
  // Sem empresa selecionada a query de admissões fica DESABILITADA
  // (`enabled: !!empresaId` no hook) e, no react-query v5, `isLoading` é false:
  // sem este aviso a tela cairia no vazio em vez de pedir a empresa.
  // `empresaAtual` é a empresa EFETIVA do hook e depende das DUAS queries
  // (`user-empresas` e `todas-empresas`); checar só `loadingEmpresas` acusaria
  // falta de empresa enquanto a segunda ainda carrega.
  const { empresaAtual, loadingEmpresas, loadingTodas } = useEmpresas();
  const semEmpresa = !loadingEmpresas && !loadingTodas && !empresaAtual?.id;
  /** Falha na consulta ou falta de empresa: nenhuma aba de dados pode afirmar saúde. */
  const dadosIndisponiveis = !!error || semEmpresa;
  // Aba ativa em estado próprio: é o que dá destino aos botões "Resolver agora"
  // dos modais do dashboard (`onAbrirAba`).
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sendingLink, setSendingLink] = useState<string | null>(null);
  const [selectedAdmissao, setSelectedAdmissao] = useState<Tables<'admissoes'> | null>(null);
  /**
   * A admissão que o modal de detalhes MANTÉM enquanto a janela sai de cena.
   * Só abrir escreve aqui; fechar zera apenas o `selectedAdmissao` (e com ele o
   * `open`), então o `key`/`admissao` do modal seguem apontando para a mesma
   * admissão durante o fechamento — é o que deixa a saída animar.
   */
  const [admissaoDoModal, setAdmissaoDoModal] = useState<Tables<'admissoes'> | null>(null);

  const handleEnviarLink = async (admissao: Tables<'admissoes'>) => {
    if (!admissao.email) {
      toast.error('Candidato sem e-mail cadastrado');
      return;
    }
    setSendingLink(admissao.id);
    try {
      if (!admissao.empresa_id) {
        toast.error('Admissão sem empresa vinculada — impossível enviar e-mail.');
        return;
      }
      const tokenData = await contratacaoService.enviarLinkCandidato(admissao.id, admissao.email);
      const link = `${window.location.origin}/contratacao?token=${tokenData.token}`;
      const result = await contratacaoService.enviarEmailLinkCandidato(
        admissao.id,
        admissao.empresa_id,
        admissao.email,
        tokenData.id
      );
      if (result.sent) {
        toast.success('Link de contratação enviado por e-mail!');
      } else {
        // Sem provedor configurado: entrega o link para o RH enviar por conta
        // própria — nunca finge que o e-mail saiu.
        await navigator.clipboard.writeText(link).catch(() => {});
        toast.info(
          result.motivo === 'email_provider_not_configured'
            ? 'Provedor de e-mail não configurado — link copiado para envio manual.'
            : 'E-mail não enviado — link copiado para envio manual.'
        );
      }
    } catch (error) {
      toast.error(safeErrorMessage(error, 'Erro ao enviar link.'));
    } finally {
      setSendingLink(null);
    }
  };

  const handleEnviarWhatsApp = async (admissao: Tables<'admissoes'>) => {
    if (!admissao.telefone) {
      toast.error('Candidato sem telefone cadastrado');
      return;
    }
    setSendingLink(admissao.id);
    try {
      const tokenData = await contratacaoService.enviarLinkCandidato(admissao.id, admissao.email || '');
      await contratacaoService.enviarWhatsApp(admissao.id, admissao.telefone, tokenData.token);

      toast.success('Link gerado para WhatsApp!');
    } catch (error) {
      toast.error(safeErrorMessage(error, 'Erro ao gerar link.'));
    } finally {
      setSendingLink(null);
    }
  };

  return (
    <>
      <PageTitle title="Admissões" description="Gestão de processos admissionais" />
      <PageLayout
        title="Admissões"
        description="Gerencie o processo de admissão de colaboradores"
        icon={<UserPlus className="h-5 w-5 text-primary-foreground" />}
        gradient="from-primary to-primary-glow"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/onboarding')}
              className="h-9 gap-1.5 rounded-xl border-border/40 px-3 text-xs"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Jornada de Onboarding
            </Button>
            <NovaAdmissaoDialog />
          </>
        }
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="dashboard" className="rounded-lg gap-2">
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="gestao" className="rounded-lg gap-2">
              <List className="h-4 w-4" /> Gestão de Candidatos
            </TabsTrigger>
            <TabsTrigger value="kanban" className="rounded-lg gap-2">
              <Kanban className="h-4 w-4" /> Kanban
            </TabsTrigger>
            <TabsTrigger value="auditoria" className="rounded-lg gap-2">
              <History className="h-4 w-4" /> Auditoria
            </TabsTrigger>
          </TabsList>

          {dadosIndisponiveis && (
            <div
              role={semEmpresa ? 'status' : 'alert'}
              className={cn(
                'flex flex-col items-center gap-3 rounded-2xl border p-8 text-center',
                semEmpresa ? 'border-border/40' : 'border-destructive/20'
              )}
            >
              <AlertTriangle className={cn('h-6 w-6', semEmpresa ? 'text-muted-foreground' : 'text-destructive')} />
              <p className="text-sm text-muted-foreground">
                {semEmpresa
                  ? 'Selecione uma empresa para carregar as admissões.'
                  : 'Falha ao carregar as admissões. Nenhum número desta tela está disponível.'}
              </p>
              {!semEmpresa && (
                <Button variant="outline" size="sm" onClick={() => void refetch()}>
                  Tentar novamente
                </Button>
              )}
            </div>
          )}

          <TabsContent value="kanban" className="space-y-4">
            {!dadosIndisponiveis &&
              (isLoading ? (
                <div className="flex justify-center p-12">
                  <Spinner size="lg" />
                </div>
              ) : (
                <AdmissoesKanban
                  admissoes={admissoes}
                  isActive={activeTab === 'kanban'}
                  sendingLink={sendingLink}
                  onEnviarLink={handleEnviarLink}
                  onEnviarWhatsApp={handleEnviarWhatsApp}
                  onOpenDetalhes={(admissao) => {
                    // Mesmos DOIS estados do resto da página (ver `admissaoDoModal`).
                    setSelectedAdmissao(admissao);
                    setAdmissaoDoModal(admissao);
                  }}
                />
              ))}
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-6">
            {!dadosIndisponiveis &&
              (isLoading ? (
                <div className="flex justify-center p-12">
                  <Spinner size="lg" />
                </div>
              ) : (
                <AdmissoesDashboard admissoes={admissoes || []} onAbrirAba={setActiveTab} />
              ))}
          </TabsContent>

          <TabsContent value="gestao" className="space-y-6">
            {!dadosIndisponiveis && (
              <GestaoCandidatos
                admissoes={admissoes}
                isLoading={isLoading}
                sendingLink={sendingLink}
                onEnviarLink={handleEnviarLink}
                onEnviarWhatsApp={handleEnviarWhatsApp}
                onOpenDetalhes={(admissao) => {
                  // Abrir guarda a admissão nos DOIS estados (o `open` e o
                  // conteúdo do modal). Ver `admissaoDoModal`.
                  setSelectedAdmissao(admissao);
                  setAdmissaoDoModal(admissao);
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="auditoria">
            <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-xs">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-sm font-display flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" /> Histórico de Auditoria - Admissões
                </CardTitle>
              </CardHeader>
              <CardContent className="py-8 text-center">
                <History className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  O monitoramento de auditoria eSocial e admissão digital está ativo.
                </p>
                <Button variant="link" className="text-xs text-primary mt-2" onClick={() => navigate('/auditoria')}>
                  Ver Logs Globais
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageLayout>

      <DetalhesAdmissaoDialog
        key={admissaoDoModal?.id ?? 'sem-admissao'}
        admissao={admissaoDoModal}
        open={!!selectedAdmissao}
        onOpenChange={(open) => !open && setSelectedAdmissao(null)}
      />
    </>
  );
}
