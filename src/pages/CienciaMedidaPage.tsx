import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ShieldCheck, AlertTriangle, Clock, Scale, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const tipoLabels: Record<string, string> = {
  advertencia_verbal: 'Advertência Verbal',
  advertencia_escrita: 'Advertência Escrita',
  suspensao: 'Suspensão',
  justa_causa: 'Justa Causa',
};

/** Payload retornado por `medida_consultar_por_token`. */
interface MedidaCiencia {
  valid: boolean;
  reason?: string;
  medida_id?: string;
  tipo?: string;
  motivo?: string | null;
  descricao?: string | null;
  data_ocorrencia?: string | null;
  empresa_nome?: string | null;
  colaborador_nome?: string | null;
}

/** Resultado de `medida_registrar_ciencia_publica`. */
interface RegistroResultado {
  success: boolean;
  error?: string;
  acao?: 'ciencia' | 'recusa';
  hash?: string;
  registrado_em?: string;
}

const MOTIVO_MIN = 10;

/**
 * Extrai a mensagem de um erro do Supabase.
 *
 * `PostgrestError` é um objeto simples, não uma instância de `Error`, então
 * `instanceof Error` descartaria silenciosamente a causa real (por exemplo o
 * `rate_limit_exceeded` levantado pelas RPCs).
 */
