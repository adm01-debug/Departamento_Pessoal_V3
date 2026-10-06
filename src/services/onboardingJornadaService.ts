/**
 * DOMÍNIO CANÔNICO DO ONBOARDING — MODELO A (Jornada de Onboarding).
 *
 * Por que este arquivo existe: a Jornada espalhava `supabase.from(...)` dentro
 * da PÁGINA (o mesmo antes na aba antiga de Admissões). Agora existe UMA camada
 * de domínio: a página só consome hooks/`onboardingJornadaService`.
 *
 * ⚠️ NÃO é um segundo service concorrente: `onboardingService` (em
 * `services/tabelas/rhService.ts`) pertence ao MODELO B (colaborador-cêntrico:
 * `onboarding_colaborador`/`onboarding_tarefas`) e está DEPRECATED — a
 * convergência dos consumidores de leitura está no adapter
 * `buscarJornadaDoColaborador()`, que lê daqui.
 *
 * MODELO CANÔNICO (única operação real):
 *   public.admissoes  ─1:N─  public.tarefas_onboarding
 *   public.onboarding_kits        (perfis de kit, auxiliar da jornada)
 *   public.profiles               (RESPONSÁVEL: `responsavel_id` → nome)
 *
 * RESPONSÁVEL (correção definitiva): `tarefas_onboarding` NÃO tem
 * `responsavel_nome` — tem `responsavel_id UUID`. O nome é resolvido AQUI, por
 * consulta a `profiles` (`user_id` → `nome`), e devolvido como
 * `responsavel_nome` só em MEMÓRIA. Nenhuma coluna nova, nenhum dado duplicado.
 * Cadeia de fallback: `profiles.nome` → `admissoes.metadata.responsavel` →
 * "Não atribuído" (na derivação, não aqui).
 *
 * ORDENAÇÃO DETERMINÍSTICA: a relação embutida do PostgREST não garante ordem,
 * então cada leitura passa por `ordenarTarefas()` (prazo → `created_at` → `id`).
 * A MESMA ordem alimenta card, detalhe, filtros e risco.
 */
import { supabase } from '@/integrations/supabase/client';
import { formatDateLocalISO } from '@/utils/dateLocal';
import {
  ordenarTarefas,
  prazoDaTarefa,
  type ColaboradorOnboarding,
  type TarefaOnboarding,
} from '@/components/admissoes/onboardingDerivacoes';

/** Perfil de kit da tabela real `public.onboarding_kits` (`itens` é JSONB). */
export interface KitOnboarding {
  id: string;
  nome: string;
  itens: string[];
  ativo: boolean;
  /**
   * Criado em (ISO, `onboarding_kits.created_at`). Usado SOMENTE pela ordenação
   * "Mais recentes" da grade — nenhuma regra de negócio depende dele.
   */
  created_at?: string | null;
  /**
   * Imagem do kit (URL pronta para `<img src>`).
   *
   * ⚠️ RESERVADO — **não persistido**: `public.onboarding_kits` ainda NÃO tem
   * coluna de imagem (nenhuma migration foi criada). Este campo NUNCA vem do
   * banco hoje; ele é preenchido apenas pelo overlay de SESSÃO da tela
   * (`OnboardingPage`), para a grade conseguir exibir a imagem recém-selecionada
   * sem fingir que foi gravada. Quando o schema for evoluído (autorização
   * separada), basta a coluna existir e este mesmo campo passa a vir de lá.
   */
  imagem_url?: string | null;
}

/** Assinatura de gravação de kit (a tela fornece os itens já limpos). */
export interface KitOnboardingInput {
  nome: string;
  itens: string[];
  ativo?: boolean;
  /**
   * Imagem do kit. O serviço **IGNORA** este campo de propósito: não existe
   * coluna para gravá-lo, então nada é enviado ao banco (nenhuma persistência
   * falsa). Ele existe só para o contrato do diálogo já ficar pronto para o
   * dia em que a persistência for autorizada.
   */
  imagem_url?: string | null;
}

/** Colunas REALMENTE lidas do banco — sem imagem (a coluna ainda não existe). */
const COLUNAS_KIT = 'id, nome, itens, ativo, created_at';

