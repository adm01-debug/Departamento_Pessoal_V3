/**
 * ============================================================================
 * TABELA DA CENTRAL DE AJUSTES — listagem compacta (a paginação é um card à parte).
 *
 * ── SELEÇÃO x LINHA ATIVA (dois estados, ZERO pintura na linha) ─────────────
 *  · CHECKBOX  seleciona para as ações em lote (Aprovar / Rejeitar em lote);
 *  · LINHA     é o "recorte atual": clicar abre aquela solicitação no painel de
 *              detalhes ao lado.
 * Nenhum dos dois pinta a linha. A marcação se lê SÓ no checkbox (lime
 * preenchido, check escuro) e a linha aberta se lê no painel ao lado — a
 * tabela fica uniforme e o conteúdo (nome, horário, badges de risco e status)
 * não divide atenção com realce de linha. Histórico do que saiu: primeiro um
 * contorno lime nas quatro bordas, depois tinta esverdeada + barra lime de
 * 3 px à esquerda; as duas versões criavam uma mancha verde que destoava do
 * resto do sistema.
 * O par `aria-selected` + `data-estado` continua no `<tr>`: é o que comunica
 * o estado para leitor de tela e para os testes, sem pintar pixel nenhum.
 *
 * ── HOVER ──────────────────────────────────────────────────────────────────
 * Cinza-azulado do sistema um degrau ACIMA do `--card` (ver `LINHA_HOVER`):
 * `--muted` (216 16% 14%) sobre o card (214 42% 12%) clareia ~1/8 mantendo a
 * matiz azul — o hover não puxa para o verde. Todas as linhas reagem IGUAL,
 * inclusive a marcada e a aberta no painel: seleção não altera o hover.
 * Aqui não se reusa `CLASSE_LINHA_HOVER` (`ui/linha-tabela-hover.ts`), que
 * ESCURECE em 200 ms com `--background` para o Histórico de Horas Extras e a
 * Tabela de Candidatos: esta tabela pede hover um passo mais CLARO. A
 * propriedade animada é a mesma (`transition-colors`) e o tempo também
 * (200 ms, dentro da faixa 180–250 ms da régua de hover do `index.css`) — só
 * o fundo se move: nada de borda, sombra, escala ou `translate`.
 *
 * ── RÉGUA ENTRE LINHAS ─────────────────────────────────────────────────────
 * Só um fio hairline (`border-border/25`): separa sem desenhar caixas. Nada de
 * zebra — as linhas não alternam faixa de fundo, alternam apenas o fio, então
 * não há contraste de degrau entre uma linha e a seguinte nem cara de card
 * independente.
 *
 * ── DENSIDADE E COLUNAS ────────────────────────────────────────────────────
 * Cabeçalho de 32 px (`CABECALHO`), células com `px-2`/`py-[5px]` (`CELULA`) e
 * texto de 10,5–12 px: as linhas ficam em 38–42 px, a altura da referência —
 * sete registros cabem na composição desktop sem rolagem. As oito colunas são,
 * nesta ordem:
 *
 *   Seleção · Colaborador · Data · Tipo · Horário · Motivo · Risco IA · Status
 *
 * ── ALTURA E PAGINAÇÃO ─────────────────────────────────────────────────────
 * O card é uma coluna flexível (`h-full` + corpo com `overflow-auto`): na linha
 * `1fr` do grid da tela ele estica até a altura do painel de detalhes, que ocupa
 * as MESMAS linhas à direita. O rodapé de paginação NÃO mora aqui — virou o card
 * independente `CentralAjustesPaginacao`, imediatamente abaixo, para que a base
 * da paginação e a base do painel fechem no mesmo alinhamento.
 *
 * As três do meio que não cabem em telas estreitas entram por largura, NESTA
 * ordem (as demais nunca saem):
 *
 *   Colaborador · Data · Horário · Status       sempre
 *   Risco IA                                    a partir de `md`
 *   Tipo · Motivo                               a partir de `xl`
 *
 * "Tipo" e "Motivo" aparecem por último porque já estão no painel de detalhes
 * ao lado — o painel é o lugar da leitura completa, a tabela é o índice.
 * A coluna de ação lateral que existia antes saiu: "Detalhes completos" é ação
 * do painel, e sem ela a tabela cabe inteira nos ~770px da coluna esquerda (o
 * pior caso do layout dividido, em 1400px de viewport) sem rolagem horizontal.
 */
