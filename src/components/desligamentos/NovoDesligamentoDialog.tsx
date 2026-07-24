import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, UserMinus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { desligamentoService } from '@/services/desligamentoService';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
interface Props {
  open: boolean;
  onClose: () => void;
}

export function NovoDesligamentoDialog({ open, onClose }: Props) {
  const { empresaAtual } = useEmpresas();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [loadingColab, setLoadingColab] = useState(false);
  const [form, setForm] = useState({
    colaborador_id: '',
    data_desligamento: '',
    tipo: 'sem_justa_causa' as string,
    motivo: '',
    data_aviso_previo: '',
    quebra_contrato: false,
    remover_beneficios: true,
    aviso_trabalhado: false,
    saldo_fgts: '',
  });

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  // Load colaboradores when dialog opens
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const loadColaboradores = useCallback(async () => {
    if (!empresaAtual?.id) return;
    setLoadingColab(true);
    const { data } = await supabase
      .from('colaboradores')
      .select('id, nome_completo, cargo, salario_base')

      .eq('empresa_id', empresaAtual.id)
      .eq('status', 'ativo')
      .order('nome_completo');
    setColaboradores(data || []);
    setLoadingColab(false);
  }, [empresaAtual?.id]);

  const handleOpenChange = (v: boolean) => {
    if (v) loadColaboradores();
    else onClose();
  };

  const handleSubmit = async () => {
    if (!form.colaborador_id || !form.data_desligamento) {
      toast.error('Selecione o colaborador e a data de desligamento');
      return;
    }

    const colaborador = colaboradores.find((c) => c.id === form.colaborador_id);
    setLoading(true);
    try {
      await desligamentoService.criar({
        colaborador_id: form.colaborador_id,
        data_desligamento: form.data_desligamento,
        tipo: form.tipo,
        motivo: form.motivo || null,
        data_aviso_previo: form.data_aviso_previo || null,
        quebra_contrato: form.quebra_contrato,
        remover_beneficios: form.remover_beneficios,
        salario_base: colaborador?.salario_base || 0,
        aviso_trabalhado: form.aviso_trabalhado,
        saldo_fgts: Number(form.saldo_fgts) || 0,
        status: 'pendente',
        empresa_id: empresaAtual?.id,
      });
      queryClient.invalidateQueries({ queryKey: ['desligamentos'] });
      toast.success('Desligamento registrado com sucesso');
      onClose();
      setForm({ 
        colaborador_id: '', 
        data_desligamento: '', 
        tipo: 'sem_justa_causa', 
        motivo: '', 
        data_aviso_previo: '', 
        quebra_contrato: false, 
        remover_beneficios: true,
        aviso_trabalhado: false,
        saldo_fgts: ''
      });
    } catch (e: any) {
      toast.error(safeErrorMessage(e, 'Erro ao criar desligamento.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <UserMinus className="h-5 w-5 text-destructive" />
            Novo Desligamento
          </DialogTitle>
          <DialogDescription className="font-body text-xs">Registre um novo desligamento de colaborador</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label htmlFor="desl-colaborador" className="font-body text-xs">Colaborador *</Label>
            <Select value={form.colaborador_id} onValueChange={(v) => set('colaborador_id', v)}>
              <SelectTrigger id="desl-colaborador" className="rounded-xl">
                <SelectValue placeholder={loadingColab ? 'Carregando...' : 'Selecione o colaborador'} />
              </SelectTrigger>
              <SelectContent>
                {colaboradores.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome_completo} {c.cargo ? `— ${c.cargo}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="desl-data" className="font-body text-xs">Data Desligamento *</Label>
              <Input id="desl-data" type="date" value={form.data_desligamento} onChange={(e) => set('data_desligamento', e.target.value)} className="rounded-xl" />
            </div>
            <div>
              <Label htmlFor="desl-tipo" className="font-body text-xs">Tipo de Rescisão *</Label>
              <Select value={form.tipo} onValueChange={(v) => set('tipo', v)}>
                <SelectTrigger id="desl-tipo" className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sem_justa_causa">Sem Justa Causa</SelectItem>
                  <SelectItem value="com_justa_causa">Com Justa Causa</SelectItem>
                  <SelectItem value="pedido_demissao">Pedido de Demissão</SelectItem>
                  <SelectItem value="acordo_mutuo">Acordo Mútuo</SelectItem>
                  <SelectItem value="termino_contrato">Término de Contrato</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="desl-aviso-trabalhado" className="font-body text-xs">Aviso Prévio Trabalhado?</Label>
              <div className="flex items-center h-10">
                <Switch id="desl-aviso-trabalhado" checked={form.aviso_trabalhado} onCheckedChange={(v) => set('aviso_trabalhado', v)} />
              </div>
            </div>
            <div>
              <Label htmlFor="desl-saldo-fgts" className="font-body text-xs">Saldo FGTS Estimado (R$)</Label>
              <Input id="desl-saldo-fgts" type="number" value={form.saldo_fgts} onChange={(e) => set('saldo_fgts', e.target.value)} className="rounded-xl" placeholder="0.00" />
            </div>
          </div>

          <div>
            <Label htmlFor="desl-aviso-previo" className="font-body text-xs">Data Aviso Prévio</Label>
            <Input id="desl-aviso-previo" type="date" value={form.data_aviso_previo} onChange={(e) => set('data_aviso_previo', e.target.value)} className="rounded-xl" />
          </div>

          <div>
            <Label htmlFor="desl-motivo" className="font-body text-xs">Motivo</Label>
            <Textarea id="desl-motivo" value={form.motivo} onChange={(e) => set('motivo', e.target.value)} className="rounded-xl resize-none" rows={2} placeholder="Descreva o motivo do desligamento..." />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="desl-quebra" className="font-body text-xs">Quebra de contrato?</Label>
            <Switch id="desl-quebra" checked={form.quebra_contrato} onCheckedChange={(v) => set('quebra_contrato', v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="desl-remover-beneficios" className="font-body text-xs">Remover benefícios automaticamente?</Label>
            <Switch id="desl-remover-beneficios" checked={form.remover_beneficios} onCheckedChange={(v) => set('remover_beneficios', v)} />
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-destructive to-destructive/70 font-body">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserMinus className="h-4 w-4 mr-2" />}
            Registrar Desligamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
