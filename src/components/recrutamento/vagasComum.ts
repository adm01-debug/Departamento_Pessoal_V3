import type { LucideIcon } from 'lucide-react';
import { BarChart3, Briefcase, Code2, Database, Folder, Users } from 'lucide-react';
import type { CandidaturaComRelacoes, VagaRow } from '@/types/recrutamento';
import { ETAPAS, type EtapaPipelineId } from './pipelineEtapas';

/**
 * ============================================================================
 * VAGAS — derivações puras (sem React/Supabase).
 *
 * Tudo aqui nasce dos campos reais de `vagas` e das candidaturas já carregadas:
 *   • status: `aberta`/`fechada` (o valor original nunca é reescrito);
 *   • funil: etapas REAIS de `pipelineEtapas` e a etapa atual de cada candidatura;
 *   • total de candidatos: todas as candidaturas vinculadas (mesma definição da
 *     contagem que a tela já usava);
 *   • datas: `data_abertura`, `data_encerramento` e `created_at` das candidaturas;
 *   • identidade cromática: departamento/cargo + paleta determinística de tokens
 *     existentes (nunca um id fixo de vaga).
 * Nenhum candidato, etapa, data ou texto é inventado.
 * ============================================================================
 */

export type FiltroStatusVaga = 'todas' | 'aberta' | 'fechada';
export type OrdenacaoVaga = 'recentes' | 'antigas' | 'candidatos' | 'titulo';

export interface IdentidadeVaga {
  token: 'info' | 'chart-4' | 'warning' | 'success' | 'aqua';
  rotulo: string;
  icone: LucideIcon;
  /** Accent RGB exato da paleta aprovada, usado via `--vaga-accent`. */
  accent: string;
  /** Opacidade do radial; calibrada por luminosidade percebida do accent. */
  alpha: string;
}

const IDENTIDADES: Record<IdentidadeVaga['token'], Omit<IdentidadeVaga, 'icone'>> = {
  info: {
    token: 'info',
    rotulo: 'Tecnologia',
    accent: '56 189 248',
    alpha: '0.25',
  },
  'chart-4': {
    token: 'chart-4',
    rotulo: 'Recursos Humanos',
    accent: '167 139 250',
    alpha: '0.28',
  },
  warning: {
    token: 'warning',
    rotulo: 'Administrativo',
    accent: '251 191 36',
    alpha: '0.22',
  },
  success: {
    token: 'success',
    rotulo: 'Comercial',
    accent: '52 211 153',
    alpha: '0.24',
  },
  aqua: {
    token: 'aqua',
    rotulo: 'Dados',
    accent: '20 184 166',
    alpha: '0.27',
  },
};

const IDENTIDADE_POR_DEPARTAMENTO: { chave: string; identidade: IdentidadeVaga['token']; icone: LucideIcon }[] = [
  { chave: 'tecnologia', identidade: 'info', icone: Code2 },
  { chave: 'recursos humanos', identidade: 'chart-4', icone: Users },
  { chave: 'rh', identidade: 'chart-4', icone: Users },
  { chave: 'administrativo', identidade: 'warning', icone: Folder },
  { chave: 'comercial', identidade: 'success', icone: BarChart3 },
];

const PALETA_DETERMINISTICA: IdentidadeVaga['token'][] = ['info', 'chart-4', 'warning', 'success', 'aqua'];

