import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SearchInput } from '@/components/ui/search-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FilterX, SlidersHorizontal, X } from 'lucide-react';
import { entradaCard } from './entradaCards';
import { ColoredFilterChip } from './ColoredFilterChip';
import {
  CHIPS_PDI,
  FILTROS_PRAZO,
  ORDEM_PDI_OPCOES,
  ROTULO_CATEGORIA,
  TEMA_CHIP_ATENCAO,
  TEMA_CHIP_PDI,
  type CategoriaPdi,
  type ContagemPdi,
  type CriterioOrdemPdi,
  type FiltroPrazo,
} from './pdiComum';

/**
 * ============================================================================
 * BUSCA, FILTROS, ORDENAÇÃO E FILTROS RÁPIDOS — PDI.
 *
 * Tudo client-side sobre a lista JÁ carregada por `AvaliacaoPage` (nenhuma
 * consulta nova). Os selects nascem dos valores REALMENTE presentes nos
 * registros: competências (`competencia_foco`) e colaboradores dos planos —
 * nenhuma opção fixa copiada da referência.
 *
 *   · linha 1 → busca + Status + Competência + Colaborador + "Mais filtros"
 *     (prazo) + "Limpar filtros" (contextual) + "Ordenar por";
 *   · linha 2 → pílulas de status com contador real derivado dos registros.
 *
 * ── POR QUE "STATUS" APARECE NO SELECT **E** NAS PÍLULAS ────────────────────
 * É UM filtro só, com DUAS formas de acionar: o select (leitura da barra) e as
 * pílulas (contadores). Ambos escrevem no MESMO estado (`status`/`onStatus`),
 * então nunca há estado espelho nem contradição entre eles — a pílula ativa e
 * o select mostram sempre o mesmo recorte.
 *
 * ── "COLABORADOR" E NÃO "RESPONSÁVEL" ───────────────────────────────────────
 * `pdi_plano_desenvolvimento` NÃO tem campo de gestor/responsável: o único
 * vínculo de pessoa do plano é `colaborador_id`. O filtro usa exatamente esse
 * vínculo e por isso se chama "Colaborador" — chamá-lo de "Responsável" seria
 * afirmar uma relação que o dado não sustenta.
 *
 * ── "MAIS FILTROS" ──────────────────────────────────────────────────────────
 * Guarda o recorte de PRAZO (vencido / dentro do prazo), calculado pela regra
 * de atraso já existente. É o único filtro adicional que os campos atuais
 * sustentam — nada de filtro decorativo.
 *
 * ── "LIMPAR FILTROS" ────────────────────────────────────────────────────────
 * Contextual: só existe quando algum filtro/critério sai do padrão. A
 * visibilidade é derivada dos próprios props (`temFiltroAtivo`), sem estado
 * espelho. Igual ao padrão aprovado em Metas & OKRs.
 *
 * Alturas uniformes (`h-9`) para alinhar campo, selects e botões na mesma linha.
 * ============================================================================
 */

/** Sentinela dos selects: Radix não aceita `value=""` em `SelectItem`. */
const TODOS = '__todos';

interface PdiFiltrosProps {
  /** Posição na cascata de entrada (mesma régua do Dashboard Executivo). */
  indice?: number;
  busca: string;
  onBusca: (valor: string) => void;
  /** Categoria de status — a MESMA das pílulas. */
  status: CategoriaPdi;
  onStatus: (valor: CategoriaPdi) => void;
  competencia: string;
  onCompetencia: (valor: string) => void;
  competencias: string[];
  colaboradorId: string;
  onColaboradorId: (valor: string) => void;
  colaboradores: { id: string; nome: string }[];
  prazo: FiltroPrazo;
  onPrazo: (valor: FiltroPrazo) => void;
  ordem: CriterioOrdemPdi;
  onOrdem: (valor: CriterioOrdemPdi) => void;
  contagem: ContagemPdi;
  /** Quantidade de filtros além da busca (badge do "Mais filtros"). */
  filtrosAtivos: number;
  /** Filtro de atenção aplicado (vindo do banner "Foco agora"). */
  emAtencao: boolean;
  /** Quantos PDIs o filtro de atenção alcança. */
  totalAtencao: number;
  onLimpar: () => void;
  onLimparAtencao: () => void;
}

