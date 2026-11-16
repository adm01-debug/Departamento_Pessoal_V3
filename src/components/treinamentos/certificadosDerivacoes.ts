/**
 * ============================================================================
 * CERTIFICADOS — derivações puras da aba (sem React e sem Supabase).
 *
 * HONESTIDADE E REGRAS PRESERVADAS
 * - `data_validade = null` é apresentada como “Vitalício” porque essa é a regra
 *   vigente da tela atual (a tabela antiga fazia exatamente isso) e o schema
 *   descreve a coluna como validade periódica opcional.
 * - `data_validade` inválida (não vazia, mas ilegível) NÃO é presumida como
 *   vitalícia: vira `sem_validade` e aparece apenas em “Todos”.
 * - “A vencer” usa a MESMA janela de 30 dias já adotada pelo sistema em SST
 *   (`SSTPage.stats.vencendo` e `sst_dashboard_sla`, bucket `vencendo_30`).
 *   Certificados não possuem limiar próprio; nenhuma regra de banco é alterada.
 * - `codigo_autenticacao` nunca é gerado, formatado ou corrigido aqui.
 * - Categoria, carga horária, foto e cargo vêm do curso/colaborador JÁ
 *   carregados; nada é inferido do nome do curso.
 * ============================================================================
 */
import {
  CATEGORIA_AUSENTE,
  formatarCargaHoraria,
  formatarDataTreinamento,
  inicioPeriodoTreinamento,
  normalizarTexto,
  parseDataTreinamento,
  type PeriodoTreinamento,
} from './treinamentosDerivacoes';

/** Janela de “a vencer” — mesma convenção do sistema em SST (30 dias). */
export const JANELA_A_VENCER_DIAS = 30;

/* ─── Entradas (linhas cruas do Supabase ou do mock) ──────────────────────── */

export interface CertificadoRegistro {
  id: string;
  colaborador_id?: string | null;
  curso_id?: string | null;
  data_emissao?: string | null;
  data_validade?: string | null;
  arquivo_url?: string | null;
  codigo_autenticacao?: string | null;
  colaborador?: { nome_completo?: string | null; foto_url?: string | null; cargo?: string | null } | null;
  curso?: { nome?: string | null; carga_horaria?: number | string | null } | null;
}

export interface CursoCertificado {
  id: string;
  nome: string;
  categoria?: string | null;
  carga_horaria?: number | string | null;
  imagem_url?: string | null;
}

export interface ColaboradorCertificado {
  id: string;
  nome_completo?: string | null;
  foto_url?: string | null;
  cargo?: string | null;
}

/* ─── Modelo de apresentação ──────────────────────────────────────────────── */

export type SituacaoCertificado = 'todos' | 'valido' | 'a_vencer' | 'vencido' | 'vitalicio';

export type SituacaoRealCertificado = 'valido' | 'a_vencer' | 'vencido' | 'vitalicio' | 'sem_validade';

export interface Certificado {
  id: string;
  cursoId: string | null;
  cursoNome: string;
  categoria: string | null;
  cargaHoraria: string | null;
  imagemUrl: string | null;
  colaboradorId: string | null;
  colaboradorNome: string;
  colaboradorFoto: string | null;
  colaboradorCargo: string | null;
  dataEmissao: string | null;
  emissao: Date | null;
  validade: Date | null;
  validadeTexto: string;
  detalheValidade: string | null;
  codigo: string | null;
  situacao: SituacaoRealCertificado;
  /** Dias até a validade (negativo quando vencido); `null` em vitalício/ausente. */
  diasValidade: number | null;
}

/* ─── Datas / situação ────────────────────────────────────────────────────── */

function meiaNoite(data: Date): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

/**
 * Classificação da validade. `data_validade` nula = vitalício (regra atual);
 * data inválida = `sem_validade`; vencido < hoje; a vencer ≤ 30 dias.
 */
export function classificarValidade(
  valor: string | null | undefined,
  referencia: Date = new Date()
): { situacao: SituacaoRealCertificado; dias: number | null } {
  const texto = String(valor ?? '').trim();
  if (!texto) return { situacao: 'vitalicio', dias: null };

  const validade = parseDataTreinamento(texto);
  if (!validade) return { situacao: 'sem_validade', dias: null };

  const dias = Math.round((meiaNoite(validade).getTime() - meiaNoite(referencia).getTime()) / 86_400_000);

  if (dias < 0) return { situacao: 'vencido', dias };
  if (dias <= JANELA_A_VENCER_DIAS) return { situacao: 'a_vencer', dias };
  return { situacao: 'valido', dias };
}

export function textoValidade(situacao: SituacaoRealCertificado, validade: Date | null): string {
  if (situacao === 'vitalicio') return 'Vitalício';
  if (situacao === 'sem_validade' || !validade) return 'Validade não informada';
  return formatarDataTreinamento(
    `${validade.getFullYear()}-${String(validade.getMonth() + 1).padStart(2, '0')}-${String(
      validade.getDate()
    ).padStart(2, '0')}`
  );
}

