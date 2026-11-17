import { motion } from 'framer-motion';
import { ArrowRight, Briefcase, Clock, Globe, Link2, MoreVertical, Search, Star, Tag, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CascadeTableBody, CascadeTableRow } from '@/components/ui/cascade-table';
import { Checkbox } from '@/components/ui/checkbox';
import { linhaTabelaVariants, linhaTabelaVariantsReduzido } from '@/components/ui/table-row-reveal';
import { useMovimentoReduzido } from '@/lib/motionMode';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { entradaCard } from '@/components/ui/entrada-cards';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumber } from '@/utils/format';
import type { CandidaturaComRelacoes, VagaRow } from '@/types/recrutamento';
import { ETAPAS, estiloAvatar, iniciaisDoNome } from './pipelineEtapas';
import { podeArrastarCandidatura } from './pipelineDragDrop';
import { badgeEtapa, dadosVagaDaCandidatura, estiloOrigem, rotuloOrigem, ultimaAtividade } from './candidatosComum';

/**
 * ============================================================================
 * TABELA DE CANDIDATOS — apresentação da referência (desktop) + cartões
 * compactos no mobile. A linha é SEMPRE uma candidatura real; o candidato e a
 * vaga vêm dos joins já carregados.
 *
 * Nada aqui altera dados: "Ver perfil" abre o dossiê existente e o menu só
 * oferece "Mover para etapa", a mesma operação já disponível no Pipeline.
 * Contatos continuam acessíveis no dossiê (não há coluna dedicada na tabela).
 * ============================================================================
 */
export interface TabelaCandidatosProps {
  candidaturas: readonly CandidaturaComRelacoes[];
  vagasPorId: ReadonlyMap<string, VagaRow>;
  selecionados: ReadonlySet<string>;
  onAlternarSelecao: (id: string) => void;
  onAlternarTodos: () => void;
  todosDaPaginaSelecionados: boolean;
  algunsSelecionados: boolean;
  onVerPerfil: (cand: CandidaturaComRelacoes) => void;
  onMoverEtapa: (id: string, etapa: string) => void | boolean | Promise<void | boolean>;
  /**
   * Identidade da listagem (página + ordenação + filtros). Mesma função do
   * `chaveCascata` de Desligamentos → Processos: ao mudar, o `<tbody>` remonta
   * e a cascata das linhas toca novamente. Seleção/hover/menus não mudam esta
   * chave, portanto não reanimam a lista.
   */
  cascadeKey: string;
}

