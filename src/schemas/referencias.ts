import { z } from 'zod';

const uuid = z.string().uuid('UUID inválido');
const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar em formato ISO (AAAA-MM-DD)');

/**
 * Schemas das tabelas de referência/administração. validateInput aplica
 * .partial() — campos presentes no payload são validados; obrigatoriedade
 * fica a cargo do banco.
 */

export const centroCustoSchema = z.object({
  empresa_id: uuid.nullable().optional(),
  codigo: z.string().max(50).nullable().optional(),
  nome: z.string().min(1).max(200),
  descricao: z.string().max(1000).nullable().optional(),
  ativo: z.boolean().nullable().optional(),
});

export const contaBancariaSchema = z.object({
  colaborador_id: uuid,
  empresa_id: uuid.nullable().optional(),
  banco_codigo: z.string().max(10).nullable().optional(),
  banco_nome: z.string().max(100).nullable().optional(),
  agencia: z.string().max(10).nullable().optional(),
  agencia_digito: z.string().max(2).nullable().optional(),
  conta: z.string().max(20).nullable().optional(),
  digito: z.string().max(2).nullable().optional(),
  modalidade: z.string().max(50).nullable().optional(),
  tipo_conta: z.enum(['corrente', 'poupanca', 'salario']).nullable().optional(),
  pix_tipo: z.string().max(20).nullable().optional(),
  pix_chave: z.string().max(200).nullable().optional(),
});

export const dadosEstagiarioSchema = z.object({
  colaborador_id: uuid,
  empresa_id: uuid.nullable().optional(),
  curso: z.string().max(200).nullable().optional(),
  nivel: z.string().max(50).nullable().optional(),
  categoria_estagio: z.string().max(50).nullable().optional(),
  area_atuacao: z.string().max(200).nullable().optional(),
  carga_horaria_semanal: z.number().min(0).max(44).nullable().optional(),
  data_inicio: dataISO.nullable().optional(),
  data_fim: dataISO.nullable().optional(),
  instituicao_nome: z.string().max(300).nullable().optional(),
  instituicao_cnpj: z.string().max(18).nullable().optional(),
  instituicao_cep: z.string().max(9).nullable().optional(),
  instituicao_cidade: z.string().max(100).nullable().optional(),
  instituicao_uf: z.string().max(2).nullable().optional(),
});

export const documentoPessoalSchema = z.object({
  colaborador_id: uuid,
  tipo_documento: z.string().min(1).max(50),
  numero: z.string().max(50).nullable().optional(),
  orgao_emissor: z.string().max(100).nullable().optional(),
  data_emissao: dataISO.nullable().optional(),
  data_validade: dataISO.nullable().optional(),
  arquivo_nome: z.string().max(300).nullable().optional(),
  arquivo_tamanho: z
    .number()
    .int()
    .min(0)
    .max(50 * 1024 * 1024)
    .nullable()
    .optional(),
  arquivo_url: z.string().max(2048).nullable().optional(),
});

export const feriasAprovacaoSchema = z.object({
  ferias_id: uuid,
  aprovador_id: uuid.nullable().optional(),
  tipo: z.string().min(1).max(50),
  status: z.string().max(50).nullable().optional(),
  observacoes: z.string().max(2000).nullable().optional(),
});

export const configAfastamentoSchema = z.object({
  tipo: z.enum([
    'doenca',
    'acidente_trabalho',
    'acidente_trajeto',
    'licenca_maternidade',
    'licenca_paternidade',
    'licenca_casamento',
    'licenca_obito',
    'licenca_nao_remunerada',
    'servico_militar',
    'mandato_sindical',
    'suspensao_disciplinar',
    'outros',
  ]),
  descricao: z.string().max(500).nullable().optional(),
  dias_minimos: z.number().int().min(0).nullable().optional(),
  dias_maximos: z.number().int().min(1).nullable().optional(),
  dias_empresa_maximo: z.number().int().min(0).max(15, 'CLT: até 15 dias pagos pela empresa').nullable().optional(),
  exige_cid: z.boolean().nullable().optional(),
  pago_empresa: z.boolean().nullable().optional(),
  pago_inss: z.boolean().nullable().optional(),
});

export const feriasSolicitacaoSchema = z.object({
  colaborador_id: uuid.nullable().optional(),
  empresa_id: uuid.nullable().optional(),
  data_inicio: dataISO,
  data_fim: dataISO,
  dias: z.number().int().min(1).max(30).nullable().optional(),
  abono_pecuniario: z.boolean().nullable().optional(),
  status: z.string().max(50).nullable().optional(),
  observacoes: z.string().max(2000).nullable().optional(),
});

export const linhaTransporteSchema = z.object({
  nome: z.string().min(1).max(200),
  tipo: z.string().max(50).nullable().optional(),
  valor: z.number().min(0).nullable().optional(),
  ida_volta: z.boolean().nullable().optional(),
  vale_transporte_id: uuid.nullable().optional(),
});

export const onboardingTemplateTarefaSchema = z.object({
  template_id: uuid,
  titulo: z.string().min(1).max(300),
  descricao: z.string().max(2000).nullable().optional(),
  categoria: z.string().max(100).optional(),
  responsavel_tipo: z.string().max(50).nullable().optional(),
  dias_prazo: z.number().int().min(0).nullable().optional(),
  obrigatoria: z.boolean().nullable().optional(),
  ordem: z.number().int().min(0).optional(),
});

export const feriasArquivoSchema = z.object({
  ferias_id: uuid,
  nome: z.string().min(1).max(300),
  arquivo_url: z.string().max(2048).nullable().optional(),
  assinavel: z.boolean().nullable().optional(),
});

export const onboardingTemplateSchema = z.object({
  empresa_id: uuid.nullable().optional(),
  nome: z.string().min(1).max(300),
  descricao: z.string().max(2000).nullable().optional(),
  ativo: z.boolean().nullable().optional(),
});

export const onboardingColaboradorSchema = z.object({
  colaborador_id: uuid,
  empresa_id: uuid.nullable().optional(),
  template_id: uuid.nullable().optional(),
  data_inicio: dataISO.optional(),
  status: z.string().max(50).optional(),
  progresso: z.number().min(0).max(100).nullable().optional(),
});
