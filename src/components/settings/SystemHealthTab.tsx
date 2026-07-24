import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { edgeFunctionsService } from '@/services/edgeFunctionsService';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Activity, Database, HardDrive, CheckCircle, XCircle, Trash2, Download,
  RefreshCw, Loader2, Bell, Zap, Clock
} from 'lucide-react';
export function SystemHealthTab() {
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [cleanupResult, setCleanupResult] = useState<any>(null);
  const [backupResult, setBackupResult] = useState<any>(null);
  const [backupId, setBackupId] = useState('');

  const runHealthcheck = async () => {
    setLoading('health');
    try {
      const result = await edgeFunctionsService.healthcheck();
      setHealthData(result);
      toast.success(`Sistema: ${(result as Record<string, unknown>).status}`);
    } catch (err: any) {
      toast.error(safeErrorMessage(err, 'Erro na operação.'));
    } finally {
      setLoading(null);
    }
  };

  const runCleanup = async () => {
    setLoading('cleanup');
    try {
      const result = await edgeFunctionsService.limpezaDados();
      setCleanupResult(result);
      toast.success(`${(result as Record<string, unknown>).total_cleaned} registros limpos!`);
    } catch (err: any) {
      toast.error(safeErrorMessage(err, 'Erro na operação.'));
    } finally {
      setLoading(null);
    }
  };

  const runBackup = async () => {
    setLoading('backup');
    try {
      const result = await edgeFunctionsService.backupServidor();
      setBackupResult(result);
      setBackupId(crypto.randomUUID().slice(0, 8).toUpperCase());
      toast.success((result as Record<string, unknown>).message as string);
    } catch (err: any) {
      toast.error(safeErrorMessage(err, 'Erro na operação.'));
    } finally {
      setLoading(null);
    }
  };

  const runAlertasDP = async () => {
    setLoading('alertas');
    try {
      await edgeFunctionsService.dispararAlertasDP();
      toast.success('Alertas de DP disparados com sucesso!');
    } catch (err: any) {
      toast.error(safeErrorMessage(err, 'Erro na operação.'));
    } finally {
      setLoading(null);
    }
  };

  const runAgendamentos = async () => {
    setLoading('agendamentos');
    try {
      const result = await edgeFunctionsService.processarAgendamentos();
      toast.success(`${(result as Record<string, unknown>).processados || 0} agendamentos processados!`);
    } catch (err: any) {
      toast.error(safeErrorMessage(err, 'Erro na operação.'));
    } finally {
      setLoading(null);
    }
  };

  const runSincronizarBitrix = async () => {
    setLoading('bitrix');
    try {
      await edgeFunctionsService.sincronizarBitrix({ action: 'sync_all' });
      toast.success('Sincronização Bitrix24 iniciada!');
    } catch (err: any) {
      toast.error(safeErrorMessage(err, 'Erro na operação.'));
    } finally {
      setLoading(null);
    }
  };

  const runLimparCache = async () => {
    setLoading('cache');
    try {
      await edgeFunctionsService.cache({ action: 'invalidate' });
      toast.success('Cache do sistema limpo com sucesso!');
    } catch (err: any) {
      toast.error(safeErrorMessage(err, 'Erro na operação.'));
    } finally {
      setLoading(null);
    }
  };

  const StatusIcon = ({ ok }: { ok: boolean }) => ok
    ? <CheckCircle className="h-4 w-4 text-green-500" />
    : <XCircle className="h-4 w-4 text-destructive" />;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden bg-card">
        <div className="h-[2px] bg-gradient-to-r from-primary to-primary-glow" />
        <CardHeader className="pb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="font-display text-xl">Console de Manutenção</CardTitle>
              <CardDescription className="font-body text-sm">Ações manuais para diagnóstico e otimização do sistema</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { id: 'health', label: 'Health Check', icon: Activity, action: runHealthcheck, color: 'text-primary' },
              { id: 'cleanup', label: 'Limpeza de DB', icon: Trash2, action: runCleanup, color: 'text-orange-500' },
              { id: 'backup', label: 'Gerar Backup', icon: Download, action: runBackup, color: 'text-blue-500' },
              { id: 'alertas', label: 'Disparar Alertas', icon: Bell, action: runAlertasDP, color: 'text-warning' },
              { id: 'agendamentos', label: 'Agendamentos', icon: Clock, action: runAgendamentos, color: 'text-indigo-500' },
              { id: 'bitrix', label: 'Sync Bitrix', icon: RefreshCw, action: runSincronizarBitrix, color: 'text-[#00AEEF]' },
              { id: 'cache', label: 'Limpar Cache', icon: Database, action: runLimparCache, color: 'text-destructive' },
            ].map((btn) => (
              <Button 
                key={btn.id}
                onClick={btn.action} 
                disabled={loading === btn.id} 
                variant="outline" 
                className={cn(
                  "rounded-2xl h-24 flex-col gap-2 font-body transition-all hover:shadow-md hover:border-primary/30",
                  btn.id === 'cache' && "border-destructive/20 text-destructive hover:bg-destructive/5 hover:border-destructive/40"
                )}
              >
                {loading === btn.id ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <btn.icon className={cn("h-6 w-6", btn.color)} />
                )}
                <span className="text-xs font-bold uppercase tracking-tight">{btn.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health Results */}
        {healthData && (
          <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden bg-card h-fit">
            <div className="h-[2px] bg-gradient-to-r from-green-500 to-emerald-500" />
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="font-display flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-500" /> Status do Core
                </CardTitle>
                <Badge 
                  variant={healthData.status === 'healthy' ? 'default' : 'destructive'} 
                  className={cn(
                    "rounded-full px-3 py-1 font-bold",
                    healthData.status === 'healthy' ? 'bg-success/20 text-success border-success/30' : ''
                  )}
                >
                  {healthData.status === 'healthy' ? 'SISTEMA ONLINE' : 'ERRO DETECTADO'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {Object.entries(healthData.services || {}).map(([name, svc]: [string, any]) => (
                <div key={name} className="flex items-center justify-between py-3 border-b border-border/10 last:border-0 hover:bg-muted/10 transition-colors px-2 rounded-lg">
                  <div className="flex items-center gap-3">
                    <StatusIcon ok={svc.status === 'ok'} />
                    <span className="font-display font-semibold text-sm capitalize">{name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-muted-foreground">{svc.latency_ms}ms</span>
                    {svc.records != null && (
                      <Badge variant="outline" className="rounded-md font-bold bg-muted/30">
                        {svc.records} regs
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              <div className="pt-4 mt-2 border-t border-border/10 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                <span>Latência: {healthData.total_latency_ms}ms</span>
                <span>{new Date(healthData.timestamp).toLocaleString('pt-BR')}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cleanup Results */}
        {cleanupResult && (
          <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden bg-card h-fit">
            <div className="h-[2px] bg-gradient-to-r from-orange-500 to-red-500" />
            <CardHeader className="pb-4">
              <CardTitle className="font-display flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-orange-500" /> Resumo de Higienização
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {Object.entries(cleanupResult.results || {}).map(([key, val]: [string, any]) => (
                <div key={key} className="flex justify-between py-2 border-b border-border/10 last:border-0 text-sm font-body px-2">
                  <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="font-bold text-orange-600">-{val}</span>
                </div>
              ))}
              <div className="pt-4 mt-2 flex justify-between items-center border-t border-border/30">
                <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Total Removido</span>
                <span className="text-2xl font-display font-black text-primary">{cleanupResult.total_cleaned}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Backup Results */}
        {backupResult && (
          <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden bg-card h-fit col-span-full">
            <div className="h-[2px] bg-gradient-to-r from-blue-500 to-indigo-500" />
            <CardHeader className="pb-4">
              <CardTitle className="font-display flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-500" /> Snapshot de Integridade (Backup)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {Object.entries(backupResult.tables || {}).map(([table, info]: [string, any]) => (
                  <div key={table} className="p-3 rounded-xl bg-muted/20 border border-border/30 flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-muted-foreground truncate uppercase">{table}</span>
                    <span className="text-sm font-mono font-bold">
                      {info.error ? <span className="text-destructive">ERRO</span> : info.count}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-6 mt-4 flex items-center justify-between border-t border-border/10">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-primary">{backupResult.message || 'Backup processado com sucesso'}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">ID: {backupId}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Registros Totais</p>
                  <p className="text-3xl font-display font-black text-blue-600">{backupResult.total_records}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {!healthData && !cleanupResult && !backupResult && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-20 border-2 border-dashed rounded-[2.5rem] border-border/40">
          <Activity className="h-16 w-16 mb-4" />
          <p className="font-display text-xl font-bold uppercase tracking-widest">Aguardando Execução</p>
          <p className="text-sm font-body">Selecione uma ação acima para iniciar o diagnóstico</p>
        </div>
      )}
    </motion.div>
  );
}

