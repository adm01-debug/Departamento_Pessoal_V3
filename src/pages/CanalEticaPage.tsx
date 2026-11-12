import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, useEmpresas } from '@/hooks';
import { toast } from 'sonner';
import { Plus, Shield } from 'lucide-react';
import { validateTablePayload } from '@/schemas/validate';
import { comunicacaoService } from '@/services/comunicacaoService';
import { safeErrorMessage } from '@/utils/safeError';
import type { Tables } from '@/integrations/supabase/types';

// 'aberto' é o DEFAULT da coluna; 'em_analise' e 'resolvido' são os estados já exibidos na listagem.
const STATUS_DENUNCIA = [
  { value: 'aberto', label: 'Aberto' },
  { value: 'em_analise', label: 'Em análise' },
  { value: 'resolvido', label: 'Resolvido' },
];

export default function CanalEticaPage() {
  const { empresaAtual } = useEmpresas();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ categoria: '', descricao: '', prioridade: 'media', anonimo: false });
  const { isAdmin, hasRole } = useAuth();
  // Espelha a policy canal_etica_rh_manage (pode_gerir_rh): só RH/admin trata denúncias.
  const podeTratar = isAdmin || hasRole('rh');
  const [selecionada, setSelecionada] = useState<Tables<'canal_etica'> | null>(null);
  const [tratamento, setTratamento] = useState({ status: 'aberto', resposta: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['canal-etica', empresaAtual?.id],
    queryFn: async () => {
      let q = supabase.from('canal_etica').select('*').order('created_at', { ascending: false });
      if (empresaAtual?.id) q = q.eq('empresa_id', empresaAtual.id);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const criar = useMutation({
    mutationFn: async (d: typeof form) => {
      const { error } = await supabase
        .from('canal_etica')
        .insert(
          validateTablePayload(
            'canal_etica',
            { ...d, empresa_id: empresaAtual?.id, anonimo: d.anonimo },
            'CanalEticaPage:canal_etica'
          )
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canal-etica'] });
      queryClient.invalidateQueries({ queryKey: ['canal_etica'] });
      setOpen(false);
      toast.success('Denúncia registrada');
    },
  });

  const tratar = useMutation({
    mutationFn: async () => {
      if (!selecionada || !empresaAtual?.id) throw new Error('Denúncia ou empresa não selecionada');
      return comunicacaoService.atualizarDenuncia(
        selecionada.id,
        { status: tratamento.status, resposta: tratamento.resposta.trim() || null },
        empresaAtual.id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canal-etica'] });
      queryClient.invalidateQueries({ queryKey: ['canal_etica'] });
      setSelecionada(null);
      toast.success('Denúncia atualizada');
    },
    onError: (err) => toast.error(safeErrorMessage(err, 'Erro ao atualizar denúncia')),
  });

  const abrirTratamento = (r: Tables<'canal_etica'>) => {
    setSelecionada(r);
    setTratamento({ status: r.status || 'aberto', resposta: r.resposta || '' });
  };

  const statusColor = (s: string | null) =>
    s === 'resolvido' ? 'default' : s === 'em_analise' ? 'secondary' : 'outline';

  return (
    <>
      <PageTitle title="Canal de Ética" description="Canal de denúncias e ética" />
      <PageLayout
        title="Canal de Ética"
        description="Denúncias e relatos éticos"
        icon={<Shield className="h-5 w-5 text-primary-foreground" />}
      >
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Denúncia
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Denúncia</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Categoria</Label>
                  <Select value={form.categoria} onValueChange={(v) => setForm((p) => ({ ...p, categoria: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assedio">Assédio</SelectItem>
                      <SelectItem value="fraude">Fraude</SelectItem>
                      <SelectItem value="discriminacao">Discriminação</SelectItem>
                      <SelectItem value="conflito_interesse">Conflito de Interesse</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={form.descricao}
                    onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <Select value={form.prioridade} onValueChange={(v) => setForm((p) => ({ ...p, prioridade: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="critica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.anonimo}
                    onChange={(e) => setForm((p) => ({ ...p, anonimo: e.target.checked }))}
                  />
                  <Label>Denúncia anônima</Label>
                </div>
                <Button
                  onClick={() => criar.mutate(form)}
                  disabled={!form.categoria || !form.descricao}
                  className="w-full"
                >
                  Registrar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 flex justify-center">
                <Spinner />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Protocolo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Anônimo</TableHead>
                    <TableHead>Data</TableHead>
                    {podeTratar && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">{r.protocolo}</TableCell>
                      <TableCell className="capitalize">{r.categoria}</TableCell>
                      <TableCell>
                        <Badge variant={r.prioridade === 'critica' ? 'destructive' : 'secondary'}>{r.prioridade}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColor(r.status)}>{r.status || 'pendente'}</Badge>
                      </TableCell>
                      <TableCell>{r.anonimo ? 'Sim' : 'Não'}</TableCell>
                      <TableCell>{r.created_at ? new Date(r.created_at).toLocaleDateString('pt-BR') : '-'}</TableCell>
                      {podeTratar && (
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => abrirTratamento(r)}>
                            Tratar
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {!data?.length && (
                    <TableRow>
                      <TableCell colSpan={podeTratar ? 7 : 6} className="text-center text-muted-foreground py-8">
                        Nenhuma denúncia registrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selecionada} onOpenChange={(o) => !o && setSelecionada(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Denúncia {selecionada?.protocolo}</DialogTitle>
            </DialogHeader>
            {selecionada && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <span className="capitalize">{selecionada.categoria}</span> · prioridade {selecionada.prioridade} ·{' '}
                  {selecionada.anonimo ? 'anônima' : 'identificada'}
                </div>
                <div>
                  <Label>Descrição</Label>
                  <p className="mt-1 whitespace-pre-wrap rounded-md border p-3 text-sm">{selecionada.descricao}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={tratamento.status} onValueChange={(v) => setTratamento((p) => ({ ...p, status: v }))}>
                    <SelectTrigger aria-label="Status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_DENUNCIA.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="canal-etica-resposta">Parecer / resposta</Label>
                  <Textarea
                    id="canal-etica-resposta"
                    value={tratamento.resposta}
                    onChange={(e) => setTratamento((p) => ({ ...p, resposta: e.target.value }))}
                  />
                </div>
                <Button onClick={() => tratar.mutate()} disabled={tratar.isPending} className="w-full">
                  {tratar.isPending ? 'Salvando...' : 'Salvar tratamento'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </PageLayout>
    </>
  );
}
