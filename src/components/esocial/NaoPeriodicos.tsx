import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { User, Calendar, Briefcase, Banknote, ShieldCheck, Clock, MapPin, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { maskCpfDisplay } from '@/utils/piiMask';

export function S2200Admissao({ dados }: { dados: any }) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-4 font-body">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/30 shadow-xs bg-muted/5">
          <CardContent className="p-4 flex items-start gap-3">
            <User className="h-4 w-4 text-primary mt-1" />
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Identificação do Trabalhador</Label>
              <p className="font-display font-bold text-sm">{dados.nmTrab || 'Não informado'}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">CPF: {maskCpfDisplay(dados.cpfTrab)}</p>
              <div className="flex gap-1.5 mt-2">
                <Badge variant="secondary" className="text-[9px] h-4 rounded-md">Matrícula: {dados.matricula || '-'}</Badge>
                <Badge variant="outline" className="text-[9px] h-4 rounded-md">Cat: {dados.codCateg || '-'}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-xs bg-primary/5">
          <CardContent className="p-4 flex items-start gap-3">
            <Calendar className="h-4 w-4 text-primary mt-1" />
            <div>
              <Label className="text-[10px] uppercase text-primary font-bold tracking-wider">Dados da Admissão</Label>
              <p className="font-display font-bold text-sm text-primary">{dados.dtAdm || '-'}</p>
              <p className="text-[10px] text-primary/70 italic mt-0.5">Vínculo: {dados.tpRegTrab === '1' ? 'CLT' : 'Estatutário'}</p>
              <div className="flex gap-1.5 mt-2">
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] h-4">Ativo</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 rounded-xl border border-primary/10 bg-primary/5">
        <div className="flex items-center gap-2 mb-3">
          <Briefcase className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Informações Contratuais</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Cargo / CBO</Label>
            <p className="text-xs font-semibold">{dados.nmCargo || dados.codCargo || '-'}</p>
            {dados.cbos && <p className="text-[10px] text-muted-foreground">CBO: {dados.cbos}</p>}
          </div>
          
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Remuneração Base</Label>
            <p className="text-sm font-display font-bold text-primary">{dados.vrSalFx ? formatCurrency(dados.vrSalFx) : '-'}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Unidade: {dados.undSalFixo || 'Mensal'}</p>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Jornada Semanal</Label>
            <p className="text-xs font-semibold">{dados.qtdHrsSem || '-'} Horas</p>
            <p className="text-[10px] text-muted-foreground">Regime: {dados.tpRegPrev === '1' ? 'RGPS' : 'RPPS'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function S2230Afastamento({ dados }: { dados: any }) {
  return (
    <div className="space-y-4 font-body">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/30 shadow-xs bg-muted/5">
          <CardContent className="p-4 flex items-start gap-3">
            <User className="h-4 w-4 text-primary mt-1" />
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Identificação do Trabalhador</Label>
              <p className="font-display font-bold text-sm">CPF: {maskCpfDisplay(dados.cpfTrab)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Afastamento Temporário</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/20 shadow-xs bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <Activity className="h-4 w-4 text-destructive mt-1" />
            <div>
              <Label className="text-[10px] uppercase text-destructive font-bold tracking-wider">Motivo do Afastamento</Label>
              <p className="font-display font-bold text-sm text-destructive">Cód: {dados.codMotAfast}</p>
              <p className="text-[10px] text-destructive/70 italic mt-0.5">Regra: eSocial S-2230</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex flex-col items-center justify-center text-center shadow-xs">
          <Calendar className="h-5 w-5 text-primary mb-1.5" />
          <Label className="text-[10px] text-primary uppercase font-bold tracking-wider">Início</Label>
          <p className="text-lg font-display font-bold text-primary">{dados.dtIniAfast || '-'}</p>
        </div>
        
        <div className="p-4 bg-muted/20 border border-border/30 rounded-2xl flex flex-col items-center justify-center text-center shadow-xs">
          <Clock className="h-5 w-5 text-muted-foreground mb-1.5" />
          <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Término Previsto</Label>
          <p className="text-lg font-display font-bold text-muted-foreground">{dados.dtTermAfast || 'Em Aberto'}</p>
        </div>
      </div>
    </div>
  );
}
