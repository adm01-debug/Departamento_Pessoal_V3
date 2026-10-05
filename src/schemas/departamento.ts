import { z } from 'zod';

export const departamentoSchema = z.object({
  nome: z.string().min(2, 'Nome do departamento obrigatório'),
  // departamentos não tem coluna descricao — era campo fantasma no schema.
  responsavel_id: z.string().uuid().optional(),
  gestor_id: z.string().uuid().optional(),
  departamento_pai_id: z.string().uuid().optional(),
  codigo_centro_custo: z.string().optional(),
  empresa_id: z.string().uuid().optional(),
  ativo: z.boolean().default(true),
});

export type DepartamentoSchema = z.infer<typeof departamentoSchema>;
