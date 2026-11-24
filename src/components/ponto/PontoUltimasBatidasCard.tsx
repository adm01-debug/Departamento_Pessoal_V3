/**
 * @fileoverview Card "Últimas Batidas" do Controle de Ponto (3ª linha, coluna direita).
 *
 * Leitura que o RH precisa para conferir o dia: quem bateu, que dia, que horas,
 * qual marcação, de onde veio e em que situação ela está — em tabela compacta,
 * com avatar de iniciais e linhas de ~26px (5 registros inicialmente; o resto
 * fica na ação "Ver todas").
 *
 * Origem e situação são DERIVADAS das colunas reais de `batidas_ponto`
 * (`origem`, `is_offline`/`offline`, `ajustado`, `dentro_raio`) — nenhum valor
 * é inventado; quando a coluna não existe na linha, o rótulo cai no padrão
 * honesto ("Web" / "Registrado").
 *
 * HOVER: a linha sob o cursor escurece para o tom mais escuro da paleta —
 * `--background` (o navy do fundo da página) a 80% —, não para o `--accent`
 * translúcido, que no tema escuro é MAIS CLARO que o card. A transição é a
 * padrão do sistema (`transition-colors` sem `duration-*` = 220 ms,
 * `--default-transition-duration`) e cobre a `<tr>` inteira, de colaborador a
 * status. Nada de borda, glow ou verde-lima; altura, posição dos textos e
 * espaçamento entre colunas não mudam. O cabeçalho fica de fora
 * (`hover:bg-transparent` na linha dele).
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { motion } from 'framer-motion';
import { ArrowRight, MapPin } from 'lucide-react';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { VERMELHO_SOLIDO } from './vermelhoVibrante';
import { ACAO_CARD_LIME } from './acoesCardsPonto';
import { cn } from '@/lib/utils';

/** Linha de `batidas_ponto` com o embed do colaborador (`listarPorData`). */
export interface BatidaResumo {
  id?: string;
  colaborador_id?: string | null;
  colaborador?: { nome_completo?: string | null } | null;
  data?: string | null;
  hora?: string | null;
  tipo?: string | null;
  origem?: string | null;
  ordem?: number | null;
  ajustado?: boolean | null;
  is_offline?: boolean | null;
  offline?: boolean | null;
  dentro_raio?: boolean | null;
}

interface PontoUltimasBatidasCardProps {
  batidas?: BatidaResumo[];
  /** Quantas linhas exibir (o card é um recorte, não o relatório). */
  limite?: number;
  /** Abre a tabela completa (aba de gestão). */
  onVerTodas?: () => void;
}

/** Rótulos com acentuação correta para os tipos gravados pela aplicação. */
const ROTULOS_TIPO: Record<string, string> = {
  entrada: 'Entrada',
  saida: 'Saída',
  saida_almoco: 'Saída almoço',
  retorno_almoco: 'Retorno almoço',
  entrada_2: 'Entrada 2',
  saida_2: 'Saída 2',
};