/** `itens` é JSONB: normaliza para lista de textos (nunca lança). */
function itensDoKit(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((item): item is string => typeof item === 'string') : [];
}

function kitDaLinha(linha: {
  id: unknown;
  nome: unknown;
  itens: unknown;
  ativo: unknown;
  created_at?: unknown;
  /** Ausente no select atual (sem coluna no banco) — lido só se um dia existir. */
  imagem_url?: unknown;
}): KitOnboarding {
  return {
    id: String(linha.id),
    nome: typeof linha.nome === 'string' && linha.nome.trim() ? linha.nome : 'Perfil de Kit',
    itens: itensDoKit(linha.itens),
    ativo: linha.ativo !== false,
    created_at: typeof linha.created_at === 'string' ? linha.created_at : null,
    imagem_url: typeof linha.imagem_url === 'string' ? linha.imagem_url : null,
  };
}

/**
 * Resolve `responsavel_id` (auth.users.id) → nome, usando a tabela REAL de
 * perfis do projeto (`public.profiles.user_id → public.profiles.nome`).
 *
 * NÃO usa `auth.users` (inacessível ao cliente) e NÃO grava nada. Ids ausentes,
 * desconhecidos ou nulos simplesmente não entram no mapa — a derivação faz o
 * fallback para `metadata.responsavel` e, por último, "Não atribuído".
 */
export async function resolverResponsaveis(ids: (string | null | undefined)[]): Promise<Map<string, string>> {
  const unicos = [...new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0))];
  const mapa = new Map<string, string>();
  if (unicos.length === 0) return mapa;

  const { data, error } = await supabase.from('profiles').select('user_id, nome').in('user_id', unicos);
  if (error) throw error;
  (data ?? []).forEach((perfil) => {
    if (perfil.user_id && perfil.nome) mapa.set(perfil.user_id, perfil.nome);
  });
  return mapa;
}

/**
 * Anota `responsavel_nome` em cada tarefa (em memória) a partir de
 * `responsavel_id`. Devolve a MESMA lista já com as tarefas ORDENADAS.
 */
function comResponsaveis(
  lista: ColaboradorOnboarding[],
  mapa: Map<string, string>,
): ColaboradorOnboarding[] {
  return lista.map((colaborador) => {
    const tarefas: TarefaOnboarding[] = (colaborador.tarefas ?? []).map((tarefa) => ({
      ...tarefa,
      responsavel_nome: tarefa.responsavel_id ? mapa.get(tarefa.responsavel_id) ?? null : null,
    }));
    return { ...colaborador, tarefas: ordenarTarefas(tarefas) };
  });
}

/**
 * LISTAR JORNADAS — a leitura canônica: todas as admissões com suas tarefas de
 * onboarding, já ordenadas e com o responsável resolvido.
 */
export async function listarJornadas(): Promise<ColaboradorOnboarding[]> {
  const { data, error } = await supabase
    .from('admissoes')
    .select(
      `
      *,
      tarefas:tarefas_onboarding(*)
    `,
    )
    .order('created_at', { ascending: false });
  if (error) throw error;

  const lista = (data ?? []) as unknown as ColaboradorOnboarding[];
  const mapa = await resolverResponsaveis(
    lista.flatMap((colaborador) => (colaborador.tarefas ?? []).map((tarefa) => tarefa.responsavel_id)),
  );
  return comResponsaveis(lista, mapa);
}

/** CONCLUIR TAREFA — a única mutation real do domínio. */
export async function concluirTarefa(tarefaId: string): Promise<void> {
  const { error } = await supabase
    .from('tarefas_onboarding')
    .update({ concluida: true, concluida_em: new Date().toISOString() })
    .eq('id', tarefaId);
  if (error) throw error;
}

/**
 * LISTAR KITS — perfis de kit da tabela real. `incluirInativos` é o modo do
 * gerenciador (permite reativar); a grade pública usa só os ativos.
 *
 * ⚠️ Diferente de "lista vazia": um erro de query/permissão LANÇA (a tela mostra
 * estado de ERRO explícito — nunca "nenhum kit cadastrado").
 */
