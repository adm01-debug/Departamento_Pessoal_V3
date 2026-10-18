import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { useAdmissoes } from '@/hooks/useAdmissoes';

const departamentos = [
  'Administrativo',
  'Comercial',
  'Contabilidade',
  'Financeiro',
  'Jurídico',
  'Marketing',
  'Operações',
  'RH',
  'TI',
  'Outro',
];

interface NovaAdmissaoDialogProps {
  children?: React.ReactNode;
}

export function NovaAdmissaoDialog({ children }: NovaAdmissaoDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { criar } = useAdmissoes();

  const [form, setForm] = useState({
    nome: '',
    cargo: '',
    departamento: '',
    data_prevista: '',
    salario_proposto: '',
    email: '',
    telefone: '',
    cpf: '',
    data_nascimento: '',
    nome_mae: '',
    sexo: '',
    observacoes: '',
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.cargo || !form.departamento || !form.data_prevista || !form.salario_proposto) {
      return;
    }
    setLoading(true);
    try {
      await criar({
        nome: form.nome,
        cargo: form.cargo,
        departamento: form.departamento,
        data_prevista: form.data_prevista,
        salario_proposto: parseFloat(form.salario_proposto),
        email: form.email || null,
        telefone: form.telefone || null,
        cpf: form.cpf || null,
        data_nascimento: form.data_nascimento || null,
        nome_mae: form.nome_mae || null,
        sexo: form.sexo || null,
        observacoes: form.observacoes || null,
      });
      setForm({
        nome: '',
        cargo: '',
        departamento: '',
        data_prevista: '',
        salario_proposto: '',
        email: '',
        telefone: '',
        cpf: '',
        data_nascimento: '',
        nome_mae: '',
        sexo: '',
        observacoes: '',
      });
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="rounded-xl bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 shadow-lg font-body text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" />
            Nova Admissão
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Nova Admissão</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="nome">Nome completo *</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => handleChange('nome', e.target.value)}
                required
                placeholder="Nome do candidato"
              />
            </div>
            <div>
              <Label htmlFor="cargo">Cargo *</Label>
              <Input
                id="cargo"
                value={form.cargo}
                onChange={(e) => handleChange('cargo', e.target.value)}
                required
                placeholder="Ex: Analista"
              />
            </div>
            <div>
              <Label htmlFor="departamento">Departamento *</Label>
              <Select value={form.departamento} onValueChange={(v) => handleChange('departamento', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {departamentos.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="data_prevista">Data prevista *</Label>
              <Input
                id="data_prevista"
                type="date"
                value={form.data_prevista}
                onChange={(e) => handleChange('data_prevista', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="salario_proposto">Salário proposto *</Label>
              <Input
                id="salario_proposto"
                type="number"
                step="0.01"
                min="0"
                value={form.salario_proposto}
                onChange={(e) => handleChange('salario_proposto', e.target.value)}
                required
                placeholder="0,00"
              />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={form.telefone}
                onChange={(e) => handleChange('telefone', e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={form.cpf}
                onChange={(e) => handleChange('cpf', e.target.value)}
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <Label htmlFor="data_nascimento">Data de nascimento</Label>
              <Input
                id="data_nascimento"
                type="date"
                value={form.data_nascimento}
                onChange={(e) => handleChange('data_nascimento', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="sexo">Sexo</Label>
              <Select value={form.sexo} onValueChange={(v) => handleChange('sexo', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="nome_mae">Nome da mãe</Label>
              <Input
                id="nome_mae"
                value={form.nome_mae}
                onChange={(e) => handleChange('nome_mae', e.target.value)}
                placeholder="Obrigatório p/ gerar o colaborador na conclusão"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={form.observacoes}
              onChange={(e) => handleChange('observacoes', e.target.value)}
              rows={3}
              placeholder="Informações adicionais..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-primary-foreground"
            >
              {loading ? 'Salvando...' : 'Criar Admissão'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
