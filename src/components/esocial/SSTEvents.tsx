import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { User, Calendar, ShieldCheck, Microscope, Thermometer, Wind, AlertCircle } from 'lucide-react';
import { maskCpfDisplay } from '@/utils/piiMask';

export function S2220ASO({ dados }: { dados: any }) {
  return (
    <div className="space-y-4 font-body">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-border/30 shadow-xs bg-muted/5">
          <CardContent className="p-3 flex items-center gap-3">
            <User className="h-4 w-4 text-primary" />
            <div>
              <Label className="text-[9px] uppercase text-muted-foreground font-bold">Trabalhador</Label>
              <p className="text-xs font-bold">CPF: {maskCpfDisplay(dados.cpfTrab)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/30 shadow-xs bg-muted/5">
          <CardContent className="p-3 flex items-center gap-3">
            <Calendar className="h-4 w-4 text-primary" />
            <div>
              <Label className="text-[9px] uppercase text-muted-foreground font-bold">Data do Exame (ASO)</Label>
              <p className="text-xs font-bold">{dados.dtExame}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 rounded-xl border border-primary/10 bg-primary/5">
        <div className="flex items-center gap-2 mb-3">
          <Microscope className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Informações do Exame</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Tipo de Exame</Label>
            <p className="text-xs font-semibold">
              {dados.tpExame === '1' ? 'Admissional' : 
               dados.tpExame === '2' ? 'Periódico' : 
               dados.tpExame === '3' ? 'Retorno ao Trabalho' : 
               dados.tpExame === '4' ? 'Mudança de Função' : 'Demissional'}
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Resultado</Label>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              <span className="text-xs font-semibold text-success">Apto</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function S2240AgentesNocivos({ dados }: { dados: any }) {
  const agentes = dados.infoExpRisco || [];
  
  return (
    <div className="space-y-4 font-body">
      <Card className="border-border/30 shadow-xs bg-muted/5">
        <CardContent className="p-3 flex items-center gap-3">
          <User className="h-4 w-4 text-primary" />
          <div>
            <Label className="text-[9px] uppercase text-muted-foreground font-bold">Trabalhador</Label>
            <p className="text-xs font-bold">CPF: {maskCpfDisplay(dados.cpfTrab)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Wind className="h-4 w-4 text-warning" />
          <span className="text-xs font-bold uppercase tracking-widest text-warning">Exposição a Agentes Nocivos</span>
        </div>
        
        {agentes.map((ag: any, i: number) => (
          <div key={i} className="p-3 rounded-xl border border-warning/20 bg-warning/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Thermometer className="h-4 w-4 text-warning" />
              <div>
                <p className="text-xs font-bold">Código Agente: {ag.codAgNoc}</p>
                <p className="text-[10px] text-muted-foreground">Início da Condição: {dados.dtIniCondic}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-warning" />
              <span className="text-[10px] font-bold text-warning uppercase">Risco Detectado</span>
            </div>
          </div>
        ))}

        {agentes.length === 0 && (
          <div className="p-6 text-center border border-dashed rounded-xl bg-muted/10">
            <p className="text-xs text-muted-foreground">Nenhuma exposição a agentes nocivos reportada (Ausência de Risco).</p>
          </div>
        )}
      </div>
    </div>
  );
}
