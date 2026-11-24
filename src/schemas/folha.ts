import { z } from 'zod';

export const folhaSchema = z.object({
  competencia: z.string().min(7, 'Competência obrigatória (YYYY-MM)'),
  empresa_id: z.string().uuid().optional(),
  status: z.enum(['rascunho', 'calculando', 'calculada', 'fechada']).default('rascunho'),
});

export type FolhaSchema = z.infer<typeof folhaSchema>;
