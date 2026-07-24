import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { User, Calendar, LogOut, FileText, Banknote } from 'lucide-react';
import { maskCpfDisplay } from '@/utils/piiMask';

export function S2299Desligamento({ dados }: { dados: any }) {
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
              <Label className="text-[10px] uppercase text-destructive font-bold tracking-wider">Data do Desligamento</Label>
              <p className="font-display font-bold text-sm text-destructive">{dados.dtDeslig || '-'}</p>
              <p className="text-[10px] text-destructive/70 italic">Encerramento do Vínculo</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 rounded-xl border border-destructive/10 bg-destructive/5">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-destructive" />
          <span className="text-xs font-bold uppercase tracking-widest text-destructive">Detalhes da Rescisão</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Motivo do Desligamento</Label>
            <p className="text-xs font-semibold">{dados.mtvDeslig || 'Não informado'}</p>
          </div>
          
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Tipo de Aviso Prévio</Label>
            <p className="text-xs font-semibold">{dados.tpAviso === '1' ? 'Trabalhado' : dados.tpAviso === '2' ? 'Indenizado' : 'Não se aplica'}</p>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Verbas Rescisórias</Label>
            <div className="flex items-center gap-2">
              <Banknote className="h-3.5 w-3.5 text-success" />
              <p className="text-xs font-semibold">{dados.verbasResc === 'S' ? 'Há valores a pagar' : 'Quitação efetuada'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
