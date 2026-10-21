import { PageTitle } from '@/components/PageTitle';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
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
import { Target, Users, TrendingUp, LayoutGrid, History, BarChart2, Calendar, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PerformanceDashboard } from '@/components/avaliacao/PerformanceDashboard';
import { TodosCiclosTable } from '@/components/avaliacao/TodosCiclosTable';
import { NovoCicloDialog } from '@/components/avaliacao/NovoCicloDialog';
import { NineBoxTab } from '@/components/avaliacao/NineBoxTab';
// Modo real + ponte de criação auditada (idempotência por operação).
import { normalizarPapeis, capacidadesAvaliacao } from '@/components/avaliacao/papeisAvaliacao';
import { vinculosDemonstracao } from '@/components/avaliacao/servicoDemo';
import { idDemonstrativo } from '@/components/avaliacao/escritaOperacional';
import {
  CHAVE_REGISTROS_DEMO,
  aplicarEstadoDemo,
  atualizarRegistroDemo,
  criarRegistroDemo,
  excluirRegistroDemo,
  lerRegistrosDemo,
  type EntidadeDemo,
} from '@/components/avaliacao/desempenhoDemoStore';
import { criarServicoDemo } from '@/components/avaliacao/servicoDemo';
import {
  CHAVE_ARMAZENAMENTO as CHAVE_DEMO,
  aprovacoesLocais,
  decidirLocal,
  encaminharLocal,
  enviarLocal,
  estadoLocalVazio,
  lerEstadoLocal,
  reenviarLocal,
  validacoesLocais,
  validarPotencialLocal,
  type EstadoLocalDemo,
} from '@/components/avaliacao/aprovacaoLocal';
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
  /** Seletor de ciclos: aberto/fechado controlado para a lixeira fechar antes do diálogo. */
  const [seletorCiclosAberto, setSeletorCiclosAberto] = useState(false);
  /** Ciclo aguardando confirmação de exclusão/ocultação no seletor. */
  const [cicloParaExcluir, setCicloParaExcluir] = useState<any | null>(null);

  /**
   * O Radix Select mantém o foco no item (role=option) e não deixa o Tab
   * alcançar controles internos. Este tratador leva o foco para a lixeira do
   * item focado, permitindo abrir a confirmação com Enter/Espaço.
   */
  const focarLixeiraNoTab = (evento: ReactKeyboardEvent<HTMLDivElement>) => {
    if (evento.key !== 'Tab') return;
    const alvo = evento.target as HTMLElement;
    if (alvo.closest('[data-acao-ciclo]')) return;
    const opcaoAtual = alvo.closest('[role="option"]');
    const acao = opcaoAtual?.querySelector<HTMLButtonElement>('[data-acao-ciclo]');
    if (acao) {
      evento.preventDefault();
      evento.stopPropagation();
      acao.focus();
    }
  };

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
  /** Chave da EDIÇÃO (uma por tentativa; confirmada no sucesso). */
  const chaveEdicaoRef = useRef<ChaveIdempotente | null>(null);
  if (chaveEdicaoRef.current == null) chaveEdicaoRef.current = criarChaveIdempotente();

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
   * LISTA completa de papéis da conta (`user_roles` → `['admin','gestor']`).
   * Fonte das CAPACIDADES: `admin` não anula `gestor`. `papel` acima segue
   * servindo de rótulo/precedência onde um único valor é esperado.
   */
  const papeisDoUsuario = useMemo(() => normalizarPapeis(user?.roles), [user]);
  /** Exclusão de ciclo é operação administrativa (mesma capacidade do RH/admin). */
  const podeExcluirCiclos = useMemo(() => capacidadesAvaliacao(papeisDoUsuario).podeGerirAvaliacoes, [papeisDoUsuario]);
  /**
   * Mocks (VISUALIZAÇÃO aprovada) + registros REAIS do banco, sem duplicar.
   * Os fictícios NUNCA são enviados ao banco (a guarda recusa `mock-*`); a leitura
   * real é best-effort — se indisponível, a tela aprovada permanece idêntica.
   */
  const mesclar = async (
    mock: unknown[] | undefined,
    real: () => Promise<unknown[]>,
    { propagarErro = false }: { propagarErro?: boolean } = {}
  ): Promise<any[]> => {
    const m = mock ?? [];
    if (!empresaAtual?.id) return m;
    try {
      const r = await real();
      const ids = new Set(m.map((x) => String((x as { id?: unknown })?.id ?? '')));
      return [...m, ...r.filter((x) => !ids.has(String((x as { id?: unknown })?.id ?? '')))];
    } catch (erro) {
      // LISTA DE CICLOS: nunca trocar o banco por fixtures em silêncio — um erro
      // de leitura não pode fazer um ciclo real "desaparecer" da tela.
      if (propagarErro) throw erro;
      return m;
    }
  };

  /**
   * PERSISTÊNCIA DEMONSTRATIVA sobre a lista visível: esconde os excluídos na
   * vitrine, aplica as alterações de estado e ACRESCENTA os registros criados
   * localmente. Só age em modo demonstração — no modo real a lista é do banco.
   */
  const comEstadoDemo = <T extends Record<string, unknown>>(lista: T[], entidade: EntidadeDemo): T[] => {
    if (!isDesempenhoMockEnabled()) return lista;
    /**
     * A vitrine só pode alterar registros DEMONSTRATIVOS. Aplicar o estado local
     * à lista inteira permitia que um patch/decisão antiga de um UUID real
     * “corrigisse” o banco só no navegador (aprovação local apresentada como real).
     */
    const demonstrativos = lista.filter((x) => idDemonstrativo(x?.id));
    const reais = lista.filter((x) => !idDemonstrativo(x?.id));
    const aplicar =
      entidade === 'ciclos'
        ? (x: T): T => {
            const demo = idDemonstrativo((x as { id?: unknown })?.id);
            const nome = String((x as { nome?: unknown })?.nome ?? '').trim();
            return {
              ...x,
              origem: demo ? 'demonstracao' : 'real',
              ...(demo && nome && !/\(demonstração\)$/i.test(nome) ? { nome: `${nome} (demonstração)` } : {}),
            } as T;
          }
        : (x: T): T => x;
    return [...reais.map(aplicar), ...aplicarEstadoDemo(demonstrativos, entidade, lerRegistrosDemo()).map(aplicar)];
  };

  const {
    data: ciclos = [],
    isLoading: loadCiclos,
    isError: erroCiclos,
  } = useQuery({
    queryKey: ['ciclos_avaliacao', empresaAtual?.id],
    queryFn: async (): Promise<any[]> =>
      comEstadoDemo(
        await mesclar(getMockCiclos(), () => avaliacaoService.listarCiclos(empresaAtual!.id), {
          propagarErro: true,
        }),
        'ciclos'
      ),
    enabled: !!empresaAtual?.id || mockAtivo,
    placeholderData: (anterior) => anterior,
  });
  useEffect(() => {
    if (erroCiclos) {
      toast.error('Não foi possível carregar os ciclos do Supabase. A lista anterior foi preservada.');
    }
  }, [erroCiclos]);
  const { data: metas = [], isLoading: loadMetas } = useQuery({
    queryKey: ['metas_okrs', empresaAtual?.id],
    queryFn: async (): Promise<any[]> =>
      comEstadoDemo(await mesclar(getMockMetas(), () => avaliacaoService.listarMetas(empresaAtual!.id)), 'metas'),
    enabled: !!empresaAtual?.id || mockAtivo,
  });
  const { data: feedbacks = [], isLoading: loadFeedbacks } = useQuery({
    queryKey: ['feedbacks_360', empresaAtual?.id],
    queryFn: async (): Promise<any[]> =>
      comEstadoDemo(
        await mesclar(getMockFeedbacks(), () => avaliacaoService.listarFeedbacks(empresaAtual!.id)),
        'feedbacks'
      ),
    enabled: !!empresaAtual?.id || mockAtivo,
  });
  const { data: pdis = [], isLoading: loadPDIs } = useQuery({
    queryKey: ['pdis', empresaAtual?.id],
    queryFn: async (): Promise<any[]> =>
      comEstadoDemo(await mesclar(getMockPdis(), () => avaliacaoService.listarPDIs(empresaAtual!.id)), 'pdis'),
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

  /**
   * Opções dos FORMULÁRIOS. No modo real só entram UUIDs (a guarda de escrita
   * recusa `mock-*`); na DEMONSTRAÇÃO valem os colaboradores/ciclos fictícios —
   * a gravação é local e nada disso vai ao banco.
   */
  const semFicticios = (lista: any[]) =>
    lista.filter((x) => !String((x as { id?: unknown })?.id ?? '').startsWith('mock-'));
  const colaboradoresReais = useMemo(
    () => (mockAtivo ? colaboradores : semFicticios(colaboradores)),
    [colaboradores, mockAtivo]
  );
  const ciclosReais = useMemo(() => (mockAtivo ? ciclos : semFicticios(ciclos)), [ciclos, mockAtivo]);

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
      // REGRA: a flag de mock é só VISUAL. Ciclo criado por usuário autenticado
      // vai SEMPRE para o Supabase; o ID fictício nunca é aceito.
      return avaliacaoService.criarCiclo({ ...d, empresa_id: empresaDaEscrita() }).then((registro) => {
        const id = String(registro?.id ?? '').trim();
        if (!id || idDemonstrativo(id)) {
          throw new Error('O servidor não retornou um ciclo REAL persistido.');
        }
        return registro;
      });
    },
    onSuccess: (registro: any) => {
      qc.invalidateQueries({ queryKey: ['ciclos_avaliacao'] });
      const id = String(registro?.id ?? '').trim();
      if (id) setCicloSelecionadoId(id);
      toast.success('Ciclo criado e salvo no Supabase.');
    },
    onError: (erro: unknown) => {
      toast.error(`Ciclo NÃO criado: ${mensagemDeErro(erro)}`);
    },
  });

  const criarMeta = useMutation({
    mutationFn: (d: any) => {
      if (mockAtivo) {
        const { registro } = criarRegistroDemo(
          'metas',
          {
            ...d,
            empresa_id: empresaDaEscrita(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { por: user?.email ?? null, descricao: `Meta "${String(d?.titulo ?? d?.nome ?? '')}" criada na demonstração` }
        );
        return Promise.resolve(registro);
      }
      return avaliacaoService.criarMeta({ ...d, empresa_id: empresaDaEscrita() });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['metas_okrs'] });
      toast.success(
        mockAtivo ? 'Demonstração: meta criada e salva localmente (nada foi enviado ao banco).' : 'Meta criada!'
      );
    },
    onError: (erro: unknown) => {
      if (isDesempenhoMockEnabled()) return;
      toast.error(`Meta NÃO criada: ${mensagemDeErro(erro)}`);
    },
  });

  /**
   * Criação é DEMONSTRATIVA quando QUALQUER ID do payload é fictício/ausente.
   * Só um payload 100% UUID vai à RPC real — mesmo com mocks exibidos na tela.
   */
  const criacaoDemonstrativa = (d: Record<string, unknown>): boolean => {
    const ids = [d?.avaliado_id, d?.avaliador_id, d?.ciclo_id].map((v) => String(v ?? '').trim());
    return ids.some((id) => !id || idDemonstrativo(id));
  };

  const criarFeedback = useMutation<any, unknown, any>({
    mutationFn: (d: any) => {
      /* A flag de vitrine é apenas VISUAL. Um feedback com colaborador,
         avaliador e ciclo REAIS (UUID) SEMPRE é gravado no Supabase, mesmo com
         o mock ligado. Só um payload com algum ID fictício/ausente usa o
         armazenamento demonstrativo local. */
      if (criacaoDemonstrativa(d)) {
        if (!mockAtivo) {
          return Promise.reject(
            new Error('Selecione colaborador, avaliador e ciclo REAIS (UUID) para registrar no banco.')
          );
        }
        const { registro } = criarRegistroDemo(
          'feedbacks',
          {
            ...d,
            status: 'pendente',
            empresa_id: empresaDaEscrita(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            por: user?.email ?? null,
            descricao: `Avaliação (${String(d?.tipo ?? '')}) criada na demonstração`,
          }
        );
        /* ENCAMINHAMENTO AUTOMÁTICO (vitrine): salvar QUALQUER avaliação já cria
           a pendência do gestor responsável — o RH não clica em mais nada. A
           consolidação é por colaborador+ciclo (idempotente) e a data do envio
           fica no armazenamento da demonstração (sobrevive ao F5). */
        const avaliado = String((registro as any)?.avaliado_id ?? d?.avaliado_id ?? '').trim();
        const cicloDoFeedback = String((registro as any)?.ciclo_id ?? d?.ciclo_id ?? '').trim();
        if (avaliado && cicloDoFeedback) {
          encaminharLocal({
            colaboradorId: avaliado,
            cicloId: cicloDoFeedback,
            por: user?.email ?? null,
            automatico: true,
          });
          invalidarDemo();
        }
        return Promise.resolve(registro);
      }
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
    onSuccess: (resposta: any, dadosEnviados: any) => {
      // Sucesso SÓ depois da resposta do servidor (ou da gravação local na
      // demonstração): a tentativa está confirmada, logo a próxima criação é uma
      // operação nova (chave nova). A atualização das listas acontece aqui.
      chaveFeedbackRef.current?.confirmar();
      // Foca o ciclo do registro criado para que ele APAREÇA na listagem
      // (a lista respeita o filtro de ciclo selecionado no topo).
      const cicloCriado = String((dadosEnviados as { ciclo_id?: unknown })?.ciclo_id ?? '').trim();
      if (cicloCriado) setCicloSelecionadoId(cicloCriado);
      qc.invalidateQueries({ queryKey: ['feedbacks_360'] });
      qc.invalidateQueries({ queryKey: ['feedbacks_360_consolidacoes'] });
      qc.invalidateQueries({ queryKey: ['feedbacks_360_aprovacoes_gestor'] });
      qc.invalidateQueries({ queryKey: ['feedbacks_360_validacoes_potencial'] });
      qc.invalidateQueries({ queryKey: ['vw_feedbacks_360_versao'] });
      const criadoLocal = idDemonstrativo(resposta?.id ?? resposta?.feedback_id);
      toast.success(
        criadoLocal
          ? 'Demonstração: avaliação registrada e salva localmente (nada foi enviado ao banco).'
          : 'Feedback registrado!'
      );
    },
    onError: (erro: unknown) => {
      // Nada de sucesso falso: o motivo REAL (autorização, validação, rede) vai
      // para o aviso. A chave é MANTIDA — reenviar a mesma tentativa é seguro.
      toast.error(`Feedback NÃO registrado: ${mensagemDeErro(erro)}`);
    },
  });

  /* ── EDIÇÃO de um feedback existente (filtros normais) ────────────────────
     DEMONSTRAÇÃO: grava o patch no armazenamento local (sobrevive ao F5) e
     reencaminha a consolidação — a versão do conjunto muda e invalida decisões
     anteriores, exatamente como no banco.
     REAL: RPC `editar_feedback_seguro` (migration aditiva). Ela reabre registro
     concluído de forma explícita, audita antes/depois e o trigger sincroniza a
     consolidação. A guarda de escrita recusa `mock-*` antes da rede. */
  const editarFeedback = useMutation<any, unknown, { id: string; dados: Record<string, unknown> }>({
    mutationFn: ({ id, dados }) => {
      const alvo = String(id ?? '').trim();
      if (!alvo) return Promise.reject(new Error('Registro sem identificador — não é possível editar.'));
      /**
       * EDIÇÃO POR REGISTRO: só `mock-*`/`demo-*` vira patch local. Um UUID real
       * SEMPRE passa pela RPC `editar_feedback_seguro`, mesmo com mocks na tela.
       */
      if (idDemonstrativo(alvo)) {
        const patch = {
          ...dados,
          status: 'pendente',
          updated_at: new Date().toISOString(),
        };
        atualizarRegistroDemo('feedbacks', alvo, patch, {
          por: user?.email ?? null,
          descricao: 'Avaliação editada na demonstração (reaberta como pendente)',
          operacao: 'editar',
        });
        const avaliado = String(dados?.avaliado_id ?? '').trim();
        const cicloDoFeedback = String(dados?.ciclo_id ?? '').trim();
        if (avaliado && cicloDoFeedback) {
          encaminharLocal({
            colaboradorId: avaliado,
            cicloId: cicloDoFeedback,
            por: user?.email ?? null,
            automatico: true,
          });
          invalidarDemo();
        }
        return Promise.resolve({ id: alvo, ...patch });
      }
      const idOperacao = chaveEdicaoRef.current!.para(`editar:${alvo}`);
      return avaliacaoService.editarFeedbackSeguro({
        feedbackId: alvo,
        avaliado_id: String(dados.avaliado_id ?? ''),
        avaliador_id: String(dados.avaliador_id ?? ''),
        ciclo_id: dados.ciclo_id ? String(dados.ciclo_id) : null,
        tipo: String(dados.tipo ?? 'gestor'),
        nota_geral: Number(dados.nota_geral ?? 0),
        potencial: dados.potencial == null ? null : Number(dados.potencial),
        pontos_fortes: (dados.pontos_fortes as string | undefined) ?? null,
        pontos_melhoria: (dados.pontos_melhoria as string | undefined) ?? null,
        comentarios: (dados.comentarios as string | undefined) ?? null,
        idOperacao,
      });
    },
    onSuccess: (_r: any, { id, dados }) => {
      chaveEdicaoRef.current?.confirmar();
      const cicloEditado = String((dados as { ciclo_id?: unknown })?.ciclo_id ?? '').trim();
      if (cicloEditado) setCicloSelecionadoId(cicloEditado);
      qc.invalidateQueries({ queryKey: ['feedbacks_360'] });
      qc.invalidateQueries({ queryKey: ['feedbacks_360_consolidacoes'] });
      qc.invalidateQueries({ queryKey: ['feedbacks_360_aprovacoes_gestor'] });
      qc.invalidateQueries({ queryKey: ['feedbacks_360_validacoes_potencial'] });
      qc.invalidateQueries({ queryKey: ['vw_feedbacks_360_versao'] });
      toast.success(
        idDemonstrativo(id)
          ? 'Demonstração: avaliação atualizada e salva localmente (nada foi enviado ao banco).'
          : 'Avaliação atualizada.'
      );
    },
    onError: (erro: unknown, { id }) => {
      if (idDemonstrativo(id)) return;
      toast.error(`Avaliação NÃO atualizada: ${mensagemDeErro(erro)}`);
    },
  });

  const criarPDI = useMutation({
    mutationFn: (d: any) => {
      if (mockAtivo) {
        const { registro } = criarRegistroDemo(
          'pdis',
          {
            ...d,
            empresa_id: empresaDaEscrita(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            por: user?.email ?? null,
            descricao: `PDI de "${String(d?.competencia_foco ?? d?.titulo ?? '')}" criado na demonstração`,
          }
        );
        return Promise.resolve(registro);
      }
      return avaliacaoService.criarPDI({ ...d, empresa_id: empresaDaEscrita() });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pdis'] });
      toast.success(
        mockAtivo ? 'Demonstração: PDI criado e salvo localmente (nada foi enviado ao banco).' : 'PDI criado!'
      );
    },
    onError: (erro: unknown) => {
      if (isDesempenhoMockEnabled()) return;
      toast.error(`PDI NÃO criado: ${mensagemDeErro(erro)}`);
    },
  });

  const excluirCiclo = useMutation({
    mutationFn: async (c: any) => {
      const id = String(c?.id ?? '').trim();
      if (!id) throw new Error('Ciclo sem identificador.');
      // DEMONSTRATIVO = pelo ID do próprio registro, nunca pela flag global.
      if (idDemonstrativo(id)) {
        excluirRegistroDemo('ciclos', id, {
          por: user?.email ?? null,
          descricao: `Ciclo "${String(c?.nome ?? '')}" excluído na demonstração`,
        });
        return;
      }
      const empresaId = empresaDaEscrita();
      const deps = await avaliacaoService.contarDependenciasCiclo(id, empresaId);
      if (deps.total > 0) {
        const detalhe = Object.entries(deps.porTabela)
          .filter(([, n]) => Number(n) > 0)
          .map(([tabela, n]) => `${tabela}: ${n}`)
          .join(', ');
        throw new Error(
          `Exclusão bloqueada: o ciclo possui ${deps.total} dependência(s) (${detalhe}). ` +
            'Nenhum dado foi apagado. Arquive o ciclo ou remova os vínculos com autorização.'
        );
      }
      return avaliacaoService.excluirCiclo(id, empresaId);
    },
    onSuccess: (_data, c) => {
      qc.invalidateQueries({ queryKey: ['ciclos_avaliacao'] });
      qc.invalidateQueries({ queryKey: ['feedbacks_360'] });
      qc.invalidateQueries({ queryKey: ['feedbacks_360_consolidacoes'] });
      qc.invalidateQueries({ queryKey: ['feedbacks_360_aprovacoes_gestor'] });
      qc.invalidateQueries({ queryKey: ['metas_okrs'] });
      const removido = String(c?.id ?? '').trim();
      if (String(cicloParaExcluir?.id ?? '').trim() === removido) setCicloParaExcluir(null);
      if (String(cicloSelecionadoId ?? '').trim() === removido) setCicloSelecionadoId(undefined);
      toast.success(
        idDemonstrativo(c?.id)
          ? 'Demonstração: ciclo ocultado da lista (mocks originais intactos).'
          : 'Ciclo excluído do Supabase.'
      );
    },
    onError: (erro: unknown) => {
      setCicloParaExcluir(null);
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
      qc.invalidateQueries({ queryKey: ['pode_aprovar_colaborador'] });
      toast.success('Avaliação enviada ao gestor para aprovação!');
    },
    onError: (erro: unknown) => {
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
      qc.invalidateQueries({ queryKey: ['pode_aprovar_colaborador'] });
      toast.success(
        enviado?.decisao === 'devolvido' ? 'Avaliação devolvida para correção.' : 'Avaliação aprovada pelo gestor!'
      );
    },
    onError: (erro: unknown) => {
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
      qc.invalidateQueries({ queryKey: ['pode_aprovar_colaborador'] });
      toast.success('Potencial validado — o Nine-Box classifica automaticamente.');
    },
    onError: (erro: unknown) => {
      toast.error(`Potencial NÃO validado: ${mensagemDeErro(erro)}`);
    },
  });

  const isLoading = loadCiclos || loadMetas || loadFeedbacks || loadPDIs || loadComp;

  // === Derivados ===
  // Ciclo em destaque: prioriza o ATIVO real (`status='ativo'`), depois o que
  // está `em_andamento` e, por fim, o mais recente — sem inventar seleção.
  const cicloAtivo = useMemo(
    () =>
      ciclos.find((c: any) => !idDemonstrativo(c.id) && c.status === 'ativo') ??
      ciclos.find((c: any) => !idDemonstrativo(c.id) && c.status === 'em_andamento') ??
      ciclos.find((c: any) => !idDemonstrativo(c.id)) ??
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
     As leituras do fluxo são feitas sempre que existe empresa ativa; elas não
     entram no `isLoading` da página.                                         */
  /**
   * DEMONSTRAÇÃO = o DATASET de fixtures está ativo (`VITE_DESEMPENHO_MOCK` e
   * modo real desligado). A tela pode conter registros reais ao lado; por isso a
   * decisão de gravar é POR REGISTRO (UUID → RPC; mock/demo → local), não por
   * esta flag.
   */
  const demoAtivo = mockAtivo;

  /**
   * Registros da VITRINE que precisam cumprir o fluxo: criados (`demo-*`) ou
   * fixtures com patch (editadas/reabertas). As fixtures originais intocadas
   * continuam formando a vitrine aprovada; qualquer alteração suspende a
   * classificação até nova aprovação + validação.
   */
  const idsFluxoDemo = useMemo<ReadonlySet<string>>(() => {
    if (!demoAtivo) return new Set<string>();
    // Gatilho de recarga após criar/editar (a query é invalidada e a lista muda).
    void feedbacks;
    const estado = lerRegistrosDemo();
    return new Set<string>([
      ...Object.keys(estado.criados.feedbacks ?? {}),
      ...Object.keys(estado.patches.feedbacks ?? {}),
    ]);
  }, [demoAtivo, feedbacks]);

  const { data: validacoesPotencial = [] } = useQuery({
    queryKey: ['feedbacks_360_validacoes_potencial', empresaAtual?.id, cicloSelecionado?.id],
    queryFn: () => avaliacaoService.listarValidacoesPotencial(empresaAtual!.id, cicloSelecionado?.id || undefined),
    enabled: !!empresaAtual?.id,
  });
  const { data: versoesAvaliacao = [] } = useQuery({
    queryKey: ['vw_feedbacks_360_versao', empresaAtual?.id, cicloSelecionado?.id],
    queryFn: () => avaliacaoService.listarVersoesAvaliacao(empresaAtual!.id, cicloSelecionado?.id || undefined),
    enabled: !!empresaAtual?.id,
  });
  /* ── LEITURAS DO FLUXO REAL ────────────────────────────────────────────────
     São habilitadas sempre que existe empresa ativa, INDEPENDENTEMENTE do mock
     de visualização: a tela é MISTA (fixtures + registros reais) e uma aprovação
     real precisa aparecer na fila/Nine-Box mesmo com a vitrine ligada.
     Os RPCs de escrita são escolhidos POR REGISTRO (UUID → real; mock → local). */
  const { data: consolidacoes = [] } = useQuery({
    queryKey: ['feedbacks_360_consolidacoes', empresaAtual?.id, cicloSelecionado?.id],
    queryFn: () => avaliacaoService.listarConsolidacoes(empresaAtual!.id, cicloSelecionado?.id || undefined),
    enabled: !!empresaAtual?.id,
  });
  const { data: aprovacoesGestor = [] } = useQuery({
    queryKey: ['feedbacks_360_aprovacoes_gestor', empresaAtual?.id, cicloSelecionado?.id],
    queryFn: () => avaliacaoService.listarAprovacoesGestor(empresaAtual!.id, cicloSelecionado?.id || undefined),
    enabled: !!empresaAtual?.id,
  });

  /**
   * AUTORIZAÇÃO EXCEPCIONAL CONFIRMADA PELO SERVIDOR.
   * Consulta `pode_aprovar_colaborador` para cada colaborador com avaliação REAL
   * no ciclo. A interface não replica e-mails/allowlists; expiração e revogação
   * valem imediatamente porque a RPC de decisão revalida na gravação.
   */
  const colaboradoresReaisAprovacao = useMemo(() => {
    const ids = new Set<string>();
    (feedbacks as Record<string, unknown>[]).forEach((f) => {
      const colaborador = String(f?.avaliado_id ?? '').trim();
      if (!colaborador || idDemonstrativo(colaborador)) return;
      const ciclo = String(f?.ciclo_id ?? '').trim();
      if (cicloSelecionado?.id && ciclo && ciclo !== String(cicloSelecionado.id)) return;
      ids.add(colaborador);
    });
    return [...ids].sort();
  }, [feedbacks, cicloSelecionado?.id]);

  const { data: autorizacoesAprovacao = {} } = useQuery<Record<string, boolean>>({
    queryKey: ['pode_aprovar_colaborador', empresaAtual?.id, cicloSelecionado?.id, colaboradoresReaisAprovacao],
    queryFn: async () => {
      const pares = await Promise.all(
        colaboradoresReaisAprovacao.map(async (id) => {
          const permitido = await avaliacaoService.podeAprovarColaborador(id);
          return [id, permitido] as const;
        })
      );
      return Object.fromEntries(pares);
    },
    enabled: !!empresaAtual?.id && colaboradoresReaisAprovacao.length > 0,
    retry: false,
    staleTime: 30_000,
    // Expiração/revogação da exceção reflete sem F5 (e a RPC revalida na gravação).
    refetchInterval: 30_000,
  });

  /* ── VÍNCULOS PARA A APROVAÇÃO (`id`, `user_id`, `supervisor_id`) ──────────
     A MESMA consulta que o rodapé do modal já faz (mesma `queryKey`, portanto
     um único request no cache). É a prova de QUEM deve aprovar: o gestor sai do
     `supervisor_id` do avaliado — nunca do tipo nem do avaliador do registro.
     Leitura mínima e escopada à empresa; a RLS de `colaboradores` continua
     decidindo quem enxerga cada linha. Em demonstração ela fica desligada (não
     há vínculo fictício) e a fila segue pela leitura por PAPEL. */
  const { data: vinculos = [] } = useQuery({
    queryKey: ['colaboradores_vinculos', empresaAtual?.id],
    queryFn: () => avaliacaoService.listarVinculos(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
    retry: false,
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

  /* ── VITRINE (demonstração): decisões persistidas LOCALMENTE ───────────────
     Apenas registros `mock-*`/`demo-*` vão para `localStorage` (chave própria,
     mocks intactos). Registros UUID usam as RPCs reais, mesmo que a vitrine
     esteja exibida ao lado. */

  /**
   * VITRINE: serviço demonstrativo. Presente, os MESMOS controles do rodapé do
   * modal (Concluir, Cancelar, Reabrir, Validar Potencial) executam a ação
   * gravando no armazenamento local — nunca no banco. Registros reais ignoram
   * este serviço (seleção POR REGISTRO em `FeedbackAcoesRodape`).
   */
  const servicoDemo = useMemo(
    () =>
      demoAtivo
        ? criarServicoDemo({
            usuarioId: user?.id ?? null,
            email: user?.email ?? null,
            feedbackDe: (id) =>
              ((feedbacks ?? []) as Record<string, unknown>[]).find((f) => String(f?.id ?? '') === id) ?? null,
            feedbacks: (feedbacks ?? []) as Record<string, unknown>[],
            colaboradoresIds: ((colaboradores ?? []) as { id?: unknown }[])
              .map((c) => String(c?.id ?? ''))
              .filter((id) => Boolean(id) && idDemonstrativo(id)),
          })
        : undefined,
    [demoAtivo, user, feedbacks, colaboradores]
  );
  const { data: estadoDemo = estadoLocalVazio() } = useQuery<EstadoLocalDemo>({
    queryKey: [CHAVE_DEMO],
    queryFn: lerEstadoLocal,
    staleTime: Infinity,
  });
  const invalidarDemo = () => qc.invalidateQueries({ queryKey: [CHAVE_DEMO] });

  /** Chaves (ciclo::colaborador) que possuem QUALQUER registro real. */
  const chavesReais = useMemo(() => {
    const chaves = new Set<string>();
    (feedbacks as Record<string, unknown>[]).forEach((f) => {
      if (!f || idDemonstrativo(f.id)) return;
      const colaborador = String(f.avaliado_id ?? '').trim();
      const ciclo = String(f.ciclo_id ?? '').trim();
      if (colaborador && ciclo) chaves.add(`${ciclo}::${colaborador}`);
    });
    return chaves;
  }, [feedbacks]);
  const chaveDaTabela = (linha: Record<string, unknown>) =>
    `${String(linha.ciclo_id ?? '').trim()}::${String(linha.colaborador_id ?? '').trim()}`;

  /**
   * DECISÕES EFETIVAS = banco + vitrine, SEPARADOS por chave:
   *   • registros reais (UUID) usam SOMENTE `feedbacks_360_aprovacoes_gestor`;
   *   • registros fictícios usam o armazenamento local.
   * Uma decisão local antiga sobre a mesma chave real é DESCARTADA — ela nunca
   * pode ser apresentada como aprovação real.
   */
  const aprovacoesEfetivas = useMemo(() => {
    const locais = demoAtivo ? aprovacoesLocais(estadoDemo).filter((a) => !chavesReais.has(chaveDaTabela(a))) : [];
    return [...aprovacoesGestor, ...locais];
  }, [demoAtivo, estadoDemo, aprovacoesGestor, chavesReais]);
  const validacoesEfetivas = useMemo(() => {
    const locais = demoAtivo ? validacoesLocais(estadoDemo).filter((v) => !chavesReais.has(chaveDaTabela(v))) : [];
    return [...validacoesPotencial, ...locais];
  }, [demoAtivo, estadoDemo, validacoesPotencial, chavesReais]);
  /**
   * VÍNCULOS EFETIVOS — no modo real vêm do banco; na vitrine, do MESMO cenário
   * do rodapé (`vinculosDemonstracao`): o operador é o gestor de referência e
   * responde pelos colaboradores fictícios. Sem isto a fila não identificava o
   * gestor (`Não identificado`) e a aprovação demonstrativa ficava inconsistente
   * com o fluxo real.
   */
  const vinculosEfetivos = useMemo(() => {
    const demo = demoAtivo
      ? vinculosDemonstracao({
          usuarioId: user?.id ?? null,
          colaboradoresIds: ((colaboradores ?? []) as { id?: unknown }[])
            .map((c) => String(c?.id ?? ''))
            .filter((id) => Boolean(id) && idDemonstrativo(id)),
        })
      : [];
    const reais = vinculos ?? [];
    const idsReais = new Set(reais.map((v: { id?: unknown }) => String(v?.id ?? '')));
    return [...reais, ...demo.filter((v) => !idsReais.has(v.id))];
  }, [demoAtivo, vinculos, user?.id, colaboradores]);
  /** Encaminhamentos automáticos da vitrine (`chave → { em }`) — data do envio. */
  const encaminhamentosEfetivos = useMemo(() => {
    if (!demoAtivo) return {} as Record<string, { em?: string | null }>;
    const mapa: Record<string, { em?: string | null }> = {};
    Object.entries(estadoDemo.encaminhamentos ?? {}).forEach(([chave, encaminhamento]) => {
      if (chavesReais.has(chave)) return;
      const em = encaminhamento?.encaminhadoEm;
      if (em) mapa[chave] = { em };
    });
    return mapa;
  }, [demoAtivo, estadoDemo, chavesReais]);

  /* ── Mutations da VITRINE (gravam no armazenamento local, nunca no banco) ── */
  const enviarAprovacaoDemo = useMutation({
    mutationFn: async (p: {
      colaboradorId: string;
      cicloId: string;
      versaoAvaliacao?: string | null;
      devolvida?: boolean;
    }) => {
      if (p.devolvida) {
        // Devolvida → o RH corrige e REENVIA: a decisão volta a aguardar o gestor.
        reenviarLocal({ colaboradorId: p.colaboradorId, cicloId: p.cicloId, por: user?.email ?? null });
      } else {
        enviarLocal({
          colaboradorId: p.colaboradorId,
          cicloId: p.cicloId,
          versaoAvaliacao: p.versaoAvaliacao ?? null,
          por: user?.email ?? null,
        });
      }
      return null;
    },
    onSuccess: (_r, p) => {
      invalidarDemo();
      toast.success(
        p.devolvida
          ? 'Demonstração: avaliação reenviada ao gestor (salva localmente).'
          : 'Demonstração: envio ao gestor registrado localmente (nada foi enviado ao banco).'
      );
    },
  });

  const decidirAprovacaoDemo = useMutation({
    mutationFn: async (d: {
      colaboradorId: string;
      cicloId: string;
      decisao: 'aprovado' | 'devolvido';
      justificativa?: string | null;
      versaoAvaliacao: string;
    }) => {
      decidirLocal({
        colaboradorId: d.colaboradorId,
        cicloId: d.cicloId,
        decisao: d.decisao,
        justificativa: d.justificativa ?? null,
        versaoAvaliacao: d.versaoAvaliacao,
        por: user?.email ?? null,
      });
      return null;
    },
    onSuccess: (_r, d) => {
      invalidarDemo();
      toast.success(
        d.decisao === 'devolvido'
          ? 'Demonstração: devolução salva localmente (nada foi enviado ao banco).'
          : 'Demonstração: aprovação salva localmente (nada foi enviado ao banco).'
      );
    },
  });

  const validarPotencialDemo = useMutation({
    mutationFn: async (p: {
      colaboradorId: string;
      cicloId: string;
      versaoAvaliacao: string;
      versaoValidacao: string;
    }) => {
      const { resultado } = validarPotencialLocal({
        colaboradorId: p.colaboradorId,
        cicloId: p.cicloId,
        versaoAvaliacao: p.versaoAvaliacao,
        versaoValidacao: p.versaoValidacao,
        por: user?.email ?? null,
      });
      if (!resultado.ok) throw new Error(resultado.descricao);
      return null;
    },
    onSuccess: () => {
      invalidarDemo();
      toast.success('Demonstração: Potencial validado localmente — o Nine-Box classifica.');
    },
    onError: (erro: unknown) => {
      toast.error(`Potencial NÃO validado: ${mensagemDeErro(erro)}`);
    },
  });

  /**
   * A linha é DEMONSTRATIVA? Decide a persistência POR LINHA (nunca pela tela):
   * IDs `mock-*`/`demo-*` ou origem derivada do conjunto. Registros reais vão
   * sempre para as RPCs.
   */
  const linhaDemonstrativa = (p: { origem?: string; feedbackId?: string }) =>
    p.origem === 'demonstracao' || idDemonstrativo(p.feedbackId);

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
                <Select
                  open={seletorCiclosAberto}
                  onOpenChange={setSeletorCiclosAberto}
                  value={cicloSelecionado?.id ?? ''}
                  onValueChange={(id) => {
                    setCicloSelecionadoId(id);
                    setSeletorCiclosAberto(false);
                  }}
                >
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
                  <SelectContent onKeyDownCapture={focarLixeiraNoTab}>
                    {ciclos.length === 0 ? (
                      <SelectItem value="__vazio" disabled>
                        Nenhum ciclo cadastrado
                      </SelectItem>
                    ) : (
                      ciclos.map((c: any) => (
                        <SelectItem
                          key={c.id}
                          value={c.id}
                          acao={
                            podeExcluirCiclos ? (
                              <button
                                type="button"
                                tabIndex={0}
                                data-acao-ciclo
                                aria-label={`Excluir ciclo ${c.nome}`}
                                title="Excluir ciclo"
                                className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/70 opacity-0 transition-opacity hover:text-destructive-vivid focus-visible:opacity-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring group-hover/ciclo:text-destructive-vivid group-hover/ciclo:opacity-100 group-focus-within/ciclo:opacity-100"
                                onPointerDown={(e) => e.stopPropagation()}
                                onPointerUp={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSeletorCiclosAberto(false);
                                  setCicloParaExcluir(c);
                                }}
                                onKeyDown={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            ) : undefined
                          }
                        >
                          {c.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <NovoCicloDialog onSubmit={(dados) => criarCiclo.mutate(dados)} salvando={criarCiclo.isPending} />
              </div>
            </div>
            <AlertDialog
              open={!!cicloParaExcluir}
              onOpenChange={(aberto) => {
                if (!aberto && !excluirCiclo.isPending) setCicloParaExcluir(null);
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {idDemonstrativo(cicloParaExcluir?.id) ? 'Ocultar ciclo demonstrativo' : 'Excluir ciclo'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {idDemonstrativo(cicloParaExcluir?.id) ? (
                      <>
                        O ciclo <strong>{cicloParaExcluir?.nome}</strong> será ocultado desta lista. Os mocks originais
                        permanecem intactos e a alteração fica salva neste navegador.
                      </>
                    ) : (
                      <>
                        Tem certeza que deseja excluir <strong>{cicloParaExcluir?.nome}</strong>? Ciclos com avaliações,
                        aprovações, metas, PDI ou histórico não serão apagados; nesse caso a operação será bloqueada.
                      </>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={excluirCiclo.isPending}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive-vivid text-white hover:bg-destructive-vivid/90"
                    disabled={excluirCiclo.isPending}
                    onClick={() => {
                      if (cicloParaExcluir) excluirCiclo.mutate(cicloParaExcluir);
                    }}
                  >
                    {excluirCiclo.isPending
                      ? 'Processando...'
                      : idDemonstrativo(cicloParaExcluir?.id)
                        ? 'Ocultar'
                        : 'Excluir'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

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
                podeExcluir={podeExcluirCiclos}
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
                onEditarFeedback={(item, dados) =>
                  editarFeedback.mutate({ id: String((item.feedback as { id?: unknown })?.id ?? ''), dados })
                }
                salvandoFeedback={criarFeedback.isPending || editarFeedback.isPending}
                /* ── Subaba "Aguardando gestor" ────────────────────────────────
                   Somente no MODO REAL os controles de escrita são liberados (a
                   fila continua visível em demonstração, como leitura). O ciclo
                   é obrigatório no payload: sem ele a RPC não tem chave. */
                papel={papel}
                papeis={papeisDoUsuario}
                servicoDemo={servicoDemo}
                acoesAprovacaoHabilitadas
                modoAprovacao={demoAtivo ? 'demonstracao' : 'real'}
                validacoesPotencial={validacoesEfetivas}
                encaminhamentos={encaminhamentosEfetivos}
                versoesPorFeedback={versoesPorFeedback}
                consolidacoes={consolidacoes}
                aprovacoesGestor={aprovacoesEfetivas}
                vinculos={vinculosEfetivos}
                autorizacoesAprovacao={autorizacoesAprovacao}
                usuarioId={user?.id ?? null}
                salvandoAprovacao={
                  enviarAprovacao.isPending ||
                  decidirAprovacao.isPending ||
                  validarPotencialAprovacao.isPending ||
                  enviarAprovacaoDemo.isPending ||
                  decidirAprovacaoDemo.isPending ||
                  validarPotencialDemo.isPending
                }
                onEnviarAprovacao={(p) => {
                  if (!p.cicloId) {
                    toast.error('Envio NÃO realizado: a avaliação está sem ciclo vinculado.');
                    return;
                  }
                  if (linhaDemonstrativa(p)) {
                    enviarAprovacaoDemo.mutate({
                      colaboradorId: p.colaboradorId,
                      cicloId: p.cicloId,
                      versaoAvaliacao: p.versaoAvaliacao,
                      devolvida: p.status === 'devolvida',
                    });
                    return;
                  }
                  enviarAprovacao.mutate({ colaboradorId: p.colaboradorId, cicloId: p.cicloId });
                }}
                onDecidirAprovacao={(p, decisao, justificativa) => {
                  if (!p.cicloId) {
                    toast.error('Decisão NÃO registrada: a avaliação está sem ciclo vinculado.');
                    return;
                  }
                  if (linhaDemonstrativa(p)) {
                    decidirAprovacaoDemo.mutate({
                      colaboradorId: p.colaboradorId,
                      cicloId: p.cicloId,
                      decisao,
                      justificativa: justificativa ?? null,
                      versaoAvaliacao: String(p.versaoAvaliacao ?? ''),
                    });
                    return;
                  }
                  decidirAprovacao.mutate({
                    colaboradorId: p.colaboradorId,
                    cicloId: p.cicloId,
                    decisao,
                    justificativa: justificativa ?? null,
                  });
                }}
                onValidarPotencial={(p) => {
                  if (linhaDemonstrativa(p)) {
                    validarPotencialDemo.mutate({
                      colaboradorId: p.colaboradorId,
                      cicloId: String(p.cicloId ?? ''),
                      versaoAvaliacao: String(p.versaoAvaliacao ?? ''),
                      versaoValidacao: String(p.versaoValidacao ?? ''),
                    });
                    return;
                  }
                  validarPotencialAprovacao.mutate({ feedbackId: p.feedbackId });
                }}
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
                validacoesPotencial={validacoesEfetivas}
                versoesPorFeedback={versoesPorFeedback}
                aprovacoesDemo={estadoDemo}
                idsFluxoDemo={idsFluxoDemo}
                /* MESMA fonte de aprovação/versão da fila: o Nine-Box não
                   classifica uma avaliação sem aprovação vigente do gestor. */
                aprovacoesGestor={aprovacoesEfetivas}
                consolidacoes={consolidacoes}
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
