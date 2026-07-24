import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { User, Calendar, MapPin, GraduationCap, Heart, Hash } from 'lucide-react';
import { maskCpfDisplay } from '@/utils/piiMask';

export function S2205AlteracaoCadastral({ dados }: { dados: any }) {
  return (
    <div className="space-y-4 font-body">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/30 shadow-xs bg-muted/5">
          <CardContent className="p-4 flex items-start gap-3">
            <User className="h-4 w-4 text-primary mt-1" />
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Trabalhador</Label>
              <p className="font-display font-bold text-sm">{dados.nmTrab || '-'}</p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                <Hash className="h-3 w-3" /> CPF: {maskCpfDisplay(dados.cpfTrab) || '-'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-xs bg-primary/5">
          <CardContent className="p-4 flex items-start gap-3">
            <Calendar className="h-4 w-4 text-primary mt-1" />
            <div>
              <Label className="text-[10px] uppercase text-primary font-bold tracking-wider">Data da Alteração</Label>
              <p className="font-display font-bold text-sm text-primary">{dados.dtAlteracao || '-'}</p>
              <p className="text-[10px] text-primary/70 italic">Início da vigência do novo cadastro</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 rounded-xl border border-primary/10 bg-primary/5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {dados.alteracao?.dadosTrabalhador?.estadoCivil && (
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Heart className="h-3 w-3" /> Estado Civil
              </Label>
              <p className="text-xs font-semibold">{dados.alteracao.dadosTrabalhador.estadoCivil}</p>
            </div>
          )}
          
          {dados.alteracao?.dadosTrabalhador?.grauInstr && (
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                <GraduationCap className="h-3 w-3" /> Escolaridade
              </Label>
              <p className="text-xs font-semibold">{dados.alteracao.dadosTrabalhador.grauInstr}</p>
            </div>
          )}

          {dados.alteracao?.dadosTrabalhador?.endereco?.brasil && (
            <div className="sm:col-span-2 space-y-1 border-t border-primary/10 pt-2">
              <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Novo Endereço
              </Label>
              <p className="text-xs font-medium">
                {dados.alteracao.dadosTrabalhador.endereco.brasil.dscLograd}, 
                {dados.alteracao.dadosTrabalhador.endereco.brasil.nrLograd} - 
                {dados.alteracao.dadosTrabalhador.endereco.brasil.bairro}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {dados.alteracao.dadosTrabalhador.endereco.brasil.nmCid} / {dados.alteracao.dadosTrabalhador.endereco.brasil.uf} - CEP: {dados.alteracao.dadosTrabalhador.endereco.brasil.cep}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
