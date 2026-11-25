/**
 * ============================================================================
 * TURNOS & ESCALAS — CORPO DO PAINEL (dono do estado da tela).
 * ============================================================================
 *
 * Uma única fonte de estado para o cabeçalho, os KPIs, os filtros, as três
 * visualizações e a coluna lateral:
 *
 *   visualizacao  → 'semana' | 'mes' | 'lista' (Semana é o padrão)
 *   ancora        → data de referência do período (setas e "Hoje" mudam)
 *   filtros       → busca, departamento, turno, status, "só com escala"
 *
 * Disso saem: o período aberto, o período anterior (base da variação) e as
 * escalas filtradas. Os componentes são só apresentação; toda agregação mora
 * em `turnosMetricas.ts` e toda data em `turnosCalendario.ts`.
 *
 * ── DETALHE DO DIA NO MÊS ──────────────────────────────────────────────────
 * Clicar num dia da grade mensal abre `DialogoDiaEscalas` — o detalhe não é
 * mais renderizado abaixo do calendário (a página não cresce ao clicar). O dia
 * aberto fica em `diaAberto` e é o que a grade destaca; a data e as escalas
 * saem do mesmo `escalasPorDia` que a grade desenha.
 *
 * ── "VER TODAS" DAS PRÓXIMAS ESCALAS ───────────────────────────────────────
 * O card lateral é resumo; o botão abre `DialogoProximasEscalas` com a janela
 * completa (`DIAS_PROXIMAS_ESCALAS`), agrupada por data por
 * `agruparEscalasPorDia` — mesma consulta, nenhum registro novo.
 *
 * ── O QUE VEM DO BANCO (nada de mock) ───────────────────────────────────────
 * turnos, escalas do período, escalas do período anterior, equipe ativa e as
 * escalas dos próximos 60 dias (card "Próximas escalas"). Ver
 * `useTurnosEscalas.ts`.
 *
 * ── PERMISSÃO DE ESCRITA ────────────────────────────────────────────────────
 * A matriz `public.permissions` ainda NÃO tem o recurso `turnos` (só
 * colaboradores/admissões/desligamentos/folha/usuários). Para não inventar um
 * recurso que ninguém pode ter, a escrita usa o mesmo critério de quem gerencia
 * equipe: `admin` OU quem pode ATUALIZAR colaboradores (papel `rh` na matriz
 * semeada). Sem permissão, a tela continua 100% navegável: calendário, mês,
 * lista, filtros, detalhes e conflitos continuam abrindo — só as ações de
 * criar/editar/excluir desaparecem.
 * ============================================================================
 */
import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useEmpresas } from '@/hooks';
import { turnoService } from '@/services/turnoService';
import { safeErrorMessage } from '@/utils/safeError';
import { CabecalhoTurnos } from './CabecalhoTurnos';
import { TurnosKpiCards } from './TurnosKpiCards';
import { BarraFiltrosEscalas } from './BarraFiltrosEscalas';
import { CalendarioSemanal } from './CalendarioSemanal';
import { CalendarioMensal } from './CalendarioMensal';
import { ListaEscalas } from './ListaEscalas';
import { ColunaLateralTurnos } from './ColunaLateralTurnos';
import { DialogoDetalhesEscala } from './DialogoDetalhesEscala';
import { DialogoDiaEscalas } from './DialogoDiaEscalas';
import { DialogoProximasEscalas } from './DialogoProximasEscalas';
import { DialogoNovaEscala } from './DialogoNovaEscala';
import { DialogoTurno } from './DialogoTurno';
import { DialogoGerenciarTurnos } from './DialogoGerenciarTurnos';
import { DialogoConflitos } from './DialogoConflitos';
import { DIAS_PROXIMAS_ESCALAS, useTurnosEscalas } from './useTurnosEscalas';
import {
  chaveData,
  dataDaChave,
  deslocarAncora,
  intervaloDoPeriodo,
  modoDaVisualizacao,
  periodoAnterior,
  rotuloDoPeriodo,
  type VisualizacaoTurnos,
} from './turnosCalendario';
import {
  agruparEscalasPorDia,
  calcularMetricasPainel,
  departamentosDaEquipe,
  detectarConflitos,
  FILTROS_ESCALAS_INICIAIS,
  filtrarEscalas,
  montarLinhasCalendario,
  proximasDatasComEscalas,
  statusDasEscalas,
  type EscalaRegistro,
  type FiltrosEscalas,
  type MembroEquipe,
  type TurnoRegistro,
} from './turnosMetricas';

