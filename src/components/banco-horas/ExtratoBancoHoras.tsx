/**
 * ============================================================================
 * EXTRATO DO BANCO DE HORAS — a central de CONSULTA da área, em faixa única.
 *
 *   ┌──────────────────────────────────────────────────────────────────────┐
 *   │ [Todos 12][Créditos 5][Débitos 7][Negativos 3]   [busca] [ordem]      │
 *   └──────────────────────────────────────────────────────────────────────┘
 *   ┌──────────────────────────────────────────────────────────────────────┐
 *   │ (↺) Extrato do banco de horas                          12 registros    │
 *   ├──────────────────────────────────────────────────────────────────────┤
 *   │ COLABORADOR · DATA · TIPO · HORAS · SALDO ANT. · SALDO ATUAL · MOTIVO │
 *   ├──────────────────────────────────────────────────────────────────────┤
 *   │ (linhas densas: avatar 22 px, textos de 11 px, selo de tipo, menu ⋯)  │
 *   │                                    ↑ a área da tabela é a que CRESCE  │
 *   ├──────────────────────────────────────────────────────────────────────┤
 *   │ Mostrando 1–8 de 12                        Linhas por página [8] ‹ › │
 *   └──────────────────────────────────────────────────────────────────────┘
 *
 * ── ALTURA DO CARD = ALTURA DA COLUNA, EM TRÊS REGIÕES ─────────────────────
 * A grade da página estica as duas colunas (`items-stretch`), então o card do
 * extrato recebe a altura da coluna da direita (quatro cards) e devolve a sobra
 * para dentro de si mesmo. A estrutura interna é uma coluna flex de TRÊS
 * REGIÕES, na ordem em que aparecem:
 *
 *   faixa 1 · cabeçalho ....... `shrink-0` — altura do conteúdo (título,
 *                               subtítulo e a contagem de registros);
 *   faixa 2 · área da tabela .. `flex-1 min-h-0` — ocupa o espaço entre o
 *                               cabeçalho e o rodapé (é ela que cresce);
 *   faixa 3 · paginação ....... `mt-auto shrink-0` — sempre na base do card,
 *                               com o divisor superior que já existia.
 *
 * ── LINHAS ELÁSTICAS: A FAIXA 2 É DIVIDIDA ENTRE OS REGISTROS VISÍVEIS ──────
 * A `<Table>` leva `h-full` dentro da faixa 2 — que tem altura DEFINIDA, porque
 * é `flex-1 min-h-0` de uma coluna esticada — e cada `<tr>` fica com altura
 * automática. Aí entra a regra de tabela do CSS: a altura de uma tabela é o
 * MAIOR valor entre a altura declarada e a soma das linhas, de modo que
 * `h-full` funciona como PISO e a sobra é repartida entre as LINHAS,
 * proporcionalmente. Numa faixa de ~580 px: 8 registros → ~69 px por linha;
 * 7 → ~79 px; 5 → ~110 px; 3 → ~184 px; 1 → a faixa inteira. Nada é calculado
 * em JS e não existe altura por filtro: a régua vem sempre da quantidade de
 * registros da PÁGINA ATUAL (`visiveis`), nunca do total.
 *
 * O que NÃO muda com isso:
 * - as LARGURAS das colunas (declaradas uma única vez no `colgroup`); só a
 *   ALTURA da linha cresce;
 * - o CONTEÚDO não estica: o `TableCell` já traz `align-middle`, então avatar,
 *   textos, selo de tipo e menu "⋯" ficam centrados na vertical e no tamanho de
 *   sempre;
 * - `CLASSE_CELULA` (`py-[6px]`) passa a ser o PISO da linha (~47 px) e não uma
 *   altura fixa — é ele que impede linha comprimida quando a faixa é pequena.
 *
 * ── CABEÇALHO E LINHAS NA MESMA RÉGUA (table-fixed + colgroup) ──────────────
 * A tabela é `table-fixed` e as larguras moram em UM lugar só — o `<colgroup>`.
 * O `<col>` governa a coluna inteira, então `<th>` e `<td>` sempre caem na
 * mesma caixa: o rótulo fica exatamente sobre o dado, em qualquer filtro,
 * página ou quantidade de registros. Nenhuma célula declara largura própria
 * (era isso que devolvia o dimensionamento ao conteúdo: nome longo ou motivo
 * truncado empurravam a coluna e o cabeçalho saía do lugar) e o padding
 * horizontal é o mesmo dos dois lados (`px-[8px]`).
 *
 * Alinhamento por natureza da coluna, também nos dois lados:
 *   Colaborador · Data · Tipo · Motivo → à ESQUERDA;
 *   Horas · Saldo antes · Saldo atual · Ações → à DIREITA (números em
 *   `tabular-nums` terminam no mesmo pixel).
 *
 * Com `whitespace-nowrap` e a coluna comportando o maior rótulo, o cabeçalho
 * fecha em UMA linha de 28 px — antes "Saldo antes"/"Saldo atual" quebravam em
 * duas linhas e a faixa deixava de ser uniforme. Coluna oculta no breakpoint
 * (`COLAPSO_*`: célula escondida SEM sair da grade + `w-0` no `colgroup`) não
 * reserva espaço nem desalinha as seguintes. Faixa mais larga que a soma das
 * colunas → o excedente é repartido entre elas; faixa mais estreita → a tabela
 * mantém o piso e rola DENTRO da faixa 2 (o cabeçalho acompanha a rolagem
 * horizontal), nunca a página.
 *
 * Quando os registros NÃO CABEM (25 ou 50 por página), o piso natural vence o
 * `h-full`: a tabela cresce em vez de comprimir linha, e a altura do card
 * acompanha (a grade da página fica com a coluna mais alta — comportamento
 * anterior a esta mudança, inalterado). Se o card estiver travado pela altura
 * da coluna da direita, a diferença vira rolagem DENTRO da faixa 2, com o
 * `<thead>` `sticky` no topo e a paginação parada na base do card. Sem
 * registros, o estado vazio (ou o "nada encontrado") centraliza nessa mesma
 * faixa, com cabeçalho e rodapé no lugar.
 *
 * ── FILTROS FORA DO CARD ────────────────────────────────────────────────────
 * A faixa de chips + busca + ordenação fica ACIMA do card (`BandaFiltros`), como
 * na referência: ela é o topo da COLUNA da esquerda (alinha com o topo da
 * coluna da direita) e o card começa logo depois, sem rolar nem crescer. Dentro
 * do card ela disputaria a faixa 2 com a tabela.
 *
 * ── QUEM FILTRA O QUÊ ───────────────────────────────────────────────────────
 * PERÍODO  → estado da PÁGINA (alimenta KPI Cards, rosca, barras, alerta e
 *            evolução). Chega aqui já aplicado em `registros`.
 * BUSCA e TIPO → também da PÁGINA (`filtros`/`onFiltrosChange`): o botão
 *            "Mais filtros" do cabeçalho acende o chip de saldos negativos e
 *            vice-versa, então o estado não pode morar em dois lugares.
 * PAGINAÇÃO e ORDEM → estado LOCAL (dizem respeito só a esta tabela).
 *
 * ── A LINHA ─────────────────────────────────────────────────────────────────
 * Hover = `CLASSE_LINHA_HOVER` (`ui/linha-tabela-hover.ts`, fonte única com
 * Horas Extras e Recrutamento): só o FUNDO escurece em 200 ms. O TIPO é um selo
 * translúcido (`seloTipo`), nunca cor sólida. Horas e saldos usam `tabular-nums`
 * e o formatador do sistema (`2h30`), com `—` quando a coluna é nula no banco.
 *
 * ── ESTADOS ─────────────────────────────────────────────────────────────────
 * Carregando → uma linha de texto discreta (sem spinner de página inteira).
 * Base sem lançamento → `EmptyState`. Recorte sem resultado → `EmptySearch`,
 * que já traz "Limpar busca".
 * ============================================================================
 */
