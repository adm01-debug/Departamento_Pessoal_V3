import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { User, Calendar, Heart, Shield } from 'lucide-react';
import { maskCpfDisplay } from '@/utils/piiMask';

export function S2400CDP({ dados }: { dados: any }) {
  return (
    <div className="space-y-4 font-body">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/30 shadow-xs bg-muted/5">
          <CardContent className="p-4 flex items-start gap-3">
            <User className="h-4 w-4 text-primary mt-1" />
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Beneficiário</Label>
              <p className="font-display font-bold text-sm">CPF: {maskCpfDisplay(dados.cpfBenef)}</p>
              {dados.nmBenef && <p className="text-xs text-muted-foreground">{dados.nmBenef}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-xs bg-primary/5">
          <CardContent className="p-4 flex items-start gap-3">
            <Calendar className="h-4 w-4 text-primary mt-1" />
            <div>
              <Label className="text-[10px] uppercase text-primary font-bold tracking-wider">Início do Benefício</Label>
              <p className="font-display font-bold text-sm text-primary">{dados.dtIniBenef || '-'}</p>
              <p className="text-[10px] text-primary/70 italic">Concessão previdenciária</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 rounded-xl border border-primary/10 bg-primary/5">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Informações do Benefício</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Tipo de Benefício</Label>
            <div className="flex items-center gap-2">
              <Heart className="h-3 w-3 text-primary" />
              <span className="text-xs font-semibold">{dados.tpBenef || 'Previdenciário'}</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Origem</Label>
            <p className="text-xs font-semibold uppercase">{dados.indOrigemBenef === '1' ? 'Processo Judicial' : 'Concessão Administrativa'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
