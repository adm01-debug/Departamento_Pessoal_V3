import { z } from 'zod';

export const folhaSchema = z.object({
  competencia: z.string().min(7, 'Competência obrigatória (YYYY-MM)'),
  empresa_id: z.string().uuid().optional(),
  status: z.enum(['aberta', 'calculada', 'fechada', 'paga']).default('aberta'),
});

export type FolhaSchema = z.infer<typeof folhaSchema>;