import { useMemo, useState } from 'react';
import { ArrowDownUp, Copy, History, MoreHorizontal, Search } from 'lucide-react';
import { toast } from 'sonner';
import { AppPagination } from '@/components/ui/app-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CascadeTableBody, CascadeTableRow } from '@/components/ui/cascade-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptySearch, EmptyState } from '@/components/ui/empty-state';
import { EntradaPresenca, MotionCard } from '@/components/ui/entrada-cards';
import { entradaConteudoGlobal, propsEntradaGlobal } from '@/components/ui/entradaGlobal';
import { Input } from '@/components/ui/input';
import { CLASSE_LINHA_HOVER } from '@/components/ui/linha-tabela-hover';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { linhaTabelaVariants, linhaTabelaVariantsReduzido } from '@/components/ui/table-row-reveal';
import { UserAvatar } from '@/components/ui/user-avatar';
import { ColoredFilterChip } from '@/components/avaliacao/ColoredFilterChip';
import { PALETAS_CHIP, TEMA_TODOS, type TemaChip } from '@/components/avaliacao/chipFiltroComum';
import { ConteudoFiltro } from '@/components/horas-extras/FiltroSelectConteudo';
import { useMovimentoReduzido } from '@/lib/motionMode';
import { cn } from '@/lib/utils';
import {
  FILTROS_EXTRATO_PADRAO,
  ORDENS_EXTRATO,
  chaveCascataExtrato,
  contarTiposExtrato,
  dataDoRegistro,
  departamentoDoColaborador,
  filtrarExtrato,
  formatarHorasBanco,
  horasDoRegistro,
  lerIntervalo,
  nomeDoColaborador,
  ordenarExtrato,
  pluralRegistros,
  rotuloTipo,
  seloTipo,
  tipoDoRegistro,
  type ContagemTipos,
  type FiltroTipo,
  type FiltrosExtrato,
  type OrdemExtrato,
  type RegistroBancoHoras,
} from './bancoHorasComum';

