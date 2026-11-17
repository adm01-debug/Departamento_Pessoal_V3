/**
 * ============================================================================
 * TRILHA DE AUDITORIA — aba "Trilha de Auditoria" do módulo de Desligamentos.
 *
 * REDESENHO: a área era UM card alto com um punhado de eventos e o payload cru
 * (`<pre>{JSON.stringify(...)}</pre>`) como conteúdo principal. Agora é um painel
 * de conformidade, na mesma leitura de cima para baixo da referência da tela:
 *
 *   1. CABEÇALHO — FAIXA 1 em DOIS blocos, como a referência: informações
 *      (ícone + título + descrição + contagem real de eventos/dias) · controles
 *      principais à direita, na MESMA linha — período De/Até, busca e "Exportar
 *      Trilha" imediatamente à direita da busca. "Mais filtros" NÃO fica aqui:
 *      ele fecha a faixa de filtros (depois de "Todos os níveis"), e "Limpar"
 *      não faz parte do cabeçalho (segue disponível no estado vazio).
 *   2. CHIPS     — FAIXA 2: UMA barra horizontal única, que NUNCA quebra: os seis
 *      atalhos por categoria COM contador (`FilterChip` compartilhado, o mesmo
 *      da Auditoria de Admissões e da Jornada de Onboarding) seguidos, colados
 *      na MESMA linha, dos seletores "Todos os usuários" e "Todos os níveis" e do
 *      botão "Mais filtros". O painel de filtros avançados abre LOGO ABAIXO da
 *      barra (fluxo normal do DOM, altura animada em 400ms), empurrando a
 *      timeline. Faltando largura, a barra rola por dentro.
 *   3. TIMELINE  — agrupada por DIA ("Hoje", "Ontem", "07 de outubro de 2026"),
 *      com trilho vertical, horário e marcador colorido por categoria.
 *   4. EVENTO    — REGISTRO em superfície própria, numa GRADE analítica de CINCO
 *      colunas fixas: (B) ícone + título + descrição · (C) autor (avatar + nome +
 *      e-mail + origem) · (D) metadado principal · (E) metadado complementar ·
 *      (F) selo de resultado + botão "Ver detalhes". TODAS as linhas usam a MESMA
 *      grade (`COLUNAS_RELATORIO`), então as colunas ficam alinhadas de evento a
 *      evento mesmo quando o selo ou um dos metadados de um deles não existe.
 *
 * DADOS: nenhuma query nova e nenhuma regra nova. A trilha vem do `audit_log`
 * (`tabela = 'desligamentos'`), com o MESMO mock de layout da tela anterior
 * (ver `src/mocks/desligamentosMock.ts`) e a MESMA chave de cache
 * (`['ponto-audit-logs', tabela]`), para a assinatura em tempo real continuar
 * invalidando os dois consumidores. TODA leitura — resumo, filtro, ordenação,
 * agrupamento, título, descrição, metadados, categoria e nível — vem de
 * `trilhaDerivacoes.ts`; ícones e tintas vêm de `trilhaComum.ts`.
 *
 * O PAYLOAD TÉCNICO não é mais conteúdo principal: a linha mostra o resumo
 * humano e o JSON completo fica no "Ver detalhes" (com "Copiar dados"), que é
 * onde um auditor o procura.
 *
 * RESPONSIVIDADE: o cabeçalho é um GRID de DUAS colunas — INFORMAÇÕES
 * (`minmax(430px,1fr)`: ícone + título + descrição + metadados, com PISO de
 * largura para a descrição nunca quebrar) e CONTROLES (`auto`: período + busca
 * + "Exportar Trilha"). A troca entre "mesma linha × empilhado" é decidida pela
 * largura REAL do card (`@container`, não a viewport: com a navegação lateral
 * aberta o card é bem mais estreito que a tela). As colunas do grid não se
 * sobrepõem em nenhuma largura: faltando espaço, o grupo de controles INTEIRO
 * desce para a segunda linha e o par busca + "Exportar Trilha" viaja junto. Na
 * FAIXA 2 não existe quebra: é `flex-nowrap` com grupos content-sized e, quando
 * a soma dos nove controles não cabe na largura útil do card, quem rola é só a
 * barra (`overflow-x-auto` + `.scroll-interno`), nunca a página. As colunas da
 * linha do evento vêm de `COLUNAS_RELATORIO`, com o mesmo critério.
 * ============================================================================
 */
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowRightLeft,
  Braces,
  Building2,
  CalendarDays,
  ChevronDown,
  Copy,
  Download,
  Fingerprint,
  History,
  Inbox,
  Search,
  SlidersHorizontal,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MotionCard, entradaCard, EntradaPresenca } from './entradaCards';
import { DatePicker } from '@/components/ui/date-picker';
import { EmptyState } from '@/components/ui/empty-state';
import { FilterChip } from '@/components/ui/filter-chip';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AnimatedCascadeDialog } from '@/components/ui/animated-cascade-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks/useEmpresas';
import { cn } from '@/lib/utils';
import { exportPontoCSV } from '@/services/exportService';
// MOCK VISUAL — ver src/mocks/desligamentosMock.ts (dev + VITE_DESLIGAMENTOS_MOCK=true).
import { getMockTrilhaAuditoriaDesligamentos, isDesligamentosMockEnabled } from '@/mocks/desligamentosMock';
import {
  acaoTrilhaMeta,
  CATEGORIA_POR_CHAVE,
  CATEGORIAS_TRILHA,
  NIVEIS_TRILHA,
  rotuloRecurso,
  tintaAvatar,
  type CategoriaTrilha,
  type NivelTrilha,
} from './trilhaComum';
import { inicioDoDia } from './desligamentosDerivacoes';
import {
  acoesDaTrilha,
  agruparPorDia,
  alteracoesDoEvento,
  categoriaDoEvento,
  descricaoDoEvento,
  filtrarTrilha,
  formatarDataHora,
  formatarHora,
  iniciaisDoAutor,
  metadadosDoEvento,
  nivelDoEvento,
  normalizarEvento,
  origemDoAutor,
  resultadoDoEvento,
  resumoTrilha,
  responsavelDoEvento,
  textoDoEvento,
  tituloDoEvento,
  usuariosDaTrilha,
  type EventoTrilha,
  type MetaTrilha,
  type ResponsavelTrilha,
  type ResultadoTrilha,
  type TrilhaLinhaCrua,
} from './trilhaDerivacoes';
import { TRILHA_EASE, TRILHA_SAIDA_DURACAO, coordenarTrilhaPorGrupo, trilhaRevealVariants } from './trilhaReveal';

interface TrilhaAuditoriaProps {
  /** Entidade auditada — o módulo passa `desligamentos`. */
  tabela?: string;
}

