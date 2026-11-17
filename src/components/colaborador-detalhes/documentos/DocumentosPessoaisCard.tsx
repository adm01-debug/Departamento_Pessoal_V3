import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, Trash2, ExternalLink } from 'lucide-react';
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
import { useDocumentosPessoais, useCriarDocumentoPessoal, useExcluirDocumentoPessoal } from '@/hooks';
import { useEmpresas } from '@/hooks/useEmpresas';
import { maskCpfDisplay, maskPisDisplay } from '@/utils/piiMask';
import { safeHref } from '@/utils/safeUrl';
import { safeErrorMessage } from '@/utils/safeError';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { FalhaConsulta } from '../FalhaConsulta';
import { FileUploadField } from './FileUploadField';
import { uploadDocumentFile, removeDocumentFile, resolveDocumentUrl } from '@/services/documentUploadService';

const BUCKET = 'documentos-colaboradores';

const MotionCard = motion.create(Card);

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

/** Painel compacto de "Documentos Pessoais" — mesmos dados/mutations de
 * DocumentosPessoaisTab (useDocumentosPessoais/useCriarDocumentoPessoal/
 * useExcluirDocumentoPessoal, mesmas query keys, sem duplicar lógica),
 * reconstruído em layout denso (cabeçalho + tabela compacta) para caber na
 * coluna esquerda do dashboard de "Documentos & Compliance", ao lado de
 * "Status de Compliance". O arquivo vai para o bucket privado
 * `documentos-colaboradores` e só o `storage_path` fica salvo — a URL de
 * leitura é assinada na hora de abrir, então nunca existe link permanente
 * para um documento pessoal. Linha antiga com `arquivo_url` continua
 * abrindo pelo caminho legado (ver `resolveDocumentUrl`). */
export function DocumentosPessoaisCard({ colaboradorId }: { colaboradorId: string }) {
  const { data, isLoading, isError } = useDocumentosPessoais(colaboradorId);
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

  const resetForm = () => {
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
    if (!empresaAtualId) {
      toast.error('Empresa não identificada.');
      return;
    }

    // `data_emissao`/`data_validade` são validadas por regex ISO
    // (schemas/referencias.ts): string vazia REPROVA. O formulário começa com
    // '' nos dois campos, então salvar sem data era recusado com uma mensagem
    // de formato de data que não explicava nada.
    const vazioParaNulo = (v: string) => (v.trim() === '' ? null : v);

    let enviado: Awaited<ReturnType<typeof uploadDocumentFile>> | null = null;
    try {
      if (file) {
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
      resetForm();
    } catch (e) {
      setUploading(false);
      // O arquivo já subiu e a linha não entrou: sem este rollback o objeto
      // fica no bucket sem nada no banco apontando para ele.
      if (enviado) await removeDocumentFile(BUCKET, enviado.storage_path).catch(() => {});
      toast.error(safeErrorMessage(e, 'Erro ao adicionar documento.'));
    }
  };

  const handleAbrir = async (doc: { storage_path?: string | null; arquivo_url: string | null }) => {
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
      // Arquivo primeiro: se o Storage recusar, a linha continua no banco e o
      // documento segue visível, em vez de virar um objeto órfão com PII.
      if (doc.storage_path) await removeDocumentFile(BUCKET, doc.storage_path);
      await excluir.mutateAsync(doc.id);
    } catch (e) {
      toast.error(safeErrorMessage(e, 'Erro ao excluir documento.'));
    }
  };

  return (
    <MotionCard
      custom={0}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      className="border border-border/30 rounded-2xl shadow-elevated h-[300px] flex flex-col"
    >
      <CardContent className="p-4 flex-1 flex flex-col min-h-0">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-start gap-2.5">
            <FileText className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-display font-medium">Documentos Pessoais</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Documentos oficiais do colaborador, com status de validade e informações principais.
              </p>
            </div>
          </div>
          <Button size="sm" className="h-7 px-3 text-[11px] shrink-0" onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-3 w-3" />
            Adicionar
          </Button>
        </div>

        <AnimatedCascadeDialog
          open={open}
          onOpenChange={setOpen}
          title="Novo Documento Pessoal"
          titleIcon={FileText}
          emptyMessage=""
          items={[
            <div key="tipo" className="space-y-1">
              <Label>Tipo *</Label>
              <Select value={form.tipo_documento} onValueChange={(v) => setForm((f) => ({ ...f, tipo_documento: v }))}>
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
            </div>,
            <div key="numero" className="space-y-1">
              <Label>Número</Label>
              <Input value={form.numero} onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} />
            </div>,
            <div key="emissor" className="space-y-1">
              <Label>Órgão Emissor</Label>
              <Input
                value={form.orgao_emissor}
                onChange={(e) => setForm((f) => ({ ...f, orgao_emissor: e.target.value }))}
              />
            </div>,
            <div key="datas" className="grid grid-cols-2 gap-3">
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
            </div>,
            <div key="arquivo" className="space-y-1">
              <Label>Arquivo (opcional)</Label>
              <FileUploadField file={file} onFileChange={setFile} uploading={uploading} disabled={criar.isPending} />
            </div>,
            <div key="salvar" className="flex justify-end pt-1">
              <Button
                size="sm"
                className="rounded-lg px-4"
                onClick={handleSubmit}
                disabled={criar.isPending || uploading}
              >
                {(criar.isPending || uploading) && <Spinner className="mr-1.5 h-3.5 w-3.5" />}
                Salvar
              </Button>
            </div>,
          ]}
        />

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : isError ? (
          <FalhaConsulta o="os documentos pessoais" />
        ) : !data?.length ? (
          <p className="text-xs text-muted-foreground py-1">Nenhum documento cadastrado.</p>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-8 px-2 text-[11px] font-medium">Tipo</TableHead>
                  <TableHead className="h-8 px-2 text-[11px] font-medium text-center">Número</TableHead>
                  <TableHead className="h-8 px-2 text-[11px] font-medium text-center">Emissor</TableHead>
                  <TableHead className="h-8 px-2 text-[11px] font-medium text-center">Emissão</TableHead>
                  <TableHead className="h-8 px-2 text-[11px] font-medium text-center">Validade</TableHead>
                  <TableHead className="h-8 px-2 text-[11px] font-medium text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((d) => (
                  <TableRow key={d.id} className="border-border/20">
                    <TableCell className="px-2 py-2.5">
                      <Badge variant="outline" size="sm">
                        {d.tipo_documento}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2 py-2.5 text-xs text-center">
                      {d.numero
                        ? d.tipo_documento === 'CPF'
                          ? maskCpfDisplay(d.numero)
                          : d.tipo_documento === 'PIS/PASEP'
                            ? maskPisDisplay(d.numero)
                            : d.numero
                        : '-'}
                    </TableCell>
                    <TableCell className="px-2 py-2.5 text-xs text-center">{d.orgao_emissor || '-'}</TableCell>
                    <TableCell className="px-2 py-2.5 text-xs text-muted-foreground text-center">
                      {d.data_emissao || '-'}
                    </TableCell>
                    <TableCell className="px-2 py-2.5 text-xs text-muted-foreground text-center">
                      {d.data_validade || '-'}
                    </TableCell>
                    <TableCell className="px-2 py-2.5 text-right">
                      <div className="flex justify-end gap-0.5">
                        {(d.storage_path || d.arquivo_url) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            aria-label="Abrir em nova aba"
                            onClick={() => handleAbrir(d)}
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-info" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          aria-label="Excluir"
                          onClick={() => handleExcluir(d)}
                        >
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
