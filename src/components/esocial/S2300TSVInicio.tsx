import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { User, Calendar, Briefcase, Contact } from 'lucide-react';
import { maskCpfDisplay } from '@/utils/piiMask';

export function S2300TSVInicio({ dados }: { dados: any }) {
  return (
    <div className="space-y-4 font-body">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/30 shadow-xs bg-muted/5">
          <CardContent className="p-4 flex items-start gap-3">
            <User className="h-4 w-4 text-primary mt-1" />
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Identificação do Trabalhador</Label>
              <p className="font-display font-bold text-sm">{dados.nmTrab || '-'}</p>
              <p className="text-[10px] text-muted-foreground italic">CPF: {maskCpfDisplay(dados.cpfTrab) || '-'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/30 shadow-xs bg-muted/5">
          <CardContent className="p-4 flex items-start gap-3">
            <Calendar className="h-4 w-4 text-primary mt-1" />
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Data de Início</Label>
              <p className="font-display font-bold text-sm">{dados.dtInicio || '-'}</p>
              <p className="text-[10px] text-muted-foreground italic">Início da Prestação de Serviço</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 rounded-xl border border-border/30 bg-muted/20">
        <div className="flex items-center gap-2 mb-3">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Informações Contratuais</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Categoria do Trabalhador</Label>
            <div className="flex items-center gap-2">
              <Contact className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs font-semibold">{dados.codCateg || 'Não informado'}</p>
            </div>
          </div>
          
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Natureza da Atividade</Label>
            <p className="text-xs font-semibold">{dados.natAtividade === 1 ? 'Urbana' : dados.natAtividade === 2 ? 'Rural' : 'Não informada'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
