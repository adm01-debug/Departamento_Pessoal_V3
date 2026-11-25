/**
 * ============================================================================
 * REGISTROS RECENTES — a tabela compacta do painel de Geofencing.
 *
 * Mesmo vocabulário visual do card "Últimas Batidas" (`PontoUltimasBatidasCard`):
 * avatar de iniciais, linha de ~30px, `hover:bg-background/80` (escurece para o
 * navy da página, nunca para o `accent` translúcido, que no escuro é mais claro
 * que o card) e transição de cor padrão do sistema.
 *
 * ENTRADA DAS LINHAS: `linhaTabelaVariants` de `ui/table-row-reveal.ts` — a
 * MESMA cascata da tabela de Candidatos (abre do centro com `scaleX` 0,94 → 1,
 * sobe 10px, 40 ms entre linhas). O `<tbody>` leva `key` que muda com o
 * período/filtro, para a onda tocar de novo quando a lista troca de identidade.
 *
 * "VER TODOS": abre a janela de lista completa reaproveitando `CascadeDialogFrame`
 * (a moldura de animação do popup de Pendências) com `CASCADE_SAIDA_RAPIDA`,
 * porque aqui o corpo é uma lista longa. O modal NÃO duplica cálculo nenhum:
 * recebe a mesma lista de pontos do card e só filtra por situação.
 * ============================================================================
 */
import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ListFilter, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CascadeDialogFrame } from '@/components/ui/cascade-dialog';
import { cascadeItemVariants, CASCADE_SAIDA_RAPIDA } from '@/components/ui/cascade-motion';
import { FilterChip } from '@/components/ui/filter-chip';
import { linhaTabelaVariants, linhaTabelaVariantsReduzido } from '@/components/ui/table-row-reveal';
import { ACAO_CARD_LIME } from '@/components/ponto/acoesCardsPonto';
import { cn } from '@/lib/utils';
import {
  formatarDistancia,
  iniciaisDoNome,
  registrosRecentes,
  rotuloDataCurta,
  type PontoGeografico,
} from '@/utils/pontoGeofencing';

/** Filtro de situação da janela "todos os registros". */
type FiltroSituacao = 'todas' | 'dentro' | 'fora';

export interface PontoGeoRegistrosProps {
  pontos: PontoGeografico[];
  /** Rótulo do período selecionado ("Últimos 7 dias", "Hoje"…). */
  rotuloPeriodo: string;
  /** Chave que reinicia a cascata das linhas quando período/filtro mudam. */
  chave: string;
  /** Movimento reduzido (`useMovimentoReduzido`). */
  reduzido: boolean;
  /** Quantas linhas no card (o resto fica em "Ver todos"). */
  limite?: number;
  className?: string;
}

/** Célula de colaborador: iniciais + nome + data, como no card de batidas. */
function ColaboradorRegistro({ ponto }: { ponto: PontoGeografico }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden="true"
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-[9px] font-semibold text-primary"
      >
        {iniciaisDoNome(ponto.colaboradorNome)}
      </span>
      <span className="min-w-0">
        <span
          className="block truncate text-[11px] font-medium leading-tight text-foreground"
          title={ponto.colaboradorNome}
        >
          {ponto.colaboradorNome}
        </span>
        <span className="block text-[9px] leading-tight text-muted-foreground">{rotuloDataCurta(ponto.data)}</span>
      </span>
    </span>
  );
}

/** Badge de situação — as cores semânticas do sistema. */
function SituacaoRegistro({ dentro }: { dentro: boolean }) {
  return (
    <Badge
      variant={dentro ? 'success' : 'destructive'}
      size="sm"
      className="gap-1 whitespace-nowrap px-1.5 py-0 text-[9px]"
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dentro ? 'bg-success' : 'bg-destructive-vivid')} aria-hidden />
      {dentro ? 'Dentro do raio' : 'Fora do raio'}
    </Badge>
  );
}

