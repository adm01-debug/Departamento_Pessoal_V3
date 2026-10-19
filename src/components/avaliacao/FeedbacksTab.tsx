import { useMemo, useRef, useState } from 'react';
import { useMovimentoReduzido } from '@/lib/motionMode';
import { EntradaPresenca } from './entradaCards';
import { FeedbackDetalheDialog } from './FeedbackDetalheDialog';
import { modoRealAtivo } from './nineBoxModo';
import type { ServicoAcoes } from './FeedbackAcoesRodape';
import type { ContextoAcoes } from './FeedbackAcoesRodape';
import { FeedbacksFiltros } from './FeedbacksFiltros';
import { FeedbacksFocoBanner } from './FeedbacksFocoBanner';
import { FeedbacksResumo } from './FeedbacksResumo';
import { FeedbacksTimeline } from './FeedbacksTimeline';
import { NovoFeedbackDialog } from './NovoFeedbackDialog';
import { PendenciasAprovacao } from './PendenciasAprovacao';
import { normalizarFeedback, type FeedbackCanonico } from './feedbackCanonico';
import { capacidadesAvaliacao } from './papeisAvaliacao';
import { consolidarNineBox360, pontos360 } from './nineBox360';
import type { ValidacaoPotencial } from './motorAvaliacao360';
import {
  contarAguardandoGestor,
  derivarPendencias,
  type ClassificacaoNineBox,
  type EstadoAprovacao,
  type PendenciaAprovacao,
} from './aprovacaoGestor';
import {
  agruparPorMes,
  avaliadoresDisponiveis,
  contagemTipos,
  contarPorSegmento,
  deltaMedia,
  derivarFeedbacks,
  descricaoPrazoCiclo,
  distribuicaoNotas,
  mediaNotas,
  ordenarFeedbacks,
  pendentes as filtrarPendentes,
  tipoFeedback,
  type CriterioOrdemFeedback,
  type FeedbackDerivado,
  type SegmentoFeedback,
  type TipoFeedback,
} from './feedbacksComum';

/**
 * ============================================================================
 * ABA "FEEDBACKS" — composição completa da tela (nova arquitetura visual).
 *
 * Ordem visual (a da referência): (A) banner "Foco agora" → (B) busca/filtros →
 * (C) chips de segmentação → (D) layout de DUAS colunas — timeline de cards
 * agrupados por mês à esquerda e widgets de resumo à direita.
 *
 * FONTE DOS DADOS: a lista já carregada por `AvaliacaoPage`
 * (`getMockFeedbacks()` ou `avaliacaoService.listarFeedbacks`). Toda a derivação
 * é client-side — nenhuma consulta nova e nenhuma escrita fora da mutation que a
 * página já expõe (`onCriarFeedback`).
 *
 * RECORTE POR CICLO: a aba trabalha sobre o ciclo em foco (o mesmo do seletor do
 * topo). O delta da nota média compara com o ciclo IMEDIATAMENTE anterior (por
 * `data_inicio`) e só aparece quando os dois lados têm nota.
 *
 * ENTRADA: `EntradaPresenca` libera o keyframe `hidden` que o `initial={false}`
 * do PageTransition bloqueia, e cada bloco entra na cascata `entradaCard` na
 * ordem de leitura — banner (0), filtros (1), cards da timeline e widgets.
 * ============================================================================
 */

