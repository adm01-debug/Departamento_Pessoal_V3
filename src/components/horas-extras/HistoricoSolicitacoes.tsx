/**
 * ============================================================================
 * HISTÓRICO DE SOLICITAÇÕES — a CENTRAL DE CONSULTA da área.
 *
 * É a ÚNICA interface de lista da tela: mostra pendentes, aprovadas e
 * rejeitadas com as sete colunas de sempre, filtros e paginação. Os cartões de
 * cima continuam sendo o lugar da DECISÃO rápida; a tabela é o lugar da
 * CONSULTA completa — não existe segunda janela, painel lateral ou aba com o
 * mesmo conteúdo.
 *
 * UM ÚNICO container (Card) com quatro faixas integradas:
 *
 *   ┌───────────────────────────────────────────────────────────────┐
 *   │ (ícone) Histórico de solicitações                20 registros  │
 *   │         Consulte todas as solicitações e seus status.          │
 *   ├───────────────────────────────────────────────────────────────┤
 *   │ [ busca ] [departamento] [status] [ordenar por] [limpar]        │
 *   │   …quebra para outra linha quando o texto do filtro não cabe      │
 *   ├───────────────────────────────────────────────────────────────┤
 *   │ COLABORADOR · DATA · REALIZAÇÃO · HORAS · MOTIVO · STATUS · AÇÕES │
 *   ├───────────────────────────────────────────────────────────────┤
 *   │ (linhas densas: avatar 26 px, texto compacto, ações à direita) │
 *   ├───────────────────────────────────────────────────────────────┤
 *   │ Mostrando X–Y de Z            Linhas por página ‹ 1 ›          │
 *   └───────────────────────────────────────────────────────────────┘
 *
 * O CONTADOR DO CABEÇALHO (`20 registros`) substituiu o antigo botão "Ver todas
 * as solicitações": o conjunto completo agora está AQUI, então um botão que
 * abrisse outra vista seria uma segunda porta para a mesma sala. O número sai do
 * mesmo `filtrarSolicitacoes` que alimenta a tabela (nunca contradiz a
 * paginação) e, com filtro ativo, mostra `4 de 20 registros`.
 *
 * IDENTIDADE (padrão do sistema):
 *  - Os filtros seguem a régua dos demais controles (47,5 px de altura
 *    renderizados) e uma superfície levemente destacada do cartão. A LARGURA
 *    vem do conteúdo: cada select mostra o valor selecionado INTEIRO (piso por
 *    filtro em `MEDIDA_FILTRO_*`), a busca absorve o espaço que sobra e a
 *    barra quebra em outra linha quando não cabe tudo — nada de reticências
 *    enquanto houver espaço.
 *  - O STATUS é um VEREDITO: pill translúcido (fundo com alfa + borda sutil +
 *    texto vibrante) via `seloStatus` — verde em “Aprovada”, vermelho em
 *    “Rejeitada”, âmbar de atenção em “Pendente”. A cor nunca é sólida.
 *  - AÇÕES é SEMPRE o mesmo par de ícones [ 👁 ] [ 🗑 ] (ver `AcoesDaLinha`),
 *    em qualquer status: nenhuma linha ganha um terceiro controle. A decisão
 *    (aprovar/rejeitar) mora nos controles do fluxo — cartões da fila de
 *    pendentes e diálogo "Ver detalhes", que o olho abre — e a exclusão aqui
 *    mantém a MESMA confirmação de antes.
 *  - A LINHA responde ao mouse com UM único efeito: o FUNDO fica um tom mais
 *    ESCURO que o cartão (`CLASSE_LINHA`, 200 ms). Texto, selos de status,
 *    ícones e opacidade continuam intactos; nada de borda, sombra, deslocamento
 *    ou mudança de altura. O efeito mora no `<tr>`, então cobre a largura
 *    inteira — inclusive os vãos entre as colunas — e não é reaplicado célula a
 *    célula.
 *
 * ENTRADA — duas camadas, nenhum número de movimento neste arquivo:
 *  - O CARD entra pela BANDA DE CONTEÚDO da fila única (`ui/entradaGlobal.ts` →
 *    `entradaConteudoGlobal`, o lado do zíper que preenche os vãos dos KPI
 *    Cards): 14 px de subida, 520 ms, `ease-out`, no slot que a página reserva
 *    DEPOIS dos cartões de aprovação.
 *  - AS LINHAS entram em CASCATA com a MESMA revelação da tabela de Candidatos
 *    de Recrutamento & Seleção: `ui/cascade-table` (`CascadeTableBody` +
 *    `CascadeTableRow`) sobre os variants de `ui/table-row-reveal`
 *    (`linhaTabelaVariants` — 10 px de subida, `scaleX` 0.94 → 1 nascendo do
 *    centro, 800 ms, `ease [0.22, 1, 0.36, 1]`), com a MESMA onda de entrada:
 *    0,52 s de espera + 40 ms por linha. Os valores são os compartilhados, não
 *    uma cópia: mexer em `table-row-reveal.ts` move Candidatos e Histórico
 *    juntos.
 *  - QUANDO a cascata toca: na apresentação da tabela e quando a LISTA troca de
 *    identidade — página, ordenação, status, departamento ou linhas por página
 *    (`chaveCascata`, a mesma régua do `chaveCascata` de `CandidatosPainel`).
 *    A BUSCA fica FORA da chave de propósito: digitar não reinicia a sequência a
 *    cada tecla (na referência é igual). Hover, abrir detalhe, excluir e
 *    atualização de dados não mexem na chave, então não reanimam nada.
 *  - `prefers-reduced-motion`: as linhas nascem prontas e sem cascata
 *    (`linhaTabelaVariantsReduzido`), exatamente como em Candidatos.
 *  - `data-entrada="cascata"` desliga o `.animate-squash` do `Card`.
 *
 * Divisão de responsabilidades (a mesma dos outros módulos do sistema):
 *  - A PÁGINA é dona do período e das ações (aprovar/rejeitar/excluir/detalhe);
 *    ela entrega as solicitações já recortadas por período.
 *  - ESTE COMPONENTE é dono do ESTADO dos filtros da lista (busca,
 *    departamento, status, ordenação, página) — nada disso vai ao servidor: é
 *    refino local sobre o conjunto já carregado. A LÓGICA mora em
 *    `horasExtrasComum` (`filtrarSolicitacoes`, `temFiltroAtivo`,
 *    `classeBotaoLimpar`).
 *  - O SERVIÇO (`horaExtraService`) continua dono do CRUD. Nenhuma escrita
 *    nasce aqui: aprovar/rejeitar/excluir na tabela chama os handlers da
 *    página, e KPIs, cartões e tabela se atualizam juntos.
 *
 * O filtro de status abre em "Aprovadas e rejeitadas" (as pendentes já estão na
 * fila de aprovação acima) e oferece "Todas as solicitações" para o conjunto
 * completo — a mesma tabela, sem vista paralela.
 * ============================================================================
 */
