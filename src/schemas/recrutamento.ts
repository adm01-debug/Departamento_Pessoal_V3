import { z } from 'zod';

const uuid = z.string().uuid('UUID inválido');
const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar em formato ISO (AAAA-MM-DD)');

/** Schemas de recrutamento e seleção. validateInput aplica .partial(). */

export const vagaSchema = z.object({
  empresa_id: uuid.nullable().optional(),
  titulo: z.string().min(1).max(200),
  cargo: z.string().max(200).nullable().optional(),
  departamento: z.string().max(200).nullable().optional(),
  descricao: z.string().max(10000).nullable().optional(),
  requisitos: z.string().max(10000).nullable().optional(),
  beneficios_oferecidos: z.string().max(5000).nullable().optional(),
  modalidade: z.string().max(50).nullable().optional(),
  tipo_contrato: z.enum(['clt', 'pj', 'estagiario', 'temporario', 'intermitente', 'aprendiz']).nullable().optional(),
  quantidade: z.number().int().min(1).nullable().optional(),
  faixa_salarial_min: z.number().min(0).nullable().optional(),
  faixa_salarial_max: z.number().min(0).nullable().optional(),
  responsavel_id: uuid.nullable().optional(),
  data_abertura: dataISO.nullable().optional(),
  data_encerramento: dataISO.nullable().optional(),
  status: z.string().max(50).nullable().optional(),
});

export const candidatoSchema = z.object({
  empresa_id: uuid.nullable().optional(),
  nome: z.string().min(1).max(200),
  email: z.string().email('E-mail inválido').max(320).nullable().optional(),
  telefone: z.string().max(20).nullable().optional(),
  cpf: z
    .string()
    .regex(/^\d{11}$/, 'CPF deve ter 11 dígitos')
    .nullable()
    .optional(),
  linkedin: z.string().max(300).nullable().optional(),
  curriculo_url: z.string().max(2048).nullable().optional(),
  formacao: z.string().max(200).nullable().optional(),
  experiencia_anos: z.number().int().min(0).max(70).nullable().optional(),
  pretensao_salarial: z.number().min(0).nullable().optional(),
  origem: z.string().max(100).nullable().optional(),
  observacoes: z.string().max(5000).nullable().optional(),
});

export const candidaturaSchema = z.object({
  candidato_id: uuid,
  vaga_id: uuid,
  empresa_id: uuid,
  etapa: z.string().max(50).nullable().optional(),
  status: z.string().max(50).nullable().optional(),
  nota_geral: z.number().min(0).max(10).nullable().optional(),
  entrevistador: z.string().max(200).nullable().optional(),
  data_entrevista: z.string().nullable().optional(),
  data_proxima_etapa: dataISO.nullable().optional(),
  motivo_rejeicao: z.string().max(1000).nullable().optional(),
  feedback: z.string().max(5000).nullable().optional(),
});
