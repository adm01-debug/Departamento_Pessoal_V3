import { z } from 'zod';

export const admissaoSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  cpf: z.string().nullish(),
  email: z.string().email('Email inválido').nullish().or(z.literal('')),
  telefone: z.string().nullish(),
  cargo: z.string().min(1, 'Cargo obrigatório'),
  departamento: z.string().min(1, 'Departamento obrigatório'),
  data_prevista: z.string().min(1, 'Data prevista obrigatória'),
  salario_proposto: z.number().min(0, 'Salário deve ser positivo'),
  empresa_id: z.string().uuid().optional(),
  observacoes: z.string().nullish(),
});

export type AdmissaoSchema = z.infer<typeof admissaoSchema>;
