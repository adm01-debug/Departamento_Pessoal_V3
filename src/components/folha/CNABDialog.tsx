import { useState, useCallback, useEffect, useRef } from 'react';
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
import { loggerService } from '@/services/loggerService';

interface CNABDialogProps {
  folhaId: string;
}

const emptyConfig = (nomeEmpresa = ''): CNABConfig => ({
  banco_codigo: '001',
  agencia: '',
  agencia_digito: '',
  conta: '',
  conta_digito: '',
  convenio: '',
  nome_empresa: nomeEmpresa,
});

export function CNABDialog({ folhaId }: CNABDialogProps) {
  const { empresaAtual } = useEmpresas();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [configEmpresaId, setConfigEmpresaId] = useState<string | null>(null);
  const [config, setConfig] = useState<CNABConfig>(() => emptyConfig());
  const empresaAtualIdRef = useRef<string | undefined>(empresaAtual?.id);
  const openRef = useRef(false);
  const contextVersionRef = useRef(0);
  const operationVersionRef = useRef(0);

  useEffect(() => {
    if (empresaAtualIdRef.current !== empresaAtual?.id) {
      contextVersionRef.current += 1;
      operationVersionRef.current += 1;
    }
    empresaAtualIdRef.current = empresaAtual?.id;
  }, [empresaAtual?.id]);

  const loadConfig = useCallback(async (empresaId: string, razaoSocial?: string) => {
    const requestVersion = contextVersionRef.current;
    setLoadingConfig(true);
    setConfigEmpresaId(null);
    try {
      const data = await cnabService.getConfig(empresaId);
      // A troca de empresa ou o fechamento do modal invalida a resposta que
      // chegou atrasada. Nunca reutilizar dados bancários entre tenants.
      if (!openRef.current || empresaAtualIdRef.current !== empresaId || contextVersionRef.current !== requestVersion)
        return;
      if (data) {
        setConfig({
          banco_codigo: data.banco_codigo,
          agencia: data.agencia,
          agencia_digito: data.agencia_digito,
          conta: data.conta,
          conta_digito: data.conta_digito,
          convenio: data.convenio,
          nome_empresa: data.nome_empresa || razaoSocial || '',
        });
      } else {
        setConfig(emptyConfig(razaoSocial));
      }
      setConfigEmpresaId(empresaId);
    } catch (err) {
      loggerService.error(
        'Erro ao carregar config CNAB',
        { empresaId },
        err instanceof Error ? err : new Error(String(err))
      );
    } finally {
      if (openRef.current && empresaAtualIdRef.current === empresaId && contextVersionRef.current === requestVersion)
        setLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (open && empresaAtual?.id) {
      const empresaId = empresaAtual.id;
      const razaoSocial = empresaAtual.razao_social;
      queueMicrotask(() => {
        if (!cancelled) void loadConfig(empresaId, razaoSocial);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [open, empresaAtual?.id, empresaAtual?.razao_social, loadConfig]);

  const handleOpenChange = (nextOpen: boolean) => {
    openRef.current = nextOpen;
    contextVersionRef.current += 1;
    operationVersionRef.current += 1;
    setOpen(nextOpen);
    if (!nextOpen) {
      setLoading(false);
      setSaving(false);
      setLoadingConfig(false);
      setConfigEmpresaId(null);
      setConfig(emptyConfig());
    }
  };

  const handleSaveConfig = async () => {
    if (!empresaAtual?.id) return;
    if (loadingConfig || configEmpresaId !== empresaAtual.id) {
      toast.error('A configuração da empresa atual ainda não foi carregada.');
      return;
    }
    const empresaId = empresaAtual.id;
    const requestVersion = contextVersionRef.current;
    const operationVersion = ++operationVersionRef.current;
    setSaving(true);
    try {
      await cnabService.saveConfig(empresaId, config);
      if (!openRef.current || empresaAtualIdRef.current !== empresaId || contextVersionRef.current !== requestVersion)
        return;
      toast.success('Configurações bancárias salvas!');
    } catch (err) {
      if (operationVersionRef.current === operationVersion) {
        toast.error(safeErrorMessage(err, 'Erro ao salvar configurações bancárias.'));
      }
    } finally {
      if (operationVersionRef.current === operationVersion) setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!empresaAtual?.id) return;
    if (loadingConfig || configEmpresaId !== empresaAtual.id) {
      toast.error('A configuração da empresa atual ainda não foi carregada.');
      return;
    }
    const empresaId = empresaAtual.id;
    const contextVersion = contextVersionRef.current;
    const operationVersion = ++operationVersionRef.current;
    setLoading(true);
    try {
      const content = await cnabService.generateCNAB240(empresaId, folhaId);
      if (
        !openRef.current ||
        empresaAtualIdRef.current !== empresaId ||
        contextVersionRef.current !== contextVersion ||
        operationVersionRef.current !== operationVersion
      )
        return;

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
      handleOpenChange(false);
    } catch (err) {
      if (operationVersionRef.current === operationVersion) {
        toast.error(safeErrorMessage(err, 'Erro ao gerar arquivo CNAB.'));
      }
    } finally {
      if (operationVersionRef.current === operationVersion) setLoading(false);
    }
  };

  const handleGeneratePIX = async () => {
    if (!empresaAtual?.id) return;
    if (loadingConfig || configEmpresaId !== empresaAtual.id) {
      toast.error('A configuração da empresa atual ainda não foi carregada.');
      return;
    }
    const empresaId = empresaAtual.id;
    const contextVersion = contextVersionRef.current;
    const operationVersion = ++operationVersionRef.current;
    setLoading(true);
    try {
      const content = await cnabService.generatePIXBatch(empresaId, folhaId);
      if (
        !openRef.current ||
        empresaAtualIdRef.current !== empresaId ||
        contextVersionRef.current !== contextVersion ||
        operationVersionRef.current !== operationVersion
      )
        return;
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
      handleOpenChange(false);
    } catch (err) {
      if (operationVersionRef.current === operationVersion) {
        toast.error(safeErrorMessage(err, 'Erro ao gerar lote PIX.'));
      }
    } finally {
      if (operationVersionRef.current === operationVersion) setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl gap-1.5 font-body border-primary/30 hover:bg-primary/5"
        >
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
                  <Input
                    placeholder="001"
                    value={config.banco_codigo}
                    onChange={(e) => setConfig((p) => ({ ...p, banco_codigo: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Número do Convênio</Label>
                  <Input
                    placeholder="1234567"
                    value={config.convenio}
                    onChange={(e) => setConfig((p) => ({ ...p, convenio: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3 space-y-2">
                  <Label className="text-xs">Agência</Label>
                  <Input
                    placeholder="1234"
                    value={config.agencia}
                    onChange={(e) => setConfig((p) => ({ ...p, agencia: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">DV</Label>
                  <Input
                    placeholder="X"
                    value={config.agencia_digito}
                    onChange={(e) => setConfig((p) => ({ ...p, agencia_digito: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3 space-y-2">
                  <Label className="text-xs">Conta Corrente</Label>
                  <Input
                    placeholder="12345678"
                    value={config.conta}
                    onChange={(e) => setConfig((p) => ({ ...p, conta: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">DV</Label>
                  <Input
                    placeholder="0"
                    value={config.conta_digito}
                    onChange={(e) => setConfig((p) => ({ ...p, conta_digito: e.target.value }))}
                  />
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveConfig}
                disabled={saving || loadingConfig || configEmpresaId !== empresaAtual?.id}
                className="w-full text-xs gap-1.5 h-8 border border-dashed border-primary/20 hover:bg-primary/5"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                Salvar Configurações de Remessa
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              onClick={handleGenerate}
              className="rounded-xl gap-2 h-12 shadow-lg bg-gradient-to-r from-primary to-primary-glow"
              disabled={loading || loadingConfig || configEmpresaId !== empresaAtual?.id}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileDown className="h-5 w-5" />}
              <div className="flex flex-col items-start leading-tight">
                <span className="text-sm">CNAB 240</span>
                <span className="text-[10px] opacity-70">Remessa FEBRABAN</span>
              </div>
            </Button>
            <Button
              onClick={handleGeneratePIX}
              variant="outline"
              className="rounded-xl gap-2 h-12 border-primary/30 hover:bg-primary/5"
              disabled={loading || loadingConfig || configEmpresaId !== empresaAtual?.id}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5 text-amber-500" />}
              <div className="flex flex-col items-start leading-tight">
                <span className="text-sm">PIX Analítico</span>
                <span className="text-[10px] opacity-70 text-muted-foreground">Lote Instantâneo</span>
              </div>
            </Button>
          </div>

          <div className="flex items-center gap-2 justify-center p-2 bg-success/5 rounded-lg border border-success/20">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            <span className="text-[10px] text-success font-medium uppercase tracking-tighter">
              Arquivo gerado localmente — revise antes do envio ao banco
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
