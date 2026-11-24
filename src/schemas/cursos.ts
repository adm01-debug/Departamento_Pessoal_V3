import { z } from 'zod';
import { uuidPg } from './common';

const uuid = uuidPg('UUID inválido');
const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar em formato ISO (AAAA-MM-DD)');

/** Schemas de treinamentos e cursos. validateInput aplica .partial(). */

export const cursoSchema = z.object({
  empresa_id: uuid.nullable().optional(),
  nome: z.string().min(1).max(300),
  descricao: z.string().max(5000).nullable().optional(),
  categoria: z.string().max(100).nullable().optional(),
  modalidade: z.string().max(50).nullable().optional(),
  carga_horaria: z.number().min(0).max(2000).nullable().optional(),
  nr_relacionada: z.string().max(50).nullable().optional(),
  obrigatorio: z.boolean().nullable().optional(),
  ativo: z.boolean().nullable().optional(),
});

export const trilhaSchema = z.object({
  empresa_id: uuid.nullable().optional(),
  nome: z.string().min(1).max(300),
  descricao: z.string().max(5000).nullable().optional(),
  nivel: z.string().max(50).nullable().optional(),
  ativo: z.boolean().nullable().optional(),
});

export const inscricaoCursoSchema = z.object({
  colaborador_id: uuid,
  curso_id: uuid,
  empresa_id: uuid.nullable().optional(),
  status: z.string().max(50).nullable().optional(),
  data_inicio: dataISO.nullable().optional(),
  data_conclusao: dataISO.nullable().optional(),
  nota: z.number().min(0).max(10).nullable().optional(),
  certificado_url: z.string().max(2048).nullable().optional(),
});

export const trilhaCursoSchema = z.object({
  trilha_id: uuid,
  curso_id: uuid,
  ordem: z.number().int().min(0).nullable().optional(),
  obrigatorio: z.boolean().nullable().optional(),
});
