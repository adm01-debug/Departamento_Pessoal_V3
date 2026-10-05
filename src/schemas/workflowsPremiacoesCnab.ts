import { z } from 'zod';
import { uuidPg } from './common';

const uuid = uuidPg('UUID inválido');

/** Schemas de workflows, premiações e CNAB. validateInput aplica .partial(). */

export const workflowDefinicaoSchema = z.object({
  empresa_id: uuid.nullable().optional(),
  nome: z.string().min(1).max(200),
  tipo: z.string().min(1).max(50),
  descricao: z.string().max(2000).nullable().optional(),
  ativo: z.boolean().nullable().optional(),
});

export const workflowEtapaSchema = z.object({
  workflow_id: uuid,
  nome: z.string().min(1).max(200),
  ordem: z.number().int().min(1),
  tipo: z.string().max(50).nullable().optional(),
  aprovador_tipo: z.string().max(50).nullable().optional(),
  aprovador_id: uuid.nullable().optional(),
});

export const premiacaoRegraSchema = z.object({
  campanha_id: uuid,
  meta_id: uuid.nullable().optional(),
  titulo: z.string().min(1).max(300),
  tipo_calculo: z.string().min(1).max(50),
  valor_base: z.number().min(0).nullable().optional(),
});

export const premiacaoRoiCenarioSchema = z.object({
  nome: z.string().min(1).max(300),
  user_id: uuid.nullable().optional(),
});

export const cnabConfiguracaoSchema = z.object({
  empresa_id: uuid.nullable().optional(),
  banco_codigo: z.string().min(1).max(10),
  codigo_empresa: z.string().max(30).nullable().optional(),
  agencia: z.string().min(1).max(10),
  agencia_digito: z.string().max(2).nullable().optional(),
  conta: z.string().min(1).max(20),
  conta_digito: z.string().min(1).max(2),
  convenio: z.string().min(1).max(30),
  nome_empresa: z.string().max(200).nullable().optional(),
});

export const cenarioRoiInputSchema = z.object({
  name: z.string().min(1).max(300),
  employees: z.number().int().min(0).optional(),
  avgSalary: z.number().min(0).optional(),
  bonusPercent: z.number().min(0).max(100).optional(),
  performanceLevel: z.number().optional(),
  retentionImpact: z.number().optional(),
});
