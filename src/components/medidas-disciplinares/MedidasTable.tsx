import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { Trash2, Users, FileText, CheckCircle2, XCircle, Eye, ExternalLink, AlertTriangle, FileDown, Loader2, MessageSquareWarning } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { safeHref } from '@/utils/safeUrl';

const tipoLabels: Record<string, string> = {
  advertencia_verbal: 'Adv. Verbal',
  advertencia_escrita: 'Adv. Escrita',
  suspensao: 'Suspensão',
  justa_causa: 'Justa Causa',
};

const gravidade: Record<string, 'secondary' | 'default' | 'destructive'> = {
  advertencia_verbal: 'secondary',
  advertencia_escrita: 'default',
  suspensao: 'destructive',
  justa_causa: 'destructive',
};

const artigosCLT: Record<string, string> = {
  art_482_a: 'Art. 482, a — Improbidade',
  art_482_b: 'Art. 482, b — Incontinência',
  art_482_c: 'Art. 482, c — Negociação habitual',
  art_482_d: 'Art. 482, d — Condenação criminal',
  art_482_e: 'Art. 482, e — Desídia',
  art_482_f: 'Art. 482, f — Embriaguez',
  art_482_g: 'Art. 482, g — Violação segredo',
  art_482_h: 'Art. 482, h — Indisciplina',
  art_482_i: 'Art. 482, i — Insubordinação',
  art_482_j: 'Art. 482, j — Abandono',
  art_482_k: 'Art. 482, k — Ato lesivo',
  outro: 'Outro',
};

interface MedidasTableProps {
  data: any[];
  onMarcarCiencia: (id: string) => void;
  onExcluir: (id: string) => void;
  onGerarPDF?: (id: string) => void;
  onAbrirContestacao?: (m: any) => void;
  gerandoPDFId?: string | null;
}

export function MedidasTable({ data, onMarcarCiencia, onExcluir, onGerarPDF, onAbrirContestacao, gerandoPDFId }: MedidasTableProps) {
  const formatDate = (d: string) => {
    try { return format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; }
  };

  return (
    <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
      <div className="h-[2px] bg-gradient-to-r from-destructive via-warning to-primary" />
      <CardContent className="pt-4 px-0">
        <TooltipProvider>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-display font-semibold text-xs pl-6">Nº</TableHead>
                  <TableHead className="font-display font-semibold text-xs">Colaborador</TableHead>
                  <TableHead className="font-display font-semibold text-xs">Tipo</TableHead>
                  <TableHead className="font-display font-semibold text-xs">Data</TableHead>
                  <TableHead className="font-display font-semibold text-xs">Base Legal</TableHead>
                  <TableHead className="font-display font-semibold text-xs">Testemunhas</TableHead>
                  <TableHead className="font-display font-semibold text-xs">Status</TableHead>
                  <TableHead className="font-display font-semibold text-xs">Descrição</TableHead>
                  <TableHead className="font-display font-semibold text-xs w-[80px] pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((m, i) => (
                  <motion.tr
                    key={m.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border/20 hover:bg-accent/20 transition-colors"
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground pl-6">
                      #{m.numero_sequencial || '—'}
                    </TableCell>
                    <TableCell className="font-body font-medium text-sm">
                      {m.colaborador?.nome_completo || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={gravidade[m.tipo] || 'secondary'} className="text-[10px]">
                        {tipoLabels[m.tipo] || m.tipo}
                      </Badge>
                      {m.tipo === 'suspensao' && m.dias_suspensao && (
                        <span className="ml-1 text-[10px] text-muted-foreground">{m.dias_suspensao}d</span>
                      )}
                    </TableCell>
                    <TableCell className="font-body text-xs">{formatDate(m.data_ocorrencia)}</TableCell>
                    <TableCell>
                      {m.artigo_clt ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs text-primary cursor-default underline decoration-dotted">
                              {m.artigo_clt.replace('art_482_', 'Art.482,')}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{artigosCLT[m.artigo_clt] || m.artigo_clt}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.testemunha_1_nome ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 cursor-default">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs">{[m.testemunha_1_nome, m.testemunha_2_nome].filter(Boolean).length}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            <div>{m.testemunha_1_nome}{m.testemunha_1_cpf && ` (${m.testemunha_1_cpf})`}</div>
                            {m.testemunha_2_nome && <div>{m.testemunha_2_nome}{m.testemunha_2_cpf && ` (${m.testemunha_2_cpf})`}</div>}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.colaborador_ciente ? (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Ciente
                        </Badge>
                      ) : m.recusa_assinatura ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="destructive" className="text-[10px] gap-1 cursor-default">
                              <XCircle className="h-2.5 w-2.5" /> Recusou
                            </Badge>
                          </TooltipTrigger>
                          {m.motivo_recusa && (
                            <TooltipContent className="max-w-[200px] text-xs">{m.motivo_recusa}</TooltipContent>
                          )}
                        </Tooltip>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] rounded-lg"
                          onClick={() => onMarcarCiencia(m.id)}
                        >
                          Registrar
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[160px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-xs truncate cursor-default font-body">{m.descricao}</p>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[300px] text-xs">{m.descricao}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex items-center gap-1">
                        {m.documento_url && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" asChild>
                                <a href={safeHref(m.documento_url)} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                </a>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver documento</TooltipContent>
                          </Tooltip>
                        )}
                        {onGerarPDF && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-lg"
                                onClick={() => onGerarPDF(m.id)}
                                disabled={gerandoPDFId === m.id}
                                aria-label="Gerar documento PDF"
                              >
                                {gerandoPDFId === m.id
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                  : <FileDown className="h-3.5 w-3.5 text-primary" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{m.pdf_url ? 'Regerar documento assinável' : 'Gerar documento assinável (PDF)'}</TooltipContent>
                          </Tooltip>
                        )}
                        {onAbrirContestacao && ['aplicada','contestada'].includes(m.status_workflow) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => onAbrirContestacao(m)} aria-label="Contestação">
                                <MessageSquareWarning className={`h-3.5 w-3.5 ${m.status_workflow === 'contestada' ? 'text-warning' : 'text-muted-foreground'}`} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{m.status_workflow === 'contestada' ? 'Contestação pendente de resposta' : 'Ver / contestar'}</TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => onExcluir(m.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Excluir registro</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
                {data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <AlertTriangle className="h-8 w-8 opacity-30" />
                        <p className="font-body text-sm">Nenhuma medida disciplinar encontrada</p>
                        <p className="text-xs">Utilize os filtros ou registre uma nova medida</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3 px-4">
            {data.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="p-3 rounded-xl border border-border/30 bg-card space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-body font-medium text-sm">{m.colaborador?.nome_completo || '—'}</span>
                  <Badge variant={gravidade[m.tipo] || 'secondary'} className="text-[10px]">
                    {tipoLabels[m.tipo] || m.tipo}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 font-body">{m.descricao}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{formatDate(m.data_ocorrencia)}</span>
                  <div className="flex items-center gap-2">
                    {m.colaborador_ciente ? (
                      <Badge variant="secondary" className="text-[10px]">Ciente</Badge>
                    ) : m.recusa_assinatura ? (
                      <Badge variant="destructive" className="text-[10px]">Recusou</Badge>
                    ) : (
                      <Button size="sm" variant="outline" className="h-6 text-[10px] rounded-lg" onClick={() => onMarcarCiencia(m.id)}>
                        Ciência
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => onExcluir(m.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
            {data.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm font-body">
                Nenhuma medida encontrada
              </div>
            )}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