export interface ExtratoBancoHorasProps {
  /** Lançamentos já recortados pelo período escolhido no cabeçalho. */
  registros: readonly RegistroBancoHoras[];
  /** Total da base carregada — só para o contador "x de y registros". */
  totalBase: number;
  /** Busca e tipo (estado da PÁGINA: o "Mais filtros" do cabeçalho escreve aqui). */
  filtros: FiltrosExtrato;
  onFiltrosChange: (filtros: FiltrosExtrato) => void;
  isLoading: boolean;
  /** Posição da seção na BANDA DE CONTEÚDO da fila única de entrada. */
  index?: number;
}

/** 8 por página é o que a referência desenha: a tabela cabe sem rolagem. */
const OPCOES_POR_PAGINA = [8, 25, 50] as const;
const POR_PAGINA_PADRAO = 8;

/**
 * Cabeçalho da tabela — 28 px de classe, alinhado ao `px-[8px]` das células.
 *
 * `sticky top-0` + `bg-card`: quando as linhas não cabem na altura do card, a
 * faixa 2 rola por dentro e os rótulos das colunas precisam continuar à vista.
 * O `bg-card` é o MESMO fundo do card, então fora da rolagem nada muda de
 * aparência (o `z-[1]` é o que faz o cabeçalho passar por cima das linhas do
 * `<tbody>`).
 *
 * `whitespace-nowrap` + a largura de coluna que comporta o MAIOR rótulo
 * ("Saldo antes" / "Saldo atual") são o que mantém a faixa em UMA linha: sem
 * isso o rótulo de duas palavras quebrava em duas linhas e a altura do
 * cabeçalho deixava de ser uniforme (medido: 28 px em "Colaborador" contra
 * 66 px em "Saldo atual" na mesma tabela).
 *
 * O divisor inferior vem do `after` (1 px em `bg-border/40`, o mesmo tom que o
 * `border-border/40` da linha do cabeçalho usava) e não de um `border` na
 * `<tr>`: em `border-collapse` a borda colapsada fica ancorada na GRADE da
 * tabela e sobraria um risco solto no lugar antigo quando o `th` deslizasse.
 */
const CLASSE_CABECALHO =
  'sticky top-0 z-[1] h-[28px] whitespace-nowrap bg-card px-[8px] text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border/40 after:content-[\'\']';

/**
 * COLAPSO DE COLUNA — sem tirar a célula da GRADE.
 *
 * `hidden md:table-cell` (como estava) REMOVE a célula da tabela: as colunas
 * seguintes escorregam uma posição para a esquerda e o `colgroup` passa a
 * valer para a coluna errada (medido em 1440: "Saldo atual" ficava com 0 px e
 * "Ações" herdava a largura do "Motivo").
 *
 * Aqui a célula continua ocupando o seu lugar na grade e só a COLUNA fecha:
 * o `<col>` fica com `w-0` no breakpoint e a célula esconde o conteúdo sem
 * ocupar espaço — `invisible` (nada é pintado, nada vaza para a vizinha),
 * `overflow-hidden` (o conteúdo não entra na rolagem horizontal) e `p-0`
 * (sem o padding de 8 px, que sozinho já daria 16 px de coluna).
 *
 * O `truncate`/`whitespace-nowrap` do conteúdo segue valendo: nada quebra em
 * várias linhas dentro da coluna de 0 px, então a altura da linha não muda.
 */
const COLAPSO_SALDO_ANTES = 'max-2xl:invisible max-2xl:overflow-hidden max-2xl:p-0';
const COLAPSO_SALDO_ATUAL = 'max-md:invisible max-md:overflow-hidden max-md:p-0';
const COLAPSO_MOTIVO = 'max-lg:invisible max-lg:overflow-hidden max-lg:p-0';

