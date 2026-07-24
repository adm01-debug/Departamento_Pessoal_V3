import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { FileSignature, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';
import { currentCompetenciaLocal } from '@/utils/dateLocal';

interface Props {
  colaboradorId: string;
  colaboradorNome: string;
  competenciaPadrao?: string; // YYYY-MM
  trigger?: React.ReactNode;
}

interface AssinaturaResult {
  success: boolean;
  espelho_id: string;
  hash_sha256: string;
  total_batidas: number;
  competencia: string;
  assinado_em: string;
}

interface VerificacaoResult {
  espelho_id: string;
  hash_original: string;
  hash_atual: string;
  integro: boolean;
  total_batidas_original: number;
  total_batidas_atual: number;
  revogado: boolean;
}

export function AssinarEspelhoDialog({ colaboradorId, colaboradorNome, competenciaPadrao, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [competencia, setCompetencia] = useState(competenciaPadrao ?? currentCompetenciaLocal());
  const [loading, setLoading] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [resultado, setResultado] = useState<AssinaturaResult | null>(null);
  const [verificacao, setVerificacao] = useState<VerificacaoResult | null>(null);

  const assinar = async () => {
    setLoading(true);
    setResultado(null);
    setVerificacao(null);
    try {
      const { data, error } = await supabase.rpc('assinar_espelho_ponto', {
        _colaborador_id: colaboradorId,
        _competencia: competencia,
        _user_agent: navigator.userAgent.slice(0, 500),
      });
      if (error) throw error;
      setResultado(data as unknown as AssinaturaResult);
      toast.success('Espelho assinado com sucesso');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao assinar';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const verificar = async () => {
    if (!resultado?.espelho_id) return;
    setVerificando(true);
    try {
      const { data, error } = await supabase.rpc('verificar_espelho_ponto', {
        _espelho_id: resultado.espelho_id,
      });
      if (error) throw error;
      const v = data as unknown as VerificacaoResult;
      setVerificacao(v);
      if (v.integro) toast.success('Integridade confirmada');
      else toast.error('Divergência detectada: hash não bate');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao verificar';
      toast.error(msg);
    } finally {
      setVerificando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2">
            <FileSignature className="h-4 w-4" />
            Assinar espelho
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assinatura digital de espelho de ponto</DialogTitle>
          <DialogDescription>
            Gera um hash SHA-256 imutável do espelho de {colaboradorNome} para a competência selecionada. Qualquer
            alteração posterior nas batidas será detectada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="competencia">Competência (mês)</Label>
            <Input
              id="competencia"
              type="month"
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
              disabled={loading || !!resultado}
            />
          </div>

          {resultado && (
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Espelho assinado</span>
                  <Badge variant="secondary">{resultado.total_batidas} batidas</Badge>
                </div>
                <p className="text-xs font-mono break-all text-muted-foreground">SHA-256: {resultado.hash_sha256}</p>
              </AlertDescription>
            </Alert>
          )}

          {verificacao && (
            <Alert variant={verificacao.integro ? 'default' : 'destructive'}>
              {verificacao.integro ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
              <AlertDescription>
                {verificacao.integro
                  ? 'Hash confere. Nenhuma alteração desde a assinatura.'
                  : `Divergência! Batidas originais: ${verificacao.total_batidas_original}, atuais: ${verificacao.total_batidas_atual}.`}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          {resultado ? (
            <>
              <Button variant="outline" onClick={verificar} disabled={verificando}>
                {verificando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Verificar integridade
              </Button>
              <Button onClick={() => setOpen(false)}>Fechar</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={assinar} disabled={loading || !competencia}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Assinar agora
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
