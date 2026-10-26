import type { LucideIcon } from 'lucide-react';
import { CalendarClock, ClipboardList, FileCode2, Send, ShieldCheck } from 'lucide-react';
import { parseDateLocalISO } from '@/utils/dateLocal';
import type { CandidaturaComRelacoes } from '@/types/recrutamento';

/**
 * ETAPAS DO PIPELINE — identidade visual e leitura de cada coluna.
 *
 * Cada etapa carrega somente um TOKEN do Design System (`info`, `chart-4`,
 * `warning`, `chart-5`, `success`). A coluna publica `--etapa-cor` e todos os
 * detalhes (borda, gradiente, glow, ícone, contexto) derivam dela — nenhuma cor
 * hex é criada e o tema claro continua funcionando.
 */
export type EtapaPipelineId = 'triagem' | 'entrevista' | 'teste' | 'proposta' | 'contratado';

export interface EtapaPipeline {
  id: EtapaPipelineId;
  label: string;
  descricao: string;
  /** Token HSL do Design System (ver `src/index.css`). */
  token: string;
  icone: LucideIcon;
}

export const ETAPAS: readonly EtapaPipeline[] = [
  { id: 'triagem', label: 'Triagem', descricao: 'Análise inicial de currículos', token: 'info', icone: ClipboardList },
  {
    id: 'entrevista',
    label: 'Entrevista',
    descricao: 'Conversa com RH e gestor',
    token: 'chart-4',
    icone: CalendarClock,
  },
  { id: 'teste', label: 'Teste Técnico', descricao: 'Avaliação prática da vaga', token: 'warning', icone: FileCode2 },
  { id: 'proposta', label: 'Proposta', descricao: 'Negociação e proposta', token: 'chart-5', icone: Send },
  { id: 'contratado', label: 'Contratado', descricao: 'Processo concluído', token: 'success', icone: ShieldCheck },
] as const;

export function etapaPorId(id: string | null | undefined): EtapaPipeline {
  return ETAPAS.find((etapa) => etapa.id === (id ?? 'triagem')) ?? ETAPAS[0];
}

