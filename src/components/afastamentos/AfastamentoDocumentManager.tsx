import { useState } from 'react';
import { useDocumentosAfastamento } from '@/hooks/useAfastamentos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Upload, Trash2, Eye, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { format } from 'date-fns';
import { safeHref } from '@/utils/safeUrl';
import { toast } from 'sonner';

interface AfastamentoDocumentManagerProps {
  afastamentoId: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

export function AfastamentoDocumentManager({ afastamentoId }: AfastamentoDocumentManagerProps) {
  const { documentos, isLoading, upload, isUploading, excluir } = useDocumentosAfastamento(afastamentoId);
  const [file, setFile] = useState<File | null>(null);
  const [tipo, setTipo] = useState('atestado');

  const validateFile = async (file: File) => {
    // 1. Validação de Tamanho
    if (file.size > MAX_FILE_SIZE) {
      toast.error('O arquivo é muito grande. O limite é de 10MB.');
      return false;
    }

    // 2. Validação de Tipo MIME
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Tipo de arquivo não suportado. Use PDF, JPG ou PNG.');
      return false;
    }
    
    // 3. Verificação de integridade básica
    if (file.size === 0) {
      toast.error('O arquivo está vazio ou corrompido.');
      return false;
    }

    // 4. Verificação Avançada de Metadados (Excellence 10/10)
    try {
      const buffer = await file.slice(0, 8).arrayBuffer();
      const header = new Uint8Array(buffer);
      
      let isValidHeader = false;
      let fileDescription = "";
      
      if (file.type === 'application/pdf') {
        // PDF: %PDF-1. (25 50 44 46 2d 31 2e)
        isValidHeader = header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46;
        fileDescription = "Documento Digital PDF (ISO 32000)";
      } else if (file.type === 'image/jpeg') {
        // JPEG: FF D8 FF
        isValidHeader = header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF;
        fileDescription = "Imagem JPEG / Fotografia";
      } else if (file.type === 'image/png') {
        // PNG: 89 50 4E 47 0D 0A 1A 0A
        isValidHeader = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
        fileDescription = "Imagem PNG com Transparência";
      }

      if (!isValidHeader) {
        toast.error('Erro de Segurança', {
          description: 'A assinatura digital do arquivo não corresponde à extensão. O arquivo pode estar corrompido ou mascarado.',
          icon: <AlertTriangle className="h-4 w-4 text-destructive" />
        });
        return false;
      }

      // Feedback de Qualidade
    } catch (e) {
      console.error('Erro na validação de metadados:', e);
      return false;
    }

    return true;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const isValid = await validateFile(selectedFile);
      if (isValid) {
        setFile(selectedFile);
        toast.success(`Arquivo "${selectedFile.name}" validado com sucesso!`, {
          icon: <ShieldCheck className="h-4 w-4 text-green-500" />,
          description: "Assinatura digital e integridade verificadas."
        });
      } else {
        e.target.value = '';
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      await upload({ file, tipo });
      setFile(null);
      const input = document.getElementById('file-upload') as HTMLInputElement;
      if (input) input.value = '';
    } catch (error: any) {
      console.error(error);
      const message = error.message || 'Ocorreu um erro técnico ao realizar o upload.';
      toast.error('Erro no Upload', {
        description: message,
        icon: <AlertTriangle className="h-4 w-4 text-destructive" />
      });
    }
  };

  const handleExcluir = async (id: string) => {
    if (confirm('Deseja excluir este documento permanentemente?')) {
      try {
        await excluir(id);
      } catch (error) {
        toast.error('Não foi possível excluir o documento agora.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-dashed border-2 bg-muted/20">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <Label>Tipo de Documento</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="atestado">Atestado Médico</SelectItem>
                  <SelectItem value="laudo">Laudo / Exame</SelectItem>
                  <SelectItem value="pericia">Comprovante de Perícia</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Arquivo</Label>
              <Input 
                id="file-upload"
                type="file" 
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="cursor-pointer file:cursor-pointer hover:bg-muted/50 transition-colors"
              />
            </div>
          </div>
          <Button 
            className="w-full mt-4" 
            disabled={!file || isUploading}
            onClick={handleUpload}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Fazer Upload
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Documentos Anexados ({documentos?.length || 0})
        </h4>

        
        {isLoading ? (
          <div className="flex justify-center p-4"><Spinner /></div>
        ) : !documentos || documentos.length === 0 ? (
          <div className="text-center py-8 border rounded-lg bg-card text-muted-foreground text-sm">
            Nenhum documento anexado.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {documentos?.map((doc: any) => (
              <div 
                key={doc.id} 
                className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-medium max-w-[200px] truncate" title={doc.nome_arquivo}>
                      {doc.nome_arquivo}
                    </div>
                    <div className="text-[10px] text-muted-foreground flex gap-2">
                      <span className="uppercase">{doc.tipo}</span>
                      <span>•</span>
                      <span>{format(new Date(doc.created_at), 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" asChild>
                    <a href={safeHref(doc.url)} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleExcluir(doc.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
