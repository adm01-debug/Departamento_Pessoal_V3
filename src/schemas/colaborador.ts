import { z } from 'zod';

// For local development, we keep the schema here but it matches the shared version
export const colaboradorSchema = z.object({
  nome_completo: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  cpf: z.string().min(11, 'CPF inválido'),
  data_nascimento: z.string().min(1, 'Data de nascimento obrigatória'),
  sexo: z.enum(['masculino', 'feminino', 'outro']),
  estado_civil: z.enum(['solteiro', 'casado', 'divorciado', 'viuvo', 'uniao_estavel']),
  nome_mae: z.string().min(3, 'Nome da mãe obrigatório'),
  nome_pai: z.string().optional(),
  rg: z.string().optional(),
  pis_pasep: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
  celular: z.string().optional(),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().max(2).optional(),
  cargo: z.string().min(1, 'Cargo obrigatório'),
  departamento: z.string().min(1, 'Departamento obrigatório'),
  data_admissao: z.string().min(1, 'Data de admissão obrigatória'),
  salario_base: z.number().min(0, 'Salário deve ser positivo'),
  tipo_contrato: z.enum(['clt', 'pj', 'estagio', 'temporario', 'intermitente', 'jovem_aprendiz']),
  empresa_id: z.string().uuid().optional(),
});

export type ColaboradorSchema = z.infer<typeof colaboradorSchema>;
