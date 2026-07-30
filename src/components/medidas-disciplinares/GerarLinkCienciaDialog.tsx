import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Check, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';

interface GerarLinkCienciaDialogProps {
  medidaId: string | null;
  colaboradorNome?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LinkGerado {
  token: string;
  url: string;
  expires_at: string;
}

/**
 * Gera o link de uso único para o colaborador dar ciência da medida.
 *
 * O token retornado pelo servidor é exibido uma única vez: o banco guarda
 * apenas o hash, portanto não há como recuperá-lo depois. Ao fechar o diálogo o
 * valor é descartado da memória do componente.
 */
export function GerarLinkCienciaDialog({
  medidaId,
  colaboradorNome,
  open,
  onOpenChange,
}: GerarLinkCienciaDialogProps) {
  const [gerando, setGerando] = useState(false);
  const [link, setLink] = useState<LinkGerado | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function gerar() {
    if (!medidaId) return;
    setGerando(true);
    try {
      const { data, error } = await supabase.rpc('medida_gerar_link_ciencia', {
        p_medida_id: medidaId,
      });
      if (error) throw error;

      const res = data as unknown as { success: boolean; token: string; url_path: string; expires_at: string };
      if (!res?.success) throw new Error('Não foi possível gerar o link.');

      setLink({
        token: res.token,
        url: `${window.location.origin}${res.url_path}`,
        expires_at: res.expires_at,
      });
    } catch (e) {
      toast.error(safeErrorMessage(e, 'Falha ao gerar link de ciência.'));
    } finally {
      setGerando(false);
    }
  }

  async function copiar() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopiado(true);
      toast.success('Link copiado.');
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error('Não foi possível copiar automaticamente. Selecione e copie o link.');
    }
  }

  function handleOpenChange(value: boolean) {
    if (!value) {
      // Descarta o token ao fechar: ele não é recuperável no servidor.
      setLink(null);
      setCopiado(false);
    }
    onOpenChange(value);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Link de ciência digital</DialogTitle>
          <DialogDescription>
            {colaboradorNome
              ? `Envie este link para ${colaboradorNome} registrar ciência ou recusa com evidência de IP, data e hora.`
              : 'Envie este link ao colaborador para registrar ciência ou recusa com evidência de IP, data e hora.'}
          </DialogDescription>
        </DialogHeader>

        {!link ? (
          <div className="space-y-4">
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription className="text-xs">
                O link vale por 7 dias e só pode ser usado uma vez. Ele é exibido apenas agora —
                o sistema guarda somente uma impressão digital, sem o link em si.
              </AlertDescription>
            </Alert>
            <Button onClick={gerar} disabled={gerando || !medidaId} className="w-full">
              {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {gerando ? 'Gerando…' : 'Gerar link'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input readOnly value={link.url} className="font-mono text-xs" />
              <Button size="icon" variant="outline" onClick={copiar} aria-label="Copiar link">
                {copiado ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Expira em {new Date(link.expires_at).toLocaleDateString('pt-BR')}. Ao fechar esta
              janela o link não poderá ser exibido novamente — gere um novo se necessário.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
