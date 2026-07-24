import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FileText, Plus, Copy, Trash2, Eye, Pencil } from 'lucide-react';
import { useContratoTemplates } from '@/hooks/useContratoTemplates';
import { TIPO_CONTRATO_LABELS, type ContratoTemplate, type TipoContrato } from '@/services/contratoTemplateService';
import { sanitizeContractHtml } from '@/utils/sanitizeHtml';
import { ContratosVencendoPanel } from '@/components/contratos/ContratosVencendoPanel';
import { ContratosAssinaturaKPICard } from '@/components/contratos/ContratosAssinaturaKPICard';

const PLACEHOLDERS = [
  { key: 'empresa.razao_social', label: 'Razão social' },
  { key: 'empresa.cnpj', label: 'CNPJ' },
  { key: 'empresa.cidade', label: 'Cidade' },
  { key: 'empresa.uf', label: 'UF' },
  { key: 'admissao.nome', label: 'Nome do candidato' },
  { key: 'admissao.cpf', label: 'CPF' },
  { key: 'admissao.cargo', label: 'Cargo' },
  { key: 'admissao.departamento', label: 'Departamento' },
  { key: 'admissao.salario_proposto', label: 'Salário proposto' },
  { key: 'admissao.data_prevista', label: 'Data prevista' },
  { key: 'gerado_em', label: 'Data/hora de emissão' },
];

const EMPTY: Partial<ContratoTemplate> = {
  nome: '',
  tipo_contrato: 'clt_indeterminado',
  corpo_html: '<h1>Contrato</h1>\n<p>Empregador: {{empresa.razao_social}}</p>\n<p>Empregado: {{admissao.nome}}</p>',
  descricao: '',
  ativo: true,
};

export default function ContratoTemplatesPage() {
  const { templates, isLoading, salvar, duplicar, excluir } = useContratoTemplates();
  const [openEditor, setOpenEditor] = useState(false);
  const [openPreview, setOpenPreview] = useState<ContratoTemplate | null>(null);
  const [form, setForm] = useState<Partial<ContratoTemplate>>(EMPTY);

  const previewHtml = useMemo(() => sanitizeContractHtml(openPreview?.corpo_html ?? ''), [openPreview]);

  const onEdit = (t: ContratoTemplate) => { setForm(t); setOpenEditor(true); };
  const onNew  = () => { setForm(EMPTY); setOpenEditor(true); };

  const insertPlaceholder = (k: string) => {
    setForm((f) => ({ ...f, corpo_html: (f.corpo_html ?? '') + ` {{${k}}}` }));
  };

  const handleSave = async () => {
    if (!form.nome || !form.tipo_contrato || !form.corpo_html) return;
    await salvar.mutateAsync(form);
    setOpenEditor(false);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Modelos de Contrato
          </h1>
          <p className="text-muted-foreground text-sm">
            Templates parametrizáveis por tipo de contrato e cargo. Usados na geração automática no fluxo de admissão.
          </p>
        </div>
        <Button onClick={onNew}><Plus className="h-4 w-4 mr-2" /> Novo modelo</Button>
      </div>

      <ContratosVencendoPanel />
      <ContratosAssinaturaKPICard />

      <Card>
        <CardHeader><CardTitle>Biblioteca ({templates.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando…</p>
          ) : templates.length === 0 ? (
            <p className="text-muted-foreground">Nenhum modelo cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center justify-between border rounded-lg p-3 hover:bg-muted/40">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{t.nome}</span>
                      <Badge variant="outline">{TIPO_CONTRATO_LABELS[t.tipo_contrato]}</Badge>
                      <Badge variant="secondary">v{t.versao}</Badge>
                      {!t.ativo && <Badge variant="destructive">inativo</Badge>}
                    </div>
                    {t.descricao && <p className="text-xs text-muted-foreground mt-1">{t.descricao}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setOpenPreview(t)} aria-label="Pré-visualizar"><Eye className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => onEdit(t)} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => duplicar.mutate(t.id)} aria-label="Nova versão"><Copy className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => confirm('Excluir modelo?') && excluir.mutate(t.id)} aria-label="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor */}
      <Dialog open={openEditor} onOpenChange={setOpenEditor}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>{form.id ? 'Editar modelo' : 'Novo modelo'}</DialogTitle></DialogHeader>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <Label>Nome</Label>
                <Input value={form.nome ?? ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo_contrato} onValueChange={(v) => setForm({ ...form, tipo_contrato: v as TipoContrato })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_CONTRATO_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descrição (opcional)</Label>
                <Input value={form.descricao ?? ''} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
              </div>
              <div>
                <Label>Variáveis disponíveis</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {PLACEHOLDERS.map((p) => (
                    <Button key={p.key} size="sm" variant="outline" type="button" onClick={() => insertPlaceholder(p.key)}>
                      {`{{${p.key}}}`}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <Label>Corpo HTML</Label>
              <Textarea
                value={form.corpo_html ?? ''}
                onChange={(e) => setForm({ ...form, corpo_html: e.target.value })}
                rows={16}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use <code>{'{{caminho.variavel}}'}</code> para inserir dados dinâmicos.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEditor(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={salvar.isPending}>{salvar.isPending ? 'Salvando…' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview */}
      <Dialog open={!!openPreview} onOpenChange={(o) => !o && setOpenPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Pré-visualização — {openPreview?.nome}</DialogTitle></DialogHeader>
          <div className="border rounded p-4 bg-white text-black max-h-[70vh] overflow-auto" dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