/** “Vence em 21 dias” / “Vence hoje” / “Vencido há 5 dias”; nulo quando não se aplica. */
export function detalheValidade(situacao: SituacaoRealCertificado, dias: number | null): string | null {
  if (dias === null) return null;
  if (situacao === 'a_vencer') return dias === 0 ? 'Vence hoje' : `Vence em ${dias} dia${dias === 1 ? '' : 's'}`;
  if (situacao === 'vencido') {
    const abs = Math.abs(dias);
    return `Vencido há ${abs} dia${abs === 1 ? '' : 's'}`;
  }
  return null;
}

/** URL de imagem utilizável (ignora PDFs/arquivos não visuais). */
function imagemUtilizavel(url: string | null | undefined): string | null {
  const texto = String(url ?? '').trim();
  if (!texto) return null;
  return /\.(png|jpe?g|webp|gif|avif|svg)(\?|#|$)/i.test(texto) ? texto : null;
}

/** Junta certificado × curso × colaborador já carregados; nenhuma consulta nova. */
export function montarCertificados(
  certificados: readonly CertificadoRegistro[],
  cursos: readonly CursoCertificado[] = [],
  colaboradores: readonly ColaboradorCertificado[] = [],
  referencia: Date = new Date()
): Certificado[] {
  const cursoPorId = new Map(cursos.map((curso) => [curso.id, curso]));
  const colaboradorPorId = new Map(colaboradores.map((colaborador) => [colaborador.id, colaborador]));

  return certificados.map((registro) => {
    const curso = registro.curso_id ? cursoPorId.get(registro.curso_id) : undefined;
    const colaborador = registro.colaborador_id ? colaboradorPorId.get(registro.colaborador_id) : undefined;
    const { situacao, dias } = classificarValidade(registro.data_validade, referencia);
    const validade = parseDataTreinamento(registro.data_validade);
    const dataEmissao = registro.data_emissao ?? null;
    const categoria = curso?.categoria ?? null;
    const carga = curso?.carga_horaria ?? registro.curso?.carga_horaria ?? null;

    return {
      id: String(registro.id),
      cursoId: registro.curso_id ?? null,
      cursoNome: curso?.nome?.trim() || registro.curso?.nome?.trim() || 'Curso não identificado',
      categoria,
      cargaHoraria: carga !== null && carga !== undefined ? formatarCargaHoraria(carga) : null,
      imagemUrl: imagemUtilizavel(registro.arquivo_url) ?? imagemUtilizavel(curso?.imagem_url),
      colaboradorId: registro.colaborador_id ?? null,
      colaboradorNome:
        colaborador?.nome_completo?.trim() ||
        registro.colaborador?.nome_completo?.trim() ||
        'Colaborador não informado',
      colaboradorFoto: colaborador?.foto_url ?? registro.colaborador?.foto_url ?? null,
      colaboradorCargo: colaborador?.cargo?.trim() || registro.colaborador?.cargo?.trim() || null,
      dataEmissao,
      emissao: parseDataTreinamento(dataEmissao),
      validade,
      validadeTexto: textoValidade(situacao, validade),
      detalheValidade: detalheValidade(situacao, dias),
      codigo: registro.codigo_autenticacao?.trim() || null,
      situacao,
      diasValidade: dias,
    };
  });
}

/* ─── Opções / filtros ────────────────────────────────────────────────────── */

export const SITUACAO_CERTIFICADO_OPCOES: readonly { value: SituacaoCertificado; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'valido', label: 'Válidos' },
  { value: 'a_vencer', label: 'A vencer' },
  { value: 'vencido', label: 'Vencidos' },
  { value: 'vitalicio', label: 'Vitalícios' },
];

export type OrdenacaoCertificado = 'recentes' | 'antigos' | 'validade' | 'curso' | 'colaborador';

export const ORDENACAO_CERTIFICADO_OPCOES: readonly { value: OrdenacaoCertificado; label: string }[] = [
  { value: 'recentes', label: 'Mais recentes' },
  { value: 'antigos', label: 'Mais antigos' },
  { value: 'validade', label: 'Validade próxima' },
  { value: 'curso', label: 'Curso (A–Z)' },
  { value: 'colaborador', label: 'Colaborador (A–Z)' },
];

export const ORDENACAO_CERTIFICADO_PADRAO: OrdenacaoCertificado = 'recentes';

export interface FiltrosCertificado {
  busca?: string;
  /** `todos` = curinga. É o MESMO estado dos badges de segmentação. */
  situacao?: SituacaoCertificado;
  /** `todas`/vazio = curinga; usa a categoria normalizada do curso. */
  categoria?: string;
  /** Período de EMISSÃO (nunca de validade). */
  periodo?: PeriodoTreinamento;
  ordenacao?: OrdenacaoCertificado;
}

