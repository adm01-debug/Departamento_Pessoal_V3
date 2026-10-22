import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { CalendarDays, Clock, Search } from 'lucide-react';
import { AppPagination } from '@/components/ui/app-pagination';
import { CascadeTableBody, CascadeTableRow } from '@/components/ui/cascade-table';
import { EntradaPresenca, entradaCard } from '@/components/ui/entrada-cards';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { linhaTabelaVariants } from '@/components/ui/table-row-reveal';
import { cn } from '@/lib/utils';
import { TreinamentoAcoes } from './TreinamentoAcoes';
import { TreinamentoCategoriaBadge, TreinamentoIcone, TreinamentoStatusBadge } from './TreinamentoBadges';
import { TreinamentoParticipantes } from './TreinamentoParticipantes';
import {
  TREINAMENTOS_OPCOES_POR_PAGINA,
  formatarCargaHoraria,
  formatarDataTreinamento,
  type PaginaTreinamentos,
  type ResumoParticipacao,
  type TreinamentoRegistro,
} from './treinamentosDerivacoes';

/**
 * Tabela do Hub de Treinamentos — 7 colunas na referência aprovada.
 *
 * MOVIMENTO: as linhas usam o mecanismo compartilhado (`CascadeTableBody` +
 * `CascadeTableRow`, a mesma cascata de Desligamentos). A animação toca apenas
 * na PRIMEIRA apresentação da área: depois do primeiro render a tabela passa a
 * usar variants estáticas (mesmos elementos, sem remontar), então trocar
 * página, filtro, tamanho de página ou atualizar dados NÃO reinicia a cascata.
 */

/** Mesmos keyframes, sem espera/transição: linhas que entram depois do 1º frame. */
const variantesEstaticas: Variants = {
  hidden: { opacity: 1, y: 0, scaleX: 1 },
  visible: { opacity: 1, y: 0, scaleX: 1, transition: { duration: 0 } },
};

interface LinhaProps {
  treinamento: TreinamentoRegistro;
  index: number;
  participantes?: ResumoParticipacao;
  onExcluir: (treinamento: TreinamentoRegistro) => void;
  animar: boolean;
}

function LinhaTreinamento({ treinamento, index, participantes, onExcluir, animar }: LinhaProps) {
  return (
    <CascadeTableRow
      index={index}
      variants={animar ? linhaTabelaVariants : variantesEstaticas}
      className="border-b border-border/25 transition-colors duration-200 hover:bg-muted/20"
    >
      <TableCell className="py-3.5 pr-3">
        <div className="flex min-w-0 items-center gap-3">
          <TreinamentoIcone categoria={treinamento.categoria} />
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold leading-tight text-foreground" title={treinamento.nome}>
              {treinamento.nome}
            </p>
            {treinamento.descricao ? (
              <p
                className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-muted-foreground"
                title={treinamento.descricao}
              >
                {treinamento.descricao}
              </p>
            ) : (
              <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground/70">Sem descrição</p>
            )}
          </div>
        </div>
      </TableCell>

      <TableCell className="px-3 py-3.5 text-center">
        <TreinamentoCategoriaBadge categoria={treinamento.categoria} />
      </TableCell>

      <TableCell className="px-3 py-3.5">
        <span className="flex items-center justify-center gap-1.5 text-[12px] tabular-nums text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          {formatarDataTreinamento(treinamento.data)}
        </span>
      </TableCell>

      <TableCell className="px-3 py-3.5">
        <span className="flex items-center justify-center gap-1.5 text-[12px] tabular-nums text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          {formatarCargaHoraria(treinamento.carga_horaria)}
        </span>
      </TableCell>

      <TableCell className="px-3 py-3.5 text-center">
        <TreinamentoStatusBadge status={treinamento.status} />
      </TableCell>

      <TableCell className="px-3 py-3.5">
        {/* Bloco inteiro (avatares + chip + barra + "X de Y") centralizado como conjunto. */}
        <TreinamentoParticipantes resumo={participantes} centralizado />
      </TableCell>

      <TableCell className="py-3.5 pl-1 pr-2 text-right">
        <TreinamentoAcoes nome={treinamento.nome} onExcluir={() => onExcluir(treinamento)} />
      </TableCell>
    </CascadeTableRow>
  );
}

/** Versão em cartão para tablet/mobile — mantém todas as informações e ações reais. */
function CartaoTreinamento({ treinamento, index, participantes, onExcluir, animar }: LinhaProps) {
  return (
    <motion.div
      custom={index}
      variants={animar ? linhaTabelaVariants : variantesEstaticas}
      initial="hidden"
      animate="visible"
      className="origin-center border-b border-border/25 p-4 last:border-0"
    >
      <div className="flex items-start gap-3">
        <TreinamentoIcone categoria={treinamento.categoria} />
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold leading-tight text-foreground">{treinamento.nome}</p>
          {treinamento.descricao && (
            <p className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-muted-foreground">
              {treinamento.descricao}
            </p>
          )}
        </div>
        <TreinamentoAcoes nome={treinamento.nome} onExcluir={() => onExcluir(treinamento)} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <TreinamentoStatusBadge status={treinamento.status} />
        <TreinamentoCategoriaBadge categoria={treinamento.categoria} />
        <span className="flex items-center gap-1.5 text-[11.5px] tabular-nums text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatarDataTreinamento(treinamento.data)}
        </span>
        <span className="flex items-center gap-1.5 text-[11.5px] tabular-nums text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {formatarCargaHoraria(treinamento.carga_horaria)}
        </span>
      </div>

      <TreinamentoParticipantes resumo={participantes} className="mt-3" />
    </motion.div>
  );
}

