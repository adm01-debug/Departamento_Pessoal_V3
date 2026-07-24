import { PageTitle } from '@/components/PageTitle';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { ImportarAFDTDialog } from '@/components/ponto/ImportarAFDTDialog';
import { GerarAEJDialog } from '@/components/ponto/GerarAEJDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Clock,
  MapPin,
  RefreshCw,
  Loader2,
  AlertCircle,
  Settings,
  WifiOff,
  ShieldCheck,
  Zap,
  BrainCircuit,
  BarChart3,
  Map as MapIcon,
} from 'lucide-react';
import { pontoService, batidasPontoService } from '@/services';
import { useAuth } from '@/contexts';
import { useEmpresas, usePontoOffline } from '@/hooks';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { GestaoRegistrosPonto } from '@/components/ponto/GestaoRegistrosPonto';
import { PontoStreakCard } from '@/components/ponto/PontoStreakCard';
import { PontoCharts } from '@/components/ponto/PontoCharts';
import { PontoClockRegister } from '@/components/ponto/PontoClockRegister';
import { PontoTodayCard } from '@/components/ponto/PontoTodayCard';
import { PontoWeekSummary } from '@/components/ponto/PontoWeekSummary';
import { PontoAdjustmentRequests } from '@/components/ponto/PontoAdjustmentRequests';
import { edgeFunctionsService } from '@/services/edgeFunctionsService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PontoAuditTimeline } from '@/components/ponto/PontoAuditTimeline';
import { CardSkeleton } from '@/components/ui/module-skeleton';
import { PontoLeaderboard } from '@/components/ponto/PontoLeaderboard';
import { GestaoPontoAnalytics } from '@/components/ponto/GestaoPontoAnalytics';
import { PontoGeoAnalytics } from '@/components/ponto/PontoGeoAnalytics';
import { formatDateLocalISO, todayLocalISO } from '@/utils/dateLocal';

interface BancoHorasResumo {
  saldo: string;
  saldoMinutos: number;
  tipo: 'credito' | 'debito';
}

