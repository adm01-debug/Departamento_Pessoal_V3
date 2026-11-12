import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Fingerprint, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks/useEmpresas';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { SignaturePad } from '@/components/sst/SignaturePad';
import { validateTablePayload } from '@/schemas/validate';
import { useAuth } from '@/contexts/AuthContext';
import { colaboradorService } from '@/services/colaboradorService';
import { episService } from '@/services/episService';

const TIPOS_MOVIMENTO = [
  { value: 'entrega', label: 'Entrega' },
  { value: 'devolucao', label: 'Devolução' },
  { value: 'substituicao', label: 'Substituição' },
  { value: 'recusa', label: 'Recusa' },
];

interface ItemForm {
  epi_id: string;
  descricao: string;
  ca: string;
  ca_validade: string;
  quantidade: string;
}

const itemVazio = (): ItemForm => ({ epi_id: '', descricao: '', ca: '', ca_validade: '', quantidade: '1' });

async function sha256(text: string) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function AdminEpisFichasPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [signOpen, setSignOpen] = useState<string | null>(null);
  const [novaOpen, setNovaOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [colaboradorId, setColaboradorId] = useState('');
  const [tipoMovimento, setTipoMovimento] = useState('entrega');
  const [responsavelNome, setResponsavelNome] = useState('');
  const [itens, setItens] = useState<ItemForm[]>([itemVazio()]);

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores', empresaAtual?.id],
    queryFn: () => colaboradorService.list(empresaAtual!.id),
    enabled: !!empresaAtual?.id && novaOpen,
  });

  const { data: epis = [] } = useQuery({
    queryKey: ['epis', empresaAtual?.id],
    queryFn: () => episService.listar(empresaAtual!.id),
    enabled: !!empresaAtual?.id && novaOpen,
  });

  const abrirNova = (o: boolean) => {
    setNovaOpen(o);
    if (o) {
      setColaboradorId('');
      setTipoMovimento('entrega');
      setResponsavelNome(user?.name || user?.email || '');
      setItens([itemVazio()]);
    }
  };

  const atualizarItem = (idx: number, patch: Partial<ItemForm>) =>
    setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const selecionarEpi = (idx: number, epiId: string) => {
    const epi = epis.find((e) => e.id === epiId);
    atualizarItem(idx, {
      epi_id: epiId,
      descricao: epi?.nome ?? '',
      ca: epi?.ca ?? '',
      ca_validade: epi?.validade_ca ?? '',
    });
  };

  const criarFicha = async () => {
    if (!empresaAtual?.id) return;
    if (!colaboradorId) {
      toast.error('Selecione o colaborador.');
      return;
    }
    if (!responsavelNome.trim()) {
      toast.error('Informe o responsável pela entrega.');
      return;
    }
    if (itens.some((it) => !it.descricao.trim() || !(Number(it.quantidade) > 0))) {
      toast.error('Cada item precisa de descrição e quantidade maior que zero.');
      return;
    }
    setSalvando(true);
    try {
      const { data: ficha, error: fichaErr } = await supabase
        .from('epis_fichas')
        .insert(
          validateTablePayload(
            'epis_fichas',
            {
              empresa_id: empresaAtual.id,
              colaborador_id: colaboradorId,
              responsavel_id: user?.id ?? null,
              responsavel_nome: responsavelNome.trim(),
              tipo_movimento: tipoMovimento,
              status: 'pendente',
            },
            'AdminEpisFichasPage:nova'
          )
        )
        .select('id')
        .single();
      if (fichaErr) throw fichaErr;
      const { error: itensErr } = await supabase.from('epis_fichas_itens').insert(
        itens.map((it) =>
          validateTablePayload(
            'epis_fichas_itens',
            {
              ficha_id: ficha.id,
              epi_id: it.epi_id || null,
              descricao: it.descricao.trim(),
              ca: it.ca.trim() || null,
              ca_validade: it.ca_validade || null,
              quantidade: Number(it.quantidade),
            },
            'AdminEpisFichasPage:nova_itens'
          )
        )
      );
      if (itensErr) {
        // Não deixa ficha sem itens: desfaz o cabeçalho recém-criado.
        await supabase.from('epis_fichas').delete().eq('id', ficha.id).eq('empresa_id', empresaAtual.id);
        throw itensErr;
      }
      toast.success('Ficha de EPI registrada — pendente de assinatura.');
      setNovaOpen(false);
      qc.invalidateQueries({ queryKey: ['epis-fichas'] });
    } catch (e) {
      toast.error(safeErrorMessage(e, 'Falha ao registrar ficha de EPI.'));
    } finally {
      setSalvando(false);
    }
  };

  const { data: fichas = [], isLoading } = useQuery({
    queryKey: ['epis-fichas', empresaAtual?.id],
    enabled: !!empresaAtual?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epis_fichas')
        .select(
          'id, tipo_movimento, status, responsavel_nome, created_at, assinada_em, colaboradores(nome_completo), epis_fichas_itens(id, descricao, ca, quantidade, status_item)'
        )
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
      const { error: sigErr } = await supabase.from('epis_fichas_assinaturas').insert(
        validateTablePayload(
          'epis_fichas_assinaturas',
          {
            ficha_id: fichaId,
            assinatura_tipo: 'canvas',
            assinatura_dados: dataUrl,
            hash_sha256: hash,
            user_agent: navigator.userAgent,
          },
          'AdminEpisFichasPage:epis_fichas_assinaturas'
        )
      );
      if (sigErr) throw sigErr;
      const { error: updErr } = await supabase
        .from('epis_fichas')
        .update(
          validateTablePayload(
            'epis_fichas',
            {
              status: 'assinada',
              assinada_em: new Date().toISOString(),
              hash_sha256: hash,
            },
            'AdminEpisFichasPage:epis_fichas'
          )
        )
        .eq('id', fichaId);
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
          <Dialog open={novaOpen} onOpenChange={abrirNova}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!empresaAtual?.id}>
                <Plus className="mr-2 h-4 w-4" /> Nova ficha
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova ficha de EPI</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>Colaborador *</Label>
                  <Select value={colaboradorId} onValueChange={setColaboradorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o colaborador" />
                    </SelectTrigger>
                    <SelectContent>
                      {colaboradores.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome_completo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Movimento</Label>
                    <Select value={tipoMovimento} onValueChange={setTipoMovimento}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_MOVIMENTO.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Responsável *</Label>
                    <Input value={responsavelNome} onChange={(e) => setResponsavelNome(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label>Itens</Label>
                  {itens.map((it, idx) => (
                    <div key={idx} className="space-y-2 rounded-lg border p-3">
                      {epis.length > 0 && (
                        <Select value={it.epi_id} onValueChange={(v) => selecionarEpi(idx, v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="EPI do catálogo (opcional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {epis.map((e) => (
                              <SelectItem key={e.id} value={e.id}>
                                {e.nome}
                                {e.ca ? ` (CA ${e.ca})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <Input
                        placeholder="Descrição *"
                        value={it.descricao}
                        onChange={(e) => atualizarItem(idx, { descricao: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <Input
                          placeholder="CA"
                          value={it.ca}
                          onChange={(e) => atualizarItem(idx, { ca: e.target.value })}
                        />
                        <Input
                          type="number"
                          min={1}
                          className="w-24"
                          aria-label="Quantidade"
                          value={it.quantidade}
                          onChange={(e) => atualizarItem(idx, { quantidade: e.target.value })}
                        />
                        {itens.length > 1 && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label="Remover item"
                            onClick={() => setItens((prev) => prev.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setItens((prev) => [...prev, itemVazio()])}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Adicionar item
                  </Button>
                </div>
                <Button className="w-full" onClick={criarFicha} disabled={salvando}>
                  {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrar ficha
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading && <div className="py-10 text-center text-muted-foreground">Carregando…</div>}
          {!isLoading && fichas.length === 0 && (
            <div className="py-10 text-center text-muted-foreground">Nenhuma ficha registrada ainda.</div>
          )}
          <div className="space-y-3">
            {fichas.map((f) => (
              <div key={f.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{f.colaboradores?.nome_completo ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">
                      {f.tipo_movimento} • Responsável: {f.responsavel_nome} •{' '}
                      {new Date(f.created_at).toLocaleString('pt-BR')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        f.status === 'assinada' ? 'default' : f.status === 'pendente' ? 'secondary' : 'destructive'
                      }
                    >
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
                    {f.epis_fichas_itens.map((it) => (
                      <li key={it.id} className="flex justify-between border-t pt-1">
                        <span>
                          {it.descricao} {it.ca && <span className="text-xs text-muted-foreground">(CA {it.ca})</span>}
                        </span>
                        <span className="text-xs">
                          Qtd: {it.quantidade} • {it.status_item}
                        </span>
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