/**
 * GRADE ANALÍTICA DO REGISTRO — as CINCO colunas à direita do trilho:
 *   B evento · C responsável · D metadado principal · E metadado complementar ·
 *   F ações.
 *
 * TODAS as linhas usam exatamente esta grade, com os trilhos em `fr`, então o
 * alinhamento é idêntico de linha para linha independentemente do conteúdo. Na
 * versão anterior a última coluna era `auto` (content-sized): o selo de resultado
 * presente num evento e ausente no seguinte redimensionava esse trilho e
 * redistribuía os `fr` de CADA linha — era a origem do desalinhamento entre
 * eventos. Ao trocar o `auto` por `fr`, o trilho passa a ter a mesma largura em
 * todas as linhas.
 *
 * As QUATRO primeiras colunas seguem `minmax(0, …fr)`: faltando espaço, o texto
 * quebra DENTRO da célula em vez de estourar o container. A quinta — F, AÇÕES —
 * é a EXCEÇÃO e ganha um piso (`minmax(228px, 1.5fr)`): ela agora é um par
 * indivisível (selo + botão, ver `AcaoEvento`) e precisa de largura para o MAIOR
 * selo ("Concluído") ao lado do botão "Ver detalhes" sem comprimir nem cortar
 * nenhum dos dois. Como os outros trilhos têm mínimo 0, o piso da coluna F é
 * absorvido por eles (encolhem na proporção do `fr`) — o ajuste é proporcional e
 * não invade as demais colunas. Abaixo de `xl` a grade vira DUAS colunas — evento
 * e responsável ocupam a linha inteira, os dois metadados ficam lado a lado e a
 * ação fecha em linha própria —, que é o empilhamento pedido para
 * tablet/mobile; a timeline (coluna do trilho) continua ao lado em qualquer
 * largura.
 */
const COLUNAS_RELATORIO =
  'grid grid-cols-2 gap-x-4 gap-y-3 ' +
  'xl:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1.05fr)_minmax(0,1.05fr)_minmax(228px,1.5fr)] ' +
  'xl:items-start xl:gap-x-5 xl:gap-y-0';

/**
 * SUPERFÍCIE DO REGISTRO — o "card" discreto de cada evento (colunas B–F), um
 * degrau mais escuro que o painel (`--background` sobre `--card`), com a borda
 * azul-acinzentada sutil do token `--border` e raio de 12px.
 *
 * HOVER: escurece a superfície para `bg-background/70` — a MESMA régua de
 * `AdmissoesDashboard.tsx`, porque o `--muted` do tema é mais CLARO que o card e
 * ACENDERIA a linha — e realça a borda discretamente. Sem deslocamento nem
 * escala no card; transição de 220ms/ease-in-out só das propriedades visuais
 * (`background-color`/`border-color`, via `transition-colors`).
 */
const SUPERFICIE_LINHA =
  'rounded-lg border border-border/30 bg-background/40 ' +
  'transition-colors duration-[220ms] ease-in-out ' +
  'group-hover:border-border/60 group-hover:bg-background/70';

/**
 * TRANSIÇÃO DOS SEIS CHIPS DE CATEGORIA — 350ms com a curva
 * `cubic-bezier(0.22, 1, 0.36, 1)` (a mesma `REVEAL_OPEN_EASE` das expansões).
 *
 * O chip é a peça COMPARTILHADA `FilterChip` (usada por Admissões e Onboarding),
 * então a transição NÃO pode ser trocada dentro dela — isso mexeria em telas de
 * outros módulos. A alça fica no CONTÊINER dos chips: os variantes de
 * descendente (`[&_button]`, `[&_span]`) têm especificidade maior que a classe
 * `transition-colors` do próprio botão e vencem SÓ para os seis chips da trilha,
 * sem tocar em geometria, cor, tipografia ou contador. O botão já anima
 * `background-color`/`border-color`/`color` (via `transition-colors`); aos
 * `span` (pontinho e contador) acrescentamos o mesmo par de propriedades para o
 * destaque verde-lima acompanhar a troca sem piscar.
 */
const TRANSICAO_CHIPS_TRILHA =
  '[&_button]:duration-[350ms] [&_button]:ease-[cubic-bezier(0.22,1,0.36,1)] ' +
  '[&_span]:transition-colors [&_span]:duration-[350ms] [&_span]:ease-[cubic-bezier(0.22,1,0.36,1)]';

/**
 * CHAVE ESTÁVEL de um evento — NÃO depende da posição na lista. O `id` do
 * `audit_log` sempre existe (mock e dado real); o fallback cobre só a linha
 * antiga sem `id`, e ainda assim é estável entre filtros — o que o índice no
 * `key` de antes não era. É a chave do React E a régua da coordenação sair→entrar.
 */
function chaveEvento(evento: EventoTrilha): string {
  return evento.id || `${evento.criadoEm}|${evento.acao ?? ''}|${evento.registroId ?? ''}|${evento.userEmail ?? ''}`;
}