/**
 * Célula padrão. O `py-[6px]` é o PISO da linha (com o avatar de 22 px dá os
 * ~47 px de hoje), não a altura: quando a faixa 2 tem sobra, a linha cresce
 * (ver "LINHAS ELÁSTICAS" no topo) e o `align-middle` do `TableCell` centra o
 * conteúdo na altura que sobrar.
 *
 * `px-[8px]` é o MESMO padding horizontal do `CLASSE_CABECALHO` — é essa
 * igualdade que faz o rótulo e o dado partirem (ou terminarem) na mesma
 * coluna de pixels.
 */
const CLASSE_CELULA = 'px-[8px] py-[6px]';

/**
 * Geometria da busca e do seletor de ordem — a MESMA altura do `ColoredFilterChip`
 * (32 px de classe = 40 px renderizados), então a faixa fica numa régua só.
 */
const CLASSE_BUSCA = 'h-[32px] rounded-[8px] bg-secondary/40 pl-[32px] pr-[10px] text-[11.5px]';
const CLASSE_ORDEM = 'h-[32px] rounded-[8px] bg-secondary/40 px-[10px] text-[11.5px]';

/**
 * CHIPS DE TIPO — o `ColoredFilterChip` do Design System (Gestão de Desempenho /
 * Hub de Premiações / Recrutamento), a MESMA peça das pills "Todas · Abertas ·
 * Fechadas" da referência de filtros: pílula de 32 px de classe (40 px
 * renderizados), fundo translúcido + borda fina na cor semântica da categoria,
 * bolinha sólida, contador em pílula própria e halo `shadow-glow*` quando
 * selecionado (`transition-all duration-200`, sem mudar de largura).
 *
 * A cor NÃO mora aqui: cada chip recebe o `tema` de `PALETAS_CHIP` — lime para
 * "Todos" (o agregador), success para créditos, vermelho para débitos e âmbar
 * para negativos. Nenhum tom novo é criado; os tokens são os do design system.
 */
const CHIPS: ReadonlyArray<{ valor: FiltroTipo; rotulo: string; tema: TemaChip }> = [
  { valor: 'todos', rotulo: 'Todos', tema: TEMA_TODOS },
  { valor: 'credito', rotulo: 'Créditos', tema: PALETAS_CHIP.emerald },
  { valor: 'debito', rotulo: 'Débitos', tema: PALETAS_CHIP.red },
  { valor: 'negativos', rotulo: 'Negativos', tema: PALETAS_CHIP.amber },
];

/** Resumo textual de um lançamento — o que o menu "⋯" copia. */
function resumoDoRegistro(registro: RegistroBancoHoras): string {
  return [
    nomeDoColaborador(registro),
    dataDoRegistro(registro),
    rotuloTipo(tipoDoRegistro(registro)),
    formatarHorasBanco(horasDoRegistro(registro)),
  ].join(' · ');
}

/**
 * Faixa de chips: os quatro recortes com a contagem REAL da lista.
 *
 * Os números vêm de `contarTiposExtrato` (mesma base de período + busca), então
 * `Créditos + Débitos = Todos` e `Negativos` é subconjunto — o que o RH confere
 * ao olhar os chips lado a lado.
 */
function ChipsTipo({
  valor,
  contagens,
  onSelecionar,
}: {
  valor: FiltroTipo;
  contagens: ContagemTipos;
  onSelecionar: (tipo: FiltroTipo) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Filtrar por tipo de lançamento"
      className="flex min-w-0 flex-wrap items-center gap-[8px]"
    >
      {CHIPS.map((chip) => (
        <ColoredFilterChip
          key={chip.valor}
          label={chip.rotulo}
          count={contagens[chip.valor]}
          tema={chip.tema}
          selected={valor === chip.valor}
          onClick={() => onSelecionar(chip.valor)}
          ariaLabel={`${chip.rotulo}: ${contagens[chip.valor]} ${
            contagens[chip.valor] === 1 ? 'lançamento' : 'lançamentos'
          }`}
        />
      ))}
    </div>
  );
}

/**
 * BANDA DE FILTROS — os chips de tipo, a busca e a ordenação, ACIMA do card.
 *
 * Na referência a faixa de filtros é uma linha solta no topo da coluna e o card
 * começa abaixo dela, com o título já no topo da tabela. Isso não é só estética:
 * dentro do card, a faixa empurrava a tabela para baixo sem que o card
 * acompanhasse a altura da coluna da direita (sobrava um vazio enorme embaixo do
 * extrato). Fora dele, o card fica com a estrutura vertical limpa
 * (cabeçalho → tabela → paginação) e cresce junto com a coluna.
 */
