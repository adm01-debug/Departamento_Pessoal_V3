import { PageTitle } from '@/components/PageTitle';
import { useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { AnimatedTabsList, AnimatedTabsTrigger } from '@/components/ui/animated-tabs';
import { avaliacaoService } from '@/services/avaliacaoService';
import { colaboradorService } from '@/services';
import { useEmpresas } from '@/hooks';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Target, Users, TrendingUp, LayoutGrid, History, BarChart2, Calendar } from 'lucide-react';
import { PerformanceDashboard } from '@/components/avaliacao/PerformanceDashboard';
import { TodosCiclosTable } from '@/components/avaliacao/TodosCiclosTable';
import { NovoCicloDialog } from '@/components/avaliacao/NovoCicloDialog';
import { NineBoxTab } from '@/components/avaliacao/NineBoxTab';
// Modo real + ponte de criação auditada (idempotência por operação).
import { modoRealAtivo } from '@/components/avaliacao/nineBoxModo';
import {
  assinaturaFeedback,
  criarChaveIdempotente,
  payloadCriacaoSegura,
  type ChaveIdempotente,
} from '@/components/avaliacao/criacaoFeedback';
import { PerformanceAuditTimeline } from '@/components/avaliacao/PerformanceAuditTimeline';
import { EntradaPresenca } from '@/components/avaliacao/entradaCards';
import { FeedbacksTab } from '@/components/avaliacao/FeedbacksTab';
import { MetasOKRsTab } from '@/components/avaliacao/MetasOKRsTab';
import { PdiTab } from '@/components/avaliacao/PdiTab';
import { cn } from '@/lib/utils';
import { formatarPeriodo } from '@/components/avaliacao/desempenhoComum';
// MOCK VISUAL — ver src/mocks/desempenhoMock.ts.
import {
  bloquearEscritaDesempenho,
  getMockCiclos,
  getMockCompetencias,
  getMockFeedbacks,
  getMockMetas,
  getMockPdis,
  isDesempenhoMockEnabled,
} from '@/mocks/desempenhoMock';

/**
 * Navegação da área — mesma ordem, rótulos e ícones de antes (nada de conteúdo
 * novo). Fica numa lista única só para os SEIS triggers compartilharem a mesma
 * pele e o layout de 6 colunas iguais do desktop.
 */
const ABAS = [
  { valor: 'ciclos', rotulo: 'Ciclos', icone: BarChart2 },
  { valor: 'metas', rotulo: 'Metas & OKRs', icone: Target },
  { valor: 'feedbacks', rotulo: 'Feedbacks', icone: Users },
  { valor: 'pdis', rotulo: 'PDI', icone: TrendingUp },
  { valor: 'ninebox', rotulo: 'Nine-Box', icone: LayoutGrid },
  { valor: 'auditoria', rotulo: 'Auditoria', icone: History },
] as const;

/**
 * Pele do trigger da TabList. Como o botão deixa de vir do `ui/tabs.tsx` (que
 * pintava a aba ativa com `bg-background` + `shadow-xs` de forma INSTANTÂNEA),
 * a string traz aqui a mesma base neutra — `inline-flex`, centralização,
 * `font-medium`, foco (`ring`) — acrescida do layout do módulo:
 *   • `h-8` — cabe no box de 34px do strip de 44px sem gerar rolagem;
 *   • `lg:w-full` — cada aba ocupa 1/6 do grid;
 *   • `group` + `data-[state=active]` — os filhos (`CLASSE_ABA_ICONE` e
 *     `CLASSE_ABA_TEXTO`) reagem à seleção.
 * NÃO há mais `::after` (a linha lime) nem fundo no estado ativo: quem pinta a
 * aba selecionada é o indicador deslizante do `ui/animated-tabs` — o MESMO de
 * Admissões. Manter o sublinhado estático aqui somaria um segundo indicador
 * "saltando" enquanto a pílula desliza.
 */
const CLASSE_ABA =
  'group relative inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50 lg:w-full';
const CLASSE_ABA_ICONE =
  'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-data-[state=active]:text-primary';
const CLASSE_ABA_TEXTO =
  'min-w-0 truncate text-muted-foreground transition-colors group-data-[state=active]:text-foreground';

