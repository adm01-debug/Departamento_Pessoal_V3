import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import { AppPagination } from '@/components/ui/app-pagination';
import { Button } from '@/components/ui/button';
import { useMovimentoReduzido } from '@/lib/motionMode';
import { EntradaPresenca, entradaCard } from './entradaCards';
import { MetaCard } from './MetaCard';
import { MetasCriticasBanner } from './MetasCriticasBanner';
import { MetasFiltros } from './MetasFiltros';
import {
  contarPorSituacao,
  derivarMeta,
  metasCriticas,
  ordenarMetas,
  responsaveisDisponiveis,
  tiposDisponiveis,
  type ColaboradorBasico,
  type CriterioOrdem,
  type FiltroStatus,
} from './metasComum';

/**
 * ============================================================================
 * ABA "METAS & OKRs" — composição completa da tela.
 *
 * Ordem visual (a da referência): (A) banner de metas críticas →
 * (B) busca/filtros/ordenação → (C) filtros rápidos por status →
 * (D) grid de cards → (E) paginação compacta.
 *
 * FONTE DOS DADOS: a lista já carregada por `AvaliacaoPage`
 * (`getMockMetas()` ou `avaliacaoService.listarMetas`). Busca, filtros,
 * ordenação e paginação são 100% client-side — nenhuma consulta nova e
 * nenhuma escrita.
 *
 * ENTRADA: `EntradaPresenca` (libera o keyframe `hidden` que o
 * `initial={false}` do PageTransition bloqueia) + a cascata `entradaCard(i)`
 * dos KPI Cards do Dashboard Executivo, na ordem de leitura — banner (0),
 * barra de filtros (1), cards da página (2, 3, 4... da esquerda para a
 * direita, de cima para baixo).
 * ============================================================================
 */

/** Itens por página do padrão da referência; o seletor traz as demais opções. */
const POR_PAGINA_PADRAO = 6;
const OPCOES_POR_PAGINA = [6, 12, 24] as const;

interface MetasOKRsTabProps {
  /** Metas da empresa (mesma lista da aba, sem recorte adicional). */
  metas: any[];
  /** Ciclos cadastrados — opções do filtro "Mais filtros" (nome + id reais). */
  ciclos?: any[];
  /**
   * Colaboradores já carregados pela página (`['colaboradores', empresaId]`) —
   * usados SÓ para resolver o departamento do responsável pelo `colaborador_id`
   * da meta (a relação `colaborador` da consulta de metas traz apenas o nome).
   */
  colaboradores?: ColaboradorBasico[];
  /** Abre o ciclo da meta no painel da aba "Ciclos". */
  onAbrirCiclo?: (cicloId: string) => void;
}

