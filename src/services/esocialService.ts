import { currentCompetenciaLocal, todayLocalISO } from '@/utils/dateLocal';
import { supabase } from '@/integrations/supabase/client';
import { validarEvento, getValidadoresDisponiveis, type ValidationResult } from '@/validators/esocialValidators';
import { gerarXmlESocial } from '@/utils/esocialXmlGenerator';
export interface ESocialEvento {
  id: string;
  empresa_id: string | null;
  tipo_evento: string;
  dados: Record<string, unknown> | null;
  competencia: string | null;
  status: string | null;
  data_envio: string | null;
  protocolo: string | null;
  erros: Record<string, unknown> | null;
  xml: string | null;
  created_at: string;
  updated_at: string;
}

const eventoDescricao: Record<string, string> = {
  'S-1000': 'Informações do Empregador',
  'S-1005': 'Tabela de Estabelecimentos',
  'S-1010': 'Tabela de Rubricas',
  'S-1020': 'Lotações Tributárias',
  'S-1200': 'Remuneração de Trabalhador',
  'S-1210': 'Pagamentos de Rendimentos',
  'S-1280': 'Informações Complementares',
  'S-2200': 'Cadastramento Inicial / Admissão',
  'S-2205': 'Alteração de Dados Cadastrais',
  'S-2206': 'Alteração Contratual',
  'S-2210': 'Comunicação de Acidente de Trabalho (CAT)',
  'S-2220': 'Monitoramento da Saúde do Trabalhador (ASO)',
  'S-2230': 'Afastamento Temporário',
  'S-2240': 'Condições Ambientais do Trabalho (Agentes Nocivos)',
  'S-2299': 'Desligamento',
  'S-2300': 'Trabalhador Sem Vínculo - Início',
  'S-2306': 'Trabalhador Sem Vínculo - Alteração',
  'S-2399': 'Trabalhador Sem Vínculo - Término',
  'S-2400': 'Cadastro de Beneficiário - Entes Federados',
};

export function getEventoDescricao(tipo: string): string {
  return eventoDescricao[tipo] || tipo;
}

