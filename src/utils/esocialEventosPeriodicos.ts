import { criarEvento } from '@/services/esocialService';

export async function gerarEventosMensais(empresaId: string, competencia: string) {
  const eventos = [
    { tipo: 'S-1200', descricao: 'Remuneração' },
    { tipo: 'S-1210', descricao: 'Pagamentos' },
    { tipo: 'S-1280', descricao: 'Informações Complementares' },
  ];
  
  const results = [];
  for (const evt of eventos) {
    results.push(await criarEvento({
      empresa_id: empresaId,
      tipo_evento: evt.tipo,
      competencia,
      dados: {} // Em um cenário real, buscaria dados da folha
    }));
  }
  return results;
}
