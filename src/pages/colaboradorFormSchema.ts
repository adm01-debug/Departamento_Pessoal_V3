import { z } from 'zod';

/**
 * Schema do formulario de colaborador, em arquivo proprio (como
 * `colaboradorPayload.ts`) e nao dentro da pagina: exportar constante de um
 * arquivo de componente quebra a regra react-refresh/only-export-components, e
 * essa validacao precisa ser exercida por teste — o `FormSelect` e Radix e
 * renderiza as opcoes em portal so ao abrir, entao o schema e o unico ponto
 * onde a garantia de `status` contra o enum do banco pode ser provada.
 */
export const colaboradorFormSchema = z.object({
  // Geral
  nome_completo: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  nome_social: z.string().optional(),
  cpf: z.string().length(11, 'CPF inválido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
  celular: z.string().optional(),
  data_nascimento: z.string().min(1, 'Data de nascimento obrigatória'),
  sexo: z.enum(['masculino', 'feminino']).default('masculino'),
  estado_civil: z.enum(['solteiro', 'casado', 'divorciado', 'viuvo', 'separado', 'uniao_estavel']).default('solteiro'),
  nome_mae: z.string().min(1, 'Nome da mãe obrigatório'),
  nome_pai: z.string().optional(),

  // Endereço
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),

  // Profissional
  data_admissao: z.string().min(1, 'Data obrigatória'),
  salario_base: z.number().positive('Salário deve ser positivo'),
  cargo: z.string().min(1, 'Cargo obrigatório'),
  departamento: z.string().min(1, 'Departamento obrigatório'),
  tipo_contrato: z.enum(['clt', 'pj', 'estagiario', 'temporario', 'intermitente', 'aprendiz']).default('clt'),
  // Enum fechado, igual ao `status_colaborador` do banco. Era `z.string()`, e
  // por isso a tela conseguia submeter um status que o Postgres recusa — o
  // usuário levava erro cru em vez de validação.
  status: z.enum(['ativo', 'ferias', 'afastado', 'desligado', 'pendente']).default('ativo'),
  matricula: z.string().optional(),

  // Bancário
  banco_codigo: z.string().optional(),
  agencia: z.string().optional(),
  conta: z.string().optional(),
  tipo_conta: z.string().optional(),
  pix_chave: z.string().optional(),

  // Documentos
  rg: z.string().optional(),
  rg_orgao_emissor: z.string().optional(),
  pis_pasep: z.string().optional(),
  ctps_numero: z.string().optional(),
  ctps_serie: z.string().optional(),
});

export type ColaboradorFormData = z.infer<typeof colaboradorFormSchema>;
export type ColaboradorFormInput = z.input<typeof colaboradorFormSchema>;
