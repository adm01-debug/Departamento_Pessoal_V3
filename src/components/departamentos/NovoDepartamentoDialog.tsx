import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { toast } from 'sonner';
import { Building2, Save } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  departamento?: any;
}

export function NovoDepartamentoDialog({ open, onOpenChange, departamento }: Props) {
  const { criar, atualizar } = useDepartamentos();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    ativo: true,
  });

  useEffect(() => {
    if (open) {
      if (departamento) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setForm({
          nome: departamento.nome || '',
          descricao: departamento.descricao || '',
          ativo: departamento.ativo !== false,
        });
      } else {
        setForm({ nome: '', descricao: '', ativo: true });
      }
    }
  }, [departamento, open]);

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast.error('Informe o nome do departamento');
      return;
    }
    setSaving(true);
    try {
      if (departamento?.id) {
        await atualizar({ id: departamento.id, data: form });
      } else {
        await criar(form);
      }
      onOpenChange(false);
    } catch (e) {
      // toast já tratado no hook
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Building2 className="h-5 w-5 text-primary" />
            {departamento ? 'Editar Departamento' : 'Novo Departamento'}
          </DialogTitle>
          <DialogDescription>
            Cadastre uma unidade ou centro de custo da empresa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input
              value={form.nome}
              onChange={(e) => setForm(p => ({ ...p, nome: e.target.value }))}
              placeholder="Ex: Recursos Humanos"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={form.descricao}
              onChange={(e) => setForm(p => ({ ...p, descricao: e.target.value }))}
              placeholder="Breve descrição do departamento"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/40 p-3">
            <div>
              <Label className="font-bold">Departamento ativo</Label>
              <p className="text-xs text-muted-foreground">Inativos não aparecem em novos cadastros</p>
            </div>
            <Switch
              checked={form.ativo}
              onCheckedChange={(v) => setForm(p => ({ ...p, ativo: v }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2 rounded-xl shadow-glow">
            {saving ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
            {departamento ? 'Salvar' : 'Criar Departamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
