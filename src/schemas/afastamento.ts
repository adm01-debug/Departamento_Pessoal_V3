import { z } from 'zod';

export const afastamentoSchema = z.object({
  colaborador_id: z.string().uuid('Colaborador obrigatório'),
  tipo: z.string().min(1, 'Tipo de afastamento obrigatório'),
  data_inicio: z.string().min(1, 'Data de início obrigatória'),
  data_fim_prevista: z.string().min(1, 'Data de fim prevista obrigatória'),
  cid: z.string().optional(),
  cid_descricao: z.string().optional(),
  medico_nome: z.string().optional(),
  medico_crm: z.string().optional(),
  observacoes: z.string().optional(),
  empresa_id: z.string().uuid().optional(),
});

export type AfastamentoSchema = z.infer<typeof afastamentoSchema>;