import { ShieldCheck, UserRoundX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserAvatar } from '@/components/ui/user-avatar';
import { cn } from '@/lib/utils';
import {
  RISCOS_AJUSTE,
  STATUS_AJUSTE,
  dataBR,
  horaAjuste,
  metaTipoAjuste,
  riscoDoAjuste,
  statusAjuste,
  type SolicitacaoAjustePonto,
} from './centralAjustes';

interface CentralAjustesTabelaProps {
  /** Somente as linhas da PÁGINA atual, já filtradas e paginadas. */
  solicitacoes: readonly SolicitacaoAjustePonto[];
  /** IDs marcados nos checkboxes. */
  selecionadas: readonly string[];
  onAlternarSelecao: (id: string) => void;
  onAlternarSelecaoDaPagina: () => void;
  /** ID da solicitação aberta no painel de detalhes. */
  idAtiva: string | null;
  onAtivar: (id: string) => void;
  /**
   * A PAGINAÇÃO NÃO MORA MAIS AQUI. Ela é um card próprio, logo abaixo deste
   * (`CentralAjustesPaginacao`), como na referência — por isso os props de
   * página/total/ações em lote saíram da tabela.
   */
}

/**
 * Densidade única das células. `py-[5px]` + texto de 11–12 px sobre o avatar de
 * 28 px rende linhas de 38–42 px — a altura da referência (a faixa pede 38–44).
 * Antes eram `py-2` e linhas de 42–48 px: mesma informação, 6 px a mais em cada
 * linha, que empurravam a sexta/sétima linha para fora da composição.
 */
const CELULA = 'px-2 py-[5px] align-middle';

/** Cabeçalho da tabela — 32 px, compacto, na mesma régua das células. */
const CABECALHO =
  'h-[32px] px-2 align-middle text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase';

/**
 * ── ESTADO DA LINHA — UM só, o hover ───────────────────────────────────────
 * A tabela tem um fundo único: o do card. Nenhuma linha ganha tinta por estar
 * marcada no checkbox nem por estar aberta no painel de detalhes — quem
 * comunica isso é o checkbox (lime preenchido) e o próprio painel. O único
 * estado pintado é o HOVER.
 *
 * `--muted` (216 16% 14%) a 70% sobre o `--card` (214 42% 12%) compõe
 * ≈ rgb(26 34 42) — medido no Chromium: matiz ~210° (o azul-acinzentado do
 * sistema preservado), 1,3 ponto de luz acima do card e contraste de 1,06:1,
 * ou seja, clareia sem virar faixa. `--foreground` (0 0% 88%) daria o mesmo
 * sentido de clareamento, porém em cinza neutro — o pedido é o tom levemente
 * AZULADO. `--background` escureceria (é o que faz `CLASSE_LINHA_HOVER`, usado
 * nas outras tabelas).
 *
 * `transition-colors` (e não `all`): só o fundo se move, sem borda, sombra,
 * escala ou `translate` — a caixa da linha não muda e nada no fluxo se desloca.
 * 200 ms, dentro da faixa 180–250 ms da régua de hover do `index.css`.
 */
const LINHA_HOVER = 'transition-colors duration-200 hover:bg-muted/70';

