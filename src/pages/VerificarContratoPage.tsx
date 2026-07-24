import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle, ShieldCheck, Search, Loader2, FileSignature } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { QRCodeSVG } from 'qrcode.react';

interface VerificacaoResult {
  valido: boolean;
  motivo?: string;
  status?: string;
  assinado_em?: string;
  documento_hash?: string;
  assinatura_hash?: string;
  empresa?: string;
  data_inicio?: string;
  data_fim?: string;
  signatario_nome?: string;
  signatario_cpf_mascarado?: string;
}

export default function VerificarContratoPage() {
  const params = useParams<{ hash?: string }>();
  const [hash, setHash] = useState(params.hash ?? '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificacaoResult | null>(null);

  const verificar = async (hashParaVerificar: string) => {
    if (!hashParaVerificar || hashParaVerificar.trim().length < 32) {
      setResult({ valido: false, motivo: 'Informe um hash válido (mínimo 32 caracteres).' });
      return;
    }
    setLoading(true);
    try {
      // Captura IP público (best-effort, para rate limit)
      let ip: string | null = null;
      try {
        const res = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
        if (res.ok) ip = (await res.json())?.ip ?? null;
      } catch {
        // ignore — servidor tratará como 'unknown'
      }
      const { data, error } = await supabase.rpc('contrato_verificar_autenticidade_v2', {
        p_hash: hashParaVerificar.trim(),
        p_ip: ip,
      });
      if (error) throw error;
      setResult(data as unknown as VerificacaoResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao verificar contrato';
      setResult({ valido: false, motivo: message });
    } finally {
      setLoading(false);
    }
  };

  // Auto-verificar se veio hash na URL
  useState(() => {
    if (params.hash) void verificar(params.hash);
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Verificação de Autenticidade</h1>
          <p className="text-muted-foreground">
            Valide a autenticidade de um contrato de trabalho assinado eletronicamente
            <br />conforme MP 2.200-2/2001
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" /> Consultar por hash
            </CardTitle>
            <CardDescription>
              Cole o hash SHA-256 do documento ou da assinatura (impresso no rodapé do PDF).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Ex.: a1b2c3d4e5f6..."
                value={hash}
                onChange={(e) => setHash(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && verificar(hash)}
                className="font-mono text-xs"
              />
              <Button onClick={() => verificar(hash)} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verificar'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Alert variant={result.valido ? 'default' : 'destructive'}>
            {result.valido ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
            <AlertTitle>
              {result.valido ? 'Contrato autêntico e assinado' : 'Contrato não validado'}
            </AlertTitle>
            <AlertDescription>
              {result.valido ? (
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Status</span>
                    <Badge>{result.status}</Badge>
                  </div>
                  {result.empresa && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Empresa contratante</span>
                      <span className="font-medium">{result.empresa}</span>
                    </div>
                  )}
                  {result.signatario_nome && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Signatário</span>
                      <span className="font-medium">{result.signatario_nome}</span>
                    </div>
                  )}
                  {result.signatario_cpf_mascarado && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">CPF</span>
                      <span className="font-mono">{result.signatario_cpf_mascarado}</span>
                    </div>
                  )}
                  {result.assinado_em && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Assinado em</span>
                      <span>
                        {format(new Date(result.assinado_em), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  )}
                  {result.assinatura_hash && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <FileSignature className="h-3 w-3" /> Hash da assinatura
                      </p>
                      <p className="font-mono text-[10px] break-all">{result.assinatura_hash}</p>
                    </div>
                  )}
                  <div className="pt-3 border-t flex flex-col items-center gap-2">
                    <div className="bg-white p-2 rounded-md border">
                      <QRCodeSVG
                        value={`${window.location.origin}/verificar-contrato/${result.assinatura_hash ?? result.documento_hash ?? hash}`}
                        size={112}
                        level="M"
                        marginSize={0}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground text-center">
                      QR Code compartilhável · reimpressão de comprovante
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-2">{result.motivo ?? 'Hash não corresponde a nenhum contrato assinado.'}</p>
              )}
            </AlertDescription>
          </Alert>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Sistema de verificação pública · Dados sensíveis são exibidos mascarados
        </p>
      </div>
    </div>
  );
}
