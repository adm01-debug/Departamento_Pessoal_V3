// Lógica pura da ingestão do relógio de ponto: contrato, hash do token e
// vínculo funcionário -> colaborador. Sem I/O, para ser testável isolada.
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const hora = z.string().regex(/^\d{2}:\d{2}:\d{2}$/);
const POSICOES = ['E1', 'S1', 'E2', 'S2', 'E3', 'S3', 'E4', 'S4', 'E5', 'S5', 'E6', 'S6'] as const;

const marcacaoSchema = z.object({
  pos: z.enum(POSICOES),
  hora: hora.nullable(),
  data: data.nullable(),
  ref: z.number().int().nullable(),
  obs: z.string().max(200).nullable(),
  justificativa: z.number().int().nullable(),
  equip: z.number().int().nullable(),
}).strict();

const diaSchema = z.object({
  funcionario_codigo: z.number().int().positive(),
  data,
  marcacoes: z.array(marcacaoSchema).max(12),
  abono: hora.nullable(),
  abono_negativo: hora.nullable(),
  folga: z.boolean(),
  neutro: z.boolean(),
  justificativa_abono: z.number().int().nullable(),
  horario_codigo: z.number().int().nullable(),
  hash: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();

const funcionarioSchema = z.object({
  codigo: z.number().int().positive(),
  nome: z.string().max(120).nullable(),
  matricula: z.string().max(40).nullable(),
  cpf: z.string().regex(/^\d{1,20}$/).nullable(),
  pis: z.string().regex(/^\d{1,20}$/).nullable(),
  situacao: z.string().max(40).nullable(),
  empresa_codigo: z.number().int().nullable(),
  horario_codigo: z.number().int().nullable(),
  data_admissao: data.nullable(),
  data_desligamento: data.nullable(),
}).strict();

const justificativaSchema = z.object({
  codigo: z.number().int().positive(),
  nome: z.string().min(1).max(60),
  considera_normal: z.boolean(),
  considera_falta: z.boolean(),
}).strict();

export const envioSchema = z.object({
  versao_coletor: z.string().min(1).max(20),
  periodo: z.object({ inicio: data, fim: data }).strict(),
  parte: z.number().int().positive(),
  partes: z.number().int().positive(),
  funcionarios: z.array(funcionarioSchema).max(5000),
  justificativas: z.array(justificativaSchema).max(500),
  dias: z.array(diaSchema).max(1000),
}).strict();

export type Envio = z.infer<typeof envioSchema>;
export type FuncionarioEnvio = z.infer<typeof funcionarioSchema>;

/** Token do coletor: 32+ caracteres imprimíveis sem espaço. */
export function tokenPlausivel(token: string | null): token is string {
  return typeof token === 'string' && /^[\x21-\x7e]{32,256}$/.test(token);
}

export async function sha256Hex(texto: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function soDigitos(valor: string | null | undefined): string {
  return (valor ?? '').replace(/\D/g, '');
}

export interface ColaboradorChave {
  id: string;
  cpf: string | null;
  pis_pasep: string | null;
  matricula: string | null;
}

export type Vinculo = { colaborador_id: string; metodo: 'cpf' | 'pis' | 'matricula' } | null;

/**
 * Liga um funcionário do AtecSoft a um colaborador do DP: CPF, depois PIS,
 * depois matrícula. Nunca por nome. Só vincula quando a chave aponta para UM
 * colaborador; chave que casa com dois fica pendente para decisão humana.
 */
export function vincular(func: FuncionarioEnvio, colaboradores: ColaboradorChave[]): Vinculo {
  const tentativas: Array<['cpf' | 'pis' | 'matricula', string, (c: ColaboradorChave) => string]> = [
    ['cpf', soDigitos(func.cpf).padStart(11, '0'), (c) => soDigitos(c.cpf).padStart(11, '0')],
    ['pis', soDigitos(func.pis).padStart(11, '0'), (c) => soDigitos(c.pis_pasep).padStart(11, '0')],
    ['matricula', (func.matricula ?? '').trim(), (c) => (c.matricula ?? '').trim()],
  ];
  for (const [metodo, chave, de] of tentativas) {
    // Chave vazia ou só zeros não identifica ninguém.
    if (!chave || /^0*$/.test(chave)) continue;
    const achados = colaboradores.filter((c) => de(c) === chave);
    if (achados.length === 1) return { colaborador_id: achados[0].id, metodo };
    if (achados.length > 1) return null;
  }
  return null;
}

/** Dias cujo hash difere do que já está gravado (ou que ainda não existem). */
export function diasAlterados<T extends { funcionario_codigo: number; data: string; hash: string }>(
  recebidos: T[],
  gravados: Array<{ funcionario_codigo: number; data: string; hash_conteudo: string }>,
): T[] {
  const atual = new Map(gravados.map((g) => [`${g.funcionario_codigo}|${g.data}`, g.hash_conteudo]));
  return recebidos.filter((d) => atual.get(`${d.funcionario_codigo}|${d.data}`) !== d.hash);
}
