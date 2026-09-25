import { useState } from 'react';
import { motion } from 'framer-motion';
import { Paperclip, Plus, Trash2, ExternalLink, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnimatedCascadeDialog } from '@/components/ui/animated-cascade-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { useDocumentos } from '@/hooks';
import { useEmpresas } from '@/hooks/useEmpresas';
import { safeHref } from '@/utils/safeUrl';
import { safeErrorMessage } from '@/utils/safeError';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { FileTypeIcon } from './FileTypeIcon';
import { FileUploadField } from './FileUploadField';
import { uploadDocumentFile, removeDocumentFile, resolveDocumentUrl } from '@/services/documentUploadService';

const MotionCard = motion.create(Card);
const BUCKET = 'documentos';

const TIPOS = [
  'Contrato de Trabalho', 'Aditivo Contratual', 'Acordo de Confidencialidade',
  'Vale Transporte', 'Vale Refeição', 'Exame Médico (ASO)', 'EPI', 'Treinamento', 'Outros',
];

/** Painel compacto de "Gestão de Documentos Digitais" — mesmos dados/mutations
 * de ColaboradorDocuments (useDocumentos, mesma query key), reconstruído em
 * layout denso pra ficar logo abaixo de "Documentos Pessoais" na coluna
 * esquerda do dashboard de "Documentos & Compliance". O arquivo vai pro
 * bucket privado `documentos` (Storage) — só o `storage_path` persistente é
 * salvo no banco; URLs assinadas são geradas sob demanda ao abrir/baixar. */
