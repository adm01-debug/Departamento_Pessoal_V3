import { z } from 'zod';
import { uuidPg } from './common';

export const folhaSchema = z.object({
  competencia: z.string().min(7, 'Competência obrigatória (YYYY-MM)'),
  empresa_id: uuidPg().optional(),
  status: z.enum(['aberta', 'calculada', 'fechada', 'paga']).default('aberta'),
});

export type FolhaSchema = z.infer<typeof folhaSchema>;
