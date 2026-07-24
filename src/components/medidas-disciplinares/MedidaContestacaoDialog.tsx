import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { medidasDisciplinaresService } from '@/services';
import { useAuth } from '@/hooks';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { MedidaWorkflowTimeline } from './MedidaWorkflowTimeline';
import { AlertTriangle, Clock, Paperclip, Upload, Download, FileText, Check, X } from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  medida: any | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isRHOrAdmin: boolean;
  colaboradorUserId?: string | null;
}

export function MedidaContestacaoDialog({ medida, open, onOpenChange, isRHOrAdmin, colaboradorUserId }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [texto, setTexto] = useState('');
  const [resposta, setResposta] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const isOwner = colaboradorUserId && user?.id === colaboradorUserId;
  const prazoDate = medida?.contestacao_prazo_ate ? parseISO(medida.contestacao_prazo_ate) : null;
  // eslint-disable-next-line react-hooks/purity -- comparação de prazo em tempo de render (UI de contestação)
  const prazoExpirado = prazoDate ? Date.now() > prazoDate.getTime() : false;
  const podeContestar = !!medida && isOwner && medida.status_workflow === 'aplicada' && !prazoExpirado && !medida.contestacao_texto;
  const podeResponder = !!medida && isRHOrAdmin && medida.status_workflow === 'contestada';

  const { data: anexos = [] } = useQuery({
    queryKey: ['medida-contest-anexos', medida?.id],
    queryFn: () => medidasDisciplinaresService.listarAnexosContestacao(medida!.id),
    enabled: !!medida?.id && open,
  });

  const contestarMut = useMutation({
    mutationFn: () => medidasDisciplinaresService.contestar(medida!.id, texto),
    onSuccess: () => {
      toast.success('Contestação enviada ao RH');
      qc.invalidateQueries({ queryKey: ['medidas-disciplinares'] });
      qc.invalidateQueries({ queryKey: ['medida-workflow-log', medida?.id] });
      setTexto('');
      onOpenChange(false);
    },
    onError: (e) => toast.error(safeErrorMessage(e, 'Falha ao contestar')),
  });

  const responderMut = useMutation({
    mutationFn: (aceita: boolean) => medidasDisciplinaresService.responderContestacao(medida!.id, resposta, aceita),
    onSuccess: (_d, aceita) => {
      toast.success(aceita ? 'Contestação aceita — medida arquivada' : 'Contestação rejeitada — medida mantida');
      qc.invalidateQueries({ queryKey: ['medidas-disciplinares'] });
      qc.invalidateQueries({ queryKey: ['medida-workflow-log', medida?.id] });
      setResposta('');
      onOpenChange(false);
    },
    onError: (e) => toast.error(safeErrorMessage(e, 'Falha ao responder')),
  });

  const uploadMut = useMutation({
    mutationFn: (file: File) => medidasDisciplinaresService.uploadAnexoContestacao(medida!.id, medida!.empresa_id, file),
    onSuccess: () => {
      toast.success('Anexo enviado');
      qc.invalidateQueries({ queryKey: ['medida-contest-anexos', medida?.id] });
    },
    onError: (e) => toast.error(safeErrorMessage(e, 'Falha no upload')),
  });

  async function baixarAnexo(path: string) {
    try {
      const url = await medidasDisciplinaresService.signedUrlAnexoContestacao(path);
      window.open(url, '_blank');
    } catch (e) { toast.error(safeErrorMessage(e, 'Falha ao gerar link')); }
  }

  if (!medida) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Contestação de Medida Disciplinar
          </DialogTitle>
          <DialogDescription>
            Status atual: <Badge variant="outline" className="ml-1">{medida.status_workflow}</Badge>
          </DialogDescription>
        </DialogHeader>

        {/* Prazo */}
        {prazoDate && medida.status_workflow === 'aplicada' && (
          <Alert variant={prazoExpirado ? 'destructive' : 'default'}>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              {prazoExpirado
                ? `Prazo expirado em ${format(prazoDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
                : `Prazo para contestar: ${format(prazoDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} (${formatDistanceToNow(prazoDate, { locale: ptBR, addSuffix: true })})`}
            </AlertDescription>
          </Alert>
        )}

        {/* Descrição da medida */}
        <div className="rounded-md border border-border/40 bg-muted/20 p-3">
          <p className="text-xs text-muted-foreground mb-1">Descrição da ocorrência</p>
          <p className="text-sm">{medida.descricao}</p>
        </div>

        {/* Contestação existente */}
        {medida.contestacao_texto && (
          <div className="rounded-md border border-warning/30 bg-warning/5 p-3 space-y-1">
            <p className="text-xs font-medium text-warning flex items-center gap-2">
              <AlertTriangle className="h-3 w-3" />
              Contestação do colaborador
              {medida.contestacao_data && (
                <span className="text-muted-foreground font-normal">
                  · {format(parseISO(medida.contestacao_data), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </span>
              )}
            </p>
            <p className="text-sm whitespace-pre-wrap">{medida.contestacao_texto}</p>
          </div>
        )}

        {/* Resposta existente */}
        {medida.contestacao_resposta && (
          <div className={`rounded-md border p-3 space-y-1 ${medida.contestacao_aceita ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'}`}>
            <p className={`text-xs font-medium flex items-center gap-2 ${medida.contestacao_aceita ? 'text-success' : 'text-destructive'}`}>
              {medida.contestacao_aceita ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              Resposta do RH — {medida.contestacao_aceita ? 'Aceita' : 'Rejeitada'}
            </p>
            <p className="text-sm whitespace-pre-wrap">{medida.contestacao_resposta}</p>
          </div>
        )}

        {/* Anexos */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm flex items-center gap-2"><Paperclip className="h-4 w-4" /> Anexos ({anexos.length})</Label>
            {(podeContestar || (isOwner && medida.status_workflow === 'contestada')) && (
              <>
                <input ref={fileRef} type="file" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0]; if (f) uploadMut.mutate(f);
                  if (fileRef.current) fileRef.current.value = '';
                }} />
                <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploadMut.isPending}>
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  {uploadMut.isPending ? 'Enviando…' : 'Anexar'}
                </Button>
              </>
            )}
          </div>
          {anexos.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum anexo.</p>
          ) : (
            <div className="space-y-1">
              {anexos.map((a: any) => (
                <button key={a.id} onClick={() => baixarAnexo(a.storage_path)}
                  className="w-full flex items-center gap-2 rounded-md border border-border/40 hover:bg-muted/30 px-2 py-1.5 text-left transition-colors">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm flex-1 truncate">{a.nome_arquivo}</span>
                  <span className="text-[10px] text-muted-foreground">{Math.ceil((a.tamanho_bytes ?? 0)/1024)} KB</span>
                  <Download className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Form contestar */}
        {podeContestar && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="contest-texto">Sua contestação (mínimo 10 caracteres)</Label>
              <Textarea id="contest-texto" rows={4} value={texto} onChange={(e) => setTexto(e.target.value)}
                placeholder="Descreva os motivos da contestação, contexto, provas e testemunhas…" />
            </div>
          </>
        )}

        {/* Form responder */}
        {podeResponder && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="contest-resp">Resposta do RH (mínimo 10 caracteres)</Label>
              <Textarea id="contest-resp" rows={4} value={resposta} onChange={(e) => setResposta(e.target.value)}
                placeholder="Fundamentação da decisão sobre a contestação…" />
            </div>
          </>
        )}

        <Separator />
        <MedidaWorkflowTimeline medidaId={medida.id} />

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
          {podeContestar && (
            <Button onClick={() => contestarMut.mutate()} disabled={texto.trim().length < 10 || contestarMut.isPending}>
              {contestarMut.isPending ? 'Enviando…' : 'Enviar Contestação'}
            </Button>
          )}
          {podeResponder && (
            <>
              <Button variant="destructive" onClick={() => responderMut.mutate(false)}
                disabled={resposta.trim().length < 10 || responderMut.isPending}>
                <X className="h-4 w-4 mr-1.5" /> Rejeitar
              </Button>
              <Button onClick={() => responderMut.mutate(true)}
                disabled={resposta.trim().length < 10 || responderMut.isPending}
                className="bg-success text-success-foreground hover:bg-success/90">
                <Check className="h-4 w-4 mr-1.5" /> Aceitar (Arquivar)
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