function BandaFiltros({
  filtros,
  contagens,
  onFiltro,
  ordem,
  onOrdem,
  rotuloOrdem,
}: {
  filtros: FiltrosExtrato;
  contagens: ContagemTipos;
  onFiltro: (mudanca: Partial<FiltrosExtrato>) => void;
  ordem: OrdemExtrato;
  onOrdem: (ordem: OrdemExtrato) => void;
  rotuloOrdem: string;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-[8px]">
      <ChipsTipo
        valor={filtros.tipo}
        contagens={contagens}
        onSelecionar={(tipo) => onFiltro({ tipo })}
      />

      {/*
        Busca + ordenação vivem num grupo próprio. Ele NÃO tem `min-w-0`: com a
        largura automática livre o grupo encolhia abaixo do próprio conteúdo e a
        busca escorregava para cima dos chips em 1280 (sobreposição real, medida).
        Agora o grupo simplesmente desce para a linha seguinte quando os chips
        ocupam a faixa inteira, e a busca usa `flex-1` para ocupar o que sobra
        daquela linha (com teto, para não virar uma caixa desproporcional).
      */}
      <div className="ml-auto flex flex-1 items-center justify-end gap-[8px]">
        <div className="relative min-w-[104px] max-w-[192px] flex-1">
          <Search
            className="pointer-events-none absolute left-[10px] top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={filtros.busca}
            onChange={(evento) => onFiltro({ busca: evento.target.value })}
            placeholder="Buscar movimentação…"
            aria-label="Buscar no extrato"
            className={CLASSE_BUSCA}
          />
        </div>

        <Select value={ordem} onValueChange={(valor) => onOrdem(valor as OrdemExtrato)}>
          <SelectTrigger
            aria-label="Ordenar o extrato"
            className={cn(CLASSE_ORDEM, 'w-auto shrink-0 gap-[8px]')}
          >
            <ConteudoFiltro icone={ArrowDownUp} rotulo="Ordem" valor={rotuloOrdem} />
          </SelectTrigger>
          <SelectContent>
            {ORDENS_EXTRATO.map((opcao) => (
              <SelectItem key={opcao.value} value={opcao.value}>
                {opcao.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function ExtratoBancoHoras({
  registros,
  totalBase,
  filtros,
  onFiltrosChange,
  isLoading,
  index = 0,
}: ExtratoBancoHorasProps) {
  const movimentoReduzido = useMovimentoReduzido();
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(POR_PAGINA_PADRAO);
  const [ordem, setOrdem] = useState<OrdemExtrato>('recentes');

  // Contadores dos chips: período + busca, SEM o recorte de tipo — senão o chip
  // selecionado só mostraria a si mesmo.
  const contagens = useMemo(
    () => contarTiposExtrato(filtrarExtrato(registros, { busca: filtros.busca, tipo: 'todos' })),
    [registros, filtros.busca]
  );

  const filtrados = useMemo(
    () => ordenarExtrato(filtrarExtrato(registros, filtros), ordem),
    [registros, filtros, ordem]
  );
  const totalFiltrado = filtrados.length;

  // A faixa exibida é sempre válida: trocar filtro/período pode deixar o estado
  // numa página que não existe mais.
  const totalPaginas = Math.max(1, Math.ceil(totalFiltrado / Math.max(1, porPagina)));
  const paginaAtual = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (paginaAtual - 1) * porPagina;
  const visiveis = filtrados.slice(inicio, inicio + porPagina);

  const variantesLinha = movimentoReduzido ? linhaTabelaVariantsReduzido : linhaTabelaVariants;
  const chaveCascata = chaveCascataExtrato(filtros, paginaAtual, porPagina, ordem);

  const rotuloPaginacao =
    totalFiltrado === 0
      ? 'Nenhum lançamento'
      : `Mostrando ${inicio + 1}–${inicio + visiveis.length} de ${totalFiltrado}`;
  const rotuloContagem =
    totalFiltrado === totalBase
      ? pluralRegistros(totalBase)
      : `${totalFiltrado} de ${pluralRegistros(totalBase)}`;
  const rotuloOrdem =
    ORDENS_EXTRATO.find((opcao) => opcao.value === ordem)?.label ?? ORDENS_EXTRATO[0].label;

  /** Base sem NENHUM lançamento ≠ recorte sem resultado (estados diferentes). */
  const listaVazia = totalBase === 0;

  /*
   * A TABELA É ELÁSTICA — a faixa 2 (o wrapper `flex-1 min-h-0`) tem altura
   * definida e a `Table` recebe `h-full`, então a sobra é repartida entre as
   * linhas dos registros da PÁGINA ATUAL (`visiveis`): 24 registros com 8 na
   * tela dividem a faixa entre 8, e não em 24 fatias. O piso continua sendo a
   * altura natural da linha (`CLASSE_CELULA` + `align-middle`), de modo que com
   * 25/50 por página a tabela cresce (nunca comprime) e o cabeçalho fica preso
   * no topo (`CLASSE_CABECALHO`) sempre que a faixa tiver rolagem.
   */

  function aplicar(mudanca: Partial<FiltrosExtrato>) {
    onFiltrosChange({ ...filtros, ...mudanca });
    setPagina(1);
  }

  /** "Limpar busca" do estado vazio: zera busca e tipo (o período é da página). */
  function limparBuscaETipo() {
    onFiltrosChange(FILTROS_EXTRATO_PADRAO);
    setPagina(1);
  }

  async function copiarResumo(registro: RegistroBancoHoras) {
    const texto = resumoDoRegistro(registro);
    try {
      await navigator.clipboard.writeText(texto);
      toast.success('Lançamento copiado', { description: texto });
    } catch {
      toast.error('Não foi possível copiar o lançamento');
    }
  }

  return (
    <EntradaPresenca>
      <section aria-labelledby="banco-horas-extrato" className="flex min-w-0 flex-col gap-[9px]">
        {/* FAIXA 0 — filtros ACIMA do card: o card começa no cabeçalho da tabela. */}
        <BandaFiltros
          filtros={filtros}
          contagens={contagens}
          onFiltro={aplicar}
          ordem={ordem}
          onOrdem={setOrdem}
          rotuloOrdem={rotuloOrdem}
        />

        <MotionCard
          {...propsEntradaGlobal(index, entradaConteudoGlobal)}
          data-entrada="cascata"
          /* `flex-1 min-h-0`: o card ABSORVE a altura que a grade estica nesta
             coluna (ver `GRADE_COLUNAS`) e a reparte nas três faixas abaixo. */
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[11px] border-border/50"
        >
          {/* ── FAIXA 1: cabeçalho da seção (`shrink-0`: altura do conteúdo) ── */}
          <div className="flex min-h-[38px] shrink-0 flex-wrap items-center justify-between gap-x-[12px] gap-y-[6px] border-b border-border/40 px-[14px] pb-[8px] pt-[10px]">
            <div className="flex min-w-0 items-center gap-[9px]">
              <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[8px] bg-info/15 text-info">
                <History className="h-[14px] w-[14px]" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2
                  id="banco-horas-extrato"
                  className="truncate text-[13px] font-semibold leading-tight text-foreground"
                >
                  Extrato do banco de horas
                </h2>
                <p className="truncate text-[10.5px] leading-snug text-muted-foreground">
                  Créditos e débitos lançados no período.
                </p>
              </div>
            </div>
            <p
              className="shrink-0 text-[10.5px] font-medium tabular-nums text-muted-foreground"
              aria-live="polite"
              title="Lançamentos visíveis com os filtros atuais e total carregado"
            >
              {rotuloContagem}
            </p>
          </div>

          {/* ── FAIXA 2: área da tabela (`flex-1 min-h-0`: é a que cresce) ─── */}
          {isLoading ? (
            <p className="grid min-h-0 flex-1 place-items-center px-[14px] py-[18px] text-[11px] text-muted-foreground">
              Carregando lançamentos…
            </p>
          ) : listaVazia ? (
            <div className="flex min-h-0 flex-1 items-center justify-center px-[14px] py-[4px]">
              <EmptyState
                icon={History}
                title="Nenhum lançamento no banco de horas"
                description="Créditos e débitos aparecem aqui assim que o período tiver movimentação."
                /*
                 * `py` reduzido: o `EmptyState` do sistema nasce com `py-16`
                 * (pensado para páginas inteiras). Dentro de um card denso ele
                 * esticava a seção para ~740 px — aqui o vazio ocupa o mesmo
                 * lugar da tabela, sem virar um bloco desproporcional.
                 */
                className="py-[26px]"
              />
            </div>
          ) : totalFiltrado === 0 ? (
            <div className="flex min-h-0 flex-1 items-center justify-center px-[14px] py-[4px]">
              <EmptySearch onClear={limparBuscaETipo} className="py-[26px]" />
            </div>
          ) : (
            <>
              {/*
                FAIXA 2 — `overflow-auto` (rolagem horizontal em telas
                estreitas e vertical quando as linhas não cabem) e
                `[&>div]:h-full`: o wrapper que a `Table` cria por conta própria
                recebe a MESMA altura da faixa, e é isso que permite o `h-full`
                da tabela resolver em 100% da faixa.
              */}
              <div className="min-h-0 flex-1 overflow-auto [&>div]:h-full">
                {/*
                  ── UMA RÉGUA SÓ PARA CABEÇALHO E LINHAS ─────────────────────
                  `table-fixed` + `colgroup` é a configuração ÚNICA de larguras:
                  o `<col>` manda na coluna inteira, então o `<th>` e TODOS os
                  `<td>` daquela coluna herdam a mesma caixa — o rótulo cai
                  exatamente sobre o dado, em qualquer filtro, página ou
                  quantidade de registros. Nenhum `<th>`/`<td>` declara largura
                  própria: se declarasse, o auto-layout voltaria a dimensionar
                  a coluna pelo conteúdo (nome longo, motivo truncado) e o
                  cabeçalho sairia do lugar.

                  As larguras são em px de CLASSE e seguem a régua do design
                  system (o postcss converte para rem, como todo `w-[…]` do
                  app). Duas regras para mantê-las coerentes:
                   • cada coluna comporta o próprio conteúdo + o rótulo inteiro
                     em uma linha (~largura do texto + 16 px de padding) — é o
                     piso: Data 76, Tipo 64, Horas 56, Saldo 88, Ações 34;
                   • a coluna que está oculta naquele breakpoint fica com `w-0`
                     aqui — assim ela não reserva espaço enquanto o `<td>`/`<th>`
                     correspondente está colapsado.
                  A soma dá 690 px em `2xl`, 570 px em `lg`, 468 px em `md` e
                  380 px no piso. Com a faixa mais larga que a soma, o excedente
                  é repartido entre as colunas (todas crescem juntas, na mesma
                  proporção) — em 1600 a faixa tem ~694 px e a soma 690, então o
                  cabeçalho fecha em uma linha e nenhum nome corta; em 1440,
                  1920 e nas larguras intermediárias (~1100-1250) também sobra.
                  Quando a faixa é mais estreita que a soma, a tabela mantém o
                  piso e rola DENTRO da faixa 2 — nunca a página. Isso acontece
                  em três bolsões medidos: 1024 (faixa 514 px), 1280 (509 px,
                  onde a faixa ENCOLHE ao entrar o grid de `xl`) e 1536-1590.
                */}
                <Table className="h-full w-full table-fixed">
                  <colgroup>
                    <col className="w-[150px] lg:w-[160px] 2xl:w-[178px]" />
                    <col className="w-[76px]" />
                    <col className="w-[64px]" />
                    <col className="w-[56px]" />
                    <col className="w-0 2xl:w-[88px]" />
                    <col className="w-0 md:w-[88px]" />
                    <col className="w-0 lg:w-[92px] 2xl:w-[106px]" />
                    <col className="w-[34px]" />
                  </colgroup>
                  <TableHeader>
                    {/* Sem `border-b`: o divisor do cabeçalho é o `after` do
                        `CLASSE_CABECALHO`, que acompanha o `sticky`. */}
                    <TableRow className="hover:bg-transparent">
                      <TableHead className={CLASSE_CABECALHO}>Colaborador</TableHead>
                      <TableHead className={CLASSE_CABECALHO}>Data</TableHead>
                      <TableHead className={CLASSE_CABECALHO}>Tipo</TableHead>
                      <TableHead className={cn(CLASSE_CABECALHO, 'text-right')}>Horas</TableHead>
                      <TableHead
                        className={cn(CLASSE_CABECALHO, COLAPSO_SALDO_ANTES, 'text-right')}
                      >
                        Saldo antes
                      </TableHead>
                      <TableHead
                        className={cn(CLASSE_CABECALHO, COLAPSO_SALDO_ATUAL, 'text-right')}
                      >
                        Saldo atual
                      </TableHead>
                      <TableHead className={cn(CLASSE_CABECALHO, COLAPSO_MOTIVO)}>Motivo</TableHead>
                      <TableHead className={cn(CLASSE_CABECALHO, 'text-right')}>
                        <span className="sr-only">Ações</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <CascadeTableBody cascadeKey={chaveCascata}>
                    {visiveis.map((registro, posicao) => {
                      const horas = horasDoRegistro(registro);
                      const saldoAnterior = lerIntervalo(registro.saldo_anterior);
                      const saldoAtual = lerIntervalo(registro.saldo_atual);
                      const tipo = tipoDoRegistro(registro);
                      const nome = nomeDoColaborador(registro);
                      return (
                        <CascadeTableRow
                          key={registro.id}
                          index={posicao}
                          variants={variantesLinha}
                          className={cn('border-border/30', CLASSE_LINHA_HOVER)}
                        >
                          <TableCell className={CLASSE_CELULA}>
                            <div className="flex min-w-0 items-center gap-[7px]">
                              <UserAvatar
                                name={nome}
                                imageUrl={registro.colaborador?.foto_url ?? undefined}
                                size="sm"
                                className="h-[22px] w-[22px] shrink-0 text-[9px]"
                              />
                              <div className="min-w-0">
                                {/*
                                  `truncate` + `min-w-0` no filho: com a coluna
                                  fixa (`colgroup`), o nome e o departamento
                                  recebem a largura que sobra do avatar e
                                  cortam com reticências — nome longo não
                                  desloca nenhuma coluna vizinha.
                                */}
                                <p
                                  className="truncate text-[11px] font-medium leading-tight text-foreground"
                                  title={nome}
                                >
                                  {nome}
                                </p>
                                <p
                                  className="truncate text-[9.5px] leading-tight text-muted-foreground"
                                  title={departamentoDoColaborador(registro)}
                                >
                                  {departamentoDoColaborador(registro)}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell
                            className={cn(
                              CLASSE_CELULA,
                              'text-[10.5px] tabular-nums text-muted-foreground'
                            )}
                          >
                            {dataDoRegistro(registro)}
                          </TableCell>

                          <TableCell className={CLASSE_CELULA}>
                            <Badge
                              variant="outline"
                              className={cn(
                                'h-[19px] rounded-full px-[7px] text-[9.5px] font-medium',
                                seloTipo(tipo)
                              )}
                            >
                              {rotuloTipo(tipo)}
                            </Badge>
                          </TableCell>

                          <TableCell
                            className={cn(
                              CLASSE_CELULA,
                              'text-right text-[11px] font-semibold tabular-nums',
                              tipo === 'debito' ? 'text-destructive' : 'text-success'
                            )}
                          >
                            {tipo === 'debito' ? '−' : '+'}
                            {formatarHorasBanco(horas)}
                          </TableCell>

                          <TableCell
                            className={cn(
                              CLASSE_CELULA,
                              COLAPSO_SALDO_ANTES,
                              'text-right text-[10.5px] tabular-nums text-muted-foreground'
                            )}
                          >
                            {saldoAnterior === null ? '—' : formatarHorasBanco(saldoAnterior)}
                          </TableCell>

                          <TableCell
                            className={cn(
                              CLASSE_CELULA,
                              COLAPSO_SALDO_ATUAL,
                              'text-right text-[10.5px] font-semibold tabular-nums',
                              saldoAtual !== null && saldoAtual < 0
                                ? 'text-destructive'
                                : 'text-foreground'
                            )}
                          >
                            {saldoAtual === null ? '—' : formatarHorasBanco(saldoAtual)}
                          </TableCell>

                          {/*
                            `truncate` no filho: a largura vem da coluna fixa
                            (`colgroup`), então o motivo longo corta com
                            reticências dentro do próprio espaço e não empurra
                            as colunas vizinhas.
                          */}
                          <TableCell className={cn(CLASSE_CELULA, COLAPSO_MOTIVO)}>
                            <p
                              className="truncate text-[10.5px] leading-tight text-muted-foreground"
                              title={registro.motivo ?? undefined}
                            >
                              {registro.motivo?.trim() || '—'}
                            </p>
                          </TableCell>

                          <TableCell className={cn(CLASSE_CELULA, 'text-right')}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-[22px] w-[22px] rounded-[6px] text-muted-foreground hover:text-foreground"
                                  aria-label={`Ações do lançamento de ${nome}`}
                                >
                                  <MoreHorizontal className="h-[13px] w-[13px]" aria-hidden />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-[212px]">
                                <DropdownMenuItem onSelect={() => void copiarResumo(registro)}>
                                  <Copy className="mr-2 h-3.5 w-3.5" aria-hidden />
                                  Copiar resumo
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => aplicar({ busca: nome })}>
                                  <Search className="mr-2 h-3.5 w-3.5" aria-hidden />
                                  Filtrar por este colaborador
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </CascadeTableRow>
                      );
                    })}
                  </CascadeTableBody>
                </Table>
              </div>

              <AppPagination
                page={paginaAtual}
                total={totalFiltrado}
                pageSize={porPagina}
                pageSizeOptions={[...OPCOES_POR_PAGINA]}
                onPageChange={setPagina}
                onPageSizeChange={(tamanho) => {
                  setPorPagina(tamanho);
                  setPagina(1);
                }}
                label={rotuloPaginacao}
                /* FAIXA 3: `mt-auto` ancora a paginação na BASE do card, mesmo
                   quando a área da tabela tem sobra de altura. */
                className="mt-auto shrink-0 border-t border-border/40 px-[14px] py-[4px]"
              />
            </>
          )}
        </MotionCard>
      </section>
    </EntradaPresenca>
  );
}


