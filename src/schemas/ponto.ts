import { z } from 'zod';

export const pontoSchema = z.object({
  colaborador_id: z.string().uuid('Colaborador obrigatório'),
  data: z.string().min(1, 'Data obrigatória'),
  entrada_1: z.string().optional(),
  saida_intervalo: z.string().optional(),
  retorno_intervalo: z.string().optional(),
  saida_1: z.string().optional(),
  observacoes: z.string().optional(),
});

export type PontoSchema = z.infer<typeof pontoSchema>;
