import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { HardHat, Plus, Fingerprint } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks/useEmpresas';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { SignaturePad } from '@/components/sst/SignaturePad';

async function sha256(text: string) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function AdminEpisFichasPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [signOpen, setSignOpen] = useState<string | null>(null);

  const { data: fichas = [], isLoading } = useQuery({
    queryKey: ['epis-fichas', empresaAtual?.id],
    enabled: !!empresaAtual?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epis_fichas')
        .select('id, tipo_movimento, status, responsavel_nome, created_at, assinada_em, colaboradores(nome_completo), epis_fichas_itens(id, descricao, ca, quantidade, status_item)')
        .eq('empresa_id', empresaAtual!.id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const kpis = {
    total: fichas.length,
    pendentes: fichas.filter((f) => f.status === 'pendente').length,
    assinadas: fichas.filter((f) => f.status === 'assinada').length,
    recusas: fichas.filter((f) => f.status === 'recusada').length,
  };

  const assinar = async (fichaId: string, dataUrl: string) => {
    try {
      const hash = await sha256(dataUrl);
      const { error: sigErr } = await supabase.from('epis_fichas_assinaturas').insert({
        ficha_id: fichaId,
        assinatura_tipo: 'canvas',
        assinatura_dados: dataUrl,
        hash_sha256: hash,
        user_agent: navigator.userAgent,
      });
      if (sigErr) throw sigErr;
      const { error: updErr } = await supabase.from('epis_fichas').update({
        status: 'assinada',
        assinada_em: new Date().toISOString(),
        hash_sha256: hash,
      }).eq('id', fichaId);
      if (updErr) throw updErr;
      toast.success('Ficha assinada — hash registrado para integridade');
      setSignOpen(null);
      qc.invalidateQueries({ queryKey: ['epis-fichas'] });
    } catch (e) {
      toast.error(safeErrorMessage(e, 'Falha ao assinar ficha de EPI.'));
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Fichas de EPI (NR-6)"
        description="Controle digital de entregas com evidência e assinatura eletrônica"
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Total', v: kpis.total, cls: '' },
          { label: 'Pendentes', v: kpis.pendentes, cls: 'text-warning' },
          { label: 'Assinadas', v: kpis.assinadas, cls: 'text-success' },
          { label: 'Recusas', v: kpis.recusas, cls: 'text-destructive' },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{k.label}</div>
              <div className={`text-3xl font-bold ${k.cls}`}>{k.v}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Fichas emitidas</CardTitle>
          <Button size="sm" disabled>
            <Plus className="mr-2 h-4 w-4" /> Nova ficha
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading && <div className="py-10 text-center text-muted-foreground">Carregando…</div>}
          {!isLoading && fichas.length === 0 && (
            <div className="py-10 text-center text-muted-foreground">Nenhuma ficha registrada ainda.</div>
          )}
          <div className="space-y-3">
            {fichas.map((f: any) => (
              <div key={f.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{f.colaboradores?.nome_completo ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">
                      {f.tipo_movimento} • Responsável: {f.responsavel_nome} • {new Date(f.created_at).toLocaleString('pt-BR')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={f.status === 'assinada' ? 'default' : f.status === 'pendente' ? 'secondary' : 'destructive'}>
                      {f.status}
                    </Badge>
                    {f.status === 'pendente' && (
                      <Dialog open={signOpen === f.id} onOpenChange={(o) => setSignOpen(o ? f.id : null)}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Fingerprint className="mr-2 h-4 w-4" /> Assinar
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Assinatura eletrônica do colaborador</DialogTitle>
                          </DialogHeader>
                          <SignaturePad onSign={(url) => assinar(f.id, url)} />
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
                {f.epis_fichas_itens?.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm">
                    {f.epis_fichas_itens.map((it: any) => (
                      <li key={it.id} className="flex justify-between border-t pt-1">
                        <span>{it.descricao} {it.ca && <span className="text-xs text-muted-foreground">(CA {it.ca})</span>}</span>
                        <span className="text-xs">Qtd: {it.quantidade} • {it.status_item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