export function DocumentosDigitaisCard({ colaboradorId }: { colaboradorId: string }) {
  const { documentos, isLoading, criarDocumento, excluirDocumento } = useDocumentos(colaboradorId);
  const { empresaAtualId } = useEmpresas();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', tipo: 'Outros', observacoes: '', data_validade: '' });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const resetForm = () => {
    setForm({ nome: '', tipo: 'Outros', observacoes: '', data_validade: '' });
    setFile(null);
  };

  const handleSubmit = async () => {
    if (!form.nome) { toast.error('Nome do documento é obrigatório'); return; }
    if (!empresaAtualId) { toast.error('Empresa não identificada.'); return; }

    let uploaded: Awaited<ReturnType<typeof uploadDocumentFile>> | null = null;
    if (file) {
      setUploading(true);
      try {
        uploaded = await uploadDocumentFile(file, { bucket: BUCKET, empresaId: empresaAtualId, colaboradorId, categoria: 'documentos-digitais' });
      } catch (e) {
        setUploading(false);
        toast.error(safeErrorMessage(e, 'Erro ao enviar arquivo.'));
        return;
      }
      setUploading(false);
    }

    try {
      await criarDocumento.mutateAsync({
        ...form,
        colaborador_id: colaboradorId,
        ...(uploaded ? { storage_path: uploaded.storage_path, nome_arquivo: uploaded.nome_arquivo, tamanho: uploaded.tamanho, mime_type: uploaded.mime_type } : {}),
      });
      setOpen(false);
      resetForm();
    } catch {
      // useDocumentos já mostra o toast de erro (criarDocumento.onError) —
      // aqui só desfazemos o upload pra não deixar arquivo órfão no Storage.
      if (uploaded) await removeDocumentFile(BUCKET, uploaded.storage_path).catch(() => {});
    }
  };

  const handleAbrir = async (doc: any) => {
    try {
      const url = await resolveDocumentUrl(doc, BUCKET);
      if (!url) { toast.error('Arquivo não encontrado.'); return; }
      window.open(safeHref(url), '_blank', 'noopener');
    } catch (e) {
      toast.error(safeErrorMessage(e, 'Erro ao abrir documento.'));
    }
  };

  const handleExcluir = async (doc: any) => {
    if (!confirm('Tem certeza que deseja excluir este documento permanentemente?')) return;
    try {
      await excluirDocumento.mutateAsync(doc.id);
    } catch {
      return; // excluirDocumento já mostra o toast de erro
    }
    if (doc.storage_path) {
      removeDocumentFile(BUCKET, doc.storage_path).catch(() =>
        toast.error('Documento excluído, mas houve falha ao remover o arquivo do armazenamento.')
      );
    }
  };

  return (
    <MotionCard custom={1} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl shadow-elevated h-[300px] flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col min-h-0">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-start gap-2.5">
            <Paperclip className="h-5 w-5 text-info mt-0.5" />
            <div>
              <p className="text-sm font-display font-medium">Gestão de Documentos Digitais</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Repositório central de arquivos e contratos do colaborador</p>
            </div>
          </div>
          <Button size="sm" className="h-7 px-3 text-[11px] shrink-0" onClick={() => setOpen(true)}><Plus className="mr-1 h-3 w-3" />Novo documento</Button>
        </div>

        <AnimatedCascadeDialog
          open={open}
          onOpenChange={setOpen}
          title="Adicionar Novo Documento"
          titleIcon={Paperclip}
          emptyMessage=""
          items={[
            <div key="nome" className="space-y-1">
              <Label>Nome do Documento *</Label>
              <Input placeholder="Ex: Contrato de Trabalho 2024" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </div>,
            <div key="tipo" className="space-y-1">
              <Label>Tipo de Documento</Label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>,
            <div key="validade" className="space-y-1">
              <Label>Data de Validade (opcional)</Label>
              <Input type="date" value={form.data_validade} onChange={e => setForm(f => ({ ...f, data_validade: e.target.value }))} />
            </div>,
            <div key="arquivo" className="space-y-1">
              <Label>Arquivo</Label>
              <FileUploadField file={file} onFileChange={setFile} uploading={uploading} disabled={criarDocumento.isPending} />
            </div>,
            <div key="observacoes" className="space-y-1">
              <Label>Observações</Label>
              <Input placeholder="Notas internas..." value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
            </div>,
            <div key="salvar" className="flex justify-end pt-1">
              <Button size="sm" className="rounded-lg px-4" onClick={handleSubmit} disabled={criarDocumento.isPending || uploading}>
                {(criarDocumento.isPending || uploading) ? <Spinner className="mr-1.5 h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5 mr-1.5" />}
                {uploading ? 'Enviando arquivo...' : 'Salvar Documento com Segurança'}
              </Button>
            </div>,
          ]}
        />

        {isLoading ? <div className="flex justify-center py-4"><Spinner /></div> : !documentos.length ? (
          <p className="text-xs text-muted-foreground py-1">Nenhum documento anexado.</p>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-8 px-2 text-[11px] font-medium">Documento</TableHead>
                <TableHead className="h-8 px-2 text-[11px] font-medium text-center">Tipo</TableHead>
                <TableHead className="h-8 px-2 text-[11px] font-medium text-center">Upload em</TableHead>
                <TableHead className="h-8 px-2 text-[11px] font-medium text-center">Validade</TableHead>
                <TableHead className="h-8 px-2 text-[11px] font-medium text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentos.map((doc: any) => (
                <TableRow key={doc.id} className="group border-border/20">
                  <TableCell className="px-2 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileTypeIcon url={doc.nome_arquivo || doc.url} mimeType={doc.mime_type} tipo={doc.tipo} className="h-5 w-5 shrink-0" />
                      <span className="text-xs font-medium truncate">{doc.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-2.5 text-center"><Badge variant="outline" size="sm" className="uppercase">{doc.tipo}</Badge></TableCell>
                  <TableCell className="px-2 py-2.5 text-xs text-muted-foreground text-center">{new Date(doc.created_at).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="px-2 py-2.5 text-xs text-center">
                    {doc.data_validade ? (
                      <span className={new Date(doc.data_validade) < new Date() ? 'text-destructive font-medium' : 'text-success font-medium'}>
                        {new Date(doc.data_validade).toLocaleDateString('pt-BR')}
                      </span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="px-2 py-2.5 text-right">
                    <div className="flex justify-end gap-0.5">
                      {(doc.storage_path || doc.url) && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Abrir em nova aba" onClick={() => handleAbrir(doc)}>
                          <ExternalLink className="h-3.5 w-3.5 text-info" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Excluir" onClick={() => handleExcluir(doc)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </CardContent>
    </MotionCard>
  );
}
