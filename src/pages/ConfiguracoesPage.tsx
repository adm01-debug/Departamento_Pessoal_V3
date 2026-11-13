import { PageTitle } from '@/components/PageTitle';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'react-router-dom';
import { PageLayout } from '@/components/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { Settings } from 'lucide-react';

import { CamposCustomizadosTab } from '@/components/settings/CamposCustomizadosTab';
import { IPBlockingTab } from '@/components/settings/IPBlockingTab';
import { SystemHealthTab } from '@/components/settings/SystemHealthTab';
import { ConfiguracoesGeraisTab } from '@/components/settings/ConfiguracoesGeraisTab';
import { LogsIntegracoesTab } from '@/components/settings/LogsIntegracoesTab';
import { MFASetup } from '@/components/settings/MFASetup';
import { EmpresaSettingsTab } from '@/components/settings/EmpresaSettingsTab';
import { UserRolesTab } from '@/components/settings/UserRolesTab';
import { GlobalAuditLogTab } from '@/components/settings/GlobalAuditLogTab';
import { BeneficiosSettingsTab } from '@/components/settings/BeneficiosSettingsTab';
import {
  AlertasKpiTab,
  FolhaConfigTab,
  IntegracoesTab,
  NotificacoesTab,
  PontoConfigTab,
  PreferenciasTab,
  WebhooksLogsTab,
} from '@/components/settings/InlineTabs';

export default function ConfiguracoesPage() {
  const { user, isAdmin } = useAuth();
  const [searchParams] = useSearchParams();

  const tabs = [
    { value: 'empresa', label: 'Empresa', adminOnly: true },
    { value: 'perfis', label: 'Perfis', adminOnly: true },
    { value: 'beneficios', label: 'Benefícios', adminOnly: false },
    { value: 'folha', label: 'Folha', adminOnly: false },
    { value: 'ponto', label: 'Ponto', adminOnly: false },
    { value: 'notificacoes', label: 'Notificações', adminOnly: false },
    { value: 'seguranca', label: 'Segurança', adminOnly: false },
    { value: 'geral', label: 'Preferências', adminOnly: false },
    { value: 'alertas', label: 'Alertas RH', adminOnly: true },
    { value: 'campos', label: 'Campos Custom', adminOnly: true },
    { value: 'ips', label: 'Filtro IP', adminOnly: true },
    { value: 'integracoes', label: 'Integ.', adminOnly: true },
    { value: 'webhooks', label: 'Webhooks', adminOnly: true },
    { value: 'logs-integ', label: 'Integ. Logs', adminOnly: true },
    { value: 'auditoria-global', label: 'Auditoria', adminOnly: true },
    { value: 'config-bd', label: 'BD', adminOnly: true },
    { value: 'sistema', label: 'Saúde/Sync', adminOnly: true },
  ];

  const tabParam = searchParams.get('tab');
  const initialTab =
    tabParam && tabs.some((t) => t.value === tabParam && (!t.adminOnly || isAdmin))
      ? tabParam
      : isAdmin
        ? 'empresa'
        : 'seguranca';

  return (
    <>
      <PageTitle title="Configurações" description="Configurações do sistema" />
      <PageLayout
        title="Configurações"
        description="Gerenciamento centralizado de parâmetros e segurança"
        icon={<Settings className="h-5 w-5 text-primary-foreground" />}
        gradient="from-muted-foreground to-foreground"
      >
        <Tabs defaultValue={initialTab} className="space-y-6">
          <div className="bg-muted/50 rounded-2xl p-1.5 border border-border/30 overflow-x-auto no-scrollbar scroll-smooth">
            <TabsList className="bg-transparent h-auto flex flex-nowrap gap-1 w-max min-w-full">
              {tabs
                .filter((t) => !t.adminOnly || isAdmin)
                .map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="rounded-xl px-4 py-2 text-xs font-body font-medium transition-all data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs min-w-fit"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
            </TabsList>
          </div>

          <TabsContent value="geral">
            <PreferenciasTab user={user} />
          </TabsContent>
          <TabsContent value="notificacoes">
            <NotificacoesTab />
          </TabsContent>
          <TabsContent value="folha">
            <FolhaConfigTab />
          </TabsContent>
          <TabsContent value="ponto">
            <PontoConfigTab />
          </TabsContent>
          <TabsContent value="alertas">
            <AlertasKpiTab />
          </TabsContent>
          <TabsContent value="seguranca">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <MFASetup />
            </motion.div>
          </TabsContent>
          <TabsContent value="campos">
            <CamposCustomizadosTab />
          </TabsContent>
          <TabsContent value="integracoes">
            <IntegracoesTab />
          </TabsContent>
          <TabsContent value="webhooks">
            <WebhooksLogsTab />
          </TabsContent>
          <TabsContent value="ips">
            <IPBlockingTab />
          </TabsContent>
          <TabsContent value="auditoria-global">
            <GlobalAuditLogTab />
          </TabsContent>
          <TabsContent value="sistema">
            <SystemHealthTab />
          </TabsContent>
          <TabsContent value="logs-integ">
            <LogsIntegracoesTab />
          </TabsContent>
          <TabsContent value="config-bd">
            <ConfiguracoesGeraisTab />
          </TabsContent>
          <TabsContent value="perfis">
            <UserRolesTab />
          </TabsContent>
          <TabsContent value="beneficios">
            <BeneficiosSettingsTab />
          </TabsContent>
          <TabsContent value="empresa">
            <EmpresaSettingsTab />
          </TabsContent>
        </Tabs>
      </PageLayout>
    </>
  );
}
