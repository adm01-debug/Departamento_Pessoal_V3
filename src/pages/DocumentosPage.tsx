import { PageTitle } from '@/components/PageTitle';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { DataTableToolbar } from '@/components/ui/data-table-toolbar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyList } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { documentoService, colaboradorService } from '@/services';
import { useEmpresas } from '@/hooks/useEmpresas';
import { FileText, Upload, Download, Eye, Trash2, Loader2, File, Sparkles, Languages, CheckCircle2, Search, Filter, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { validateUploadFile } from '@/utils/uploadValidation';
import { edgeFunctionsService } from '@/services/edgeFunctionsService';
import { DocumentoTimeline } from '@/components/documents/DocumentoTimeline';
import { DocumentoPreview } from '@/components/documents/DocumentoPreview';
import { useSearchParams } from 'react-router-dom';
const BUCKET = 'documentos';
const TIPOS_DOCUMENTO = ['Contrato', 'Atestado', 'Holerite', 'Certificado', 'RG', 'CPF', 'CTPS', 'Comprovante', 'Outro'];

export default function DocumentosPage() {
  const [searchParams] = useSearchParams();
  const urlColaboradorId = searchParams.get('colaborador');
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [colaboradorFilter, setColaboradorFilter] = useState(urlColaboradorId || 'todos');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tipo, setTipo] = useState('');
  const [colaboradorId, setColaboradorId] = useState(urlColaboradorId || '');
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedDocForOcr, setSelectedDocForOcr] = useState<any>(null);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [selectedDocForTimeline, setSelectedDocForTimeline] = useState<any>(null);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<any>(null);
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (urlColaboradorId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setColaboradorFilter(urlColaboradorId);
      setColaboradorId(urlColaboradorId);
    }
  }, [urlColaboradorId]);

  const { data: documentos, isLoading } = useQuery<any[]>({
    queryKey: ['documentos', empresaId, colaboradorFilter],
    queryFn: () => documentoService.listarDocumentos(
      empresaId!,
      colaboradorFilter === 'todos' ? undefined : colaboradorFilter
    ),
    enabled: !!empresaId,
  });



  const { data: colaboradoresRes } = useQuery({
    queryKey: ['colaboradores-simples'],
    queryFn: () => colaboradorService.listar({ pageSize: 1000 }),
  });
  const colaboradores = colaboradoresRes?.data || [];

  const deleteMutation = useMutation({
    mutationFn: async (doc: any) => {
      if (doc.url) {
        const path = doc.url.split(`${BUCKET}/`).pop();
        if (path) await supabase.storage.from(BUCKET).remove([path]);
      }
      await documentoService.excluir(doc.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos'] });
      toast.success('Documento excluído');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar documento.')),
  });

  const handleUpload = async () => {
    if (!file || !tipo) {
      toast.error('Selecione um arquivo e tipo');
      return;
    }
    try {
      validateUploadFile(file, { maxSizeMB: 10 });
    } catch (e: any) {
      toast.error(safeErrorMessage(e, 'Arquivo inválido.'));
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const storagePath = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(storagePath, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 60 * 60 * 24 * 365);

      await documentoService.criar({
        nome: file.name,
        nome_arquivo: file.name,
        tipo,
        url: urlData?.signedUrl || storagePath,
        tamanho: file.size,
        mime_type: file.type,
        storage_path: storagePath,
        colaborador_id: colaboradorId || undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['documentos'] });
      toast.success('Documento enviado com sucesso');
      setShowUpload(false);
      setFile(null);
      setTipo('');
    } catch (e: any) {
      toast.error(safeErrorMessage(e, 'Erro ao processar documento.'));
    } finally {
      setUploading(false);
    }
  };

  const handleOCR = async (doc: any) => {
    setSelectedDocForOcr(doc);
    setOcrResult(null);
    setIsProcessingOcr(true);
    try {
      const path = doc.storage_path || doc.url?.split(`${BUCKET}/`).pop();
      const result = await edgeFunctionsService.ocrDocumento({
        bucket: BUCKET,
        filePath: path,
        documentType: (doc.tipo || '').toLowerCase() as any,
      });
      setOcrResult(result);
      toast.success('Processamento concluído!');
    } catch (e: any) {
      toast.error(safeErrorMessage(e, 'Erro ao processar documento.'));
    } finally {
      setIsProcessingOcr(false);
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      const path = doc.storage_path || doc.url?.split(`${BUCKET}/`).pop();
      if (!path) { toast.error('Arquivo não encontrado'); return; }

      const { data, error } = await supabase.storage.from(BUCKET).download(path);
      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.nome_arquivo || doc.nome || 'documento';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(safeErrorMessage(e, 'Erro ao processar documento.'));
    }
  };

  const handleView = async (doc: any) => {
    setSelectedDocForPreview(doc);
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filtered = documentos?.filter((d: any) => {
    const searchMatch = !search || 
      (d.nome || d.nome_arquivo || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.colaborador?.nome_completo || '').toLowerCase().includes(search.toLowerCase());
    const tipoMatch = tipoFilter === 'todos' || d.tipo === tipoFilter;
    return searchMatch && tipoMatch;
  });

  return (
    <>
    <PageTitle title="Documentos" description="Gestão de documentos" />
    <PageLayout
      title="Documentos"
      description="Gestão de documentos dos colaboradores"
      icon={<FileText className="h-5 w-5 text-primary-foreground" />}
      gradient="from-warning to-primary"
      actions={
        <Button onClick={() => setShowUpload(true)} className="rounded-xl bg-gradient-to-r from-warning to-primary hover:opacity-90 shadow-lg font-body">
          <Upload className="h-4 w-4 mr-2" />Upload
        </Button>
      }
    >
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar documento pelo nome..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl border-border/40 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
          <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-[150px] rounded-xl border-border/40">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Tipos</SelectItem>
              {TIPOS_DOCUMENTO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={colaboradorFilter} onValueChange={setColaboradorFilter}>
            <SelectTrigger className="w-[180px] rounded-xl border-border/40">
              <SelectValue placeholder="Colaborador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Colaboradores</SelectItem>
              {colaboradores?.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setTipoFilter('todos'); setColaboradorFilter('todos'); }} className="text-xs text-muted-foreground hover:text-foreground">
            Limpar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><Spinner size="lg" /></div>
      ) : !filtered?.length ? (
        <EmptyList entityName="documento" />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border/30 overflow-hidden shadow-elevated">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-display font-semibold">Nome</TableHead>
                <TableHead className="font-display font-semibold">Dono</TableHead>
                <TableHead className="font-display font-semibold">Tipo</TableHead>
                <TableHead className="font-display font-semibold">Tamanho</TableHead>
                <TableHead className="font-display font-semibold">Data</TableHead>
                <TableHead className="w-[140px] font-display font-semibold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((doc: any) => (
                <TableRow key={doc.id} className="hover:bg-accent/30 transition-colors">
                  <TableCell className="font-body font-medium flex items-center gap-2">
                    <File className="h-4 w-4 text-muted-foreground shrink-0" />
                    {doc.nome || doc.nome_arquivo || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium">{doc.colaborador?.nome_completo || 'Empresa (Geral)'}</span>
                      {doc.colaborador?.cpf && <span className="text-[10px] text-muted-foreground">{doc.colaborador.cpf}</span>}
                    </div>
                  </TableCell>
                  <TableCell><Badge className="bg-info/15 text-info border-0 font-body text-[10px]">{doc.tipo || '-'}</Badge></TableCell>
                  <TableCell className="font-body text-muted-foreground text-xs">{formatSize(doc.tamanho)}</TableCell>
                  <TableCell className="font-body text-xs">{doc.created_at ? new Date(doc.created_at).toLocaleDateString('pt-BR') : '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10 text-primary" onClick={() => handleOCR(doc)} title="Analisar com IA">
                        <Sparkles className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-xl hover:bg-info/10" onClick={() => handleView(doc)} title="Visualizar">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-xl hover:bg-success/10" onClick={() => setSelectedDocForTimeline(doc)} title="Histórico">
                        <History className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-xl hover:bg-success/10" onClick={() => handleDownload(doc)} title="Download">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-xl hover:bg-destructive/10" onClick={() => deleteMutation.mutate(doc)} title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </motion.div>
      )}

      {/* OCR Dialog */}
      <Dialog open={!!selectedDocForOcr} onOpenChange={(o) => { if(!o) setSelectedDocForOcr(null); }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <DialogTitle className="font-display">Análise de Documento (IA)</DialogTitle>
            </div>
            <DialogDescription>
              Processando o arquivo <span className="font-semibold">{selectedDocForOcr?.nome || 'documento'}</span> para extração automática de dados.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 min-h-[200px] flex flex-col items-center justify-center border rounded-2xl bg-muted/20">
            {isProcessingOcr ? (
              <div className="text-center space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                <div className="space-y-1">
                  <p className="font-display font-bold">Extraindo dados...</p>
                  <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos</p>
                </div>
              </div>
            ) : ocrResult ? (
              <div className="w-full p-4 space-y-4">
                <div className="flex items-center gap-2 text-success font-bold text-sm">
                  <CheckCircle2 className="h-4 w-4" /> Dados Extraídos com Sucesso
                </div>
                <div className="space-y-2">
                  {Object.entries(ocrResult.data || {}).map(([key, value]: [string, any]) => (
                    <div key={key} className="flex justify-between border-b border-border/10 py-1.5 text-xs">
                      <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                      <span className="font-mono font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
                <Button className="w-full rounded-xl gap-2" onClick={() => {
                  toast.info('Dados prontos para preenchimento automático!');
                  setSelectedDocForOcr(null);
                }}>
                  <Languages className="h-4 w-4" /> Aplicar ao Cadastro
                </Button>
              </div>
            ) : (
              <div className="text-center text-muted-foreground p-8">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Selecione um documento para análise.</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDocForOcr(null)} className="rounded-xl">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Timeline Dialog */}
      <Dialog open={!!selectedDocForTimeline} onOpenChange={(o) => { if(!o) setSelectedDocForTimeline(null); }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Histórico do Documento</DialogTitle>
          </DialogHeader>
          {selectedDocForTimeline && <DocumentoTimeline documentoId={selectedDocForTimeline.id} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDocForTimeline(null)} className="rounded-xl">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Component */}
      <DocumentoPreview 
        documento={selectedDocForPreview} 
        isOpen={!!selectedDocForPreview} 
        onClose={() => setSelectedDocForPreview(null)} 
      />

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Enviar Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-body text-xs">Tipo de Documento</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_DOCUMENTO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-body text-xs">Colaborador (Opcional)</Label>
                <Select value={colaboradorId} onValueChange={setColaboradorId}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Geral" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geral">Geral / Empresa</SelectItem>
                    {colaboradores?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-body">Arquivo</Label>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border/50 rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <File className="h-5 w-5 text-primary" />
                    <span className="font-body text-sm">{file.name} ({formatSize(file.size)})</span>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Arraste ou clique para selecionar</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">PDF, PNG, JPG até 10MB</p>
                  </div>
                )}
              </div>
              <input type="file" ref={fileRef} className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} accept=".pdf,.png,.jpg,.jpeg" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpload(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleUpload} disabled={uploading} className="rounded-xl bg-gradient-to-r from-warning to-primary">
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Enviar Documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
    </>
  );
}
