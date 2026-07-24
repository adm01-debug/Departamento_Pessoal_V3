import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { User, Calendar, FileEdit, Tag } from 'lucide-react';
import { maskCpfDisplay } from '@/utils/piiMask';

export function S2306TSVAlteracao({ dados }: { dados: any }) {
  return (
    <div className="space-y-4 font-body">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/30 shadow-xs bg-muted/5">
          <CardContent className="p-4 flex items-start gap-3">
            <User className="h-4 w-4 text-primary mt-1" />
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Identificação do Trabalhador</Label>
              <p className="font-display font-bold text-sm">CPF: {maskCpfDisplay(dados.cpfTrab)}</p>
              {dados.nmTrab && <p className="text-xs text-muted-foreground">{dados.nmTrab}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/30 shadow-xs bg-muted/5">
          <CardContent className="p-4 flex items-start gap-3">
            <Calendar className="h-4 w-4 text-primary mt-1" />
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Data da Alteração</Label>
              <p className="font-display font-bold text-sm">{dados.dtAlteracao || '-'}</p>
              <p className="text-[10px] text-muted-foreground italic">Vigência das novas condições</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 rounded-xl border border-primary/10 bg-primary/5">
        <div className="flex items-center gap-2 mb-3">
          <FileEdit className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Alterações Realizadas</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
          {dados.infoTSVAlteracao?.infoComplementar && (
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Nova Categoria</Label>
              <div className="flex items-center gap-2">
                <Tag className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-semibold">{dados.infoTSVAlteracao.infoComplementar.codCateg}</span>
              </div>
            </div>
          )}
          
          {dados.infoTSVAlteracao?.infoComplementar?.infoTermino?.motivo && (
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Motivo Alteração</Label>
              <p className="text-xs font-semibold">{dados.infoTSVAlteracao.infoComplementar.infoTermino.motivo}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
