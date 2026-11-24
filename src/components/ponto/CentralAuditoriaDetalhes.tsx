/**
 * ============================================================================
 * PAINEL DE DETALHES DO EVENTO — coluna direita (~31%) da Central de Auditoria.
 *
 * O evento aberto na timeline é inspecionado AQUI, ao lado da lista, sem modal:
 * quem investiga precisa comparar o evento com os vizinhos enquanto lê o json.
 *
 * O QUE ELE MOSTRA (e de onde vem)
 *  · identificação   selo da operação, título legível e data/hora do registro;
 *  · metadados       Responsável (e-mail), Entidade (tabela) e Identificador
 *                    (id do registro) — cada linha com ícone, rótulo e valor;
 *  · resumo          `resumoDaOperacao` (texto derivado, sem json);
 *  · dados           o json de `dados_novos`/`dados_anteriores` com fonte
 *                    monoespaçada, rolagem interna e botão de copiar;
 *  · integridade     o parecer de `evidenciaDoEvento` — "Verificada" só quando o
 *                    SHA-256 foi realmente recalculado e confere (ver o
 *                    comentário de `centralAuditoria.ts`). É esse parecer que
 *                    escolhe o tom do cartão: verde apenas no veredito
 *                    confirmado, vermelho nos demais (ver `TOM_VERIFICADO`).
 *
 * SEM EVENTO SELECIONADO o painel mostra o estado de espera com a instrução de
 * clicar em um registro; ele nunca fica em branco.
 * ============================================================================
 */
import { useEffect, useState } from 'react';
import {
  Braces,
  CalendarClock,
  Check,
  Copy,
  FileText,
  Fingerprint,
  ShieldAlert,
  ShieldCheck,
  Table2,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  dataHoraDoEvento,
  evidenciaDoEvento,
  jsonDoEvento,
  responsavelDoEvento,
  resumoDaOperacao,
  rotuloDoRecurso,
  tituloDoEvento,
  type EstadoEvidencia,
  type EventoAuditoria,
  type OperacaoAuditoria,
} from './centralAuditoria';

interface CentralAuditoriaDetalhesProps {
  /** Evento aberto; `null` mostra o estado de espera. */
  evento: EventoAuditoria | null;
  onFechar: () => void;
}

/** Selo da operação no cabeçalho do painel. */
const SELO_OPERACAO: Record<OperacaoAuditoria, 'success' | 'info' | 'destructive' | 'outline'> = {
  INSERT: 'success',
  UPDATE: 'info',
  DELETE: 'destructive',
  OUTRA: 'outline',
};

/**
 * ============================================================================
 * INTEGRIDADE DA EVIDÊNCIA — DUAS LEITURAS VISUAIS, QUATRO PARECERES
 *
 * A cor é consequência do PARECER de `evidenciaDoEvento`, nunca da simples
 * existência de um hash no json (hash de receita desconhecida não prova nada):
 *
 *   VERDE (verificada) ....... o SHA-256 do registro foi recalculado no cliente
 *                              e confere com o digest gravado. É o único estado
 *                              que pode afirmar integridade confirmada.
 *   VERMELHO (os demais) ..... `divergente` (recalculado ≠ gravado), `revisao`
 *                              (exclusão sem digest para conferir) e
 *                              `sem_comprovacao` (hash ausente ou de receita
 *                              desconhecida).
 *
 * O vermelho é ATENÇÃO, não acusação: a diferença entre os três casos vive nas
 * palavras (`rotulo` e `descricao` do parecer), não na cor — pintar três
 * vermelhos diferentes sugeriria graus de fraude que o dado não sustenta.
 *
 * POR QUE HEXA E NÃO TOKEN: o `--success`/`--destructive` do tema escuro
 * (142 76% 40% ≈ #18B361 e 0 63% 35% ≈ #912121) não são estes verdes/vermelhos
 * — o vermelho de componente fica apagado sobre o navy do painel. Estas classes
 * valem só para este cartão do painel de auditoria; nenhuma outra tela muda
 * (mesmo critério de `vermelhoVibrante.ts`).
 * ============================================================================
 */

/** Tinta e superfícies de um estado do cartão. */
interface TomEvidencia {
  /** Contorno e fundo do cartão. */
  caixa: string;
  /** Quadrado do ícone (fundo + tinta do glifo). */
  iconeCaixa: string;
  /** Selo do status, à direita do título. */
  selo: string;
  /** Descrição curta sob o título. */
  descricao: string;
  /** Rodapé monoespaçado com os digests. */
  digest: string;
  /** Ícone do estado. */
  icone: LucideIcon;
}

/** Evidência confirmada: fundo verde-escuro, contorno e glifo verdes. */
const TOM_VERIFICADO: TomEvidencia = {
  caixa: 'border-[#146C4B] bg-[#0C2922]',
  iconeCaixa: 'bg-[#104F38] text-[#16D98A]',
  selo: 'border-[#146C4B] bg-[#104F38] text-[#16D98A]',
  descricao: 'text-[#9FDCC4]',
  digest: 'text-[#7CC5A7]',
  icone: ShieldCheck,
};

/** Evidência ausente, pendente ou inválida: fundo vermelho-escuro. */
const TOM_NAO_VERIFICADO: TomEvidencia = {
  caixa: 'border-[#87313A] bg-[#30191E]',
  iconeCaixa: 'bg-[#59232D] text-[#FF5364]',
  selo: 'border-[#87313A] bg-[#59232D] text-[#FF5364]',
  descricao: 'text-[#F0B4B9]',
  digest: 'text-[#D08F96]',
  icone: ShieldAlert,
};

