import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Clock,
  LogIn,
  Coffee,
  LogOut,
  MapPin,
  WifiOff,
  RefreshCw,
  Scan,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef, useCallback } from 'react';
import { pontoOfflineService } from '@/services/pontoOfflineService';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts';
import { supabase } from '@/integrations/supabase/client';
interface PontoClockRegisterProps {
  time: Date;
  loading: string | null;
  geoStatus: 'idle' | 'capturing' | 'success' | 'error' | 'out_of_range';
  onRegistrar: (
    tipo: 'entrada' | 'saida_almoco' | 'retorno_almoco' | 'saida',
    options?: { foto_biometria_url?: string | null; foto_base64?: string | null }
  ) => Promise<{ biometriaValida?: boolean } | undefined>;
  ultimoRegistro?: any;
}

const buttons = [
  { tipo: 'entrada' as const, label: 'Entrada', icon: LogIn, gradient: 'from-primary to-primary-glow' },
  { tipo: 'saida_almoco' as const, label: 'Saída Almoço', icon: Coffee, gradient: 'from-primary-glow to-primary' },
  { tipo: 'retorno_almoco' as const, label: 'Retorno Almoço', icon: Coffee, gradient: 'from-primary to-primary-glow' },
  { tipo: 'saida' as const, label: 'Saída', icon: LogOut, gradient: 'from-destructive to-destructive/70/70' },
];

export function PontoClockRegister({ time, loading, geoStatus, onRegistrar, ultimoRegistro }: PontoClockRegisterProps) {
  const { user } = useAuth();
  const [offlineQueueSize, setOfflineQueueSize] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showFaceScan, setShowFaceScan] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStage, setScanStage] = useState('');
  const [scanOutcome, setScanOutcome] = useState<'confirmado' | 'pendente' | null>(null);
  const [selectedTipo, setSelectedTipo] = useState<any>(null);
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
      console.error('Erro na sincronização automática', e);
    } finally {
      setIsSyncing(false);
      setOfflineQueueSize(pontoOfflineService.getQueueSize());
    }
  }, [isSyncing]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      console.error('Erro ao acessar câmera:', err);
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
    } catch (e: any) {
      toast.error(safeErrorMessage(e, 'Erro no registro offline.'));
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
        <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/90" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5 font-display">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/60 to-primary/90">
              <Clock className="h-4 w-4 text-primary-foreground" />
            </div>
            Registrar Ponto
            {offlineQueueSize > 0 && (
              <Badge
                variant="outline"
                className="ml-auto text-[10px] bg-warning/10 text-warning border-warning/20 animate-pulse"
              >
                <WifiOff className="h-3 w-3 mr-1" /> {offlineQueueSize} pendentes
              </Badge>
            )}
            {offlineQueueSize > 0 && navigator.onLine && (
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={handleSync} disabled={isSyncing}>
                <RefreshCw className={cn('h-3 w-3', isSyncing && 'animate-spin')} />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-5xl font-display font-bold text-center mb-8 tabular-nums bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            {time.toLocaleTimeString('pt-BR')}
          </div>
          <p className="text-center text-sm text-muted-foreground font-body mb-4">
            {time.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {buttons.map(({ tipo, label, icon: Icon, gradient }) => (
              <Button
                key={tipo}
                onClick={() => startScan(tipo)}
                disabled={loading !== null}
                className={cn(
                  'h-12 rounded-xl bg-gradient-to-r text-primary-foreground hover:opacity-90 shadow-lg transition-all font-body font-medium',
                  gradient
                )}
              >
                {loading === tipo && geoStatus === 'capturing' ? (
                  <>
                    <MapPin className="h-4 w-4 mr-2 animate-bounce" />
                    Capturando GPS...
                  </>
                ) : (
                  <>
                    <Icon className="h-4 w-4 mr-2" />
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
                    <p className="font-display font-bold text-primary">Ponto Confirmado!</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                      +50 XP • Assiduidade
                    </p>
                  </Card>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {ultimoRegistro && (
            <div className="mt-4 p-3 rounded-xl bg-muted/30 border border-border/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-success/20 text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-[9px] uppercase font-bold text-muted-foreground">Último Registro</p>
                  <p className="text-xs font-bold capitalize">
                    {ultimoRegistro.tipo.replace(/_/g, ' ')} às {ultimoRegistro.hora}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-[8px] bg-background">
                HOJE
              </Badge>
            </div>
          )}

          <p className="text-xs text-muted-foreground font-body text-center mt-3 flex items-center justify-center gap-1">
            <MapPin className="h-3 w-3" />
            {geoStatus === 'capturing'
              ? 'Capturando localização...'
              : geoStatus === 'success'
                ? '✅ Localização capturada'
                : geoStatus === 'error'
                  ? '⚠️ GPS indisponível'
                  : geoStatus === 'out_of_range'
                    ? '📍 Fora do raio permitido'
                    : 'Geolocalização Ativa (671/21)'}
          </p>
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
                  className="text-primary-glow transition-all duration-300"
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
