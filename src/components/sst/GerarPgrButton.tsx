import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks/useEmpresas';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { safeHref } from '@/utils/safeUrl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FileText, Loader2, Download, ShieldCheck } from 'lucide-react';

interface Programa {
  id: string;
  versao: number;
  data_emissao: string;
  data_validade: string;
  status: string;
  hash_sha256: string | null;
  arquivo_url: string | null;
}

export function GerarPgrButton() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [responsavel, setResponsavel] = useState('');
  const [registro, setRegistro] = useState('');

  const { data: programas } = useQuery({
    queryKey: ['sst-programas-pgr', empresaAtual?.id],
    enabled: !!empresaAtual?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sst_programas')
        .select('id, versao, data_emissao, data_validade, status, hash_sha256, arquivo_url')
        .eq('empresa_id', empresaAtual!.id)
        .eq('tipo', 'PGR')
        .order('versao', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as Programa[];
    },
  });

  const gerarMut = useMutation({
    mutationFn: async () => {
      if (!empresaAtual?.id) throw new Error('Empresa não selecionada');
      if (!responsavel.trim()) throw new Error('Informe o responsável técnico');
      const { data, error } = await supabase.functions.invoke('gerar-pgr', {
        body: {
          empresa_id: empresaAtual.id,
          responsavel_tecnico: responsavel,
          registro_profissional: registro,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { signed_url?: string; versao: number; hash_sha256: string };
    },
    onSuccess: (data) => {
      toast.success(`PGR v${data.versao} gerado com sucesso`);
      qc.invalidateQueries({ queryKey: ['sst-programas-pgr'] });
      if (data.signed_url) window.open(safeHref(data.signed_url), '_blank', 'noopener');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Falha ao gerar PGR.')),
  });

  const baixar = async (path: string) => {
    const { data, error } = await supabase.storage.from('sst-programas').createSignedUrl(path, 300);
    if (error) return toast.error('Falha ao gerar link');
    if (data?.signedUrl) window.open(safeHref(data.signedUrl), '_blank', 'noopener');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">
          <FileText className="h-4 w-4 mr-2" />Gerar PGR (NR-01)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />Gerador de PGR — NR-01
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Responsável Técnico *</Label>
              <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Nome completo" />
            </div>
            <div>
              <Label>Registro Profissional</Label>
              <Input value={registro} onChange={(e) => setRegistro(e.target.value)} placeholder="CREA / MTE / etc" />
            </div>
          </div>

          <Button onClick={() => gerarMut.mutate()} disabled={gerarMut.isPending} className="w-full">
            {gerarMut.isPending
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Gerando PDF...</>
              : <><FileText className="h-4 w-4 mr-2" />Gerar nova versão</>}
          </Button>

          <div>
            <h3 className="font-semibold text-sm mb-2">Histórico de versões</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(programas ?? []).map(p => (
                <div key={p.id} className="flex items-center justify-between border rounded p-2 text-sm">
                  <div>
                    <div className="font-medium">Versão {p.versao} <Badge variant={p.status === 'ativo' ? 'default' : 'outline'} className="ml-2">{p.status}</Badge></div>
                    <div className="text-xs text-muted-foreground">
                      Emitido: {new Date(p.data_emissao).toLocaleDateString('pt-BR')} · Validade: {new Date(p.data_validade).toLocaleDateString('pt-BR')}
                    </div>
                    {p.hash_sha256 && <div className="text-[10px] font-mono text-muted-foreground truncate max-w-md">SHA-256: {p.hash_sha256.slice(0, 32)}…</div>}
                  </div>
                  {p.arquivo_url && (
                    <Button size="sm" variant="ghost" onClick={() => baixar(p.arquivo_url!)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {(programas ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma versão gerada ainda</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
