import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, ShieldCheck, FileSignature, AlertTriangle, Ban, Clock, RotateCcw, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

interface ContratoInfo {
  contrato_id: string;
  status: string;
  sha256: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  requer_cpf: boolean;
  expira_em: string;
}

function formatCpf(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export default function AssinarContratoPage() {
  const params = useParams<{ token: string }>();
  const [sp] = useSearchParams();
  const token = params.token || sp.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<ContratoInfo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [erroTipo, setErroTipo] = useState<'revogado' | 'expirado' | 'usado' | 'invalido' | 'generico' | null>(null);


  const [cpf, setCpf] = useState('');
  const [nome, setNome] = useState('');
  const [aceite, setAceite] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [assinado, setAssinado] = useState<{ hash: string; em: string } | null>(null);

  async function handlePreview() {
    if (!token) return;
    setPreviewLoading(true);
    try {
      const { data, error } = await supabase.rpc('contrato_preview_url_por_token' as any, {
        p_token: token,
      } as any);
      if (error) throw error;
      const res = data as unknown as { signed_url: string };
      if (!res?.signed_url) throw new Error('URL não disponível.');
      window.open(res.signed_url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao gerar prévia.';
      toast.error(msg);
    } finally {
      setPreviewLoading(false);
    }
  }


  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!token || token.length < 16) {
        setErro('Token de assinatura inválido.');
        setErroTipo('invalido');
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase.rpc('contrato_consultar_por_token' as any, {
          p_token: token,
        } as any);
        if (cancel) return;
        if (error) throw error;
        setInfo(data as unknown as ContratoInfo);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Não foi possível carregar o contrato.';
        const low = msg.toLowerCase();
        if (low.includes('revog')) setErroTipo('revogado');
        else if (low.includes('expir') || low.includes('venc')) setErroTipo('expirado');
        else if (low.includes('usad') || low.includes('assinad') || low.includes('já')) setErroTipo('usado');
        else if (low.includes('inválid') || low.includes('não encontr')) setErroTipo('invalido');
        else setErroTipo('generico');
        setErro(msg);
      } finally {
        if (!cancel) setLoading(false);
      }

    })();
    return () => {
      cancel = true;
    };
  }, [token]);

  const canSubmit = useMemo(
    () => aceite && nome.trim().length >= 5 && cpf.replace(/\D/g, '').length === 11,
    [aceite, nome, cpf]
  );

  async function handleAssinar() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      // best-effort captura de IP público
      let ip: string | null = null;
      try {
        const r = await fetch('https://api.ipify.org?format=json');
        const j = await r.json();
        ip = j.ip ?? null;
      } catch {
        /* silencioso */
      }
      const { data, error } = await supabase.rpc('contrato_assinar_por_token' as any, {
        p_token: token,
        p_cpf: cpf.replace(/\D/g, ''),
        p_nome_completo: nome.trim(),
        p_ip: ip,
        p_user_agent: navigator.userAgent,
      } as any);
      if (error) throw error;
      const res = data as unknown as { assinatura_hash: string; assinado_em: string };
      setAssinado({ hash: res.assinatura_hash, em: res.assinado_em });
      toast.success('Contrato assinado com sucesso!');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao assinar contrato.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-1/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (erro) {
    const cfg = {
      revogado: {
        icon: Ban,
        title: 'Link revogado',
        desc: 'Este link de assinatura foi cancelado pela empresa. Solicite ao RH o envio de um novo link.',
        tone: 'text-destructive',
      },
      expirado: {
        icon: Clock,
        title: 'Link expirado',
        desc: 'O prazo de validade deste link terminou. Peça ao RH que estenda o prazo ou gere um novo link.',
        tone: 'text-amber-600 dark:text-amber-400',
      },
      usado: {
        icon: CheckCircle2,
        title: 'Contrato já assinado',
        desc: 'Este contrato já foi assinado anteriormente. Não é necessário assiná-lo novamente.',
        tone: 'text-emerald-600 dark:text-emerald-400',
      },
      invalido: {
        icon: AlertTriangle,
        title: 'Link inválido',
        desc: 'Verifique se o endereço copiado está completo. Se o problema persistir, solicite um novo link ao RH.',
        tone: 'text-destructive',
      },
      generico: {
        icon: AlertTriangle,
        title: 'Não foi possível abrir o contrato',
        desc: erro,
        tone: 'text-destructive',
      },
    }[erroTipo ?? 'generico'];
    const Icon = cfg.icon;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Icon className={`h-7 w-7 ${cfg.tone}`} />
            </div>
            <CardTitle>{cfg.title}</CardTitle>
            <CardDescription>{cfg.desc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-center text-xs text-muted-foreground">
            {erroTipo !== 'generico' && (
              <p className="font-mono break-all opacity-70">{erro}</p>
            )}
            {(erroTipo === 'expirado' || erroTipo === 'revogado') && (
              <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-2">
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Recarregar
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }



  if (assinado) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-xl border-primary/40">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
            <CardTitle>Contrato assinado</CardTitle>
            <CardDescription>
              Sua assinatura eletrônica foi registrada com validade jurídica (MP 2.200-2/2001).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-md border p-3 bg-muted/30">
              <p className="text-muted-foreground text-xs">Hash de assinatura (SHA-256)</p>
              <p className="font-mono break-all text-xs">{assinado.hash}</p>
            </div>
            <div className="rounded-md border p-3 bg-muted/30">
              <p className="text-muted-foreground text-xs">Data e hora</p>
              <p>{new Date(assinado.em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
            </div>
            <div className="rounded-md border border-primary/30 p-3 bg-primary/5">
              <p className="text-muted-foreground text-xs mb-2 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Link público de verificação
              </p>
              <div className="flex gap-3 items-start">
                <div className="bg-white p-2 rounded-md border shrink-0">
                  <QRCodeSVG
                    value={`${window.location.origin}/verificar-contrato/${assinado.hash}`}
                    size={96}
                    level="M"
                    marginSize={0}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <a
                    href={`${window.location.origin}/verificar-contrato/${assinado.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline break-all text-xs font-mono"
                  >
                    {window.location.origin}/verificar-contrato/{assinado.hash.substring(0, 16)}…
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(
                        `${window.location.origin}/verificar-contrato/${assinado.hash}`,
                      );
                      toast.success('Link de verificação copiado');
                    }}
                    className="ml-2 text-[11px] underline text-primary"
                  >
                    copiar
                  </button>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Aponte a câmera para o QR Code para validar em qualquer dispositivo.
                  </p>
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={async () => {
                try {
                  const { gerarReciboAssinaturaPDF } = await import('@/lib/reciboAssinaturaPdf');
                  await gerarReciboAssinaturaPDF({
                    hash: assinado.hash,
                    assinadoEm: assinado.em,
                    origin: window.location.origin,
                  });
                  toast.success('Recibo baixado');
                } catch (e) {
                  console.error('[recibo-pdf]', e);
                  toast.error('Falha ao gerar recibo');
                }
              }}
            >
              <FileText className="h-4 w-4 mr-2" /> Baixar recibo de assinatura (PDF)
            </Button>
            <p className="text-xs text-muted-foreground">
              Guarde este comprovante. Uma cópia foi arquivada na empresa contratante e pode ser
              auditada externamente a qualquer momento pelo link acima.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!info) return <></>;


  if (!info) return <></>;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            <CardTitle>Assinatura Eletrônica de Contrato</CardTitle>
          </div>
          <CardDescription>
            Confirme seus dados abaixo para assinar. Documento com validade jurídica conforme MP
            2.200-2/2001.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
            {info.data_inicio && (
              <p>
                <span className="text-muted-foreground">Início da vigência: </span>
                {new Date(info.data_inicio).toLocaleDateString('pt-BR')}
              </p>
            )}
            {info.data_fim && (
              <p>
                <span className="text-muted-foreground">Fim previsto: </span>
                {new Date(info.data_fim).toLocaleDateString('pt-BR')}
              </p>
            )}
            {info.sha256 && (
              <p className="break-all">
                <span className="text-muted-foreground">Hash do documento: </span>
                <span className="font-mono">{info.sha256}</span>
              </p>
            )}
            <p>
              <span className="text-muted-foreground">Token válido até: </span>
              {new Date(info.expira_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={previewLoading}
            onClick={handlePreview}
          >
            <FileText className="h-4 w-4 mr-2" />
            {previewLoading ? 'Gerando prévia…' : 'Ler contrato completo (PDF)'}
          </Button>


          <div>
            <Label htmlFor="nome">Nome completo</Label>
            <Input
              id="nome"
              autoComplete="name"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Como consta no documento"
            />
          </div>

          <div>
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              inputMode="numeric"
              autoComplete="off"
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              placeholder="000.000.000-00"
              maxLength={14}
            />
          </div>

          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={aceite}
              onChange={(e) => setAceite(e.target.checked)}
            />
            <span>
              Declaro que li o contrato disponibilizado e aceito seus termos. Reconheço que esta
              assinatura eletrônica tem validade jurídica e que meu IP e navegador serão registrados
              para fins de auditoria.
            </span>
          </label>

          <Button
            className="w-full"
            disabled={!canSubmit || submitting}
            onClick={handleAssinar}
          >
            <ShieldCheck className="h-4 w-4 mr-2" />
            {submitting ? 'Assinando…' : 'Assinar contrato'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
