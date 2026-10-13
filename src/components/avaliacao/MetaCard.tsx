import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowRight,
  Building2,
  Calendar,
  MoreHorizontal,
  Target,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { iniciais } from './desempenhoComum';
import { MotionCard, entradaCard } from './entradaCards';
import { IndicadorEvolucao } from './IndicadorEvolucao';
import { ProgressoDonut } from './ProgressoDonut';
import {
  CLASSE_SITUACAO,
  COR_DONUT,
  ROTULO_SITUACAO,
  TINTA_PRAZO,
  descricaoPrazo,
  rotuloTipo,
  type MetaDerivada,
} from './metasComum';

/**
 * ============================================================================
 * CARD DE META / OKR — aba "Metas & OKRs".
 *
 * Quatro regiões, na ordem da referência: (A) cabeçalho — pílula única de
 * [ícone + tipo], badge de situação e menu de três pontos; (B) identificação —
 * título e descrição; (C) progresso — donut do percentual real ao lado do
 * subpainel de PRAZO (calendário + leitura contextual + data) e, quando o
 * registro traz histórico, o `IndicadorEvolucao` logo ABAIXO do painel e à
 * DIREITA do donut; (D) rodapé — responsável
 * (avatar de iniciais + nome + departamento) e a ação real à direita.
 *
 * GEOMETRIA: card horizontal e compacto, densidade por `gap-3`/`p-4` (nenhuma
 * altura fixa, nenhum `justify-between` espalhando as regiões). O rodapé usa
 * `mt-auto` para alinhar a ação entre cards da MESMA linha, sem esticar o
 * miolo com espaços vazios.
 *
 * ENTRADA: `entradaCard(indice)` — o MESMO fade + subida de 20 px dos KPI
 * Cards do Dashboard Executivo, em cascata pelo índice recebido (a aba passa
 * a ordem de leitura: 1ª, 2ª, 3ª coluna, depois 4ª, 5ª, 6ª posição).
 *
 * AÇÕES: só o que o sistema realmente faz. Não há tela de detalhe da meta nem
 * mutation de "atualizar progresso" em `avaliacaoService`, então o botão do
 * card leva ao CICLO da meta no painel da aba "Ciclos" (ação real da página) e
 * o menu oferece as duas navegações reais existentes: abrir o ciclo e filtrar
 * pelo responsável. Nenhum botão decorativo.
 *
 * DADOS OPCIONAIS: evolução (só com histórico em `progresso_anterior`) e
 * departamento (resolvido em `metasComum.departamentoDe`) só aparecem quando
 * existem de fato — ver `metasComum.ts`.
 * ============================================================================
 */

/** Ícone da coluna `tipo` (o dado real traz individual/equipe/empresa/okr). */
const ICONE_TIPO: Record<string, LucideIcon> = {
  individual: User,
  equipe: Users,
  empresa: Building2,
  okr: Target,
};

/**
 * Chave normalizada do tipo REAL para o mapa de ícones. 'okr' (inclusive em
 * valores compostos como "okr - equipe") cai em `Target`, o mesmo ícone da
 * ação "Metas & OKRs" — nenhuma biblioteca nova.
 */
function chaveIcone(tipo: unknown): string {
  const t = String(tipo ?? '')
    .trim()
    .toLowerCase();
  return t.includes('okr') ? 'okr' : t;
}

interface MetaCardProps {
  item: MetaDerivada;
  /** Posição na cascata de entrada (mesma régua do Dashboard Executivo). */
  indice: number;
  /** Movimento reduzido (ver `useMovimentoReduzido`). */
  reduzirMovimento?: boolean;
  /** Abre o ciclo da meta no painel da aba "Ciclos". */
  onAbrirCiclo?: (cicloId: string) => void;
  /** Seleciona o responsável no filtro da barra. */
  onFiltrarResponsavel?: (nome: string) => void;
}