/** Alvo do diálogo de detalhes (dia + escalas do colaborador naquele dia). */
interface AlvoDetalhes {
  data: string;
  escalas: EscalaRegistro[];
}

/** Alvo do diálogo de escala (criação com prefill ou edição). */
interface AlvoEscala {
  prefill: { colaboradorId: string; data: string } | null;
  edicao: EscalaRegistro | null;
}

export function TurnosConteudo() {
  const { empresaAtual } = useEmpresas();
  const { isAdmin } = useAuth();
  const { pode } = usePermissions();

  // Escrita: admin ou quem atualiza colaboradores (ver o comentário do topo).
  const podeGerenciar = isAdmin || pode('colaboradores', 'update');

  const [visualizacao, setVisualizacao] = useState<VisualizacaoTurnos>('semana');
  const [ancora, setAncora] = useState<Date>(() => new Date());
  const [filtros, setFiltros] = useState<FiltrosEscalas>(FILTROS_ESCALAS_INICIAIS);

  const [alvoDetalhes, setAlvoDetalhes] = useState<AlvoDetalhes | null>(null);
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);
  const [alvoEscala, setAlvoEscala] = useState<AlvoEscala | null>(null);
  const [turnoEmEdicao, setTurnoEmEdicao] = useState<TurnoRegistro | null>(null);
  const [turnoAberto, setTurnoAberto] = useState(false);
  const [gerenciarAberto, setGerenciarAberto] = useState(false);
  const [conflitosAbertos, setConflitosAbertos] = useState(false);
  /** Dia do mês aberto no modal "Escalas do dia" (`yyyy-MM-dd`). */
  const [diaAberto, setDiaAberto] = useState<string | null>(null);
  const [proximasAbertas, setProximasAbertas] = useState(false);

  const modo = modoDaVisualizacao(visualizacao);
  const periodo = useMemo(() => intervaloDoPeriodo(modo, ancora), [modo, ancora]);
  const anterior = useMemo(() => periodoAnterior(modo, ancora), [modo, ancora]);

  const { turnos, escalasPeriodo, escalasPeriodoAnterior, escalasProximas, equipe, carregando, invalidarEscalas } =
    useTurnosEscalas({
      inicio: periodo.inicio,
      fim: periodo.fim,
      inicioAnterior: anterior.inicio,
      fimAnterior: anterior.fim,
    });

  const escalasFiltradas = useMemo(() => filtrarEscalas(escalasPeriodo, filtros), [escalasPeriodo, filtros]);
  const escalasAnterioresFiltradas = useMemo(
    () => filtrarEscalas(escalasPeriodoAnterior, filtros),
    [escalasPeriodoAnterior, filtros]
  );

  const escalasPorDia = useMemo(() => {
    const mapa = new Map<string, EscalaRegistro[]>();
    for (const escala of escalasFiltradas) {
      const chave = escala.data.slice(0, 10);
      const lista = mapa.get(chave);
      if (lista) lista.push(escala);
      else mapa.set(chave, [escala]);
    }
    return mapa;
  }, [escalasFiltradas]);

  const linhas = useMemo(
    () => montarLinhasCalendario({ equipe, escalas: escalasFiltradas, filtros }),
    [equipe, escalasFiltradas, filtros]
  );

  const conflitos = useMemo(() => detectarConflitos(escalasPeriodo, turnos, equipe), [escalasPeriodo, turnos, equipe]);

  const metricas = useMemo(
    () =>
      calcularMetricasPainel({
        turnos,
        escalasPeriodo: escalasFiltradas,
        escalasPeriodoAnterior: escalasAnterioresFiltradas,
        // `anterior.fim` é a base real da variação de turnos cadastrados.
        fimPeriodoAnterior: anterior.fim,
        equipe,
        dias: periodo.dias,
        conflitos,
      }),
    [turnos, escalasFiltradas, escalasAnterioresFiltradas, anterior.fim, equipe, periodo.dias, conflitos]
  );

  const proximas = useMemo(() => proximasDatasComEscalas(escalasProximas, chaveData(new Date())), [escalasProximas]);

  /**
   * Janela do card/modal "Próximas escalas" (hoje → +N dias) e a lista COMPLETA
   * agrupada por data. As duas saem da MESMA constante e da MESMA consulta que o
   * hook usa (`escalasProximas`), então o resumo e o modal nunca divergem.
   */
  const janelaProximas = useMemo(() => {
    const agora = new Date();
    const fim = new Date(agora.getTime() + DIAS_PROXIMAS_ESCALAS * 24 * 60 * 60 * 1000);
    return { inicio: chaveData(agora), fim: chaveData(fim) };
  }, []);

  const proximasAgrupadas = useMemo(
    () => agruparEscalasPorDia(escalasProximas, janelaProximas.inicio),
    [escalasProximas, janelaProximas.inicio]
  );

  const excluirEscala = useMutation({
    mutationFn: async (id: string) => {
      if (!empresaAtual?.id) throw new Error('Empresa não selecionada.');
      return turnoService.excluirEscala(id, empresaAtual.id);
    },
    onSuccess: () => {
      toast.success('Escala excluída.');
      invalidarEscalas();
      setDetalhesAbertos(false);
      setAlvoDetalhes(null);
    },
    onError: (erro: Error) => toast.error(safeErrorMessage(erro, 'Não foi possível excluir a escala.')),
  });

  const moverPeriodo = (passo: number) => setAncora((atual) => deslocarAncora(modo, atual, passo));
  const irParaHoje = () => setAncora(new Date());

  /** Clique numa data das "Próximas escalas": abre a SEMANA daquele dia. */
  const irParaData = (chave: string) => {
    setAncora(dataDaChave(chave));
    setVisualizacao('semana');
  };

  const abrirDetalhes = (data: string, escalas: EscalaRegistro[]) => {
    setAlvoDetalhes({ data, escalas });
    setDetalhesAbertos(true);
  };

  /**
   * Clique num dia da grade mensal: abre o modal do dia. Nada é inserido abaixo
   * do calendário, então a altura da página não muda.
   */
  const abrirDia = (dia: string) => setDiaAberto(dia);

  /** Linha do modal do dia → detalhes da escala (fecha o dia, abre os detalhes). */
  const abrirDetalhesDoDia = (escala: EscalaRegistro) => {
    const data = diaAberto ?? escala.data.slice(0, 10);
    setDiaAberto(null);
    abrirDetalhes(data, [escala]);
  };

  const criarEscalaEm = (colaborador: MembroEquipe, data: string) => {
    setAlvoEscala({ prefill: { colaboradorId: colaborador.id, data }, edicao: null });
  };

  const trocarTurno = (escala: EscalaRegistro) => {
    setDetalhesAbertos(false);
    setAlvoEscala({ prefill: null, edicao: escala });
  };

  const abrirNovoTurno = () => {
    setTurnoEmEdicao(null);
    setTurnoAberto(true);
  };

  const abrirTurno = (turno: TurnoRegistro) => {
    setTurnoEmEdicao(turno);
    setTurnoAberto(true);
  };

  const departamentos = useMemo(() => departamentosDaEquipe(equipe), [equipe]);
  const status = useMemo(() => statusDasEscalas(escalasPeriodo), [escalasPeriodo]);
  const tituloResumo = visualizacao === 'semana' ? 'Resumo da semana' : 'Resumo do período';

  return (
    <div className="space-y-4">
      <CabecalhoTurnos
        rotuloPeriodo={rotuloDoPeriodo(periodo)}
        visualizacao={visualizacao}
        onVisualizacao={setVisualizacao}
        onAnterior={() => moverPeriodo(-1)}
        onProximo={() => moverPeriodo(1)}
        onHoje={irParaHoje}
        onNovaEscala={() => setAlvoEscala({ prefill: null, edicao: null })}
        onNovoTurno={abrirNovoTurno}
        podeGerenciar={podeGerenciar}
      />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(14.5rem,17rem)]">
        {/* Coluna esquerda em flex de altura cheia: os KPI e os filtros medem o
            que medem e a faixa de visualização fica com `flex-1 min-h-0` — é o
            que faz a borda inferior do card da grade encostar na borda inferior
            do último card da coluna lateral, nas TRÊS visualizações. O
            `min-h-0` é obrigatório: sem ele o item flex não encolhe abaixo do
            conteúdo e a altura voltaria a ser ditada pelos registros. */}
        <div className="flex min-w-0 flex-col gap-3">
          <TurnosKpiCards
            metricas={metricas}
            carregando={carregando}
            onResolverConflitos={() => setConflitosAbertos(true)}
          />

          <BarraFiltrosEscalas
            filtros={filtros}
            onFiltros={setFiltros}
            departamentos={departamentos}
            turnos={turnos}
            status={status}
            totalLinhas={linhas.length}
          />

          <div className="flex min-h-0 flex-1 flex-col">
            {/* A `key` reinicia a cascata SÓ quando a visão ou o período mudam:
                filtrar, passar o mouse ou abrir uma janela não reanima a grade. */}
            {visualizacao === 'semana' && (
              <CalendarioSemanal
                key={`semana-${periodo.inicio}-${periodo.fim}`}
                periodo={periodo}
                linhas={linhas}
                turnos={turnos}
                onAbrirEscala={abrirDetalhes}
                onCriarEscala={criarEscalaEm}
                podeGerenciar={podeGerenciar}
              />
            )}

            {visualizacao === 'mes' && (
              <CalendarioMensal
                key={`mes-${periodo.inicio}-${periodo.fim}`}
                periodo={periodo}
                escalasPorDia={escalasPorDia}
                turnos={turnos}
                selecionado={diaAberto}
                onSelecionarDia={abrirDia}
              />
            )}

            {visualizacao === 'lista' && (
              <ListaEscalas escalas={escalasFiltradas} turnos={turnos} onAbrirEscala={abrirDetalhes} />
            )}
          </div>
        </div>

        <ColunaLateralTurnos
          turnos={turnos}
          distribuicao={metricas.distribuicao}
          tituloResumo={tituloResumo}
          proximas={proximas}
          carregando={carregando}
          slotInicial={4}
          onVerTodosTurnos={() => setGerenciarAberto(true)}
          onAbrirTurno={abrirTurno}
          onSelecionarDia={irParaData}
          onVerTodasEscalas={() => setProximasAbertas(true)}
        />
      </div>

      <DialogoDetalhesEscala
        aberto={detalhesAbertos}
        onOpenChange={setDetalhesAbertos}
        data={alvoDetalhes?.data ?? null}
        escalas={alvoDetalhes?.escalas ?? []}
        turnos={turnos}
        podeGerenciar={podeGerenciar}
        onTrocarTurno={trocarTurno}
        onExcluir={(id) => excluirEscala.mutate(id)}
        excluindo={excluirEscala.isPending}
      />

      <DialogoDiaEscalas
        aberto={diaAberto !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setDiaAberto(null);
        }}
        data={diaAberto}
        escalas={diaAberto ? (escalasPorDia.get(diaAberto) ?? []) : []}
        turnos={turnos}
        onAbrirEscala={abrirDetalhesDoDia}
      />

      <DialogoProximasEscalas
        aberto={proximasAbertas}
        onOpenChange={setProximasAbertas}
        grupos={proximasAgrupadas}
        turnos={turnos}
        periodo={janelaProximas}
      />

      <DialogoNovaEscala
        aberto={!!alvoEscala}
        onOpenChange={(aberto) => {
          if (!aberto) setAlvoEscala(null);
        }}
        empresaId={empresaAtual?.id}
        equipe={equipe}
        turnos={turnos}
        escalasExistentes={escalasPeriodo}
        prefill={alvoEscala?.prefill ?? null}
        edicao={alvoEscala?.edicao ?? null}
        onSalvo={invalidarEscalas}
      />

      <DialogoTurno
        aberto={turnoAberto}
        onOpenChange={setTurnoAberto}
        empresaId={empresaAtual?.id}
        turno={turnoEmEdicao}
        onSalvo={invalidarEscalas}
      />

      <DialogoGerenciarTurnos
        aberto={gerenciarAberto}
        onOpenChange={setGerenciarAberto}
        turnos={turnos}
        escalas={escalasPeriodo}
        podeGerenciar={podeGerenciar}
        onNovo={abrirNovoTurno}
        onEditar={abrirTurno}
      />

      <DialogoConflitos
        aberto={conflitosAbertos}
        onOpenChange={setConflitosAbertos}
        conflitos={conflitos}
        turnos={turnos}
        podeGerenciar={podeGerenciar}
        onExcluir={(id) => excluirEscala.mutate(id)}
        excluindo={excluirEscala.isPending}
      />
    </div>
  );
}
