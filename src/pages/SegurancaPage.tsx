import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { securityService } from '@/services/securityService';
import { 
  ShieldAlert, 
  Lock, 
  Unlock, 
  Globe, 
  
  AlertTriangle, 
  CheckCircle, 
  History, 
  ShieldCheck} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SegurancaPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: alerts, isLoading: loadAlerts } = useQuery({ queryKey: ['security_alerts'], queryFn: securityService.getSecurityAlerts });
  const { data: blockedIps, isLoading: loadBlocked } = useQuery({ queryKey: ['blocked_ips'], queryFn: securityService.getBlockedIps });
  const { data: loginAttempts, isLoading: loadLogins } = useQuery({ queryKey: ['login_attempts'], queryFn: securityService.getLoginAttempts });
  const { data: geoBlocked, isLoading: loadGeo } = useQuery({ queryKey: ['geo_blocked'], queryFn: securityService.getGeoBlockedAttempts });

  const unblockMutation = useMutation({
    mutationFn: securityService.unblockIp,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blocked_ips'] });
      toast.success('IP desbloqueado com sucesso');
    },
    onError: () => toast.error('Erro ao desbloquear IP')
  });

  const resolveAlertMutation = useMutation({
    mutationFn: ({ id, userId }: { id: string, userId: string }) => securityService.resolveAlert(id, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['security_alerts'] });
      toast.success('Alerta resolvido');
    }
  });

  const stats = [
    { label: 'Alertas Ativos', value: alerts?.filter(a => !a.resolved).length || 0, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
    { label: 'IPs Bloqueados', value: blockedIps?.length || 0, icon: Lock, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Tentativas (24h)', value: loginAttempts?.length || 0, icon: History, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Geo-Bloqueios', value: geoBlocked?.length || 0, icon: Globe, color: 'text-info', bg: 'bg-info/10' },
  ];

  return (
    <>
      <PageTitle title="Segurança & Firewall" description="Monitoramento de tentativas de acesso e proteção do sistema" />
      <PageLayout 
        title="Segurança do Sistema" 
        description="Painel de controle de firewall e proteção contra intrusão"
        icon={<ShieldCheck className="h-5 w-5 text-primary-foreground" />}
        gradient="from-destructive/80 to-primary"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="border border-border/30 overflow-hidden relative group hover:shadow-elevated transition-all">
                <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
                  <stat.icon className="h-12 w-12" />
                </div>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${stat.bg}`}>
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                  </div>
                  <div className="text-3xl font-bold font-display">{stat.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50 p-1 border border-border/20 rounded-xl overflow-x-auto h-auto">
            <TabsTrigger value="overview" className="rounded-lg py-2">Visão Geral</TabsTrigger>
            <TabsTrigger value="alerts" className="rounded-lg py-2 gap-2">
              Alertas 
              {alerts?.filter(a => !a.resolved).length ? (
                <Badge variant="destructive" className="h-4 px-1 min-w-[16px] text-[10px]">{alerts?.filter(a => !a.resolved).length}</Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="logins" className="rounded-lg py-2">Tentativas de Login</TabsTrigger>
            <TabsTrigger value="firewall" className="rounded-lg py-2">Firewall (IPs)</TabsTrigger>
            <TabsTrigger value="geo" className="rounded-lg py-2">Geo-Firewall</TabsTrigger>
            <TabsTrigger value="policies" className="rounded-lg py-2">Políticas RLS</TabsTrigger>
          </TabsList>


          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border/30 shadow-none">
                <CardHeader>
                  <CardTitle className="text-lg font-display flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Alertas Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {loadAlerts ? <Spinner /> : alerts?.slice(0, 5).map(alert => (
                      <div key={alert.id} className="flex items-start justify-between p-3 rounded-xl border border-border/20 bg-muted/20 hover:bg-muted/30 transition-colors">
                        <div className="flex gap-3">
                          <div className={`mt-1 p-1.5 rounded-full ${alert.severity === 'high' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                            <ShieldAlert className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{alert.type}</p>
                            <p className="text-xs text-muted-foreground">{alert.ip_address} • {format(new Date(alert.created_at), 'HH:mm', { locale: ptBR })}</p>
                          </div>
                        </div>
                        {!alert.resolved && <Button variant="ghost" size="sm" className="h-7 text-xs rounded-lg" onClick={() => resolveAlertMutation.mutate({ id: alert.id, userId: '00000000-0000-0000-0000-000000000000' })}>Resolver</Button>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/30 shadow-none">
                <CardHeader>
                  <CardTitle className="text-lg font-display flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    Atividade de Login (IPs)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                   <div className="h-[300px] w-full flex items-center justify-center bg-muted/10 rounded-xl border border-dashed border-border/30">
                      <p className="text-sm text-muted-foreground italic text-center px-8">Gráfico de tendências de tentativas de login por IP e horário disponível em breve</p>
                   </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="alerts">
            <Card className="border-border/30">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[180px]">Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Gravidade</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadAlerts ? <TableRow><TableCell colSpan={6}><Spinner /></TableCell></TableRow> : alerts?.map(alert => (
                    <TableRow key={alert.id}>
                      <TableCell className="text-xs font-body">{format(new Date(alert.created_at), 'dd/MM/yyyy HH:mm:ss')}</TableCell>
                      <TableCell className="font-medium text-sm">{alert.type}</TableCell>
                      <TableCell>
                        <Badge variant={alert.severity === 'high' ? 'destructive' : 'warning'} className="text-[10px] uppercase font-bold">
                          {alert.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{alert.ip_address}</TableCell>
                      <TableCell>
                        {alert.resolved ? (
                          <Badge variant="outline" className="text-success border-success/30 bg-success/5 gap-1">
                            <CheckCircle className="h-3 w-3" /> Resolvido
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5 gap-1">
                            <ShieldAlert className="h-3 w-3" /> Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!alert.resolved && (
                          <Button variant="outline" size="sm" className="h-8 rounded-lg" onClick={() => resolveAlertMutation.mutate({ id: alert.id, userId: '00000000-0000-0000-0000-000000000000' })}>
                            Marcar Resolvido
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="logins">
            <Card className="border-border/30">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadLogins ? <TableRow><TableCell colSpan={5}><Spinner /></TableCell></TableRow> : loginAttempts?.map(attempt => (
                    <TableRow key={attempt.id}>
                      <TableCell className="text-xs font-body">{format(new Date(attempt.created_at), 'dd/MM/yyyy HH:mm:ss')}</TableCell>
                      <TableCell className="text-sm font-medium">{attempt.email}</TableCell>
                      <TableCell className="text-xs font-mono">{attempt.ip_address}</TableCell>
                      <TableCell>
                        {attempt.success ? (
                          <Badge variant="outline" className="bg-success/10 text-success border-0">Sucesso</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-0">Falha</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground italic">
                        {attempt.failure_reason || (attempt.success ? 'Autenticado' : 'Desconhecido')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="firewall">
            <Card className="border-border/30">
              <div className="p-4 flex justify-between items-center border-b border-border/20">
                <div>
                  <h3 className="text-sm font-semibold">Lista de IPs Bloqueados</h3>
                  <p className="text-xs text-muted-foreground">Bloqueios automáticos por detecção de brute-force</p>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <Lock className="h-4 w-4" /> Bloquear IP Manualmente
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>IP Address</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Bloqueado em</TableHead>
                    <TableHead>Expira em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadBlocked ? <TableRow><TableCell colSpan={5}><Spinner /></TableCell></TableRow> : blockedIps?.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">Nenhum IP bloqueado no momento</TableCell></TableRow>
                  ) : blockedIps?.map(ip => (
                    <TableRow key={ip.id}>
                      <TableCell className="font-mono text-sm font-bold">{ip.ip_address}</TableCell>
                      <TableCell className="text-sm">{ip.reason}</TableCell>
                      <TableCell className="text-xs">{format(new Date(ip.blocked_at), 'dd/MM HH:mm')}</TableCell>
                      <TableCell className="text-xs">
                        {ip.permanent ? <Badge variant="secondary">Permanente</Badge> : ip.expires_at ? format(new Date(ip.expires_at), 'dd/MM HH:mm') : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8 text-success hover:text-success hover:bg-success/10 rounded-lg gap-2" onClick={() => unblockMutation.mutate(ip.id)}>
                          <Unlock className="h-3 w-3" /> Desbloquear
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="geo">
            <Card className="border-border/30">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>País</TableHead>
                    <TableHead>User Agent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadGeo ? <TableRow><TableCell colSpan={4}><Spinner /></TableCell></TableRow> : geoBlocked?.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic">Nenhuma tentativa de acesso de países bloqueados</TableCell></TableRow>
                  ) : geoBlocked?.map(geo => (
                    <TableRow key={geo.id}>
                      <TableCell className="text-xs">{format(new Date(geo.created_at), 'dd/MM HH:mm:ss')}</TableCell>
                      <TableCell className="font-mono text-xs">{geo.ip_address}</TableCell>
                      <TableCell className="text-sm">
                        <span className="flex items-center gap-2">
                          <span className="text-lg">🚩</span> {geo.country_name} ({geo.country_code})
                        </span>
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground truncate max-w-[300px]">{geo.user_agent}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="policies">
            <PolicyAuditPanel />
          </TabsContent>
        </Tabs>
      </PageLayout>

    </>
  );
}
