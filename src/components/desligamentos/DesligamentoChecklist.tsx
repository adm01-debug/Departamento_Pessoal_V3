import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { entradaCard, EntradaPresenca } from './entradaCards';

/**
 * ============================================================================
 * Checklist do Desligamento — lista operacional do drawer de detalhes.
 *
 * Redesenho (mesma lógica de produto): o card de progresso, os filtros internos
 * e o agrupamento em "Pendentes"/"Concluídas" organizam os MESMOS 8 itens que já
 * existiam (`checklist_*` da tabela `desligamentos`). Nenhum item, chave ou ação
 * foi inventado: o `onToggle` continua sendo o único caminho de gravação e é
 * disparado pela linha inteira (o indicador circular e o chip do lado direito
 * são só affordance visual — quem grava é o `onClick` da linha).
 *
 * O contador mantém o formato `X/8`: é o texto que a área já exibia e que os
 * testes verificam — a descrição ("tarefas concluídas") entra ao lado, sem
 * trocar o número.
 * ============================================================================
 */

const CHECKLIST_ITEMS = [
  { key: 'checklist_comunicacao', label: 'Comunicação ao colaborador', descricao: 'Registrar e oficializar a comunicação do desligamento.' },
  { key: 'checklist_documentacao', label: 'Documentação preparada', descricao: 'Reunir e validar os documentos necessários do processo.' },
  { key: 'checklist_calculo_rescisao', label: 'Cálculo de rescisão', descricao: 'Conferir as verbas e os valores calculados no sistema.' },
  { key: 'checklist_revogacao_acessos', label: 'Revogação de acessos', descricao: 'Bloquear acessos, sistemas e credenciais do colaborador.' },
  { key: 'checklist_devolucao_equipamentos', label: 'Devolução de equipamentos', descricao: 'Registrar a devolução dos itens sob responsabilidade.' },
  { key: 'checklist_esocial', label: 'Envio eSocial (S-2299)', descricao: 'Transmitir o evento de desligamento ao eSocial.' },
  { key: 'checklist_homologacao', label: 'Homologação', descricao: 'Homologar a rescisão junto ao sindicato, quando aplicável.' },
  { key: 'checklist_pagamento', label: 'Pagamento efetuado', descricao: 'Confirmar o pagamento das verbas rescisórias.' },
] as const;

type FiltroChecklist = 'todos' | 'pendentes' | 'concluidas';

interface ChecklistProps {
  desligamento: any;
  onToggle?: (key: string, value: boolean) => void;
  /**
   * Conclui de uma só vez todos os itens ainda pendentes. Recebe as chaves
   * (`checklist_*`) para que o dono do estado grave tudo numa única chamada —
   * o checklist não conhece o serviço, a tabela nem o formato do registro.
   */
  onConcluirPendencias?: (keys: string[]) => void;
  readOnly?: boolean;
}

