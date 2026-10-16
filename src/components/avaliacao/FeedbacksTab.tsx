import { useMemo, useRef, useState } from 'react';
import { useMovimentoReduzido } from '@/lib/motionMode';
import { EntradaPresenca } from './entradaCards';
import { FeedbackDetalheDialog } from './FeedbackDetalheDialog';
import { FeedbacksFiltros } from './FeedbacksFiltros';
import { FeedbacksFocoBanner } from './FeedbacksFocoBanner';
import { FeedbacksResumo } from './FeedbacksResumo';
import { FeedbacksTimeline } from './FeedbacksTimeline';
import { NovoFeedbackDialog } from './NovoFeedbackDialog';
import { PendenciasAprovacao } from './PendenciasAprovacao';
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
  /** Papel do usuário (`admin` | `rh` | `gestor` | `user`). */
  papel?: string | null;
  /** `true` só no modo real: libera os controles de escrita da aprovação. */
  acoesAprovacaoHabilitadas?: boolean;
  /** Operação de aprovação em andamento. */
  salvandoAprovacao?: boolean;
  onEnviarAprovacao?: (p: PendenciaAprovacao) => void;
  onDecidirAprovacao?: (p: PendenciaAprovacao, decisao: 'aprovado' | 'devolvido', justificativa?: string | null) => void;
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
  salvandoFeedback = false,
  validacoesPotencial = [],
  versoesPorFeedback = {},
  consolidacoes = [],
  aprovacoesGestor = [],
  papel = null,
  acoesAprovacaoHabilitadas = false,
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

  const [detalhe, setDetalhe] = useState<FeedbackDerivado | null>(null);
  const [detalheAberto, setDetalheAberto] = useState(false);
  const [novoAberto, setNovoAberto] = useState(false);

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
        (a, b) =>
          new Date(String(b?.data_inicio ?? '')).getTime() - new Date(String(a?.data_inicio ?? '')).getTime()
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

  const grupos = useMemo(() => agruparPorMes(lista), [lista]);

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
        modo: acoesAprovacaoHabilitadas ? 'real' : 'demonstracao',
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
      acoesAprovacaoHabilitadas,
    ]
  );

  /** Contador dinâmico da subaba: quantas avaliações aguardam o gestor agora. */
  const aguardandoGestor = useMemo(() => contarAguardandoGestor(pendencias), [pendencias]);

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
   * O estado só vale para a avaliação que ANCORA a aprovação: a do GESTOR
   * (é a versão canônica que o servidor usa em `situacao_aprovacao`). Cartões de
   * Pares/Auto/Subordinados não recebem selo de aprovação de terceiros.
   */
  const estadoDoDetalhe = useMemo(() => {
    const f = (detalhe?.feedback ?? {}) as Record<string, unknown>;
    if (!detalhe || tipoFeedback(f.tipo) !== 'gestor') return null;
    return estadosAprovacao[`${String(f.avaliado_id ?? '')}::${String(f.ciclo_id ?? '')}`] ?? null;
  }, [detalhe, estadosAprovacao]);


  const filtrosAtivos = (tipo ? 1 : 0) + (avaliador ? 1 : 0) + (somentePendentes ? 1 : 0);

  /**
   * Chave da APRESENTAÇÃO da timeline (vira a `key` do coordenador da entrada).
   * Entram só as escolhas DISCRETAS do usuário — ciclo, segmentação, tipo,
   * avaliador, ordenação e o recorte de pendentes. A busca livre fica de fora de
   * propósito: ela é refinamento contínuo do que já está na tela e reanimar a
   * lista a cada tecla (300 ms de debounce) pareceria defeito, não transição.
   */
  const apresentacao = [ciclo?.id ?? '', segmento, tipo, avaliador, ordem, somentePendentes ? 'pendentes' : ''].join('|');

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

  const abrirDetalhe = (item: FeedbackDerivado) => {
    setDetalhe(item);
    setDetalheAberto(true);
  };

  /** "Ver avaliação" da fila reusa o MESMO dialog de detalhe do módulo. */
  const abrirAvaliacao = (p: PendenciaAprovacao) => {
    const derivado = derivarFeedbacks([p.feedback], { colaboradores, pdis, ciclos })[0];
    if (derivado) abrirDetalhe(derivado);
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
              onVerDetalhes={abrirDetalhe}
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
            acoesHabilitadas={acoesAprovacaoHabilitadas}
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
      />

      <NovoFeedbackDialog
        aberto={novoAberto}
        onOpenChange={setNovoAberto}
        colaboradores={(colaboradoresReais ?? colaboradores).map((c) => ({
          id: String(c?.id ?? ''),
          nome_completo: String(c?.nome_completo ?? ''),
        }))}
        ciclos={(ciclosReais ?? ciclos).map((c: any) => ({ id: String(c?.id ?? ''), nome: String(c?.nome ?? 'Ciclo') }))}
        cicloIdPadrao={String((ciclosReais && ciclosReais.length ? ciclosReais[0] : ciclo)?.id ?? '')}
        onSubmit={(dados) => onCriarFeedback?.(dados)}
        salvando={salvandoFeedback}
      />
    </EntradaPresenca>
  );
}
