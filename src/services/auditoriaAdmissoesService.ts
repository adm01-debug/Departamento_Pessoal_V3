/**
 * Trilha de Auditoria de Admissões: lê `public.audit_log` e devolve
 * `EventoAuditoria` — a forma que a aba consome.
 *
 * POR QUE ESTE SERVIÇO EXISTE
 *
 * A camada de apresentação desta aba vinha pronta na PR #546 ("muri", fechada
 * sem merge), mas lá era alimentada por MOCK, e por isso não foi portada: em
 * produção renderizaria lista vazia com filtros bonitos — o mesmo defeito que
 * as PRs #210 e #471 removeram deste sistema. O que faltava era o dado.
 *
 * Agora ele existe:
 *   • `20261119150000` fez a trilha de onboarding passar a ser GRAVADA;
 *   • `20261119160000` deu TENANT (`empresa_id`) à função genérica de auditoria
 *     e abriu LEITURA por empresa para o RH (`audit_log_rh_read_empresa`).
 *
 * O QUE A TRILHA TEM E O QUE ELA NÃO TEM
 *
 * `audit_log` guarda o que ACONTECEU: tabela, registro, ação
 * (INSERT/UPDATE/DELETE), a linha inteira antes e depois em jsonb, quem fez e
 * quando. Ela NÃO guarda semântica de negócio — não existe coluna de "status do
 * evento", nem nome de candidato, nem etapa. Tudo isso é lido de
 * `dados_novos`/`dados_anteriores`, que são a própria linha de `admissoes`.
 *
 * Nada aqui é inventado: campo ausente na trilha vira `null` ou `'—'`, e o
 * evento aparece com o que de fato foi gravado.
 */
import { auditoriaService, type TrilhaAuditoriaRegistro } from './auditoriaService';
import type { EventoAuditoria, EtapaAdmissao, StatusAuditoria } from '@/components/admissoes/auditoriaDerivacoes';

/** Tabelas cuja trilha pertence ao processo admissional. */
export const TABELAS_TRILHA_ADMISSAO = ['admissoes', 'onboarding_colaborador', 'onboarding_tarefas'] as const;

/** Rótulo do evento a partir da ação da trilha, por tabela. */
const TITULO_POR_ACAO: Record<string, Record<string, string>> = {
  admissoes: {
    INSERT: 'Admissão criada',
    UPDATE: 'Admissão atualizada',
    DELETE: 'Admissão removida',
  },
  onboarding_colaborador: {
    INSERT: 'Onboarding iniciado',
    UPDATE: 'Onboarding atualizado',
    DELETE: 'Onboarding removido',
  },
  onboarding_tarefas: {
    INSERT: 'Tarefa de onboarding criada',
    UPDATE: 'Tarefa de onboarding atualizada',
    DELETE: 'Tarefa de onboarding removida',
  },
};

/**
 * A linha da trilha é a que a RPC devolve. ESTA ABA NÃO LÊ `audit_log`
 * DIRETO: `audit_log` é tabela sensível e o contrato do front
 * (`scripts/audit-bridge-frontend-contract.mjs`) exige RPC tenant-scoped.
 * `get_audit_trail` (SECURITY DEFINER, recorte por empresa, limite de 500) é
 * esse caminho, e `auditoriaService.listarTrilha` é quem o chama.
 */
type LinhaAuditoria = TrilhaAuditoriaRegistro;

function texto(fonte: Record<string, unknown> | null, campo: string): string | null {
  const valor = fonte?.[campo];
  return typeof valor === 'string' && valor.trim() !== '' ? valor : null;
}

/**
 * Estado da admissão NO INSTANTE do evento.
 *
 * A trilha não tem status próprio — todo evento nela aconteceu. O que interessa
 * ao RH é em que pé a admissão estava, e isso está na própria linha auditada:
 *
 *   • `falha`    — o eSocial recusou (`status_esocial` erro/rejeitado). É o que
 *                  exige ação e por isso ordena primeiro;
 *   • `pendente` — etapa ainda em curso, ou eSocial pendente/não transmitido;
 *   • `sucesso`  — etapa concluída, ou eSocial com recibo.
 *
 * Sem nenhum dos dois campos (tabelas de onboarding, que não falam eSocial), o
 * evento é `sucesso`: ele aconteceu e foi registrado.
 */
