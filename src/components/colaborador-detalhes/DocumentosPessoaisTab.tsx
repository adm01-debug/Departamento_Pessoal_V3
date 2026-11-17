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
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useDocumentosPessoais,
  useCriarDocumentoPessoal,
  useExcluirDocumentoPessoal,
} from '@/hooks/useTabelasReferencia';
import { usePiiMask } from '@/hooks/usePiiMask';
import { safeHref } from '@/utils/safeUrl';
import { safeErrorMessage } from '@/utils/safeError';
import { FileUploadField } from './documentos/FileUploadField';
import { uploadDocumentFile, removeDocumentFile, resolveDocumentUrl } from '@/services/documentUploadService';
import { useEmpresas } from '@/hooks/useEmpresas';

const BUCKET = 'documentos-colaboradores';

const TIPOS = [
  'RG',
  'CPF',
  'CNH',
  'CTPS',
  'Título Eleitor',
  'Certificado Reservista',
  'Comprovante Endereço',
  'Certidão Nascimento',
  'Certidão Casamento',
  'PIS/PASEP',
  'Foto 3x4',
  'Outro',
];

export function DocumentosPessoaisTab({ colaboradorId }: { colaboradorId: string }) {
  const pii = usePiiMask();
  const { data, isLoading } = useDocumentosPessoais(colaboradorId);
  const criar = useCriarDocumentoPessoal();
  const excluir = useExcluirDocumentoPessoal(colaboradorId);
  const { empresaAtualId } = useEmpresas();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    tipo_documento: '',
    numero: '',
    orgao_emissor: '',
    data_emissao: '',
    data_validade: '',
    arquivo_url: '',
  });

  const limparForm = () => {
    setFile(null);
    setForm({
      tipo_documento: '',
      numero: '',
      orgao_emissor: '',
      data_emissao: '',
      data_validade: '',
      arquivo_url: '',
    });
  };

  const handleSubmit = async () => {
    if (!form.tipo_documento) {
      toast.error('Tipo de documento é obrigatório');
      return;
    }
    if (file && !empresaAtualId) {
      toast.error('Selecione uma empresa antes de enviar o arquivo.');
      return;
    }

    // `data_emissao`/`data_validade` passam por regex ISO em
    // schemas/referencias.ts: string vazia REPROVA. O form comeca com '' nos
    // dois, entao salvar sem data era recusado com erro de formato de data.
    const vazioParaNulo = (v: string) => (v.trim() === '' ? null : v);

    let enviado: Awaited<ReturnType<typeof uploadDocumentFile>> | null = null;
    try {
      if (file && empresaAtualId) {
        setUploading(true);
        enviado = await uploadDocumentFile(file, {
          bucket: BUCKET,
          empresaId: empresaAtualId,
          colaboradorId,
          categoria: 'documentos-pessoais',
        });
        setUploading(false);
      }

      await criar.mutateAsync({
        colaborador_id: colaboradorId,
        tipo_documento: form.tipo_documento,
        numero: vazioParaNulo(form.numero),
        orgao_emissor: vazioParaNulo(form.orgao_emissor),
        data_emissao: vazioParaNulo(form.data_emissao),
        data_validade: vazioParaNulo(form.data_validade),
        ...(enviado
          ? {
              storage_path: enviado.storage_path,
              arquivo_nome: enviado.nome_arquivo,
              arquivo_tamanho: enviado.tamanho,
              mime_type: enviado.mime_type,
            }
          : {}),
      });
      toast.success('Documento adicionado');
      setOpen(false);
      limparForm();
    } catch (e) {
      setUploading(false);
      // Arquivo subiu e a linha nao entrou: sem rollback o objeto fica no
      // bucket sem nada no banco apontando para ele.
      if (enviado) await removeDocumentFile(BUCKET, enviado.storage_path).catch(() => {});
      toast.error(safeErrorMessage(e, 'Erro ao adicionar documento.'));
    }
  };

  const handleAbrir = async (doc: { storage_path?: string | null; arquivo_url?: string | null }) => {
    try {
      const url = await resolveDocumentUrl({ storage_path: doc.storage_path, url: doc.arquivo_url }, BUCKET);
      if (!url) {
        toast.error('Arquivo não encontrado.');
        return;
      }
      window.open(safeHref(url), '_blank', 'noopener');
    } catch (e) {
      toast.error(safeErrorMessage(e, 'Não foi possível abrir o arquivo.'));
    }
  };

  const handleExcluir = async (doc: { id: string; storage_path?: string | null }) => {
    if (!confirm('Excluir documento?')) return;
    try {
      // Arquivo primeiro: se o Storage recusar, a linha fica no banco e o
      // documento segue visivel, em vez de virar objeto orfao com PII.
      if (doc.storage_path) await removeDocumentFile(BUCKET, doc.storage_path);
      await excluir.mutateAsync(doc.id);
    } catch (e) {
      toast.error(safeErrorMessage(e, 'Erro ao excluir documento.'));
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Documentos Pessoais</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Documento Pessoal</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Tipo *</Label>
                <Select
                  value={form.tipo_documento}
                  onValueChange={(v) => setForm((f) => ({ ...f, tipo_documento: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Número</Label>
                <Input value={form.numero} onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} />
              </div>
              <div>
                <Label>Órgão Emissor</Label>
                <Input
                  value={form.orgao_emissor}
                  onChange={(e) => setForm((f) => ({ ...f, orgao_emissor: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data Emissão</Label>
                  <Input
                    type="date"
                    value={form.data_emissao}
                    onChange={(e) => setForm((f) => ({ ...f, data_emissao: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Data Validade</Label>
                  <Input
                    type="date"
                    value={form.data_validade}
                    onChange={(e) => setForm((f) => ({ ...f, data_validade: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label>Arquivo (opcional)</Label>
                <FileUploadField file={file} onFileChange={setFile} uploading={uploading} disabled={criar.isPending} />
              </div>
              <Button onClick={handleSubmit} disabled={criar.isPending || uploading}>
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
          <p className="text-sm text-muted-foreground">Nenhum documento cadastrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Emissor</TableHead>
                <TableHead>Emissão</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <Badge variant="outline">{d.tipo_documento}</Badge>
                  </TableCell>
                  <TableCell>
                    {d.numero
                      ? d.tipo_documento === 'CPF'
                        ? pii.cpf(d.numero)
                        : d.tipo_documento === 'PIS/PASEP'
                          ? pii.pis(d.numero)
                          : d.numero
                      : '-'}
                  </TableCell>
                  <TableCell>{d.orgao_emissor || '-'}</TableCell>
                  <TableCell>{d.data_emissao || '-'}</TableCell>
                  <TableCell>{d.data_validade || '-'}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-0.5">
                      {(d.storage_path || d.arquivo_url) && (
                        <Button variant="ghost" size="sm" aria-label="Abrir arquivo" onClick={() => handleAbrir(d)}>
                          <ExternalLink className="h-4 w-4 text-info" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" aria-label="Excluir" onClick={() => handleExcluir(d)}>
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
