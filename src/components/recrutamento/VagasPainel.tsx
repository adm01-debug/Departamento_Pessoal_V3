import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { entradaCard } from '@/components/ui/entrada-cards';
import { ColoredFilterChip } from '@/components/avaliacao/ColoredFilterChip';
import { PALETAS_CHIP, TEMA_TODOS } from '@/components/avaliacao/chipFiltroComum';
import type { CandidaturaComRelacoes, VagaRow } from '@/types/recrutamento';
import { VagaCard } from './VagaCard';
import {
  FILTROS_VAGA_PADRAO,
  contarVagas,
  filtrarVagas,
  montarVagasResumo,
  opcoesDepartamento,
  opcoesModalidade,
  type FiltroStatusVaga,
  type OrdenacaoVaga,
} from './vagasComum';

/**
 * ============================================================================
 * VAGAS — painel visual (filtros rápidos em pill + filtros + grid).
 *
 * Fonte única: `vagas` e `candidaturasTodas` já carregadas pela página. Todos
 * os contadores, funis, datas e filtros são derivados em `vagasComum`; nenhuma
 * consulta nova é feita e nenhum registro é inventado.
 *
 * O card “Criar Nova Vaga” não existe mais no grid: a criação continua no botão
 * “Nova Vaga” do cabeçalho do módulo (mesmo formulário/permissão).
 * ============================================================================
 */
export interface VagasPainelProps {
  vagas: readonly VagaRow[];
  candidaturas: readonly CandidaturaComRelacoes[];
  onGerenciar: (vaga: VagaRow) => void;
  onVerAnalises: () => void;
  onExcluir: (vaga: VagaRow) => void;
}

/*
 * FILTROS RÁPIDOS DE STATUS — os MESMOS chips coloridos do Hub de Premiações
 * (`avaliacao/ColoredFilterChip` + `PALETAS_CHIP`), sem nenhum estilo paralelo.
 * O chip já traz: pill com altura/padding do design system, bolinha, rótulo e
 * contador em cápsula, cor semântica preservada no repouso e fundo/borda mais
 * fortes quando selecionado (incluindo hover e transição de 200ms, desligada
 * sob `prefers-reduced-motion`). Só o nome, a contagem e a cor mudam por vaga.
 */