function rotuloTipo(tipo?: string | null): string {
  const chave = String(tipo ?? '')
    .trim()
    .toLowerCase();
  if (!chave) return '—';
  if (ROTULOS_TIPO[chave]) return ROTULOS_TIPO[chave];
  const texto = chave.replace(/_/g, ' ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function rotuloOrigem(batida: BatidaResumo): string {
  if (batida?.is_offline || batida?.offline) return 'Offline';
  const origem = String(batida?.origem ?? 'web')
    .trim()
    .toLowerCase();
  if (origem.includes('kiosk') || origem.includes('totem')) return 'Kiosk';
  if (origem.includes('mobile') || origem.includes('app')) return 'Mobile';
  if (origem.includes('afd') || origem.includes('import')) return 'AFD';
  if (origem === 'manual') return 'Manual';
  if (origem === 'web') return 'Web';
  return origem.charAt(0).toUpperCase() + origem.slice(1);
}

function situacaoDaBatida(batida: BatidaResumo): {
  rotulo: string;
  variante: NonNullable<BadgeProps['variant']>;
} {
  if (batida?.ajustado) return { rotulo: 'Ajustado', variante: 'info' };
  if (batida?.is_offline || batida?.offline) return { rotulo: 'Offline', variante: 'warning' };
  if (batida?.dentro_raio === false) return { rotulo: 'Fora do raio', variante: 'warning' };
  if (batida?.dentro_raio === true) return { rotulo: 'Validado', variante: 'success' };
  return { rotulo: 'Registrado', variante: 'outline' };
}

/**
 * Cor do ponto de situação na tabela compacta. Usa os mesmos tokens de
 * semântica das badges (`BadgeProps['variant']`) para não divergir do padrão.
 */
const COR_SITUACAO: Partial<Record<NonNullable<BadgeProps['variant']>, string>> = {
  info: 'bg-info',
  warning: 'bg-warning',
  success: 'bg-success',
  outline: 'bg-muted-foreground/60',
  default: 'bg-primary',
  secondary: 'bg-secondary-foreground/60',
  destructive: VERMELHO_SOLIDO,
};

function formatarData(iso?: string | null): string {
  if (!iso) return '--/--';
  return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/**
 * Iniciais do colaborador para o avatar do card. Sem foto disponível nesta
 * consulta (`batidas_ponto` traz só o nome), a inicial dupla é a identidade
 * visual — e o nome completo continua visível ao lado.
 */
function iniciais(nome?: string | null, alternativa?: string | null): string {
  const partes = String(nome ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 0)
    return (
      String(alternativa ?? '')
        .slice(0, 2)
        .toUpperCase() || '—'
    );
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

export function PontoUltimasBatidasCard({ batidas = [], limite = 5, onVerTodas }: PontoUltimasBatidasCardProps) {
  const linhas = batidas.slice(0, limite);

  return (
    <motion.div custom={11} variants={cardVariants} initial="hidden" animate="visible" className="h-full">
      <Card className="border border-border/40 shadow-xs rounded-xl overflow-hidden h-full flex flex-col">
        <CardContent className="p-3 pb-0 flex flex-1 flex-col gap-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-warning/15 text-warning">
              <MapPin className="h-3.5 w-3.5" />
            </span>
            <p className="min-w-0 flex-1 truncate font-display text-[13px] font-semibold leading-tight">
              Últimas Batidas
            </p>
            <Badge variant="outline" size="sm" className="shrink-0 font-body tabular-nums">
              {batidas.length}
            </Badge>
            {onVerTodas && (
              /* Ação secundária do card: rótulo e seta em lime (`ACAO_CARD_LIME`
                 — geometria/tipografia/posição e véu de hover preservados; o
                 `<ArrowRight>` herda o `currentColor` do botão). */
              <Button size="sm" variant="ghost" className={ACAO_CARD_LIME} onClick={onVerTodas}>
                Ver todas
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>

          {linhas.length > 0 ? (
            <div className="-mx-3 overflow-x-auto">
              <Table className="text-[11px]">
                <TableHeader>
                  <TableRow className="border-border/40 hover:bg-transparent">
                    <TableHead className="h-[1.35rem] px-3 text-[9px] font-body font-semibold uppercase tracking-wider text-muted-foreground">
                      Colaborador
                    </TableHead>
                    <TableHead className="h-[1.35rem] px-2 text-[9px] font-body font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                      Data
                    </TableHead>
                    <TableHead className="h-[1.35rem] px-2 text-[9px] font-body font-semibold uppercase tracking-wider text-muted-foreground">
                      Hora
                    </TableHead>
                    <TableHead className="h-[1.35rem] px-2 text-[9px] font-body font-semibold uppercase tracking-wider text-muted-foreground">
                      Tipo
                    </TableHead>
                    <TableHead className="h-[1.35rem] px-2 text-[9px] font-body font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                      Origem
                    </TableHead>
                    <TableHead className="h-[1.35rem] pl-2 pr-3 text-[9px] font-body font-semibold uppercase tracking-wider text-muted-foreground text-right">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhas.map((batida, indice) => {
                    const situacao = situacaoDaBatida(batida);
                    return (
                      <TableRow
                        key={batida.id ?? `${batida.colaborador_id ?? 'batida'}-${indice}`}
                        className="h-[1.9rem] border-border/30 hover:bg-background/80 transition-colors"
                      >
                        <TableCell className="px-3 py-0 align-middle">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span
                              aria-hidden="true"
                              className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-[8px] font-semibold text-primary"
                            >
                              {iniciais(batida.colaborador?.nome_completo, batida.colaborador_id)}
                            </span>
                            <span className="min-w-0 max-w-[160px] truncate font-body font-medium">
                              {batida.colaborador?.nome_completo || batida.colaborador_id?.slice(0, 8) || '—'}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="px-2 py-0 align-middle text-numeric whitespace-nowrap hidden md:table-cell">
                          {formatarData(batida.data)}
                        </TableCell>
                        <TableCell className="px-2 py-0 align-middle text-numeric whitespace-nowrap">
                          {batida.hora || '--:--'}
                        </TableCell>
                        <TableCell className="px-2 py-0 align-middle">
                          <Badge variant="outline" className="font-body text-[9px] px-1.5 py-0">
                            {rotuloTipo(batida.tipo)}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-2 py-0 align-middle font-body text-[10px] text-muted-foreground whitespace-nowrap hidden lg:table-cell">
                          {rotuloOrigem(batida)}
                        </TableCell>
                        <TableCell className="pl-2 pr-3 py-0 align-middle text-right">
                          {/* Ponto + rótulo: o ponto dá a leitura rápida da
                              situação e o texto mantém a informação acessível
                              (não depende só de cor). */}
                          <span className="inline-flex items-center gap-1 font-body text-[10px] whitespace-nowrap">
                            <span
                              className={cn(
                                'h-1.5 w-1.5 rounded-full shrink-0',
                                COR_SITUACAO[situacao.variante] ?? 'bg-muted-foreground/60'
                              )}
                            />
                            {situacao.rotulo}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-border/60 py-5">
              <p className="text-[11px] text-muted-foreground font-body">Nenhuma batida registrada hoje.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