export default function AvaliacaoPage() {
  const { empresaAtual } = useEmpresas();
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState('ciclos');
  // Ciclo em destaque no painel; `undefined` = usuário ainda não escolheu
  // (o padrão passa a ser o ciclo ativo detectado nos dados reais).
  const [cicloSelecionadoId, setCicloSelecionadoId] = useState<string | undefined>(undefined);

  // === Queries ===
  // MOCK VISUAL — ver src/mocks/desempenhoMock.ts. Com o mock ligado, cada
  // leitura curto-circuita a chamada ao Supabase; `enabled` também passa a
  // valer sem empresa ativa (a área mostra os dados fictícios de demonstração).
  const mockAtivo = isDesempenhoMockEnabled();

  /* ── IDEMPOTÊNCIA DA CRIAÇÃO (modo real) ──────────────────────────────────
     A chave da operação nasce UMA vez por tentativa do formulário e é
     reaproveitada em TODO reenvio da MESMA tentativa (duplo clique, erro de
     rede, retry). Só uma operação NOVA ganha chave nova: conteúdo alterado ou
     criação já confirmada pelo servidor (ver `onSuccess`).                  */
  const chaveFeedbackRef = useRef<ChaveIdempotente | null>(null);
  // Inicialização preguiçosa no formato aceito pela regra `react-hooks/refs`
  // (`ref.current == null`): a fábrica é criada UMA vez por montagem.
  if (chaveFeedbackRef.current == null) chaveFeedbackRef.current = criarChaveIdempotente();

  /* ── Chaves das operações de APROVAÇÃO do gestor ──────────────────────────
     A MESMA fábrica da criação: uma chave por operação (enviar / decidir /
     validar), reaproveitada na retentativa da MESMA tentativa e trocada depois
     do sucesso confirmado pelo servidor. */
  const chaveEnvioRef = useRef<ChaveIdempotente | null>(null);
  const chaveDecisaoRef = useRef<ChaveIdempotente | null>(null);
  const chaveValidacaoRef = useRef<ChaveIdempotente | null>(null);
  if (chaveEnvioRef.current == null) chaveEnvioRef.current = criarChaveIdempotente();
  if (chaveDecisaoRef.current == null) chaveDecisaoRef.current = criarChaveIdempotente();
  if (chaveValidacaoRef.current == null) chaveValidacaoRef.current = criarChaveIdempotente();

  /**
   * Papel REAL do usuário no fluxo — o servidor revalida SEMPRE (esta leitura só
   * evita oferecer um controle que a RPC recusaria): `admin`/`rh` enviam e
   * validam; `gestor` decide. Mesma leitura de `FeedbackAcoesRodape`.
   */
  const papel = useMemo(() => {
    const roles = (user?.roles ?? []).map((r) => String(r).toLowerCase().trim());
    if (isAdmin || roles.includes('admin')) return 'admin';
    if (roles.includes('rh')) return 'rh';
    if (roles.includes('gestor')) return 'gestor';
    if (roles.includes('user')) return 'user';
    return null;
  }, [user, isAdmin]);
  /**
   * Mocks (VISUALIZAÇÃO aprovada) + registros REAIS do banco, sem duplicar.
   * Os fictícios NUNCA são enviados ao banco (a guarda recusa `mock-*`); a leitura
   * real é best-effort — se indisponível, a tela aprovada permanece idêntica.
   */
  const mesclar = async (mock: unknown[] | undefined, real: () => Promise<unknown[]>): Promise<any[]> => {
    const m = mock ?? [];
    if (!empresaAtual?.id) return m;
    try {
      const r = await real();
      const ids = new Set(m.map((x) => String((x as { id?: unknown })?.id ?? '')));
      return [...m, ...r.filter((x) => !ids.has(String((x as { id?: unknown })?.id ?? '')))];
    } catch {
      return m;
    }
  };

  const { data: ciclos = [], isLoading: loadCiclos } = useQuery({
    queryKey: ['ciclos_avaliacao', empresaAtual?.id],
    queryFn: (): Promise<any[]> => mesclar(getMockCiclos(), () => avaliacaoService.listarCiclos(empresaAtual!.id)),
    enabled: !!empresaAtual?.id || mockAtivo,
  });
  const { data: metas = [], isLoading: loadMetas } = useQuery({
    queryKey: ['metas_okrs', empresaAtual?.id],
    queryFn: (): Promise<any[]> => mesclar(getMockMetas(), () => avaliacaoService.listarMetas(empresaAtual!.id)),
    enabled: !!empresaAtual?.id || mockAtivo,
  });
  const { data: feedbacks = [], isLoading: loadFeedbacks } = useQuery({
    queryKey: ['feedbacks_360', empresaAtual?.id],
    queryFn: (): Promise<any[]> => mesclar(getMockFeedbacks(), () => avaliacaoService.listarFeedbacks(empresaAtual!.id)),
    enabled: !!empresaAtual?.id || mockAtivo,
  });
  const { data: pdis = [], isLoading: loadPDIs } = useQuery({
    queryKey: ['pdis', empresaAtual?.id],
    queryFn: (): Promise<any[]> => mesclar(getMockPdis(), () => avaliacaoService.listarPDIs(empresaAtual!.id)),
    enabled: !!empresaAtual?.id || mockAtivo,
  });
  const { data: competencias = [], isLoading: loadComp } = useQuery({
    queryKey: ['competencias', empresaAtual?.id],
    queryFn: (): Promise<any[]> =>
      mesclar(getMockCompetencias(), () => avaliacaoService.listarCompetencias(empresaAtual!.id)),
    enabled: !!empresaAtual?.id || mockAtivo,
  });
  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores', empresaAtual?.id],
    // VISUAL: lista aprovada (com os fictícios) + os REAIS do banco, para que o
    // formulário consiga selecionar colaborador/avaliador com IDs válidos (UUID).
    queryFn: () =>
      mesclar(undefined, async () => [
        ...(await colaboradorService.list(empresaAtual!.id)),
        ...(await colaboradorService.list(empresaAtual!.id, true)),
      ]),
    enabled: !!empresaAtual?.id,
  });

  /** Opções REAIS (UUID) para os formulários — nunca `mock-*` (recusado na escrita). */
  const semFicticios = (lista: any[]) =>
    lista.filter((x) => !String((x as { id?: unknown })?.id ?? '').startsWith('mock-'));
  const colaboradoresReais = useMemo(() => semFicticios(colaboradores), [colaboradores]);
  const ciclosReais = useMemo(() => semFicticios(ciclos), [ciclos]);

  // === Mutations ===
  // MOCK VISUAL — ver src/mocks/desempenhoMock.ts. Cada escrita é abortada com
  // um toast de demonstração quando o mock está ligado (os `colaborador_id`
  // fictícios não existem no banco); o `throw` evita o toast de sucesso.

  /** Empresa ativa é pré-requisito de QUALQUER escrita (isolamento por tenant). */
  const empresaDaEscrita = (): string => {
    const id = String(empresaAtual?.id ?? '').trim();
    if (!id) {
      throw new Error('Empresa ativa não identificada. Recarregue a página e tente novamente.');
    }
    return id;
  };

  /** Mensagem REAL do Supabase/PostgREST — nunca um genérico que esconde a causa. */
  const mensagemDeErro = (erro: unknown): string => {
    const e = erro as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown } | null;
    const base = String(e?.message ?? (erro instanceof Error ? erro.message : erro) ?? '').trim();
    const detalhe = [e?.details, e?.hint]
      .map((x) => String(x ?? '').trim())
      .filter(Boolean)
      .join(' · ');
    const codigo = String(e?.code ?? '').trim();
    const sufixo = [codigo, detalhe].filter(Boolean).join(' · ');
    return sufixo ? `${base} [${sufixo}]` : base || 'erro inesperado.';
  };

  const criarCiclo = useMutation({
    mutationFn: (d: any) => {
      if (bloquearEscritaDesempenho('Criar ciclo de avaliação')) return Promise.reject(new Error('mock'));
      return avaliacaoService.criarCiclo({ ...d, empresa_id: empresaDaEscrita() });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ciclos_avaliacao'] });
      toast.success('Ciclo criado!');
    },
    onError: (erro: unknown) => {
      if (isDesempenhoMockEnabled()) return; // o aviso de demonstração já apareceu
      toast.error(`Ciclo NÃO criado: ${mensagemDeErro(erro)}`);
    },
  });

  const criarMeta = useMutation({
    mutationFn: (d: any) => {
      if (bloquearEscritaDesempenho('Criar meta/OKR')) return Promise.reject(new Error('mock'));
      return avaliacaoService.criarMeta({ ...d, empresa_id: empresaDaEscrita() });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['metas_okrs'] });
      toast.success('Meta criada!');
    },
    onError: (erro: unknown) => {
      if (isDesempenhoMockEnabled()) return;
      toast.error(`Meta NÃO criada: ${mensagemDeErro(erro)}`);
    },
  });

  const criarFeedback = useMutation<any, unknown, any>({
    mutationFn: (d: any) => {
      /* GRAVAÇÃO REAL pelo formulário existente: SEMPRE pela RPC implantada
         `criar_feedback_seguro` (feedback + auditoria na MESMA transação). Os
         campos são os MESMOS do formulário e a chave de idempotência é
         reaproveitada em todo reenvio desta tentativa (duplo clique/erro de rede
         não duplica). Se algum ID for fictício (`mock-*`), a guarda de escrita
         (`exigirEscritaOperacional`) recusa ANTES da rede — nunca enviamos mock. */
      const idOperacao = chaveFeedbackRef.current!.para(assinaturaFeedback(d));
      const params = payloadCriacaoSegura(d, { empresaId: empresaDaEscrita(), idOperacao });
      if (!params) return Promise.reject(new Error('Dados incompletos para registrar o feedback.'));
      return avaliacaoService.criarFeedbackSeguro(params);
    },
    onSuccess: (_resposta: any, dadosEnviados: any) => {
      // Sucesso SÓ depois da resposta do servidor: a tentativa está confirmada,
      // logo a próxima criação é uma operação nova (chave nova). A atualização
      // das listas também acontece aqui — nunca antes de gravar.
      chaveFeedbackRef.current?.confirmar();
      // Foca o ciclo do registro criado para que ele APAREÇA na listagem
      // (a lista respeita o filtro de ciclo selecionado no topo).
      const cicloCriado = String((dadosEnviados as { ciclo_id?: unknown })?.ciclo_id ?? '').trim();
      if (cicloCriado) setCicloSelecionadoId(cicloCriado);
      qc.invalidateQueries({ queryKey: ['feedbacks_360'] });
      toast.success('Feedback registrado!');
    },
    onError: (erro: unknown) => {
      // Nada de sucesso falso: o motivo REAL (autorização, validação, rede) vai
      // para o aviso. A chave é MANTIDA — reenviar a mesma tentativa é seguro.
      if (isDesempenhoMockEnabled()) return; // o aviso de demonstração já apareceu
      toast.error(`Feedback NÃO registrado: ${mensagemDeErro(erro)}`);
    },
  });

  const criarPDI = useMutation({
    mutationFn: (d: any) => {
      if (bloquearEscritaDesempenho('Criar PDI')) return Promise.reject(new Error('mock'));
      return avaliacaoService.criarPDI({ ...d, empresa_id: empresaDaEscrita() });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pdis'] });
      toast.success('PDI criado!');
    },
    onError: (erro: unknown) => {
      if (isDesempenhoMockEnabled()) return;
      toast.error(`PDI NÃO criado: ${mensagemDeErro(erro)}`);
    },
  });

  const excluirCiclo = useMutation({
    mutationFn: (c: any) => {
      if (bloquearEscritaDesempenho('Excluir ciclo de avaliação')) return Promise.reject(new Error('mock'));
      return avaliacaoService.excluirCiclo(c.id, empresaDaEscrita());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ciclos_avaliacao'] });
      toast.success('Ciclo excluído!');
    },
    onError: (erro: unknown) => {
      if (isDesempenhoMockEnabled()) return;
      toast.error(`Ciclo NÃO excluído: ${mensagemDeErro(erro)}`);
    },
  });

  /* ── Mutations da APROVAÇÃO DO GESTOR ─────────────────────────────────────
     Cada uma monta a chave de idempotência da PRÓPRIA tentativa (nunca do
     conteúdo) e chama a RPC correspondente. Sucesso só DEPOIS da resposta do
     servidor; o erro mostra o motivo REAL (autorização, vínculo gestor↔
     colaborador, versão da avaliação, rede). */
  const enviarAprovacao = useMutation({
    mutationFn: (p: { colaboradorId: string; cicloId: string }) => {
      const idOperacao = chaveEnvioRef.current!.para(`${p.colaboradorId}|${p.cicloId}`);
      return avaliacaoService.enviarAvaliacaoAoGestor({ ...p, idOperacao });
    },
    onSuccess: () => {
      chaveEnvioRef.current?.confirmar();
      qc.invalidateQueries({ queryKey: ['feedbacks_360_consolidacoes'] });
      qc.invalidateQueries({ queryKey: ['feedbacks_360_aprovacoes_gestor'] });
      toast.success('Avaliação enviada ao gestor para aprovação!');
    },
    onError: (erro: unknown) => {
      if (isDesempenhoMockEnabled()) return;
      toast.error(`Envio NÃO realizado: ${mensagemDeErro(erro)}`);
    },
  });

  const decidirAprovacao = useMutation({
    mutationFn: (d: {
      colaboradorId: string;
      cicloId: string;
      decisao: 'aprovado' | 'devolvido';
      justificativa?: string | null;
    }) => {
      const idOperacao = chaveDecisaoRef.current!.para(`${d.colaboradorId}|${d.cicloId}|${d.decisao}`);
      return avaliacaoService.decidirAprovacaoGestor({ ...d, idOperacao });
    },
    onSuccess: (_resposta: any, enviado: any) => {
      chaveDecisaoRef.current?.confirmar();
      qc.invalidateQueries({ queryKey: ['feedbacks_360_aprovacoes_gestor'] });
      qc.invalidateQueries({ queryKey: ['feedbacks_360_consolidacoes'] });
      toast.success(
        enviado?.decisao === 'devolvido' ? 'Avaliação devolvida para correção.' : 'Avaliação aprovada pelo gestor!'
      );
    },
    onError: (erro: unknown) => {
      if (isDesempenhoMockEnabled()) return;
      toast.error(`Decisão NÃO registrada: ${mensagemDeErro(erro)}`);
    },
  });

  /** RH valida o Potencial — último passo antes da classificação do Nine-Box. */
  const validarPotencialAprovacao = useMutation({
    mutationFn: (p: { feedbackId: string }) => {
      const idOperacao = chaveValidacaoRef.current!.para(p.feedbackId);
      return avaliacaoService.validarPotencialAvaliacao({ feedbackId: p.feedbackId, idOperacao, observacao: null });
    },
    onSuccess: () => {
      chaveValidacaoRef.current?.confirmar();
      qc.invalidateQueries({ queryKey: ['feedbacks_360_validacoes_potencial'] });
      qc.invalidateQueries({ queryKey: ['feedbacks_360_consolidacoes'] });
      toast.success('Potencial validado — o Nine-Box classifica automaticamente.');
    },
    onError: (erro: unknown) => {
      if (isDesempenhoMockEnabled()) return;
      toast.error(`Potencial NÃO validado: ${mensagemDeErro(erro)}`);
    },
  });

  const isLoading = loadCiclos || loadMetas || loadFeedbacks || loadPDIs || loadComp;

  // === Derivados ===
  // Ciclo em destaque: prioriza o ATIVO real (`status='ativo'`), depois o que
  // está `em_andamento` e, por fim, o mais recente — sem inventar seleção.
  const cicloAtivo = useMemo(
    () =>
      ciclos.find((c: any) => c.status === 'ativo') ??
      ciclos.find((c: any) => c.status === 'em_andamento') ??
      ciclos[0] ??
      null,
    [ciclos]
  );

  const cicloSelecionado = useMemo(
    () => ciclos.find((c) => c.id === cicloSelecionadoId) ?? cicloAtivo,
    [ciclos, cicloSelecionadoId, cicloAtivo]
  );

  /* ── ENTRADAS DO MODO REAL DO NINE-BOX ────────────────────────────────────
     Só são buscadas quando a flag está ligada E a área NÃO está em modo
     demonstração — nunca existe mistura de dados reais com fictícios. As duas
     consultas dependem do modo real (o serviço lança de outra forma) e NÃO
     entram no `isLoading` da página: com a flag desligada (padrão) nada é
     buscado e a tela é exatamente a de hoje.                               */
  const modoReal = modoRealAtivo() && !mockAtivo && !!empresaAtual?.id;

  const { data: validacoesPotencial = [] } = useQuery({
    queryKey: ['feedbacks_360_validacoes_potencial', empresaAtual?.id, cicloSelecionado?.id],
    queryFn: () => avaliacaoService.listarValidacoesPotencial(empresaAtual!.id, cicloSelecionado?.id || undefined),
    enabled: modoReal,
  });
  const { data: versoesAvaliacao = [] } = useQuery({
    queryKey: ['vw_feedbacks_360_versao', empresaAtual?.id, cicloSelecionado?.id],
    queryFn: () => avaliacaoService.listarVersoesAvaliacao(empresaAtual!.id, cicloSelecionado?.id || undefined),
    enabled: modoReal,
  });
  /* ── APROVAÇÃO DO GESTOR (migration 20261017090000) ────────────────────────
     Duas leituras a mais, só no MODO REAL (fora dele o serviço lança e a fila é
     derivada dos dados já carregados). Nenhuma delas entra no `isLoading` da
     página: com a flag desligada (padrão) a tela é exatamente a de hoje. */
  const { data: consolidacoes = [] } = useQuery({
    queryKey: ['feedbacks_360_consolidacoes', empresaAtual?.id, cicloSelecionado?.id],
    queryFn: () => avaliacaoService.listarConsolidacoes(empresaAtual!.id, cicloSelecionado?.id || undefined),
    enabled: modoReal,
  });
  const { data: aprovacoesGestor = [] } = useQuery({
    queryKey: ['feedbacks_360_aprovacoes_gestor', empresaAtual?.id, cicloSelecionado?.id],
    queryFn: () => avaliacaoService.listarAprovacoesGestor(empresaAtual!.id, cicloSelecionado?.id || undefined),
    enabled: modoReal,
  });

  /** Versão canônica por feedback — o BANCO é a autoridade; aqui só se compara. */
  const versoesPorFeedback = useMemo(() => {
    const mapa: Record<string, string> = {};
    for (const v of versoesAvaliacao) {
      const id = String(v?.feedback_id ?? '').trim();
      if (id) mapa[id] = String(v?.versao_avaliacao ?? '').trim();
    }
    return mapa;
  }, [versoesAvaliacao]);

  return (
    <>
      <PageTitle title="Performance & Gestão 10/10" description="Acompanhamento estratégico de talentos" />
      <PageLayout
        title="Gestão de Desempenho"
        description="Ciclos, Metas, Feedbacks e PDI integrados"
        icon={<Target className="h-5 w-5 text-primary-foreground" />}
        gradient="from-primary to-primary-glow"
      >
        {/* Presença de entrada: devolve o keyframe `hidden` a todo card do módulo
            (o `<AnimatePresence initial={false}>` do PageTransition o suprime). */}
        <EntradaPresenca>
          <Tabs value={tab} onValueChange={setTab} className="space-y-5">
            {/* Faixa de navegação compacta + seletor de ciclo + ação principal.
              Os TRÊS controles compartilham a MESMA altura externa (`h-11` = 44px)
              e ficam centrados na mesma linha, com gaps de 12px. Só a LARGURA
              difere: a TabList flexiona, o seletor e a ação ficam no tamanho do
              próprio conteúdo. */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              {/* TabList — mecanismo de seleção IDÊNTICO ao de Admissões:
                `AnimatedTabsList` (ui/animated-tabs → `TabsHighlight mode="parent"`)
                mantém UM único indicador persistente, medido no trigger ativo e
                movido pela mola `ANIMATED_TABS_SPRING` (stiffness 220 / damping 24
                / mass 0.7) — nunca desmonta entre trocas, então a interpolação é
                sempre real e não há piscada.

                `highlightClassName` repete a MESMA pele do indicador de Admissões
                (`rounded-lg bg-background shadow-xs`) e os triggers ficam
                transparentes: quem pinta a aba ativa é o indicador, nunca o botão.

                O LAYOUT não muda — as classes de antes foram só redistribuídas:
                as de caixa (borda/fundo/`p-1`/`h-11`/rolagem) vão no container e
                as de trilha (`flex`/`grid` de 6 colunas/`gap`/`items-center`) na
                lista interna. No desktop o grid de 6 colunas iguais + `h-8` dos
                botões continua igual; abaixo de `lg` a faixa rola na horizontal. */}
              {/* ⚠️ O wrapper abaixo é o ITEM FLEX da linha — e existe por um
                detalhe do `AnimatedTabsList` (componente compartilhado, não
                alterado): ele renderiza um `div` por fora das classes de
                `containerClassName`, então o `lg:flex-1`/`lg:min-w-0` que estão
                lá dentro não alcançam o item flex. Sem este wrapper, a faixa de
                abas fica com a largura do próprio conteúdo e a linha sobra
                vazia à direita do botão "Novo Ciclo". Com ele, quem flexiona é
                o item flex de verdade e o botão encosta na borda direita da
                área útil (a mesma dos cards abaixo). */}
              <div className="min-w-0 lg:flex-1">
                <AnimatedTabsList
                  value={tab}
                  onValueChange={setTab}
                  containerClassName="h-11 w-full rounded-xl border border-border/30 bg-card/50 p-1 overflow-x-auto lg:min-w-0 lg:flex-1 lg:overflow-visible"
                  highlightClassName="rounded-lg bg-background shadow-xs"
                  listClassName="flex h-full w-full items-center justify-start gap-1 text-muted-foreground lg:grid lg:grid-cols-6"
                >
                  {ABAS.map(({ valor, rotulo, icone: Icone }) => (
                    <AnimatedTabsTrigger key={valor} value={valor} className={CLASSE_ABA}>
                      <Icone className={CLASSE_ABA_ICONE} />
                      <span className={CLASSE_ABA_TEXTO}>{rotulo}</span>
                    </AnimatedTabsTrigger>
                  ))}
                </AnimatedTabsList>
              </div>

              <div className="flex items-center gap-3 lg:shrink-0">
                <Select value={cicloSelecionado?.id ?? ''} onValueChange={setCicloSelecionadoId}>
                  <SelectTrigger className="h-11 w-full gap-2 rounded-xl sm:w-[230px]">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {/* Duas linhas (nome + período do ciclo SELECIONADO, dado
                      real): mesma informação que a área já mostrava, só
                      reorganizada — o `Select`/`SelectItem` seguem intocados. */}
                    <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left leading-tight">
                      {/* O `<SelectValue>` NÃO repassa `className` para o `<span>` que
                        renderiza o texto (ele sai sem classe e `display:inline`), então
                        as classes de truncamento colocadas nele eram no-op e um ciclo de
                        nome longo quebrava em duas linhas DENTRO do trigger `h-11`,
                        pintando texto fora da caixa e por cima da faixa de abas. O
                        truncamento vive agora no wrapper (item flex ⇒ precisa de
                        `w-full`, pois o contêiner é `items-start`). */}
                      <span className="w-full max-w-full truncate">
                        <SelectValue placeholder="Selecionar ciclo" />
                      </span>
                      <span className="w-full max-w-full truncate font-mono text-[10px] text-muted-foreground">
                        {cicloSelecionado
                          ? formatarPeriodo(cicloSelecionado.data_inicio, cicloSelecionado.data_fim)
                          : 'Sem período definido'}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {ciclos.length === 0 ? (
                      <SelectItem value="__vazio" disabled>
                        Nenhum ciclo cadastrado
                      </SelectItem>
                    ) : (
                      ciclos.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <NovoCicloDialog onSubmit={(dados) => criarCiclo.mutate(dados)} salvando={criarCiclo.isPending} />
              </div>
            </div>

            <TabsContent value="ciclos" className="space-y-5">
              <PerformanceDashboard
                feedbacks={feedbacks}
                metas={metas}
                pdis={pdis}
                ciclo={cicloSelecionado}
                onNavigate={setTab}
              />

              <TodosCiclosTable
                ciclos={ciclos}
                metas={metas}
                cicloSelecionadoId={cicloSelecionado?.id}
                onSelecionar={(c: any) => setCicloSelecionadoId(c.id)}
                onExcluir={(c: any) => excluirCiclo.mutate(c)}
                excluindo={excluirCiclo.isPending}
                indice={5}
              />
            </TabsContent>

            <TabsContent value="metas" className="space-y-6">
              {/* Aba redesenhada: banner de metas críticas → busca/filtros →
                filtros rápidos por status → grid de cards → paginação.
                Toda a lógica é client-side sobre `metas` (a MESMA consulta que
                a página já fazia) e a ação real de abrir o ciclo no painel é
                repassada pela página. */}
              <MetasOKRsTab
                metas={metas}
                ciclos={ciclos}
                colaboradores={colaboradores}
                onAbrirCiclo={(cicloId) => {
                  setCicloSelecionadoId(cicloId);
                  setTab('ciclos');
                }}
              />
            </TabsContent>

            <TabsContent value="feedbacks" className="space-y-6">
              {/* Aba redesenhada: banner "Foco agora" → busca/filtros → chips de
                segmentação → timeline de cards agrupados por mês + coluna de
                widgets. Toda a lógica é client-side sobre `feedbacks` (a MESMA
                consulta que a página já fazia) e a criação usa a mutation
                `criarFeedback` acima. */}
              <FeedbacksTab
                feedbacks={feedbacks}
                ciclos={ciclos}
                ciclo={cicloSelecionado}
                colaboradores={colaboradores}
                colaboradoresReais={colaboradoresReais}
                ciclosReais={ciclosReais}
                pdis={pdis}
                onCriarFeedback={(dados) => criarFeedback.mutate(dados)}
                salvandoFeedback={criarFeedback.isPending}
                /* ── Subaba "Aguardando gestor" ────────────────────────────────
                   Somente no MODO REAL os controles de escrita são liberados (a
                   fila continua visível em demonstração, como leitura). O ciclo
                   é obrigatório no payload: sem ele a RPC não tem chave. */
                papel={papel}
                acoesAprovacaoHabilitadas={modoReal}
                validacoesPotencial={validacoesPotencial}
                versoesPorFeedback={versoesPorFeedback}
                consolidacoes={consolidacoes}
                aprovacoesGestor={aprovacoesGestor}
                salvandoAprovacao={
                  enviarAprovacao.isPending || decidirAprovacao.isPending || validarPotencialAprovacao.isPending
                }
                onEnviarAprovacao={(p) => {
                  if (!p.cicloId) {
                    toast.error('Envio NÃO realizado: a avaliação está sem ciclo vinculado.');
                    return;
                  }
                  enviarAprovacao.mutate({ colaboradorId: p.colaboradorId, cicloId: p.cicloId });
                }}
                onDecidirAprovacao={(p, decisao, justificativa) => {
                  if (!p.cicloId) {
                    toast.error('Decisão NÃO registrada: a avaliação está sem ciclo vinculado.');
                    return;
                  }
                  decidirAprovacao.mutate({
                    colaboradorId: p.colaboradorId,
                    cicloId: p.cicloId,
                    decisao,
                    justificativa: justificativa ?? null,
                  });
                }}
                onValidarPotencial={(p) => validarPotencialAprovacao.mutate({ feedbackId: p.feedbackId })}
              />
            </TabsContent>

            <TabsContent value="pdis" className="space-y-6">
              {/* Aba redesenhada: banner "Foco agora" → busca/filtros/ordenação →
                pílulas de status → cards analíticos → paginação compacta. Toda a
                lógica é client-side sobre `pdis` (a MESMA consulta que a página
                já fazia); a lista de colaboradores que a página já carrega
                resolve cargo/departamento/foto do dono do plano. */}
              <PdiTab pdis={pdis} colaboradores={colaboradores} />
            </TabsContent>

            <TabsContent value="ninebox" className="space-y-6">
              {/* Aba redesenhada: KPIs → banner "Foco agora" → busca/filtros →
                matriz 3×3 + coluna lateral de widgets. Toda a lógica é
                client-side sobre as listas que a página já carrega
                (`feedbacks`, `ciclos`, `colaboradores`, `pdis`) — nenhuma
                consulta nova e nenhuma mudança na regra de classificação. */}
              <NineBoxTab
                feedbacks={feedbacks}
                ciclos={ciclos}
                cicloId={cicloSelecionado?.id ?? ''}
                onCicloId={setCicloSelecionadoId}
                colaboradores={colaboradores}
                pdis={pdis}
                /* Modo real (inerte com a flag desligada): a matriz passa a vir
                   da consolidação oficial sobre os feedbacks persistidos. */
                empresaId={empresaAtual?.id}
                validacoesPotencial={validacoesPotencial}
                versoesPorFeedback={versoesPorFeedback}
              />
            </TabsContent>

            <TabsContent value="auditoria" className="space-y-6">
              {/* Aba redesenhada: filtros → chips por módulo → timeline agrupada
                  por dia. Mesma consulta de `audit_log`; `colaboradores` entra
                  apenas para resolver nome/cargo/foto do responsável. */}
              <PerformanceAuditTimeline colaboradores={colaboradores} />
            </TabsContent>
          </Tabs>
        </EntradaPresenca>
      </PageLayout>
    </>
  );
}
