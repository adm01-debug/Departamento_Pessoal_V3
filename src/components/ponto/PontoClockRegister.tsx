import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOnMount } from '@/hooks/useMountEffects';
import { Clock, LogIn, Coffee, LogOut, MapPin, WifiOff, RefreshCw, Scan, ShieldCheck, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef, useCallback } from 'react';
import { pontoOfflineService } from '@/services/pontoOfflineService';
import { loggerService } from '@/services/loggerService';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { useAuth } from '@/contexts';
import { supabase } from '@/integrations/supabase/client';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { VERMELHO_BORDA, VERMELHO_FUNDO, VERMELHO_HOVER, VERMELHO_TEXTO } from './vermelhoVibrante';

/** Situação real da jornada do dia, calculada pela página a partir do registro. */
interface StatusJornada {
  rotulo: string;
  tom: 'success' | 'warning' | 'outline';
}

interface PontoClockRegisterProps {
  time: Date;
  loading: string | null;
  geoStatus: 'idle' | 'capturing' | 'success' | 'error' | 'out_of_range';
  onRegistrar: (
    tipo: 'entrada' | 'saida_almoco' | 'retorno_almoco' | 'saida',
    options?: { foto_biometria_url?: string | null; foto_base64?: string | null }
  ) => Promise<{ biometriaValida?: boolean } | undefined>;
  /** Selo do cabeçalho — vem do estado real do dia, nunca é fixo. */
  statusJornada?: StatusJornada;
}

const buttons = [
  { tipo: 'entrada' as const, label: 'Entrada', icon: LogIn, tom: 'primario' as const },
  { tipo: 'saida_almoco' as const, label: 'Saída Almoço', icon: Coffee, tom: 'contorno' as const },
  { tipo: 'retorno_almoco' as const, label: 'Retorno Almoço', icon: Coffee, tom: 'contorno' as const },
  { tipo: 'saida' as const, label: 'Saída', icon: LogOut, tom: 'perigo' as const },
];