export async function listarKits(incluirInativos = false): Promise<KitOnboarding[]> {
  let query = supabase.from('onboarding_kits').select(COLUNAS_KIT).order('nome');
  if (!incluirInativos) query = query.eq('ativo', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(kitDaLinha);
}

/** CRIAR PERFIL DE KIT — `empresa_id` é NOT NULL na tabela.
 *
 * NOTA: `entrada.imagem_url` é deliberadamente IGNORADO — não existe coluna de
 * imagem, então nada é gravado (sem persistência falsa). */
export async function criarKit(empresaId: string, entrada: KitOnboardingInput): Promise<KitOnboarding> {
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
  const { data, error } = await supabase
    .from('onboarding_kits')
    .insert({ empresa_id: empresaId, nome: entrada.nome, itens: entrada.itens, ativo: entrada.ativo ?? true })
    .select(COLUNAS_KIT)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Não foi possível criar o perfil de kit.');
  return kitDaLinha(data);
}

/** ATUALIZAR PERFIL DE KIT — nome, itens e status ativo/inativo.
 *
 * NOTA: `entrada.imagem_url` é deliberadamente IGNORADO (sem coluna de imagem). */
export async function atualizarKit(id: string, entrada: KitOnboardingInput): Promise<KitOnboarding> {
  const { data, error } = await supabase
    .from('onboarding_kits')
    .update({
      nome: entrada.nome,
      itens: entrada.itens,
      ...(entrada.ativo === undefined ? {} : { ativo: entrada.ativo }),
    })
    .eq('id', id)
    .select(COLUNAS_KIT)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Perfil de kit não encontrado.');
  return kitDaLinha(data);
}

/** Alterna ativo/inativo sem passar pelo formulário. */
export async function definirAtivoKit(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase.from('onboarding_kits').update({ ativo }).eq('id', id);
  if (error) throw error;
}


/* ─── ADAPTER: MODELO A → CONSUMIDORES DO DOSSIÊ (FASE 9.3) ──────────────────
 *
 * O dossiê do colaborador ("Desenvolvimento" + "Histórico") lia o MODELO B
 * (`onboarding_colaborador` / `onboarding_tarefas`). Estes dois leitores trazem
 * os MESMOS dados do MODELO CANÔNICO, no formato que os consumidores já
 * esperam — nenhuma segunda arquitetura, nenhum dual write.
 *
 * VÍNCULO: `admissoes` NÃO tem `colaborador_id`; a chave natural entre os dois
 * mundos é o **CPF** (`admissoes.cpf` ↔ `colaboradores.cpf`).
 */

/** Tarefa no formato que o dossiê já consome (`data_prazo`/`data_conclusao` ISO). */
export interface TarefaJornadaCompat {
  id: string;
  titulo: string;
  concluida: boolean;
  data_conclusao?: string;
  data_prazo?: string;
}

/** Registro de jornada no formato que o dossiê já consome. */
export interface JornadaCompat {
  /** Id da ADMISSÃO — é o `onboardingId` usado pelos consumidores. */
  id: string;
  titulo?: string;
  /** De onde o registro veio (o hook decide o fallback das tarefas). */
  fonte: 'jornada' | 'legado';
  /** Início da jornada (`admissoes.created_at`) — usado pelos eventos do histórico. */
  data_inicio?: string;
}

/** Evento legível da jornada para o Histórico do Colaborador. */
export interface EventoJornada {
  id: string;
  date: string;
  title: string;
  description?: string;
  source: 'jornada_onboarding';
}

/**
 * EVENTOS LEGÍVEIS DA JORNADA (FASE 10) — DERIVADOS dos dados reais, nunca
 * gravados de novo: "1 ação de negócio = 1 evento lógico".
 *
 *   • jornada iniciada  → `data_inicio` (o INSERT da admissão já é auditado por
 *                         `audit_admissoes`; aqui só se LÊ o fato);
 *   • tarefa concluída  → cada tarefa com `data_conclusao`;
 *   • jornada concluída → DERIVADA quando TODAS as tarefas estão concluídas
 *                         (nenhuma escrita extra: seria o mesmo fato contado duas
 *                         vezes se também fosse logada).
 *
 * A trilha TÉCNICA (campo a campo, com autor) continua em `public.audit_log` —
 * agora inclusive para `tarefas_onboarding`, via a migration
 * `20261005010000_onboarding_audit_trigger.sql`.
 */
export function eventosLegiveisDaJornada(
  registro: JornadaCompat | null | undefined,
  tarefas: TarefaJornadaCompat[] | undefined,
): EventoJornada[] {
  if (!registro?.id) return [];
  const lista = tarefas ?? [];
  const eventos: EventoJornada[] = [];

  if (registro.data_inicio) {
    eventos.push({
      id: `jornada-inicio-${registro.id}`,
      date: registro.data_inicio,
      title: 'Onboarding: jornada iniciada',
      description: registro.titulo ? `Integração de ${registro.titulo}` : undefined,
      source: 'jornada_onboarding',
    });
  }

  lista.forEach((tarefa) => {
    if (!tarefa.concluida || !tarefa.data_conclusao) return;
    eventos.push({
      id: `jornada-tarefa-${tarefa.id}`,
      date: tarefa.data_conclusao,
      title: `Onboarding: ${tarefa.titulo}`,
      description: 'Tarefa de integração concluída',
      source: 'jornada_onboarding',
    });
  });

  const concluidas = lista.filter((t) => t.concluida && t.data_conclusao);
  if (lista.length > 0 && concluidas.length === lista.length) {
    const ultima = concluidas.map((t) => t.data_conclusao!).sort().at(-1)!;
    eventos.push({
      id: `jornada-fim-${registro.id}`,
      date: ultima,
      title: 'Onboarding: jornada concluída',
      description: '100% das tarefas de integração concluídas',
      source: 'jornada_onboarding',
    });
  }

  return eventos;
}

/** `Date` → `YYYY-MM-DD` no fuso LOCAL (o dossiê compara strings de data). */
function dataIso(data: Date | null): string | undefined {
  if (!data || Number.isNaN(data.getTime())) return undefined;
  return formatDateLocalISO(data);
}

/**
 * Busca a jornada canônica de UM colaborador (pelo CPF) e devolve o registro no
 * formato do dossiê. `null` quando o colaborador não tem admissão localizável —
 * cabe ao chamador decidir o fallback (nota de compatibilidade).
 */
export async function buscarJornadaDoColaborador(colaboradorId: string): Promise<JornadaCompat | null> {
  const { data: colaborador, error: erroColaborador } = await supabase
    .from('colaboradores')
    .select('cpf')
    .eq('id', colaboradorId)
    .maybeSingle();
  if (erroColaborador) throw erroColaborador;
  const cpf = colaborador?.cpf?.trim();
  if (!cpf) return null;

  const { data, error } = await supabase
    .from('admissoes')
    .select('id, nome, created_at')
    .eq('cpf', cpf)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;

  const admissao = (data ?? [])[0];
  if (!admissao) return null;
  return {
    id: String(admissao.id),
    titulo: admissao.nome ?? undefined,
    fonte: 'jornada',
    data_inicio: admissao.created_at ? admissao.created_at.slice(0, 10) : undefined,
  };
}

/**
 * Tarefas da jornada (por id de ADMISSÃO) no formato do dossiê: mesma ordem
 * determinística (`ordenarTarefas`) e o prazo calculado (`created_at +
 * prazo_dias`), que é o campo comparado pelo dossiê para "atrasada".
 */
export async function listarTarefasDaAdmissao(admissaoId: string): Promise<TarefaJornadaCompat[]> {
  const { data, error } = await supabase
    .from('tarefas_onboarding')
    .select('id, titulo, concluida, concluida_em, prazo_dias, created_at')
    .eq('admissao_id', admissaoId);
  if (error) throw error;

  const tarefas = (data ?? []) as unknown as TarefaOnboarding[];
  return ordenarTarefas(tarefas).map((tarefa) => ({
    id: String(tarefa.id),
    titulo: tarefa.titulo ?? 'Tarefa de integração',
    concluida: tarefa.concluida === true,
    data_conclusao: dataValidaIso(tarefa.concluida_em),
    data_prazo: dataIso(prazoDaTarefa(tarefa)),
  }));
}

/** `concluida_em` (timestamp) → `YYYY-MM-DD`, tolerante a nulo/inválido. */
function dataValidaIso(valor?: string | null): string | undefined {
  if (!valor) return undefined;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? undefined : formatDateLocalISO(data);
}