export function MetaCard({
  item,
  indice,
  reduzirMovimento = false,
  onAbrirCiclo,
  onFiltrarResponsavel,
}: MetaCardProps) {
  const { meta, situacao, percentual, evolucao, responsavel, departamento, prazo } = item;
  const Icone = ICONE_TIPO[chaveIcone(meta?.tipo)] ?? Target;
  const cicloId = String(meta?.ciclo_id ?? '');
  const podeAbrirCiclo = Boolean(cicloId) && Boolean(onAbrirCiclo);
  const podeFiltrar = responsavel !== '—' && Boolean(onFiltrarResponsavel);

  return (
    <MotionCard
      {...entradaCard(indice)}
      className="flex flex-col gap-2.5 rounded-xl border-border/60 bg-gradient-to-b from-card to-card/60 px-4 py-3 shadow-elevated transition-colors hover:border-primary/30"
    >
      {/* ── Região A: cabeçalho — [ícone + tipo] · situação · menu ───────── */}
      <div className="flex items-center gap-2">
        {/* Superfície ÚNICA do tipo: o ícone vive dentro da própria pílula. */}
        <span className="inline-flex h-6 min-w-0 shrink items-center gap-1.5 rounded-md border border-border/60 bg-muted/40 px-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          <Icone className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{rotuloTipo(meta?.tipo)}</span>
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Badge
            variant="outline"
            size="sm"
            className={cn(
              'h-5 rounded-md border px-2 text-[10px] font-medium uppercase tracking-wide',
              CLASSE_SITUACAO[situacao]
            )}
          >
            {ROTULO_SITUACAO[situacao]}
          </Badge>
          {(podeAbrirCiclo || podeFiltrar) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  aria-label={`Ações da meta ${meta?.titulo ?? ''}`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {podeAbrirCiclo && (
                  <DropdownMenuItem onClick={() => onAbrirCiclo?.(cicloId)}>
                    <Calendar className="mr-2 h-3.5 w-3.5" /> Ver ciclo no painel
                  </DropdownMenuItem>
                )}
                {podeFiltrar && (
                  <DropdownMenuItem onClick={() => onFiltrarResponsavel?.(responsavel)}>
                    <User className="mr-2 h-3.5 w-3.5" /> Filtrar por este responsável
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* ── Região B: identificação — título + descrição ─────────────────── */}
      <div className="space-y-1">
        <h3 className="font-display text-[13px] font-semibold leading-tight tracking-tight">{meta?.titulo}</h3>
        {meta?.descricao && (
          // Sem `line-clamp`: a descrição real quebra naturalmente e nunca é
          // cortada por reticências. A reserva de duas linhas mantém os blocos
          // inferiores alinhados entre cards de texto curto e longo.
          <p className="min-h-[1.9rem] text-[11px] leading-snug text-muted-foreground">{meta.descricao}</p>
        )}
      </div>

      {/* ── Região C: donut do percentual real + subpainel de prazo ──────── */}
      <div className="flex items-center gap-3.5">
        <ProgressoDonut percentual={percentual} cor={COR_DONUT[situacao]} reduzirMovimento={reduzirMovimento} />
        <div className="min-w-0 flex-1 space-y-2">
          {/* Subpainel do prazo: superfície interna própria (mais escura que o
              card), como a referência — nada de texto solto sobre o fundo. */}
          <div className="rounded-lg border border-border/50 bg-background/50 px-2.5 py-1.5">
            <p className={cn('flex items-center gap-1.5 text-[11px] font-medium leading-tight', TINTA_PRAZO[situacao])}>
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{descricaoPrazo(item)}</span>
            </p>
            <p className="mt-0.5 truncate font-mono text-[10px] leading-tight text-muted-foreground">Prazo: {prazo}</p>
          </div>
          {evolucao !== null && (
            // Evolução só existe com histórico (`progresso_anterior`): sem ele
            // nada é exibido e nenhum percentual é inventado. O indicador fica
            // ABAIXO do painel (os 8 px do `space-y-2`) e alinhado à borda
            // ESQUERDA dele — ele é irmão do painel nesta mesma coluna, à
            // direita do donut, e NÃO ocupa a largura do card inteiro.
            <IndicadorEvolucao variacao={evolucao} />
          )}
        </div>
      </div>

      {/* ── Região D: responsável + ação real ────────────────────────────── */}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/20 pt-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary ring-1 ring-inset ring-primary/20">
            {iniciais(responsavel)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[12px] font-medium leading-tight">{responsavel}</span>
            {departamento && (
              <span className="block truncate text-[10px] leading-tight text-muted-foreground">{departamento}</span>
            )}
          </span>
        </div>

        {podeAbrirCiclo && (
          <Button
            variant="outline"
            size="sm"
            className="group h-7 shrink-0 gap-1 rounded-lg border-border/60 bg-secondary/30 px-3 text-[11px] font-normal text-foreground/90 hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
            onClick={() => onAbrirCiclo?.(cicloId)}
          >
            Ver ciclo
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Button>
        )}
      </div>
    </MotionCard>
  );
}
