import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { Trash2, Stethoscope, AlertTriangle } from 'lucide-react';
import { format, parseISO, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const tipoLabels: Record<string, string> = {
  admissional: 'Admissional',
  periodico: 'Periódico',
  retorno_trabalho: 'Retorno ao Trabalho',
  mudanca_funcao: 'Mudança de Função',
  demissional: 'Demissional',
};

const resultadoBadge = (resultado: string | null) => {
  if (!resultado) return <Badge variant="outline" className="text-[10px]">Pendente</Badge>;
  if (resultado === 'apto') return <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20" variant="outline">Apto</Badge>;
  if (resultado === 'inapto') return <Badge variant="destructive" className="text-[10px]">Inapto</Badge>;
  return <Badge variant="secondary" className="text-[10px]">Apto c/ Restrição</Badge>;
};

interface ExameTableProps {
  data: any[];
  onExcluir: (id: string) => void;
}

export function ExameTable({ data, onExcluir }: ExameTableProps) {
  const now = new Date();

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    try { return format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; }
  };

  const isVencido = (d: string | null) => {
    if (!d) return false;
    try { return isBefore(parseISO(d), now); } catch { return false; }
  };

  return (
    <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
      <div className="h-[2px] bg-gradient-to-r from-primary via-accent to-primary/50" />
      <CardContent className="pt-4 px-0">
        <TooltipProvider>
          {/* Desktop */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-display font-semibold text-xs pl-6">Colaborador</TableHead>
                  <TableHead className="font-display font-semibold text-xs">Tipo</TableHead>
                  <TableHead className="font-display font-semibold text-xs">Data</TableHead>
                  <TableHead className="font-display font-semibold text-xs">Validade</TableHead>
                  <TableHead className="font-display font-semibold text-xs">Resultado</TableHead>
                  <TableHead className="font-display font-semibold text-xs">Médico</TableHead>
                  <TableHead className="font-display font-semibold text-xs w-[80px] pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r, i) => {
                  const vencido = isVencido(r.data_validade);
                  return (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className={`border-b border-border/20 hover:bg-accent/20 transition-colors ${vencido ? 'bg-destructive/5' : ''}`}
                    >
                      <TableCell className="font-body font-medium text-sm pl-6">
                        {r.colaborador?.nome_completo || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {tipoLabels[r.tipo] || r.tipo || '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-body">{formatDate(r.data_exame)}</TableCell>
                      <TableCell>
                        <span className={`text-xs font-body ${vencido ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                          {formatDate(r.data_validade)}
                          {vencido && ' ⚠️'}
                        </span>
                      </TableCell>
                      <TableCell>{resultadoBadge(r.resultado)}</TableCell>
                      <TableCell className="text-xs font-body">
                        {r.medico ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-default">{r.medico}</span>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              {r.crm ? `CRM: ${r.crm}` : 'CRM não informado'}
                            </TooltipContent>
                          </Tooltip>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="pr-6">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" aria-label="Excluir" className="h-7 w-7 rounded-lg" onClick={() => onExcluir(r.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Excluir exame</TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </motion.tr>
                  );
                })}
                {data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Stethoscope className="h-8 w-8 opacity-30" />
                        <p className="font-body text-sm">Nenhum exame registrado</p>
                        <p className="text-xs">Registre o primeiro exame ocupacional</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3 px-4">
            {data.map((r, i) => {
              const vencido = isVencido(r.data_validade);
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`p-3 rounded-xl border bg-card space-y-2 ${vencido ? 'border-destructive/30 bg-destructive/5' : 'border-border/30'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-body font-medium text-sm">{r.colaborador?.nome_completo || '—'}</span>
                    {resultadoBadge(r.resultado)}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">{tipoLabels[r.tipo] || r.tipo}</Badge>
                    <span>Data: {formatDate(r.data_exame)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {r.medico || '—'} {r.crm ? `(CRM: ${r.crm})` : ''}
                    </span>
                    <Button size="icon" variant="ghost" aria-label="Excluir" className="h-7 w-7" onClick={() => onExcluir(r.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
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
