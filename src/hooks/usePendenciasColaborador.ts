import { format } from 'date-fns';
import { parseDateLocalISO, todayLocalISO } from '@/utils/dateLocal';
import { useASOs } from '@/hooks/useColaboradorDetalhes';
import { useDocumentosPessoais } from '@/hooks/useTabelasReferencia';
import { useOnboardingColaborador } from '@/hooks/useDesenvolvimentoColaborador';
import { usePontoMelhorado } from '@/hooks/usePontoMelhorado';

/**
 * Pendências do dossiê do colaborador — resgate da branch `muri`
 * (`ColaboradorDetalhesPage.tsx:413` lá).
 *
 * Por que virou hook em vez de ficar na página, como estava na origem: a
 * página de detalhes já tem mais de 600 linhas, e a decisão "o que conta como
 * pendência" é regra de negócio testável. Aqui ela fica sem JSX e sem
 * navegação — a página só mapeia `chave` para ícone e para onde o botão leva.
 *
 * A origem usava `(s: any)`, `(t: any)`, `(a: any)`, `(d: any)` nos `.map()`.
 * O projeto tem ratchet de `any` (scripts/ratchet-any.mjs, baseline=1), então
 * cada linha é tipada pelo que esta regra de fato lê — não pelo schema inteiro.
 */

export type PendenciaChave = 'ponto' | 'onboarding' | 'aso' | 'documentos';

export interface PendenciaColaborador {
  chave: PendenciaChave;
  /** Resumo com a contagem, já pluralizado. */
  texto: string;
  /** Por que isso importa para o RH — o texto vem da branch de origem. */
  contexto: string;
  /** Uma linha por item, com datas e dias de atraso. */
  itens: string[];
  severidade: 'alta' | 'media';
}

interface LinhaAjustePonto {
  data_ponto?: string | null;
  tipo_ponto?: string | null;
  hora_original?: string | null;
  hora_sugerida?: string | null;
  motivo?: string | null;
  created_at?: string | null;
  status?: string | null;
}

interface LinhaTarefaOnboarding {
  titulo?: string | null;
  categoria?: string | null;
  data_prazo?: string | null;
}

interface LinhaASO {
  tipo?: string | null;
  data_validade?: string | null;
  data_exame?: string | null;
  medico_nome?: string | null;
  clinica?: string | null;
}

interface LinhaDocumentoPessoal {
  tipo_documento?: string | null;
  numero?: string | null;
  data_validade?: string | null;
  orgao_emissor?: string | null;
}

function dataBR(iso?: string | null): string {
  // `parseDateLocalISO` em vez de `new Date(iso)`: as colunas são DATE e
  // `new Date('2024-03-05')` é lido como UTC, mostrando 04/03 em fuso negativo.
  const d = parseDateLocalISO(iso);
  return d ? format(d, 'dd/MM/yyyy') : '—';
}

function dataHoraBR(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  // `created_at` é timestamptz: aqui o fuso local é o que se quer mostrar.
  return Number.isNaN(d.getTime()) ? '—' : format(d, 'dd/MM/yyyy HH:mm');
}

function diasDesde(iso?: string | null): number | null {
  const d = parseDateLocalISO(iso);
  if (!d) return null;
  const hoje = parseDateLocalISO(todayLocalISO());
  if (!hoje) return null;
  return Math.round((hoje.getTime() - d.getTime()) / 86_400_000);
}

function plural(n: number, singular: string, plural_: string): string {
  return n === 1 ? singular : plural_;
}

function sufixoAtraso(iso?: string | null): string {
  const dias = diasDesde(iso);
  if (dias === null) return '';
  return `, ${dias} ${plural(dias, 'dia', 'dias')} de atraso`;
}

function sufixoHa(iso?: string | null): string {
  const dias = diasDesde(iso);
  if (dias === null) return '';
  return ` (há ${dias} ${plural(dias, 'dia', 'dias')})`;
}

