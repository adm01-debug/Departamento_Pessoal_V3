import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { useAdmissoes } from '@/hooks/useAdmissoes';
import { PageLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { NovaAdmissaoDialog } from '@/components/admissoes/NovaAdmissaoDialog';
import { DetalhesAdmissaoDialog } from '@/components/admissoes/DetalhesAdmissaoDialog';
import { UserPlus, LayoutDashboard, List, History, Rocket, Kanban } from 'lucide-react';
import { AdmissoesKanban } from '@/components/admissoes/AdmissoesKanban';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { contratacaoService } from '@/services/contratacaoService';
import { Tabs, TabsContent } from '@/components/ui/tabs';
// A tablist de Admissões tem a MESMA aparência da área de Colaboradores: em vez
// de recriar as classes, consome a skin exportada por `AnimatedDossieTabs`
// (fonte única da tablist do app) — container `bg-muted/50 rounded-xl p-1
// border border-border/30`, indicador `rounded-lg bg-background shadow-xs` e
// trigger transparente (`data-[state=active]:bg-transparent text-primary`),
// tudo por cima do mecanismo de `ui/animated-tabs` (indicador persistente
// movido por mola, o mesmo das duas áreas).
import {
  AnimatedDossieTabsList as AnimatedTabsList,
  AnimatedDossieTabsTrigger as AnimatedTabsTrigger,
} from '@/components/colaboradores/AnimatedDossieTabs';
import { OnboardingDashboard } from '@/components/admissoes/OnboardingDashboard';
import OnboardingPageContent from '@/components/admissoes/OnboardingPageContent';
import AuditoriaAdmissoesContent from '@/components/admissoes/AuditoriaAdmissoesContent';
import { GestaoCandidatos } from '@/components/admissoes/GestaoCandidatos';
import type { LooseRow } from '@/types/db';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
// MOCK VISUAL — ver src/mocks/admissoesMock.ts. A trilha de auditoria em si mora
// em `AuditoriaAdmissoesContent` (é lá que `getMockAuditoria()` é lida); esta
// página só usa `isMockId` para não disparar e-mail/WhatsApp reais no demo.
import { isMockId } from '@/mocks/admissoesMock';

/**
 * Rótulos de etapa, badges e cores de status da trilha de auditoria SAÍRAM daqui:
 * eles moram em `auditoriaComum.ts` (que reusa `ETAPA_LABELS`/`ETAPA_BADGE` de
 * `admissoesComum.ts` e os tons de `kanbanComum.ts`) — nada de uma terceira
 * cópia. A trilha inteira (cards, filtros, chips e tabela) vive em
 * `AuditoriaAdmissoesContent`.
 */

/**
 * Cards de Admissões com a MESMA animação de entrada dos KPI Cards do Dashboard
 * Executivo (fade + subida de 20px, cadência de 0.08s por card, 0.4s de
 * duração): `cardVariants` vem IMPORTADO de `dashboard/MetricCard.tsx` — é a
 * referência, não uma cópia — e o `motion.create(Card)` é o mesmo caminho usado
 * em `DashboardExecutivoPage.tsx`. A Motion entra no próprio nó do `<Card>`
 * (sem wrapper novo) e delegação de props/refs continua a do Radix Slot, então
 * nada muda de layout, cor, tamanho ou tipografia.
 */
const MotionCard = motion.create(Card);

/**
 * Escudo de entrada (ver comentário grande abaixo): a rota já vem de um
 * `<AnimatePresence initial={false}>` (`PageTransition.tsx`) e esse
 * `initial={false}` viaja por CONTEXTO até todo `motion.*` descendente — o
 * `use-visual-state` do Framer Motion lê `presenceContext.initial === false` no
 * momento em que o elemento MONTA e, nesse caso, pula o keyframe inicial. Como
 * cada `<TabsContent>` do Radix desmonta quando sai de cena, os cards de
 * "Gestão de Candidatos" e "Auditoria" montam DEPOIS do primeiro paint e
 * herdavam o `initial={false}` (apareciam prontos, sem cascata). Um
 * `AnimatePresence` local, sem props — contexto novo, com `initial` verdadeiro,
 * exatamente como em `OrganogramaTree.tsx`, `HistoricoColaborador.tsx`,
 * `HeadcountOverviewCard.tsx` e `OnboardingDashboard.tsx` — devolve o keyframe
 * `hidden` a cada montagem. Ele não renderiza DOM.
 */
function CardsEntrada({ children }: { children: React.ReactNode }) {
  return <AnimatePresence>{children}</AnimatePresence>;
}

/**
 * Abas internas do módulo. A ordem é a mesma da navegação: visão geral →
 * operação (candidatos/kanban) → jornada (onboarding) → conformidade.
 */
const abasAdmissoes = [
  { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { value: 'gestao', label: 'Gestão de Candidatos', icon: List },
  { value: 'kanban', label: 'Kanban', icon: Kanban },
  { value: 'onboarding', label: 'Onboarding', icon: Rocket },
  { value: 'auditoria', label: 'Auditoria', icon: History },
] as const;

export default function AdmissoesPage() {
  const navigate = useNavigate();

  const { admissoes, isLoading } = useAdmissoes();
  // Aba ativa em estado próprio: a tablist animada (AnimatedTabsList) e o
  // `<Tabs>` do Radix que controla o conteúdo leem o MESMO valor — é assim que
  // o Dossiê de Colaboradores mantém lista e painel em sincronia.
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sendingLink, setSendingLink] = useState<string | null>(null);
  const [selectedAdmissao, setSelectedAdmissao] = useState<LooseRow<'admissoes'> | null>(null);
  /**
   * A admissão que o modal de detalhes MANTÉM enquanto a janela sai de cena.
   *
   * Só o ato de ABRIR (`onOpenDetalhes`) escreve aqui. Fechar zera apenas o
   * `selectedAdmissao` (e com ele o `open`), então o `key`/`admissao` do modal
   * continuam apontando para a mesma admissão durante o fechamento — é o que
   * deixa o `AnimatePresence` (dentro do modal) animar a SAÍDA; sem isso o `key`
   * trocaria no mesmo instante e a árvore seria desmontada antes de animar.
   * Abrir OUTRA admissão segue recriando o estado interno, porque o `key` muda.
   */
  const [admissaoDoModal, setAdmissaoDoModal] = useState<LooseRow<'admissoes'> | null>(null);

  // MOCK VISUAL — a trilha de auditoria (fetch, busca, filtros e resumo) mora em
  // `AuditoriaAdmissoesContent`, que é quem lê `getMockAuditoria()`.

  const handleEnviarLink = async (admissao: any) => {
    if (!admissao.email) {
      toast.error('Candidato sem e-mail cadastrado');
      return;
    }
    // MOCK VISUAL — candidato fictício: simula o envio sem disparar e-mail real.
    if (isMockId(admissao.id)) {
      toast.success(`Link de contratação gerado para ${admissao.email} (demonstração).`);
      return;
    }
    setSendingLink(admissao.id);
    try {
      await contratacaoService.enviarLinkCandidato(admissao.id, admissao.email);
      toast.success('Link de contratação enviado com sucesso!');
    } catch (error) {
      toast.error(safeErrorMessage(error, 'Erro ao enviar link.'));
    } finally {
      setSendingLink(null);
    }
  };

  const handleEnviarWhatsApp = async (admissao: any) => {
    if (!admissao.telefone) {
      toast.error('Candidato sem telefone cadastrado');
      return;
    }
    // MOCK VISUAL — candidato fictício: simula o link sem gerar token/abrir WhatsApp.
    if (isMockId(admissao.id)) {
      toast.success(`Link de contratação preparado para ${admissao.telefone} (demonstração).`);
      return;
    }
    setSendingLink(admissao.id);
    try {
      const tokenDataRes = await contratacaoService.enviarLinkCandidato(admissao.id, admissao.email || '');
      if (!tokenDataRes.ok) throw new Error(tokenDataRes.error.message);
      const tokenData = tokenDataRes.value;
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
        actions={<NovaAdmissaoDialog />}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Tablist com a MESMA aparência da área de Colaboradores: a skin vem
            de `AnimatedDossieTabs` (container `bg-muted/50 rounded-xl p-1 border
            border-border/30`, indicador `rounded-lg bg-background shadow-xs`,
            trigger transparente com `text-primary` no estado ativo) e o
            mecanismo vem de `ui/animated-tabs` — indicador único e persistente,
            medido no trigger ativo e movido pela mola
            (`stiffness 220 / damping 24 / mass 0.7`). Quem pinta a aba ativa é
            o indicador, nunca o botão: nenhum fundo/borda instantâneo em
            `data-state=active` cobre o slide.

            LAYOUT (só desta área — cores, ícones, fonte, altura e labels não
            mudam): a tablist é `flex w-full` e cada trigger é `flex-1`, então
            as 5 abas dividem 100% da barra em partes iguais e o conteúdo de
            cada uma fica centralizado dentro da própria célula. Nada é
            dimensionado pelo texto (`w-fit`/`max-content`) — era isso que
            deixava as abas amontoadas à esquerda com sobra à direita em telas
            largas.
            `flex-1` (= `flex: 1 1 0%`) mantém o `min-width: auto` do flex:
            quando a célula igual não couber o rótulo (abaixo de ~1270px de
            viewport, onde "Gestão de Candidatos" já pede 190px), a aba para no
            tamanho natural do conteúdo em vez de cortar/apagar texto, e o
            `overflow-x-auto` do container assume com scroll — mesma leitura de
            hoje no mobile, sem nenhuma altura nova. */}
          <AnimatedTabsList value={activeTab} onValueChange={setActiveTab} listClassName="flex w-full items-stretch">
            {abasAdmissoes.map(({ value, label, icon: Icon }) => (
              <AnimatedTabsTrigger key={value} value={value} className="flex-1">
                <Icon className="h-3.5 w-3.5" /> {label}
              </AnimatedTabsTrigger>
            ))}
          </AnimatedTabsList>

          <TabsContent value="kanban" className="mt-6 space-y-4">
            {isLoading ? (
              <div className="flex justify-center p-12">
                <Spinner size="lg" />
              </div>
            ) : (
              <AdmissoesKanban
                isActive={activeTab === 'kanban'}
                admissoes={(admissoes as any[]) || []}
                sendingLink={sendingLink}
                onEnviarLink={handleEnviarLink}
                onEnviarWhatsApp={handleEnviarWhatsApp}
                // Mesmo destino da tabela de candidatos (ver `GestaoCandidatos`):
                // guarda a admissão nos DOIS estados — o `open` e o conteúdo modal.
                onOpenDetalhes={(admissao) => {
                  setSelectedAdmissao(admissao);
                  setAdmissaoDoModal(admissao);
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="dashboard" className="mt-6 space-y-6">
            {isLoading ? (
              <div className="flex justify-center p-12">
                <Spinner size="lg" />
              </div>
            ) : (
              // `onAbrirAba` dá destino REAL aos botões "Resolver agora" dos
              // modais do dashboard (Ações Prioritárias → "Gestão de Candidatos",
              // onde ficam a validação do documento e o reenvio do link de
              // contratação). Sem essa prop os modais continuam funcionando: eles
              // apenas não exibem o botão quando o único destino seria uma aba
              // interna do próprio módulo.
              <OnboardingDashboard admissoes={admissoes || []} onAbrirAba={(aba) => setActiveTab(aba)} />
            )}
          </TabsContent>

          <TabsContent value="onboarding" className="mt-6 space-y-6">
            <OnboardingPageContent />
          </TabsContent>

          <TabsContent value="gestao" className="mt-6 space-y-6">
            {/* `CardsEntrada` (mesmo escudo de contexto da aba Auditoria):
                sem ele, o `initial={false}` publicado pela rota
                (`PageTransition.tsx`) viaja por CONTEXTO até os `motion.div`
                internos dos overlays desta tela (`SelectContent`/
                `DropdownMenuContent`) — o Radix os monta em PORTAL, mas o
                contexto React atravessa o portal — e o menu abre "seco", sem o
                keyframe de abertura do sistema. O `AnimatePresence` local, sem
                props, cria um contexto novo com `initial` verdadeiro. */}
            <CardsEntrada>
              <GestaoCandidatos
                admissoes={admissoes || []}
                isLoading={isLoading}
                sendingLink={sendingLink}
                onEnviarLink={handleEnviarLink}
                onEnviarWhatsApp={handleEnviarWhatsApp}
                onOpenDetalhes={(admissao) => {
                  // Abre a janela: guarda a admissão nos DOIS estados (o `open` e
                  // o conteúdo do modal). Ver `admissaoDoModal`.
                  setSelectedAdmissao(admissao);
                  setAdmissaoDoModal(admissao);
                }}
              />
            </CardsEntrada>
          </TabsContent>

          <TabsContent value="auditoria" className="mt-6">
            {/* `CardsEntrada` (ver comentário no topo do arquivo): o painel desta aba
                monta depois do primeiro paint — o Radix desmonta a aba inativa — e por
                isso precisa do contexto de presença local para não herdar o
                `initial={false}` que a rota publica (`PageTransition.tsx`). */}
            <CardsEntrada>
              <AuditoriaAdmissoesContent />
            </CardsEntrada>
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