import { useMemo, useState } from 'react';
import { ArrowUpDown, Building2, CheckCircle2, FilterX, History, Search } from 'lucide-react';
import { AppPagination } from '@/components/ui/app-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CascadeTableBody, CascadeTableRow } from '@/components/ui/cascade-table';
import { EmptyList, EmptySearch } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { CLASSE_LINHA_HOVER } from '@/components/ui/linha-tabela-hover';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { linhaTabelaVariants, linhaTabelaVariantsReduzido } from '@/components/ui/table-row-reveal';
import { UserAvatar } from '@/components/ui/user-avatar';
import { EntradaPresenca, MotionCard } from '@/components/ui/entrada-cards';
import { entradaConteudoGlobal, propsEntradaGlobal } from '@/components/ui/entradaGlobal';
import { useMovimentoReduzido } from '@/lib/motionMode';
import { cn } from '@/lib/utils';
import {
  CLASSE_CAMPO_BUSCA,
  CLASSE_CONTROLE_FILTRO,
  FILTROS_PADRAO,
  MEDIDA_FILTRO_DEPARTAMENTO,
  MEDIDA_FILTRO_ORDEM,
  MEDIDA_FILTRO_STATUS,
  ORDEM_OPCOES,
  STATUS_FILTRO_OPCOES,
  TODOS_DEPARTAMENTOS,
  classeBotaoLimpar,
  dataDaRealizacao,
  dataDaSolicitacao,
  departamentoDoColaborador,
  departamentosDisponiveis,
  filtrarSolicitacoes,
  formatarHoras,
  nomeDoColaborador,
  rotuloStatus,
  seloStatus,
  temFiltroAtivo,
  type FiltroStatus,
  type FiltrosHistorico,
  type OrdemHistorico,
  type SolicitacaoHoraExtra,
} from './horasExtrasComum';
import { AcoesDaLinha } from './AcoesDaLinha';
import { ConteudoFiltro } from './FiltroSelectConteudo';