export function usePendenciasColaborador(colaboradorId: string, empresaId?: string) {
  const { data: asos } = useASOs(colaboradorId);
  const { data: documentosPessoais } = useDocumentosPessoais(colaboradorId);
  const { solicitacoes: ajustesPonto } = usePontoMelhorado(empresaId, colaboradorId);
  const onboarding = useOnboardingColaborador(colaboradorId);

  const hoje = todayLocalISO();

  const ajustesPendentes = ((ajustesPonto ?? []) as LinhaAjustePonto[]).filter((s) => s.status === 'enviado');
  const tarefasAtrasadas = (onboarding.atrasadas ?? []) as LinhaTarefaOnboarding[];
  const asosVencidos = ((asos ?? []) as LinhaASO[]).filter((a) => !!a.data_validade && a.data_validade < hoje);
  const documentosVencidos = ((documentosPessoais ?? []) as LinhaDocumentoPessoal[]).filter(
    (d) => !!d.data_validade && d.data_validade < hoje
  );

  const pendencias: PendenciaColaborador[] = [];

  if (ajustesPendentes.length > 0) {
    pendencias.push({
      chave: 'ponto',
      texto: `${ajustesPendentes.length} ajuste${plural(ajustesPendentes.length, '', 's')} de ponto pendente${plural(ajustesPendentes.length, '', 's')}`,
      contexto:
        'Correções de marcação de ponto enviadas pelo colaborador e que aguardam aprovação do gestor. Enquanto pendente, o registro original permanece divergente e pode atrasar o fechamento da folha do período.',
      itens: ajustesPendentes.map(
        (s) =>
          `${dataBR(s.data_ponto)} — ${s.tipo_ponto === 'entrada' ? 'Entrada' : 'Saída'}: ${s.hora_original ?? '—'} → ${s.hora_sugerida ?? '—'}${s.motivo ? ` (motivo: ${s.motivo})` : ''}, enviado em ${dataHoraBR(s.created_at)}`
      ),
      severidade: 'media',
    });
  }

  if (tarefasAtrasadas.length > 0) {
    pendencias.push({
      chave: 'onboarding',
      texto: `${tarefasAtrasadas.length} tarefa${plural(tarefasAtrasadas.length, '', 's')} de onboarding atrasada${plural(tarefasAtrasadas.length, '', 's')}`,
      contexto:
        'Tarefas do plano de integração do colaborador que já passaram do prazo sem serem concluídas. O atraso pode travar a liberação de acessos, equipamentos ou benefícios previstos para o período de adaptação.',
      itens: tarefasAtrasadas.map(
        (t) =>
          `${t.titulo ?? 'Tarefa sem título'}${t.categoria ? ` (${t.categoria})` : ''} — prazo era ${dataBR(t.data_prazo)}${sufixoAtraso(t.data_prazo)}`
      ),
      severidade: 'alta',
    });
  }

  if (asosVencidos.length > 0) {
    pendencias.push({
      chave: 'aso',
      texto: `${asosVencidos.length} ASO${plural(asosVencidos.length, '', 's')} vencido${plural(asosVencidos.length, '', 's')}`,
      contexto:
        'Atestado de Saúde Ocupacional com validade expirada. Pela NR-7 (PCMSO), o colaborador não deve permanecer em atividade sem um ASO válido — é preciso agendar um novo exame ocupacional o quanto antes para regularizar e evitar risco trabalhista.',
      itens: asosVencidos.map(
        (a) =>
          `${a.tipo ?? 'ASO'} — validade venceu em ${dataBR(a.data_validade)}${sufixoHa(a.data_validade)}, exame realizado em ${dataBR(a.data_exame)}${a.medico_nome ? ` por ${a.medico_nome}` : ''}${a.clinica ? ` na ${a.clinica}` : ''}`
      ),
      severidade: 'alta',
    });
  }

  if (documentosVencidos.length > 0) {
    pendencias.push({
      chave: 'documentos',
      // A origem (`muri`) montava `pessoal${'is'}` e imprimia "pessoalis":
      // o plural de "pessoal" troca a terminação, não acrescenta sufixo.
      texto: `${documentosVencidos.length} documento${plural(documentosVencidos.length, '', 's')} ${plural(documentosVencidos.length, 'pessoal', 'pessoais')} vencido${plural(documentosVencidos.length, '', 's')}`,
      contexto:
        'Documento pessoal cadastrado com validade expirada. Um documento vencido pode travar processos de compliance, geração de benefícios ou auditorias — vale pedir a atualização ao colaborador o quanto antes.',
      itens: documentosVencidos.map(
        (d) =>
          `${d.tipo_documento ?? 'Documento'}${d.numero ? ` nº ${d.numero}` : ''} — validade venceu em ${dataBR(d.data_validade)}${sufixoHa(d.data_validade)}${d.orgao_emissor ? `, emitido por ${d.orgao_emissor}` : ''}`
      ),
      severidade: 'media',
    });
  }

  return { pendencias, temAlta: pendencias.some((p) => p.severidade === 'alta') };
}
