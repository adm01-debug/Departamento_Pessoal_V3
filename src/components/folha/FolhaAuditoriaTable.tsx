import React from 'react';
import { useFolhaAuditoria } from '@/hooks/useFolhaAuditoria';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertCircle, Info, AlertTriangle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface FolhaAuditoriaTableProps {
  folhaId: string;
}

const severidadeIcons = {
  INFO: <Info className="h-4 w-4 text-blue-500" />,
  AVISO: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  ERRO: <AlertCircle className="h-4 w-4 text-red-500" />,
  CRITICO: <AlertCircle className="h-4 w-4 text-red-700" />};

const severidadeVariants = {
  INFO: 'secondary',
  AVISO: 'warning',
  ERRO: 'destructive',
  CRITICO: 'destructive'} as const;

export function FolhaAuditoriaTable({ folhaId }: FolhaAuditoriaTableProps) {
  const { logs, isLoading } = useFolhaAuditoria(folhaId);
  const [filter, setFilter] = React.useState('');

  const filteredLogs = React.useMemo(() => {
    if (!filter) return logs;
    const q = filter.toLowerCase();
    return logs.filter(log => 
      log.mensagem.toLowerCase().includes(q) || 
      log.colaborador?.nome_completo.toLowerCase().includes(q) ||
      log.tipo_evento.toLowerCase().includes(q)
    );
  }, [logs, filter]);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground font-body">Carregando logs de auditoria...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filtrar eventos, mensagens ou colaboradores..."
          className="pl-9 rounded-xl"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="rounded-xl border border-border/30 overflow-hidden bg-card">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[150px]">Data/Hora</TableHead>
                <TableHead className="w-[100px]">Severidade</TableHead>
                <TableHead className="w-[120px]">Evento</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead>Colaborador</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground font-body">
                    Nenhum registro de auditoria encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {severidadeIcons[log.severidade]}
                        <Badge variant={severidadeVariants[log.severidade] as any} className="text-[10px] px-1.5 py-0">
                          {log.severidade}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium uppercase tracking-wider">{log.tipo_evento}</span>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm font-body line-clamp-2" title={log.mensagem}>{log.mensagem}</p>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {log.colaborador?.nome_completo || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
      
      <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
        <span>Total de registros: {filteredLogs.length}</span>
        <div className="flex gap-4">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" /> Erros
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-500" /> Avisos
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" /> Info
          </div>
        </div>
      </div>
    </div>
  );
}