export function PdiFiltros({
  indice = 1,
  busca,
  onBusca,
  status,
  onStatus,
  competencia,
  onCompetencia,
  competencias,
  colaboradorId,
  onColaboradorId,
  colaboradores,
  prazo,
  onPrazo,
  ordem,
  onOrdem,
  contagem,
  filtrosAtivos,
  emAtencao,
  totalAtencao,
  onLimpar,
  onLimparAtencao,
}: PdiFiltrosProps) {
  /**
   * Existe filtro fora do padrão? Derivado SÓ dos props — a ordenação fica de
   * fora de propósito: ordenar não recorta a lista.
   */
  const temFiltroAtivo =
    busca.trim() !== '' ||
    status !== 'todos' ||
    competencia !== '' ||
    colaboradorId !== '' ||
    prazo !== 'todos' ||
    emAtencao;

  return (
    <motion.div {...entradaCard(indice)} className="space-y-2">
      {/* ── Linha 1: busca + filtros + ordenação ─────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={busca}
          onChange={onBusca}
          placeholder="Buscar por colaborador, PDI ou competência..."
          className="min-w-[240px] flex-1"
        />

        <Select value={status} onValueChange={(v) => onStatus(v as CategoriaPdi)}>
          <SelectTrigger aria-label="Status" className="h-9 w-full rounded-lg sm:w-[170px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {CHIPS_PDI.map((c) => (
              <SelectItem key={c.valor} value={c.valor}>
                {ROTULO_CATEGORIA[c.valor]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={competencia || TODOS} onValueChange={(v) => onCompetencia(v === TODOS ? '' : v)}>
          <SelectTrigger aria-label="Competência" className="h-9 w-full rounded-lg sm:w-[190px]">
            <SelectValue placeholder="Competência" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas as competências</SelectItem>
            {competencias.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={colaboradorId || TODOS} onValueChange={(v) => onColaboradorId(v === TODOS ? '' : v)}>
          <SelectTrigger aria-label="Colaborador" className="h-9 w-full rounded-lg sm:w-[190px]">
            <SelectValue placeholder="Colaborador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os colaboradores</SelectItem>
            {colaboradores.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* "Mais filtros" — recorte de prazo, o único adicional que os campos
            atuais sustentam. O badge conta os filtros ativos além da busca. */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 shrink-0 gap-1.5 rounded-lg border-border/40 px-2.5 text-[13px] font-normal text-muted-foreground hover:text-foreground"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Mais filtros
              {filtrosAtivos > 0 && (
                <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-primary">
                  {filtrosAtivos}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 space-y-3 p-3">
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Situação do prazo</p>
              <Select value={prazo} onValueChange={(v) => onPrazo(v as FiltroPrazo)}>
                <SelectTrigger aria-label="Situação do prazo" className="h-9 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILTROS_PRAZO.map((f) => (
                    <SelectItem key={f.valor} value={f.valor}>
                      {f.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] leading-snug text-muted-foreground">
                "Vencido" usa a mesma regra do painel: prazo passado e plano não concluído.
              </p>
            </div>
          </PopoverContent>
        </Popover>

        {/* "Limpar filtros" — CONTEXTUAL, verde-lima oficial, mesma altura. */}
        {temFiltroAtivo && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onLimpar}
            className="h-9 shrink-0 gap-1.5 rounded-lg border-primary/40 bg-primary/10 px-2.5 text-[13px] font-normal text-primary transition-colors duration-200 hover:border-primary/60 hover:bg-primary/20 hover:text-primary"
          >
            <FilterX className="h-3.5 w-3.5" />
            Limpar filtros
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden whitespace-nowrap text-xs text-muted-foreground sm:inline">Ordenar por</span>
          <Select value={ordem} onValueChange={(v) => onOrdem(v as CriterioOrdemPdi)}>
            <SelectTrigger aria-label="Ordenar por" className="h-9 w-full rounded-lg sm:w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDEM_PDI_OPCOES.map((o) => (
                <SelectItem key={o.valor} value={o.valor}>
                  {o.rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Linha 2: chips coloridos de status + chip contextual de atenção ──
          MESMA anatomia e MESMA animação de glow dos chips da Auditoria: o
          desenho vive no componente único `ColoredFilterChip`; aqui só entra a
          cor de cada categoria (`TEMA_CHIP_PDI`). */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por status">
        {CHIPS_PDI.map((c) => (
          <ColoredFilterChip
            key={c.valor}
            label={c.rotulo}
            count={contagem[c.valor]}
            tema={TEMA_CHIP_PDI[c.valor]}
            selected={status === c.valor}
            onClick={() => onStatus(c.valor)}
          />
        ))}

        {/* Chip contextual do banner: existe SÓ enquanto o filtro de atenção
            está ligado e sai junto com ele — nenhum filtro invisível na lista.
            Mesmo formato dos demais; a cor é a vermelha do Design System. */}
        {emAtencao && (
          <ColoredFilterChip
            label="Em atenção"
            count={totalAtencao}
            tema={TEMA_CHIP_ATENCAO}
            selected
            onClick={onLimparAtencao}
            ariaLabel="Remover filtro de atenção"
            trailing={<X className="h-3 w-3" />}
          />
        )}
      </div>
    </motion.div>
  );
}

