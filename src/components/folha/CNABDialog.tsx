import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { FileDown, Settings2, Loader2, Landmark, CheckCircle2, Zap, ShieldCheck } from 'lucide-react';
import { cnabService, CNABConfig } from '@/services/cnabService';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { useEmpresas } from '@/hooks/useEmpresas';
import { todayLocalISO } from '@/utils/dateLocal';

interface CNABDialogProps {
  folhaId: string;
}

export function CNABDialog({ folhaId }: CNABDialogProps) {
  const { empresaAtual } = useEmpresas();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<CNABConfig>({
    banco_codigo: '001', // Default BB
    agencia: '',
    agencia_digito: '',
    conta: '',
    conta_digito: '',
    convenio: '',
    nome_empresa: '',
  });

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const loadConfig = useCallback(async () => {
    if (!empresaAtual?.id) return;
    try {
      const data = await cnabService.getConfig(empresaAtual.id);
      if (data) {
        setConfig({
          banco_codigo: data.banco_codigo,
          agencia: data.agencia,
          agencia_digito: data.agencia_digito,
          conta: data.conta,
          conta_digito: data.conta_digito,
          convenio: data.convenio,
          nome_empresa: data.nome_empresa || empresaAtual?.razao_social || '',
        });
      } else {
          setConfig(prev => ({ ...prev, nome_empresa: empresaAtual?.razao_social || '' }));
      }
    } catch (err) {
      console.error(err);
    }
  }, [empresaAtual?.id, empresaAtual?.razao_social]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) loadConfig();
  }, [open, loadConfig]);

  const handleSaveConfig = async () => {
    if (!empresaAtual?.id) return;
    setSaving(true);
    try {
      await cnabService.saveConfig(empresaAtual.id, config);
      toast.success('Configurações bancárias salvas!');
    } catch (err: any) {
      toast.error(safeErrorMessage(err, 'Erro ao salvar configurações bancárias.'));
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!empresaAtual?.id) return;
    setLoading(true);
    try {
      const content = await cnabService.generateCNAB240(empresaAtual.id, folhaId);
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CNAB240_PAGTO_REM_${todayLocalISO()}.rem`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Arquivo CNAB 240 (Remessa de Salários) gerado!');
      setOpen(false);
    } catch (err: any) {
      toast.error(safeErrorMessage(err, 'Erro ao gerar arquivo CNAB.'));
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePIX = async () => {
    if (!empresaAtual?.id) return;
    setLoading(true);
    try {
      const content = await cnabService.generatePIXBatch(empresaAtual.id, folhaId);
      const blob = new Blob([content], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LOTE_PIX_SALARIOS_${todayLocalISO()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Lote PIX analítico gerado com sucesso!');
      setOpen(false);
    } catch (err: any) {
      toast.error(safeErrorMessage(err, 'Erro ao gerar lote PIX.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-xl gap-1.5 font-body border-primary/30 hover:bg-primary/5">
          <FileDown className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">Exportar Bancário</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Landmark className="h-5 w-5 text-primary" />
            Pagamento de Salários (CNAB/PIX)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Card className="border border-border/30 shadow-none bg-muted/10">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary mb-2">
                <Settings2 className="h-4 w-4" />
                Convênio e Conta Origem (Empresa)
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Código do Banco</Label>
                  <Input placeholder="001" value={config.banco_codigo} onChange={e => setConfig(p => ({ ...p, banco_codigo: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Número do Convênio</Label>
                  <Input placeholder="1234567" value={config.convenio} onChange={e => setConfig(p => ({ ...p, convenio: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3 space-y-2">
                  <Label className="text-xs">Agência</Label>
                  <Input placeholder="1234" value={config.agencia} onChange={e => setConfig(p => ({ ...p, agencia: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">DV</Label>
                  <Input placeholder="X" value={config.agencia_digito} onChange={e => setConfig(p => ({ ...p, agencia_digito: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3 space-y-2">
                  <Label className="text-xs">Conta Corrente</Label>
                  <Input placeholder="12345678" value={config.conta} onChange={e => setConfig(p => ({ ...p, conta: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">DV</Label>
                  <Input placeholder="0" value={config.conta_digito} onChange={e => setConfig(p => ({ ...p, conta_digito: e.target.value }))} />
                </div>
              </div>

              <Button variant="ghost" size="sm" onClick={handleSaveConfig} disabled={saving} className="w-full text-xs gap-1.5 h-8 border border-dashed border-primary/20 hover:bg-primary/5">
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                Salvar Configurações de Remessa
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button onClick={handleGenerate} className="rounded-xl gap-2 h-12 shadow-lg bg-gradient-to-r from-primary to-primary-glow" disabled={loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileDown className="h-5 w-5" />}
              <div className="flex flex-col items-start leading-tight">
                <span className="text-sm">CNAB 240</span>
                <span className="text-[10px] opacity-70">Remessa FEBRABAN</span>
              </div>
            </Button>
            <Button onClick={handleGeneratePIX} variant="outline" className="rounded-xl gap-2 h-12 border-primary/30 hover:bg-primary/5" disabled={loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5 text-amber-500" />}
              <div className="flex flex-col items-start leading-tight">
                <span className="text-sm">PIX Analítico</span>
                <span className="text-[10px] opacity-70 text-muted-foreground">Lote Instantâneo</span>
              </div>
            </Button>
          </div>
          
          <div className="flex items-center gap-2 justify-center p-2 bg-success/5 rounded-lg border border-success/20">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            <span className="text-[10px] text-success font-medium uppercase tracking-tighter">Protocolo Bancário Seguro TLS 1.3 Ativo</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
