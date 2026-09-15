import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { PageLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plug, ExternalLink, CheckCircle, XCircle, Settings, Zap, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Bitrix24ConfigPanel,
  CnabConfigPanel,
  WebhookConfigPanel,
  WhatsAppConfigPanel,
} from '@/components/integracoes/ConfigPanels';

interface Integracao {
  id: string;
  nome: string;
  descricao: string;
  status: 'ativo' | 'inativo' | 'configurando';
  gradient: string;
  icon: string;
}

const integracoesFixas: Integracao[] = [
  {
    id: 'contabilidade',
    nome: 'Contabilidade',
    descricao: 'Exportação de dados contábeis (SPED, DIRF, RAIS)',
    status: 'inativo',
    gradient: 'from-primary-glow to-primary',
    icon: '📊',
  },
  {
    id: 'esocial',
    nome: 'eSocial',
    descricao: 'Validação local disponível; transmissão produtiva aguarda certificado e homologação',
    status: 'configurando',
    gradient: 'from-primary to-primary-glow',
    icon: '🏛️',
  },
  {
    id: 'ponto',
    nome: 'Relógio de Ponto',
    descricao: 'Integração com REPs homologados',
    status: 'inativo',
    gradient: 'from-primary/60 to-primary/90',
    icon: '⏰',
  },
];

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  ativo: { label: 'Ativo', color: 'bg-success/10 text-success', icon: CheckCircle },
  inativo: { label: 'Inativo', color: 'bg-muted text-muted-foreground', icon: XCircle },
  configurando: { label: 'Configurando', color: 'bg-warning/10 text-warning', icon: RefreshCw },
};

export default function IntegracoesPage() {
  const [bitrixOpen, setBitrixOpen] = useState(false);
  const [cnabOpen, setCnabOpen] = useState(false);
  const [webhookOpen, setWebhookOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);

  return (
    <>
      <PageTitle title="Integrações" description="Conectores e integrações externas" />
      <PageLayout
        title="Integrações"
        description="Conecte o sistema a serviços externos"
        icon={<Plug className="h-5 w-5 text-primary-foreground" />}
        gradient="from-primary/80 to-primary"
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="group border border-border/30 rounded-2xl hover:shadow-elevated hover:border-border/60 transition-all overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary to-primary-glow" />
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔗</span>
                    <CardTitle className="font-display text-base">Bitrix24</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] gap-1 bg-muted text-muted-foreground">
                    <Settings className="h-3 w-3" />
                    Configurável
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground font-body mb-4">
                  Sincronização de colaboradores, cargos e departamentos com o CRM
                </p>
                <Dialog open={bitrixOpen} onOpenChange={setBitrixOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-xl font-body gap-2 group-hover:border-primary/30"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Configurar
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Bitrix24 — Configuração</DialogTitle>
                    </DialogHeader>
                    <Bitrix24ConfigPanel />
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="group border border-border/30 rounded-2xl hover:shadow-elevated hover:border-border/60 transition-all overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-success to-success/60" />
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💬</span>
                    <CardTitle className="font-display text-base">WhatsApp (Evolution)</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] gap-1 bg-muted text-muted-foreground">
                    <Settings className="h-3 w-3" />
                    Configurável
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground font-body mb-4">
                  Envio de holerites, alertas de ponto e notificações automáticas via WhatsApp
                </p>
                <Dialog open={whatsappOpen} onOpenChange={setWhatsappOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full rounded-xl border-border/40 hover:bg-muted font-body transition-colors"
                    >
                      Configurar Integração
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-2xl">
                    <DialogHeader className="p-6 bg-muted/20 border-b border-border/10">
                      <DialogTitle className="font-display">Integração WhatsApp — Evolution API</DialogTitle>
                    </DialogHeader>
                    <WhatsAppConfigPanel />
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="group border border-border/30 rounded-2xl hover:shadow-elevated hover:border-border/60 transition-all overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary-glow to-primary" />
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🏦</span>
                    <CardTitle className="font-display text-base">Bancos (CNAB)</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] gap-1 bg-success/10 text-success">
                    <CheckCircle className="h-3 w-3" />
                    Pronto
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground font-body mb-4">
                  Geração automática de arquivos CNAB 240/400 para folha
                </p>
                <Dialog open={cnabOpen} onOpenChange={setCnabOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-xl font-body gap-2 group-hover:border-primary/30"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Configurar
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0">
                    <DialogHeader className="p-6 pb-2">
                      <DialogTitle>Bancos (CNAB) — Configuração & Remessas</DialogTitle>
                    </DialogHeader>
                    <CnabConfigPanel />
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="group border border-border/30 rounded-2xl hover:shadow-elevated hover:border-border/60 transition-all overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/80 to-primary" />
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔔</span>
                    <CardTitle className="font-display text-base">Webhooks</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] gap-1 bg-primary/10 text-primary">
                    <Zap className="h-3 w-3" />
                    Em tempo real
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground font-body mb-4">
                  Envio de notificações automáticas para URLs externas
                </p>
                <Dialog open={webhookOpen} onOpenChange={setWebhookOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-xl font-body gap-2 group-hover:border-primary/30"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Configurar
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0">
                    <DialogHeader className="p-6 pb-2">
                      <DialogTitle>Webhooks — Notificações Externas</DialogTitle>
                    </DialogHeader>
                    <WebhookConfigPanel />
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </motion.div>

          {integracoesFixas.map((integ, i) => {
            const statusInfo = statusConfig[integ.status];
            const StatusIcon = statusInfo.icon;
            return (
              <motion.div
                key={integ.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (i + 1) * 0.08 }}
              >
                <Card className="group border border-border/30 rounded-2xl hover:shadow-elevated hover:border-border/60 transition-all overflow-hidden relative">
                  <div className={cn('absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r', integ.gradient)} />
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{integ.icon}</span>
                        <CardTitle className="font-display text-base">{integ.nome}</CardTitle>
                      </div>
                      <Badge variant="outline" className={cn('text-[10px] gap-1', statusInfo.color)}>
                        <StatusIcon className="h-3 w-3" />
                        {statusInfo.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground font-body mb-4">{integ.descricao}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-xl font-body gap-2 group-hover:border-primary/30"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Configurar
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </PageLayout>
    </>
  );
}
