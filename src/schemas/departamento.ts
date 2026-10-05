import { z } from 'zod';
import { uuidPg } from './common';

export const departamentoSchema = z.object({
  nome: z.string().min(2, 'Nome do departamento obrigatório'),
  // departamentos não tem coluna descricao — era campo fantasma no schema.
  responsavel_id: uuidPg().optional(),
  gestor_id: uuidPg().optional(),
  departamento_pai_id: uuidPg().optional(),
  codigo_centro_custo: z.string().optional(),
  empresa_id: uuidPg().optional(),
  ativo: z.boolean().default(true),
});

export type DepartamentoSchema = z.infer<typeof departamentoSchema>;
