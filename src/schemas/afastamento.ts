import { z } from 'zod';
import { uuidPg } from './common';

export const afastamentoSchema = z.object({
  colaborador_id: uuidPg('Colaborador obrigatório'),
  tipo: z.string().min(1, 'Tipo de afastamento obrigatório'),
  data_inicio: z.string().min(1, 'Data de início obrigatória'),
  data_fim_prevista: z.string().min(1, 'Data de fim prevista obrigatória'),
  cid_id: uuidPg('CID inválido').optional(),
  cid_descricao: z.string().optional(),
  medico_nome: z.string().optional(),
  nome_medico: z.string().optional(),
  medico_crm: z.string().optional(),
  crm_medico: z.string().optional(),
  observacoes: z.string().optional(),
  empresa_id: uuidPg().optional(),
});

export type AfastamentoSchema = z.infer<typeof afastamentoSchema>;
