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
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useDocumentosPessoais, useCriarDocumentoPessoal, useExcluirDocumentoPessoal } from '@/hooks/useTabelasReferencia';
import { maskCpfDisplay, maskPisDisplay } from '@/utils/piiMask';

const TIPOS = ['RG', 'CPF', 'CNH', 'CTPS', 'Título Eleitor', 'Certificado Reservista', 'Comprovante Endereço', 'Certidão Nascimento', 'Certidão Casamento', 'PIS/PASEP', 'Foto 3x4', 'Outro'];

export function DocumentosPessoaisTab({ colaboradorId }: { colaboradorId: string }) {
  const { data, isLoading } = useDocumentosPessoais(colaboradorId);
  const criar = useCriarDocumentoPessoal();
  const excluir = useExcluirDocumentoPessoal(colaboradorId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ tipo_documento: '', numero: '', orgao_emissor: '', data_emissao: '', data_validade: '', arquivo_url: '' });

  const handleSubmit = async () => {
    if (!form.tipo_documento) { toast.error('Tipo de documento é obrigatório'); return; }
    try {
      await criar.mutateAsync({ ...form, colaborador_id: colaboradorId });
      toast.success('Documento adicionado');
      setOpen(false);
      setForm({ tipo_documento: '', numero: '', orgao_emissor: '', data_emissao: '', data_validade: '', arquivo_url: '' });
    } catch { toast.error('Erro ao adicionar documento'); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Documentos Pessoais</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" />Adicionar</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Documento Pessoal</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Tipo *</Label>
                <Select value={form.tipo_documento} onValueChange={v => setForm(f => ({ ...f, tipo_documento: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Número</Label><Input value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} /></div>
              <div><Label>Órgão Emissor</Label><Input value={form.orgao_emissor} onChange={e => setForm(f => ({ ...f, orgao_emissor: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data Emissão</Label><Input type="date" value={form.data_emissao} onChange={e => setForm(f => ({ ...f, data_emissao: e.target.value }))} /></div>
                <div><Label>Data Validade</Label><Input type="date" value={form.data_validade} onChange={e => setForm(f => ({ ...f, data_validade: e.target.value }))} /></div>
              </div>
              <div><Label>URL do Arquivo</Label><Input value={form.arquivo_url} onChange={e => setForm(f => ({ ...f, arquivo_url: e.target.value }))} placeholder="https://..." /></div>
              <Button onClick={handleSubmit} disabled={criar.isPending}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? <Spinner /> : !data?.length ? <p className="text-sm text-muted-foreground">Nenhum documento cadastrado.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Tipo</TableHead><TableHead>Número</TableHead><TableHead>Emissor</TableHead><TableHead>Emissão</TableHead><TableHead>Validade</TableHead><TableHead />
            </TableRow></TableHeader>
            <TableBody>
              {data.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell><Badge variant="outline">{d.tipo_documento}</Badge></TableCell>
                  <TableCell>{d.numero ? (d.tipo_documento === 'CPF' ? maskCpfDisplay(d.numero) : d.tipo_documento === 'PIS/PASEP' ? maskPisDisplay(d.numero) : d.numero) : '-'}</TableCell>
                  <TableCell>{d.orgao_emissor || '-'}</TableCell>
                  <TableCell>{d.data_emissao || '-'}</TableCell>
                  <TableCell>{d.data_validade || '-'}</TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => { if (confirm('Excluir documento?')) excluir.mutate(d.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