/** Normaliza texto para comparação (sem acentos, minúsculo). */
export function normalizarVaga(valor: string | null | undefined): string {
  return (valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function identidadeDe(vaga: VagaRow): IdentidadeVaga {
  const departamento = normalizarVaga(vaga.departamento);
  const cargo = normalizarVaga(`${vaga.cargo ?? ''} ${vaga.titulo ?? ''}`);

  // Dados é uma especialidade de Tecnologia e recebe o ciano da referência.
  if (
    (departamento.includes('tecnologia') || departamento === 'ti') &&
    /(dados|data|analytics|business intelligence|\bbi\b)/.test(cargo)
  ) {
    return { ...IDENTIDADES.aqua, icone: Database };
  }

  const porDepartamento = IDENTIDADE_POR_DEPARTAMENTO.find((item) => departamento.includes(item.chave));
  if (porDepartamento) {
    return { ...IDENTIDADES[porDepartamento.identidade], icone: porDepartamento.icone };
  }

  // Paleta determinística: mesma vaga sempre recebe a mesma cor, sem id fixo.
  const base = `${departamento} ${cargo}`.trim() || vaga.id;
  const soma = [...base].reduce((total, letra) => total + letra.charCodeAt(0), 0);
  const token = PALETA_DETERMINISTICA[soma % PALETA_DETERMINISTICA.length];
  return { ...IDENTIDADES[token], icone: Briefcase };
}

export interface VagaComResumo {
  vaga: VagaRow;
  identidade: IdentidadeVaga;
  aberta: boolean;
  fechada: boolean;
  statusRotulo: string;
  totalCandidatos: number;
  candidatosPorEtapa: Record<EtapaPipelineId, number>;
  abertura: Date | null;
  encerramento: Date | null;
  criacao: Date | null;
  /** “Aberta há N dias” / “Fechada há N dias”; null sem data real. */
  temporal: string | null;
  /** Rodapé: último candidato, data de encerramento ou ausência de candidatos. */
  atividade: string;
}

const STATUS_ABERTA = new Set(['aberta', 'aberto', 'open', 'ativa', 'ativo']);
const STATUS_FECHADA = new Set(['fechada', 'fechado', 'closed', 'encerrada', 'encerrado', 'inativa', 'inativo']);

/** Data local sem deslocamento de fuso para `YYYY-MM-DD`. */
export function dataDaVaga(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const texto = String(valor).trim();
  const apenasData = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (apenasData) {
    const data = new Date(Number(apenasData[1]), Number(apenasData[2]) - 1, Number(apenasData[3]));
    return Number.isNaN(data.getTime()) ? null : data;
  }
  const data = new Date(texto);
  return Number.isNaN(data.getTime()) ? null : data;
}

function inicioDoDia(data: Date): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

function diferencaEmDias(data: Date, referencia: Date): number {
  return Math.round((inicioDoDia(referencia).getTime() - inicioDoDia(data).getTime()) / 86_400_000);
}

const DATA_CURTA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

function dataCurta(data: Date): string {
  return DATA_CURTA.format(data);
}

function rotuloTemporal(data: Date | null, tipo: 'aberta' | 'fechada', referencia: Date): string | null {
  if (!data) return null;
  const dias = diferencaEmDias(data, referencia);
  if (dias < 0) return `${tipo === 'aberta' ? 'Abre' : 'Fecha'} em ${dataCurta(data)}`;
  if (dias === 0) return tipo === 'aberta' ? 'Aberta hoje' : 'Fechada hoje';
  return `${tipo === 'aberta' ? 'Aberta' : 'Fechada'} há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
}

function rotuloUltimoCandidato(data: Date | null, referencia: Date): string | null {
  if (!data) return null;
  const dias = diferencaEmDias(data, referencia);
  if (dias < 0) return `Último candidato em ${dataCurta(data)}`;
  if (dias === 0) return 'Último candidato hoje';
  return `Último candidato há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
}

function ultimaCandidatura(candidaturas: readonly CandidaturaComRelacoes[]): Date | null {
  let ultima: Date | null = null;
  for (const candidatura of candidaturas) {
    const data = dataDaVaga(candidatura.created_at);
    if (data && (!ultima || data.getTime() > ultima.getTime())) ultima = data;
  }
  return ultima;
}

function contarEtapas(candidaturas: readonly CandidaturaComRelacoes[]): Record<EtapaPipelineId, number> {
  const base = Object.fromEntries(ETAPAS.map((etapa) => [etapa.id, 0])) as Record<EtapaPipelineId, number>;
  for (const candidatura of candidaturas) {
    const etapa = normalizarVaga(candidatura.etapa) as EtapaPipelineId;
    if (etapa in base) base[etapa] += 1;
  }
  return base;
}

/** Monta o resumo de TODAS as vagas (sem filtro), preservando a ordem recebida. */
export function montarVagasResumo(
  vagas: readonly VagaRow[],
  candidaturas: readonly CandidaturaComRelacoes[],
  referencia: Date = new Date()
): VagaComResumo[] {
  const porVaga = new Map<string, CandidaturaComRelacoes[]>();
  for (const candidatura of candidaturas) {
    const lista = porVaga.get(candidatura.vaga_id);
    if (lista) lista.push(candidatura);
    else porVaga.set(candidatura.vaga_id, [candidatura]);
  }

  return vagas.map((vaga) => {
    const lista = porVaga.get(vaga.id) ?? [];
    const status = normalizarVaga(vaga.status);
    const aberta = STATUS_ABERTA.has(status);
    const fechada = STATUS_FECHADA.has(status);
    const abertura = dataDaVaga(vaga.data_abertura);
    const encerramento = dataDaVaga(vaga.data_encerramento);
    const criacao = dataDaVaga(vaga.created_at);
    const ultima = ultimaCandidatura(lista);
    const finalizacao = fechada && encerramento ? `Processo finalizado em ${dataCurta(encerramento)}` : null;
    const atividade = fechada
      ? (finalizacao ?? 'Vaga encerrada')
      : (rotuloUltimoCandidato(ultima, referencia) ?? 'Nenhum candidato ainda');

    return {
      vaga,
      identidade: identidadeDe(vaga),
      aberta,
      fechada,
      statusRotulo: aberta ? 'Aberta' : fechada ? 'Fechada' : vaga.status?.trim() || 'Não informado',
      totalCandidatos: lista.length,
      candidatosPorEtapa: contarEtapas(lista),
      abertura,
      encerramento,
      criacao,
      temporal: rotuloTemporal(aberta ? abertura : encerramento, aberta ? 'aberta' : 'fechada', referencia),
      atividade,
    };
  });
}

export interface FiltrosVaga {
  status: FiltroStatusVaga;
  departamento: string;
  modalidade: string;
  ordenacao: OrdenacaoVaga;
}

export const FILTROS_VAGA_PADRAO: FiltrosVaga = {
  status: 'todas',
  departamento: 'todos',
  modalidade: 'todas',
  ordenacao: 'recentes',
};

export interface ContagemVagas {
  todas: number;
  abertas: number;
  fechadas: number;
}

export function contarVagas(vagas: readonly VagaRow[]): ContagemVagas {
  let abertas = 0;
  let fechadas = 0;
  for (const vaga of vagas) {
    const status = normalizarVaga(vaga.status);
    if (STATUS_ABERTA.has(status)) abertas += 1;
    else if (STATUS_FECHADA.has(status)) fechadas += 1;
  }
  return { todas: vagas.length, abertas, fechadas };
}

export function opcoesDepartamento(vagas: readonly VagaRow[]): string[] {
  const valores = new Set<string>();
  for (const vaga of vagas) {
    const valor = vaga.departamento?.trim();
    if (valor) valores.add(valor);
  }
  return [...valores].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function opcoesModalidade(vagas: readonly VagaRow[]): string[] {
  const valores = new Set<string>();
  for (const vaga of vagas) {
    const valor = vaga.modalidade?.trim();
    if (valor) valores.add(valor);
  }
  return [...valores].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function dataReferencia(resumo: VagaComResumo): Date | null {
  return resumo.abertura ?? resumo.criacao;
}

/** Aplica os quatro filtros e a ordenação; devolve uma nova lista. */
export function filtrarVagas(resumos: readonly VagaComResumo[], filtros: FiltrosVaga): VagaComResumo[] {
  const departamento = normalizarVaga(filtros.departamento);
  const modalidade = normalizarVaga(filtros.modalidade);

  const filtrados = resumos.filter((resumo) => {
    if (filtros.status === 'aberta' && !resumo.aberta) return false;
    if (filtros.status === 'fechada' && !resumo.fechada) return false;
    if (departamento && departamento !== 'todos' && normalizarVaga(resumo.vaga.departamento) !== departamento)
      return false;
    if (modalidade && modalidade !== 'todas' && normalizarVaga(resumo.vaga.modalidade) !== modalidade) return false;
    return true;
  });

  const copia = [...filtrados];
  switch (filtros.ordenacao) {
    case 'antigas':
      return copia.sort((a, b) => {
        const ta = dataReferencia(a)?.getTime() ?? 0;
        const tb = dataReferencia(b)?.getTime() ?? 0;
        return ta - tb || a.vaga.titulo.localeCompare(b.vaga.titulo, 'pt-BR');
      });
    case 'candidatos':
      return copia.sort(
        (a, b) => b.totalCandidatos - a.totalCandidatos || a.vaga.titulo.localeCompare(b.vaga.titulo, 'pt-BR')
      );
    case 'titulo':
      return copia.sort((a, b) => a.vaga.titulo.localeCompare(b.vaga.titulo, 'pt-BR'));
    default:
      return copia.sort((a, b) => {
        const ta = dataReferencia(a)?.getTime() ?? 0;
        const tb = dataReferencia(b)?.getTime() ?? 0;
        return tb - ta || a.vaga.titulo.localeCompare(b.vaga.titulo, 'pt-BR');
      });
  }
}
