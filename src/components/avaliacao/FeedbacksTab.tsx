import { useMemo, useRef, useState } from 'react';
import { useMovimentoReduzido } from '@/lib/motionMode';
import { EntradaPresenca } from './entradaCards';
import { FeedbackDetalheDialog } from './FeedbackDetalheDialog';
import { FeedbacksFiltros } from './FeedbacksFiltros';
import { FeedbacksFocoBanner } from './FeedbacksFocoBanner';
import { FeedbacksResumo } from './FeedbacksResumo';
import { FeedbacksTimeline } from './FeedbacksTimeline';
import { NovoFeedbackDialog } from './NovoFeedbackDialog';
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
  /** PDIs já carregados (competência em foco do avaliado). */
  pdis?: any[];
  /** Cria o feedback (mutation real da página). */
  onCriarFeedback?: (dados: Record<string, unknown>) => void;
  /** Estado de envio do dialog de novo feedback. */
  salvandoFeedback?: boolean;
}

/** Ordem fixa de exibição dos tipos (a mesma dos chips). */
const ORDEM_TIPOS: TipoFeedback[] = ['gestor', 'par', 'auto', 'subordinado'];

export function FeedbacksTab({
  feedbacks,
  ciclos = [],
  ciclo,
  colaboradores = [],
  pdis = [],
  onCriarFeedback,
  salvandoFeedback = false,
}: FeedbacksTabProps) {
  const reduzirMovimento = useMovimentoReduzido();
  const referenciaTimeline = useRef<HTMLDivElement>(null);

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

  return (
    <EntradaPresenca>
      <div className="space-y-4">
        <FeedbacksFocoBanner
          pendentes={pendentesDoCiclo.length}
          prazo={prazo}
          indice={0}
          onVerPendentes={verPendentes}
        />

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
        />

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
      </div>

      <FeedbackDetalheDialog
        item={detalhe}
        aberto={detalheAberto}
        onOpenChange={setDetalheAberto}
        onFiltrarAvaliado={setBusca}
      />

      <NovoFeedbackDialog
        aberto={novoAberto}
        onOpenChange={setNovoAberto}
        colaboradores={colaboradores.map((c) => ({
          id: String(c?.id ?? ''),
          nome_completo: String(c?.nome_completo ?? ''),
        }))}
        ciclos={ciclos.map((c: any) => ({ id: String(c?.id ?? ''), nome: String(c?.nome ?? 'Ciclo') }))}
        cicloIdPadrao={String(ciclo?.id ?? '')}
        onSubmit={(dados) => onCriarFeedback?.(dados)}
        salvando={salvandoFeedback}
      />
    </EntradaPresenca>
  );
}
