import { z } from 'zod';
import { uuidPg } from './common';

export const beneficioSchema = z.object({
  nome: z.string().min(2, 'Nome do benefício obrigatório'),
  tipo: z.string().optional(),
  valor: z.number().min(0).optional(),
  descricao: z.string().optional(),
  ativo: z.boolean().default(true),
  empresa_id: uuidPg().optional(),
});

export type BeneficioSchema = z.infer<typeof beneficioSchema>;
