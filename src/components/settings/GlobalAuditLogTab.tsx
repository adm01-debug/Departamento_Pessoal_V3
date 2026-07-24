import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ScrollText, Search, Download, Calendar, User, Tag, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { exportPontoCSV } from '@/services/exportService';
import { maskEmail } from '@/utils/piiMask';

export function GlobalAuditLogTab() {
  const [search, setSearch] = useState('');
  const [tabelaFilter, setTabelaFilter] = useState('todas');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['global-audit-logs', tabelaFilter],
    queryFn: async () => {
      let query = (supabase as any).from('audit_log').select('*').order('created_at', { ascending: false }).limit(200);
      if (tabelaFilter !== 'todas') {
        query = query.eq('tabela', tabelaFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  const filtered = logs.filter((l: any) => 
    !search || 
    l.tabela?.toLowerCase().includes(search.toLowerCase()) ||
    l.user_email?.toLowerCase().includes(search.toLowerCase()) ||
    l.acao?.toLowerCase().includes(search.toLowerCase()) ||
    JSON.stringify(l.dados_novos || {}).toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = () => {
    const data = filtered.map((l: any) => ({
      data: format(new Date(l.created_at), 'dd/MM/yyyy HH:mm:ss'),
      usuario: l.user_email || 'Sistema',
      acao: l.acao,
      tabela: l.tabela,
      id_registro: l.registro_id,
      dados: JSON.stringify(l.dados_novos)
    }));
    exportPontoCSV(data, 'auditoria-global-dp.csv');
  };

  const getTabelas = () => {
    const set = new Set(logs.map((l: any) => l.tabela));
    return Array.from(set);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
        <div className="h-[2px] bg-gradient-to-r from-primary to-primary-glow" />
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="font-display flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-primary" /> Central de Auditoria & Compliance
              </CardTitle>
              <CardDescription className="font-body">Trilha completa de alterações e execuções em todo o sistema</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-xl gap-2 h-9" onClick={handleExport}>
                <Download className="h-4 w-4" /> Exportar CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por usuário, ação ou dados..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 rounded-xl border-border/30"
              />
            </div>
            <div className="flex items-center gap-2 bg-muted/30 px-3 py-1 rounded-xl border border-border/30">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select 
                value={tabelaFilter}
                onChange={(e) => setTabelaFilter(e.target.value)}
                className="bg-transparent border-none text-xs font-body focus:ring-0 outline-hidden"
              >
                <option value="todas">Todas as Entidades</option>
                {getTabelas().map((t: any) => (
                  <option key={String(t)} value={String(t)}>{String(t)}</option>
                ))}

              </select>
            </div>
          </div>

          <div className="rounded-xl border border-border/30 overflow-hidden bg-card">
            {isLoading ? (
              <div className="p-12 flex justify-center"><Spinner size="lg" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-display font-semibold">Data/Hora</TableHead>
                    <TableHead className="font-display font-semibold">Usuário</TableHead>
                    <TableHead className="font-display font-semibold">Ação</TableHead>
                    <TableHead className="font-display font-semibold">Entidade</TableHead>
                    <TableHead className="font-display font-semibold">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((log: any) => (
                    <TableRow key={log.id} className="hover:bg-accent/30 transition-colors group">
                      <TableCell className="font-mono text-[10px] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(log.created_at), 'dd/MM HH:mm:ss')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-3 w-3 text-primary" />
                          </div>
                          <span className="text-xs font-medium truncate max-w-[150px]">{log.user_email ? maskEmail(log.user_email) : 'Sistema'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[9px] uppercase font-bold tracking-tight ${
                          log.acao === 'DELETE' ? 'border-destructive/30 text-destructive bg-destructive/5' :
                          log.acao === 'EXECUTE_CALC' ? 'border-primary/30 text-primary bg-primary/5' :
                          'border-info/30 text-info bg-info/5'
                        }`}>
                          {log.acao}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Tag className="h-2.5 w-2.5" />
                          {log.tabela}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-[10px] text-muted-foreground max-w-[250px] truncate group-hover:whitespace-normal group-hover:overflow-visible group-hover:max-w-none transition-all">
                          {log.dados_novos ? JSON.stringify(log.dados_novos) : '-'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground font-body">
                        Nenhum registro encontrado para os filtros aplicados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex items-start gap-3">
        <ShieldText className="h-5 w-5 text-primary shrink-0" />
        <div className="space-y-1">
          <p className="text-xs font-bold text-primary">Conformidade LGPD & REP-P</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Esta trilha de auditoria é imutável e registra todas as operações sensíveis do sistema. 
            Em caso de fiscalização, os dados aqui apresentados servem como prova de integridade dos processos de Folha e Ponto.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function ShieldText({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}