/** Tamanho de página inicial — o mesmo do seletor do `AppPagination`. */
const POR_PAGINA_PADRAO = 10;

export interface HistoricoSolicitacoesProps {
  /** Solicitações já recortadas pelo período da página. */
  solicitacoes: readonly SolicitacaoHoraExtra[];
  isLoading: boolean;
  onVerDetalhes: (s: SolicitacaoHoraExtra) => void;
  onExcluir: (s: SolicitacaoHoraExtra) => void;
  /** Abre o formulário de nova solicitação (vazio sem registros). */
  onNova: () => void;
  /** Posição da seção na BANDA DE CONTEÚDO da fila única (depois dos cartões). */
  index?: number;
}

const OPCOES_POR_PAGINA = [10, 25, 50] as const;

/**
 * Cabeçalho da tabela — 32 px de classe (40 px renderizados), rótulo discreto
 * mas legível (10 px → 12,5 px). `px-[10px]` alinha com as células.
 */
const CLASSE_CABECALHO = 'h-[32px] px-[10px] text-[10px] font-semibold uppercase tracking-wide text-muted-foreground';

/** Célula padrão: `py-[10px]` → linha de ~59 px renderizados com o conteúdo. */
const CLASSE_CELULA = 'px-[10px] py-[10px]';

/**
 * COLUNA AÇÕES — largura ESTÁVEL, a mesma nas sete linhas e em qualquer status.
 *
 * `w-[1%]` + `whitespace-nowrap` fazem a coluna encolher até o próprio conteúdo
 * (o par de 64 px de `AcoesDaLinha` + o padding da célula) em vez de o navegador
 * distribuir a sobra de espaço nela: sem essa trava, a coluna herdava a largura
 * do maior conteúdo de cada linha — e a que tinha o menu de três pontos era mais
 * larga que as outras, exatamente o desalinhamento corrigido aqui. Com a largura
 * fixa, o par de botões cai sempre na MESMA posição horizontal, alinhado à
 * direita, e não é empurrado pelos textos das colunas vizinhas.
 */
const CLASSE_COLUNA_ACOES = 'w-[1%] whitespace-nowrap';

/**
 * HOVER DA LINHA — a régua do efeito vive em `ui/linha-tabela-hover.ts`
 * (`CLASSE_LINHA_HOVER`), a fonte única compartilhada com Recrutamento &
 * Seleção → Candidatos: mesma cor (`--background` a 60%), mesmo tempo (200 ms) e
 * mesma propriedade animada (`background-color`) nas duas tabelas. A justificativa
 * de cada escolha está no módulo compartilhado; aqui só se mantém o nome local
 * `CLASSE_LINHA`, usado no `<tr>` da tabela.
 */
const CLASSE_LINHA = CLASSE_LINHA_HOVER;