export function MetasOKRsTab({ metas, ciclos = [], colaboradores = [], onAbrirCiclo }: MetasOKRsTabProps) {
  const reduzirMovimento = useMovimentoReduzido();

  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [cicloId, setCicloId] = useState('');
  const [ordem, setOrdem] = useState<CriterioOrdem>('criticos');
  const [status, setStatus] = useState<FiltroStatus>('todas');
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(POR_PAGINA_PADRAO);

  /** Situação/prazo/responsável/departamento derivados UMA vez por carga. */
  const derivadas = useMemo(
    // `undefined` no 2º argumento mantém o `Date.now()` padrão DENTRO do helper
    // (fora do render) — a derivação continua impura só onde sempre foi.
    () => metas.map((m) => derivarMeta(m, undefined, colaboradores)),
    [metas, colaboradores]
  );
  /** Foco agora: o banner olha o conjunto inteiro (independe dos filtros). */
  const criticas = useMemo(() => metasCriticas(derivadas), [derivadas]);
  const tipos = useMemo(() => tiposDisponiveis(metas), [metas]);
  const responsaveis = useMemo(() => responsaveisDisponiveis(derivadas), [derivadas]);

  /** Busca + Tipo + Responsável + Ciclo (antes do filtro rápido de status). */
  const base = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return derivadas.filter((d) => {
      if (
        tipo &&
        String(d.meta?.tipo ?? '')
          .trim()
          .toLowerCase() !== tipo
      )
        return false;
      if (responsavel && d.responsavel !== responsavel) return false;
      if (cicloId && String(d.meta?.ciclo_id ?? '') !== cicloId) return false;
      if (!termo) return true;
      const titulo = String(d.meta?.titulo ?? '').toLowerCase();
      const descricao = String(d.meta?.descricao ?? '').toLowerCase();
      return titulo.includes(termo) || descricao.includes(termo);
    });
  }, [derivadas, busca, tipo, responsavel, cicloId]);

  const contagem = useMemo(() => contarPorSituacao(base), [base]);

  const lista = useMemo(() => {
    const filtradas = status === 'todas' ? base : base.filter((d) => d.situacao === status);
    return ordenarMetas(filtradas, ordem);
  }, [base, status, ordem]);

  const totalPaginas = Math.max(1, Math.ceil(lista.length / Math.max(1, porPagina)));
  const paginaAtual = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (paginaAtual - 1) * porPagina;
  const visiveis = lista.slice(inicio, inicio + porPagina);

  const filtrosAtivos = [tipo, responsavel, cicloId].filter(Boolean).length + (status === 'todas' ? 0 : 1);
  const opcoesCiclo = ciclos.map((c: any) => ({ id: String(c?.id ?? ''), nome: String(c?.nome ?? 'Ciclo') }));

  const limparFiltros = () => {
    setBusca('');
    setTipo('');
    setResponsavel('');
    setCicloId('');
    setStatus('todas');
    setPagina(1);
  };

  /** Ação do banner: limpa os filtros e cai na situação mais grave existente. */
  const verCriticas = () => {
    limparFiltros();
    setStatus(criticas.some((c) => c.situacao === 'atrasada') ? 'atrasada' : 'risco');
  };

  return (
    <EntradaPresenca>
      <div className="space-y-4">
        <MetasCriticasBanner criticas={criticas} indice={0} onVerCriticas={verCriticas} />

        <MetasFiltros
          indice={1}
          busca={busca}
          onBusca={(v) => {
            setBusca(v);
            setPagina(1);
          }}
          tipo={tipo}
          onTipo={(v) => {
            setTipo(v);
            setPagina(1);
          }}
          tipos={tipos}
          responsavel={responsavel}
          onResponsavel={(v) => {
            setResponsavel(v);
            setPagina(1);
          }}
          responsaveis={responsaveis}
          cicloId={cicloId}
          onCicloId={(v) => {
            setCicloId(v);
            setPagina(1);
          }}
          ciclos={opcoesCiclo}
          ordem={ordem}
          onOrdem={setOrdem}
          status={status}
          onStatus={(v) => {
            setStatus(v);
            setPagina(1);
          }}
          contagem={contagem}
          filtrosAtivos={filtrosAtivos}
          onLimpar={limparFiltros}
        />

        {visiveis.length === 0 ? (
          <motion.div
            {...entradaCard(2)}
            className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/40 px-6 py-12 text-center"
          >
            <Target className="h-6 w-6 text-muted-foreground" />
            <p className="text-[13px] font-medium">Nenhuma meta encontrada</p>
            <p className="max-w-md text-[11px] text-muted-foreground">
              Ajuste a busca ou os filtros para ver outros registros.
            </p>
            <Button variant="outline" size="sm" className="mt-1 h-8 text-xs" onClick={limparFiltros}>
              Limpar filtros
            </Button>
          </motion.div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visiveis.map((item, i) => (
              <MetaCard
                key={item.meta?.id ?? `${paginaAtual}-${i}`}
                item={item}
                indice={2 + i}
                reduzirMovimento={reduzirMovimento}
                onAbrirCiclo={onAbrirCiclo}
                onFiltrarResponsavel={(nome) => {
                  setResponsavel(nome);
                  setPagina(1);
                }}
              />
            ))}
          </div>
        )}

        {lista.length > 0 && (
          <AppPagination
            page={paginaAtual}
            total={lista.length}
            pageSize={porPagina}
            pageSizeOptions={OPCOES_POR_PAGINA}
            onPageChange={setPagina}
            onPageSizeChange={(n) => {
              setPorPagina(n);
              setPagina(1);
            }}
            linhasPorPaginaLabel="Itens por página"
            label={
              <>
                Mostrando{' '}
                <span className="font-medium text-foreground">
                  {inicio + 1}-{inicio + visiveis.length}
                </span>{' '}
                de <span className="font-medium text-foreground">{lista.length}</span>{' '}
                {lista.length === 1 ? 'meta' : 'metas'}
              </>
            }
          />
        )}
      </div>
    </EntradaPresenca>
  );
}
