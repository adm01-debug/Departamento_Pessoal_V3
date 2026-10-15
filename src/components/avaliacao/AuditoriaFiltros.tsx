import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SearchInput } from '@/components/ui/search-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FilterX, ListFilter, SlidersHorizontal } from 'lucide-react';
import { MODULOS_AUDITORIA, PERIODOS_AUDITORIA, type FiltrosAuditoria } from './auditoriaComum';
import { entradaCard } from './entradaCards';

/**
 * ============================================================================
 * AUDITORIA — BARRA DE FILTROS (topo da aba).
 *
 * Ordem da referência: busca · Módulo · Ação · Responsável · Período ·
 * Mais filtros · Exportar. TODAS as opções nascem dos registros REAIS carregados
 * pela consulta de `audit_log` (módulos = tabelas cobertas, ações = valores
 * presentes, responsáveis = e-mails distintos). Nada é decorativo: "Exportar"
 * grava o CSV pelo serviço de exportação do projeto e "Mais filtros" traz dois
 * recortes que o dado sustenta (registro e campo alterado).
 * ============================================================================
 */

/** Sentinela dos selects: Radix não aceita `value=""` em `SelectItem`. */
const TODOS = '__todos';

const CLASSE_BOTAO_BARRA =
  'h-9 shrink-0 gap-1.5 rounded-lg border-border/40 px-2.5 text-[13px] font-normal text-muted-foreground transition-colors hover:text-foreground';

/**
 * "Exportar" — veste a MESMA pele do botão "+ Novo Ciclo" da própria tela
 * (`NovoCicloDialog`): fundo verde-lima fluorescente com o gradiente
 * `from-primary to-primary-glow`, texto/ícone no escuro de `--primary-foreground`
 * e `shadow-glow-sm`. Nenhuma cor é escolhida "à mão" — são os MESMOS tokens do
 * Design System, sem alterar o botão de origem. A borda visível (azul/ciano)
 * sai de cena: fica só uma `border border-transparent`, que não pinta nada e
 * preserva a largura exata que a borda de 1px ocupava. A geometria continua a
 * dos filtros (`h-9`/`rounded-lg`/`px-3`), então tamanho, raio e alinhamento não
 * mudam; o hover e o feedback de clique vêm do `variant="default"` — o mesmo do
 * Novo Ciclo —, sem `scale` e sem deslocamento.
 */
const CLASSE_BOTAO_EXPORTAR =
  'h-9 shrink-0 gap-1.5 rounded-lg border border-transparent px-3 text-[13px] font-medium ' +
  'bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-glow-sm';

interface AuditoriaFiltrosProps {
  indice?: number;
  filtros: FiltrosAuditoria;
  onFiltros: (parcial: Partial<FiltrosAuditoria>) => void;
  acoes: string[];
  responsaveis: { valor: string; rotulo: string }[];
  ativos: number;
  onLimpar: () => void;
  onExportar: () => void;
  exportando?: boolean;
}

export function AuditoriaFiltros({
  indice = 0,
  filtros,
  onFiltros,
  acoes,
  responsaveis,
  ativos,
  onLimpar,
  onExportar,
  exportando = false,
}: AuditoriaFiltrosProps) {
  const temFiltro = filtros.busca.trim() !== '' || ativos > 0;

  return (
    <motion.div {...entradaCard(indice)} className="flex flex-wrap items-center gap-2">
      <SearchInput
        value={filtros.busca}
        onChange={(v) => onFiltros({ busca: v })}
        placeholder="Buscar evento, colaborador ou registro..."
        className="min-w-[240px] flex-1"
      />

      <Select value={filtros.modulo || TODOS} onValueChange={(v) => onFiltros({ modulo: v === TODOS ? '' : v })}>
        <SelectTrigger aria-label="Módulo" className="h-9 w-full sm:w-[160px]">
          <SelectValue placeholder="Módulo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos</SelectItem>
          {MODULOS_AUDITORIA.map((m) => (
            <SelectItem key={String(m.tabela)} value={String(m.tabela)}>
              {m.rotulo}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filtros.acao || TODOS} onValueChange={(v) => onFiltros({ acao: v === TODOS ? '' : v })}>
        <SelectTrigger aria-label="Ação" className="h-9 w-full sm:w-[140px]">
          <SelectValue placeholder="Ação" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todas</SelectItem>
          {acoes.map((a) => (
            <SelectItem key={a} value={a}>
              {a === 'INSERT' ? 'Criar' : a === 'UPDATE' ? 'Atualizar' : a === 'DELETE' ? 'Excluir' : a}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filtros.responsavel || TODOS}
        onValueChange={(v) => onFiltros({ responsavel: v === TODOS ? '' : v })}
      >
        <SelectTrigger aria-label="Responsável" className="h-9 w-full sm:w-[190px]">
          <SelectValue placeholder="Responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos</SelectItem>
          {responsaveis.map((r) => (
            <SelectItem key={r.valor} value={r.valor}>
              {r.rotulo}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filtros.periodo} onValueChange={(v) => onFiltros({ periodo: v as FiltrosAuditoria['periodo'] })}>
        <SelectTrigger aria-label="Período" className="h-9 w-full sm:w-[160px]">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          {PERIODOS_AUDITORIA.map((p) => (
            <SelectItem key={p.valor} value={p.valor}>
              {p.rotulo}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className={CLASSE_BOTAO_BARRA}>
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Mais filtros
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[262px] space-y-3">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <ListFilter className="h-3.5 w-3.5" />
            Filtros adicionais
          </p>
          <label className="block space-y-1">
            <span className="text-[11px] text-muted-foreground">ID do registro</span>
            <Input
              value={filtros.registro}
              onChange={(e) => onFiltros({ registro: e.target.value })}
              placeholder="Trecho do registro_id"
              className="h-8 text-[12px]"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] text-muted-foreground">Campo alterado</span>
            <Input
              value={filtros.campo}
              onChange={(e) => onFiltros({ campo: e.target.value })}
              placeholder="Ex.: status, nota_geral"
              className="h-8 text-[12px]"
            />
          </label>
          <button
            type="button"
            aria-pressed={filtros.origem === 'sistema'}
            onClick={() => onFiltros({ origem: filtros.origem === 'sistema' ? 'todos' : 'sistema' })}
            className="w-full rounded-md px-1.5 py-1 text-left text-[12px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {filtros.origem === 'sistema' ? '✓ ' : ''}Somente eventos do sistema
          </button>
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        size="sm"
        onClick={onExportar}
        disabled={exportando}
        className={CLASSE_BOTAO_EXPORTAR}
      >
        <Download className="h-3.5 w-3.5 shrink-0" />
        Exportar
      </Button>

      {temFiltro && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onLimpar}
          className="h-9 shrink-0 gap-1.5 rounded-lg border-primary/40 bg-primary/10 px-2.5 text-[13px] font-normal text-primary transition-colors hover:border-primary/60 hover:bg-primary/20"
        >
          <FilterX className="h-3.5 w-3.5" />
          Limpar
        </Button>
      )}
    </motion.div>
  );
}