/** Trilha de Auditoria do módulo de Desligamentos. */
export function TrilhaAuditoriaDesligamentos({ tabela = 'desligamentos' }: TrilhaAuditoriaProps) {
  const { empresaAtual } = useEmpresas();
  const queryClient = useQueryClient();

  // MOCK VISUAL — ver src/mocks/desligamentosMock.ts. Vale SÓ para a trilha de
  // desligamentos: quando desligado, a tela segue para a consulta real.
  const mockAtivo = isDesligamentosMockEnabled();
  const habilitado = !!empresaAtual?.id || mockAtivo;

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['ponto-audit-logs', tabela],
    queryFn: async () => {
      if (mockAtivo) {
        const mockLogs = getMockTrilhaAuditoriaDesligamentos();
        if (mockLogs) return mockLogs;
      }
      try {
        const { data, error: queryError } = await (supabase as any)
          .from('audit_log')
          .select('*')
          .eq('tabela', tabela)
          .order('created_at', { ascending: false })
          .limit(200);
        if (queryError) {
          console.warn('[TrilhaAuditoriaDesligamentos] audit_log access denied:', queryError.message);
          return [];
        }
        return data || [];
      } catch (e) {
        console.warn(
          '[TrilhaAuditoriaDesligamentos] audit_log query failed:',
          e instanceof Error ? e.message : String(e)
        );
        return [];
      }
    },
    enabled: habilitado,
  });

  // Assinatura de tempo real do `audit_log`: um evento novo revalida a trilha.
  useEffect(() => {
    if (!empresaAtual?.id) return;
    const channel = (supabase as any)
      .channel('audit-changes-desligamentos')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_log' }, () => {
        queryClient.invalidateQueries({ queryKey: ['ponto-audit-logs'] });
      })
      .subscribe();
    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, [queryClient, empresaAtual?.id]);

  // LEITURA opcional do cadastro real (`profiles`) para resolver `user_id →
  // nome`. Degrada em silêncio: sem permissão, o e-mail do log é o nome.
  const { data: perfis } = useQuery({
    queryKey: ['auditoria-perfis'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('user_id, nome');
      if (error) throw error;
      return data ?? [];
    },
    enabled: habilitado && !mockAtivo,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const nomePorId = useMemo(() => {
    const mapa = new Map<string, string>();
    (perfis ?? []).forEach((perfil: { user_id?: string | null; nome?: string | null }) => {
      if (perfil?.user_id && perfil?.nome) mapa.set(perfil.user_id, perfil.nome);
    });
    return mapa;
  }, [perfis]);

  /* ─── Filtros ───────────────────────────────────────────────────────────── */
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState<CategoriaTrilha | 'todos'>('todos');
  const [usuario, setUsuario] = useState('todos');
  const [nivel, setNivel] = useState<NivelTrilha | 'todos'>('todos');
  const [acaoSelecionada, setAcaoSelecionada] = useState('todas');
  const [registro, setRegistro] = useState('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [painelAberto, setPainelAberto] = useState(false);
  const [detalhe, setDetalhe] = useState<EventoTrilha | null>(null);

  const hojeMs = useMemo(() => inicioDoDia(new Date()), []);

  const eventos = useMemo(() => (logs as TrilhaLinhaCrua[]).map((linha) => normalizarEvento(linha)), [logs]);
  const resumo = useMemo(() => resumoTrilha(eventos), [eventos]);
  const usuarios = useMemo(() => usuariosDaTrilha(eventos, nomePorId), [eventos, nomePorId]);
  const acoesDisponiveis = useMemo(() => acoesDaTrilha(eventos), [eventos]);

  const filtros = useMemo(
    () => ({ busca, categoria, usuario, nivel, acao: acaoSelecionada, registro, de, ate }),
    [busca, categoria, usuario, nivel, acaoSelecionada, registro, de, ate]
  );
  const filtrados = useMemo(() => filtrarTrilha(eventos, filtros, nomePorId), [eventos, filtros, nomePorId]);
  const grupos = useMemo(() => agruparPorDia(filtrados, hojeMs), [filtrados, hojeMs]);

  /**
   * COORDENAÇÃO SAIR→ENTRAR — por TEMPO, não por `mode="wait"`.
   *
   * O `mode="wait"` do `AnimatePresence` só foi desenhado para UM filho: com
   * vários (a lista de eventos de um dia), a própria lib avisa e, pior, desmonta
   * os que PERMANECEM e os reanima — a piscada que não pode existir. Então a
   * ordem sai do TEMPO: quando o filtro ativo EXCLUI eventos de um dia, a cascata
   * daquele dia só começa DEPOIS da saída (`TRILHA_SAIDA_DURACAO`); quando o dia
   * não perde nada (filtro "Todos", troca que só amplia, ou a 1ª carga), começa
   * na hora, sem espera artificial.
   *
   * `totalPorDia` é quantos eventos cada dia tem no conjunto COMPLETO (`eventos`,
   * antes do filtro). Se o dia mostra menos do que tem, alguma coisa ficou de
   * fora — e o degrau da saída entra na frente da onda. Determinístico e sem
   * estado extra: a mesma seleção de filtros devolve sempre o mesmo ritmo, e só
   * espera quem de fato tem evento saindo.
   *
   * COORDENADOR da entrada, POR GRUPO (ver `trilhaReveal.ts`): cada dia tem a
   * PRÓPRIA onda — o cabeçalho abre primeiro (posição 0) e os eventos daquele dia
   * entram em cascata logo depois (posições 1..n). A contagem REINICIA a cada
   * grupo, então "Ontem" não espera a fila de "Hoje" terminar e uma trilha longa
   * nunca vira uma espera. Os atrasos saem de `coordenarTrilhaPorGrupo` (função
   * pura) e só os dias com evento excluído somam a saída na base. Nenhum
   * `setTimeout` é criado — quem espera é a transição do Framer de cada bloco.
   */
  const totalPorDia = useMemo(() => {
    const mapa = new Map<number, number>();
    agruparPorDia(eventos, hojeMs).forEach((grupo) => mapa.set(grupo.diaMs, grupo.eventos.length));
    return mapa;
  }, [eventos, hojeMs]);
  const onda = useMemo(() => {
    const atrasos = coordenarTrilhaPorGrupo(grupos.map((grupo) => grupo.eventos.length));
    const porEvento = new Map<EventoTrilha, number>();
    const porDia = new Map<number, number>();
    grupos.forEach((grupo, indiceGrupo) => {
      const total = totalPorDia.get(grupo.diaMs) ?? grupo.eventos.length;
      const base = total > grupo.eventos.length ? TRILHA_SAIDA_DURACAO : 0;
      const fila = atrasos[indiceGrupo] ?? [0];
      porDia.set(grupo.diaMs, (fila[0] ?? 0) + base);
      grupo.eventos.forEach((evento, indiceEvento) => {
        porEvento.set(evento, (fila[indiceEvento + 1] ?? 0) + base);
      });
    });
    return { porEvento, porDia };
  }, [grupos, totalPorDia]);

  const temFiltro =
    busca.trim().length > 0 ||
    categoria !== 'todos' ||
    usuario !== 'todos' ||
    nivel !== 'todos' ||
    acaoSelecionada !== 'todas' ||
    registro.trim().length > 0 ||
    !!de ||
    !!ate;

  const limparFiltros = () => {
    setBusca('');
    setCategoria('todos');
    setUsuario('todos');
    setNivel('todos');
    setAcaoSelecionada('todas');
    setRegistro('');
    setDe('');
    setAte('');
  };

  /** Exportação real da trilha FILTRADA (CSV, reusando o exportador do produto). */
  const handleExportar = () => {
    if (filtrados.length === 0) {
      toast.info('Nada para exportar: nenhum evento com os filtros atuais.');
      return;
    }
    try {
      exportPontoCSV(
        filtrados.map((evento) => {
          const responsavel = responsavelDoEvento(evento, nomePorId);
          return {
            data_hora: formatarDataHora(evento.criadoEm),
            evento: tituloDoEvento(evento),
            categoria: CATEGORIA_POR_CHAVE[categoriaDoEvento(evento)].label,
            nivel: nivelDoEvento(evento),
            usuario: responsavel.nome,
            email: evento.userEmail ?? '',
            acao: evento.acao ?? '',
            entidade: evento.tabela ?? '',
            registro_id: evento.registroId ?? '',
          };
        }),
        'trilha-auditoria-desligamentos.csv'
      );
      toast.success(`${filtrados.length} evento(s) exportado(s).`);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : 'Falha ao exportar a trilha.');
    }
  };

  const copiarEvento = async (evento: EventoTrilha) => {
    try {
      await navigator.clipboard.writeText(textoDoEvento(evento));
      toast.success('Dados do evento copiados.');
    } catch {
      toast.error('Não foi possível copiar os dados do evento.');
    }
  };

  /* ─── Sem empresa: a trilha é sempre de um escopo ───────────────────────── */
  if (!habilitado) {
    return (
      <EntradaPresenca>
        <MotionCard {...entradaCard(0)} className="overflow-hidden rounded-2xl border border-border/30 shadow-elevated">
          <div className="h-[2px] bg-gradient-to-r from-primary to-primary-glow" />
          <EmptyState
            icon={Building2}
            title="Selecione uma empresa"
            description="A trilha de auditoria é registrada por empresa — escolha uma para ver os eventos."
          />
        </MotionCard>
      </EntradaPresenca>
    );
  }

  return (
    <>
      {/* Painel principal da trilha: o `Card` de sempre, agora SEM entrada
          própria. O movimento de entrada desta aba é UM só — a expansão
          coordenada dos dias e dos eventos (ver `trilhaReveal.ts`) —, na mesma
          leitura do Organograma, onde a árvore não anima por fora: quem abre são
          os blocos. Deixar o container deslizando enquanto os eventos se abrem
          seria uma segunda animação ao mesmo tempo, competindo com a revelação
          (o oposto do que o ajuste veio fazer). `EntradaPresenca` continua: é
          ela que devolve o keyframe inicial que o `initial={false}` do
          `PageTransition` bloqueia — sem ela o `initial="collapsed"` dos blocos
          seria pulado e nada se expandiria. */}
      <EntradaPresenca>
        <Card className="@container overflow-hidden rounded-2xl border border-border/30 shadow-elevated">
          <div className="h-[2px] bg-gradient-to-r from-primary to-primary-glow" />

          {/* 1. FAIXA 1 — CABEÇALHO EM DOIS BLOCOS:
              A) INFORMAÇÕES — ícone + título + descrição + métricas (esquerda);
              B) CONTROLES   — período (De/Até), busca e "Exportar Trilha" na
                 MESMA linha, com "Exportar Trilha" imediatamente à direita da
                 busca (8px). "Mais filtros" NÃO mora aqui: ele fecha a faixa de
                 filtros da FAIXA 2, depois de "Todos os níveis".
            O botão "Limpar" fica FORA do cabeçalho, como no modelo.

            A decisão "1 linha × 2 linhas" vem da largura REAL do card
            (`@container`, não a viewport: com a navegação lateral aberta o card
            fica bem mais estreito que a tela). A coluna do texto tem PISO
            (`minmax(430px,1fr)`) para a descrição nunca quebrar; não cabendo os
            controles ao lado, o grupo INTEIRO desce para uma segunda linha —
            período e o par busca + "Exportar Trilha" viajam juntos. */}
          <div className="grid grid-cols-1 gap-3 border-b border-border/30 px-4 py-3 @min-[1120px]:grid-cols-[minmax(430px,1fr)_auto] @min-[1120px]:items-center @min-[1120px]:gap-3">
            {/* BLOCO A — ícone + título + descrição + métricas */}
            <div className="flex min-w-0 items-start gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <History className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-[17px] font-semibold leading-tight tracking-tight text-foreground">
                  Trilha de Auditoria
                </h2>
                <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                  Histórico completo de ações realizadas no módulo de desligamentos.
                </p>
                {/* `flex-wrap` (e não `truncate`): com pouca largura a linha de
                  metadados QUEBRA — nenhuma informação secundária é cortada. */}
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10.5px] text-muted-foreground/80">
                  <span>{resumo.total} eventos registrados</span>
                  <span aria-hidden className="shrink-0">
                    ·
                  </span>
                  <span className="shrink-0">
                    {resumo.dias} {resumo.dias === 1 ? 'dia' : 'dias'} de atividade
                  </span>
                  <span aria-hidden className="shrink-0">
                    ·
                  </span>
                  <span className="shrink-0">{rotuloRecurso(tabela)}</span>
                </div>
              </div>
            </div>

            {/* BLOCO B — período (De/Até) + busca + "Exportar Trilha", tudo na
              MESMA linha. O par busca + "Exportar Trilha" é um sub-grupo
              inseparável: em telas estreitas eles descem JUNTOS. */}
            <div className="flex min-w-0 flex-wrap items-center gap-2.5 @min-[1120px]:flex-nowrap @min-[1120px]:justify-end">
              {/* Período (De/Até) */}
              <div className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-border/40 bg-background/60 px-2">
                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <DatePicker
                  value={de}
                  onChange={setDe}
                  placeholder="De"
                  className="h-10 w-[102px] border-0 bg-transparent px-1 text-xs"
                  aria-label="Data inicial do período"
                />
                <span className="text-muted-foreground/60" aria-hidden>
                  –
                </span>
                <DatePicker
                  value={ate}
                  onChange={setAte}
                  placeholder="Até"
                  className="h-10 w-[102px] border-0 bg-transparent px-1 text-xs"
                  aria-label="Data final do período"
                />
              </div>

              {/* Par INSEPARÁVEL: busca + "Exportar Trilha" (8px entre eles). */}
              <div className="flex min-w-0 items-center gap-2">
                <div className="relative min-w-[150px] flex-1 @min-[1120px]:w-[220px] @min-[1120px]:flex-none">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar na trilha..."
                    aria-label="Buscar na trilha"
                    className="h-11 w-full rounded-xl border-border/40 bg-background/70 pl-8 text-xs"
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportar}
                  className="h-11 shrink-0 gap-1.5 whitespace-nowrap rounded-xl border-border/40 px-3 text-xs"
                >
                  <Download className="h-3.5 w-3.5" /> Exportar Trilha
                </Button>
              </div>
            </div>
          </div>

          {/* 2. FAIXA 2 — UMA ÚNICA BARRA HORIZONTAL com os NOVE controles na
            sequência exata da referência: os seis chips de categoria (GRUPO A)
            e, logo depois de "Sistema", "Todos os usuários" + "Todos os níveis" +
            "Mais filtros" (GRUPO B). A barra NUNCA quebra linha (`flex-nowrap`),
            não usa `justify-between`, não tem `margin` artificial e a sobra à
            direita NÃO existe: a linha ocupa 100% da largura útil (`w-full`) e o
            GRUPO A é quem absorve a folga (`flex-1`), redistribuindo-a entre os
            chips (cada chip é `flex-1 min-w-fit`, então cresce por igual e nunca
            encolhe abaixo do próprio texto). O GRUPO B fica `shrink-0`: "Mais
            filtros" termina encostado na borda útil, sem faixa vazia no fim.
            Cada grupo é `min-w-fit`, então, quando o conjunto não cabe (telas
            estreitas), ninguém se sobrepõe: quem rola é a BARRA
            (`overflow-x-auto` + `.scroll-interno`, a barra fina do app, com
            `overscroll-behavior: contain`) e a página nunca rola na horizontal. */}
          <div className="scroll-interno overflow-x-auto border-b border-border/30 px-4 py-3">
            <div className="flex w-full min-w-fit items-center gap-1.5">
              {/* GRUPO A — os seis chips de categoria (absorvem a folga da linha).
                `motion.div` é o MESMO nó `div` (mesmas classes de geometria), e a
                entrada é a de referência (`entradaCard`): o grupo entra como UM
                bloco, sem tocar na geometria dos chips (cada chip continua sendo
                um item `flex-1 min-w-fit` da própria faixa). */}
              <motion.div
                {...entradaCard(0)}
                className={cn('flex min-w-fit flex-1 items-center gap-1.5', TRANSICAO_CHIPS_TRILHA)}
              >
                <FilterChip
                  variante="compacto"
                  label="Todos os eventos"
                  total={resumo.total}
                  ativo={categoria === 'todos'}
                  onClick={() => setCategoria('todos')}
                />
                {CATEGORIAS_TRILHA.map((meta) => (
                  <FilterChip
                    key={meta.chave}
                    variante="compacto"
                    label={meta.label}
                    total={resumo.porCategoria[meta.chave]}
                    ativo={categoria === meta.chave}
                    ponto={meta.ponto}
                    onClick={() => setCategoria(categoria === meta.chave ? 'todos' : meta.chave)}
                  />
                ))}
              </motion.div>

              {/* GRUPO B — os três controles complementares, colados no GRUPO A
                (entrada 1: o grupo entra depois dos chips, na ordem de leitura
                da barra). Os controles seguem com hover/foco próprios. */}
              <motion.div {...entradaCard(1)} className="flex shrink-0 items-center gap-1.5">
                <Select value={usuario} onValueChange={setUsuario}>
                  <SelectTrigger
                    aria-label="Filtrar por usuário"
                    className="h-[38px] w-auto min-w-[136px] rounded-[10px] border-border/40 bg-background/70 px-2.5 text-xs"
                  >
                    <SelectValue placeholder="Todos os usuários" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os usuários</SelectItem>
                    {usuarios.map((autor) => (
                      <SelectItem key={autor.chave} value={autor.chave}>
                        {autor.nome} ({autor.total})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={nivel} onValueChange={(valor) => setNivel(valor as NivelTrilha | 'todos')}>
                  <SelectTrigger
                    aria-label="Filtrar por nível"
                    className="h-[38px] w-auto min-w-[136px] rounded-[10px] border-border/40 bg-background/70 px-2.5 text-xs"
                  >
                    <SelectValue placeholder="Todos os níveis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os níveis</SelectItem>
                    {NIVEIS_TRILHA.map((meta) => (
                      <SelectItem key={meta.chave} value={meta.chave}>
                        {meta.label} ({resumo.porNivel[meta.chave]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPainelAberto((aberto) => !aberto)}
                  aria-expanded={painelAberto}
                  className={cn(
                    'h-[38px] shrink-0 gap-1.5 whitespace-nowrap rounded-[10px] border px-2.5 text-xs',
                    painelAberto ? 'border-primary/40 text-primary' : 'border-border/40'
                  )}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" /> Mais filtros
                  <ChevronDown className={cn('h-3 w-3 transition-transform', painelAberto && 'rotate-180')} />
                </Button>
              </motion.div>
            </div>
          </div>

          {/* FILTROS AVANÇADOS ("Mais filtros") — o painel expande ABAIXO da
              barra principal (FAIXA 2) e ACIMA da timeline. Fica no FLUXO NORMAL
              do DOM (sem `position: absolute`, sem portal/popover), então a
              timeline desce suavemente conforme a altura do painel cresce e
              volta à posição original ao recolher. Altura `0 → auto` com a
              opacidade acompanhando, 400ms e ease `[0.22, 1, 0.36, 1]` — o MESMO
              Framer Motion do resto da trilha, sem uma segunda animação
              concorrente. O ícone (no botão da FAIXA 2) aponta para baixo quando
              fechado e gira 180° quando aberto. */}
          <AnimatePresence initial={false}>
            {painelAberto && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden border-b border-border/30"
              >
                <div className="flex flex-wrap items-end gap-3 p-4">
                  <div className="flex w-[210px] flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Tipo de evento
                    </span>
                    <Select value={acaoSelecionada} onValueChange={setAcaoSelecionada}>
                      <SelectTrigger className="h-9 rounded-xl border-border/40 bg-background/70 text-xs">
                        <SelectValue placeholder="Todas as ações" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas as ações</SelectItem>
                        {acoesDisponiveis.map((opcao) => (
                          <SelectItem key={opcao.acao} value={opcao.acao}>
                            {acaoTrilhaMeta(opcao.acao).titulo} ({opcao.total})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Registro
                    </span>
                    <Input
                      value={registro}
                      onChange={(e) => setRegistro(e.target.value)}
                      placeholder="ID do desligamento..."
                      aria-label="Filtrar por ID do registro"
                      className="h-9 w-[220px] rounded-xl border-border/40 bg-background/70 text-xs"
                    />
                  </div>
                  <p className="max-w-[420px] pb-1 text-[11px] leading-snug text-muted-foreground">
                    Os filtros combinam entre si: categoria, autor, nível, ação e período são aplicados em conjunto.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 3. TIMELINE AGRUPADA POR DIA */}
          <div className="p-4 sm:p-5">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, indice) => (
                  <div key={indice} className="flex gap-4">
                    <Skeleton className="h-6 w-12 rounded-md" />
                    <Skeleton className="h-16 flex-1 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : filtrados.length === 0 ? (
              <EmptyState
                icon={temFiltro ? X : Inbox}
                title={temFiltro ? 'Nenhum evento com esses filtros' : 'Nenhum registro de auditoria encontrado'}
                description={
                  temFiltro
                    ? 'Ajuste os filtros acima para voltar a ver os eventos do módulo.'
                    : 'Assim que houver movimentação nos desligamentos, os eventos aparecem aqui.'
                }
                action={temFiltro ? { label: 'Limpar filtros', onClick: limparFiltros } : undefined}
                className="py-12"
              />
            ) : (
              <TooltipProvider delayDuration={200}>
                <div className="space-y-5">
                  {/* `AnimatePresence` da TIMELINE: dá SAÍDA ao DIA INTEIRO que o
                    filtro remove. Sem ele, um dia que deixa de ter eventos sairia
                    de uma vez (o `<section>` desmonta seco) — o `AnimatePresence`
                    de dentro só alcança os `<li>` de um dia que PERMANECE. O dia
                    removido se recolhe como UM bloco (altura + opacidade, a MESMA
                    saída de ~250ms de cada evento); o dia que ENTRA não ganha
                    coreografia própria: quem anima são o cabeçalho e os eventos
                    dentro dele (`trilhaRevealVariants`), na cascata de sempre.
                    Não renderiza DOM — o `<section>` e o `space-y-5` seguem
                    idênticos, e o `overflow-hidden` só recorta a altura durante o
                    recolhimento (os tooltips são portal, não são cortados). */}
                  <AnimatePresence>
                    {grupos.map((grupo) => (
                      <motion.section
                        key={grupo.diaMs}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: TRILHA_SAIDA_DURACAO, ease: TRILHA_EASE }}
                        className="overflow-hidden"
                        aria-label={grupo.rotulo}
                      >
                        {/* Cabeçalho do dia: nasce recolhido e se abre ANTES dos
                          eventos dele — é o primeiro slot do grupo na fila do
                          coordenador (`onda.porDia`). Mesmo preset dos eventos
                          (`trilhaRevealVariants`): altura + opacidade, sem fade
                          solto, sem deslocamento próprio. */}
                        <motion.header
                          initial="collapsed"
                          animate="expanded"
                          variants={trilhaRevealVariants}
                          custom={onda.porDia.get(grupo.diaMs) ?? 0}
                          className="mb-2 flex items-center gap-3 overflow-hidden"
                        >
                          <h3 className="font-display text-[13px] font-semibold tracking-tight text-foreground">
                            {grupo.rotulo}
                          </h3>
                          <span className="h-px flex-1 bg-border/40" />
                          <span className="text-[11px] text-muted-foreground/70">
                            {grupo.eventos.length} {grupo.eventos.length === 1 ? 'evento' : 'eventos'}
                          </span>
                        </motion.header>
                        <ol className="space-y-1">
                          {/* `AnimatePresence` por DIA (`mode="sync"`, o padrão):
                            os eventos que o filtro REMOVE saem com o recolhimento
                            discreto de ~250ms e os que ENTRAM disparam a própria
                            revelação em cascata (700ms por evento, 150ms de
                            intervalo, com sobreposição). O `mode="wait"` NÃO é
                            usado de propósito: ele só vale para UM filho; com
                            vários (a lista deste dia) a lib desmontaria os
                            eventos que PERMANECEM e os reanimaria — a piscada que
                            não pode existir. A ordem "sair ANTES de entrar" vem
                            do TEMPO: o atraso de entrada de um dia com evento
                            excluído pelo filtro já chega somado de
                            `TRILHA_SAIDA_DURACAO` pelo coordenador (`onda`), e quem
                            só acrescenta entra na hora. Quem PERMANECE tem `key`
                            estável (o `id` do evento) e não reanima. Sem
                            `initial={false}`: o
                            contexto novo (`initial` verdadeiro) devolve o
                            keyframe `collapsed` a quem entra, que o
                            `initial={false}` do `PageTransition` bloquearia. Não
                            renderiza DOM — o `<ol>` e o `space-y-1` seguem
                            idênticos e os `<li>` continuam filhos diretos. */}
                          <AnimatePresence>
                            {grupo.eventos.map((evento, indice) => (
                              <LinhaTrilha
                                key={chaveEvento(evento)}
                                evento={evento}
                                nomePorId={nomePorId}
                                ultimo={indice === grupo.eventos.length - 1}
                                atraso={onda.porEvento.get(evento) ?? 0}
                                onVerDetalhes={() => setDetalhe(evento)}
                              />
                            ))}
                          </AnimatePresence>
                        </ol>
                      </motion.section>
                    ))}
                  </AnimatePresence>
                </div>
              </TooltipProvider>
            )}
          </div>
        </Card>
      </EntradaPresenca>

      <DetalheEventoTrilha
        evento={detalhe}
        nomePorId={nomePorId}
        onOpenChange={(aberto) => {
          if (!aberto) setDetalhe(null);
        }}
        onCopiar={copiarEvento}
      />
    </>
  );
}

/* ─── Linha do evento (a peça densa da timeline) ──────────────────────────── */

interface LinhaTrilhaProps {
  evento: EventoTrilha;
  nomePorId: Map<string, string>;
  /** Último evento do dia: não desenha o fio que continua para baixo. */
  ultimo: boolean;
  /** Atraso (em segundos) da revelação desta linha — já resolvido pelo coordenador. */
  atraso: number;
  onVerDetalhes: () => void;
}

/**
 * Uma linha da trilha. Sempre com o MESMO conjunto de blocos — horário,
 * marcador, evento, autor, metadados e ação — para o olho descer a coluna
 * inteira sem reler rótulo.
 *
 * ENTRADA: a linha nasce RECOLHIDA (`height: 0`) e se abre até a altura
 * NATURAL do conteúdo — a MESMA expansão dos blocos do Organograma
 * (`trilhaRevealVariants`), nunca um fade solto. O `<li>` é o wrapper de
 * revelação e é o ÚNICO nó que recorta (`overflow-hidden`), exatamente como o
 * `OrganogramaRevealBlock`; dentro dele a `<div>`-grade separa o TRILHO (coluna
 * A) da SUPERFÍCIE do registro (colunas B–F). O redesenho é SÓ estrutural: o nó
 * de recorte, os variants e o coordenador de atraso seguem os mesmos — a
 * animação de entrada não é tocada. O tooltip do marcador é portal (Radix), então
 * o recorte não o corta.
 *
 * SAÍDA: quando o filtro remove o evento, é este `motion.li` que roda a única
 * animação de saída — `exit="collapsed"` recolhe a linha (mesma altura → 0,
 * ~250ms, sem atraso) sob o `AnimatePresence` de cada dia. Como a linha INTEIRA
 * é uma unidade, horário, marcador, fio do dia, ícone, cards, badges e a ação
 * "Ver detalhes" saem junto, sem saltos e sem animação concorrente por texto.
 */
function LinhaTrilha({ evento, nomePorId, ultimo, atraso, onVerDetalhes }: LinhaTrilhaProps) {
  const categoria = CATEGORIA_POR_CHAVE[categoriaDoEvento(evento)];
  const autor = responsavelDoEvento(evento, nomePorId);
  const origem = origemDoAutor(evento);
  const metas = metadadosDoEvento(evento);
  const resultado = resultadoDoEvento(evento);
  const nivel = NIVEIS_TRILHA.find((meta) => meta.chave === nivelDoEvento(evento));
  const moldura = acaoTrilhaMeta(evento.acao);
  const Icone = moldura.icon;

  return (
    <motion.li
      initial="collapsed"
      animate="expanded"
      exit="collapsed"
      variants={trilhaRevealVariants}
      custom={atraso}
      className="group overflow-hidden"
    >
      <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-x-3 sm:grid-cols-[68px_minmax(0,1fr)] sm:gap-x-4">
        {/* A. TRILHO — horário, marcador colorido por categoria e fio do dia */}
        <div className="relative flex flex-col items-center pt-3.5">
          <span className="text-[11px] font-semibold tabular-nums text-muted-foreground transition-colors group-hover:text-foreground">
            {formatarHora(evento.criadoEm)}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  'mt-2 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 bg-card transition-transform group-hover:scale-110',
                  categoria.anel
                )}
              >
                <span className={cn('h-2 w-2 rounded-full', categoria.ponto)} />
              </span>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-[11px]">
              {categoria.label}
              {nivel ? ` · ${nivel.label}` : ''}
            </TooltipContent>
          </Tooltip>
          {!ultimo && (
            <span className="mt-1.5 w-px flex-1 bg-border/40 transition-colors group-hover:bg-border/70" aria-hidden />
          )}
        </div>

        {/* B–F. REGISTRO — a superfície própria do evento e a GRADE analítica.
            O `pb-3` (ausente no último do dia) é o respiro ENTRE registros e fica
            DENTRO da linha da grade: o fio do trilho (coluna A, `flex-1`) estica
            até o próximo marcador e a timeline não abre buraco. Cada bloco ocupa
            sempre o MESMO trilho (B–F), com `col-span-2` apenas abaixo de `xl`. */}
        <div className={cn('min-w-0', ultimo ? 'pb-0' : 'pb-3')}>
          <div className={cn(SUPERFICIE_LINHA, COLUNAS_RELATORIO, 'px-4 py-3.5')}>
            <EventoResumo
              evento={evento}
              categoria={categoria}
              moldura={moldura}
              Icone={Icone}
              className="col-span-2 xl:col-span-1"
            />
            <AutorEvento autor={autor} origem={origem} className="col-span-2 xl:col-span-1" />
            <ColunaMetadado meta={metas[0]} />
            <ColunaMetadado meta={metas[1]} />
            <AcaoEvento resultado={resultado} onVerDetalhes={onVerDetalhes} className="col-span-2 xl:col-span-1" />
          </div>
        </div>
      </div>
    </motion.li>
  );
}

/* ─── Blocos de uma linha ─────────────────────────────────────────────────── */

/** B1 — ícone + título legível + descrição derivada do payload. */
function EventoResumo({
  evento,
  categoria,
  moldura,
  Icone,
  className,
}: {
  evento: EventoTrilha;
  categoria: (typeof CATEGORIAS_TRILHA)[number];
  moldura: ReturnType<typeof acaoTrilhaMeta>;
  Icone: ReturnType<typeof acaoTrilhaMeta>['icon'];
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 items-start gap-3', className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', categoria.badge)}>
            <Icone className="h-4 w-4" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[11px]">
          {moldura.titulo}
          {evento.acao ? ` · ${evento.acao}` : ''}
        </TooltipContent>
      </Tooltip>
      <div className="min-w-0">
        <p className="text-[13.5px] font-semibold leading-snug text-foreground">{tituloDoEvento(evento)}</p>
        <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">{descricaoDoEvento(evento)}</p>
      </div>
    </div>
  );
}

/**
 * B2 — autor (avatar + nome + e-mail) e origem da sessão.
 *
 * SEM `truncate`: o nome (que pode ser o próprio e-mail quando o cadastro de
 * `profiles` não o resolve) e o e-mail QUEBRAM dentro da coluna em vez de sumir
 * com reticências; `[overflow-wrap:anywhere]` permite a quebra no meio de uma
 * cadeia longa sem invadir o trilho vizinho. O `title` mantém o valor íntegro
 * acessível, de reforço. Origem fica no nível secundário (contraste menor).
 */
function AutorEvento({
  autor,
  origem,
  className,
}: {
  autor: ResponsavelTrilha;
  origem: string | null;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 items-start gap-2.5', className)}>
      <span
        className={cn(
          'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold',
          tintaAvatar(autor.chave)
        )}
        aria-hidden
      >
        {iniciaisDoAutor(autor.nome)}
      </span>
      <div className="min-w-0">
        <p
          className="text-[12.5px] font-medium leading-snug text-foreground [overflow-wrap:anywhere]"
          title={autor.nome}
        >
          {autor.nome}
        </p>
        {autor.email && (
          <p className="text-[11px] leading-snug text-muted-foreground [overflow-wrap:anywhere]" title={autor.email}>
            {autor.email}
          </p>
        )}
        {origem && (
          <span className="mt-1 inline-flex items-center rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {origem}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Coluna de UM metadado — (D) principal e (E) complementar. A célula existe
 * SEMPRE (mesmo sem metadado renderiza o `<div>` vazio): os cinco trilhos da
 * grade ficam preenchidos em TODAS as linhas, então o alinhamento não depende do
 * conteúdo. Era exatamente isso que a versão anterior (um `<div>` flex + uma
 * grade interna de 2 colunas com `min-w`) não garantia.
 *
 * NADA É CORTADO: o valor em R$ sai completo e sem reticências (com
 * `tabular-nums` para os dígitos alinharem), o código técnico sai em
 * monoespaçada e os demais valores saem num pill que QUEBRA em vez de aplicar
 * `truncate`. O "de → para" da transição é preservado como estava.
 */
function ColunaMetadado({ meta, className }: { meta?: MetaTrilha; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      {meta && (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{meta.label}</p>
          {meta.transicao ? (
            <p className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[12px]">
              <span className="text-muted-foreground">{meta.de}</span>
              <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
              <span
                className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium', meta.badge)}
              >
                {meta.valor}
              </span>
            </p>
          ) : (
            <p
              className={cn(
                'mt-1',
                meta.destaque
                  ? 'text-[14px] font-semibold tabular-nums leading-snug text-foreground'
                  : meta.tecnico
                    ? 'inline-flex max-w-full items-center rounded-full border border-border/40 bg-muted/40 px-2 py-0.5 font-mono text-[10.5px] text-foreground [overflow-wrap:anywhere]'
                    : 'inline-flex max-w-full items-center rounded-full border border-border/40 bg-muted/40 px-2 py-0.5 text-[11px] font-medium leading-snug text-foreground [overflow-wrap:anywhere]'
              )}
              title={meta.valor}
            >
              {meta.valor}
            </p>
          )}
        </>
      )}
    </div>
  );
}

/**
 * B4 — coluna de AÇÕES: o selo de resultado (quando existe) e o botão secundário
 * "Ver detalhes".
 *
 * ESTRUTURA ÚNICA PARA TODOS OS EVENTOS: selo à esquerda, botão à direita, os
 * dois num ÚNICO container horizontal (`flex-nowrap` + `items-center` +
 * `justify-end`). A versão anterior usava `flex-wrap`, então um selo mais LARGO
 * (o "Concluído", verde) não cabia ao lado do botão na largura da coluna e
 * quebrava para uma segunda linha — o selo ficava ACIMA do botão, enquanto o
 * "Sistema" (mais estreito) permanecia ao lado. Era a única origem da
 * inconsistência: agora nada quebra e o par nunca se separa. Sem evento com selo,
 * o botão continua alinhado à direita, na MESMA posição dos demais.
 *
 * NADA É COMPRIMIDO NEM CORTADO: `shrink-0` no selo e no botão trava a largura
 * natural de cada um; o gap é uniforme (`gap-2.5`, 10px). A folga vem da GRADE
 * (`COLUNAS_RELATORIO`), que reserva a largura mínima desta coluna para o MAIOR
 * selo ("Concluído") somado ao botão — sem posicionamento absoluto e sem invadir
 * os demais trilhos (`minmax(0,…fr)` nas outras colunas).
 *
 * O botão deixa de ser texto apagado e vira um secundário identificável — fundo
 * navy mais escuro, borda e texto no ciano `--info` (NÃO o lima `--primary`, que
 * segue reservado às ações primárias/estados) —, com 34–36px de altura, raio de
 * 10px (`rounded-md`, o token do DS) e 200ms de transição. No hover do REGISTRO ele ganha evidência extra
 * (`group-hover:`); no próprio hover, fundo ciano translúcido.
 */
function AcaoEvento({
  resultado,
  onVerDetalhes,
  className,
}: {
  resultado: ResultadoTrilha | null;
  onVerDetalhes: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-nowrap items-center justify-end gap-2.5', className)}>
      {resultado && (
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium',
            resultado.badge
          )}
        >
          <span
            className={cn('h-1.5 w-1.5 rounded-full', resultado.badge.includes('success') ? 'bg-success' : 'bg-info')}
          />
          {resultado.label}
        </span>
      )}
      <button
        type="button"
        onClick={onVerDetalhes}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-info/35 bg-background/60 px-3 text-[11.5px] font-medium text-info transition-colors duration-200 hover:border-info/55 hover:bg-info/10 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring group-hover:border-info/45 group-hover:bg-info/10"
      >
        Ver detalhes
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ─── Detalhe do evento ("Ver detalhes") ──────────────────────────────────── */

interface DetalheTrilhaProps {
  evento: EventoTrilha | null;
  nomePorId: Map<string, string>;
  onOpenChange: (aberto: boolean) => void;
  onCopiar: (evento: EventoTrilha) => void;
}

/**
 * Detalhe completo do evento na janela em cascata compartilhada
 * (`AnimatedCascadeDialog`) — a MESMA coreografia dos popups do sistema.
 *
 * É aqui que vive o conteúdo técnico: o diff campo a campo em linguagem humana
 * ("Antes" × "Depois") e o payload bruto como evidência. Na timeline ele não
 * aparece — lá o que vale é o resumo legível.
 */
function DetalheEventoTrilha({ evento, nomePorId, onOpenChange, onCopiar }: DetalheTrilhaProps) {
  const itens: React.ReactNode[] = [];

  if (evento) {
    const autor = responsavelDoEvento(evento, nomePorId);
    const origem = origemDoAutor(evento);
    const categoria = CATEGORIA_POR_CHAVE[categoriaDoEvento(evento)];
    const nivel = NIVEIS_TRILHA.find((meta) => meta.chave === nivelDoEvento(evento));
    const alteracoes = alteracoesDoEvento(evento);

    itens.push(
      <BlocoTrilha key="identificacao" titulo="Identificação" icone={Fingerprint}>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <CampoTrilha rotulo="Entidade">{rotuloRecurso(evento.tabela)}</CampoTrilha>
          <CampoTrilha rotulo="Registro">{evento.registroId ?? '—'}</CampoTrilha>
          <CampoTrilha rotulo="Ação técnica">{evento.acao ?? '—'}</CampoTrilha>
          <CampoTrilha rotulo="Data/hora">{formatarDataHora(evento.criadoEm)}</CampoTrilha>
          <CampoTrilha rotulo="ID do log">{evento.id || '—'}</CampoTrilha>
          <CampoTrilha rotulo="Categoria">
            <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium', categoria.badge)}>
              {categoria.label}
            </span>
          </CampoTrilha>
          {nivel && (
            <CampoTrilha rotulo="Nível">
              <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium', nivel.badge)}>
                {nivel.label}
              </span>
            </CampoTrilha>
          )}
        </dl>
      </BlocoTrilha>,

      <BlocoTrilha key="autor" titulo="Autor" icone={User}>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-full text-[11px] font-semibold',
              tintaAvatar(autor.chave)
            )}
          >
            {iniciaisDoAutor(autor.nome)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-foreground">{autor.nome}</p>
            {autor.email && <p className="truncate text-[11px] text-muted-foreground">{autor.email}</p>}
          </div>
          {origem && (
            <span className="ml-auto inline-flex shrink-0 items-center rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {origem}
            </span>
          )}
        </div>
        {(evento.ip || evento.userAgent) && (
          <dl className="mt-3 grid grid-cols-1 gap-y-2">
            {evento.ip && <CampoTrilha rotulo="Endereço IP">{evento.ip}</CampoTrilha>}
            {evento.userAgent && <CampoTrilha rotulo="Navegador">{evento.userAgent}</CampoTrilha>}
          </dl>
        )}
      </BlocoTrilha>
    );

    if (alteracoes.length > 0) {
      itens.push(
        <BlocoTrilha key="alteracoes" titulo={`Alterações (${alteracoes.length})`} icone={ArrowRightLeft}>
          <div className="overflow-hidden rounded-xl border border-border/40">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 border-b border-border/40 bg-muted/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Campo</span>
              <span>Antes</span>
              <span>Depois</span>
            </div>
            <div className="divide-y divide-border/30">
              {alteracoes.map((alteracao) => (
                <div
                  key={alteracao.chave}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-start gap-2 px-3 py-2 text-[12px]"
                >
                  <span className="font-medium text-foreground">{alteracao.label}</span>
                  <span className="break-words text-muted-foreground">{alteracao.de}</span>
                  <span className="break-words font-medium text-foreground">{alteracao.para}</span>
                </div>
              ))}
            </div>
          </div>
        </BlocoTrilha>
      );
    }

    itens.push(
      <BlocoTrilha key="tecnico" titulo="Dados técnicos" icone={Braces}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCopiar(evento)}
          className="h-8 gap-1.5 rounded-xl border-border/40 text-[11px]"
        >
          <Copy className="h-3.5 w-3.5" /> Copiar dados do evento
        </Button>
        <div className="mt-3 space-y-3">
          <JsonTrilha titulo="Payload anterior" valor={evento.antes} />
          <JsonTrilha titulo="Payload novo" valor={evento.depois} />
        </div>
      </BlocoTrilha>
    );
  }

  return (
    <AnimatedCascadeDialog
      open={!!evento}
      onOpenChange={onOpenChange}
      title={evento ? tituloDoEvento(evento) : 'Detalhes do evento'}
      titleIcon={evento ? acaoTrilhaMeta(evento.acao).icon : History}
      emptyMessage="Nenhum evento selecionado."
      items={itens}
      className="max-w-2xl"
    />
  );
}

/** Bloco do detalhe: rótulo com ícone + conteúdo. */
function BlocoTrilha({
  titulo,
  icone: Icone,
  children,
}: {
  titulo: string;
  icone: typeof Fingerprint;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/40 bg-muted/10 p-3">
      <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icone className="h-3 w-3" /> {titulo}
      </h4>
      {children}
    </section>
  );
}

/** Par rótulo/valor do detalhe. */
function CampoTrilha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{rotulo}</dt>
      <dd className="break-words text-[12.5px] text-foreground">{children}</dd>
    </div>
  );
}

/** Payload bruto de um lado do evento (evidência técnica, dentro do detalhe). */
function JsonTrilha({ titulo, valor }: { titulo: string; valor: Record<string, unknown> | null }) {
  return (
    <div>
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {titulo}
      </span>
      {valor ? (
        <pre className="max-h-[180px] overflow-auto rounded-lg border border-border/30 bg-muted/40 p-2 font-mono text-[10px] leading-relaxed text-foreground/80">
          {JSON.stringify(valor, null, 2)}
        </pre>
      ) : (
        <span className="text-[11px] italic text-muted-foreground">Sem dados</span>
      )}
    </div>
  );
}
