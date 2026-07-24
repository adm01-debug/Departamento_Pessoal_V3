import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { Package, RotateCcw, AlertTriangle } from 'lucide-react';
import { format, parseISO, addMonths, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EpiEntregasTableProps {
  data: any[];
  onDevolver?: (id: string) => void;
}

export function EpiEntregasTable({ data, onDevolver }: EpiEntregasTableProps) {
  const formatDate = (d: string) => {
    try { return format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; }
  };

  const getVencimento = (entrega: any) => {
    if (!entrega.data_entrega || !entrega.epi?.validade_meses) return null;
    try {
      return addMonths(parseISO(entrega.data_entrega), entrega.epi.validade_meses);
    } catch { return null; }
  };

  return (
    <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
      <div className="h-[2px] bg-gradient-to-r from-accent via-primary to-accent/50" />
      <CardContent className="pt-4 px-0">
        <TooltipProvider>
          {/* Desktop */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-display font-semibold text-xs pl-6">EPI</TableHead>
                  <TableHead className="font-display font-semibold text-xs">CA</TableHead>
                  <TableHead className="font-display font-semibold text-xs">Colaborador</TableHead>
                  <TableHead className="font-display font-semibold text-xs">Entrega</TableHead>
                  <TableHead className="font-display font-semibold text-xs">Vencimento</TableHead>
                  <TableHead className="font-display font-semibold text-xs">Qtd</TableHead>
                  <TableHead className="font-display font-semibold text-xs">Status</TableHead>
                  {onDevolver && <TableHead className="font-display font-semibold text-xs w-[80px] pr-6">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((e, i) => {
                  const vencimento = getVencimento(e);
                  const isVencido = vencimento && isBefore(vencimento, new Date());
                  const isProximo = vencimento && !isVencido && isBefore(vencimento, addMonths(new Date(), 1));
                  const isDevolvido = !!e.data_devolucao;

                  return (
                    <motion.tr
                      key={e.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className={`border-b border-border/20 hover:bg-accent/20 transition-colors ${isVencido ? 'bg-destructive/5' : ''}`}
                    >
                      <TableCell className="font-body font-medium text-sm pl-6">
                        {e.epi?.nome || '—'}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {e.epi?.ca || '—'}
                      </TableCell>
                      <TableCell className="font-body text-sm">
                        {e.colaborador?.nome_completo || '—'}
                      </TableCell>
                      <TableCell className="text-xs font-body">{formatDate(e.data_entrega)}</TableCell>
                      <TableCell>
                        {vencimento ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className={`text-xs font-body ${isVencido ? 'text-destructive font-medium' : isProximo ? 'text-warning font-medium' : 'text-muted-foreground'}`}>
                                {format(vencimento, 'dd/MM/yyyy')}
                                {isVencido && ' ⚠️'}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              {isVencido ? 'EPI vencido — substituir imediatamente' : isProximo ? 'Vencimento próximo — agendar substituição' : 'Dentro do prazo de validade'}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-body">{e.quantidade}</TableCell>
                      <TableCell>
                        {isDevolvido ? (
                          <Badge variant="secondary" className="text-[10px]">Devolvido</Badge>
                        ) : isVencido ? (
                          <Badge variant="destructive" className="text-[10px]">Vencido</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Em uso</Badge>
                        )}
                      </TableCell>
                      {onDevolver && (
                        <TableCell className="pr-6">
                          {!isDevolvido && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" aria-label="Registrar devolução" className="h-7 w-7 rounded-lg" onClick={() => onDevolver(e.id)}>
                                  <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Registrar devolução</TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                      )}
                    </motion.tr>
                  );
                })}
                {data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={onDevolver ? 8 : 7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Package className="h-8 w-8 opacity-30" />
                        <p className="font-body text-sm">Nenhuma entrega registrada</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3 px-4">
            {data.map((e, i) => {
              const vencimento = getVencimento(e);
              const isVencido = vencimento && isBefore(vencimento, new Date());
              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`p-3 rounded-xl border bg-card space-y-2 ${isVencido ? 'border-destructive/30 bg-destructive/5' : 'border-border/30'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-body font-medium text-sm">{e.epi?.nome || '—'}</span>
                    {isVencido ? (
                      <Badge variant="destructive" className="text-[10px]">Vencido</Badge>
                    ) : e.data_devolucao ? (
                      <Badge variant="secondary" className="text-[10px]">Devolvido</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Em uso</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{e.colaborador?.nome_completo}</p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Entrega: {formatDate(e.data_entrega)}</span>
                    <span>Qtd: {e.quantidade}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
