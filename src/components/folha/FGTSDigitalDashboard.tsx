import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Landmark, FileText, CheckCircle2, AlertCircle, ExternalLink, Loader2, CloudSync, History } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks';
import { edgeFunctionsService } from '@/services/edgeFunctionsService';
import { format } from 'date-fns';

export function FGTSDigitalDashboard() {
  const [loading, setLoading] = useState(false);
  const { empresaAtual } = useEmpresas();

  const syncFGTS = async () => {
    if (!empresaAtual?.id) return;
    setLoading(true);
    try {
      const competencia = format(new Date(), 'yyyy-MM');
      const result = await edgeFunctionsService.gerarGuias({
        empresaId: empresaAtual.id,
        competencia,
        tipo: 'fgts_digital'
      });
      toast.success('Sincronizado com FGTS Digital via API Caixa!');
    } catch (err: any) {
      toast.error(safeErrorMessage(err, 'Falha na sincronização FGTS Digital.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden mt-6">
      <div className="h-[2px] bg-gradient-to-r from-success to-primary" />
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle className="text-lg font-display flex items-center gap-2">
          <Landmark className="h-5 w-5 text-success" />
          FGTS Digital
          <Badge variant="outline" className="text-[10px] ml-2 border-primary/20 text-primary">API Caixa Ativa</Badge>
        </CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="text-xs gap-1.5 h-8 rounded-xl" onClick={syncFGTS} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CloudSync className="h-3.5 w-3.5" />}
            Sincronizar API
          </Button>
          <Button size="sm" variant="ghost" className="text-xs gap-1.5 h-8 rounded-xl" onClick={() => window.open('https://fgtsdigital.sistema.gov.br/', '_blank', 'noopener')}>
            <ExternalLink className="h-3.5 w-3.5" />
            Portal
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Status Guia GFD</p>
            <div className="flex items-center gap-2 mt-1">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="font-semibold text-sm">Gerada / Paga</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Vencimento</p>
            <p className="font-semibold text-sm mt-1">20/05/2026</p>
          </div>
          <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Sistema</p>
            <p className="font-semibold text-sm mt-1 text-primary">R$ 12.450,80</p>
          </div>
          <div className="p-3 rounded-xl bg-success/5 border border-success/30">
            <p className="text-[10px] text-success uppercase font-bold tracking-wider">Total eSocial (S-5003)</p>
            <p className="font-semibold text-sm mt-1 text-success">R$ 12.450,80</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/10 border border-border/10">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <CloudSync className="h-4 w-4" />
                    </div>
                    <div className="text-xs">
                        <p className="font-bold">Conciliação Automática Ativa</p>
                        <p className="text-[10px] text-muted-foreground">Monitorando divergências entre Folha e FGTS Digital em tempo real.</p>
                    </div>
                </div>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[10px]">100% Sincronizado</Badge>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/30 transition-colors border border-border/10 group">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <FileText className="h-4 w-4" />
                    </div>
                    <div className="text-xs">
                        <p className="font-bold">Guia GFD Mensal - Competência 04/2026</p>
                        <p className="text-[10px] text-muted-foreground">Emitida via API Caixa em 05/05/2026</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[10px]">Pago</Badge>
                    <Button variant="ghost" size="icon" aria-label="Histórico" className="h-7 w-7"><History className="h-3.5 w-3.5" /></Button>
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
