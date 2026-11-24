/**
 * ============================================================================
 * PAINEL DE DETALHES DA CENTRAL DE AJUSTES — coluna direita (~30% no desktop).
 *
 * A solicitação aberta na tabela é inspecionada AQUI, ao lado da lista, sem
 * modal: quem decide precisa ver a justificativa, o parecer de risco e o
 * contexto da jornada ao mesmo tempo em que compara com as outras linhas.
 *
 * O QUE ELE MOSTRA — na ordem da referência (seções A–G)
 *  A. cabeçalho      ícone, "Detalhes da Solicitação" e o X de fechar à direita;
 *  B. identificação  avatar maior, nome em destaque, descrição secundária e o
 *                    status à direita;
 *  C. dados          CARTÃO azul-aço: data · tipo de ajuste · horário solicitado
 *                    em três colunas de mesma largura, separadas por linhas
 *                    verticais (o horário gravado continua ao lado, riscado);
 *  D. justificativa  CARTÃO roxo com o `motivo` COMPLETO do colaborador e as
 *                    aspas como elemento visual;
 *  E. risco IA       CARTÃO cujo tom vem do parecer gravado em
 *                    `relatorio_conformidade.ia_risco` (vermelho · âmbar ·
 *                    verde), exibido COMO VEIO; sem parecer, o cartão é neutro e
 *                    o painel diz que não há análise em vez de supor um nível
 *                    (ver `riscoDoAjuste`);
 *  F. jornada        CARTÃO verde-petróleo com dois registros de
 *                    `registros_ponto` do colaborador (o anterior e o próximo à
 *                    data), resumidos por `contextoDaJornada`, mais a
 *                    divergência real quando existe;
 *  G. ações          Aprovar / Rejeitar lado a lado, de altura igual (só em
 *                    pendente), e o atalho para o diálogo com auditoria e
 *                    conformidade 671 completas.
 *
 * MOBILE E TABLET: abaixo de 1400px o painel deixa de ser coluna — o componente
 * pai o renderiza num DRAWER (`Sheet`), aberto pelo clique na linha. Assim a
 * tabela usa a largura inteira (sem rolagem horizontal interna) e os detalhes
 * continuam inteiros, com as mesmas ações.
 *
 * ============================================================================
 */
import { useQuery } from '@tanstack/react-query';
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  MessageSquareQuote,
  Quote,
  ShieldQuestion,
  Sparkles,
  Tag,
  X,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UserAvatar } from '@/components/ui/user-avatar';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  RISCOS_AJUSTE,
  STATUS_AJUSTE,
  contextoDaJornada,
  dataBR,
  horaAjuste,
  metaTipoAjuste,
  minutosAjuste,
  riscoDoAjuste,
  statusAjuste,
  type NivelRiscoAjuste,
  type RegistroJornadaCru,
  type SolicitacaoAjustePonto,
} from './centralAjustes';

interface CentralAjustesPainelProps {
  /** Solicitação aberta; `null` mostra o estado de espera. */
  solicitacao: SolicitacaoAjustePonto | null;
  /** Empresa atual — isolamento de tenant da consulta de jornada. */
  empresaId?: string;
  onFechar: () => void;
  onAprovar: (id: string) => void;
  onRejeitar: (id: string) => void;
  onVerCompleto: (solicitacao: SolicitacaoAjustePonto) => void;
  /** Decisão em andamento — desabilita os botões. */
  processando?: boolean;
}

/**
 * ============================================================================
 * PALETA DOS CARTÕES INTERNOS — CADA BLOCO FALA UMA COR
 *
 * O painel anterior vestia a MESMA caixa cinza (`bg-muted/20` + `border/40`) em
 * todos os blocos: nada separava "dado da solicitação" de "justificativa" ou de
 * "risco", e a leitura era uma pilha uniforme. Agora cada bloco tem paleta
 * própria, e a cor diz o que o bloco É:
 *
 *   DADOS ......... azul-aço neutro (#111E30 / #26384B) — informação factual;
 *   JUSTIFICATIVA . roxo (#171D31 / #42417B, tinta #A78BFA) — a voz do colaborador;
 *   RISCO ......... vermelho, âmbar ou verde, conforme o parecer da IA;
 *   JORNADA ....... verde-petróleo (#102C2A / #245B52, tinta #5EEAD4) — histórico.
 *
 * POR QUE HEXA E NÃO TOKEN: os tokens semânticos do tema escuro
 * (`--destructive` 0 63% 35% ≈ #912121, `--success` 142 76% 40% ≈ #18B361) não
 * são estas tintas — sobre o navy do painel elas ficam apagadas e o trio
 * alto/médio/baixo perde a distinção que é justamente o objetivo do cartão de
 * risco. É o mesmo critério (e os MESMOS valores de verde/vermelho) do cartão de
 * integridade da Central de Auditoria (`CentralAuditoriaDetalhes.tsx`), para as
 * duas centrais lerem igual. Vale só para os cartões deste painel — nenhuma
 * outra tela muda.
 *
 * MEDIDAS (o `index.css` fixa `html { font-size: 125% }` e o plugin
 * `scripts/postcss-escala-rem.mjs` reescreve px arbitrário em rem, então 1 px de
 * fonte escrita aqui vale 1,25 px na tela): raio `rounded-[10px]` = 12,5 px,
 * respiro `px-2.5 py-2.5` = 12,5 px, separação entre cartões `space-y-2.5` =
 * 12,5 px, título `text-[9.5px]` = 11,9 px e valor `text-[11px]` = 13,75 px —
 * as réguas pedidas (raio/respiro/gap de 12 px, título 11–12 px, texto 13–14 px).
 * ============================================================================
 */

