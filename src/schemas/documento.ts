import { z } from 'zod';
import { uuidPg } from './common';

export const documentoSchema = z.object({
  nome: z.string().min(1, 'Nome do documento obrigatório'),
  tipo: z.string().min(1, 'Tipo do documento obrigatório'),
  colaborador_id: uuidPg().optional(),
  url: z.string().optional(),
  observacoes: z.string().optional(),
});

export type DocumentoSchema = z.infer<typeof documentoSchema>;