const HEAD_CLASS =
  'h-11 px-3 text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground/80 first:pl-5 last:pr-4';

export interface TreinamentosTabelaProps {
  pagina: PaginaTreinamentos<TreinamentoRegistro>;
  porPagina: number;
  onPaginaChange: (pagina: number) => void;
  onPorPaginaChange: (porPagina: number) => void;
  participantesPorTreinamento: Record<string, ResumoParticipacao>;
  onExcluir: (treinamento: TreinamentoRegistro) => void;
  filtroAtivo: boolean;
}

export function TreinamentosTabela({
  pagina,
  porPagina,
  onPaginaChange,
  onPorPaginaChange,
  participantesPorTreinamento,
  onExcluir,
  filtroAtivo,
}: TreinamentosTabelaProps) {
  // Cascata SÓ na primeira apresentação da área (ver comentário do topo). O
  // estado desliga depois que a onda inicial terminou; trocar página/filtros
  // depois disso não reanima — e como o elemento é o MESMO (só o variant muda),
  // não há remontagem das linhas.
  const [animar, setAnimar] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setAnimar(false), 1400);
    return () => window.clearTimeout(timer);
  }, []);

  const vazio = pagina.total === 0;

  const linhas = pagina.itens.map((treinamento, index) => (
    <LinhaTreinamento
      key={treinamento.id}
      treinamento={treinamento}
      index={index}
      participantes={participantesPorTreinamento[treinamento.id]}
      onExcluir={onExcluir}
      animar={animar}
    />
  ));

  return (
    <EntradaPresenca>
      <motion.div {...entradaCard(6)} className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        {/* Desktop: 7 colunas. A rolagem horizontal fica DENTRO do card. */}
        <div className="hidden overflow-x-auto min-[1200px]:block">
          <Table className="w-full min-w-[920px] table-fixed">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[16.5%]" />
              <col className="w-[10.5%]" />
              <col className="w-[11.5%]" />
              <col className="w-[13.5%]" />
              <col className="w-[14%]" />
              <col className="w-[6%]" />
            </colgroup>
            <TableHeader>
              <TableRow className="border-border/40 bg-muted/30 hover:bg-muted/30">
                <TableHead className={HEAD_CLASS}>Treinamento</TableHead>
                <TableHead className={cn(HEAD_CLASS, 'text-center')}>Categoria</TableHead>
                <TableHead className={cn(HEAD_CLASS, 'text-center')}>Data</TableHead>
                <TableHead className={cn(HEAD_CLASS, 'text-center')}>Carga horária</TableHead>
                <TableHead className={cn(HEAD_CLASS, 'text-center')}>Status</TableHead>
                <TableHead className={cn(HEAD_CLASS, 'text-center')}>Participantes</TableHead>
                <TableHead className={cn(HEAD_CLASS, 'text-right')}>Ações</TableHead>
              </TableRow>
            </TableHeader>

            {vazio ? (
              <TableBody>
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="p-0">
                    <EstadoVazio filtroAtivo={filtroAtivo} />
                  </TableCell>
                </TableRow>
              </TableBody>
            ) : animar ? (
              <CascadeTableBody cascadeKey="treinamentos-entrada">{linhas}</CascadeTableBody>
            ) : (
              <TableBody>{linhas}</TableBody>
            )}
          </Table>
        </div>

        {/* Tablet/mobile: cartões, sem comprimir as 7 colunas. */}
        <div className="min-[1200px]:hidden">
          {vazio ? (
            <EstadoVazio filtroAtivo={filtroAtivo} />
          ) : (
            pagina.itens.map((treinamento, index) => (
              <CartaoTreinamento
                key={treinamento.id}
                treinamento={treinamento}
                index={index}
                participantes={participantesPorTreinamento[treinamento.id]}
                onExcluir={onExcluir}
                animar={animar}
              />
            ))
          )}
        </div>

        <div className="border-t border-border/40 px-4 py-2.5">
          <AppPagination
            page={pagina.pagina}
            total={pagina.total}
            pageSize={porPagina}
            pageSizeOptions={TREINAMENTOS_OPCOES_POR_PAGINA}
            onPageChange={onPaginaChange}
            onPageSizeChange={onPorPaginaChange}
            selectorPosition="end"
            linhasPorPaginaLabel="Itens por página"
            label={
              vazio ? (
                'Nenhum treinamento encontrado'
              ) : (
                <>
                  Mostrando <span className="font-semibold text-foreground">{pagina.inicio}</span>–
                  <span className="font-semibold text-foreground">{pagina.fim}</span> de{' '}
                  <span className="font-semibold text-foreground">{pagina.total}</span>{' '}
                  {pagina.total === 1 ? 'treinamento' : 'treinamentos'}
                </>
              )
            }
          />
        </div>
      </motion.div>
    </EntradaPresenca>
  );
}

function EstadoVazio({ filtroAtivo }: { filtroAtivo: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 px-4 py-12 text-center">
      <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
        <Search className="h-5 w-5" />
      </span>
      <p className="text-sm font-medium text-foreground">Nenhum treinamento encontrado</p>
      <p className="text-xs text-muted-foreground">
        {filtroAtivo
          ? 'Ajuste a busca ou limpe os filtros para ver todos os treinamentos.'
          : 'Cadastre o primeiro treinamento para começar.'}
      </p>
    </div>
  );
}