export function CentralAjustesTabela({
  solicitacoes,
  selecionadas,
  onAlternarSelecao,
  onAlternarSelecaoDaPagina,
  idAtiva,
  onAtivar,
}: CentralAjustesTabelaProps) {
  const marcadasNaPagina = solicitacoes.filter((s) => selecionadas.includes(s.id)).length;
  const todasDaPaginaMarcadas = solicitacoes.length > 0 && marcadasNaPagina === solicitacoes.length;

  return (
    // `h-full` + coluna flexível: na linha `1fr` do grid da tela o card estica
    // até a altura que o painel de detalhes (vizinho, ocupando as MESMAS linhas)
    // impõe. A tabela fica com o topo ancorado e a área do corpo rola se o
    // conteúdo passar — nada de linha esticada nem de vão entre os registros.
    <Card className="flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card">
      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        <div className="min-h-0 flex-1 overflow-auto">
          <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent">
                  {/* Larguras explícitas: a coluna Flexível é "Motivo", que
                    trunca antes de qualquer outra coisa. Sem elas o navegador
                    distribui por conteúdo e a coluna Colaborador — a que mais
                    precisa de espaço para o nome completo — encolhe primeiro. */}
                  <TableHead className={cn(CABECALHO, 'w-9 px-2')}>
                    <Checkbox
                      aria-label="Selecionar todas as solicitações da página"
                      checked={todasDaPaginaMarcadas}
                      onCheckedChange={onAlternarSelecaoDaPagina}
                    />
                  </TableHead>
                  <TableHead className={CABECALHO}>Colaborador</TableHead>
                  <TableHead className={cn(CABECALHO, 'w-[92px]')}>Data</TableHead>
                  <TableHead className={cn(CABECALHO, 'hidden w-[124px] xl:table-cell')}>Tipo de ajuste</TableHead>
                  <TableHead className={cn(CABECALHO, 'w-[76px]')}>Horário</TableHead>
                  <TableHead className={cn(CABECALHO, 'hidden xl:table-cell')}>Motivo</TableHead>
                  <TableHead className={cn(CABECALHO, 'hidden w-[78px] text-center md:table-cell')}>Risco IA</TableHead>
                  <TableHead className={cn(CABECALHO, 'w-[92px] text-center')}>Status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {solicitacoes.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={8} className="px-4 py-10 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground">
                          <UserRoundX className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <p className="text-xs font-medium">Nenhuma solicitação encontrada</p>
                        <p className="text-[11px] text-muted-foreground">
                          Ajuste a busca, o status ou o período selecionado.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  solicitacoes.map((solicitacao) => (
                    <LinhaAjuste
                      key={solicitacao.id}
                      solicitacao={solicitacao}
                      ativa={solicitacao.id === idAtiva}
                      marcada={selecionadas.includes(solicitacao.id)}
                      onAtivar={onAtivar}
                      onAlternarSelecao={onAlternarSelecao}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * LINHA DA SOLICITAÇÃO — a peça que se repete, na densidade da referência.
 *
 * Ordem das células (a MESMA do cabeçalho): seleção · colaborador · data · tipo ·
 * horário · motivo · risco IA · status. Tudo em 11–11,5 px sobre o avatar de
 * 28 px (`UserAvatar size="sm"`): a linha fecha em 38–42 px.
 *
 * Interação: a linha inteira ativa o painel de detalhes (clique, Enter ou
 * Espaço). O checkbox para a propagação do clique, para marcar não abrir o
 * painel. A linha NÃO tem aparência própria por estar ativa ou marcada: mesma
 * superfície do card das demais, sem barra, fundo ou contorno de seleção — o
 * estado existe só nos atributos (`aria-selected` / `data-estado`) e na
 * interface que o usuário enxerga fora da tabela (checkbox e painel). O único
 * realce permitido é o hover de `LINHA_HOVER`, idêntico em todas as linhas.
 */
function LinhaAjuste({
  solicitacao,
  ativa,
  marcada,
  onAtivar,
  onAlternarSelecao,
}: {
  solicitacao: SolicitacaoAjustePonto;
  ativa: boolean;
  marcada: boolean;
  onAtivar: (id: string) => void;
  onAlternarSelecao: (id: string) => void;
}) {
  const estado = statusAjuste(solicitacao.status);
  const risco = riscoDoAjuste(solicitacao);
  const tipo = metaTipoAjuste(solicitacao.tipo_ponto);
  const Icone = tipo.icone;
  const nome = solicitacao.colaborador?.nome_completo ?? 'Colaborador removido';

  return (
    <TableRow
      aria-selected={ativa}
      data-estado={ativa ? 'ativa' : marcada ? 'marcada' : 'inativa'}
      tabIndex={0}
      onClick={() => onAtivar(solicitacao.id)}
      onKeyDown={(evento) => {
        if (evento.key === 'Enter' || evento.key === ' ') {
          evento.preventDefault();
          onAtivar(solicitacao.id);
        }
      }}
      className={cn(
        'cursor-pointer border-border/25 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/60 focus-visible:outline-hidden',
        LINHA_HOVER
      )}
    >
      <TableCell className={CELULA} onClick={(evento) => evento.stopPropagation()}>
        <Checkbox
          aria-label={`Selecionar solicitação de ${nome}`}
          checked={marcada}
          onCheckedChange={() => onAlternarSelecao(solicitacao.id)}
        />
      </TableCell>

      <TableCell className={CELULA}>
        <div className="flex items-center gap-2">
          <UserAvatar name={nome} size="sm" />
          <div className="max-w-[180px] min-w-0">
            <p className="truncate text-xs leading-tight font-medium" title={nome}>
              {nome}
            </p>
            {solicitacao.relatorio_conformidade?.portaria_671_conformidade && (
              <p className="flex items-center gap-0.5 text-[10px] leading-tight text-success">
                <ShieldCheck className="h-2.5 w-2.5" aria-hidden="true" />
                Portaria 671
              </p>
            )}
          </div>
        </div>
      </TableCell>

      <TableCell className={CELULA}>
        <span className="text-[11.5px] whitespace-nowrap tabular-nums">{dataBR(solicitacao.data_ponto)}</span>
      </TableCell>

      <TableCell className={cn(CELULA, 'hidden xl:table-cell')}>
        <div className="flex items-center gap-1.5">
          <Icone className={cn('h-3.5 w-3.5 shrink-0', tipo.cor)} aria-hidden="true" />
          <span className="text-[11px] whitespace-nowrap">{tipo.rotulo}</span>
        </div>
      </TableCell>

      <TableCell className={CELULA}>
        <div className="flex flex-col leading-tight">
          <span className="text-numeric text-[11.5px]">{horaAjuste(solicitacao.hora_sugerida)}</span>
          {solicitacao.hora_original && (
            <span className="text-[10px] text-muted-foreground line-through">
              {horaAjuste(solicitacao.hora_original)}
            </span>
          )}
        </div>
      </TableCell>

      <TableCell className={cn(CELULA, 'hidden xl:table-cell')}>
        <span className="block max-w-[150px] truncate text-[11px] text-muted-foreground" title={solicitacao.motivo}>
          {solicitacao.motivo}
        </span>
      </TableCell>

      <TableCell className={cn(CELULA, 'hidden text-center md:table-cell')}>
        {risco ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Badge variant={RISCOS_AJUSTE[risco.nivel].badge} size="sm" className="h-[19px] px-2 text-[10px]">
                  {RISCOS_AJUSTE[risco.nivel].rotulo}
                </Badge>
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-[220px] text-[10px]">
              {risco.resumo ?? 'Parecer da análise de risco não registrado.'}
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-[11px] text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell className={cn(CELULA, 'text-center')}>
        <Badge variant={STATUS_AJUSTE[estado].badge} size="sm" className="h-[19px] px-2 text-[10px]">
          {STATUS_AJUSTE[estado].rotulo}
        </Badge>
      </TableCell>
    </TableRow>
  );
}