/** Cartão de integridade: qual tom cada um dos quatro pareceres veste. */
const CARTAO_EVIDENCIA: Record<EstadoEvidencia, TomEvidencia> = {
  verificada: TOM_VERIFICADO,
  divergente: TOM_NAO_VERIFICADO,
  revisao: TOM_NAO_VERIFICADO,
  sem_comprovacao: TOM_NAO_VERIFICADO,
};

/** Título de seção do painel — a mesma régua em todos os blocos. */
const TITULO_SECAO = 'flex items-center gap-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase';

export function CentralAuditoriaDetalhes({ evento, onFechar }: CentralAuditoriaDetalhesProps) {
  /** Feedback do "copiar" — zera sozinho depois de 2 s. */
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const timer = window.setTimeout(() => setCopiado(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copiado]);

  if (!evento) {
    return (
      <Card className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-card/60 px-4 py-10 text-center">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground">
          <FileText className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="text-xs font-medium">Nenhum evento selecionado</p>
        <p className="max-w-[220px] text-[11px] leading-snug text-muted-foreground">
          Clique em um registro da linha do tempo para ver metadados, dados técnicos e o parecer de integridade.
        </p>
      </Card>
    );
  }

  const evidencia = evidenciaDoEvento(evento);
  const cartao = CARTAO_EVIDENCIA[evidencia.estado];
  const IconeEvidencia = cartao.icone;
  const json = jsonDoEvento(evento);
  const { data, hora } = dataHoraDoEvento(evento.criadoEm);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopiado(true);
      toast.success('Dados do evento copiados.');
    } catch {
      toast.error('O navegador bloqueou a cópia. Selecione o texto manualmente.');
    }
  };

  return (
    <Card className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border/60">
      <div className="flex items-center gap-2 border-b border-border/50 px-3.5 py-2.5">
        <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <h3 className="truncate text-[13px] leading-tight font-semibold">Detalhes do Evento</h3>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onFechar}
          aria-label="Fechar detalhes do evento"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3.5 py-3">
        {/* Identificação do evento */}
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <Badge variant={SELO_OPERACAO[evento.operacao]} size="sm" className="shrink-0 font-semibold">
              {evento.acao}
            </Badge>
            <span className="truncate text-[12.5px] font-semibold leading-tight">{tituloDoEvento(evento)}</span>
          </div>
          <p className="mt-1 flex items-center gap-1 text-[10.5px] text-muted-foreground tabular-nums">
            <CalendarClock className="h-3 w-3" aria-hidden="true" />
            {data} · {hora}
          </p>
        </div>

        {/* Metadados — cada linha com ícone, rótulo e valor alinhado */}
        <dl className="divide-y divide-border/40">
          <LinhaMetadado icone={UserRound} rotulo="Responsável" valor={responsavelDoEvento(evento)} />
          <LinhaMetadado icone={Table2} rotulo="Entidade" valor={evento.tabela} />
          <LinhaMetadado icone={Fingerprint} rotulo="Identificador" valor={evento.registroId ?? '—'} mono />
        </dl>

        {/* Resumo da operação */}
        <section>
          <h4 className={cn(TITULO_SECAO, 'mb-1')}>
            <FileText className="h-3 w-3" aria-hidden="true" />
            Resumo da operação
          </h4>
          <p className="text-[11px] leading-relaxed text-foreground/90">{resumoDaOperacao(evento)}</p>
        </section>

        {/* Dados técnicos */}
        <section>
          <div className="mb-1 flex items-center justify-between gap-2">
            <h4 className={TITULO_SECAO}>
              <Braces className="h-3 w-3" aria-hidden="true" />
              Dados do registro
            </h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
              onClick={copiar}
            >
              {copiado ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
              {copiado ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          <pre className="max-h-[132px] overflow-auto rounded-lg border border-border/40 bg-background/70 p-2.5 font-mono text-[10.5px] leading-relaxed break-words whitespace-pre-wrap text-foreground/90">
            {json}
          </pre>
        </section>
      </div>

      {/* Integridade da evidência — sempre no pé do painel */}
      <div className="border-t border-border/50 px-3.5 py-2.5">
        <div className={cn('flex items-start gap-2 rounded-lg border px-2.5 py-2.5', cartao.caixa)}>
          <span
            className={cn('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md', cartao.iconeCaixa)}
            aria-hidden="true"
          >
            <IconeEvidencia className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-[11px] font-semibold">Integridade da evidência</p>
              <Badge variant="outline" size="sm" className={cn('ml-auto shrink-0', cartao.selo)}>
                {evidencia.rotulo}
              </Badge>
            </div>
            <p className={cn('mt-0.5 text-[10px] leading-snug', cartao.descricao)}>{evidencia.descricao}</p>
            {evidencia.hashRegistrado && (
              <p className={cn('mt-1 font-mono text-[9.5px] leading-tight break-all', cartao.digest)}>
                {evidencia.algoritmo} gravado: {evidencia.hashRegistrado}
                {evidencia.hashCalculado !== evidencia.hashRegistrado && <> · recalculado: {evidencia.hashCalculado}</>}
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

interface LinhaMetadadoProps {
  icone: LucideIcon;
  rotulo: string;
  valor: string;
  /** Identificador técnico (fonte monoespaçada, em pílula). */
  mono?: boolean;
}

/** Uma linha de metadado: ícone · rótulo · valor alinhado à direita. */
function LinhaMetadado({ icone: Icone, rotulo, valor, mono = false }: LinhaMetadadoProps) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <Icone className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
      <dt className="shrink-0 text-[10.5px] text-muted-foreground">{rotulo}</dt>
      <dd
        className={cn(
          'ml-auto min-w-0 text-right text-[11px] break-words text-foreground/90',
          mono && 'rounded border border-border/40 bg-muted/30 px-1.5 font-mono text-[10px]'
        )}
        title={valor}
      >
        {valor}
      </dd>
    </div>
  );
}