export function DesligamentoChecklist({ desligamento, onToggle, onConcluirPendencias, readOnly }: ChecklistProps) {
  const [filtro, setFiltro] = useState<FiltroChecklist>('todos');

  const itens = useMemo(
    () => CHECKLIST_ITEMS.map((item) => ({ ...item, concluida: desligamento?.[item.key] === true })),
    [desligamento]
  );

  const concluidas = itens.filter((i) => i.concluida);
  const pendentes = itens.filter((i) => !i.concluida);
  const total = itens.length;
  const completed = concluidas.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const filtros: { value: FiltroChecklist; label: string; count: number }[] = [
    { value: 'todos', label: 'Todos', count: total },
    { value: 'pendentes', label: 'Pendentes', count: pendentes.length },
    { value: 'concluidas', label: 'Concluídas', count: concluidas.length },
  ];

  const mostrarPendentes = filtro !== 'concluidas' && pendentes.length > 0;
  const mostrarConcluidas = filtro !== 'pendentes' && concluidas.length > 0;

  const alternar = (key: string, value: boolean) => {
    if (readOnly) return;
    onToggle?.(key, value);
  };

  return (
    /* `EntradaPresenca` (ver entradaCards.tsx): um contexto de presença novo
       devolve o keyframe `hidden` a TODOS os blocos do checklist de uma vez —
       sem ele, o `initial={false}` do PageTransition bloquearia a cascata. */
    <EntradaPresenca>
    <div className="space-y-4 font-body">
      {/* ── Cabeçalho da seção ─────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <ListChecks className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-sm font-semibold leading-tight text-foreground">
            Checklist de Desligamento
          </h3>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            Conclua as etapas operacionais do processo.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-border/40 bg-card/60 px-2.5 py-1 font-display text-xs font-semibold tabular-nums text-foreground">
          {`${completed}/${total}`}
        </span>
      </div>

      {/* ── Progresso geral ────────────────────────────────────────────── */}
      {/* Cards do checklist com a entrada de referência (a mesma dos KPI do
          Dashboard Executivo), em cascata pela ordem de leitura. As LINHAS de
          tarefa ficam de fora de propósito: ao marcar uma tarefa ela troca de
          grupo (remonta) e a entrada tocaria de novo a cada clique — o que a
          regra de "entrada única por apresentação" proíbe. */}
      <motion.div
        {...entradaCard(0)}
        className="rounded-2xl border border-border/40 bg-card/50 p-3.5"
      >
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="font-display text-xs font-medium text-foreground">Progresso geral</span>
          <span className="text-[10px] text-muted-foreground">
            {completed} de {total} tarefas concluídas
          </span>
        </div>
        <Progress value={progress} className="h-1.5 bg-muted/60" indicatorClassName="bg-primary" />
        <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
          <span>
            {pendentes.length > 0
              ? `${pendentes.length} tarefa${pendentes.length > 1 ? 's' : ''} pendente${pendentes.length > 1 ? 's' : ''}`
              : 'Nenhuma pendência'}
          </span>
          <span className="tabular-nums">{`${progress}%`}</span>
        </div>
      </motion.div>

      {/* ── Filtros ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 rounded-xl border border-border/40 bg-card/40 p-1">
        {filtros.map((f) => {
          const ativo = filtro === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFiltro(f.value)}
              aria-pressed={ativo}
              className={cn(
                'flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-1.5 py-1.5 text-[11px] font-medium transition-colors',
                ativo ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <span className="truncate">{f.label}</span>
              <span className="shrink-0 rounded-full bg-muted/60 px-1.5 text-[10px] tabular-nums">{f.count}</span>
            </button>
          );
        })}
      </div>


      {/* ── Grupos ─────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {mostrarPendentes && (
          <motion.div {...entradaCard(1)} className="space-y-2">
            <GrupoHeader titulo="Pendentes" count={pendentes.length} tom="pendente" />
            {pendentes.map((item) => (
              <ChecklistItemRow key={item.key} item={item} readOnly={readOnly} onAlternar={alternar} />
            ))}
          </motion.div>
        )}

        {mostrarConcluidas && (
          <motion.div {...entradaCard(2)} className="space-y-2">
            <GrupoHeader titulo="Concluídas" count={concluidas.length} tom="concluida" />
            {concluidas.map((item) => (
              <ChecklistItemRow key={item.key} item={item} readOnly={readOnly} onAlternar={alternar} />
            ))}
          </motion.div>
        )}

        {!mostrarPendentes && !mostrarConcluidas && (
          <p className="rounded-xl border border-border/40 bg-card/40 p-4 text-center text-[11px] text-muted-foreground">
            Nenhuma tarefa neste filtro.
          </p>
        )}
      </div>

      {/* ── Ação de fechamento ─────────────────────────────────────────── */}
      <motion.div
        {...entradaCard(3)}
        className="flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-card/40 p-3"
      >
        <p className="min-w-0 text-[10px] leading-snug text-muted-foreground">
          {pendentes.length > 0
            ? `${pendentes.length} tarefa${pendentes.length > 1 ? 's' : ''} aguardando conclusão`
            : 'Todas as tarefas foram concluídas'}
        </p>
        <Button
          type="button"
          size="sm"
          onClick={() => onConcluirPendencias?.(pendentes.map((p) => p.key))}
          disabled={readOnly || pendentes.length === 0}
          className="shrink-0 gap-1.5 font-body text-xs"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Concluir pendências
        </Button>
      </motion.div>
    </div>
    </EntradaPresenca>
  );
}


/* ─── Peças internas ───────────────────────────────────────────────────────── */

function GrupoHeader({ titulo, count, tom }: { titulo: string; count: number; tom: 'pendente' | 'concluida' }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', tom === 'concluida' ? 'bg-success' : 'bg-warning')} />
      <span className="font-display text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </span>
      <span className="shrink-0 rounded-full bg-muted/60 px-1.5 text-[10px] tabular-nums text-muted-foreground">
        {count}
      </span>
      <span className="h-px flex-1 bg-border/40" />
    </div>
  );
}

interface ChecklistItemRowProps {
  item: { key: string; label: string; descricao: string; concluida: boolean };
  readOnly?: boolean;
  onAlternar: (key: string, value: boolean) => void;
}

function ChecklistItemRow({ item, readOnly, onAlternar }: ChecklistItemRowProps) {
  return (
    <button
      type="button"
      disabled={readOnly}
      onClick={() => onAlternar(item.key, !item.concluida)}
      aria-pressed={item.concluida}
      title={readOnly ? 'Somente leitura' : item.concluida ? 'Reabrir tarefa' : 'Concluir tarefa'}
      className={cn(
        'group flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors',
        item.concluida
          ? 'border-success/25 bg-success/5'
          : 'border-border/40 bg-card/40 hover:border-primary/30 hover:bg-primary/5',
        readOnly && 'cursor-not-allowed opacity-70'
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
          item.concluida
            ? 'border-success bg-success text-success-foreground'
            : 'border-border/60 text-muted-foreground group-hover:border-primary group-hover:text-primary'
        )}
      >
        {item.concluida ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-2 w-2" />}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium leading-tight text-foreground">{item.label}</span>
        <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">{item.descricao}</span>
      </span>

      {!readOnly && (
        <span
          className={cn(
            'mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors',
            item.concluida
              ? 'border-border/50 text-muted-foreground group-hover:border-warning/40 group-hover:text-warning'
              : 'border-primary/30 text-primary group-hover:bg-primary/15'
          )}
        >
          {item.concluida ? 'Reabrir' : 'Concluir'}
        </span>
      )}
    </button>
  );
}