export function statusDoEvento(linha: Record<string, unknown> | null): StatusAuditoria {
  const esocial = (texto(linha, 'status_esocial') ?? '').toLowerCase();
  if (esocial.includes('erro') || esocial.includes('rejeit') || esocial.includes('falh')) return 'falha';

  const etapa = (texto(linha, 'etapa') ?? '').toLowerCase();
  if (etapa === 'cancelada') return 'falha';
  if (etapa === 'concluida') return 'sucesso';

  if (esocial === 'pendente' || esocial === '') {
    // Etapa em curso é pendência de processo; sem etapa (onboarding) não é.
    return etapa === '' ? 'sucesso' : 'pendente';
  }
  return 'sucesso';
}

/** Descrição complementar: o que de fato mudou, segundo a trilha. */
export function detalheDoEvento(linha: LinhaAuditoria): string {
  if (linha.acao === 'INSERT') return 'Registro criado na trilha de auditoria.';
  if (linha.acao === 'DELETE') return 'Registro removido.';
  const campos = (linha.campos_alterados ?? []).filter((c) => c !== 'updated_at');
  if (campos.length === 0) return 'Atualização sem mudança de campo de negócio.';
  return `Campos alterados: ${campos.join(', ')}.`;
}

/** Converte uma linha da trilha no evento que a aba exibe. */
export function mapearEvento(linha: LinhaAuditoria): EventoAuditoria {
  // No DELETE o estado está em `dados_anteriores`; nos outros, em `dados_novos`.
  const estado = linha.acao === 'DELETE' ? linha.dados_anteriores : linha.dados_novos;

  return {
    id: linha.id,
    data_hora: linha.created_at,
    // `admissoes` guarda `nome`; as tabelas de onboarding, `nome_completo`.
    candidato: texto(estado, 'nome') ?? texto(estado, 'nome_completo') ?? '—',
    cargo: texto(estado, 'cargo') ?? '—',
    departamento: texto(estado, 'departamento') ?? '—',
    acao: TITULO_POR_ACAO[linha.tabela ?? '']?.[linha.acao ?? ''] ?? `${linha.tabela ?? '—'}: ${linha.acao ?? '—'}`,
    // Sem etapa na linha (onboarding), cai em 'pendente' do enum — é o valor
    // neutro do processo, e o filtro por etapa continua honesto.
    etapa: (texto(estado, 'etapa') as EtapaAdmissao | null) ?? 'pendente',
    evento_esocial: texto(estado, 'status_esocial'),
    protocolo: texto(estado, 'protocolo_esocial'),
    status: statusDoEvento(estado),
    responsavel: linha.user_nome ?? linha.user_email ?? 'Sistema',
    responsavel_cargo: null,
    detalhe: detalheDoEvento(linha),
  };
}

/**
 * Lê a trilha das tabelas do processo admissional para UMA empresa.
 *
 * O recorte por empresa é da própria RPC (`get_audit_trail` recebe
 * `p_empresa_id`), e não da RLS da tabela: quem lê a tela pode ser admin, que
 * veria tudo pela policy de admin — a aba mostra a empresa ATUAL, não todas.
 *
 * `limite` existe porque a trilha cresce para sempre: a aba é de consulta
 * recente, não de exportação histórica.
 */
export async function listarTrilhaAdmissoes(empresaId: string, limite = 500): Promise<EventoAuditoria[]> {
  const linhas = await auditoriaService.listarTrilha({
    empresa_id: empresaId,
    tabelas: [...TABELAS_TRILHA_ADMISSAO],
    limite,
  });
  return linhas.map(mapearEvento);
}
