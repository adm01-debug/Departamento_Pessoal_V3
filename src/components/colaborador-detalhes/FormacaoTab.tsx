import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useFormacoes,
  useCriarFormacao,
  useAtualizarFormacao,
  useExcluirFormacao,
} from '@/hooks/useColaboradorDetalhes';
import type { Tables } from '@/integrations/supabase/database.types';

const ESCOLARIDADES = [
  'Fundamental incompleto',
  'Fundamental completo',
  'Médio incompleto',
  'Médio completo',
  'Superior incompleto',
  'Superior completo',
  'Pós-graduação',
  'Mestrado',
  'Doutorado',
];

const initialForm = { tipo_escolaridade: '', curso: '', instituicao: '', ano_conclusao: '' };

export function FormacaoTab({
  colaboradorId,
  /** Embutido num diálogo que já tem título próprio (Dossiê → Desenvolvimento):
   * esconde o título e o enquadramento do Card, mantendo as ações. */
  hideHeader = false,
}: {
  colaboradorId: string;
  hideHeader?: boolean;
}) {
  const { data, isLoading } = useFormacoes(colaboradorId);
  const criar = useCriarFormacao();
  const atualizar = useAtualizarFormacao(colaboradorId);
  const excluir = useExcluirFormacao(colaboradorId);
  const [open, setOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);

  const fecharEResetar = () => {
    setOpen(false);
    setEditandoId(null);
    setForm(initialForm);
  };

  const abrirEdicao = (f: Tables<'formacoes_academicas'>) => {
    setEditandoId(f.id);
    setForm({
      tipo_escolaridade: f.tipo_escolaridade || '',
      curso: f.curso || '',
      instituicao: f.instituicao || '',
      ano_conclusao: f.ano_conclusao != null ? String(f.ano_conclusao) : '',
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.tipo_escolaridade) {
      toast.error('Escolaridade é obrigatória');
      return;
    }
    // Opcional em branco vai como null: string vazia gravaria '' nas colunas
    // nullable de `formacoes_academicas` em vez de limpar o campo.
    const dados = {
      tipo_escolaridade: form.tipo_escolaridade,
      curso: form.curso || null,
      instituicao: form.instituicao || null,
      ano_conclusao: form.ano_conclusao ? Number(form.ano_conclusao) : null,
    };
    try {
      if (editandoId) {
        await atualizar.mutateAsync({ id: editandoId, dados });
        toast.success('Formação atualizada');
      } else {
        await criar.mutateAsync({ ...dados, colaborador_id: colaboradorId });
        toast.success('Formação adicionada');
      }
      fecharEResetar();
    } catch {
      toast.error(editandoId ? 'Erro ao atualizar formação' : 'Erro ao adicionar formação');
    }
  };

  return (
    <Card className={hideHeader ? 'border-0 bg-transparent shadow-none' : undefined}>
      <CardHeader className={`flex flex-row items-center ${hideHeader ? 'justify-end px-0 pt-0' : 'justify-between'}`}>
        {!hideHeader && <CardTitle className="text-lg">Formação Acadêmica</CardTitle>}
        <Dialog
          open={open}
          onOpenChange={(v) => {
            if (v) setOpen(true);
            else fecharEResetar();
          }}
        >
          <DialogTrigger asChild>
            <Button
              size="sm"
              onClick={() => {
                setEditandoId(null);
                setForm(initialForm);
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editandoId ? 'Editar Formação' : 'Nova Formação'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Escolaridade *</Label>
                <Select
                  value={form.tipo_escolaridade}
                  onValueChange={(v) => setForm((f) => ({ ...f, tipo_escolaridade: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESCOLARIDADES.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Curso</Label>
                <Input value={form.curso} onChange={(e) => setForm((f) => ({ ...f, curso: e.target.value }))} />
              </div>
              <div>
                <Label>Instituição</Label>
                <Input
                  value={form.instituicao}
                  onChange={(e) => setForm((f) => ({ ...f, instituicao: e.target.value }))}
                />
              </div>
              <div>
                <Label>Ano Conclusão</Label>
                <Input
                  type="number"
                  min="1950"
                  max="2030"
                  value={form.ano_conclusao}
                  onChange={(e) => setForm((f) => ({ ...f, ano_conclusao: e.target.value }))}
                />
              </div>
              <Button onClick={handleSubmit} disabled={criar.isPending || atualizar.isPending}>
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Spinner />
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma formação cadastrada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Escolaridade</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Instituição</TableHead>
                <TableHead>Ano</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>{f.tipo_escolaridade || '-'}</TableCell>
                  <TableCell>{f.curso || '-'}</TableCell>
                  <TableCell>{f.instituicao || '-'}</TableCell>
                  <TableCell>{f.ano_conclusao || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" aria-label="Editar formação" onClick={() => abrirEdicao(f)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Excluir formação"
                        onClick={() => {
                          if (confirm('Excluir formação?')) excluir.mutate(f.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