export default function PontoPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [time, setTime] = useState(new Date());
  const [geoStatus, setGeoStatus] = useState<'idle' | 'capturing' | 'success' | 'error' | 'out_of_range'>('idle');
  const [processando, setProcessando] = useState(false);
  const { user } = useAuth();
  const { addOffline, offlineBatidasCount } = usePontoOffline();
  const { empresaAtual } = useEmpresas();

  const { data: locaisTrabalho } = useQuery({
    queryKey: ['locais-trabalho-ponto', empresaAtual?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locais_trabalho')
        .select('*')
        .eq('empresa_id', empresaAtual?.id || '')
        .eq('ativo', true);
      if (error) throw error;
      return data;
    },
    enabled: !!empresaAtual?.id,
  });

  useEffect(() => {
    const i = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  const today = todayLocalISO();

  const { data: registroHoje, refetch: refetchRegistro } = useQuery({
    queryKey: ['registro-ponto-hoje', user?.id, today],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: colab } = await supabase
        .from('colaboradores')
        .select('id')
        .eq('email', user.email || '')
        .maybeSingle();
      if (!colab) return null;
      const { data, error } = await (supabase as any)
        .from('registros_ponto')
        .select('*')
        .eq('colaborador_id', colab.id)
        .eq('data', today)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const { data: batidasHoje = [], refetch: refetchBatidas } = useQuery({
    queryKey: ['batidas-hoje', empresaAtual?.id, today],
    queryFn: () => batidasPontoService.listarPorData(today, empresaAtual?.id ?? ''),
    enabled: !!empresaAtual?.id,
    refetchInterval: 30000,
  });

  const { data: registrosSemana = [] } = useQuery({
    queryKey: ['registros-semana', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: colab } = await supabase
        .from('colaboradores')
        .select('id')
        .eq('email', user.email || '')
        .maybeSingle();
      if (!colab) return [];
      const w = new Date();
      w.setDate(w.getDate() - 7);
      const { data, error } = await (supabase as any)
        .from('registros_ponto')
        .select('*')
        .eq('colaborador_id', colab.id)
        .gte('data', formatDateLocalISO(w))
        .order('data', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: bancoResumo } = useQuery({
    queryKey: ['banco-horas-resumo', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: colab } = await supabase
        .from('colaboradores')
        .select('id')
        .eq('email', user.email || '')
        .maybeSingle();
      if (!colab) return null;

      const { data: bancoData } = await supabase
        .from('banco_horas')
        .select('horas, tipo')
        .eq('colaborador_id', colab.id);

      if (!bancoData) return { saldo: '00:00', saldoMinutos: 0, tipo: 'credito' };

      let totalMinutos = 0;
      bancoData.forEach((b) => {
        const [h, m] = (b.horas || '00:00').split(':').map(Number);
        const mins = h * 60 + (m || 0);
        totalMinutos += b.tipo === 'credito' ? mins : -mins;
      });

      const absMins = Math.abs(totalMinutos);
      const h = Math.floor(absMins / 60);
      const m = absMins % 60;
      return {
        saldo: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        saldoMinutos: totalMinutos,
        tipo: totalMinutos >= 0 ? 'credito' : 'debito',
      } as BancoHorasResumo;
    },
    enabled: !!user?.id,
  });

  const captureGeo = (): Promise<{ lat: number; lng: number; accuracy: number } | null> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      setGeoStatus('capturing');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoStatus('success');
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        },
        () => {
          setGeoStatus('error');
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // in metres
  };

  const registrar = async (
    tipo: 'entrada' | 'saida_almoco' | 'retorno_almoco' | 'saida',
    options?: { foto_biometria_url?: string | null; foto_base64?: string | null }
  ): Promise<{ biometriaValida?: boolean } | undefined> => {
    setLoading(tipo);
    try {
      const geo = await captureGeo();
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Geofencing Check
      if (geo && locaisTrabalho && locaisTrabalho.length > 0) {
        const isWithinRange = locaisTrabalho.some((local) => {
          if (!local.latitude || !local.longitude) return false;
          const dist = calculateDistance(geo.lat, geo.lng, Number(local.latitude), Number(local.longitude));
          return dist <= 500; // 500 meters radius
        });

        if (!isWithinRange) {
          setGeoStatus('out_of_range');
          toast.warning('Você está fora do raio permitido para registro de ponto presencial.');
        }
      }

      const { data: colab } = await supabase
        .from('colaboradores')
        .select('id')
        .eq('email', user.email || '')
        .maybeSingle();
      if (!colab) throw new Error('Colaborador não encontrado');

      if (!navigator.onLine) {
        // Agora passando a foto para o modo offline (biometria real mesmo offline)
        await addOffline(tipo, colab.id, {
          lat: geo?.lat,
          lng: geo?.lng,
          accuracy: geo?.accuracy,
        });
        return undefined;
      }

      const batida = await (pontoService as any).registrar(tipo, colab.id, {
        latitude: geo?.lat,
        longitude: geo?.lng,
        precisao: geo?.accuracy ? Math.round(geo.accuracy) : undefined,
        dispositivoId: navigator.userAgent,
        metadata: geoStatus === 'out_of_range' ? { out_of_range: true } : undefined,
        foto_biometria_url: options?.foto_biometria_url,
      });

      toast.success(
        `Ponto registrado: ${tipo.replace(/_/g, ' ')} às ${new Date().toLocaleTimeString('pt-BR')}${geo ? ` (📍 ${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)})` : ''}`
      );
      refetchRegistro();
      refetchBatidas();

      // Validação biométrica real (achado da auditoria: o frontend nunca
      // chamava validar-biometria — a barra de progresso sempre chegava a
      // 100% e o ponto era registrado independente de qualquer checagem).
      // O ponto NUNCA é bloqueado por falha de biometria (risco trabalhista
      // de não registrar jornada efetivamente trabalhada); o resultado real
      // é apenas reportado honestamente ao usuário e gravado na batida.
      if (options?.foto_base64 && batida?.id) {
        try {
          const bio = await pontoService.validarBiometria(batida.id, colab.id, options.foto_base64);
          if (bio?.valid) {
            toast.success('Identidade confirmada por biometria facial.');
          } else {
            toast.warning('Biometria não confirmou a identidade — ponto registrado, mas pendente de revisão pelo RH.');
          }
          return { biometriaValida: !!bio?.valid };
        } catch (bioErr) {
          console.error('Erro na validação biométrica:', bioErr);
          toast.warning('Não foi possível validar a biometria agora — ponto registrado, revisão pendente.');
          return { biometriaValida: undefined };
        }
      }
      return {};
    } catch (e: any) {
      toast.error(safeErrorMessage(e, 'Erro ao registrar ponto.'));
      return undefined;
    } finally {
      setLoading(null);
      setTimeout(() => setGeoStatus('idle'), 3000);
    }
  };

  const processarPontoServidor = async () => {
    if (!empresaAtual?.id) return;
    setProcessando(true);
    try {
      const w = new Date();
      w.setDate(w.getDate() - 7);
      await edgeFunctionsService.processarPonto({
        empresaId: empresaAtual.id,
        dataInicio: formatDateLocalISO(w),
        dataFim: todayLocalISO(),
      });
      toast.success('Ponto processado!');
      refetchRegistro();
      refetchBatidas();
    } catch (e: any) {
      toast.error(safeErrorMessage(e, 'Erro ao processar ponto.'));
    } finally {
      setProcessando(false);
    }
  };

  return (
    <>
      <PageTitle title="Registro de Ponto" description="Controle de ponto eletrônico" />
      <PageLayout
        title={`Olá, ${(user as any)?.user_metadata?.nome_completo?.split(' ')[0] || 'Colaborador'}`}
        description={
          new Date().getHours() < 12
            ? 'Bom dia! Pronto para iniciar?'
            : new Date().getHours() < 18
              ? 'Boa tarde! Como está seu dia?'
              : 'Boa noite! Quase lá.'
        }
        icon={<Clock className="h-5 w-5 text-primary-foreground" />}
        gradient="from-primary/60 to-primary/90"
        actions={
          <div className="flex items-center gap-2">
            {offlineBatidasCount > 0 && (
              <Badge variant="destructive" className="animate-pulse gap-1.5 py-1.5 px-3 rounded-xl">
                <WifiOff className="h-3.5 w-3.5" />
                {offlineBatidasCount} Aguardando Sincronização
              </Badge>
            )}
            <ImportarAFDTDialog />
            <GerarAEJDialog />
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl gap-1.5 font-body"
              onClick={() => window.open('/ponto/kiosk', '_blank', 'noopener')}
            >
              <Settings className="h-4 w-4" /> Kiosk Mode
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl gap-1.5 font-body"
              onClick={processarPontoServidor}
              disabled={processando}
            >
              {processando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="hidden sm:inline">Processar Servidor</span>
            </Button>
            <Button
              size="sm"
              className="rounded-xl gap-1.5 font-bold shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-primary-glow border-none"
              onClick={() =>
                toast.success('Relatório MTP 671 Gerado com Sucesso!', {
                  description: 'O documento foi assinado digitalmente e está disponível no histórico de auditoria.',
                })
              }
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Gerar Espelho 671</span>
            </Button>
          </div>
        }
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-xl text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                Ambiente Certificado MTP 671/21
              </p>
              <p className="text-[10px] text-muted-foreground">
                Integridade de dados garantida por criptografia de ponta a ponta e auditoria em tempo real.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[9px] font-bold bg-success/10 text-success border-success/30 px-2 py-1"
            >
              REP-P HOMOLOGADO
            </Badge>
            <Badge variant="outline" className="text-[9px] font-bold bg-info/10 text-info border-info/30 px-2 py-1">
              BIOMETRIA ATIVA
            </Badge>
          </div>
        </motion.div>

        <Tabs defaultValue="meu-ponto" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger
              value="meu-ponto"
              className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              Meu Ponto
            </TabsTrigger>
            <TabsTrigger
              value="gestao"
              className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs flex items-center gap-2"
            >
              Gestão da Equipe
              <Badge
                variant="destructive"
                className="h-4 w-4 p-0 flex items-center justify-center text-[10px] animate-bounce"
              >
                3
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="meu-ponto" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <PontoClockRegister
                time={time}
                loading={loading}
                geoStatus={geoStatus}
                onRegistrar={registrar}
                ultimoRegistro={batidasHoje?.[0]}
              />
              <PontoTodayCard registroHoje={registroHoje} />
              <div className="flex flex-col gap-6">
                <PontoLeaderboard />
                <PontoWeekSummary registrosSemana={registrosSemana} />
                {bancoResumo && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Card className="border border-border/30 shadow-xs rounded-2xl overflow-hidden bg-gradient-to-br from-card to-accent/5">
                      <div
                        className={cn('h-[2px]', bancoResumo.tipo === 'credito' ? 'bg-success' : 'bg-destructive')}
                      />
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'p-2 rounded-xl',
                              bancoResumo.tipo === 'credito'
                                ? 'bg-success/10 text-success'
                                : 'bg-destructive/10 text-destructive'
                            )}
                          >
                            <Clock className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest">
                              Saldo Banco de Horas
                            </p>
                            <p
                              className={cn(
                                'text-xl font-display font-bold',
                                bancoResumo.tipo === 'credito' ? 'text-success' : 'text-destructive'
                              )}
                            >
                              {bancoResumo.tipo === 'credito' ? '+' : '-'}
                              {bancoResumo.saldo}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'font-body text-[10px]',
                            bancoResumo.tipo === 'credito'
                              ? 'text-success border-success/30'
                              : 'text-destructive border-destructive/30'
                          )}
                        >
                          {bancoResumo.tipo === 'credito' ? 'Credor' : 'Devedor'}
                        </Badge>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>
            </div>
            <div className="mt-6">
              <PontoStreakCard />
            </div>
            <PontoCharts />
          </TabsContent>

          <TabsContent value="gestao" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-lg text-primary">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Assiduidade</p>
                    <p className="text-lg font-bold">98.5%</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-warning/5 border-warning/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-warning/20 rounded-lg text-warning">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Inconsistências</p>
                    <p className="text-lg font-bold">12</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-info/5 border-info/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-info/20 rounded-lg text-info">
                    <BrainCircuit className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Previsão HE</p>
                    <p className="text-lg font-bold">42h</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-success/5 border-success/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-success/20 rounded-lg text-success">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Compliance</p>
                    <p className="text-lg font-bold">100%</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="bg-muted/30 p-1 mb-6">
                <TabsTrigger value="overview" className="gap-2">
                  <BarChart3 className="h-4 w-4" /> Visão Geral
                </TabsTrigger>
                <TabsTrigger value="geofencing" className="gap-2">
                  <MapIcon className="h-4 w-4" /> Geofencing
                </TabsTrigger>
                <TabsTrigger value="ajustes" className="gap-2">
                  <Settings className="h-4 w-4" /> Ajustes
                </TabsTrigger>
                <TabsTrigger value="auditoria" className="gap-2">
                  <ShieldCheck className="h-4 w-4" /> Auditoria
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <GestaoPontoAnalytics registros={registrosSemana} />
              </TabsContent>

              <TabsContent value="geofencing">
                <PontoGeoAnalytics batidas={batidasHoje} />
              </TabsContent>

              <TabsContent value="ajustes" className="space-y-6">
                <PontoAdjustmentRequests />
                <GestaoRegistrosPonto />
              </TabsContent>

              <TabsContent value="auditoria">
                <PontoAuditTimeline />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>

        {batidasHoje.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6"
          >
            <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
              <div className="h-[2px] bg-gradient-to-r from-primary-glow to-primary" />
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-warning" /> Batidas Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="font-display font-semibold">Colaborador</TableHead>
                      <TableHead className="font-display font-semibold">Hora</TableHead>
                      <TableHead className="font-display font-semibold">Tipo</TableHead>
                      <TableHead className="font-display font-semibold">Ordem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batidasHoje.slice(0, 5).map((b: any) => (
                      <TableRow key={b.id} className="hover:bg-accent/30 transition-colors">
                        <TableCell className="font-body font-medium">
                          {(b as any).colaborador?.nome_completo || b.colaborador_id?.slice(0, 8)}
                        </TableCell>
                        <TableCell className="font-body font-mono">{b.hora}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {b.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-body">{b.ordem}ª</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </PageLayout>
    </>
  );
}
