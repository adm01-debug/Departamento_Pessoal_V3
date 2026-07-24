import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, DollarSign, PenTool, Upload, ChevronRight, CheckCircle2, AlertCircle, File, Loader2, Download, Eye, Trash2, Check, Eraser } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentoService } from '@/services';
import { supabase } from '@/integrations/supabase/client';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { validateUploadFile } from '@/utils/uploadValidation';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { SignatureCanvas } from '@/components/ui/signature/SignatureCanvas';
import type { LooseRow } from '@/types/db';
const BUCKET = 'documentos';
const TIPOS_DOCUMENTO = ['Atestado', 'Certificado', 'Comprovante', 'Contrato', 'RG', 'CPF', 'Outro'];

interface PortalDocumentosTabProps {
  navigate: (path: string) => void;
  colaboradorId?: string;
  empresaId?: string;
}

export function PortalDocumentosTab({ navigate, colaboradorId, empresaId }: PortalDocumentosTabProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tipo, setTipo] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [docToSign, setDocToSign] = useState<LooseRow<'documentos'> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: documentos, isLoading } = useQuery<any[]>({
    queryKey: ['portal-documentos', empresaId, colaboradorId],
    queryFn: () => documentoService.listarDocumentos(empresaId!, colaboradorId),
    enabled: !!colaboradorId && !!empresaId,
  });



  const handleUpload = async () => {
    if (!file || !tipo || !colaboradorId) {
      toast.error('Selecione um arquivo e tipo');
      return;
    }
    try {
      validateUploadFile(file, { maxSizeMB: 10 });
    } catch (err: any) {
      toast.error(safeErrorMessage(err, 'Arquivo inválido.'));
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const storagePath = `colaborador_${colaboradorId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

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
        colaborador_id: colaboradorId
      });

      queryClient.invalidateQueries({ queryKey: ['portal-documentos'] });
      queryClient.invalidateQueries({ queryKey: ['documentos'] });
      toast.success('Documento enviado com sucesso');
      setShowUpload(false);
      setFile(null);
      setTipo('');
    } catch (e: any) {
      toast.error(safeErrorMessage(e, 'Erro ao enviar documento.'));
    } finally {
      setUploading(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (doc: any) => {
      if (doc.storage_path) {
        await supabase.storage.from(BUCKET).remove([doc.storage_path]);
      }
      await documentoService.excluir(doc.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-documentos'] });
      toast.success('Documento removido');
    }
  });

  const handleDownload = async (doc: any) => {
    try {
      const path = doc.storage_path || doc.url?.split(`${BUCKET}/`).pop();
      if (!path) return;
      const { data, error } = await supabase.storage.from(BUCKET).download(path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.nome_arquivo || doc.nome || 'documento';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error('Erro ao baixar arquivo');
    }
  };

  const handleSaveSignature = async (base64: string) => {
    if (!docToSign || !colaboradorId) return;
    
    try {
      // 1. Upload signature image
      const fileName = `assinaturas/doc_${docToSign.id}_${Date.now()}.png`;
      const binary = Uint8Array.from(atob(base64.split(',')[1]), c => c.charCodeAt(0));
      
      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(fileName, binary, { contentType: 'image/png' });
      if (uploadErr) throw uploadErr;

      // 2. Mark document as signed
      await (supabase as any).from('documentos_assinatura').insert({
        documento_id: docToSign.id,
        colaborador_id: colaboradorId,
        assinatura_base64: base64,
        ip_assinatura: '127.0.0.1', // Mock IP
        assinado_em: new Date().toISOString()
      });

      // Update status if column exists
      await (supabase as any).from('documentos').update({ status: 'assinado' }).eq('id', docToSign.id);

      queryClient.invalidateQueries({ queryKey: ['portal-documentos'] });
      toast.success('Documento assinado com sucesso!');
      setDocToSign(null);
    } catch (e: any) {
      toast.error(safeErrorMessage(e, 'Erro ao assinar documento.'));
    }
  };

  const quickLinks = [
    { label: 'Documentos Pessoais', path: '/documentos', icon: FileText, desc: 'Consulte seus documentos' },
    { label: 'Assinar Docs', path: '/assinaturas', icon: PenTool, desc: 'Pendências de assinatura' },
    { label: 'Holerites', path: '/holerites', icon: DollarSign, desc: 'Seus contracheques' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-h3 font-display font-bold">Gestão de Documentos</h2>
        <Button 
          className="rounded-xl bg-gradient-to-r from-warning to-primary hover:opacity-90 shadow-lg font-body"
          onClick={() => setShowUpload(true)}
        >
          <Upload className="h-4 w-4 mr-2" />Enviar Novo
        </Button>
      </div>

      {/* Quick Links */}
      <div className="grid gap-3 md:grid-cols-3">
        {quickLinks.map(({ label, path, icon: Icon, desc }) => (
          <Card key={path} className="border border-border/30 rounded-2xl cursor-pointer hover:shadow-elevated transition-all group overflow-hidden" onClick={() => navigate(path)}>
            <div className="h-[2px] bg-gradient-to-r from-warning to-primary opacity-50 group-hover:opacity-100" />
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-xl bg-warning/10 text-warning group-hover:scale-110 transition-transform"><Icon className="h-4 w-4" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-sm">{label}</p>
                <p className="text-[10px] text-muted-foreground font-body truncate">{desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Documentos Recentes */}
      <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
        <CardHeader className="bg-muted/30 border-b border-border/20 py-4 px-6">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />Meus Arquivos Recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
          ) : !documentos?.length ? (
            <div className="p-12 text-center text-muted-foreground font-body">
              <File className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Você ainda não enviou nenhum documento.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {documentos.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-accent/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-info/10 text-info">
                      <File className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium font-body truncate max-w-[200px] sm:max-w-md">{doc.nome}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[9px] h-4 px-1">{doc.tipo}</Badge>
                        <span className="text-[10px] text-muted-foreground">{new Date(doc.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {doc.tipo === 'Contrato' && doc.status !== 'assinado' && (
                      <Button variant="ghost" size="icon" aria-label="Assinar" className="h-8 w-8 rounded-lg text-warning hover:bg-warning/10" onClick={() => setDocToSign(doc)} title="Assinar">
                        <PenTool className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" aria-label="Baixar" className="h-8 w-8 rounded-lg" onClick={() => handleDownload(doc)} title="Baixar">
                      <Download className="h-4 w-4 text-muted-foreground hover:text-success" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Excluir" className="h-8 w-8 rounded-lg" onClick={() => deleteMutation.mutate(doc)} title="Excluir">
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Enviar Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="font-body text-xs">Tipo de Documento</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  {TIPOS_DOCUMENTO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-body text-xs">Arquivo</Label>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors bg-muted/20"
              >
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 className="h-10 w-10 text-success" />
                    <span className="font-body text-sm font-medium">{file.name}</span>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="font-body text-sm text-muted-foreground">Clique para selecionar</p>
                    <p className="font-body text-[10px] text-muted-foreground/60 mt-1">PDF, PNG ou JPG até 10MB</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
            <Button 
              className="w-full rounded-xl bg-gradient-to-r from-warning to-primary h-11"
              onClick={handleUpload}
              disabled={uploading || !file || !tipo}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Enviar Documento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signature Dialog */}
      <Dialog open={!!docToSign} onOpenChange={(o) => !o && setDocToSign(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Assinatura de Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground font-body">
              Você está assinando digitalmente o documento: <span className="font-semibold text-foreground">{docToSign?.nome}</span>. 
              Sua assinatura manuscrita será vinculada a este registro com validade jurídica interna.
            </p>
            <SignatureCanvas 
              onSave={handleSaveSignature} 
              onCancel={() => setDocToSign(null)} 
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