export async function listarEventos(empresaId: string): Promise<ESocialEvento[]> {
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

  let query = supabase
    .from('esocial_eventos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  query = query.eq('empresa_id', empresaId);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as ESocialEvento[];

}

export async function listarEventosPorCompetencia(empresaId: string, competencia: string): Promise<ESocialEvento[]> {
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

  let query = supabase
    .from('esocial_eventos')
    .select('*')
    .eq('competencia', competencia);

  query = query.eq('empresa_id', empresaId);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as ESocialEvento[];

}

export async function obterEstatisticas(empresaId: string): Promise<any> {
  try {
    const res = await listarEventos(empresaId);
    const eventos = res;

    const enviados = eventos.filter(e => e.status === 'enviado').length;
    const pendentes = eventos.filter(e => e.status === 'pendente').length;
    const erros = eventos.filter(e => e.status === 'erro').length;
    const total = eventos.length;
    const conformidade = total > 0 ? Math.round(((total - erros) / total) * 100) : 100;

    return ({ enviados, pendentes, erros, conformidade });
  } catch (e: any) {
    throw new Error('Falha ao processar estatísticas do eSocial', { cause: e });
  }
}

export async function criarEvento(evento: {
  empresa_id: string;
  tipo_evento: string;
  competencia?: string;
  dados?: Record<string, unknown>;
}): Promise<ESocialEvento> {
  const { data: empresa } = await supabase.from('empresas').select('*').eq('id', evento.empresa_id).maybeSingle();
  
  let xml = null;
  if (empresa) {
    try {
      xml = gerarXmlESocial({
        tipo: evento.tipo_evento,
        dados: evento.dados,
        empresa,
        ambiente: '2'
      });
    } catch (e) {
      console.warn('Erro ao gerar XML inicial:', e);
    }
  }

  const { data, error } = await supabase
    .from('esocial_eventos')
    .insert([{
      empresa_id: evento.empresa_id,
      tipo_evento: evento.tipo_evento,
      competencia: evento.competencia || currentCompetenciaLocal(),
      dados: (evento.dados || {}) as any,
      status: 'pendente',
      xml: xml
    }])
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Nenhum registro de evento foi retornado.');
  return data as ESocialEvento;
  
}

export async function validarAnteDeEnviar(tipoEvento: string, dados: Record<string, unknown>): Promise<ValidationResult> {
  return validarEvento(tipoEvento, dados);
}

export function listarEventosValidaveis(): string[] {
  return getValidadoresDisponiveis();
}

export async function enviarEvento(eventoId: string, empresaId: string): Promise<any> {
  try {
    await supabase.from('esocial_eventos').update({ status: 'processando' }).eq('id', eventoId).eq('empresa_id', empresaId);

    const { data: evento } = await supabase.from('esocial_eventos').select('*').eq('id', eventoId).eq('empresa_id', empresaId).maybeSingle();

    if (!evento) {
      throw new Error('Evento eSocial não encontrado ou acesso não autorizado para esta empresa.');
    }

    if (evento?.dados && evento?.tipo_evento) {
      const validacao = validarEvento(evento.tipo_evento, evento.dados as Record<string, any>);
      if (!validacao.valid) {
        await supabase.from('esocial_eventos').update({
          status: 'erro',
          erros: { validacao: validacao.errors } as any,
        }).eq('id', eventoId).eq('empresa_id', empresaId);
        throw new Error('Falha na validação do evento');
      }
    }

    const { data, error } = await supabase.functions.invoke('enviar-esocial', {
      body: { empresaId, eventoId },
    });

    if (error) {
      await supabase.from('esocial_eventos').update({
        status: 'erro',
        erros: { mensagem: error.message },
      }).eq('id', eventoId).eq('empresa_id', empresaId);
      throw error;
    }

    return (data);
  } catch (e: any) {
    throw new Error('Falha na transmissão do evento eSocial', { cause: e });
  }
}

export async function reenviarEvento(eventoId: string, empresaId: string): Promise<any> {
  return enviarEvento(eventoId, empresaId);
}

export async function gerarEventosPeriodo(empresaId: string, competencia: string): Promise<any> {
  try {
    const { data: itens, error: iError } = await supabase
      .from('folha_itens')
      .select('*, colaboradores(*), folhas_pagamento!inner(*)')
      .eq('folhas_pagamento.empresa_id', empresaId)
      .eq('folhas_pagamento.competencia', competencia);

    if (iError) throw iError;

    const resultados = { criados: 0, pulados: 0, erros: 0 };

    for (const item of (itens || [])) {
      try {
        const colaborador = Array.isArray(item.colaboradores) ? item.colaboradores[0] : item.colaboradores;
        if (!colaborador) continue;

        const { data: existente } = await supabase
          .from('esocial_eventos')
          .select('id')
          .eq('empresa_id', empresaId)
          .eq('tipo_evento', 'S-1200')
          .eq('competencia', competencia)
          .contains('dados', { cpfTrab: colaborador.cpf })
          .maybeSingle();

        if (existente) {
          resultados.pulados++;
          continue;
        }

        const dadosS1200 = {
          cpfTrab: colaborador.cpf,
          perApur: competencia,
          dmDev: [{
            ideDmDev: `DM${item.id.slice(0, 5)}`,
            infoPerApur: {
              ideEstabLot: [{
                tpInsc: 1,
                nrInsc: empresaId.replace(/-/g, '').slice(0, 14), 
                detVerbas: [
                  { codRubr: '1000', vrRubr: Number(item.salario_base || 0) },
                  { codRubr: '9201', vrRubr: Number(item.inss_mes || 0) },
                  { codRubr: '9202', vrRubr: Number(item.fgts_mes || 0) }
                ]
              }]
            }
          }]
        };

        await criarEvento({
          empresa_id: empresaId,
          tipo_evento: 'S-1200',
          competencia,
          dados: dadosS1200
        });

        if (item.status_pagamento === 'pago') {
          const dadosS1210 = {
            cpfTrab: colaborador.cpf,
            perApur: competencia,
            infoPgto: [{
              dtPgto: todayLocalISO(),
              tpPgto: 1,
              vlrLiq: Number(item.total_liquido || 0)
            }]
          };

          await criarEvento({
            empresa_id: empresaId,
            tipo_evento: 'S-1210',
            competencia,
            dados: dadosS1210
          });
        }

        resultados.criados++;
      } catch (err) {
        resultados.erros++;
      }
    }

    return (resultados);
  } catch (e: any) {
    throw new Error('Falha ao gerar eventos do período', { cause: e });
  }
}

export async function getConfig(empresaId: string): Promise<any> {
  
  const { data, error } = await supabase
    .from('configuracoes_esocial')
    .select('*, certificado:certificados_digitais(*)')
    .eq('empresa_id', empresaId)
    .maybeSingle();
  if (error) throw error;
  return data;
  
}

export async function salvarConfig(config: { empresa_id: string; ambiente: string; certificado_id?: string }): Promise<void> {
  
  const { error } = await supabase
    .from('configuracoes_esocial')
    .upsert(config, { onConflict: 'empresa_id' });
  if (error) throw error;
  
}

export async function listarCertificados(empresaId: string): Promise<any[]> {
  
  const { data, error } = await supabase
    .from('certificados_digitais')
    .select('*')
    .eq('empresa_id', empresaId);
  if (error) throw error;
  return data || [];
  
}

export async function adicionarCertificado(cert: {
  empresa_id: string;
  subject: string;
  issuer: string;
  valid_from: string;
  valid_to: string;
  arquivo_base64: string;
  senha_encriptada: string;
  cnpj_cpf: string;
}): Promise<any> {
  
  const { data, error } = await supabase
    .from('certificados_digitais')
    .insert([{ ...cert, ativo: true }])
    .select()
    .single();
  if (error) throw error;
  return data;
  
}

export async function listarTransmissaoLogs(empresaId: string, eventoId?: string): Promise<any[]> {
  
  let query = supabase
    .from('esocial_transmissao_logs')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (eventoId) {
    query = query.eq('evento_id', eventoId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
  
}

export { type ValidationResult } from '@/validators/esocialValidators';

