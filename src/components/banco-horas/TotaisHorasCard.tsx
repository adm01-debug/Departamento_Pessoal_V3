/**
 * ============================================================================
 * CARD "TOTAIS DE HORAS" — créditos × débitos do recorte, na MESMA escala.
 *
 *   ┌────────────────────────────────────────────┐
 *   │ (ícone) Totais de horas                    │
 *   │         Créditos e débitos do período      │
 *   ├────────────────────────────────────────────┤
 *   │ ● Créditos   5 lanç.              40h00    │
 *   │ ████████████████████████████████           │
 *   │ ● Débitos    5 lanç.              27h30    │
 *   │ ██████████████████████                     │
 *   │ ─────────────────────────────────────────  │
 *   │ Saldo do período                 +12h30    │
 *   └────────────────────────────────────────────┘
 *
 * ── A ESCALA É COMPARTILHADA (o ponto do card) ──────────────────────────────
 * Os comprimentos vêm de `barrasDeTotais`, que normaliza pelo MAIOR dos dois
 * valores. Escalas independentes (cada barra cheia no próprio total) fariam 2h
 * de débito parecerem maiores que 40h de crédito — mentira visual. Sem
 * movimento no recorte, as duas ficam em zero (nada de barra cheia decorativa).
 *
 * ── COR E ESPESSURA DAS BARRAS ─────────────────────────────────────────────
 * Trilho `bg-secondary/60` e preenchimento em degradê HORIZONTAL: crédito
 * `--success` → `--primary` (verde success → verde lime) e débito
 * `--destructive` → `--warning` (vermelho danger → âmbar warning). A espessura
 * é `h-2` (10 px na base de 20 px do sistema), a mesma das barras de Admissões
 * e de Desempenho — nos 5 px anteriores o degradê não tinha área para existir.
 * Os pontos de legenda e os textos continuam nas cores semânticas de antes.
 *
 * ── MOVIMENTO ───────────────────────────────────────────────────────────────
 * `propsPreenchimentoBarraCascata` (`ui/progressMotion.ts`) é a régua do
 * sistema: 1,2 s por barra, 0,15 s de atraso inicial e 0,1 s entre elas — a
 * coreografia aprovada do card "Amplitude de Liderança". Com movimento reduzido
 * as barras nascem no comprimento final (`initial: false`).
 * ============================================================================
 */
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { propsPreenchimentoBarraCascata } from '@/components/ui/progressMotion';
import { useMovimentoReduzido } from '@/lib/motionMode';
import { cn } from '@/lib/utils';
import { barrasDeTotais, formatarHorasBanco, type ResumoHoras } from './bancoHorasComum';
import { CartaoSecaoBancoHoras } from './CartaoSecaoBancoHoras';

export interface TotaisHorasCardProps {
  resumo: ResumoHoras;
  /** Existe período selecionado? (muda o subtítulo e a nota de rodapé) */
  periodoAtivo: boolean;
  /** Posição na BANDA DE CONTEÚDO da fila única de entrada. */
  index?: number;
}

/**
 * Cor do PONTO de legenda e do PREENCHIMENTO da barra de cada movimento.
 *
 * O ponto continua SÓLIDO e semântico (`bg-success` / `bg-destructive`) — é ele
 * que casa com o texto e com o selo de tipo da tabela. Quem ganhou degradê foi
 * o preenchimento, com os tokens do sistema e os mesmos pares já usados em
 * `AdmissoesDashboard` (funil), `FeriasResumoTab` e nas barras de
 * `avaliacao/TodosCiclosTable`:
 *
 *   crédito  `--success` → `--primary`    (verde success → verde lime)
 *   débito   `--destructive` → `--warning` (vermelho danger → âmbar warning)
 *
 * O degradê é HORIZONTAL (`to-r`) e mora no preenchimento, não no trilho: ele
 * acompanha a largura real da barra, então o "fim" do degradê é sempre a ponta
 * do valor — não uma cor solta no meio do nada.
 */
const CORES_BARRA: Record<string, { ponto: string; barra: string }> = {
  credito: { ponto: 'bg-success', barra: 'bg-gradient-to-r from-success to-primary' },
  debito: { ponto: 'bg-destructive', barra: 'bg-gradient-to-r from-destructive to-warning' },
};

function pluralLancamentos(quantidade: number): string {
  return quantidade === 1 ? '1 lançamento' : `${quantidade} lançamentos`;
}

export function TotaisHorasCard({ resumo, periodoAtivo, index = 0 }: TotaisHorasCardProps) {
  const movimentoReduzido = useMovimentoReduzido();
  const barras = barrasDeTotais(resumo);
  const semMovimento = resumo.registros === 0;

  return (
    <CartaoSecaoBancoHoras
      id="banco-horas-totais"
      icone={Clock}
      tom="bg-success/15 text-success"
      titulo="Totais de horas"
      subtitulo={periodoAtivo ? 'Créditos e débitos do período' : 'Créditos e débitos da base'}
      index={index}
      /*
        SEM ACESSÓRIO — a contagem de lançamentos já aparece em cada barra
        ("15 lançamentos" + "9 lançamentos" = o total do recorte). O contador no
        cabeçalho repetia o número e cortava o título do card.
      */
    >
      {semMovimento ? (
        <p className="py-[6px] text-[11px] leading-snug text-muted-foreground">
          Nenhum lançamento no recorte selecionado.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-[6px]">
            {barras.map((barra, indice) => (
              <div key={barra.chave}>
                <div className="mb-[4px] flex items-baseline justify-between gap-[8px]">
                  <div className="flex min-w-0 items-baseline gap-[6px]">
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', CORES_BARRA[barra.chave].ponto)} aria-hidden />
                    <span className="text-[11px] font-medium leading-tight text-foreground">{barra.rotulo}</span>
                    <span className="truncate text-[10px] leading-tight text-muted-foreground">
                      {pluralLancamentos(barra.lancamentos)}
                    </span>
                  </div>
                  <span className="shrink-0 text-[12px] font-semibold leading-none tabular-nums text-foreground">
                    {formatarHorasBanco(barra.horas)}
                  </span>
                </div>
                {/* Trilho + preenchimento: o preenchimento cresce da esquerda
                    para a direita no percentual da escala COMPARTILHADA.
                    `h-2` (10 px na base de 20 px) é a espessura das barras do
                    sistema — a mesma do funil de Admissões e dos ciclos de
                    Desempenho. Antes eram 5 px, finas a ponto de o degradê não
                    ser lido. Trilho escuro e `rounded-full` preservados. */}
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-secondary/60"
                  role="img"
                  aria-label={`${barra.rotulo}: ${formatarHorasBanco(barra.horas)}`}
                >
                  <motion.div
                    className={cn('h-full rounded-full', CORES_BARRA[barra.chave].barra)}
                    {...propsPreenchimentoBarraCascata(barra.percentual, indice, {
                      reduzir: movimentoReduzido,
                    })}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-[7px] flex items-center justify-between gap-[10px] border-t border-border/40 pt-[6px]">
            <p className="text-[11px] text-muted-foreground">Saldo do período</p>
            <p
              className={cn(
                'text-[13px] font-semibold tabular-nums',
                resumo.saldo < 0 ? 'text-destructive' : 'text-foreground'
              )}
              title="Créditos menos débitos no recorte selecionado"
            >
              {formatarHorasBanco(resumo.saldo)}
            </p>
          </div>
        </>
      )}
    </CartaoSecaoBancoHoras>
  );
}
