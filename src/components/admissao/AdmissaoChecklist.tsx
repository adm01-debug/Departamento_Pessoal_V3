import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, FileText, Clock, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface Documento {
  id: string;
  nome: string;
  obrigatorio: boolean;
  status: 'pendente' | 'enviado' | 'validado' | 'rejeitado';
  tipo?: string;
  observacao?: string;
}

interface AdmissaoChecklistProps {
  documentos: Documento[];
  onValidate?: (docType: string, status: 'validado' | 'rejeitado') => void;
  isAdmin?: boolean;
}

export function AdmissaoChecklist({ documentos, onValidate, isAdmin = false }: AdmissaoChecklistProps) {
  const total = documentos.length;
  const concluidos = documentos.filter(d => d.status === 'validado').length;
  const progresso = total > 0 ? (concluidos / total) * 100 : 0;

  return (
    <Card className="border-border/40 shadow-elevated rounded-2xl overflow-hidden bg-card/50 backdrop-blur-xs">
      <CardHeader className="pb-3 border-b border-border/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-display font-bold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Checklist de Admissão
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {concluidos}/{total} Concluídos
            </div>
            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500" 
                style={{ width: `${progresso}%` }} 
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/5">
          {documentos.map((doc) => (
            <div 
              key={doc.id} 
              className={cn(
                "flex items-center gap-4 p-4 transition-all hover:bg-muted/30",
                doc.status === 'validado' ? "bg-success/5" : 
                doc.status === 'rejeitado' ? "bg-destructive/5" : ""
              )}
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm font-body font-medium",
                      doc.status === 'validado' ? "text-success" : "text-foreground"
                    )}>
                      {doc.nome}
                    </span>
                    {doc.obrigatorio && (
                      <Badge variant="outline" className="text-[9px] h-4 bg-destructive/5 text-destructive border-destructive/20 uppercase font-bold px-1">
                        Obrigatório
                      </Badge>
                    )}
                  </div>
                  
                  {isAdmin && doc.status === 'enviado' && (
                    <div className="flex items-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Aprovar"
                              className="w-7 h-7 rounded-lg text-success hover:bg-success/10"
                              onClick={() => onValidate?.(doc.tipo || doc.id, 'validado')}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p className="text-[10px]">Validar Documento</p></TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Rejeitar"
                              className="w-7 h-7 rounded-lg text-destructive hover:bg-destructive/10"
                              onClick={() => onValidate?.(doc.tipo || doc.id, 'rejeitado')}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p className="text-[10px]">Rejeitar Documento</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0",
                      doc.status === 'pendente' && "bg-warning/15 text-warning",
                      doc.status === 'enviado' && "bg-info/15 text-info",
                      doc.status === 'validado' && "bg-success/15 text-success",
                      doc.status === 'rejeitado' && "bg-destructive/15 text-destructive"
                    )}
                  >
                    {doc.status}
                  </Badge>
                  
                  {doc.observacao && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 italic">
                      <AlertCircle className="w-3 h-3" /> {doc.observacao}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
