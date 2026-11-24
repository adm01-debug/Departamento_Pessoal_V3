import { z } from 'zod';

export const departamentoSchema = z.object({
  nome: z.string().min(2, 'Nome do departamento obrigatório'),
  descricao: z.string().optional(),
  responsavel_id: z.string().uuid().optional(),
  empresa_id: z.string().uuid().optional(),
  ativo: z.boolean().default(true),
});

export type DepartamentoSchema = z.infer<typeof departamentoSchema>;
