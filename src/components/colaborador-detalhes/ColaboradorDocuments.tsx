import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Plus, Trash2, FileText, Download, ExternalLink, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useDocumentos } from '@/hooks/useDocumentos';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { safeHref } from '@/utils/safeUrl';

export function ColaboradorDocuments({ colaboradorId }: { colaboradorId: string }) {
  const { documentos, isLoading, criarDocumento, excluirDocumento } = useDocumentos(colaboradorId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ 
    nome: '', 
    tipo: 'Outros', 
    url: '', 
    observacoes: '', 
    data_validade: '' 
  });

  const TIPOS = [
    'Contrato de Trabalho',
    'Aditivo Contratual',
    'Acordo de Confidencialidade',
    'Vale Transporte',
    'Vale Refeição',
    'Exame Médico (ASO)',
    'EPI',
    'Treinamento',
    'Outros'
  ];

  const handleSubmit = async () => {
    if (!form.nome) {
      toast.error('Nome do documento é obrigatório');
      return;
    }
    try {
      await criarDocumento.mutateAsync({ 
        ...form, 
        colaborador_id: colaboradorId 
      });
      setOpen(false);
      setForm({ nome: '', tipo: 'Outros', url: '', observacoes: '', data_validade: '' });
    } catch (err: any) {
      toast.error('Erro ao salvar documento');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-display font-bold">Gestão de Documentos Digitais</h3>
          <p className="text-sm text-muted-foreground">Repositório central de arquivos e contratos do colaborador</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-glow">
              <Plus className="h-4 w-4 mr-2" /> Novo Documento
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Adicionar Novo Documento</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Documento *</Label>
                <Input 
                  placeholder="Ex: Contrato de Trabalho 2024" 
                  value={form.nome} 
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Documento</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data de Validade (opcional)</Label>
                <Input 
                  type="date" 
                  value={form.data_validade} 
                  onChange={e => setForm(f => ({ ...f, data_validade: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>URL / Link do Arquivo</Label>
                <Input 
                  placeholder="https://..." 
                  value={form.url} 
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Input 
                  placeholder="Notas internas..." 
                  value={form.observacoes} 
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
            </div>
            <Button onClick={handleSubmit} className="w-full rounded-xl" disabled={criarDocumento.isPending}>
              {criarDocumento.isPending ? <Spinner className="mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
              Salvar Documento com Segurança
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-display py-4 pl-6">Documento</TableHead>
              <TableHead className="font-display">Tipo</TableHead>
              <TableHead className="font-display">Upload em</TableHead>
              <TableHead className="font-display">Validade</TableHead>
              <TableHead className="w-[100px] text-right pr-6">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="h-32 text-center"><Spinner /></TableCell></TableRow>
            ) : documentos.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground font-body italic">Nenhum documento anexado.</TableCell></TableRow>
            ) : (
              documentos.map((doc: any) => (
                <TableRow key={doc.id} className="group transition-colors hover:bg-muted/10">
                  <TableCell className="py-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-bold text-sm">{doc.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-full bg-muted/30 font-body text-[10px] uppercase">
                      {doc.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(doc.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-xs">
                    {doc.data_validade ? (
                      <span className={new Date(doc.data_validade) < new Date() ? 'text-destructive font-bold' : 'text-success font-bold'}>
                        {format(new Date(doc.data_validade), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground opacity-50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {doc.url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Abrir em nova aba"
                          className="h-8 w-8 rounded-lg hover:bg-info/10 text-info"
                          onClick={() => window.open(safeHref(doc.url), '_blank', 'noopener')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Excluir"
                        className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-destructive"
                        onClick={() => {
                          if (confirm('Tem certeza que deseja excluir este documento permanentemente?')) {
                            excluirDocumento.mutate(doc.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
