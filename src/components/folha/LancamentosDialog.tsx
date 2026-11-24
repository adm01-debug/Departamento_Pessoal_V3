import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { eventosVariaveisService, rubricasFolhaService } from '@/services/tabelas/folhaService';
import { useEmpresas } from '@/hooks/useEmpresas';

interface LancamentosDialogProps {
  empresaId?: string;
  // Competência no formato 'YYYY-MM' (mesmo gravado em eventos_variaveis).
  competencia: string;
}

/**
 * Lançamento manual de eventos variáveis (comissão, bônus, adicionais e
 * descontos por rubrica) — a entrada que faltava para alimentar o cálculo:
 * ambos os motores (lote e edge) já leem eventos_variaveis por competência.
 */
export function LancamentosDialog({ empresaId, competencia }: LancamentosDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [novo, setNovo] = useState({ colaborador_id: '', rubrica_id: '', valor: '', referencia: '', observacao: '' });
  const queryClient = useQueryClient();
  const { empresaAtual } = useEmpresas();
  const empId = empresaId ?? empresaAtual?.id;

  const { data: eventos, isLoading } = useQuery({
    queryKey: ['eventos_variaveis', empId, competencia],
    queryFn: () => eventosVariaveisService.listar(empId!, competencia),
    enabled: isOpen && !!empId,
  });

  const { data: colaboradores } = useQuery({
    queryKey: ['colaboradores-lancamentos', empId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('id, nome_completo')
        .eq('empresa_id', empId!)
        .eq('status', 'ativo')
        .order('nome_completo');
      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!empId,
  });

  const { data: rubricas } = useQuery({
    queryKey: ['rubricas_folha', empId],
    queryFn: () => rubricasFolhaService.listar(empId!),
    enabled: isOpen && !!empId,
  });

  const criarMutation = useMutation({
    mutationFn: async () => {
      const valor = Number(String(novo.valor).replace(',', '.'));
      const referencia = novo.referencia ? Number(String(novo.referencia).replace(',', '.')) : null;
      if (!novo.colaborador_id || !novo.rubrica_id || !(valor > 0)) {
        throw new Error('Colaborador, rubrica e valor positivo são obrigatórios.');
      }
      if (novo.referencia && !Number.isFinite(referencia)) {
        throw new Error('Referência deve ser numérica (ex.: 10 para 10 horas).');
      }
      await eventosVariaveisService.criar({
        empresa_id: empId!,
        colaborador_id: novo.colaborador_id,
        rubrica_id: novo.rubrica_id,
        competencia,
        valor,
        referencia,
        observacao: novo.observacao || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos_variaveis', empId, competencia] });
      toast.success('Lançamento registrado — será lido no próximo cálculo da competência.');
      setNovo({ colaborador_id: '', rubrica_id: '', valor: '', referencia: '', observacao: '' });
    },
    onError: (e) => toast.error(safeErrorMessage(e, 'Erro ao registrar lançamento.')),
  });

  const excluirMutation = useMutation({
    mutationFn: (id: string) => eventosVariaveisService.excluir(id, empId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos_variaveis', empId, competencia] });
      toast.success('Lançamento excluído');
    },
    onError: (e) => toast.error(safeErrorMessage(e, 'Erro ao excluir lançamento.')),
  });

  const fmt = (v: number | string | null) =>
    Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-xl gap-1.5 font-body">
          <ClipboardList className="h-4 w-4" />
          <span className="hidden sm:inline">Lançamentos</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Eventos Variáveis — {competencia}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end border rounded-xl p-3">
          <div className="col-span-2 md:col-span-2 space-y-1">
            <Label className="text-xs">Colaborador</Label>
            <Select value={novo.colaborador_id} onValueChange={(v) => setNovo((p) => ({ ...p, colaborador_id: v }))}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {(colaboradores ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome_completo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 md:col-span-2 space-y-1">
            <Label className="text-xs">Rubrica</Label>
            <Select value={novo.rubrica_id} onValueChange={(v) => setNovo((p) => ({ ...p, rubrica_id: v }))}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {(rubricas ?? [])
                  .filter((r) => r.ativo !== false)
                  .map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.codigo} — {r.descricao} ({r.tipo})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Valor (R$)</Label>
            <Input
              className="rounded-xl"
              inputMode="decimal"
              placeholder="0,00"
              value={novo.valor}
              onChange={(e) => setNovo((p) => ({ ...p, valor: e.target.value }))}
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Referência (qtd, opcional)</Label>
            <Input
              className="rounded-xl"
              inputMode="decimal"
              placeholder="Ex.: 10 (horas)"
              value={novo.referencia}
              onChange={(e) => setNovo((p) => ({ ...p, referencia: e.target.value }))}
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Observação (opcional)</Label>
            <Input
              className="rounded-xl"
              value={novo.observacao}
              onChange={(e) => setNovo((p) => ({ ...p, observacao: e.target.value }))}
            />
          </div>
          <Button
            size="sm"
            className="rounded-xl gap-1.5 col-span-2 md:col-span-1"
            onClick={() => criarMutation.mutate()}
            disabled={criarMutation.isPending || !empId}
          >
            <Plus className="h-4 w-4" /> Lançar
          </Button>
        </div>

        <div className="border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Rubrica</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    Carregando…
                  </TableCell>
                </TableRow>
              ) : (eventos ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    Nenhum lançamento nesta competência.
                  </TableCell>
                </TableRow>
              ) : (
                (eventos ?? []).map((ev) => {
                  const rubrica = (rubricas ?? []).find((r) => r.id === ev.rubrica_id);
                  return (
                    <TableRow key={ev.id}>
                      <TableCell>
                        {(ev as { colaborador?: { nome_completo?: string } | null }).colaborador?.nome_completo ??
                          ev.colaborador_id}
                      </TableCell>
                      <TableCell>{rubrica ? `${rubrica.codigo} — ${rubrica.descricao}` : ev.rubrica_id}</TableCell>
                      <TableCell>
                        <Badge variant={rubrica?.tipo === 'desconto' ? 'destructive' : 'default'}>
                          {rubrica?.tipo ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{fmt(ev.valor)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Excluir lançamento"
                          onClick={() => excluirMutation.mutate(ev.id)}
                          disabled={excluirMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