/** Remove acentos e normaliza para busca. */
export function normalizarBusca(valor: string | null | undefined): string {
  return (valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Busca por candidato, vaga, origem, formação ou habilidades da vaga. */
export function filtrarCandidaturas(
  candidaturas: readonly CandidaturaComRelacoes[],
  termo: string
): CandidaturaComRelacoes[] {
  const alvo = normalizarBusca(termo);
  if (!alvo) return [...candidaturas];
  return candidaturas.filter((cand) => {
    const texto = [
      cand.candidato?.nome,
      cand.candidato?.email,
      cand.candidato?.origem,
      cand.candidato?.formacao,
      cand.vaga?.titulo,
      cand.vaga?.departamento,
      cand.vaga?.requisitos,
    ]
      .map(normalizarBusca)
      .join(' ');
    return texto.includes(alvo);
  });
}

/** Habilidades exibidas no card: requisitos reais da vaga (fallback honesto). */
export function habilidadesDaCandidatura(cand: CandidaturaComRelacoes): string[] {
  const requisitos = (cand.vaga?.requisitos ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (requisitos.length > 0) return requisitos;
  return [
    cand.candidato?.formacao,
    cand.candidato?.experiencia_anos ? `${cand.candidato.experiencia_anos} anos de exp.` : null,
  ].filter((item): item is string => Boolean(item));
}

const DATA_CURTA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
const DATA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const HORA = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

function comoData(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const texto = String(valor).trim();
  // Coluna DATE (`YYYY-MM-DD`) é meia-noite LOCAL — `new Date(texto)` a leria
  // como UTC e exibiria o dia anterior em UTC-3. Timestamps seguem o parser JS.
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return parseDateLocalISO(texto) ?? null;
  const data = new Date(texto);
  return Number.isNaN(data.getTime()) ? null : data;
}

/** `03 de ago.` (mesmo formato curto da referência). */
export function formatarDataCurta(valor: string | null | undefined): string {
  const data = comoData(valor);
  return data ? DATA_CURTA.format(data).replace('.', '').trim() : '—';
}

/** `03/08`. */
export function formatarDiaMes(valor: string | null | undefined): string {
  const data = comoData(valor);
  return data ? DATA.format(data) : '—';
}

/** `05/08/2026 às 09:00`. */
export function formatarDataHora(valor: string | null | undefined): string {
  const data = comoData(valor);
  if (!data) return '—';
  return `${data.toLocaleDateString('pt-BR')} às ${HORA.format(data)}`;
}

/** `hoje às 14:23` quando é o mesmo dia local; senão data completa. */
export function formatarUltimaAtualizacao(
  candidaturas: readonly CandidaturaComRelacoes[],
  referencia: Date = new Date()
): string {
  const instantes = candidaturas
    .map((cand) => comoData(cand.updated_at ?? cand.created_at))
    .filter((data): data is Date => Boolean(data));
  if (instantes.length === 0) return 'sem atualizações';

  const ultima = new Date(Math.max(...instantes.map((data) => data.getTime())));
  const mesmoDia =
    ultima.getFullYear() === referencia.getFullYear() &&
    ultima.getMonth() === referencia.getMonth() &&
    ultima.getDate() === referencia.getDate();
  const hora = HORA.format(ultima);
  return mesmoDia ? `hoje às ${hora}` : `${ultima.toLocaleDateString('pt-BR')} às ${hora}`;
}

export type TomStatusCard = 'success' | 'info' | 'warning' | 'chart-4' | 'chart-5';

/** Rótulo contextual do status (a etapa continua sendo a fonte da coluna). */
export function statusDoCard(cand: CandidaturaComRelacoes): { label: string; token: TomStatusCard } {
  const etapa = etapaPorId(cand.etapa);
  if (cand.status === 'contratado' || etapa.id === 'contratado') return { label: 'Contratado', token: 'success' };
  if (etapa.id === 'triagem') return { label: 'Novo', token: 'info' };
  if (etapa.id === 'entrevista') return { label: 'Em andamento', token: 'chart-4' };
  if (etapa.id === 'teste') return { label: 'Pendente', token: 'warning' };
  if (etapa.id === 'proposta') return { label: 'Em negociação', token: 'chart-5' };
  return { label: 'Em andamento', token: 'info' };
}

export interface ContextoEtapa {
  titulo: string;
  detalhe: string;
  icone: LucideIcon;
}

/**
 * Próxima ação da etapa — derivada dos campos REAIS da candidatura.
 * Nada de texto fixo por candidato: data, entrevistador e prazo vêm do registro.
 */
export function contextoDaEtapa(cand: CandidaturaComRelacoes, referencia: Date = new Date()): ContextoEtapa {
  const etapa = etapaPorId(cand.etapa);
  const entrevista = comoData(cand.data_entrevista);
  const proxima = comoData(cand.data_proxima_etapa);
  const mesmoDia = (data: Date) =>
    data.getFullYear() === referencia.getFullYear() &&
    data.getMonth() === referencia.getMonth() &&
    data.getDate() === referencia.getDate();

  if (etapa.id === 'triagem') {
    return {
      titulo: 'Triagem inicial',
      detalhe: proxima ? `Avaliar currículo até ${DATA.format(proxima)}` : 'Currículo recebido · avaliar aderência',
      icone: etapa.icone,
    };
  }

  if (etapa.id === 'entrevista') {
    return {
      titulo: entrevista
        ? mesmoDia(entrevista)
          ? 'Entrevista hoje'
          : `Entrevista em ${DATA.format(entrevista)}`
        : 'Entrevista a agendar',
      detalhe:
        cand.entrevistador?.trim() ||
        (proxima ? `Definir horário até ${DATA.format(proxima)}` : 'Definir horário com o RH'),
      icone: etapa.icone,
    };
  }

  if (etapa.id === 'teste') {
    return {
      titulo: 'Teste técnico',
      detalhe: proxima ? `Enviar instruções até ${DATA.format(proxima)}` : 'Enviar instruções ao candidato',
      icone: etapa.icone,
    };
  }

  if (etapa.id === 'proposta') {
    return {
      titulo: 'Proposta enviada',
      detalhe: proxima ? `Aguardando retorno até ${DATA.format(proxima)}` : 'Aguardando retorno do candidato',
      icone: etapa.icone,
    };
  }

  return {
    titulo: 'Contratação efetivada',
    detalhe: proxima ? `Início em ${DATA.format(proxima)}` : 'Processo concluído',
    icone: etapa.icone,
  };
}

const PALETA_AVATAR = ['--info', '--chart-4', '--chart-5', '--success', '--warning', '--aqua'] as const;

/** Iniciais do candidato (primeira + última palavra). */
export function iniciaisDoNome(nome: string | null | undefined): string {
  const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

/** Avatar determinístico por nome, usando somente tokens do Design System. */
export function estiloAvatar(nome: string | null | undefined): {
  background: string;
  color: string;
  borderColor: string;
} {
  const texto = normalizarBusca(nome);
  const soma = [...texto].reduce((total, letra) => total + letra.charCodeAt(0), 0);
  const token = PALETA_AVATAR[soma % PALETA_AVATAR.length];
  return {
    background: `linear-gradient(135deg, hsl(var(${token}) / 0.30), hsl(var(${token}) / 0.08))`,
    color: `hsl(var(${token}))`,
    borderColor: `hsl(var(${token}) / 0.38)`,
  };
}