export function HistoricoSolicitacoes({
  solicitacoes,
  isLoading,
  onVerDetalhes,
  onExcluir,
  onNova,
  index = 0,
}: HistoricoSolicitacoesProps) {
  /**
   * ENTRADA — slot congelado na montagem (`useState` com inicializador): o
   * `index` recebido vem de quantos cartões a fila de aprovação está exibindo, e
   * esse número muda quando uma solicitação é aprovada/rejeitada. Recalcular o
   * `custom` num card já visível reabriria a variante; congelado, a entrada é um
   * evento de montagem — decisão, filtro e atualização de dados não a repetem.
   */
  const [posicaoEntrada] = useState(index);
  /**
   * Filtros da tabela num ÚNICO objeto (`horasExtrasComum.FiltrosHistorico`),
   * a fonte única do que a listagem mostra — o cabeçalho, a paginação e o
   * destaque do "Limpar" leem todos daqui.
   */
  const [filtros, setFiltros] = useState<FiltrosHistorico>(FILTROS_PADRAO);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(POR_PAGINA_PADRAO);

  const departamentos = useMemo(() => departamentosDisponiveis(solicitacoes), [solicitacoes]);
  const filtradas = useMemo(() => filtrarSolicitacoes(solicitacoes, filtros), [solicitacoes, filtros]);

  const totalFiltrado = filtradas.length;
  const totalPaginas = Math.max(1, Math.ceil(totalFiltrado / Math.max(1, porPagina)));
  // Nunca exibe página inexistente (ex.: filtrar estando na página 3).
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = (paginaAtual - 1) * porPagina;
  const visiveis = filtradas.slice(inicio, inicio + porPagina);

  /**
   * ACESSIBILIDADE — com movimento reduzido, as linhas nascem visíveis e sem
   * cascata: é o mesmo opt-in da referência (`TabelaCandidatos`), e as duas
   * variantes vêm do MESMO módulo (`ui/table-row-reveal.ts`).
   */
  const movimentoReduzido = useMovimentoReduzido();
  const variantesLinha = movimentoReduzido ? linhaTabelaVariantsReduzido : linhaTabelaVariants;

  /**
   * IDENTIDADE DA LISTA — a MESMA régua do `chaveCascata` de `CandidatosPainel`:
   * página, ordenação, status, departamento e linhas por página. Quando a chave
   * muda, o `<tbody>` remonta e a cascata das linhas toca de novo.
   *
   * A BUSCA fica FORA de propósito: reanimar a sequência a cada tecla viraria
   * piscada — e na referência o texto digitado também não entra na chave. Hover,
   * abrir detalhe, excluir e a chegada de dados novos também não mexem aqui.
   */
  const chaveCascata = `${paginaAtual}|${filtros.ordem}|${filtros.status}|${filtros.departamento}|${porPagina}`;

  /**
   * "Limpar" NÃO tem estado próprio: o destaque sai de `classeBotaoLimpar`,
   * que lê os filtros reais (`temFiltroAtivo` — ordenação não conta).
   */
  const filtroAtivo = temFiltroAtivo(filtros);

  /** Toda mudança de filtro volta para a primeira página. */
  const aplicar = (parcial: Partial<FiltrosHistorico>) => {
    setFiltros((atual) => ({ ...atual, ...parcial }));
    setPagina(1);
  };

  /** Restaura os padrões e a listagem reage na mesma passada (página 1). */
  const limparFiltros = () => {
    setFiltros(FILTROS_PADRAO);
    setPagina(1);
  };

  /** Valor mostrado dentro de cada select (sempre o rótulo da opção ativa). */
  const rotuloFiltroStatus = STATUS_FILTRO_OPCOES.find((o) => o.value === filtros.status)?.label ?? 'Status';
  const rotuloFiltroOrdem = ORDEM_OPCOES.find((o) => o.value === filtros.ordem)?.label ?? 'Ordenar por';
  const rotuloFiltroDepartamento = filtros.departamento === TODOS_DEPARTAMENTOS ? 'Todos' : filtros.departamento;

  const rotuloPaginacao =
    totalFiltrado === 0
      ? 'Nenhuma solicitação'
      : `Mostrando ${inicio + 1}–${inicio + visiveis.length} de ${totalFiltrado}`;

  /**
   * Contador discreto do cabeçalho. Sai do MESMO `totalFiltrado` da paginação,
   * então os dois não podem divergir; quando o recorte realmente reduz a lista
   * ele mostra `4 de 20 registros` (o total do período não "desaparece"), e
   * quando nada foi descartado mostra só o total (`20 registros`).
   */
  const plural = (n: number) => (n === 1 ? 'registro' : 'registros');
  const totalRegistros = solicitacoes.length;
  const rotuloContagem =
    totalFiltrado === totalRegistros
      ? `${totalRegistros} ${plural(totalRegistros)}`
      : `${totalFiltrado} de ${totalRegistros} ${plural(totalRegistros)}`;

  return (
    <EntradaPresenca>
      <section aria-labelledby="horas-extras-historico" className="pt-[3px]">
        {/*
          UM ÚNICO container: cabeçalho + filtros + tabela + paginação. Antes
          eram dois cartões empilhados (cabeçalho solto e tabela), o que criava
          dois invólucros para a mesma seção.
        */}
        <MotionCard
          {...propsEntradaGlobal(posicaoEntrada, entradaConteudoGlobal)}
          data-entrada="cascata"
          className="overflow-hidden rounded-[11px] border-border/50"
        >
          {/* Cabeçalho da seção — respiro de 18,75 × 16,25 px renderizados */}
          <div className="flex min-h-[42px] flex-wrap items-center justify-between gap-x-[12px] gap-y-[8px] border-b border-border/40 px-[15px] pb-[10px] pt-[13px]">
            <div className="flex min-w-0 items-center gap-[10px]">
              <span className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-[9px] bg-info/15 text-info">
                <History className="h-[15px] w-[15px]" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2
                  id="horas-extras-historico"
                  className="truncate text-[14px] font-semibold leading-tight text-foreground"
                >
                  Histórico de solicitações
                </h2>
                <p className="mt-[2px] text-[11px] leading-snug text-muted-foreground">
                  Consulte todas as solicitações e seus status.
                </p>
              </div>
            </div>
            {/*
                CONTADOR em vez de ação: o conjunto completo já está nesta
                tabela (o filtro de status oferece "Todas as solicitações"),
                então um botão para outra vista seria redundante. Leitura
                discreta — texto pequeno, tabular, sem pílula nem borda — e num
                único nó de texto (o leitor de tela lê "20 registros" inteiro).
              */}
            <p
              className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground"
              aria-live="polite"
              title="Recorte atual da tabela e total de registros do período"
            >
              {rotuloContagem}
            </p>
          </div>

          {/* Barra de filtros: busca + departamento + status + ordenar + limpar,
              na MESMA linha sempre que couber. Os cinco controles são os MESMOS
              de antes, com 38 px de classe (47,5 px renderizados) de altura,
              raio de 10 px de classe (12,5 px) e respiro horizontal de 12 px
              (15 px) — a mesma régua dos demais controles do sistema. O realce
              vem de `CLASSE_CONTROLE_FILTRO`/`CLASSE_CAMPO_BUSCA`: superfície e
              borda próprias, sem mexer em altura nem tipografia.

              LARGURA: `flex-wrap` + controle dimensionado pelo CONTEÚDO
              (`sm:w-auto`/`sm:grow` + `MEDIDA_FILTRO_*`). Antes, o grid de
              `minmax(0,22fr)` espremia os três selects no mesmo espaço e o
              valor cedia ao `truncate` — "Aprovadas e rejeitadas" perdia a
              última letra em 1280 e um departamento de nome longo era cortado
              em QUALQUER largura. Agora cada select pede o que o seu texto
              precisa, a busca absorve a sobra e, se nem assim couber tudo, os
              controles descem para a linha seguinte. */}
          <div className="flex flex-wrap items-center gap-[10px] border-b border-border/40 px-[15px] pb-[12px] pt-[12px]">
            <div className="relative min-w-0 flex-[3_1_220px]">
              <Search
                className="pointer-events-none absolute left-[12px] top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={filtros.busca}
                onChange={(e) => aplicar({ busca: e.target.value })}
                placeholder="Buscar por colaborador, motivo…"
                aria-label="Buscar solicitações"
                className={CLASSE_CAMPO_BUSCA}
              />
            </div>

            <Select value={filtros.departamento} onValueChange={(v) => aplicar({ departamento: v })}>
              <SelectTrigger
                aria-label="Filtrar por departamento"
                className={cn(CLASSE_CONTROLE_FILTRO, MEDIDA_FILTRO_DEPARTAMENTO)}
              >
                <ConteudoFiltro icone={Building2} rotulo="Departamento" valor={rotuloFiltroDepartamento} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS_DEPARTAMENTOS}>Todos os departamentos</SelectItem>
                {departamentos.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtros.status} onValueChange={(v) => aplicar({ status: v as FiltroStatus })}>
              <SelectTrigger
                aria-label="Filtrar por status"
                className={cn(CLASSE_CONTROLE_FILTRO, MEDIDA_FILTRO_STATUS)}
              >
                <ConteudoFiltro icone={CheckCircle2} rotulo="Status" valor={rotuloFiltroStatus} />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTRO_OPCOES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtros.ordem} onValueChange={(v) => aplicar({ ordem: v as OrdemHistorico })}>
              <SelectTrigger aria-label="Ordenar por" className={cn(CLASSE_CONTROLE_FILTRO, MEDIDA_FILTRO_ORDEM)}>
                <ConteudoFiltro icone={ArrowUpDown} rotulo="Ordenar por" valor={rotuloFiltroOrdem} />
              </SelectTrigger>
              <SelectContent>
                {ORDEM_OPCOES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* `sm:ml-auto`: na linha completa não muda nada (os controles
                crescem e ocupam a sobra); quando o "Limpar" cai sozinho na
                última linha, ele fica alinhado à direita, como antes. */}
            <Button
              variant="ghost"
              size="sm"
              onClick={limparFiltros}
              disabled={!filtroAtivo}
              className={cn(classeBotaoLimpar(filtros), 'sm:ml-auto')}
            >
              <FilterX className="h-[14px] w-[14px]" aria-hidden />
              Limpar
            </Button>
          </div>

          {isLoading ? (
            <p className="px-[15px] py-8 text-center text-[11px] text-muted-foreground">Carregando solicitações…</p>
          ) : filtradas.length === 0 ? (
            solicitacoes.length === 0 ? (
              <EmptyList entityName="registro de hora extra" onCreate={onNova} />
            ) : (
              <EmptySearch search={filtros.busca.trim() || undefined} onClear={limparFiltros} />
            )
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={CLASSE_CABECALHO}>Colaborador</TableHead>
                    <TableHead className={CLASSE_CABECALHO}>Data da solicitação</TableHead>
                    <TableHead className={CLASSE_CABECALHO}>Data da realização</TableHead>
                    <TableHead className={CLASSE_CABECALHO}>Horas</TableHead>
                    <TableHead className={CLASSE_CABECALHO}>Motivo</TableHead>
                    <TableHead className={CLASSE_CABECALHO}>Status</TableHead>
                    <TableHead className={cn(CLASSE_CABECALHO, CLASSE_COLUNA_ACOES, 'text-right')}>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <CascadeTableBody cascadeKey={chaveCascata}>
                  {visiveis.map((s, indice) => {
                    const nome = nomeDoColaborador(s);
                    const departamentoDoItem = departamentoDoColaborador(s) ?? 'Departamento não informado';
                    const motivo = s.motivo?.trim() || '—';
                    return (
                      <CascadeTableRow
                        key={s.id}
                        index={indice}
                        variants={variantesLinha}
                        // `border-0`: o `TableRow` do design system traz `border-b`
                        // (divisória entre linhas). Esta tabela não tem divisórias —
                        // o realce de hover cobre a linha inteira e é o único efeito.
                        className={cn(CLASSE_LINHA, 'border-0')}
                      >
                        <TableCell className={CLASSE_CELULA}>
                          <div className="flex min-w-0 items-center gap-[8px]">
                            <UserAvatar name={nome} size="sm" className="h-[26px] w-[26px] shrink-0 text-[10px]" />
                            <div className="min-w-0">
                              <p
                                className="truncate text-[11px] font-semibold leading-tight text-foreground"
                                title={nome}
                              >
                                {nome}
                              </p>
                              <p
                                className="mt-[2px] truncate text-[10px] leading-tight text-muted-foreground"
                                title={departamentoDoItem}
                              >
                                {departamentoDoItem}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell
                          className={cn(
                            CLASSE_CELULA,
                            'whitespace-nowrap text-[11px] tabular-nums text-muted-foreground'
                          )}
                        >
                          {dataDaSolicitacao(s)}
                        </TableCell>
                        <TableCell
                          className={cn(CLASSE_CELULA, 'whitespace-nowrap text-[11px] tabular-nums text-foreground')}
                        >
                          {dataDaRealizacao(s)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            CLASSE_CELULA,
                            'whitespace-nowrap text-[11px] font-semibold tabular-nums text-foreground'
                          )}
                        >
                          {formatarHoras(s.horas_solicitadas)}
                        </TableCell>
                        <TableCell className={CLASSE_CELULA}>
                          <p className="max-w-[260px] truncate text-[11px] text-muted-foreground" title={motivo}>
                            {motivo}
                          </p>
                        </TableCell>
                        <TableCell className={CLASSE_CELULA}>
                          {/* Selo de veredito: fundo translúcido + borda sutil +
                              texto vibrante — as cores vêm de `seloStatus`, que é
                              a fonte única (tabela, card e diálogo). */}
                          <Badge
                            variant="outline"
                            size="sm"
                            className={cn('h-[21px] px-[10px] text-[10px]', seloStatus(s.status))}
                          >
                            {rotuloStatus(s.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className={cn(CLASSE_CELULA, CLASSE_COLUNA_ACOES)}>
                          <AcoesDaLinha solicitacao={s} onVerDetalhes={onVerDetalhes} onExcluir={onExcluir} />
                        </TableCell>
                      </CascadeTableRow>
                    );
                  })}
                </CascadeTableBody>
              </Table>

              {/* Paginação integrada ao rodapé da tabela */}
              <div className="border-t border-border/40 px-[15px] py-[6px]">
                <AppPagination
                  page={paginaAtual}
                  total={totalFiltrado}
                  pageSize={porPagina}
                  pageSizeOptions={OPCOES_POR_PAGINA}
                  onPageChange={setPagina}
                  onPageSizeChange={(tamanho) => {
                    setPorPagina(tamanho);
                    setPagina(1);
                  }}
                  label={rotuloPaginacao}
                  isLoading={isLoading}
                />
              </div>
            </>
          )}
        </MotionCard>
      </section>
    </EntradaPresenca>
  );
}
