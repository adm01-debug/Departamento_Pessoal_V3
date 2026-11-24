import { criarEvento } from '@/services/esocialService';

export async function gerarEventosSST(empresaId: string, dados: any) {
  // Mapeamento de eventos de Saúde e Segurança do Trabalho
  const eventos = [];
  
  if (dados.acidente) {
    eventos.push(await criarEvento({
      empresa_id: empresaId,
      tipo_evento: 'S-2210',
      dados: dados.acidente
    }));
  }
  
  if (dados.exame) {
    eventos.push(await criarEvento({
      empresa_id: empresaId,
      tipo_evento: 'S-2220',
      dados: dados.exame
    }));
  }
  
  if (dados.riscos) {
    eventos.push(await criarEvento({
      empresa_id: empresaId,
      tipo_evento: 'S-2240',
      dados: dados.riscos
    }));
  }
  
  return eventos;
}
