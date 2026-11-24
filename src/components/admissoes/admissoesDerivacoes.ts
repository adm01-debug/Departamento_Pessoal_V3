/**
 * Derivações PURAS da área de Admissões (mesma entrada → mesma saída).
 *
 * Recorte do bloco de helpers que nasceu dentro do `OnboardingDashboard.tsx`
 * (aba "Dashboard"): prazo, progresso e iniciais do avatar. A aba "Gestão de
 * Candidatos" precisa exatamente da MESMA régua — se cada tela recalculasse o
 * próprio "em X dias" ou o próprio percentual de checklist, os dois números
 * poderiam divergir para o mesmo candidato.
 *
 * Diferente de `admissoesComum.ts` (rótulos, selos e ordem do fluxo), aqui só
 * vive matemática: nada de classe CSS, nada de token de cor e nada de JSX — por
 * isso funciona igual no dashboard, na listagem e nos modais.
 */
import { CHECKLIST_ADMISSAO, ETAPA_FLUXO } from './admissoesComum';

/** Registro mínimo que as telas do módulo leem (admissão real ou fictícia). */
export type AdmissaoLike = {
  id?: string | number;
  nome?: string | null;
  cargo?: string | null;
  departamento?: string | null;
  etapa?: string | null;
  status?: string | null;
  data_prevista?: string | null;
  created_at?: string | null;
  /** Texto registrado pelo RH na admissão (andamento/pendência). */
  observacoes?: string | null;
  /** Situação e protocolo da transmissão do S-2200. */
  status_esocial?: string | null;
  protocolo_esocial?: string | null;
  /** Checklist obrigatório da admissão (colunas reais, podem vir nulas). */
  checklist_documentos_pessoais?: boolean | null;
  checklist_comprovante_endereco?: boolean | null;
  checklist_foto?: boolean | null;
  checklist_ctps?: boolean | null;
  checklist_exame_admissional?: boolean | null;
  checklist_contrato_assinado?: boolean | null;
  checklist_esocial_enviado?: boolean | null;
  /** JSON livre da admissão — é dele que sai o `responsavel` do processo. */
  metadata?: { responsavel?: string | null } | null;
};

export const DIA_MS = 24 * 60 * 60 * 1000;

/** `new Date` tolerante: devolve `null` para vazio ou data inválida. */
export function dataValida(valor?: string | null): Date | null {
  if (!valor) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

/** Início do dia (comparações por data, sem ruído de hora). */
export function inicioDoDia(referencia: Date): number {
  return new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate()).getTime();
}

/** Iniciais do candidato (avatar textual). */
export function iniciais(nome?: string | null): string {
  if (!nome) return '—';
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return `${primeira}${ultima}`.toUpperCase() || '—';
}

/** Percentual inteiro seguro (divisão por zero → 0). */
export function percentual(parcial: number, total: number): number {
  return total > 0 ? Math.round((parcial / total) * 100) : 0;
}

/**
 * Dias entre a data prevista e o início de HOJE, arredondados para cima:
 * `> 0` ainda falta, `0` vence hoje, `< 0` atraso e `null` sem data cadastrada.
 *
 * O arredondamento existe porque a coluna é uma data (hora zero): comparando o
 * timestamp direto, "amanhã" cairia em 0,x de dia.
 */
export function diasAteHoje(valor: string | null | undefined, hoje: number): number | null {
  const data = dataValida(valor);
  if (!data) return null;
  return Math.ceil((data.getTime() - hoje) / DIA_MS);
}

/**
 * Checklist da admissão: quantos itens estão marcados e quais faltam.
 * Retorna `null` quando a base não traz nenhum dos sete campos (aí a UI avisa,
 * em vez de mostrar um checklist vazio como se tudo estivesse ok).
 */
export function checklistDaAdmissao(a: AdmissaoLike) {
  const itens = CHECKLIST_ADMISSAO.filter((item) => typeof a[item.campo] === 'boolean');
  if (itens.length === 0) return null;
  const faltantes = itens.filter((item) => a[item.campo] !== true).map((item) => item.label);
  return { total: itens.length, concluidos: itens.length - faltantes.length, faltantes };
}

/**
 * Progresso da admissão em 0-100, com a origem do número:
 *   • checklist preenchido → itens concluídos ÷ total de itens do checklist;
 *   • sem checklist na base → posição da etapa no fluxo de 8 etapas (aproximação).
 */
export function progressoDaAdmissao(a: AdmissaoLike): { valor: number; base: string } {
  const checklist = checklistDaAdmissao(a);
  if (checklist) {
    return {
      valor: percentual(checklist.concluidos, checklist.total),
      base: `checklist ${checklist.concluidos}/${checklist.total}`,
    };
  }
  const indice = ETAPA_FLUXO.indexOf((a.etapa ?? '') as (typeof ETAPA_FLUXO)[number]);
  if (indice < 0) return { valor: 0, base: 'etapa não reconhecida no fluxo' };
  return { valor: percentual(indice + 1, ETAPA_FLUXO.length), base: `etapa ${indice + 1}/${ETAPA_FLUXO.length}` };
}

/** Só o número do progresso (para barras/percentuais da listagem). */
export function progressoValor(a: AdmissaoLike): number {
  return progressoDaAdmissao(a).valor;
}
