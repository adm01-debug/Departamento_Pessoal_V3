import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { User, Calendar, Activity, AlertTriangle, ShieldAlert } from 'lucide-react';
import { maskCpfDisplay } from '@/utils/piiMask';

export function S2210SST({ dados }: { dados: any }) {
  return (
    <div className="space-y-4 font-body">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/30 shadow-xs bg-muted/5">
          <CardContent className="p-4 flex items-start gap-3">
            <User className="h-4 w-4 text-primary mt-1" />
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Trabalhador Acidentado</Label>
              <p className="font-display font-bold text-sm">CPF: {maskCpfDisplay(dados.cpfTrab)}</p>
              {dados.nmTrab && <p className="text-xs text-muted-foreground">{dados.nmTrab}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/20 shadow-xs bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <Calendar className="h-4 w-4 text-destructive mt-1" />
            <div>
              <Label className="text-[10px] uppercase text-destructive font-bold tracking-wider">Data do Acidente (CAT)</Label>
              <p className="font-display font-bold text-sm text-destructive">{dados.dtAcid || '-'}</p>
              <p className="text-[10px] text-destructive/70 italic">Horário: {dados.hrAcid || 'Não informado'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 rounded-xl border border-destructive/10 bg-destructive/5">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="h-4 w-4 text-destructive" />
          <span className="text-xs font-bold uppercase tracking-widest text-destructive">Detalhes da Ocorrência</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Tipo de Acidente</Label>
            <div className="flex items-center gap-2">
              <Activity className="h-3 w-3 text-destructive" />
              <span className="text-xs font-semibold">{dados.tpAcid === '1' ? 'Típico' : dados.tpAcid === '2' ? 'Doença' : 'Trajeto'}</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Iniciativa da CAT</Label>
            <p className="text-xs font-semibold">{dados.iniCAT === '1' ? 'Empregador' : 'Ordem Judicial/Fiscal'}</p>
          </div>

          <div className="sm:col-span-2 space-y-1">
            <Label className="text-[10px] text-muted-foreground">Local do Acidente</Label>
            <p className="text-xs font-semibold italic">"{dados.localAcid || 'Informação disponível no XML completo'}"</p>
          </div>
        </div>
      </div>
    </div>
  );
}