function mensagemErro(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return '';
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  try {
    return format(parseISO(value), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return value;
  }
}

/**
 * Página pública de ciência de medida disciplinar (Art. 482 CLT).
 *
 * O colaborador acessa por link com token de uso único. Nenhuma autenticação é
 * exigida: a validação ocorre inteiramente no servidor, via RPCs `SECURITY
 * DEFINER` que resolvem o token pelo hash e aplicam limite de tentativas.
 */
export default function CienciaMedidaPage() {
  const params = useParams<{ token: string }>();
  const [sp] = useSearchParams();
  const token = params.token || sp.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [medida, setMedida] = useState<MedidaCiencia | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);

  const [acao, setAcao] = useState<'ciencia' | 'recusa'>('ciencia');
  const [motivoRecusa, setMotivoRecusa] = useState('');
  const [confirmado, setConfirmado] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [registrado, setRegistrado] = useState<RegistroResultado | null>(null);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      // O token é 32 bytes em hex: descarta lixo antes de gastar rate limit.
      if (!token || token.length < 32) {
        setErro('Link de ciência inválido.');
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase.rpc('medida_consultar_por_token', {
          p_token: token,
        });
        if (cancelado) return;
        if (error) throw error;

        const info = data as unknown as MedidaCiencia;
        if (!info?.valid) {
          setErro('Este link já foi utilizado ou expirou. Solicite um novo ao RH.');
        } else {
          setMedida(info);
        }
      } catch (e) {
        if (cancelado) return;
        const msg = mensagemErro(e);
        if (msg.toLowerCase().includes('rate_limit')) {
          setRateLimited(true);
          setErro('Muitas tentativas a partir deste acesso. Aguarde 10 minutos e tente novamente.');
        } else {
          setErro('Não foi possível carregar a medida. Tente novamente mais tarde.');
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [token]);

  const motivoInsuficiente = acao === 'recusa' && motivoRecusa.trim().length < MOTIVO_MIN;
  const podeEnviar = confirmado && !motivoInsuficiente && !submitting;

  async function handleSubmit() {
    if (!podeEnviar) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('medida_registrar_ciencia_publica', {
        p_token: token,
        p_acao: acao,
        p_motivo_recusa: acao === 'recusa' ? motivoRecusa.trim() : null,
        p_user_agent: navigator.userAgent,
      });
      if (error) throw error;

      const res = data as unknown as RegistroResultado;
      if (!res?.success) {
        // Erro de negócio: o servidor responde 200 com success=false.
        toast.error(res?.error || 'Não foi possível registrar.');
        return;
      }
      setRegistrado(res);
    } catch (e) {
      const msg = mensagemErro(e);
      toast.error(
        msg.toLowerCase().includes('rate_limit')
          ? 'Muitas tentativas. Aguarde 10 minutos.'
          : 'Falha ao registrar. Tente novamente.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-4">
        <div className="flex items-center gap-2 justify-center text-muted-foreground">
          <Scale className="h-4 w-4" />
          <span className="font-display text-sm">Ciência de Medida Disciplinar</span>
        </div>

        {loading && (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        )}

        {!loading && erro && (
          <Alert variant={rateLimited ? 'default' : 'destructive'}>
            {rateLimited ? <Clock className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <AlertTitle>{rateLimited ? 'Aguarde um momento' : 'Link indisponível'}</AlertTitle>
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        {!loading && !erro && medida && registrado && (
          <Card className="border-primary/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display">
                {registrado.acao === 'ciencia' ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                {registrado.acao === 'ciencia' ? 'Ciência registrada' : 'Recusa registrada'}
              </CardTitle>
              <CardDescription>
                Seu registro foi gravado com data, hora e endereço de origem. O RH foi notificado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Comprovante de autenticidade (SHA-256)</p>
                <p className="font-mono text-[11px] break-all">{registrado.hash}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Guarde este código. Ele comprova a integridade do registro nos termos da MP 2.200-2/2001.
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && !erro && medida && !registrado && (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="font-display">{medida.empresa_nome || 'Empresa'}</CardTitle>
                  <CardDescription>
                    {medida.colaborador_nome} — ocorrência de {formatDate(medida.data_ocorrencia)}
                  </CardDescription>
                </div>
                <Badge variant="destructive" className="shrink-0">
                  {tipoLabels[medida.tipo || ''] || medida.tipo}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Motivo</Label>
                <p className="text-sm font-body">{medida.motivo || '—'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Descrição dos fatos</Label>
                <p className="text-sm font-body whitespace-pre-wrap">{medida.descricao || '—'}</p>
              </div>

              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle>Dar ciência não é concordar</AlertTitle>
                <AlertDescription>
                  Registrar ciência significa apenas que você foi informado da medida. Você pode
                  recusar a assinatura e justificar — a recusa também é registrada e não gera
                  prejuízo ao seu direito de contestar.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Sua resposta</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant={acao === 'ciencia' ? 'default' : 'outline'}
                    onClick={() => setAcao('ciencia')}
                    className="justify-start"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Estou ciente
                  </Button>
                  <Button
                    type="button"
                    variant={acao === 'recusa' ? 'destructive' : 'outline'}
                    onClick={() => setAcao('recusa')}
                    className="justify-start"
                  >
                    <XCircle className="h-4 w-4" /> Recuso assinar
                  </Button>
                </div>
              </div>

              {acao === 'recusa' && (
                <div className="space-y-2">
                  <Label htmlFor="motivo-recusa">Motivo da recusa</Label>
                  <Textarea
                    id="motivo-recusa"
                    value={motivoRecusa}
                    onChange={(e) => setMotivoRecusa(e.target.value)}
                    placeholder="Descreva por que você não concorda em assinar (mínimo 10 caracteres)."
                    rows={4}
                  />
                  {motivoInsuficiente && motivoRecusa.length > 0 && (
                    <p className="text-xs text-destructive">
                      Faltam {MOTIVO_MIN - motivoRecusa.trim().length} caracteres.
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-start gap-2">
                <Checkbox
                  id="confirmo"
                  checked={confirmado}
                  onCheckedChange={(v) => setConfirmado(v === true)}
                />
                <Label htmlFor="confirmo" className="text-xs font-normal leading-relaxed">
                  Confirmo que sou {medida.colaborador_nome} e que li o conteúdo acima. Autorizo o
                  registro de data, hora e endereço IP como evidência deste ato.
                </Label>
              </div>

              <Button onClick={handleSubmit} disabled={!podeEnviar} className="w-full">
                {submitting ? 'Registrando…' : 'Registrar resposta'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
