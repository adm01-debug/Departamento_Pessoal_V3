import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { User, Calendar, Banknote, Briefcase, Clock, FileText } from 'lucide-react';
import { maskCpfDisplay } from '@/utils/piiMask';

export function S2206AlteracaoContratual({ dados }: { dados: any }) {
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
              <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Trabalhador</Label>
              <p className="font-display font-bold text-sm">CPF: {maskCpfDisplay(dados.cpfTrab)}</p>
              {dados.matricula && <p className="text-[10px] text-muted-foreground">Matrícula: {dados.matricula}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-xs bg-primary/5">
          <CardContent className="p-4 flex items-start gap-3">
            <Calendar className="h-4 w-4 text-primary mt-1" />
            <div>
              <Label className="text-[10px] uppercase text-primary font-bold tracking-wider">Vigência da Alteração</Label>
              <p className="font-display font-bold text-sm text-primary">{dados.dtAlteracao || '-'}</p>
              <p className="text-[10px] text-primary/70 italic">Novas condições contratuais</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 rounded-xl border border-primary/10 bg-primary/5">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Detalhamento das Mudanças</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Banknote className="h-3 w-3" /> Remuneração Bruta
            </Label>
            <p className="text-sm font-bold text-primary">{dados.vrSalFx ? formatCurrency(dados.vrSalFx) : '-'}</p>
            <p className="text-[10px] text-muted-foreground">Unidade: {dados.undSalFixo || 'Mensal'}</p>
          </div>
          
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Briefcase className="h-3 w-3" /> Novo Cargo/Função
            </Label>
            <p className="text-xs font-semibold">{dados.nmCargo || 'Não alterado'}</p>
            {dados.codCargo && <p className="text-[10px] text-muted-foreground">CBO: {dados.cbos || '-'}</p>}
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Jornada de Trabalho
            </Label>
            <p className="text-xs font-semibold">{dados.qtdHrsSem || '-'}h Semanais</p>
            <p className="text-[10px] text-muted-foreground">Tipo: {dados.tpJornada || 'Padrão'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
