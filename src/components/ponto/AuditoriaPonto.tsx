/**
 * ============================================================================
 * CENTRAL DE AUDITORIA — a aba "Auditoria" de Controle de Ponto.
 *
 * Estrutura (de cima para baixo), na ordem da referência aprovada:
 *   1. cabeçalho compacto — ícone, título, subtítulo, período e "Exportar Trilha";
 *   2. grade de duas colunas (~69% / ~31% a partir de `xl`):
 *        · ESQUERDA — os quatro KPIs (`CentralAuditoriaKpis`), a barra de filtros
 *          (`CentralAuditoriaFiltros`) e o card da linha do tempo, que estica até
 *          a base da coluna e prende a paginação no pé;
 *        · DIREITA — o painel de detalhes do evento, do topo dos KPIs até a base
 *          da timeline (`items-stretch` + `h-full`).
 *      Abaixo de `xl` o grid vira uma coluna e o painel desce para baixo da
 *      timeline; a página rola até ele ao clicar em um evento.
 *
 * ── UMA ÚNICA FONTE DE VERDADE ─────────────────────────────────────────────
 * A consulta devolve `audit_log` UMA vez (recortada no SERVIDOR pelo período e
 * pelo período anterior, para a variação dos KPIs ter base). Tudo o que a tela
 * afirma sai dela, pelo módulo puro `centralAuditoria`:
 *
 *     eventos  → `normalizarEventos`          → base de tudo
 *     período  → `filtrarEventos(intervalo)`  → KPIs, chips do filtro e timeline
 *     busca/operação/entidade/responsável     → timeline (+ contadores/página)
 *     períodos → `resumoAuditoria` (atual e anterior) → KPIs + variação
 *
 * Não existe contador paralelo: o canal de tempo real invalida a query e a
 * lista volta do banco; KPI, filtros, timeline e painel acompanham juntos.
 *
 * ── O QUE FOI PRESERVADO DO COMPONENTE ANTERIOR ────────────────────────────
 *  · a consulta em `audit_log` com o mesmo recorte de tabelas do ponto;
 *  · a assinatura em tempo real (`postgres_changes` em INSERT) e a invalidação;
 *  · a exportação em CSV (`exportPontoCSV`) da trilha FILTRADA;
 *  · a busca textual por responsável/e-mail/identificador/entidade/descrição.
 * O que saiu: os cards verticais gigantes, o json solto na timeline e os selos
 * decorativos "99.8% Confiança Biometria"/"PROVA SHA256", que afirmavam uma
 * verificação que o código não fazia. O parecer de integridade agora vem de
 * `evidenciaDoEvento` — ver o comentário de `centralAuditoria.ts`.
 *
 * ── POR QUE O ARQUIVO SE CHAMA `AuditoriaPonto` ────────────────────────────
 * Este componente NÃO pode morar em `CentralAuditoria.tsx`: nesta mesma pasta
 * existe o módulo puro `centralAuditoria.ts`, e no Windows/macOS (sistema de
 * arquivos case-insensitive) o resolver tenta `.ts` ANTES de `.tsx` — um
 * `import ... from './CentralAuditoria'` carregava o módulo puro, que não
 * exporta componente, e a aba "Auditoria" quebrava com "Element type is
 * invalid" (o TypeScript também acusava TS1261: "file name differs only in
 * casing"). Mesmo motivo pelo qual o painel da Central de Ajustes se chama
 * `CentralAjustesPainel` e não `centralAjustes`. Se precisar renomear, escolha
 * um nome que não seja igual (ignorando a caixa) ao de outro arquivo da pasta.
 * ============================================================================
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { EntradaPresenca } from '@/components/ui/entrada-cards';
import { useEmpresas } from '@/hooks/useEmpresas';
import { supabase } from '@/integrations/supabase/client';
import { exportPontoCSV } from '@/services/exportService';
import { auditoriaService } from '@/services/auditoriaService';
import { CentralAuditoriaCabecalho } from './CentralAuditoriaCabecalho';
import { CentralAuditoriaKpis } from './CentralAuditoriaKpis';
import { CentralAuditoriaFiltros } from './CentralAuditoriaFiltros';
import { CentralAuditoriaTimeline } from './CentralAuditoriaTimeline';
import { CentralAuditoriaDetalhes } from './CentralAuditoriaDetalhes';
import {
  TAMANHO_PAGINA_AUDITORIA,
  dataHoraDoEvento,
  entidadesDosEventos,
  evidenciaDoEvento,
  filtrarEventos,
  intervaloAnteriorAuditoria,
  intervaloDoPeriodoAuditoria,
  normalizarEventos,
  operacoesDosEventos,
  paginarAuditoria,
  responsavelDoEvento,
  responsaveisDosEventos,
  resumoAuditoria,
  rotuloDoPeriodoAuditoria,
  variacoesAuditoria,
  type EventoAuditoria,
  type FiltroOperacao,
  type LinhaAuditoriaCrua,
  type PeriodoAuditoria,
  type RecortePersonalizado,
} from './centralAuditoria';
import { isPontoAuditoriaMockEnabled, trilhaAuditoriaDemonstrativa } from '@/mocks/pontoAuditoriaMock';

/** Teto de linhas por consulta — o mesmo espírito do limite anterior (100). */
const LIMITE_EVENTOS = 500;