export function PontoClockRegister({ time, loading, geoStatus, onRegistrar, statusJornada }: PontoClockRegisterProps) {
  const { user } = useAuth();
  const [offlineQueueSize, setOfflineQueueSize] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showFaceScan, setShowFaceScan] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStage, setScanStage] = useState('');
  const [scanOutcome, setScanOutcome] = useState<'confirmado' | 'pendente' | null>(null);
  const [selectedTipo, setSelectedTipo] = useState<'entrada' | 'saida_almoco' | 'retorno_almoco' | 'saida' | null>(
    null
  );
  const [showConfetti, setShowConfetti] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleSync = useCallback(async () => {
    if (isSyncing || !navigator.onLine) return;
    setIsSyncing(true);
    try {
      const result = await pontoOfflineService.syncOfflineQueue();
      if (result.synced > 0) {
        toast.success(`${result.synced} registros offline sincronizados!`);
      }
    } catch (e) {
      loggerService.error('Erro na sincronização automática', {}, e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsSyncing(false);
      setOfflineQueueSize(pontoOfflineService.getQueueSize());
    }
  }, [isSyncing]);

  useOnMount(() => {
    setOfflineQueueSize(pontoOfflineService.getQueueSize());
    if (navigator.onLine) {
      handleSync();
    }
  });

  useEffect(() => {
    setOfflineQueueSize(pontoOfflineService.getQueueSize());
    if (navigator.onLine) {
      handleSync();
    }
    const interval = setInterval(() => {
      setOfflineQueueSize(pontoOfflineService.getQueueSize());
    }, 5000);
    return () => {
      clearInterval(interval);
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [stream, handleSync]);

  const startScan = async (tipo: any) => {
    setSelectedTipo(tipo);
    setShowFaceScan(true);
    setScanProgress(0);
    setScanStage('Posicione seu rosto...');
    setScanOutcome(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 480, height: 480 },
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;

      // Janela para o usuário se posicionar antes da captura (UX). Sobe só
      // até 60% — os 40% restantes refletem trabalho assíncrono REAL
      // (upload + validação biométrica), não mais um timer decorativo até
      // 100% independente do resultado (achado da auditoria — "teatro").
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setScanProgress(Math.min(progress, 60));
        if (progress >= 60) {
          clearInterval(interval);
          captureAndFinalize(tipo, mediaStream);
        }
      }, 100);
    } catch (err) {
      loggerService.error(
        'Erro ao acessar câmera para biometria',
        {},
        err instanceof Error ? err : new Error(String(err))
      );
      toast.error('Acesso à câmera é obrigatório para biometria.');
      setShowFaceScan(false);
    }
  };

  const captureAndFinalize = async (tipo: any, mediaStream: MediaStream) => {
    let fotoUrl: string | null = null;
    let fotoBase64: string | null = null;
    setScanStage('Capturando foto...');
    setScanProgress(70);

    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);

      fotoBase64 = canvas.toDataURL('image/jpeg', 0.7);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.7));

      if (blob && user?.id && navigator.onLine) {
        setScanStage('Enviando foto...');
        setScanProgress(80);
        // eslint-disable-next-line react-hooks/purity -- roda em handler assíncrono de captura de foto (ação do usuário), não em render
        const fileName = `${user.id}/${Date.now()}.jpg`;
        const { error } = await supabase.storage.from('ponto-biometria').upload(fileName, blob);

        if (!error) {
          const {
            data: { publicUrl },
          } = supabase.storage.from('ponto-biometria').getPublicUrl(fileName);
          fotoUrl = publicUrl;
        }
      }
    }

    // Stop camera
    mediaStream.getTracks().forEach((track) => track.stop());
    setStream(null);
    await finalizeRegister(tipo, fotoUrl, fotoBase64);
    setShowFaceScan(false);
  };

  const finalizeRegister = async (
    tipo: 'entrada' | 'saida_almoco' | 'retorno_almoco' | 'saida',
    fotoUrl: string | null,
    fotoBase64: string | null
  ) => {
    if (!user) return;

    if (navigator.onLine) {
      setScanStage('Validando identidade...');
      setScanProgress(95);
      // Ponto é sempre registrado (não bloqueamos a jornada por uma falha de
      // biometria — risco trabalhista), mas o resultado real da validação
      // agora é aguardado e refletido honestamente na tela e no toast, em
      // vez de sempre exibir "Identidade Confirmada!" após um timer falso.
      const outcome = await onRegistrar(tipo, { foto_biometria_url: fotoUrl, foto_base64: fotoBase64 });
      setScanProgress(100);
      setScanOutcome(outcome?.biometriaValida ? 'confirmado' : 'pendente');
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
      return;
    }

    // Modo Offline
    try {
      const { data: colab } = await supabase.from('colaboradores').select('id').eq('email', user.email!).maybeSingle();
      if (!colab) throw new Error('Colaborador não identificado localmente');

      const hashPayload = {
        tipo,
        colaborador_id: colab.id,
        timestamp: new Date().toISOString(),
        dispositivoId: navigator.userAgent,
        foto_base64: fotoBase64,
      };

      await pontoOfflineService.queueRegistro({
        ...hashPayload,
        hash: pontoOfflineService.generateIntegrityHash(hashPayload),
      });

      setScanProgress(100);
      toast.warning(`Ponto registrado em modo OFFLINE. Será sincronizado quando a conexão voltar.`, {
        icon: <WifiOff className="h-4 w-4" />,
      });
      setOfflineQueueSize(pontoOfflineService.getQueueSize());
    } catch (e: unknown) {
      toast.error(safeErrorMessage(e, 'Erro no registro offline.'));
    }
  };

  return (
    <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible" className="h-full">
      <Card className="relative border border-border/40 shadow-xs rounded-xl overflow-hidden h-full flex flex-col">
        <CardContent className="p-3 flex flex-1 flex-col gap-2.5">
          {/* Cabeçalho: título + situação real da jornada (nunca um selo fixo). */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
              <Clock className="h-3.5 w-3.5" />
            </span>
            <p className="min-w-0 flex-1 line-clamp-2 font-display text-[13px] font-semibold leading-tight">
              Registro de Ponto
            </p>
            {offlineQueueSize > 0 && (
              <>
                <Badge
                  variant="outline"
                  className="shrink-0 text-[10px] bg-warning/10 text-warning border-warning/20"
                  title={`${offlineQueueSize} registros aguardando sincronização`}
                >
                  <WifiOff className="h-3 w-3 mr-1" /> {offlineQueueSize}
                </Badge>
                {navigator.onLine && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0"
                    onClick={handleSync}
                    disabled={isSyncing}
                    aria-label="Sincronizar registros offline"
                  >
                    <RefreshCw className={cn('h-3 w-3', isSyncing && 'animate-spin')} />
                  </Button>
                )}
              </>
            )}
            {statusJornada && (
              <Badge variant={statusJornada.tom} size="sm" className="shrink-0 font-body">
                {statusJornada.rotulo}
              </Badge>
            )}
          </div>
          {/* Relógio: elemento principal, centralizado no espaço que sobra entre
              o cabeçalho e os botões — é ele quem absorve a diferença de altura
              da linha (`flex-1` + `justify-center`), e não os botões nem o
              rodapé, que precisam ficar compactos e próximos. */}
          <div className="flex flex-1 flex-col items-center justify-center gap-1">
            <div className="font-display text-[clamp(26px,2.2vw,30px)] font-semibold leading-none tabular-nums">
              {time.toLocaleTimeString('pt-BR')}
            </div>
            <p className="text-[10px] text-muted-foreground font-body capitalize">
              {time.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Marcações em grade 2×2 — 40px de altura, 8px entre colunas e linhas. */}
          <div className="grid grid-cols-2 gap-2">
            {buttons.map(({ tipo, label, icon: Icon, tom }) => (
              <Button
                key={tipo}
                onClick={() => startScan(tipo)}
                disabled={loading !== null}
                variant={tom === 'primario' ? 'default' : 'outline'}
                className={cn(
                  'h-8 gap-1.5 rounded-lg px-2 font-body font-medium text-[11px] whitespace-nowrap',
                  tom === 'primario' && 'shadow-xs',
                  tom === 'perigo' && cn(VERMELHO_BORDA, VERMELHO_FUNDO, VERMELHO_TEXTO, VERMELHO_HOVER)
                )}
              >
                {loading === tipo && geoStatus === 'capturing' ? (
                  <>
                    <MapPin className="h-3.5 w-3.5 shrink-0 animate-bounce" />
                    Capturando GPS...
                  </>
                ) : (
                  <>
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {loading === tipo ? 'Registrando...' : label}
                  </>
                )}
              </Button>
            ))}
          </div>

          <AnimatePresence>
            {showConfetti && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center"
              >
                <div className="relative">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="absolute -inset-10"
                  >
                    {[...Array(12)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-2 h-2 rounded-full bg-primary-glow"
                        style={{
                          left: '50%',
                          top: '50%',
                          transform: `rotate(${i * 30}deg) translateY(-40px)`,
                        }}
                        animate={{ y: [-40, -100], opacity: [1, 0] }}
                        transition={{ duration: 1, delay: i * 0.05 }}
                      />
                    ))}
                  </motion.div>
                  <Card className="bg-background/90 backdrop-blur-md border-primary/30 p-4 shadow-2xl flex flex-col items-center gap-2">
                    <Sparkles className="h-8 w-8 text-primary animate-bounce" />
                    <p className="font-display font-medium text-primary">Ponto Confirmado!</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-widest">
                      +50 XP • Assiduidade
                    </p>
                  </Card>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Rodapé: apenas o status real da geolocalização. O detalhamento das
              marcações do dia vive na aba Espelho de Ponto — a ação "Ver
              detalhes" foi removida daqui para o rodapé não competir com o
              botão principal do card. */}
          <div className="flex min-w-0 items-center gap-1 text-[10px] text-muted-foreground font-body">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {geoStatus === 'capturing'
                ? 'Capturando localização...'
                : geoStatus === 'success'
                  ? 'Localização capturada'
                  : geoStatus === 'error'
                    ? 'GPS indisponível'
                    : geoStatus === 'out_of_range'
                      ? 'Fora do raio permitido'
                      : 'Geolocalização ativa (671/21)'}
            </span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showFaceScan} onOpenChange={setShowFaceScan}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-center flex items-center justify-center gap-2 text-primary-glow">
              <Scan className="h-5 w-5" /> Autenticação Biométrica Facial
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative w-64 h-64 rounded-full border-4 border-primary/30 overflow-hidden flex items-center justify-center bg-slate-800 shadow-[0_0_50px_rgba(34,197,94,0.1)]">
              {/* Fake scan line */}
              <motion.div
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="absolute left-0 right-0 h-1 bg-primary-glow/60 shadow-[0_0_15px_rgba(34,197,94,1)] z-10"
              />

              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover rounded-full" />
              <canvas ref={canvasRef} className="hidden" />

              {/* Progress Ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-primary/20"
                />
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 120}
                  strokeDashoffset={2 * Math.PI * 120 * (1 - scanProgress / 100)}
                  className="text-primary-glow transition-all duration-slow"
                />
              </svg>
            </div>

            <div className="mt-8 text-center space-y-2">
              <p className="text-sm font-medium animate-pulse text-primary-glow">
                {scanProgress < 100
                  ? scanStage || 'Analisando biometria...'
                  : scanOutcome === 'confirmado'
                    ? '✅ Identidade Confirmada!'
                    : scanOutcome === 'pendente'
                      ? '⚠️ Ponto registrado — biometria pendente de revisão'
                      : '✅ Ponto Registrado!'}
              </p>
              <div className="flex items-center gap-2 justify-center text-[10px] text-slate-400">
                <ShieldCheck className="h-3 w-3" />
                <span>Protocolo de Segurança MTP 671 Ativo</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