/** Filtra por busca, situação, categoria e período de emissão. */
export function filtrarCertificados(
  certificados: readonly Certificado[],
  filtros: FiltrosCertificado,
  referencia: Date = new Date()
): Certificado[] {
  const termo = normalizarTexto(filtros.busca);
  const situacao = filtros.situacao && filtros.situacao !== 'todos' ? filtros.situacao : null;
  const categoriaAlvo = filtros.categoria && filtros.categoria !== 'todas' ? filtros.categoria : null;
  const inicio = inicioPeriodoTreinamento(filtros.periodo ?? 'todos', referencia);

  return certificados.filter((certificado) => {
    if (termo) {
      const alvo = normalizarTexto(
        [certificado.colaboradorNome, certificado.cursoNome, certificado.codigo ?? '', certificado.categoria ?? '']
          .filter(Boolean)
          .join(' ')
      );
      if (!alvo.includes(termo)) return false;
    }

    if (situacao && certificado.situacao !== situacao) return false;

    if (categoriaAlvo) {
      const categoria = certificado.categoria ? normalizarTexto(certificado.categoria) : CATEGORIA_AUSENTE;
      if (categoria !== categoriaAlvo) return false;
    }

    if (inicio) {
      if (!certificado.emissao) return false;
      if (meiaNoite(certificado.emissao).getTime() < inicio.getTime()) return false;
    }

    return true;
  });
}

/** Filtros que alimentam os CONTADORES das badges (tudo, menos a própria situação). */
export function certificadosBaseDosContadores(
  certificados: readonly Certificado[],
  filtros: FiltrosCertificado,
  referencia: Date = new Date()
): Certificado[] {
  return filtrarCertificados(certificados, { ...filtros, situacao: 'todos' }, referencia);
}

/** Contadores reais por situação, sobre o recorte dos demais filtros. */
export function contarSituacoesCertificado(certificados: readonly Certificado[]): Record<SituacaoCertificado, number> {
  const contagem: Record<SituacaoCertificado, number> = {
    todos: certificados.length,
    valido: 0,
    a_vencer: 0,
    vencido: 0,
    vitalicio: 0,
  };
  for (const certificado of certificados) {
    if (certificado.situacao !== 'sem_validade') contagem[certificado.situacao] += 1;
  }
  return contagem;
}

/* ─── Ordenação / categorias ──────────────────────────────────────────────── */

function compararCurso(a: Certificado, b: Certificado): number {
  return a.cursoNome.localeCompare(b.cursoNome, 'pt-BR') || a.colaboradorNome.localeCompare(b.colaboradorNome, 'pt-BR');
}

function compararColaborador(a: Certificado, b: Certificado): number {
  return a.colaboradorNome.localeCompare(b.colaboradorNome, 'pt-BR') || a.cursoNome.localeCompare(b.cursoNome, 'pt-BR');
}

function tempoEmissao(certificado: Certificado): number {
  return certificado.emissao?.getTime() ?? 0;
}

/** Ordena uma CÓPIA; certificados sem data vão ao final em ambas as ordens. */
export function ordenarCertificados(
  certificados: readonly Certificado[],
  ordenacao: OrdenacaoCertificado
): Certificado[] {
  const copia = [...certificados];
  switch (ordenacao) {
    case 'antigos':
      return copia.sort((a, b) => tempoEmissao(a) - tempoEmissao(b) || compararCurso(a, b));
    case 'validade':
      return copia.sort((a, b) => {
        if (!a.validade && !b.validade) return tempoEmissao(b) - tempoEmissao(a);
        if (!a.validade) return 1;
        if (!b.validade) return -1;
        return a.validade.getTime() - b.validade.getTime() || tempoEmissao(b) - tempoEmissao(a);
      });
    case 'curso':
      return copia.sort(compararCurso);
    case 'colaborador':
      return copia.sort(compararColaborador);
    default:
      return copia.sort((a, b) => tempoEmissao(b) - tempoEmissao(a) || compararCurso(a, b));
  }
}

/** Categorias reais dos cursos vinculados; inclui “Sem categoria” quando existe. */
export function opcoesCategoriaCertificado(certificados: readonly Certificado[]): { value: string; label: string }[] {
  const vistos = new Map<string, string>();
  let semCategoria = false;
  for (const certificado of certificados) {
    const rotulo = certificado.categoria?.trim();
    if (!rotulo) {
      semCategoria = true;
      continue;
    }
    const value = normalizarTexto(rotulo);
    if (!vistos.has(value)) vistos.set(value, rotulo);
  }
  const opcoes = Array.from(vistos, ([value, label]) => ({ value, label })).sort((a, b) =>
    a.label.localeCompare(b.label, 'pt-BR')
  );
  if (semCategoria) opcoes.push({ value: CATEGORIA_AUSENTE, label: 'Sem categoria' });
  return opcoes;
}
