import { S1200Remuneracao } from './S1200Remuneracao';
import { S1210Pagamentos } from './S1210Pagamentos';
import { S2200Admissao } from './S2200Admissao';
import { S2205AlteracaoCadastral } from './S2205AlteracaoCadastral';
import { S2206AlteracaoContratual } from './S2206AlteracaoContratual';
import { S2230Afastamento } from './S2230Afastamento';
import { S2299Desligamento } from './S2299Desligamento';
import { S2300TSVInicio } from './S2300TSVInicio';
import { S2306TSVAlteracao } from './S2306TSVAlteracao';
import { S2399TSVTermino } from './S2399TSVTermino';
import { S2400CDP } from './S2400CDP';
import { S2210SST } from './S2210SST';
import { S2220ASO, S2240AgentesNocivos } from './SSTEvents';

const components: Record<string, any> = {
  'S-1200': S1200Remuneracao,
  'S-1210': S1210Pagamentos,
  'S-2200': S2200Admissao,
  'S-2205': S2205AlteracaoCadastral,
  'S-2206': S2206AlteracaoContratual,
  'S-2210': S2210SST,
  'S-2220': S2220ASO,
  'S-2230': S2230Afastamento,
  'S-2240': S2240AgentesNocivos,
  'S-2299': S2299Desligamento,
  'S-2300': S2300TSVInicio,
  'S-2306': S2306TSVAlteracao,
  'S-2399': S2399TSVTermino,
  'S-2400': S2400CDP,
};

export function ESocialEventViewer({ tipo, dados }: { tipo: string; dados: any }) {
  const Component = components[tipo];
  
  if (!Component) {
    return (
      <div className="p-4 bg-muted/20 rounded-xl border border-dashed text-center">
        <p className="text-sm text-muted-foreground">Visualizador especializado não disponível para {tipo}.</p>
        <p className="text-[10px] uppercase mt-1">Exibindo dados brutos abaixo.</p>
      </div>
    );
  }
  
  return <Component dados={dados} />;
}
