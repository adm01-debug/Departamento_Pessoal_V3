import { z } from 'zod';
import { uuidPg } from './common';

export const cargoSchema = z.object({
  nome: z.string().min(2, 'Nome do cargo obrigatório'),
  cbo: z.string().optional(),
  departamento_id: uuidPg().optional(),
  salario_base: z.number().min(0).optional(),
  ativo: z.boolean().default(true),
  empresa_id: uuidPg().optional(),
});

export type CargoSchema = z.infer<typeof cargoSchema>;