export function TabelaCandidatos({
  candidaturas,
  vagasPorId,
  selecionados,
  onAlternarSelecao,
  onAlternarTodos,
  todosDaPaginaSelecionados,
  algunsSelecionados,
  onVerPerfil,
  onMoverEtapa,
  cascadeKey,
}: TabelaCandidatosProps) {
  // Acessibilidade: com movimento reduzido, as linhas nascem visíveis e sem
  // cascata. No modo normal, usa exatamente as variantes de Desligamentos.
  const movimentoReduzido = useMovimentoReduzido();
  if (candidaturas.length === 0) return null;

  const variantesLinha = movimentoReduzido ? linhaTabelaVariantsReduzido : linhaTabelaVariants;

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1120px] table-fixed border-collapse text-left">
          <caption className="sr-only">Candidatos por processo seletivo</caption>
          <colgroup>
            <col className="w-[3.2%]" />
            <col className="w-[19.3%]" />
            <col className="w-[19.3%]" />
            <col className="w-[10.5%]" />
            <col className="w-[8%]" />
            <col className="w-[9%]" />
            <col className="w-[8.5%]" />
            <col className="w-[12%]" />
            <col className="w-[10.2%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border/40 bg-muted/20">
              <th scope="col" className="px-3 py-1.5">
                <span className="sr-only">Seleção</span>
                <Checkbox
                  checked={todosDaPaginaSelecionados ? true : algunsSelecionados ? 'indeterminate' : false}
                  onCheckedChange={onAlternarTodos}
                  aria-label="Selecionar todos os candidatos da página"
                />
              </th>
              {[
                'Candidato',
                'Vaga / Processo',
                'Etapa atual',
                'Experiência',
                'Pretensão',
                'Avaliação',
                'Última atividade',
                'Ações',
              ].map((rotulo) => (
                <th
                  key={rotulo}
                  scope="col"
                  className={cn(
                    'px-2 py-1.5 text-[8.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground',
                    rotulo === 'Ações' ? 'pr-3 text-right' : 'text-left'
                  )}
                >
                  {rotulo}
                </th>
              ))}
            </tr>
          </thead>
          <CascadeTableBody cascadeKey={cascadeKey}>
            {candidaturas.map((cand, indice) => (
              <CascadeTableRow
                key={cand.id}
                index={indice}
                variants={variantesLinha}
                className={cn(
                  'border-b border-border/25 transition-colors last:border-0 hover:bg-primary/[0.025]',
                  selecionados.has(cand.id) && 'bg-primary/[0.035]'
                )}
              >
                <td className="px-3 py-1.5 align-middle">
                  <Checkbox
                    checked={selecionados.has(cand.id)}
                    onCheckedChange={() => onAlternarSelecao(cand.id)}
                    aria-label={`Selecionar ${cand.candidato?.nome ?? 'candidato'}`}
                  />
                </td>
                <td className="px-2 py-1.5 align-middle">
                  <IdentificacaoCandidato cand={cand} />
                </td>
                <td className="px-2 py-1.5 align-middle">
                  <VagaProcesso cand={cand} vaga={vagasPorId.get(cand.vaga_id)} />
                </td>
                <td className="px-2 py-1.5 align-middle">
                  <BadgeEtapaCandidato cand={cand} />
                </td>
                <td className="px-2 py-1.5 align-middle">
                  <Experiencia cand={cand} />
                </td>
                <td className="px-2 py-1.5 align-middle">
                  <Pretensao cand={cand} />
                </td>
                <td className="px-2 py-1.5 align-middle">
                  <Avaliacao cand={cand} />
                </td>
                <td className="px-2 py-1.5 align-middle">
                  <UltimaAtividade cand={cand} />
                </td>
                <td className="px-2 py-1.5 align-middle">
                  <AcoesCandidato cand={cand} onVerPerfil={onVerPerfil} onMoverEtapa={onMoverEtapa} />
                </td>
              </CascadeTableRow>
            ))}
          </CascadeTableBody>
        </table>
      </div>

      <div className="divide-y divide-border/30 md:hidden">
        {candidaturas.map((cand, indice) => (
          <motion.div
            key={cand.id}
            {...entradaCard(6 + (indice % 4))}
            className={cn('p-3 transition-colors', selecionados.has(cand.id) && 'bg-primary/[0.035]')}
          >
            <div className="flex items-start gap-2.5">
              <Checkbox
                checked={selecionados.has(cand.id)}
                onCheckedChange={() => onAlternarSelecao(cand.id)}
                aria-label={`Selecionar ${cand.candidato?.nome ?? 'candidato'}`}
                className="mt-1"
              />
              <div className="min-w-0 flex-1">
                <IdentificacaoCandidato cand={cand} />
              </div>
              <AcoesCandidato cand={cand} onVerPerfil={onVerPerfil} onMoverEtapa={onMoverEtapa} somenteMenu />
            </div>
            <div className="mt-2.5 rounded-lg border border-border/45 bg-background/30 px-2.5 py-1.5">
              <VagaProcesso cand={cand} vaga={vagasPorId.get(cand.vaga_id)} />
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
              <BadgeEtapaCandidato cand={cand} />
              <Experiencia cand={cand} />
              <Pretensao cand={cand} />
              <Avaliacao cand={cand} />
            </div>
            <div className="mt-2.5 flex items-end justify-between gap-3">
              <UltimaAtividade cand={cand} />
              <Button
                type="button"
                variant="outline"
                onClick={() => onVerPerfil(cand)}
                aria-label={`Ver perfil de ${cand.candidato?.nome ?? 'candidato'}`}
                className="h-7 shrink-0 gap-1 rounded-lg border-info/50 bg-background/50 px-2 text-[10px] font-semibold text-foreground hover:border-info/80 hover:bg-info/10 hover:text-foreground"
              >
                Ver perfil
                <ArrowRight className="h-3 w-3" aria-hidden />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </>
  );
}

const ICONES_ORIGEM: Record<string, typeof Globe> = {
  linkedin: Link2,
  indeed: Search,
  site: Globe,
  website: Globe,
  indicacao: UserPlus,
  gupy: Briefcase,
};

function BadgeOrigem({ cand }: { cand: CandidaturaComRelacoes }) {
  const rotulo = rotuloOrigem(cand);
  const Icone = ICONES_ORIGEM[normalizarChaveOrigem(rotulo)] ?? Tag;
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full border px-1.5 py-0.5 text-[8.5px] font-medium leading-none',
        estiloOrigem(rotulo)
      )}
      title={rotulo}
    >
      <Icone className="h-2.5 w-2.5 shrink-0" aria-hidden />
      <span className="truncate">{rotulo}</span>
    </span>
  );
}