export function PontoGeoRegistros({
  pontos,
  rotuloPeriodo,
  chave,
  reduzido,
  limite = 5,
  className,
}: PontoGeoRegistrosProps) {
  const [aberto, setAberto] = useState(false);
  const [filtro, setFiltro] = useState<FiltroSituacao>('todas');
  const gatilhoRef = useRef<HTMLButtonElement | null>(null);

  const todos = useMemo(() => registrosRecentes(pontos), [pontos]);
  const recentes = useMemo(() => todos.slice(0, Math.max(0, limite)), [todos, limite]);
  const dentro = todos.filter((ponto) => ponto.dentroRaio).length;
  const fora = todos.length - dentro;
  const filtrados = useMemo(
    () =>
      filtro === 'todas'
        ? todos
        : todos.filter((ponto) => (filtro === 'dentro' ? ponto.dentroRaio : !ponto.dentroRaio)),
    [todos, filtro]
  );

  const variantes = reduzido ? linhaTabelaVariantsReduzido : linhaTabelaVariants;

  return (
    <Card className={cn('flex flex-col overflow-hidden rounded-2xl border border-border/40 shadow-xs', className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 border-b border-border/40 bg-muted/30 px-4 py-2.5">
        <CardTitle className="flex min-w-0 items-center gap-2 text-sm font-display">
          <ListFilter className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">Registros Recentes</span>
        </CardTitle>
        <Button
          ref={gatilhoRef}
          variant="ghost"
          size="sm"
          className={ACAO_CARD_LIME}
          onClick={() => setAberto(true)}
          disabled={todos.length === 0}
        >
          Ver todos
          <ArrowRight className="h-3 w-3" />
        </Button>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 p-0">
        {recentes.length === 0 ? (
          <div className="flex h-full min-h-[120px] items-center justify-center px-4">
            <p className="text-[11px] text-muted-foreground">Nenhum registro no período selecionado.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-7 px-3 text-[9px] uppercase tracking-wide text-muted-foreground">
                  Colaborador
                </TableHead>
                <TableHead className="h-7 px-2 text-[9px] uppercase tracking-wide text-muted-foreground">
                  Horário
                </TableHead>
                <TableHead className="h-7 px-2 text-[9px] uppercase tracking-wide text-muted-foreground">
                  Distância
                </TableHead>
                <TableHead className="h-7 pl-2 pr-3 text-right text-[9px] uppercase tracking-wide text-muted-foreground">
                  Situação
                </TableHead>
              </TableRow>
            </TableHeader>
            <AnimatePresence>
              <TableBody key={`${chave}-${filtro}`}>
                {recentes.map((ponto, indice) => (
                  <motion.tr
                    key={ponto.id}
                    custom={indice}
                    variants={variantes}
                    initial="hidden"
                    animate="visible"
                    className="origin-center border-b border-border/30 transition-colors last:border-0 hover:bg-background/80"
                  >
                    <TableCell className="px-3 py-1.5 align-middle">
                      <ColaboradorRegistro ponto={ponto} />
                    </TableCell>
                    <TableCell className="px-2 py-1.5 align-middle text-[11px] tabular-nums text-muted-foreground">
                      {ponto.hora ?? '--:--'}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 align-middle">
                      <span className="inline-flex items-center gap-1 text-[11px] tabular-nums text-foreground">
                        <MapPin className="h-3 w-3 shrink-0 text-primary" />
                        {formatarDistancia(ponto.distanciaMetros)}
                      </span>
                    </TableCell>
                    <TableCell className="pl-2 pr-3 py-1.5 align-middle text-right">
                      <SituacaoRegistro dentro={ponto.dentroRaio} />
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </AnimatePresence>
          </Table>
        )}
      </CardContent>

      <CascadeDialogFrame
        open={aberto}
        onOpenChange={setAberto}
        blocks={3}
        perfilSaida={CASCADE_SAIDA_RAPIDA}
        className="max-w-[720px]"
        contentClassName="flex max-h-[80vh] flex-col gap-3 p-5"
        onCloseAutoFocus={(evento) => {
          evento.preventDefault();
          gatilhoRef.current?.focus();
        }}
      >
        <motion.div variants={cascadeItemVariants}>
          <DialogHeader>
            <DialogTitle className="text-base font-display">Registros do período</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {rotuloPeriodo} · {todos.length}{' '}
              {todos.length === 1 ? 'registro geolocalizado' : 'registros geolocalizados'}
            </DialogDescription>
          </DialogHeader>
        </motion.div>

        <motion.div variants={cascadeItemVariants} className="flex flex-wrap items-center gap-1.5">
          <FilterChip
            variante="compacto"
            className="flex-none"
            label="Todas"
            total={todos.length}
            ativo={filtro === 'todas'}
            onClick={() => setFiltro('todas')}
          />
          <FilterChip
            variante="compacto"
            className="flex-none"
            label="Dentro do raio"
            total={dentro}
            ativo={filtro === 'dentro'}
            tom="primary"
            ponto="bg-success"
            onClick={() => setFiltro('dentro')}
          />
          <FilterChip
            variante="compacto"
            className="flex-none"
            label="Fora do raio"
            total={fora}
            ativo={filtro === 'fora'}
            tom="destructive"
            ponto="bg-destructive-vivid"
            onClick={() => setFiltro('fora')}
          />
        </motion.div>

        <motion.div
          variants={cascadeItemVariants}
          className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border/50"
        >
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-8 px-3 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Colaborador
                </TableHead>
                <TableHead className="h-8 px-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Data
                </TableHead>
                <TableHead className="h-8 px-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Horário
                </TableHead>
                <TableHead className="h-8 px-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Distância
                </TableHead>
                <TableHead className="h-8 pl-2 pr-3 text-right text-[10px] uppercase tracking-wide text-muted-foreground">
                  Situação
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((ponto) => (
                <TableRow
                  key={`modal-${ponto.id}`}
                  className="border-border/30 transition-colors hover:bg-background/80"
                >
                  <TableCell className="px-3 py-1.5 align-middle">
                    <ColaboradorRegistro ponto={ponto} />
                  </TableCell>
                  <TableCell className="px-2 py-1.5 align-middle text-[11px] tabular-nums text-muted-foreground">
                    {rotuloDataCurta(ponto.data)}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 align-middle text-[11px] tabular-nums text-muted-foreground">
                    {ponto.hora ?? '--:--'}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 align-middle text-[11px] tabular-nums text-foreground">
                    {formatarDistancia(ponto.distanciaMetros)}
                  </TableCell>
                  <TableCell className="pl-2 pr-3 py-1.5 align-middle text-right">
                    <SituacaoRegistro dentro={ponto.dentroRaio} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtrados.length === 0 && (
            <p className="px-4 py-6 text-center text-[11px] text-muted-foreground">
              Nenhum registro com esta situação no período.
            </p>
          )}
        </motion.div>
      </CascadeDialogFrame>
    </Card>
  );
}
