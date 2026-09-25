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
import { useEmpresas } from '@/hooks/useEmpresas';
import { maskCpfDisplay, maskPisDisplay } from '@/utils/piiMask';
import { safeErrorMessage } from '@/utils/safeError';
import { FileUploadField } from './documentos/FileUploadField';
import { uploadDocumentFile, removeDocumentFile } from '@/services/documentUploadService';

const TIPOS = ['RG', 'CPF', 'CNH', 'CTPS', 'Título Eleitor', 'Certificado Reservista', 'Comprovante Endereço', 'Certidão Nascimento', 'Certidão Casamento', 'PIS/PASEP', 'Foto 3x4', 'Outro'];
const BUCKET = 'documentos-colaboradores';

export function DocumentosPessoaisTab({ colaboradorId }: { colaboradorId: string }) {
  const { data, isLoading } = useDocumentosPessoais(colaboradorId);
  const criar = useCriarDocumentoPessoal();
  const excluir = useExcluirDocumentoPessoal(colaboradorId);
  const { empresaAtualId } = useEmpresas();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ tipo_documento: '', numero: '', orgao_emissor: '', data_emissao: '', data_validade: '' });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const resetForm = () => {
    setForm({ tipo_documento: '', numero: '', orgao_emissor: '', data_emissao: '', data_validade: '' });
    setFile(null);
  };

  const handleSubmit = async () => {
    if (!form.tipo_documento) { toast.error('Tipo de documento é obrigatório'); return; }
    if (!empresaAtualId) { toast.error('Empresa não identificada.'); return; }

    let uploaded: Awaited<ReturnType<typeof uploadDocumentFile>> | null = null;
    if (file) {
      setUploading(true);
      try {
        uploaded = await uploadDocumentFile(file, { bucket: BUCKET, empresaId: empresaAtualId, colaboradorId, categoria: 'documentos-pessoais' });
      } catch (e) {
        setUploading(false);
        toast.error(safeErrorMessage(e, 'Erro ao enviar arquivo.'));
        return;
      }
      setUploading(false);
    }

    try {
      await criar.mutateAsync({
        ...form,
        colaborador_id: colaboradorId,
        ...(uploaded ? { storage_path: uploaded.storage_path, arquivo_nome: uploaded.nome_arquivo, arquivo_tamanho: uploaded.tamanho, mime_type: uploaded.mime_type } : {}),
      });
      toast.success('Documento adicionado');
      setOpen(false);
      resetForm();
    } catch (e) {
      if (uploaded) await removeDocumentFile(BUCKET, uploaded.storage_path).catch(() => {});
      toast.error(safeErrorMessage(e, 'Erro ao adicionar documento.'));
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Documentos Pessoais</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" />Adicionar</Button></DialogTrigger>
          <DialogContent className="max-w-[460px]">
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
              <div><Label>Arquivo</Label><FileUploadField file={file} onFileChange={setFile} uploading={uploading} disabled={criar.isPending} /></div>
              <div className="flex justify-end pt-1">
                <Button size="sm" className="rounded-lg px-4" onClick={handleSubmit} disabled={criar.isPending || uploading}>
                  {(criar.isPending || uploading) && <Spinner className="mr-1.5 h-3.5 w-3.5" />}
                  {uploading ? 'Enviando arquivo...' : 'Salvar'}
                </Button>
              </div>
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
