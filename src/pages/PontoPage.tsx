import { PageTitle } from '@/components/PageTitle';
import { cn } from '@/lib/utils';
import { VERMELHO_SOLIDO } from '@/components/ponto/vermelhoVibrante';
import { ACAO_ESPELHO_671, ACAO_MAIS_ACOES } from '@/components/ponto/acoesCabecalhoPonto';
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { ImportarAFDTDialog } from '@/components/ponto/ImportarAFDTDialog';
import { GerarAEJDialog } from '@/components/ponto/GerarAEJDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from '@/components/dashboard/MetricCard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Clock,
  RefreshCw,
  Loader2,
  AlertCircle,
  Settings,
  ClipboardList,
  WifiOff,
  ShieldCheck,
  Zap,
  BarChart3,
  MoreHorizontal,
  Map as MapIcon,
} from 'lucide-react';
import { pontoService, batidasPontoService } from '@/services';
import { useAuth } from '@/contexts';
import {
  useEmpresas,
  usePontoOffline,
  useColaboradoresEquipePonto,
  useRegistrosPontoEmpresa,
  useSolicitacoesAjustePontoPendentes,
  periodoDoMesCorrente,
} from '@/hooks';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { PontoAdjustmentRequests } from '@/components/ponto/PontoAdjustmentRequests';
import { PontoClockRegister } from '@/components/ponto/PontoClockRegister';
import { PontoTodayCard } from '@/components/ponto/PontoTodayCard';
import { PontoEquipeStatusCard } from '@/components/ponto/PontoEquipeStatusCard';
import { PontoBancoHorasCard, type BancoHorasResumo } from '@/components/ponto/PontoBancoHorasCard';
import { PontoHorasSemanaCard } from '@/components/ponto/PontoHorasSemanaCard';
import { PontoPendenciasCard } from '@/components/ponto/PontoPendenciasCard';
import { PontoFechamentoCard } from '@/components/ponto/PontoFechamentoCard';
import { PontoUltimasBatidasCard } from '@/components/ponto/PontoUltimasBatidasCard';
import { PontoIndicadoresKpi } from '@/components/ponto/PontoIndicadoresKpi';
import { edgeFunctionsService } from '@/services/edgeFunctionsService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SlidingIndicator } from '@/components/ui/sliding-indicator';
import { AuditoriaPonto } from '@/components/ponto/AuditoriaPonto';
import { GestaoPontoAnalytics } from '@/components/ponto/GestaoPontoAnalytics';
import { PontoGeofencingPainel } from '@/components/ponto/PontoGeofencingPainel';
import { formatDateLocalISO, todayLocalISO } from '@/utils/dateLocal';
import { resumirEquipeDoDia, temSaidaPendente } from '@/utils/pontoEquipe';
import { minutosDeDuracao, formatarMinutosDuracao } from '@/utils/pontoDuracao';
import { loggerService } from '@/services/loggerService';