function normalizarChaveOrigem(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function IdentificacaoCandidato({ cand }: { cand: CandidaturaComRelacoes }) {
  const nome = cand.candidato?.nome?.trim() || 'Candidato sem nome';
  const estilo = estiloAvatar(nome);
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold"
        style={estilo}
      >
        {iniciaisDoNome(nome)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[12px] font-semibold leading-tight text-foreground" title={nome}>
          {nome}
        </p>
        <div className="mt-1">
          <BadgeOrigem cand={cand} />
        </div>
      </div>
    </div>
  );
}

function VagaProcesso({ cand, vaga }: { cand: CandidaturaComRelacoes; vaga?: VagaRow | null }) {
  const { titulo, detalhe } = dadosVagaDaCandidatura(cand, vaga);
  return (
    <div className="min-w-0">
      <p className="truncate text-[11.5px] font-medium leading-tight text-foreground" title={titulo}>
        {titulo}
      </p>
      <p className="mt-0.5 truncate text-[9.5px] leading-tight text-muted-foreground" title={detalhe}>
        {detalhe}
      </p>
    </div>
  );
}

function BadgeEtapaCandidato({ cand }: { cand: CandidaturaComRelacoes }) {
  const { label, classe } = badgeEtapa(cand);
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9.5px] font-semibold leading-none',
        classe
      )}
      title={label}
    >
      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      <span className="truncate">{label}</span>
    </span>
  );
}

function Experiencia({ cand }: { cand: CandidaturaComRelacoes }) {
  const anos = cand.candidato?.experiencia_anos;
  const texto =
    anos === null || anos === undefined
      ? 'Não informado'
      : anos === 0
        ? 'Sem experiência'
        : `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
  return (
    <span
      className={cn(
        'inline-flex min-w-0 items-center gap-1 text-[10.5px] leading-none',
        anos === null || anos === undefined ? 'text-muted-foreground' : 'text-foreground/85'
      )}
      title={texto}
    >
      <Briefcase className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
      <span className="tabular-nums">{texto}</span>
    </span>
  );
}

function Pretensao({ cand }: { cand: CandidaturaComRelacoes }) {
  const valor = cand.candidato?.pretensao_salarial;
  return (
    <span
      className={cn(
        'block whitespace-nowrap text-[10.5px] font-medium tabular-nums leading-none',
        valor === null || valor === undefined ? 'text-muted-foreground' : 'text-foreground/90'
      )}
    >
      {valor === null || valor === undefined ? 'Não informado' : formatCurrency(valor)}
    </span>
  );
}

function Avaliacao({ cand }: { cand: CandidaturaComRelacoes }) {
  const nota = cand.nota_geral;
  if (nota === null || nota === undefined) {
    return <span className="text-[10px] leading-none text-muted-foreground">Não avaliado</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold leading-none text-foreground">
      <Star className="h-3 w-3 shrink-0 fill-current text-warning" aria-hidden />
      <span className="tabular-nums">{formatNumber(nota, { decimals: 1 })}</span>
      <span className="sr-only"> de 5</span>
    </span>
  );
}

function UltimaAtividade({ cand }: { cand: CandidaturaComRelacoes }) {
  const { data, descricao } = ultimaAtividade(cand);
  return (
    <span className="flex min-w-0 items-start gap-1.5" title={data ? `${data} · ${descricao}` : descricao}>
      <Clock className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0">
        <span className="block text-[10px] font-medium leading-none text-foreground/80 tabular-nums">
          {data ?? 'Sem data'}
        </span>
        <span className="mt-0.5 block truncate text-[9px] leading-tight text-muted-foreground">{descricao}</span>
      </span>
    </span>
  );
}

function AcoesCandidato({
  cand,
  onVerPerfil,
  onMoverEtapa,
  somenteMenu = false,
}: {
  cand: CandidaturaComRelacoes;
  onVerPerfil: (cand: CandidaturaComRelacoes) => void;
  onMoverEtapa: (id: string, etapa: string) => void | boolean | Promise<void | boolean>;
  somenteMenu?: boolean;
}) {
  const nome = cand.candidato?.nome?.trim() || 'candidato';
  const podeMover = podeArrastarCandidatura(cand.status);
  const outrasEtapas = ETAPAS.filter((etapa) => etapa.id !== cand.etapa);
  const temMenu = podeMover && outrasEtapas.length > 0;

  return (
    <div className={cn('flex items-center gap-1', !somenteMenu && 'justify-end')}>
      {!somenteMenu ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => onVerPerfil(cand)}
          aria-label={`Ver perfil de ${nome}`}
          className="h-7 gap-1 rounded-lg border-info/50 bg-background/50 px-2 text-[9.5px] font-semibold text-foreground hover:border-info/80 hover:bg-info/10 hover:text-foreground"
        >
          Ver perfil
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Button>
      ) : null}

      {temMenu ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Ações de ${nome}`}
              className="h-7 w-7 shrink-0 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            >
              <MoreVertical className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
              Mover para etapa
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {outrasEtapas.map((etapa) => (
              <DropdownMenuItem
                key={etapa.id}
                className="text-[11px]"
                onSelect={() => {
                  void onMoverEtapa(cand.id, etapa.id);
                }}
              >
                {etapa.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