interface FeedbacksTabProps {
  /** Todos os feedbacks da empresa (a página já carrega; nada novo é buscado). */
  feedbacks: any[];
  /** Ciclos cadastrados (para o delta e para o dialog de novo feedback). */
  ciclos?: any[];
  /** Ciclo em foco no seletor do topo. */
  ciclo?: any;
  /** Colaboradores já carregados pela página (cargo/departamento). */
  colaboradores?: {
    id?: string | null;
    nome_completo?: string | null;
    cargo?: string | null;
    departamento?: string | null;
    /** Vínculo de supervisão — recuo da demonstração para o gestor responsável. */
    supervisor_id?: string | null;
  }[];
  /**
   * Opções REAIS (UUID) para o FORMULÁRIO de criação. Quando informadas, o
   * "Novo Feedback" lista SOMENTE IDs reais — nunca `mock-*` (que a guarda de
   * escrita recusa). A EXIBIÇÃO continua usando `colaboradores`/`ciclos`.
   */
  colaboradoresReais?: {
    id?: string | null;
    nome_completo?: string | null;
    cargo?: string | null;
    departamento?: string | null;
  }[];
  ciclosReais?: any[];
  /** PDIs já carregados (competência em foco do avaliado). */
  pdis?: any[];
  /** Cria o feedback (mutation real da página). */
  onCriarFeedback?: (dados: Record<string, unknown>) => void;
  /**
   * SALVA a edição de um registro existente (formulário reutilizado). No modo
   * real passa pela RPC `editar_feedback_seguro`; na vitrine, pelo armazenamento
   * local. Concluída é reaberta e as aprovações da versão anterior são
   * invalidadas pela versão consolidada.
   */
  onEditarFeedback?: (item: FeedbackCanonico, dados: Record<string, unknown>) => void;
  /** Estado de envio do dialog de novo feedback. */
  salvandoFeedback?: boolean;
  /* ── Subaba "Aguardando gestor" (fluxo de aprovação do gestor) ─────────────
     Tudo opcional: sem estes props a aba continua EXATAMENTE a de antes, com
     apenas a segunda visualização mostrando a fila derivada dos dados atuais. */
  /** Validações de Potencial já carregadas (modo real). */
  validacoesPotencial?: ValidacaoPotencial[];
  /** Versão canônica por feedback (`vw_feedbacks_360_versao`). */
  versoesPorFeedback?: Record<string, string>;
  /** Cabeçalho do fluxo: `enviado_em` por colaborador+ciclo. */
  consolidacoes?: unknown[];
  /** Histórico de decisões do gestor. */
  aprovacoesGestor?: unknown[];
  /**
   * VÍNCULOS (`id`, `user_id`, `supervisor_id`) da empresa — a prova de quem é o
   * gestor responsável. É o que faz a pendência ser atribuída ao gestor CERTO
   * (não ao avaliador do registro) e o que mantém os controles fora da tela de
   * gestores sem autorização. Vazio = ambiente sem vínculos (vitrine).
   */
  vinculos?: { id?: string | null; user_id?: string | null; supervisor_id?: string | null }[];
  /** Usuário autenticado — entra na prova de responsabilidade. */
  usuarioId?: string | null;
  /** VITRINE: encaminhamentos automáticos (`chave → { em }`) — data do envio. */
  encaminhamentos?: Record<string, { em?: string | null } | undefined>;
  /** Papel do usuário (`admin` | `rh` | `gestor` | `user`). */
  papel?: string | null;
  /**
   * LISTA de papéis da conta (`user_roles`). É a fonte das CAPACIDADES do fluxo:
   * `admin` não anula `gestor` (envio × decisão × validação do Potencial).
   */
  papeis?: readonly string[] | null;
  /**
   * VITRINE: serviço demonstrativo (persistência local) repassado ao rodapé do
   * modal — os MESMOS controles executam a ação sem tocar no Supabase.
   */
  servicoDemo?: ServicoAcoes;
  /** `true` só no modo real: libera os controles de escrita da aprovação. */
  acoesAprovacaoHabilitadas?: boolean;
  /**
   * Onde a decisão é persistida: `real` (RPC oficial) ou `demonstracao`
   * (armazenamento local da vitrine). Muda apenas o TEXTO do aviso do rodapé —
   * o desenho é o mesmo.
   */
  modoAprovacao?: 'real' | 'demonstracao';
  /** Operação de aprovação em andamento. */
  salvandoAprovacao?: boolean;
  onEnviarAprovacao?: (p: PendenciaAprovacao) => void;
  onDecidirAprovacao?: (
    p: PendenciaAprovacao,
    decisao: 'aprovado' | 'devolvido',
    justificativa?: string | null
  ) => void;
  onValidarPotencial?: (p: PendenciaAprovacao) => void;
}

/** Ordem fixa de exibição dos tipos (a mesma dos chips). */
const ORDEM_TIPOS: TipoFeedback[] = ['gestor', 'par', 'auto', 'subordinado'];