/** Título de seção dos cartões: 9,5 px de fonte → 11,9 px de tinta na tela. */
const TITULO_SECAO = 'flex items-center gap-1 text-[9.5px] leading-tight font-semibold tracking-wide uppercase';

/**
 * Rótulo de campo (fica acima do valor) — mesma régua do título de seção.
 *
 * `min-h-[2.5em]` reserva DUAS linhas de `leading-tight` em qualquer coluna:
 * "Data" cabe em uma linha e "Horário solicitado" quebra em duas, então sem a
 * reserva o valor da primeira coluna subiria 15 px e as três colunas deixariam
 * de ler como um bloco único.
 */
const ROTULO_CAMPO =
  'flex min-h-[2.5em] items-center gap-1 text-[9.5px] leading-tight font-medium tracking-wide uppercase';

/** Superfície comum dos cartões internos: 12,5 px de raio e de respiro. */
const CARTAO = 'rounded-[10px] border px-2.5 py-2.5';

/** Valor principal de um campo: maior e mais pesado que o rótulo (13,75 px). */
const VALOR = 'text-[11px] leading-tight font-semibold';

/** Tom do cartão "Dados da solicitação" — azul-aço neutro. */
const TOM_DADOS = {
  caixa: 'border-[#26384B] bg-[#111E30]',
  titulo: 'text-[#7E93AB]',
  rotulo: 'text-[#7E93AB]',
  valor: 'text-[#E3EAF3]',
  divisor: 'divide-[#26384B]',
} as const;

/** Tom do cartão "Justificativa" — roxo da voz do colaborador. */
const TOM_JUSTIFICATIVA = {
  caixa: 'border-[#42417B] bg-[#171D31]',
  tinta: 'text-[#A78BFA]',
  texto: 'text-[#EDEBF7]',
} as const;

/** Tom do cartão "Contexto da jornada" — verde-petróleo do histórico. */
const TOM_JORNADA = {
  caixa: 'border-[#245B52] bg-[#102C2A]',
  titulo: 'text-[#5EEAD4]',
  icone: 'text-[#2DD4BF]',
  rotulo: 'text-[#7FBDB2]',
  valor: 'text-[#D7FBF4]',
  aviso: 'text-[#F7C46C]',
} as const;

/** Tinta e superfícies de um nível do cartão de risco. */
interface TomRisco {
  /** Fundo + borda do cartão. */
  caixa: string;
  /** Título e glifo do título. */
  titulo: string;
  /** Selo do nível, à direita do título. */
  selo: string;
  /** Parecer abaixo do título. */
  descricao: string;
}

/** Risco alto: vermelho — atenção máxima antes de aprovar. */
const TOM_RISCO_ALTO: TomRisco = {
  caixa: 'border-[#87313A] bg-[#30191E]',
  titulo: 'text-[#FF8F99]',
  selo: 'border-[#87313A] bg-[#59232D] text-[#FF5364]',
  descricao: 'text-[#F0B4B9]',
};

/** Risco médio: âmbar — confira os comprovantes. */
const TOM_RISCO_MEDIO: TomRisco = {
  caixa: 'border-[#8A5B16] bg-[#2C2110]',
  titulo: 'text-[#F7C46C]',
  selo: 'border-[#8A5B16] bg-[#4A3711] text-[#F5A524]',
  descricao: 'text-[#EBD3A3]',
};