export default function PontoPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [time, setTime] = useState(new Date());
  const [geoStatus, setGeoStatus] = useState<'idle' | 'capturing' | 'success' | 'error' | 'out_of_range'>('idle');
  const [processando, setProcessando] = useState(false);
  /** Aba ativa controlada: os cards de resumo levam o usuário para "Gestão". */
  const [tabAtiva, setTabAtiva] = useState<'meu-ponto' | 'gestao'>('meu-ponto');
  /**
   * Aba INTERNA da Gestão (Visão Geral / Geofencing / Registros / Auditoria).
   * São exatamente QUATRO abas — a Central de Ajustes é o corpo de Registros,
   * não uma quinta aba. Passou a ser controlada para o indicador lime do
   * seletor em barra cheia deslizar sob a coluna ativa — mesmo mecanismo já
   * usado no seletor "Meu Ponto / Gestão" logo acima.
   */
  const [abaGestao, setAbaGestao] = useState('overview');
  const indiceAbaGestao = Math.max(0, ['overview', 'geofencing', 'registros', 'auditoria'].indexOf(abaGestao));
  const { user } = useAuth();
  const { addOffline, offlineBatidasCount } = usePontoOffline();
  const { empresaAtual } = useEmpresas();
  const queryClient = useQueryClient();

  // Colaborador logado (email -> colaboradores.id): usado só para o card
  // "Hoje" resolver/editar a própria escala (escalas_trabalho -> turnos).
  const { data: meuColaboradorId } = useQuery({
    queryKey: ['meu-colaborador-id', user?.id],
    queryFn: async () => {
      if (!user?.email) return null;
      const { data } = await supabase.from('colaboradores').select('id').eq('email', user.email).maybeSingle();
      return data?.id ?? null;
    },
    enabled: !!user?.email,
  });

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
    queryFn: async (): Promise<BancoHorasResumo | null> => {
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
      };
    },
    enabled: !!user?.id,
  });

  // ---------------------------------------------------------------------------
  // Resumos do dashboard (Situação da Equipe, Pendências e Fechamento)
  // ---------------------------------------------------------------------------
  // Fonte única: colaboradores ativos + registros da competência corrente,
  // vindos de `usePontoDashboard` (cache por empresa). Os cards não abrem
  // consulta própria — se abrissem, a tela mostraria números divergentes para a
  // mesma pergunta e multiplicaria as idas ao banco.
  const periodoCompetencia = useMemo(() => periodoDoMesCorrente(), []);
  const { data: colaboradoresEquipe = [] } = useColaboradoresEquipePonto();
  const { data: registrosCompetencia = [] } = useRegistrosPontoEmpresa(periodoCompetencia);
  const { data: ajustesPendentes = 0 } = useSolicitacoesAjustePontoPendentes();

  // Mesma regra do card da equipe: a última batida do dia decide quem está em
  // jornada (`saida` encerra a jornada; `saida_almoco` não).
  const resumoEquipe = useMemo(
    () => resumirEquipeDoDia(batidasHoje, colaboradoresEquipe.length),
    [batidasHoje, colaboradoresEquipe.length]
  );

  // Fechamento = colaboradores com registro no mês (processados) + registros
  // com saída não marcada (definição de `PontoInconsistencyPanel`).
  const fechamento = useMemo(() => {
    const processados = new Set(registrosCompetencia.map((registro) => registro.colaborador_id)).size;
    const pendentes = registrosCompetencia.filter(temSaidaPendente).length;
    return { processados, pendentes };
  }, [registrosCompetencia]);

  // Indicadores da aba Gestão.
  //
  // Antes eram quatro números fixos na tela (98,5% / 12 / 42h / 100%) que não
  // vinham de consulta nenhuma: podiam contradizer os cards do "Meu Ponto" na
  // mesma sessão. Agora saem do mesmo recorte da competência já carregado
  // acima — sem consulta extra e sem número inventado.
  const indicadoresGestao = useMemo(() => {
    const horasExtrasMinutos = registrosCompetencia.reduce(
      (soma, registro) => soma + minutosDeDuracao(registro.horas_extras),
      0
    );
    const colaboradoresComRegistro = new Set(registrosCompetencia.map((registro) => registro.colaborador_id)).size;
    const diasComRegistro = new Set(registrosCompetencia.map((registro) => registro.data)).size;

    return {
      registros: registrosCompetencia.length,
      colaboradoresComRegistro,
      diasComRegistro,
      horasExtras: formatarMinutosDuracao(horasExtrasMinutos),
    };
  }, [registrosCompetencia]);

  // Selo do cabeçalho do card de registro: vem do estado REAL do dia (atraso
  // apurado, jornada encerrada, entrada ainda não batida) — nunca um rótulo
  // fixo de vitrine.
  const statusJornada = useMemo(() => {
    if (!registroHoje?.entrada_1) return { rotulo: 'Jornada não iniciada', tom: 'outline' as const };
    if (registroHoje?.saida_1) return { rotulo: 'Jornada encerrada', tom: 'outline' as const };
    if (Number(registroHoje?.atraso_minutos) > 0) {
      return { rotulo: `Atraso · ${registroHoje.atraso_minutos} min`, tom: 'warning' as const };
    }
    return { rotulo: 'Dentro do horário', tom: 'success' as const };
  }, [registroHoje]);

  /** Recarrega o dia + os resumos da competência (ação "Atualizar dados"). */
  const atualizarDados = () => {
    refetchRegistro();
    refetchBatidas();
    queryClient.invalidateQueries({ queryKey: ['ponto-equipe-ativa'] });
    queryClient.invalidateQueries({ queryKey: ['ponto-registros-competencia'] });
    queryClient.invalidateQueries({ queryKey: ['ponto-ajustes-pendentes'] });
    toast.success('Dados de ponto atualizados.');
  };

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
          loggerService.error(
            'Erro na validação biométrica',
            { colaboradorId: colab.id, batidaId: batida.id },
            bioErr instanceof Error ? bioErr : new Error(String(bioErr))
          );
          toast.warning('Não foi possível validar a biometria agora — ponto registrado, revisão pendente.');
          return { biometriaValida: undefined };
        }
      }
      return {};
    } catch (e: unknown) {
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
    } catch (e: unknown) {
      toast.error(safeErrorMessage(e, 'Erro ao processar ponto.'));
    } finally {
      setProcessando(false);
    }
  };

  return (
    <>
      <PageTitle title="Registro de Ponto" description="Controle de ponto eletrônico" />
      <PageLayout
        title="Controle de Ponto"
        description="Acompanhe a jornada, valide ocorrências e mantenha a equipe em conformidade."
        icon={<Clock className="h-5 w-5 text-primary-foreground" />}
        gradient="from-primary/60 to-primary/90"
        // Ritmo vertical desta página: 16px (o shell usa 24px por padrão). O
        // dashboard tem 4 faixas empilhadas — cabeçalho, seletor "Meu Ponto |
        // Gestão da Equipe", banner MTP e conteúdo da aba. Com 24px entre cada
        // bloco a 1ª linha de cards sairia da dobra; 16px mantém o conjunto
        // compacto e é o mesmo passo vertical usado dentro do `<Tabs>`.
        className="space-y-4"
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {offlineBatidasCount > 0 && (
              <Badge variant="destructive" className="animate-pulse gap-1.5 py-1.5 px-3 rounded-xl">
                <WifiOff className="h-3.5 w-3.5" />
                {offlineBatidasCount} Aguardando Sincronização
              </Badge>
            )}
            {/* Ordem do cabeçalho: espelho legal → importação → geração → menu.
                Os quatro controles têm a mesma altura/raio (36px / `rounded-lg`)
                para a faixa ficar alinhada como na referência, e o visual dos
                quatro vem de `ponto/acoesCabecalhoPonto.ts` — a MESMA linguagem
                de halo do "Exportar"/"Sincronizar" do Dashboard principal, com
                o lime marcando a ação principal (Gerar AEJ). */}
            <Button
              size="sm"
              variant="outline"
              className={ACAO_ESPELHO_671}
              onClick={() =>
                toast.success('Relatório MTP 671 Gerado com Sucesso!', {
                  description: 'O documento foi assinado digitalmente e está disponível no histórico de auditoria.',
                })
              }
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Espelho 671</span>
            </Button>
            <ImportarAFDTDialog />
            <GerarAEJDialog />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className={ACAO_MAIS_ACOES}>
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">Mais ações</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground font-body">
                  Operação
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={processarPontoServidor}
                  disabled={processando}
                  className="gap-2 font-body cursor-pointer"
                >
                  {processando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Processar no servidor
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => window.open('/ponto/kiosk', '_blank', 'noopener')}
                  className="gap-2 font-body cursor-pointer"
                >
                  <Settings className="h-4 w-4" />
                  Abrir Kiosk Mode
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={atualizarDados} className="gap-2 font-body cursor-pointer">
                  <RefreshCw className="h-4 w-4" />
                  Atualizar dados
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      >
        {/* SELETOR "Meu Ponto | Gestão da Equipe" — MESMA composição, MESMA pele e
            MESMA animação da TabList "Em andamento / Concluídos" da Jornada de
            Onboarding: `inline-grid` (shrink-to-fit — a TabList NÃO ocupa a largura
            da página, mantém o formato COMPACTO da referência), container
            `rounded-xl border border-border/40 bg-muted/40 p-1`, gatilhos
            `rounded-lg border border-transparent px-3 py-1.5 text-xs` (mesma
            altura, padding, raio, tipografia e peso da referência) e o
            `SlidingIndicator` COMPARTILHADO de `ui/sliding-indicator.tsx`: um
            contorno lime ÚNICO, permanente e irmão dos botões, que desliza por
            `transform` (CSS puro/GPU — 420ms em cubic-bezier(0.22,1,0.36,1)) de
            uma coluna para a outra. Nunca há fade nem dois indicadores: o gatilho
            ativo fica com fundo transparente
            (`data-[state=active]:bg-transparent`) e o texto em verde-lima
            (`text-primary`) — só a pílula de borda lime fica visível sobre o
            `bg-muted/40` do container; o inativo permanece discreto
            (`text-muted-foreground` herdado da TabList), sem realce.
            ORDEM DA PÁGINA: cabeçalho → seletor → banner MTP 671/21 → conteúdo.
            Por isso o `<Tabs>` abre AQUI, antes do banner: o seletor fica
            imediatamente abaixo do cabeçalho, alinhado à esquerda como o banner e
            os cards (`inline-grid`, nunca `w-full`), e o banner desceu um nível na
            hierarquia sem nenhuma alteração visual própria.
            O contador de ajustes pendentes viaja DENTRO do segundo gatilho — à
            direita do texto, centralizado e sem mexer na altura do seletor (os
            16px do badge cabem nos 28px do gatilho) nem na animação do indicador.
            `atual` acompanha a aba ativa (0 = Meu Ponto, 1 = Gestão da Equipe). */}
        <Tabs
          value={tabAtiva}
          onValueChange={(valor) => setTabAtiva(valor as 'meu-ponto' | 'gestao')}
          className="space-y-4"
        >
          <TabsList className="relative inline-grid h-auto grid-cols-2 gap-0 rounded-xl border border-border/40 bg-muted/40 p-1">
            <SlidingIndicator atual={tabAtiva === 'gestao' ? 1 : 0} />
            <TabsTrigger
              value="meu-ponto"
              className="relative z-10 gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-xs data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              Meu Ponto
            </TabsTrigger>
            <TabsTrigger
              value="gestao"
              className="relative z-10 gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-xs data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              Gestão da Equipe
              {ajustesPendentes > 0 && (
                <Badge
                  variant="destructive"
                  className={cn(
                    'h-4 min-w-4 px-1 flex items-center justify-center text-[10px] tabular-nums',
                    VERMELHO_SOLIDO
                  )}
                  aria-label={`${ajustesPendentes} ajustes pendentes`}
                >
                  {ajustesPendentes}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Banner de certificação: faixa horizontal de largura total, agora
            logo ABAIXO do seletor — a hierarquia da página é cabeçalho →
            seletor → banner → conteúdo da aba. Compacta (uma linha no desktop)
            para não empurrar a primeira linha de cards para fora da dobra. O
            markup abaixo NÃO foi redesenhado: fundo, bordas, ícone, textos e
            os selos REP-P HOMOLOGADO / BIOMETRIA ATIVA seguem idênticos. */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/5 border border-primary/20 rounded-xl px-3 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 bg-primary/20 rounded-lg text-primary shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-widest text-primary truncate">
                  Ambiente Certificado MTP 671/21
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  Integridade de dados garantida por criptografia de ponta a ponta e auditoria em tempo real.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge
                variant="outline"
                className="text-[9px] font-medium bg-success/10 text-success border-success/30 px-2 py-0.5"
              >
                REP-P HOMOLOGADO
              </Badge>
              <Badge
                variant="outline"
                className="text-[9px] font-medium bg-info/10 text-info border-info/30 px-2 py-0.5"
              >
                BIOMETRIA ATIVA
              </Badge>
            </div>
          </motion.div>

          <TabsContent value="meu-ponto" className="space-y-3">
            {/* Linha 0 — KPI Cards dos últimos 7 dias (Pontualidade · Média
                diária · Saldo da semana · Dias com registro). Primeira seção de
                informações da aba, acima dos cards operacionais. Cada indicador
                é um card independente (`MetricCard`, o KPI do Dashboard
                Principal) com as animações de entrada e hover do sistema.
                FILA DE ENTRADA: estes quatro KPIs ocupam os slots 0–3 da
                cascata (`custom` do `cardVariants`, 120ms entre um card e o
                próximo) e os oito cards abaixo foram deslocados para 4–11 — o
                teto de `MAX_SLOT_ENTRADA_CARD_GLOBAL`. Ao inserir/remover card
                nesta aba, renumerar os `custom` na ordem visual de leitura. */}
            <PontoIndicadoresKpi registrosSemana={registrosSemana} />

            {/* Linha 1 — Registro de Ponto · Jornada de Hoje · Situação da Equipe.
                Três colunas iguais a partir de 1280px (`xl`); entre 1024px e
                1279px vira 2 colunas (tablet) e abaixo disso 1 coluna (mobile),
                para não comprimir rótulos.
                NOTA: não trocar `xl` por `min-[1200px]` — em Tailwind v4 o
                variante de mídia arbitrário é emitido ANTES de `lg`, então
                `lg:grid-cols-2` venceria a cascata e a linha ficaria em 2
                colunas mesmo em telas largas. */}
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              <PontoClockRegister
                time={time}
                loading={loading}
                geoStatus={geoStatus}
                onRegistrar={registrar}
                statusJornada={statusJornada}
              />
              <PontoTodayCard
                registroHoje={registroHoje}
                colaboradorId={meuColaboradorId || ''}
                empresaId={empresaAtual?.id}
                onVerDiaCompleto={() => setTabAtiva('gestao')}
              />
              <PontoEquipeStatusCard
                batidasHoje={batidasHoje}
                colaboradores={colaboradoresEquipe}
                onVerEquipe={() => setTabAtiva('gestao')}
              />
            </div>

            {/* Linha 2 — Banco de Horas · Pendências de Ponto · Fechamento
                (mesmo racional de colunas da linha 1). */}
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              <PontoBancoHorasCard
                bancoResumo={bancoResumo}
                registrosSemana={registrosSemana}
                onVerDetalhes={() => setTabAtiva('gestao')}
              />
              <PontoPendenciasCard
                jornadasAbertas={resumoEquipe.emJornada}
                ajustesPendentes={ajustesPendentes}
                colaboradoresSemRegistro={resumoEquipe.semBatida}
                onRevisar={() => setTabAtiva('gestao')}
              />
              <PontoFechamentoCard
                inicio={periodoCompetencia.inicio}
                fim={periodoCompetencia.fim}
                processados={fechamento.processados}
                colaboradores={colaboradoresEquipe.length}
                pendentes={fechamento.pendentes}
                onAcompanhar={() => setTabAtiva('gestao')}
              />
            </div>

            {/* Linha 3 — Horas Trabalhadas (44%) · Últimas Batidas (56%) */}
            <div className="grid gap-3 lg:grid-cols-[minmax(0,0.44fr)_minmax(0,0.56fr)]">
              <div className="min-w-0">
                <PontoHorasSemanaCard registrosSemana={registrosSemana} onVerRelatorio={() => setTabAtiva('gestao')} />
              </div>
              <div className="min-w-0">
                <PontoUltimasBatidasCard batidas={batidasHoje} onVerTodas={() => setTabAtiva('gestao')} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="gestao" className="space-y-4">
            <Tabs value={abaGestao} onValueChange={setAbaGestao} className="w-full space-y-4">
              {/* Seletor em BARRA CHEIA: quatro colunas de largura IGUAL, ícone +
                  rótulo centralizados e o indicador lime deslizando sob a aba
                  ativa — a peça compartilhada `ui/sliding-indicator`. */}
              <TabsList className="relative grid h-auto w-full grid-cols-4 items-stretch gap-0 rounded-xl border border-border/40 bg-muted/30 p-1">
                <SlidingIndicator
                  atual={indiceAbaGestao}
                  total={4}
                  className="bottom-0 top-auto h-[2px] rounded-full border-0 bg-primary"
                />
                <TabsTrigger
                  value="overview"
                  className="relative z-10 gap-1.5 rounded-lg px-2 py-2 text-[11px] font-medium text-muted-foreground transition-colors data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none sm:text-xs"
                >
                  <BarChart3 className="h-4 w-4 shrink-0" />
                  <span className="truncate">Visão Geral</span>
                </TabsTrigger>
                <TabsTrigger
                  value="geofencing"
                  className="relative z-10 gap-1.5 rounded-lg px-2 py-2 text-[11px] font-medium text-muted-foreground transition-colors data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none sm:text-xs"
                >
                  <MapIcon className="h-4 w-4 shrink-0" />
                  <span className="truncate">Geofencing</span>
                </TabsTrigger>
                <TabsTrigger
                  value="registros"
                  className="relative z-10 gap-1.5 rounded-lg px-2 py-2 text-[11px] font-medium text-muted-foreground transition-colors data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none sm:text-xs"
                >
                  <ClipboardList className="h-4 w-4 shrink-0" />
                  <span className="truncate">Registros</span>
                </TabsTrigger>
                <TabsTrigger
                  value="auditoria"
                  className="relative z-10 gap-1.5 rounded-lg px-2 py-2 text-[11px] font-medium text-muted-foreground transition-colors data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none sm:text-xs"
                >
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span className="truncate">Auditoria</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* Faixa de KPI — a MESMA peça dos KPIs do Dashboard
                    (`MetricCard`), com os números de antes, agora ACIMA dos
                    gráficos para a leitura começar pelo resumo. */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    title="Registros na Competência"
                    value={indicadoresGestao.registros}
                    description={`${indicadoresGestao.colaboradoresComRegistro} colaboradores · ${indicadoresGestao.diasComRegistro} dias`}
                    icon={Clock}
                    tone="primary"
                    index={0}
                  />
                  <MetricCard
                    title="Inconsistências"
                    value={fechamento.pendentes}
                    description="saídas não marcadas"
                    icon={AlertCircle}
                    tone="warning"
                    index={1}
                  />
                  <MetricCard
                    title="Horas Extras no Mês"
                    value={indicadoresGestao.horasExtras}
                    description="somatório da competência"
                    icon={Zap}
                    tone="info"
                    index={2}
                  />
                  <MetricCard
                    title="Ajustes Pendentes"
                    value={ajustesPendentes}
                    description="aguardando validação do RH"
                    icon={ShieldCheck}
                    tone="success"
                    index={3}
                  />
                </div>

                <GestaoPontoAnalytics registros={registrosSemana} />
              </TabsContent>

              <TabsContent value="geofencing">
                <PontoGeofencingPainel empresaId={empresaAtual?.id} />
              </TabsContent>

              <TabsContent value="registros" className="space-y-4">
                {/* Registros = Central de Ajustes DIRETAMENTE, sem navegação
                    secundária: são SOLICITAÇÕES de ajuste de ponto (cabeçalho,
                    busca, filtros, 4 KPIs, chips de status, período, tabela,
                    painel de detalhes, aprovação/rejeição e paginação). */}
                <PontoAdjustmentRequests />
              </TabsContent>

              <TabsContent value="auditoria">
                <AuditoriaPonto />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </PageLayout>
    </>
  );
}
