import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks/useEmpresas';
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
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ACAO_GERAR_AEJ } from '@/components/ponto/acoesCabecalhoPonto';

/**
 * Gera AEJ (Arquivo Eletrônico de Jornada — Portaria MTP 671/2021).
 * Faz download local do arquivo .txt e exibe hash SHA-256 para conferência.
 */
export function GerarAEJDialog() {
  const { empresaAtual } = useEmpresas();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [resultado, setResultado] = useState<{
    hash: string;
    bytes: number;
    marcacoes: number;
    colaboradores: number;
    sem_pis: number;
  } | null>(null);

  const handleGerar = async () => {
    if (!empresaAtual?.id) return toast.error('Selecione uma empresa');
    if (!inicio || !fim) return toast.error('Informe o período completo');
    if (inicio > fim) return toast.error('Data inicial não pode ser posterior à final');

    setLoading(true);
    setResultado(null);
    try {
      const { data, error } = await supabase.functions.invoke('gerar-aej', {
        body: { empresa_id: empresaAtual.id, periodo_inicio: inicio, periodo_fim: fim },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? 'Falha ao gerar AEJ');

      // Download client-side
      const blob = new Blob([data.conteudo], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const nomeArq = `AEJ_${empresaAtual.id.slice(0, 8)}_${inicio}_${fim}.txt`;
      a.href = url;
      a.download = nomeArq;
      a.click();
      URL.revokeObjectURL(url);

      setResultado({
        hash: data.hash_sha256,
        bytes: data.tamanho_bytes,
        marcacoes: data.total_marcacoes,
        colaboradores: data.total_colaboradores,
        sem_pis: data.colaboradores_sem_pis,
      });
      toast.success('AEJ gerado e baixado');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido';
      toast.error('Falha ao gerar AEJ: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={ACAO_GERAR_AEJ}>
          <FileDown className="h-4 w-4" /> Gerar AEJ
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerar AEJ (Portaria MTP 671/2021)</DialogTitle>
          <DialogDescription>
            Arquivo Eletrônico de Jornada com marcações do período. Fuso: America/Sao_Paulo.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="aej-inicio">Início</Label>
            <Input id="aej-inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="aej-fim">Fim</Label>
            <Input id="aej-fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
        </div>

        {resultado && (
          <div className="rounded-md border border-border bg-muted/50 p-3 text-xs space-y-1">
            <p>
              <strong>Colaboradores:</strong> {resultado.colaboradores} (sem PIS: {resultado.sem_pis})
            </p>
            <p>
              <strong>Marcações:</strong> {resultado.marcacoes.toLocaleString('pt-BR')}
            </p>
            <p>
              <strong>Tamanho:</strong> {(resultado.bytes / 1024).toFixed(2)} KB
            </p>
            <p className="break-all">
              <strong>SHA-256:</strong> <span className="font-mono">{resultado.hash}</span>
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
            Fechar
          </Button>
          <Button onClick={handleGerar} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            {loading ? 'Gerando...' : 'Gerar e baixar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
