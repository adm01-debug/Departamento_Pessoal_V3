import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { PageLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, Download, Clock, Shield, HardDrive, CheckCircle, FileJson, FileSpreadsheet, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { cn } from '@/lib/utils';
import { exportarBackupCSV, exportarBackupJSON, downloadBlob } from '@/services/backupService';
import { useEmpresa } from '@/contexts/EmpresaContext';

interface BackupHistoryItem {
  id: string;
  data: string;
  tamanho: string;
  formato: string;
  registros: number;
  tabelas: number;
}

export default function BackupPage() {
  const { empresaAtual } = useEmpresa();
  const [backing, setBacking] = useState<'csv' | 'json' | null>(null);
  const [historico, setHistorico] = useState<BackupHistoryItem[]>([]);

  const handleBackup = async (formato: 'csv' | 'json') => {
    if (!empresaAtual?.id) {
      toast.error('Selecione uma empresa antes de realizar o backup');
      return;
    }
    setBacking(formato);
    try {
      const result = formato === 'csv'
        ? await exportarBackupCSV(empresaAtual.id)
        : await exportarBackupJSON(empresaAtual.id);

      downloadBlob(result.blob, result.fileName);

      const entry: BackupHistoryItem = {
        id: crypto.randomUUID(),
        data: new Date().toLocaleString('pt-BR'),
        tamanho: result.stats.tamanho,
        formato: formato.toUpperCase(),
        registros: result.stats.registros,
        tabelas: result.stats.tabelas,
      };
      setHistorico(prev => [entry, ...prev]);

      toast.success(
        `Backup ${formato.toUpperCase()} concluído! ${result.stats.registros} registros de ${result.stats.tabelas} tabelas (${result.stats.tamanho})`
      );
    } catch (err: any) {
      toast.error(safeErrorMessage(err, 'Erro ao realizar backup.'));
    } finally {
      setBacking(null);
    }
  };

  return (
    <>
      <PageTitle title="Backup" description="Gerenciamento de backups do sistema" />
      <PageLayout
        title="Backup"
        description="Exporte dados reais do sistema em CSV ou JSON"
        icon={<Database className="h-5 w-5 text-primary-foreground" />}
        gradient="from-primary-glow to-primary"
        actions={
          <div className="flex gap-2">
            <Button
              onClick={() => handleBackup('csv')}
              disabled={!!backing}
              variant="outline"
              className="rounded-xl font-body"
            >
              {backing === 'csv' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
              Exportar CSV
            </Button>
            <Button
              onClick={() => handleBackup('json')}
              disabled={!!backing}
              className="rounded-xl bg-gradient-to-r from-primary-glow to-primary hover:opacity-90 shadow-lg font-body"
            >
              {backing === 'json' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileJson className="h-4 w-4 mr-2" />}
              Exportar JSON
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          {[
            { label: 'Backups Realizados', value: String(historico.length), icon: Clock, gradient: 'from-primary to-primary-glow' },
            { label: 'Tabelas Cobertas', value: '10', icon: HardDrive, gradient: 'from-primary to-primary-glow' },
            { label: 'Status', value: backing ? 'Exportando...' : 'Pronto', icon: Shield, gradient: 'from-primary to-primary-glow' },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="border border-border/30 rounded-2xl overflow-hidden relative">
                <div className={cn('absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r', stat.gradient)} />
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={cn('p-2.5 rounded-xl bg-gradient-to-br', stat.gradient)}>
                    <stat.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-muted-foreground font-body text-xs">{stat.label}</p>
                    <p className="font-display font-bold text-lg">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card className="border border-border/30 rounded-2xl shadow-elevated">
          <CardHeader>
            <CardTitle className="font-display">Histórico de Backups (Sessão Atual)</CardTitle>
          </CardHeader>
          <CardContent>
            {historico.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum backup realizado nesta sessão</p>
                <p className="text-xs mt-1">Clique em "Exportar CSV" ou "Exportar JSON" para iniciar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historico.map((b, i) => (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <div>
                        <p className="font-body font-medium text-sm">{b.data}</p>
                        <p className="text-muted-foreground font-body text-xs">
                          {b.formato} · {b.tabelas} tabelas · {b.registros} registros · {b.tamanho}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {b.formato}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PageLayout>
    </>
  );
}