function CampoFiltro({
  rotulo,
  valor,
  aoMudar,
  opcoes,
  icone,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  opcoes: { value: string; label: string }[];
  icone?: ReactNode;
}) {
  /*
   * CONTROLE COMPACTO — rótulo e campo vivem DENTRO da mesma caixa com borda.
   * É esse empilhamento interno que faz os quatro selects terem a mesma altura
   * visual e dispensa o rótulo solto acima (que antes só existia nos dropdowns
   * e desalinhava tudo em relação às pills).
   */
  return (
    <div className="min-w-0 rounded-lg border border-border/80 bg-background/45 px-2 pb-1 pt-1.5">
      <span className="flex items-center gap-1 text-[8px] font-semibold uppercase leading-none tracking-[0.08em] text-muted-foreground">
        {icone}
        {rotulo}
      </span>
      <Select value={valor} onValueChange={aoMudar}>
        <SelectTrigger
          aria-label={rotulo}
          className="h-6 w-full rounded-none border-0 bg-transparent p-0 text-[11px] shadow-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 [&>span]:line-clamp-1 [&>svg]:h-3 [&>svg]:w-3"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {opcoes.map((opcao) => (
            <SelectItem key={opcao.value} value={opcao.value} className="text-xs">
              {opcao.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const STATUS_OPCOES = [
  { value: 'todas', label: 'Todos' },
  { value: 'aberta', label: 'Abertas' },
  { value: 'fechada', label: 'Fechadas' },
];

const ORDENACAO_OPCOES = [
  { value: 'recentes', label: 'Mais recentes' },
  { value: 'antigas', label: 'Mais antigas' },
  { value: 'candidatos', label: 'Mais candidatos' },
  { value: 'titulo', label: 'Título (A–Z)' },
];

export function VagasPainel({ vagas, candidaturas, onGerenciar, onVerAnalises, onExcluir }: VagasPainelProps) {
  const [status, setStatus] = useState<FiltroStatusVaga>('todas');
  const [departamento, setDepartamento] = useState('todos');
  const [modalidade, setModalidade] = useState('todas');
  const [ordenacao, setOrdenacao] = useState<OrdenacaoVaga>('recentes');

  const resumos = useMemo(() => montarVagasResumo(vagas, candidaturas), [vagas, candidaturas]);
  const contagem = useMemo(() => contarVagas(vagas), [vagas]);
  const departamentos = useMemo(() => opcoesDepartamento(vagas), [vagas]);
  const modalidades = useMemo(() => opcoesModalidade(vagas), [vagas]);

  const filtradas = useMemo(
    () => filtrarVagas(resumos, { status, departamento, modalidade, ordenacao }),
    [resumos, status, departamento, modalidade, ordenacao]
  );
  const temFiltros =
    status !== FILTROS_VAGA_PADRAO.status ||
    departamento !== FILTROS_VAGA_PADRAO.departamento ||
    modalidade !== FILTROS_VAGA_PADRAO.modalidade ||
    ordenacao !== FILTROS_VAGA_PADRAO.ordenacao;

  const limparFiltros = () => {
    setStatus(FILTROS_VAGA_PADRAO.status);
    setDepartamento(FILTROS_VAGA_PADRAO.departamento);
    setModalidade(FILTROS_VAGA_PADRAO.modalidade);
    setOrdenacao(FILTROS_VAGA_PADRAO.ordenacao);
  };

  /*
   * Mesmos três recortes de antes — apenas com a pele de chip do Hub. O estado é
   * o MESMO `status` lido/escrito pelo dropdown Status: não há filtragem paralela.
   * Lime = Todas, verde = Abertas, vermelho = Fechadas (cor fixa em cada chip).
   */
  const filtrosRapidos = [
    { label: 'Todas', valor: 'todas' as const, tema: TEMA_TODOS, total: contagem.todas },
    { label: 'Abertas', valor: 'aberta' as const, tema: PALETAS_CHIP.emerald, total: contagem.abertas },
    { label: 'Fechadas', valor: 'fechada' as const, tema: PALETAS_CHIP.red, total: contagem.fechadas },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* PAINEL ÚNICO DE FILTROS — um só container navy para pills e selects.
          O espaçamento externo vem exclusivamente do `gap` do pai (16px) e da
          margem única do `TabsContent` (16px): não há margens empilhadas. */}
      <div className="rounded-xl border border-border/55 bg-card p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-center xl:justify-between">
          {/* Pills: à esquerda, largura própria, quebra de linha quando faltar espaço. */}
          <div
            className="flex min-w-0 flex-wrap items-center gap-2.5 lg:gap-3"
            role="group"
            aria-label="Filtrar vagas por status"
          >
            {filtrosRapidos.map((chip, indiceChip) => (
              // O chip é um `<button>` do design system; o wrapper é só o ITEM FLEX
              // (mesma largura de conteúdo) e recebe a entrada em cascata 1·2·3.
              <motion.div key={chip.valor} {...entradaCard(indiceChip)}>
                <ColoredFilterChip
                  label={chip.label}
                  count={chip.total}
                  tema={chip.tema}
                  selected={status === chip.valor}
                  onClick={() => setStatus(chip.valor)}
                  ariaLabel={`${chip.label}: ${chip.total} vaga${chip.total === 1 ? '' : 's'}`}
                />
              </motion.div>
            ))}
          </div>

          {/* Selects: rótulo e campo vivem na mesma caixa. Só a partir de `xl`
              (largura real para as duas famílias) eles dividem a linha com as
              pills; abaixo disso viram grade: 4 colunas em `lg`, 2 nas demais. */}
          <motion.div
            {...entradaCard(3)}
            className="grid w-full grid-cols-2 gap-2.5 lg:grid-cols-4 xl:flex xl:w-auto xl:flex-1 xl:flex-wrap xl:items-center xl:justify-end"
          >
            <div className="min-w-0 xl:w-[132px]">
              <CampoFiltro
                rotulo="Departamento"
                valor={departamento}
                aoMudar={setDepartamento}
                opcoes={[{ value: 'todos', label: 'Todos' }, ...departamentos.map((d) => ({ value: d, label: d }))]}
              />
            </div>
            <div className="min-w-0 xl:w-[126px]">
              <CampoFiltro
                rotulo="Modalidade"
                valor={modalidade}
                aoMudar={setModalidade}
                opcoes={[{ value: 'todas', label: 'Todas' }, ...modalidades.map((m) => ({ value: m, label: m }))]}
              />
            </div>
            <div className="min-w-0 xl:w-[112px]">
              <CampoFiltro
                rotulo="Status"
                valor={status}
                aoMudar={(valor) => setStatus(valor as FiltroStatusVaga)}
                opcoes={STATUS_OPCOES}
              />
            </div>
            <div className="min-w-0 xl:w-[142px]">
              <CampoFiltro
                rotulo="Ordenar por"
                valor={ordenacao}
                aoMudar={(valor) => setOrdenacao(valor as OrdenacaoVaga)}
                opcoes={ORDENACAO_OPCOES}
                icone={<ArrowUpDown className="h-2.5 w-2.5" aria-hidden />}
              />
            </div>
            {temFiltros ? (
              <Button
                type="button"
                variant="ghost"
                onClick={limparFiltros}
                className="col-span-2 h-[46px] justify-self-end gap-1 rounded-lg px-2 text-[10px] text-muted-foreground hover:text-foreground lg:col-span-4 xl:col-auto"
              >
                <X className="h-3 w-3" aria-hidden />
                Limpar
              </Button>
            ) : null}
          </motion.div>
        </div>
      </div>

      {filtradas.length === 0 ? (
        <div
          data-vagas-empty
          className="rounded-xl border border-dashed border-border/60 bg-card/30 px-6 py-10 text-center"
        >
          <p className="text-sm font-medium text-foreground">
            {vagas.length === 0 ? 'Nenhuma vaga cadastrada.' : 'Nenhuma vaga encontrada.'}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {vagas.length === 0
              ? 'Use o botão Nova Vaga no cabeçalho para iniciar um processo seletivo.'
              : 'Ajuste os filtros para ver outras vagas.'}
          </p>
          {temFiltros ? (
            <Button type="button" variant="outline" size="sm" onClick={limparFiltros} className="mt-3 h-8 rounded-lg">
              Limpar filtros
            </Button>
          ) : null}
        </div>
      ) : (
        <div data-vagas-grid className="grid auto-rows-fr grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {filtradas.map((resumo, indice) => (
            <VagaCard
              key={resumo.vaga.id}
              resumo={resumo}
              indice={4 + indice}
              onGerenciar={onGerenciar}
              onVerAnalises={onVerAnalises}
              onExcluir={onExcluir}
            />
          ))}
        </div>
      )}
    </div>
  );
}
