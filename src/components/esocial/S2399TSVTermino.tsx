import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { User, Calendar, LogOut, FileText } from 'lucide-react';
import { maskCpfDisplay } from '@/utils/piiMask';

export function S2399TSVTermino({ dados }: { dados: any }) {
  return (
    <div className="space-y-4 font-body">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/30 shadow-xs bg-muted/5">
          <CardContent className="p-4 flex items-start gap-3">
            <User className="h-4 w-4 text-primary mt-1" />
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Identificação do Trabalhador</Label>
              <p className="font-display font-bold text-sm">CPF: {maskCpfDisplay(dados.cpfTrab)}</p>
              <p className="text-[10px] text-muted-foreground italic">Matrícula: {dados.matricula || '-'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/20 shadow-xs bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <LogOut className="h-4 w-4 text-destructive mt-1" />
            <div>
              <Label className="text-[10px] uppercase text-destructive font-bold tracking-wider">Término do TSV</Label>
              <p className="font-display font-bold text-sm text-destructive">{dados.dtTerm || '-'}</p>
              <p className="text-[10px] text-destructive/70 italic">Encerramento das atividades</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 rounded-xl border border-border/30 bg-muted/20">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Detalhes do Desligamento</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Motivo do Término</Label>
            <p className="text-xs font-semibold">{dados.mtvDeslig || 'Não informado'}</p>
          </div>
          
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Verbas Rescisórias</Label>
            <p className="text-xs font-semibold">{dados.verbasResc === 'S' ? 'Sim, há valores a pagar' : 'Não'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