/** Tabelas auditadas pela aba — o recorte por tabela vai para a RPC da trilha. */
const TABELAS_PONTO = ['batidas_ponto', 'registros_ponto', 'solicitacoes_ajuste_ponto'];

/** Resultado da consulta: linhas + mensagem de erro (a tela avisa, não some). */
interface ResultadoTrilha {
  eventos: EventoAuditoria[];
  erro: string | null;
}

export function AuditoriaPonto() {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;
  const queryClient = useQueryClient();
  const painelRef = useRef<HTMLDivElement>(null);

  const [busca, setBusca] = useState('');
  const [operacao, setOperacao] = useState<FiltroOperacao>('todas');
  const [entidade, setEntidade] = useState('todas');
  const [responsavel, setResponsavel] = useState('todos');
  const [periodo, setPeriodo] = useState<PeriodoAuditoria>('30d');
  const [personalizado, setPersonalizado] = useState<RecortePersonalizado>({ de: '', ate: '' });
  const [pagina, setPagina] = useState(1);
  const [idAtiva, setIdAtiva] = useState<string | null>(null);
  const [painelVisivel, setPainelVisivel] = useState(true);

  /** MOCK VISUAL — só em dev com `VITE_PONTO_MOCK=true` (ver o mock). */
  const mockAtivo = isPontoAuditoriaMockEnabled();

  const janela = useMemo(() => intervaloDoPeriodoAuditoria(periodo, personalizado), [periodo, personalizado]);
  const janelaAnterior = useMemo(() => intervaloAnteriorAuditoria(janela), [janela]);

  const { data, isLoading } = useQuery({
    // A chave inclui o recorte: mudar de 7d para 90d refaz a consulta e o
    // recorte de período é reaplicado sobre as linhas do servidor.
    queryKey: ['ponto-audit-logs', empresaId, janela.inicio, janela.fim],
    queryFn: async (): Promise<ResultadoTrilha> => {
      if (mockAtivo) {
        return { eventos: normalizarEventos(trilhaAuditoriaDemonstrativa()), erro: null };
      }
      try {
        // Caminho autorizado da trilha: RPC `get_audit_trail` (o gate
        // `audit-bridge-frontend-contract` recusa leitura direta de
        // `audit_log` pelo frontend). O recorte de período é aplicado em cima
        // das linhas devolvidas, que já vêm das tabelas do ponto e as mais
        // recentes primeiro.
        const linhas = await auditoriaService.listarTrilha({
          empresa_id: empresaId ?? null,
          tabelas: TABELAS_PONTO,
          limite: LIMITE_EVENTOS,
        });
        return { eventos: normalizarEventos(linhas as unknown as LinhaAuditoriaCrua[]), erro: null };
      } catch (e) {
        return {
          eventos: [],
          erro:
            e instanceof Error
              ? `A consulta ao log de auditoria falhou: ${e.message}`
              : 'A consulta ao log de auditoria falhou.',
        };
      }
    },
    enabled: !!empresaId || mockAtivo,
  });

  // Tempo real: uma nova linha na trilha invalida a consulta (mesmo canal de
  // antes). Sem isso a faixa de KPIs e a timeline ficariam paradas no passado.
  useEffect(() => {
    if (!empresaId) return;
    const channel = supabase
      .channel('audit-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_log' }, () => {
        queryClient.invalidateQueries({ queryKey: ['ponto-audit-logs'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, empresaId]);

  const eventos = data?.eventos ?? [];
  const erro = data?.erro ?? null;

  /** Recorte pelo período — base dos KPIs, das opções de filtro e da timeline. */
  const doPeriodo = useMemo(
    () => filtrarEventos(eventos, { intervalo: janela }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eventos, janela.inicio, janela.fim]
  );
  const doPeriodoAnterior = useMemo(
    () => filtrarEventos(eventos, { intervalo: janelaAnterior }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eventos, janelaAnterior.inicio, janelaAnterior.fim]
  );

  const resumo = useMemo(() => resumoAuditoria(doPeriodo), [doPeriodo]);
  const resumoAnterior = useMemo(() => resumoAuditoria(doPeriodoAnterior), [doPeriodoAnterior]);
  const variacoes = useMemo(() => variacoesAuditoria(resumo, resumoAnterior), [resumo, resumoAnterior]);

  /** Timeline: período + busca + operação + entidade + responsável. */
  const filtrados = useMemo(
    () => filtrarEventos(doPeriodo, { busca, operacao, entidade, responsavel }),
    [doPeriodo, busca, operacao, entidade, responsavel]
  );

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / TAMANHO_PAGINA_AUDITORIA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const linhasDaPagina = useMemo(
    () => paginarAuditoria(filtrados, paginaAtual, TAMANHO_PAGINA_AUDITORIA),
    [filtrados, paginaAtual]
  );

  /**
   * Evento do painel: o último clicado (se ainda estiver no recorte) ou o
   * primeiro da página — assim o painel nunca abre vazio à direita.
   */
  const ativa = useMemo(() => {
    if (!painelVisivel) return null;
    const escolhida = idAtiva ? filtrados.find((evento) => evento.id === idAtiva) : undefined;
    return escolhida ?? linhasDaPagina[0] ?? filtrados[0] ?? null;
  }, [painelVisivel, idAtiva, filtrados, linhasDaPagina]);

  const entidades = useMemo(() => entidadesDosEventos(doPeriodo), [doPeriodo]);
  const responsaveis = useMemo(() => responsaveisDosEventos(doPeriodo), [doPeriodo]);
  const operacoes = useMemo(() => operacoesDosEventos(doPeriodo), [doPeriodo]);

  const filtrosAtivos =
    (busca.trim() ? 1 : 0) +
    (operacao !== 'todas' ? 1 : 0) +
    (entidade !== 'todas' ? 1 : 0) +
    (responsavel !== 'todos' ? 1 : 0);

  /** Troca de filtro sempre volta para a primeira página. */
  const trocarBusca = (valor: string) => {
    setBusca(valor);
    setPagina(1);
  };
  const trocarOperacao = (valor: FiltroOperacao) => {
    setOperacao(valor);
    setPagina(1);
  };
  const trocarEntidade = (valor: string) => {
    setEntidade(valor);
    setPagina(1);
  };
  const trocarResponsavel = (valor: string) => {
    setResponsavel(valor);
    setPagina(1);
  };
  const trocarPeriodo = (valor: PeriodoAuditoria) => {
    setPeriodo(valor);
    setPagina(1);
  };
  const trocarPersonalizado = (recorte: RecortePersonalizado) => {
    setPersonalizado(recorte);
    setPagina(1);
  };
  const limparFiltros = () => {
    setBusca('');
    setOperacao('todas');
    setEntidade('todas');
    setResponsavel('todos');
    setPagina(1);
  };

  /**
   * Abre o evento no painel. Abaixo de `xl` o painel fica ABAIXO da timeline
   * (o grid de duas colunas só existe a partir daí), então a página rola até
   * ele — sem isso o clique pareceria não fazer nada.
   */
  const selecionar = (id: string) => {
    setIdAtiva(id);
    setPainelVisivel(true);
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    if (!window.matchMedia('(max-width: 1279px)').matches) return;
    window.requestAnimationFrame(() => {
      painelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const exportar = () => {
    if (filtrados.length === 0) {
      toast.info('Não há eventos para exportar neste recorte.');
      return;
    }
    try {
      const linhas = filtrados.map((evento) => {
        const { data: dia, hora } = dataHoraDoEvento(evento.criadoEm);
        return {
          data: dia,
          hora,
          responsavel: responsavelDoEvento(evento),
          operacao: evento.acao,
          entidade: evento.tabela,
          registro_id: evento.registroId ?? '',
          integridade: evidenciaDoEvento(evento).rotulo,
          campos_alterados: (evento.camposAlterados ?? []).join(' | '),
        };
      });
      exportPontoCSV(linhas, 'trilha-auditoria-ponto.csv');
      toast.success(`${linhas.length} evento(s) exportado(s).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao exportar a trilha.');
    }
  };

  return (
    <EntradaPresenca>
      <div className="space-y-3">
        <CentralAuditoriaCabecalho
          periodo={periodo}
          personalizado={personalizado}
          onPeriodo={trocarPeriodo}
          onPersonalizado={trocarPersonalizado}
          onExportar={exportar}
        />

        {/* ── DUAS COLUNAS (~69% / ~31% a partir de `xl`) ───────────────────
            Esquerda: KPIs → filtros → timeline. Direita: painel de detalhes.
            `items-stretch` é o que garante o alinhamento pedido — a linha do
            grid tem uma altura só, então as duas colunas começam no topo dos
            KPIs e terminam juntas. Dentro da coluna esquerda a timeline recebe
            `flex-1` (`min-h-0` para poder encolher): assim o card estica até a
            base e a paginação, que é `mt-auto`, fica sempre no pé do card.
            Abaixo de `xl` o grid vira uma coluna e o painel desce para baixo da
            timeline, na ordem de leitura.
            As faixas são proporcionais (`69fr`/`31fr`) porque a largura útil
            depende da sidebar: com faixas em `fr` a proporção da referência se
            mantém em qualquer monitor. O piso de `224px` vale 280 px reais (a
            utility em `px` arbitrário é convertida com base 16 e o `html` está
            a 20 px — ver `scripts/postcss-escala-rem.mjs`): abaixo disso o
            painel ficaria estreito demais para os metadados e ele para de
            encolher. */}
        <div className="grid items-stretch gap-3 xl:grid-cols-[minmax(0,69fr)_minmax(224px,31fr)]">
          <div className="flex min-h-0 min-w-0 flex-col gap-3">
            <CentralAuditoriaKpis resumo={resumo} variacoes={variacoes} />

            <CentralAuditoriaFiltros
              busca={busca}
              onBusca={trocarBusca}
              operacao={operacao}
              onOperacao={trocarOperacao}
              entidade={entidade}
              onEntidade={trocarEntidade}
              responsavel={responsavel}
              onResponsavel={trocarResponsavel}
              entidades={entidades}
              responsaveis={responsaveis}
              operacoes={operacoes}
              filtrosAtivos={filtrosAtivos}
              onLimpar={limparFiltros}
            />

            <div className="flex min-h-0 min-w-0 flex-col xl:flex-1">
              <CentralAuditoriaTimeline
                eventos={linhasDaPagina}
                total={filtrados.length}
                pagina={paginaAtual}
                tamanhoPagina={TAMANHO_PAGINA_AUDITORIA}
                idAtivo={ativa?.id ?? null}
                carregando={isLoading}
                erro={erro}
                temFiltros={filtrosAtivos > 0}
                onSelecionar={selecionar}
                onPagina={setPagina}
                onLimparFiltros={limparFiltros}
              />
            </div>
          </div>

          <div ref={painelRef} className="flex min-w-0 scroll-mt-4">
            <CentralAuditoriaDetalhes
              evento={ativa}
              onFechar={() => {
                setPainelVisivel(false);
                setIdAtiva(null);
              }}
            />
          </div>
        </div>
      </div>
    </EntradaPresenca>
  );
}
