import { z } from 'zod';
import { uuidPg } from './common';

const uuid = uuidPg('UUID inválido');
const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar em formato ISO (AAAA-MM-DD)');

/**
 * Schemas das tabelas de detalhes do colaborador (dependentes, ASO, formação,
 * estrangeiro, PCD, experiência, anotações, times, webhooks, férias coletivas,
 * campos customizados). validateInput aplica .partial() — campos presentes no
 * payload são validados; obrigatoriedade fica a cargo do banco.
 */

export const dependenteSchema = z.object({
  colaborador_id: uuid,
  nome: z.string().min(1).max(200),
  cpf: z
    .string()
    .regex(/^\d{11}$/, 'CPF deve ter 11 dígitos')
    .nullable()
    .optional(),
  data_nascimento: dataISO.nullable().optional(),
  data_inicio_vigencia: dataISO.nullable().optional(),
  grau_parentesco: z.string().max(50).nullable().optional(),
  parentesco: z.string().max(50),
  relacionamento_id: z.number().int().nullable().optional(),
  genero_documento_id: z.number().int().nullable().optional(),
});

export const contatoEmergenciaSchema = z.object({
  colaborador_id: uuid,
  nome: z.string().min(1).max(200),
  parentesco: z.string().max(50).nullable().optional(),
  relacionamento_id: z.number().int().nullable().optional(),
  telefone: z.string().max(20).nullable().optional(),
  telefone_trabalho: z.string().max(20).nullable().optional(),
  celular: z.string().max(20).nullable().optional(),
  email: z.string().email('E-mail inválido').max(320).nullable().optional(),
});

export const historicoSalarialSchema = z.object({
  colaborador_id: uuid,
  empresa_id: uuid.nullable().optional(),
  data_vigencia: dataISO,
  motivo: z.string().min(1).max(300),
  salario_anterior: z.number().min(0).nullable().optional(),
  salario_novo: z.number().positive('Salário deve ser positivo'),
  cargo_anterior: z.string().max(150).nullable().optional(),
  cargo_novo: z.string().max(150).nullable().optional(),
  departamento_anterior: z.string().max(150).nullable().optional(),
  departamento_novo: z.string().max(150).nullable().optional(),
});

export const asoSchema = z.object({
  colaborador_id: uuid,
  empresa_id: uuid.nullable().optional(),
  tipo: z.string().min(1).max(50),
  data_exame: dataISO,
  data_validade: dataISO.nullable().optional(),
  resultado: z.string().max(100).nullable().optional(),
  status: z.string().max(50).optional(),
  clinica: z.string().max(200).nullable().optional(),
  medico_nome: z.string().max(200).nullable().optional(),
  medico_crm: z.string().max(20).nullable().optional(),
});

export const formacaoSchema = z.object({
  colaborador_id: uuid,
  curso: z.string().max(200).nullable().optional(),
  instituicao: z.string().max(200).nullable().optional(),
  situacao: z.string().max(50).nullable().optional(),
  tipo_escolaridade: z.string().max(50).nullable().optional(),
  ano_conclusao: z.number().int().min(1900).max(2100).nullable().optional(),
});

export const dadosEstrangeiroSchema = z.object({
  colaborador_id: uuid,
  pais_origem: z.string().max(100).nullable().optional(),
  tipo_visto: z.string().max(50).nullable().optional(),
  tempo_residencia: z.string().max(50).nullable().optional(),
  condicao_ingresso: z.string().max(100).nullable().optional(),
  data_chegada: dataISO.nullable().optional(),
  data_naturalizacao: dataISO.nullable().optional(),
});

export const deficienciaSchema = z.object({
  colaborador_id: uuid,
  tipo: z.string().min(1).max(100),
  cid: z.string().max(10).nullable().optional(),
  laudo_url: z.string().url('URL de laudo inválida').nullable().optional(),
  descricao: z.string().max(1000).nullable().optional(),
  observacoes: z.string().max(1000).nullable().optional(),
});

export const periodoExperienciaSchema = z.object({
  colaborador_id: uuid,
  data_inicio: dataISO,
  primeira_etapa_fim: dataISO.nullable().optional(),
  segunda_etapa_fim: dataISO.nullable().optional(),
  dias_total: z.number().int().min(1).max(365).nullable().optional(),
  tipo: z.string().max(50).nullable().optional(),
  status: z.string().max(50).nullable().optional(),
});

export const anotacaoSchema = z.object({
  colaborador_id: uuid,
  titulo: z.string().min(1).max(300),
  conteudo: z.string().max(5000).nullable().optional(),
  data: dataISO.nullable().optional(),
  tipo: z.string().max(50).nullable().optional(),
});

export const timeSchema = z.object({
  empresa_id: uuid,
  nome: z.string().min(1).max(200),
  descricao: z.string().max(1000).nullable().optional(),
  departamento_id: uuid.nullable().optional(),
  lider_id: uuid.nullable().optional(),
});

export const webhookConfigSchema = z.object({
  empresa_id: uuid.nullable().optional(),
  url: z
    .string()
    .url('URL de webhook inválida')
    .max(2048)
    .refine((u) => u.startsWith('https://'), 'Webhook exige HTTPS (SSRF/javascript: bloqueados)'),
  eventos: z.array(z.string().max(100)).max(50).optional(),
  secret: z.string().max(200).nullable().optional(),
});

export const feriasColetivaSchema = z.object({
  empresa_id: uuid,
  data_inicio: dataISO,
  data_fim: dataISO,
  dias: z.number().int().min(1).max(30, 'Férias coletivas máx. 30 dias por período'),
  justificativa: z.string().max(1000).nullable().optional(),
  departamentos: z.array(z.string().max(150)).max(100).nullable().optional(),
  status: z.string().max(50).nullable().optional(),
});

export const campoCustomizadoSchema = z.object({
  empresa_id: uuid.nullable().optional(),
  nome: z.string().min(1).max(200),
  tipo: z.string().max(50).optional(),
  secao: z.string().max(100).nullable().optional(),
  ordem: z.number().int().min(0).nullable().optional(),
});
