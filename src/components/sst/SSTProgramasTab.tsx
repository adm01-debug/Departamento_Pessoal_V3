import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, AlertTriangle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts';
import { safeHref } from '@/utils/safeUrl';

export function SSTProgramasTab() {
  const { empresaAtual } = useEmpresa();
  
  const { data: programas = [], isLoading } = useQuery({
    queryKey: ['sst_programas', empresaAtual?.id],
    enabled: !!empresaAtual?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sst_programas')
        .select('*')
        .eq('empresa_id', empresaAtual!.id)
        .order('data_validade', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  const getSigla = (tipo: string) => {
    switch (tipo) {
      case 'PGR': return 'PGR';
      case 'PCMSO': return 'PCMSO';
      case 'LTCAT': return 'LTCAT';
      case 'PPP': return 'PPP';
      default: return tipo;
    }
  };

  const getNR = (tipo: string) => {
    switch (tipo) {
      case 'PGR': return 'NR-1/9';
      case 'PCMSO': return 'NR-7';
      case 'LTCAT': return 'NR-15';
      default: return 'NR-SST';
    }
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : programas.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground font-body">Nenhum programa ou laudo cadastrado.</div>
        ) : programas.map((prog: any, i: number) => (
          <motion.div key={prog.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className="border-border/30 rounded-2xl hover:shadow-elevated transition-all overflow-hidden">
              <div className="h-[2px] bg-gradient-to-r from-success to-info" />
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-success to-info">
                    <FileText className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-display font-bold text-sm">{getSigla(prog.tipo)}</p>
                      <Badge variant="outline" className="text-[10px] font-body">{getNR(prog.tipo)}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-body truncate">{prog.titulo}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-body"><span className="text-muted-foreground">Vencimento:</span><span className="font-medium">{new Date(prog.data_validade).toLocaleDateString('pt-BR')}</span></div>
                  <div className="flex justify-between text-[10px] font-body"><span className="text-muted-foreground">Responsável:</span><span className="font-medium truncate max-w-[120px]">{prog.responsavel_tecnico || 'N/A'}</span></div>
                  <div className="flex justify-between text-[10px] font-body"><span className="text-muted-foreground">Status:</span><Badge className={cn("border-0 text-[9px]", new Date(prog.data_validade) < new Date() ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success")}>{new Date(prog.data_validade) < new Date() ? 'Vencido' : 'Vigente'}</Badge></div>
                </div>
                <div className="mt-3 pt-3 border-t border-border/20 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 text-[10px] h-7 rounded-lg font-body" onClick={() => prog.arquivo_url && window.open(safeHref(prog.arquivo_url), '_blank', 'noopener')}>Visualizar</Button>
                  <Button size="sm" variant="outline" className="flex-1 text-[10px] h-7 rounded-lg font-body">Renovar</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Risk Matrix */}
      <Card className="rounded-2xl border-border/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />Matriz de Risco (Probabilidade × Severidade)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-body">
              <thead>
                <tr>
                  <th className="p-2 text-left text-muted-foreground">Prob. \ Sev.</th>
                  {['Insignificante', 'Menor', 'Moderada', 'Maior', 'Catastrófica'].map(s => (
                    <th key={s} className="p-2 text-center text-muted-foreground">{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {['Muito Alta', 'Alta', 'Média', 'Baixa', 'Muito Baixa'].map((prob, pi) => (
                  <tr key={prob}>
                    <td className="p-2 font-medium">{prob}</td>
                    {[5, 4, 3, 2, 1].map((sev, si) => {
                      const score = (5 - pi) * sev;
                      const bg = score >= 20 ? 'bg-destructive/20 text-destructive' : score >= 12 ? 'bg-warning/20 text-warning' : score >= 6 ? 'bg-info/20 text-info' : 'bg-success/20 text-success';
                      return <td key={si} className="p-1 text-center"><div className={cn("rounded-lg p-1.5 font-semibold", bg)}>{score}</div></td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-4 mt-3 text-[10px] font-body">
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-destructive/20" />Intolerável (≥20)</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-warning/20" />Substancial (12-19)</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-info/20" />Moderado (6-11)</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-success/20" />Trivial (1-5)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