export function FeedbacksTab({
  feedbacks,
  ciclos = [],
  ciclo,
  colaboradores = [],
  colaboradoresReais,
  ciclosReais,
  pdis = [],
  onCriarFeedback,
  onEditarFeedback,
  salvandoFeedback = false,
  validacoesPotencial = [],
  versoesPorFeedback = {},
  consolidacoes = [],
  aprovacoesGestor = [],
  vinculos = [],
  usuarioId = null,
  encaminhamentos = {},
  papel = null,
  papeis = null,
  servicoDemo,
  acoesAprovacaoHabilitadas = false,
  modoAprovacao = modoRealAtivo() ? 'real' : 'demonstracao',
  salvandoAprovacao = false,
  onEnviarAprovacao,
  onDecidirAprovacao,
  onValidarPotencial,
}: FeedbacksTabProps) {
  const reduzirMovimento = useMovimentoReduzido();
  const referenciaTimeline = useRef<HTMLDivElement>(null);

  /**
   * VISUALIZAÇÃO INTERNA da aba: `avaliacoes` é a lista aprovada (intacta) e
   * `aguardando` é a fila de aprovação do gestor. O seletor é o MESMO
   * `ColoredFilterChip` do Design System usado por todos os filtros do módulo —
   * nenhuma peça visual nova.
   */
  const [visao, setVisao] = useState<'avaliacoes' | 'aguardando'>('avaliacoes');

  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('');
  const [avaliador, setAvaliador] = useState('');
  const [somentePendentes, setSomentePendentes] = useState(false);
  const [segmento, setSegmento] = useState<SegmentoFeedback>('todos');
  const [ordem, setOrdem] = useState<CriterioOrdemFeedback>('recentes');

  const [detalhe, setDetalhe] = useState<FeedbackCanonico | null>(null);
  const [detalheAberto, setDetalheAberto] = useState(false);
  const [novoAberto, setNovoAberto] = useState(false);
  /** Registro em EDIÇÃO (mesmo formulário do "Novo feedback", preenchido). */
  const [editando, setEditando] = useState<FeedbackCanonico | null>(null);

  /** Todas as derivações de uma vez (um contexto vale para a lista inteira). */
  const derivadas = useMemo(
    () => derivarFeedbacks(feedbacks, { colaboradores, pdis, ciclos }),
    [feedbacks, colaboradores, pdis, ciclos]
  );

  /** Recorte do ciclo em foco (mesma régua do seletor do topo). */
  const doCiclo = useMemo(() => {
    const alvo = String(ciclo?.id ?? '');
    return alvo ? derivadas.filter((d) => String(d.feedback?.ciclo_id ?? '') === alvo) : derivadas;
  }, [derivadas, ciclo?.id]);

  /** Ciclo IMEDIATAMENTE anterior (por `data_inicio`) — base do delta da média. */
  const doCicloAnterior = useMemo(() => {
    const inicioAtual = new Date(String(ciclo?.data_inicio ?? '')).getTime();
    if (!Number.isFinite(inicioAtual)) return [];
    const anterior = [...ciclos]
      .filter((c) => {
        const ms = new Date(String(c?.data_inicio ?? '')).getTime();
        return Number.isFinite(ms) && ms < inicioAtual;
      })
      .sort(
        (a, b) => new Date(String(b?.data_inicio ?? '')).getTime() - new Date(String(a?.data_inicio ?? '')).getTime()
      )[0];
    if (!anterior) return [];
    return derivadas.filter((d) => String(d.feedback?.ciclo_id ?? '') === String(anterior.id));
  }, [derivadas, ciclos, ciclo?.data_inicio]);

  /** Tipos realmente presentes no ciclo (opções do select). */
  const tipos = useMemo(() => {
    const vistos = new Set(doCiclo.map((d) => d.tipo));
    return ORDEM_TIPOS.filter((t) => vistos.has(t));
  }, [doCiclo]);

  const avaliadores = useMemo(() => avaliadoresDisponiveis(doCiclo), [doCiclo]);

  /** Busca + Tipo + Avaliador + pendentes (antes do chip de segmentação). */
  const base = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return doCiclo.filter((d) => {
      if (tipo && d.tipo !== tipo) return false;
      if (avaliador && d.avaliador !== avaliador) return false;
      if (somentePendentes && !d.pendente) return false;
      if (!termo) return true;
      return d.busca.includes(termo);
    });
  }, [doCiclo, busca, tipo, avaliador, somentePendentes]);

  /** Contadores dos chips: derivados do recorte ANTES do próprio segmento. */
  const contagem = useMemo(() => contarPorSegmento(base), [base]);

  const lista = useMemo(
    () => ordenarFeedbacks(segmento === 'todos' ? base : base.filter((d) => d.segmento === segmento), ordem),
    [base, segmento, ordem]
  );

  // Widgets e banner olham o CICLO inteiro (visão de conjunto), não o recorte
  // dos filtros — assim os números não "pulam" a cada tecla digitada na busca.
  const pendentesDoCiclo = useMemo(() => filtrarPendentes(doCiclo), [doCiclo]);
  const distribuicao = useMemo(() => distribuicaoNotas(doCiclo), [doCiclo]);
  const media = useMemo(() => mediaNotas(doCiclo), [doCiclo]);
  const delta = useMemo(() => deltaMedia(doCiclo, doCicloAnterior), [doCiclo, doCicloAnterior]);
  const tiposDoCiclo = useMemo(() => contagemTipos(doCiclo), [doCiclo]);
  const prazo = useMemo(() => descricaoPrazoCiclo(ciclo), [ciclo]);

  /* ── Fila de aprovação do gestor (subaba "Aguardando gestor") ─────────────
     A classificação vem do MESMO motor do Nine-Box (`consolidarNineBox360` →
     `pontos360`): o desempenho exibido é o CONSOLIDADO 360° e o quadrante só
     aparece quando o RH valida o Potencial — é a "classificação automática" do
     passo 7 do fluxo, sem nenhuma fórmula nova. Fora do modo real a versão
     canônica não existe e a derivação usa a MESMA regra sobre a lista atual. */
  const classificacoes = useMemo(() => {
    const mapa: Record<string, ClassificacaoNineBox> = {};
    pontos360(
      consolidarNineBox360({
        feedbacks,
        cicloId: String(ciclo?.id ?? '') || null,
        validacoes: validacoesPotencial,
        versoesPorFeedback,
      }),
      colaboradores,
      pdis
    ).forEach((p) => {
      mapa[p.colaboradorId] = {
        desempenho: p.desempenho,
        potencial: p.potencial,
        quadrante: p.quadrante,
        nomeQuadrante: p.nomeQuadrante,
        motivoNaoClassificado: p.motivoNaoClassificado,
      };
    });
    return mapa;
  }, [feedbacks, ciclo?.id, validacoesPotencial, versoesPorFeedback, colaboradores, pdis]);

  const pendencias = useMemo(
    () =>
      derivarPendencias({
        // `doCiclo` é a forma DERIVADA (para a timeline); a fila de aprovação lê
        // os REGISTROS CRUS do ciclo — mesma lista, sem consulta nova.
        feedbacks: doCiclo.map((d) => d.feedback),
        colaboradores,
        ciclos,
        versoesPorFeedback,
        aprovacoes: aprovacoesGestor,
        consolidacoes,
        validacoes: validacoesPotencial,
        classificacoes,
        // PROVA DO GESTOR RESPONSÁVEL: vínculo (`supervisor_id`→`user_id`) + usuário
        // autenticado. Sem isto a pendência era atribuída ao AVALIADOR do registro.
        vinculos,
        usuarioId,
        encaminhamentos,
        // FALLBACK DE ESCOPO (sem vínculo): RH/admin decide a consolidação órfã
        // de gestor — mesma condição do servidor (`pode_aprovar_colaborador`).
        podeGerirAvaliacoes: capacidadesAvaliacao(papeis).podeGerirAvaliacoes,
        // ORIGEM DA VERSÃO: `demonstracao` sintetiza a versão a partir da
        // avaliação concluída do gestor; `real` lê a view oficial. É o MODO DE
        // OPERAÇÃO (não "ações habilitadas") — na vitrine a fila continua
        // enxergando as avaliações prontas para aprovação.
        modo: modoAprovacao,
      }),
    [
      doCiclo,
      colaboradores,
      ciclos,
      versoesPorFeedback,
      aprovacoesGestor,
      consolidacoes,
      validacoesPotencial,
      classificacoes,
      vinculos,
      usuarioId,
      encaminhamentos,
      modoAprovacao,
      // `podeGerirAvaliacoes` sai dos papéis (escopo amplo RH/admin).
      papeis,
    ]
  );

  /** Contador dinâmico da subaba: quantas avaliações aguardam o gestor agora. */
  const aguardandoGestor = useMemo(() => contarAguardandoGestor(pendencias), [pendencias]);

  /* ── MODELO CANÔNICO (card, fila e modal falam o MESMO objeto) ─────────────
     A lista é convertida UMA vez por apresentação. A linha da fila do mesmo
     (colaborador × ciclo) é a fonte do gestor responsável e da situação da
     aprovação — é o que impede o card de dizer "Gestor não atribuído" enquanto
     a fila mostra o gestor correto (ou o contrário). Nada é consultado de novo. */
  const pendenciaDe = useMemo(() => {
    const mapa: Record<string, PendenciaAprovacao> = {};
    pendencias.forEach((p) => {
      if (p.colaboradorId && p.cicloId) mapa[`${p.colaboradorId}::${p.cicloId}`] = p;
    });
    return mapa;
  }, [pendencias]);

  const nomePorColaborador = useMemo(() => {
    const mapa = new Map<string, string>();
    colaboradores.forEach((c) => {
      const id = String(c?.id ?? '');
      const nome = String(c?.nome_completo ?? '').trim();
      if (id && nome) mapa.set(id, nome);
    });
    return mapa;
  }, [colaboradores]);

  /**
   * `supervisor_id` por colaborador. O vínculo (`vinculos`, consulta real) tem
   * precedência; a lista de colaboradores é o RECUO da demonstração (os mocks já
   * trazem `supervisor_id`) — nenhum nome é inventado a partir do avaliador.
   */
  const supervisorPorColaborador = useMemo(() => {
    const mapa = new Map<string, string>();
    colaboradores.forEach((c) => {
      const id = String(c?.id ?? '');
      const supervisor = String(c?.supervisor_id ?? '');
      if (id && supervisor) mapa.set(id, supervisor);
    });
    vinculos.forEach((v) => {
      const id = String(v?.id ?? '');
      const supervisor = String(v?.supervisor_id ?? '');
      if (id && supervisor) mapa.set(id, supervisor);
    });
    return mapa;
  }, [colaboradores, vinculos]);

  const nomePorCiclo = useMemo(() => {
    const mapa = new Map<string, string>();
    ciclos.forEach((c: any) => {
      const id = String(c?.id ?? '');
      if (id) mapa.set(id, String(c?.nome ?? ''));
    });
    return mapa;
  }, [ciclos]);

  const listaCanonica = useMemo(
    () =>
      lista.map((d) => {
        const f = (d.feedback ?? {}) as Record<string, unknown>;
        const colaboradorId = String(f.avaliado_id ?? '');
        const cicloId = String(f.ciclo_id ?? '');
        const pendencia = pendenciaDe[`${colaboradorId}::${cicloId}`] ?? null;
        const supervisorId = supervisorPorColaborador.get(colaboradorId) ?? null;
        return normalizarFeedback(d, {
          cicloNome: nomePorCiclo.get(cicloId) ?? String(ciclo?.nome ?? ''),
          pendencia,
          gestorResponsavel: supervisorId ? (nomePorColaborador.get(supervisorId) ?? null) : null,
          papeis,
          acoesHabilitadas: acoesAprovacaoHabilitadas,
          podeVerColaborador: true,
        });
      }),
    [
      lista,
      pendenciaDe,
      supervisorPorColaborador,
      nomePorColaborador,
      nomePorCiclo,
      ciclo?.nome,
      papeis,
      acoesAprovacaoHabilitadas,
    ]
  );

  const grupos = useMemo(() => agruparPorMes(listaCanonica), [listaCanonica]);

  /**
   * ESTADO DA APROVAÇÃO por (colaborador × ciclo) — a MESMA instância derivada
   * da fila (`PendenciaAprovacao.estado`). É o que o modal "Ver feedback"
   * consome, para que listagem, contador, modal, etapa do RH e elegibilidade no
   * Nine-Box falem de UM só estado (antes o rodapé só olhava o `status` do
   * registro e divergia da fila).
   */
  const estadosAprovacao = useMemo(() => {
    const mapa: Record<string, EstadoAprovacao> = {};
    pendencias.forEach((p) => {
      if (p.colaboradorId && p.cicloId) mapa[`${p.colaboradorId}::${p.cicloId}`] = p.estado;
    });
    return mapa;
  }, [pendencias]);

  /**
   * O estado é da CONSOLIDAÇÃO do colaborador × ciclo — vale para o cartão de
   * QUALQUER categoria (gestor, par, auto, subordinado), porque a aprovação é
   * do conjunto, não de uma avaliação isolada.
   */
  const estadoDoDetalhe = useMemo(() => {
    const f = (detalhe?.feedback ?? {}) as Record<string, unknown>;
    if (!detalhe) return null;
    return estadosAprovacao[`${String(f.avaliado_id ?? '')}::${String(f.ciclo_id ?? '')}`] ?? null;
  }, [detalhe, estadosAprovacao]);

  /**
   * ETAPA do modal aberto — decide o CONJUNTO de ações do rodapé (regra única):
   *  • aberto na listagem (Avaliações) → ações do STATUS do registro;
   *  • aberto na fila, pendente do gestor → só Aprovar/Devolver;
   *  • aberto na fila, aguardando o RH   → só Validar Potencial.
   */
  const contextoDoDetalhe: ContextoAcoes =
    visao !== 'aguardando' ? 'avaliacoes' : estadoDoDetalhe?.status === 'aprovada_gestor' ? 'rh' : 'aguardando_gestor';

  const filtrosAtivos = (tipo ? 1 : 0) + (avaliador ? 1 : 0) + (somentePendentes ? 1 : 0);

  /**
   * Chave da APRESENTAÇÃO da timeline (vira a `key` do coordenador da entrada).
   * Entram só as escolhas DISCRETAS do usuário — ciclo, segmentação, tipo,
   * avaliador, ordenação e o recorte de pendentes. A busca livre fica de fora de
   * propósito: ela é refinamento contínuo do que já está na tela e reanimar a
   * lista a cada tecla (300 ms de debounce) pareceria defeito, não transição.
   */
  const apresentacao = [ciclo?.id ?? '', segmento, tipo, avaliador, ordem, somentePendentes ? 'pendentes' : ''].join(
    '|'
  );

  /** Limpa os filtros da LINHA 1 (a segmentação tem a própria linha de chips). */
  const limparFiltros = () => {
    setBusca('');
    setTipo('');
    setAvaliador('');
    setSomentePendentes(false);
  };

  /** Limpa TUDO — o estado vazio precisa garantir resultado. */
  const limparTudo = () => {
    limparFiltros();
    setSegmento('todos');
  };

  /** Ação do banner: liga o recorte de pendentes e leva o olho até a timeline. */
  const verPendentes = () => {
    setSomentePendentes(true);
    setSegmento('todos');
    referenciaTimeline.current?.scrollIntoView({
      behavior: reduzirMovimento ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  const abrirDetalhe = (item: FeedbackCanonico) => {
    setDetalhe(item);
    setDetalheAberto(true);
  };

  /**
   * EDIÇÃO (filtros normais): abre o formulário EXISTENTE preenchido. Não há
   * segundo modal, nem cópia da tela de detalhe.
   */
  const abrirEdicao = (item: FeedbackCanonico) => {
    setEditando(item);
    setNovoAberto(true);
  };

  /** "Ver avaliação" da fila reusa o MESMO dialog de detalhe do módulo. */
  const abrirAvaliacao = (p: PendenciaAprovacao) => {
    const derivado = derivarFeedbacks([p.feedback], { colaboradores, pdis, ciclos })[0];
    if (!derivado) return;
    abrirDetalhe(
      normalizarFeedback(derivado, {
        cicloNome: p.cicloNome,
        pendencia: p,
        gestorResponsavel: p.gestorResponsavel,
        papeis,
        acoesHabilitadas: acoesAprovacaoHabilitadas,
        podeVerColaborador: true,
      })
    );
  };

  return (
    <EntradaPresenca>
      <div className="space-y-4">
        {/* O banner "Foco agora" pertence à LISTAGEM: ao entrar na fila de
            aprovação a aba mostra exclusivamente as pendências do gestor. */}
        {visao === 'avaliacoes' && (
          <FeedbacksFocoBanner
            pendentes={pendentesDoCiclo.length}
            prazo={prazo}
            indice={0}
            onVerPendentes={verPendentes}
          />
        )}

        {/* Busca/filtros/segmentação — SEMPRE visível: é a ÚNICA linha de chips
            coloridos da aba e é ela que carrega o recorte "Aguardando gestor"
            (ao lado de Todos/Gestor/Pares/Autoavaliação) e o retorno por
            "Todos". Nenhum bloco novo: o chip extra usa o MESMO
            `ColoredFilterChip` e a MESMA linha da segmentação. */}
        <FeedbacksFiltros
          indice={1}
          busca={busca}
          onBusca={setBusca}
          tipo={tipo}
          onTipo={setTipo}
          tipos={tipos}
          avaliador={avaliador}
          onAvaliador={setAvaliador}
          avaliadores={avaliadores}
          somentePendentes={somentePendentes}
          onSomentePendentes={setSomentePendentes}
          ordem={ordem}
          onOrdem={setOrdem}
          segmento={segmento}
          onSegmento={setSegmento}
          contagem={contagem}
          filtrosAtivos={filtrosAtivos}
          onLimpar={limparFiltros}
          aguardandoGestor={aguardandoGestor}
          visaoAguardando={visao === 'aguardando'}
          onVisaoAguardando={(ativo) => setVisao(ativo ? 'aguardando' : 'avaliacoes')}
        />

        {visao === 'avaliacoes' ? (
          <>
            {/* Duas colunas: timeline (maior) + widgets de resumo.
            `xl:pt-[30px]` = `DESLOCAMENTO_LATERAL` (18 da altura do marco do mês
            + 12 do vão até o primeiro card, ver `FeedbacksTimeline`): é o que faz
            "Distribuição de notas" começar na borda do primeiro CARD de feedback
            em vez da borda do título do mês. Só vale no layout de duas colunas —
            empilhado (`< xl`), a compensação NÃO se aplica.
            O teste `FeedbacksAlinhamentoLateral` falha se os dois números
            divergirem, então não há como alterar um sem o outro. */}
            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div ref={referenciaTimeline} className="min-w-0">
                {/* O índice 0 da cascata é o PRIMEIRO card da lista — é ele que
                recebe a expansão do centro para as bordas, e a sequência dos
                demais é relativa à lista (não à ordem dos blocos da aba).
                Quem comanda tudo é o coordenador (`ListaCoordenada`), chaveado
                pela `apresentacao`. */}
                <FeedbacksTimeline
                  grupos={grupos}
                  apresentacao={apresentacao}
                  reduzirMovimento={reduzirMovimento}
                  onEditar={abrirEdicao}
                  onFiltrarAvaliador={setAvaliador}
                  onFiltrarAvaliado={setBusca}
                  onLimpar={limparTudo}
                />
              </div>

              <div className="min-w-0 xl:pt-[30px]">
                <FeedbacksResumo
                  distribuicao={distribuicao}
                  media={media}
                  delta={delta}
                  tipos={tiposDoCiclo}
                  total={doCiclo.length}
                  indiceBase={2}
                  reduzirMovimento={reduzirMovimento}
                  onNovoFeedback={() => setNovoAberto(true)}
                />
              </div>
            </div>
          </>
        ) : (
          <PendenciasAprovacao
            pendencias={pendencias}
            papel={papel}
            papeis={papeis}
            acoesHabilitadas={acoesAprovacaoHabilitadas}
            modo={modoAprovacao}
            salvando={salvandoAprovacao}
            indiceBase={0}
            onVerAvaliacao={abrirAvaliacao}
            onEnviar={onEnviarAprovacao}
            onDecidir={onDecidirAprovacao}
            onValidarPotencial={onValidarPotencial}
          />
        )}
      </div>

      <FeedbackDetalheDialog
        item={detalhe}
        aberto={detalheAberto}
        onOpenChange={setDetalheAberto}
        onFiltrarAvaliado={setBusca}
        estadoAprovacao={estadoDoDetalhe}
        servicoDemo={servicoDemo}
        contexto={contextoDoDetalhe}
      />

      <NovoFeedbackDialog
        key={
          editando
            ? `ed-${String((editando.feedback as { id?: unknown })?.id ?? '')}`
            : `novo-${String(ciclo?.id ?? '')}`
        }
        aberto={novoAberto}
        onOpenChange={(aberto) => {
          setNovoAberto(aberto);
          if (!aberto) setEditando(null);
        }}
        colaboradores={(colaboradoresReais ?? colaboradores).map((c) => ({
          id: String(c?.id ?? ''),
          nome_completo: String(c?.nome_completo ?? ''),
        }))}
        ciclos={(ciclosReais ?? ciclos).map((c: any) => ({
          id: String(c?.id ?? ''),
          nome: String(c?.nome ?? 'Ciclo'),
        }))}
        cicloIdPadrao={String((ciclosReais && ciclosReais.length ? ciclosReais[0] : ciclo)?.id ?? '')}
        registro={editando}
        onSubmit={(dados) => {
          if (editando) {
            onEditarFeedback?.(editando, dados);
            return;
          }
          onCriarFeedback?.(dados);
        }}
        salvando={salvandoFeedback}
      />
    </EntradaPresenca>
  );
}
