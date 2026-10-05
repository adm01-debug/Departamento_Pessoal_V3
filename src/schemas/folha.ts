import { z } from 'zod';
import { uuidPg } from './common';

export const folhaSchema = z.object({
  competencia: z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/, 'Competência deve estar no formato AAAA-MM'),
  empresa_id: uuidPg().optional(),
  status: z.enum(['aberta', 'calculada', 'fechada', 'paga']).default('aberta'),
});

export type FolhaSchema = z.infer<typeof folhaSchema>;
