import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, User, Fingerprint, WifiOff, RefreshCw, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { pontoService } from '@/services/pontoService';
import { pontoOfflineService } from '@/services/pontoOfflineService';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnMount } from '@/hooks/useMountEffects';
import { loggerService } from '@/services/loggerService';
import type { UiRecord } from '@/types/uiRecord';
import { useEmpresas } from '@/hooks/useEmpresas';

// E-035: identificador estável do quiosque e ponto geográfico fixo de
// fallback (usado somente quando o hardware do quiosque não expõe GPS).
const KIOSK_DEVICE_ID = 'KIOSK-01';
const KIOSK_GEO_FIXO = { latitude: -23.5505, longitude: -46.6333 } as const;

export default function PontoKioskPage() {
  const { empresaAtual } = useEmpresas();
  const [time, setTime] = useState(new Date());
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'pin' | 'action' | 'success'>('pin');
  const [selectedColab, setSelectedColab] = useState<UiRecord | null>(null);
  const [offlineQueueSize, setOfflineQueueSize] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = useCallback(async () => {
    if (isSyncing || !navigator.onLine) return;
    setIsSyncing(true);
    try {
      const result = await pontoOfflineService.syncOfflineQueue();
      if (result.synced > 0) {
        toast.success(`${result.synced} registros sincronizados automaticamente.`);
      }
    } catch (e) {
      loggerService.error('Erro na sincronização do quiosque', {}, e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsSyncing(false);
      setOfflineQueueSize(pontoOfflineService.getQueueSize());
    }
  }, [isSyncing]);

  useOnMount(() => {
    setOfflineQueueSize(pontoOfflineService.getQueueSize());
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setOfflineQueueSize(pontoOfflineService.getQueueSize());
      if (navigator.onLine && !isSyncing && pontoOfflineService.getQueueSize() > 0) {
        handleSync();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [isSyncing, handleSync]);

  useEffect(() => {
    const i = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 1 || !empresaAtual?.id) return;
    setLoading(true);
    try {
      // Matrícula identifica o colaborador dentro do tenant já autenticado.
      const { data: colab, error } = await supabase
        .from('colaboradores')
        .select('id, nome_completo, empresa_id')
        .eq('matricula', pin)
        .eq('empresa_id', empresaAtual.id)
        .maybeSingle();

      if (error) throw error;
      if (!colab) throw new Error('Matrícula inválida para a empresa ativa');

      setSelectedColab(colab);
      setStep('action');
      const firstName = (colab.nome_completo ?? 'Colaborador').split(' ')[0];
      speak(`Olá ${firstName}. Selecione o tipo de registro.`);
    } catch (e: unknown) {
      // E-035: falha de identificação também é auditada (tentativa inválida)
      loggerService.log('warn', 'KIOSK_PIN_INVALIDO', {
        dispositivo_id: KIOSK_DEVICE_ID,
        erro: safeErrorMessage(e, 'falha'),
      });
      toast.error(safeErrorMessage(e, 'Erro ao registrar ponto.'));
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  // E-035: geolocalização validada do quiosque (mesmo padrão do captureGeo
  // do PontoPage). Fallback para o ponto fixo apenas se o GPS estiver
  // indisponível ou a permissão for negada — origem sempre registrada.
  const captureKioskGeo = (): Promise<{
    latitude: number;
    longitude: number;
    precisao?: number;
    origem: 'gps' | 'fallback_fixo';
  }> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ ...KIOSK_GEO_FIXO, origem: 'fallback_fixo' });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            precisao: pos.coords.accuracy,
            origem: 'gps',
          }),
        () => resolve({ ...KIOSK_GEO_FIXO, origem: 'fallback_fixo' }),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });

  const registrar = async (tipo: any) => {
    setLoading(true);
    try {
      // E-035: geolocalização real do dispositivo (padrão captureGeo do
      // PontoPage), com fallback documentado para o ponto fixo do quiosque
      // quando o hardware não expõe GPS — nunca coordenada "muda".
      const geoReal = await captureKioskGeo();
      const geo = {
        latitude: geoReal.latitude,
        longitude: geoReal.longitude,
        precisao: geoReal.precisao,
        dispositivoId: KIOSK_DEVICE_ID,
        metadata: { origem_geo: geoReal.origem, canal: 'kiosk' },
      };

      if (!selectedColab) return;
      if (!navigator.onLine) {
        await pontoOfflineService.queueRegistro({
          tipo,
          colaborador_id: selectedColab.id,
          empresa_id: selectedColab.empresa_id,
          timestamp: new Date().toISOString(),
          dispositivoId: geo.dispositivoId,
          latitude: geo.latitude,
          longitude: geo.longitude,
        });
        loggerService.log('warn', 'KIOSK_REGISTRO_OFFLINE', {
          tipo,
          colaborador_id: selectedColab.id,
          dispositivo_id: KIOSK_DEVICE_ID,
          origem_geo: geoReal.origem,
        });
        toast.warning('Ponto registrado em modo OFFLINE (Quiosque).');
      } else {
        await pontoService.registrar(tipo, selectedColab.id, geo);
        // E-035: auditoria de quiosque — toda batida fica rastreável
        loggerService.log('info', 'KIOSK_REGISTRO_PONTO', {
          tipo,
          colaborador_id: selectedColab.id,
          empresa_id: selectedColab.empresa_id,
          dispositivo_id: KIOSK_DEVICE_ID,
          origem_geo: geoReal.origem,
          precisao_m: geoReal.precisao ?? null,
        });
        toast.success('Ponto registrado com sucesso!');
      }

      setStep('success');
      speak('Ponto registrado com sucesso. Bom trabalho!');
      setTimeout(() => {
        setStep('pin');
        setPin('');
        setSelectedColab(null);
      }, 3000);
    } catch (e: unknown) {
      toast.error(safeErrorMessage(e, 'Erro ao registrar ponto.'));
    } finally {
      setLoading(false);
      setOfflineQueueSize(pontoOfflineService.getQueueSize());
    }
  };

  const [speaking, setSpeaking] = useState(false);
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 font-body">
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary-glow shadow-lg">
            <Fingerprint className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Modo Quiosque</h1>
            <p className="text-muted-foreground text-sm flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5" /> Estação de Registro Compartilhada
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {offlineQueueSize > 0 && (
            <Badge
              variant="outline"
              className="bg-warning/10 text-warning border-warning/20 px-3 py-1 gap-1.5 animate-pulse"
            >
              <WifiOff className="h-3.5 w-3.5" /> {offlineQueueSize} pendentes
            </Badge>
          )}
          {!navigator.onLine && (
            <Badge variant="destructive" className="gap-1.5">
              <WifiOff className="h-3.5 w-3.5" /> Offline
            </Badge>
          )}
          {navigator.onLine && isSyncing && <RefreshCw className="h-5 w-5 text-primary animate-spin" />}
        </div>
      </div>

      <AnimatePresence>
        {speaking && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full border border-primary/20"
          >
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  animate={{ height: [4, 12, 4] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                  className="w-1 bg-primary rounded-full"
                />
              ))}
            </div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
              Assistente de Voz Ativo
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-md mx-auto mt-12">
        <div className="text-center mb-12">
          <div className="text-7xl font-display font-bold tabular-nums mb-2">
            {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <p className="text-muted-foreground font-body">
            {time.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
        </div>

        {step === 'pin' && (
          <Card className="shadow-2xl border-primary/20">
            <CardHeader className="text-center">
              <CardTitle className="font-display">Digite sua matrícula</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePinSubmit} className="space-y-4">
                <Input
                  type="text"
                  autoComplete="off"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="0000"
                  className="text-center text-4xl h-16 tracking-[1em]"
                  autoFocus
                />
                <Button className="w-full h-14 text-lg font-display rounded-xl" disabled={loading}>
                  {loading ? 'Verificando...' : 'Confirmar'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'action' && selectedColab && (
          <Card className="shadow-2xl border-primary/20">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <User className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="font-display">
                Olá, {(selectedColab.nome_completo ?? 'Colaborador').split(' ')[0]}!
              </CardTitle>
              <p className="text-sm text-muted-foreground">O que deseja fazer agora?</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2 rounded-2xl"
                  onClick={() => registrar('entrada')}
                  disabled={loading}
                >
                  <Clock className="h-6 w-6 text-success" /> Entrada
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2 rounded-2xl"
                  onClick={() => registrar('saida_almoco')}
                  disabled={loading}
                >
                  <Clock className="h-6 w-6 text-warning" /> Saída Almoço
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2 rounded-2xl"
                  onClick={() => registrar('retorno_almoco')}
                  disabled={loading}
                >
                  <Clock className="h-6 w-6 text-info" /> Retorno Almoço
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2 rounded-2xl"
                  onClick={() => registrar('saida')}
                  disabled={loading}
                >
                  <Clock className="h-6 w-6 text-destructive" /> Saída
                </Button>
              </div>
              <Button variant="ghost" className="w-full mt-4" onClick={() => setStep('pin')}>
                Cancelar
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'success' && (
          <div className="text-center p-12 animate-in zoom-in duration-300">
            <div className="mx-auto w-24 h-24 bg-success/20 rounded-full flex items-center justify-center mb-6">
              <Clock className="h-12 w-12 text-success animate-pulse" />
            </div>
            <h2 className="text-3xl font-display font-bold mb-2">Ponto Registrado!</h2>
            <p className="text-muted-foreground">
              Bom trabalho, {(selectedColab?.nome_completo ?? 'Colaborador').split(' ')[0]}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