/** Risco baixo: verde — parecer sem apontamento. */
const TOM_RISCO_BAIXO: TomRisco = {
  caixa: 'border-[#146C4B] bg-[#0C2922]',
  titulo: 'text-[#5BE0A6]',
  selo: 'border-[#146C4B] bg-[#104F38] text-[#16D98A]',
  descricao: 'text-[#9FDCC4]',
};

/**
 * Sem parecer registrado: cartão NEUTRO, de propósito. Ausência de análise não é
 * risco baixo — pintar de verde um registro que a IA não avaliou seria afirmar
 * algo que o dado não diz (ver `riscoDoAjuste`).
 */
const TOM_RISCO_SEM_PARECER: TomRisco = {
  caixa: 'border-border/50 bg-muted/20',
  titulo: 'text-muted-foreground',
  selo: 'border-border/50 bg-muted/20 text-muted-foreground',
  descricao: 'text-muted-foreground',
};

/** Cartão de risco: um tom por nível do parecer. */
const TOM_RISCO: Record<NivelRiscoAjuste, TomRisco> = {
  baixo: TOM_RISCO_BAIXO,
  medio: TOM_RISCO_MEDIO,
  alto: TOM_RISCO_ALTO,
};

export function CentralAjustesPainel({
  solicitacao,
  empresaId,
  onFechar,
  onAprovar,
  onRejeitar,
  onVerCompleto,
  processando = false,
}: CentralAjustesPainelProps) {
  const colaboradorId = solicitacao?.colaborador_id ?? null;

  /**
   * Jornada do colaborador da solicitação aberta. A consulta é por colaborador
   * (sem recorte de data) porque o painel precisa do registro ANTERIOR e do
   * PRÓXIMO à data do ajuste — recortar pelo período poderia devolver só um dos
   * dois. O volume é pequeno (um registro por dia) e o `staleTime` evita refetch
   * ao alternar entre solicitações do mesmo colaborador.
   */
  const { data: registros = [] } = useQuery({
    queryKey: ['ajuste-jornada-contexto', empresaId, colaboradorId],
    enabled: Boolean(empresaId && colaboradorId),
    staleTime: 60_000,
    queryFn: async () => {
      if (!empresaId || !colaboradorId) return [];
      const { data, error } = await supabase
        .from('registros_ponto')
        .select(
          'data, entrada_1, entrada_2, entrada_3, entrada_4, saida_1, saida_2, saida_3, saida_4, saida_5, saida_6'
        )
        .eq('empresa_id', empresaId)
        .eq('colaborador_id', colaboradorId)
        .order('data', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as RegistroJornadaCru[];
    },
  });

  if (!solicitacao) {
    return (
      <Card className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-card/60 px-4 py-10 text-center">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground">
          <ShieldQuestion className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="text-xs font-medium">Selecione uma solicitação</p>
        <p className="max-w-[220px] text-[11px] leading-snug text-muted-foreground">
          Clique em uma linha da tabela para ver a justificativa, o risco apontado pela IA e o contexto da jornada.
        </p>
      </Card>
    );
  }

  const estado = statusAjuste(solicitacao.status);
  const risco = riscoDoAjuste(solicitacao);
  /** Tom do cartão de risco: vem do parecer gravado; sem parecer, fica neutro. */
  const tomRisco = risco ? TOM_RISCO[risco.nivel] : TOM_RISCO_SEM_PARECER;
  const tipo = metaTipoAjuste(solicitacao.tipo_ponto);
  const IconeTipo = tipo.icone;
  const nome = solicitacao.colaborador?.nome_completo ?? 'Colaborador removido';
  const contexto = contextoDaJornada(registros, solicitacao.data_ponto);
  const divergencia = solicitacao.relatorio_conformidade?.divergencia_minutos ?? 0;
  const pendente = estado === 'pendente';

  return (
    // `h-full` + corpo rolável: o painel é o vizinho que ocupa as linhas 2–5 do
    // grid, então ele estica até a BASE da paginação e as ações (Aprovar /
    // Rejeitar) caem sempre no rodapé — sem `sticky`, sem `absolute`.
    <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card">
      {/* A. CABEÇALHO — ícone, título da seção e o X de fechar à direita. */}
      <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="min-w-0 flex-1 truncate text-xs font-semibold">Detalhes da Solicitação</p>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onFechar}
          aria-label="Fechar detalhes da solicitação"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-2.5">
        {/* B. IDENTIFICAÇÃO — avatar maior, nome em destaque, descrição
            secundária e o status à direita. */}
        <div className="flex items-center gap-2.5">
          <UserAvatar name={nome} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] leading-tight font-semibold">{nome}</p>
            <p className="text-[10px] leading-tight text-muted-foreground">Solicitação de ajuste de ponto</p>
          </div>
          <Badge variant={STATUS_AJUSTE[estado].badge} size="sm" className="h-[19px] shrink-0 px-2 text-[10px]">
            {STATUS_AJUSTE[estado].rotulo}
          </Badge>
        </div>

        {/* C. DADOS DA SOLICITAÇÃO — cartão azul-aço neutro. As três
            informações factuais ficam em colunas de MESMA largura, separadas por
            linhas verticais discretas: rótulo em cima (11,9 px) e valor embaixo
            (13,75 px, semibold), então nenhuma das três parece mais importante
            que as outras. */}
        <section className={cn(CARTAO, TOM_DADOS.caixa)} aria-label="Dados da solicitação">
          <h4 className={cn(TITULO_SECAO, TOM_DADOS.titulo)}>Dados da solicitação</h4>
          <div className={cn('mt-1.5 grid grid-cols-3 divide-x', TOM_DADOS.divisor)}>
            <div className="min-w-0 pr-2">
              <p className={cn(ROTULO_CAMPO, TOM_DADOS.rotulo)}>
                <CalendarDays className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                Data
              </p>
              <p className={cn(VALOR, 'text-numeric mt-0.5', TOM_DADOS.valor)}>{dataBR(solicitacao.data_ponto)}</p>
            </div>
            <div className="min-w-0 px-2">
              <p className={cn(ROTULO_CAMPO, TOM_DADOS.rotulo)}>
                <Tag className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                Tipo de ajuste
              </p>
              <p className={cn(VALOR, 'mt-0.5 flex items-center gap-1', TOM_DADOS.valor)}>
                <IconeTipo className={cn('h-3 w-3 shrink-0', tipo.cor)} aria-hidden="true" />
                {/* `title` revela o rótulo inteiro quando a coluna trunca
                    ("Retorno (almoço)") — o dado continua acessível. */}
                <span className="truncate" title={tipo.rotulo}>
                  {tipo.rotulo}
                </span>
              </p>
            </div>
            <div className="min-w-0 pl-2">
              <p className={cn(ROTULO_CAMPO, TOM_DADOS.rotulo)}>
                <Clock className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                Horário solicitado
              </p>
              <p className={cn(VALOR, 'mt-0.5 flex flex-wrap items-baseline gap-x-1.5', TOM_DADOS.valor)}>
                <span className="text-numeric">{horaAjuste(solicitacao.hora_sugerida)}</span>
                {solicitacao.hora_original && (
                  <span className={cn('text-[9.5px] font-normal line-through', TOM_DADOS.rotulo)}>
                    {horaAjuste(solicitacao.hora_original)}
                  </span>
                )}
              </p>
            </div>
          </div>
        </section>

        {/* D. JUSTIFICATIVA — cartão ROXO: a cor separa a voz do colaborador de
            todo o resto do painel (é o texto que mais importa para a decisão).
            Título e aspas em #A78BFA, texto claro e completo — sem fundo claro
            que ofusque no tema escuro. */}
        <section className={cn(CARTAO, TOM_JUSTIFICATIVA.caixa)}>
          <h4 className={cn(TITULO_SECAO, TOM_JUSTIFICATIVA.tinta)}>
            <MessageSquareQuote className="h-3 w-3 shrink-0" aria-hidden="true" />
            Justificativa
          </h4>
          <div className="mt-1.5 flex gap-2">
            <Quote className={cn('mt-px h-3.5 w-3.5 shrink-0', TOM_JUSTIFICATIVA.tinta)} aria-hidden="true" />
            <p className={cn('min-w-0 text-[11px] leading-relaxed break-words', TOM_JUSTIFICATIVA.texto)}>
              {solicitacao.motivo}
            </p>
          </div>
        </section>

        {/* E. ANÁLISE DE RISCO (IA) — cartão cujo TOM vem do parecer: vermelho
            (alto), âmbar (médio), verde (baixo) ou neutro (sem parecer). Título
            e selo na MESMA linha, com o parecer logo abaixo — a cor é a primeira
            coisa que o olho pega antes de ler. */}
        <section className={cn(CARTAO, tomRisco.caixa)}>
          <div className="flex items-center justify-between gap-2">
            <h4 className={cn(TITULO_SECAO, 'min-w-0', tomRisco.titulo)}>
              <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />
              Análise de risco (IA)
            </h4>
            {risco && (
              <Badge variant="outline" size="sm" className={cn('h-[18px] shrink-0 px-2 text-[10px]', tomRisco.selo)}>
                {RISCOS_AJUSTE[risco.nivel].rotulo}
              </Badge>
            )}
          </div>
          <p className={cn('mt-1.5 text-[10.5px] leading-snug break-words', tomRisco.descricao)}>
            {risco
              ? (risco.resumo ?? 'Parecer sem texto registrado.')
              : 'Esta solicitação não tem parecer de risco registrado — decida pela justificativa e pelos comprovantes.'}
          </p>
        </section>

        {/* F. CONTEXTO DA JORNADA — cartão VERDE-PETRÓLEO do histórico, com uma
            linha por informação ("Último registro" e "Próxima jornada") em vez de
            um parágrafo corrido: o rótulo fica discreto e o VALOR recebe o peso
            (semibold + tinta clara), então dá para ler o dado sem ler o rótulo.
            Os dados são exatamente os mesmos de antes — e a divergência real
            aparece quando existe. */}
        <section className={cn(CARTAO, TOM_JORNADA.caixa)}>
          <h4 className={cn(TITULO_SECAO, TOM_JORNADA.titulo)}>
            <CalendarClock className={cn('h-3 w-3 shrink-0', TOM_JORNADA.icone)} aria-hidden="true" />
            Contexto da jornada
          </h4>
          <dl className="mt-1.5 space-y-1">
            <div className="flex flex-wrap items-baseline gap-x-1">
              <dt className={cn('text-[9.5px] leading-tight', TOM_JORNADA.rotulo)}>Último registro:</dt>
              <dd className={cn(VALOR, 'text-numeric min-w-0 break-words', TOM_JORNADA.valor)}>
                {contexto.anterior
                  ? `${dataBR(contexto.anterior.data)} às ${contexto.anterior.hora}`
                  : 'sem registro anterior'}
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-1">
              <dt className={cn('text-[9.5px] leading-tight', TOM_JORNADA.rotulo)}>Próxima jornada:</dt>
              <dd className={cn(VALOR, 'text-numeric min-w-0 break-words', TOM_JORNADA.valor)}>
                {contexto.proximo ? dataBR(contexto.proximo.data) : 'não registrada'}
              </dd>
            </div>
          </dl>
          {divergencia > 0 && (
            <p className={cn('mt-1 text-[9.5px] leading-tight', TOM_JORNADA.aviso)}>
              Divergência de {minutosAjuste(divergencia)} no registro apontado
            </p>
          )}
        </section>

        {/* Decisão já registrada pelo gestor — cartão NEUTRO: não é dado do
            colaborador nem parecer da IA, é o desfecho da solicitação. */}
        {solicitacao.observacoes_gestor && (
          <section className={cn(CARTAO, 'border-border/40 bg-muted/20')}>
            <h4 className={cn(TITULO_SECAO, 'text-muted-foreground')}>Decisão registrada</h4>
            <p className="mt-1.5 text-[10.5px] leading-relaxed break-words text-muted-foreground">
              {solicitacao.observacoes_gestor}
            </p>
          </section>
        )}
      </div>

      {/* G. AÇÕES — Aprovar e Rejeitar na MESMA linha, larguras equivalentes e
          40 px de altura. O botão de aprovação é o lime do sistema com texto
          ESCURO (`primary` + `primary-foreground`): o par anterior
          (`gradient-success` + `text-success-foreground`, texto quase branco)
          ficava ilegível sobre o lime. O hover sobe um degrau de luminosidade
          (`primary-glow`), sem trocar a cor do texto. */}
      <div className="shrink-0 space-y-1.5 border-t border-border/50 px-3 py-2">
        {pendente ? (
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="h-10 gap-1.5 px-2 text-[11.5px] font-semibold hover:bg-primary-glow"
              onClick={() => onAprovar(solicitacao.id)}
              disabled={processando}
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Aprovar ajuste
            </Button>
            <Button
              className="h-10 gap-1.5 rounded-lg bg-danger px-2 text-[11.5px] font-semibold text-destructive-foreground hover:bg-danger-hover"
              onClick={() => onRejeitar(solicitacao.id)}
              disabled={processando}
            >
              <XCircle className="h-3.5 w-3.5 shrink-0" /> Rejeitar solicitação
            </Button>
          </div>
        ) : (
          <p className="text-[10.5px] leading-snug text-muted-foreground">
            Esta solicitação já foi {estado === 'aprovado' ? 'aprovada' : 'rejeitada'} e não pode ser decidida de novo.
          </p>
        )}

        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-full gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          onClick={() => onVerCompleto(solicitacao)}
        >
          <FileText className="h-3.5 w-3.5" /> Detalhes completos
        </Button>
      </div>
    </Card>
  );
}
