/**
 * ============================================================================
 * IDENTIFICAÇÃO TEMPORÁRIA DE ORIGEM — SOMENTE HOMOLOGAÇÃO LOCAL.
 *
 * Este painel NÃO faz parte do layout aprovado: ele só é renderizado quando
 * `VITE_HOMOLOG_ORIGEM=true` no ambiente local (DEV). Em produção a variável
 * não existe e o componente devolve `null`.
 *
 * A lista usa os MESMOS registros já carregados pela página (`feedbacks`), sem
 * consulta nova e sem escrita:
 *   • UUID (não `mock-*`/`demo-*`) → REAL;
 *   • `mock-*`/`demo-*`          → DEMONSTRAÇÃO.
 * ============================================================================
 */
import { useMemo, useState } from 'react';
import { idDemonstrativo } from './escritaOperacional';
import { normalizarStatus } from './statusFeedback';

interface OrigemHomologacaoProps {
  visivel: boolean;
  feedbacks: any[];
  colaboradores?: { id?: string | null; nome_completo?: string | null }[];
  ciclos?: { id?: string | null; nome?: string | null }[];
  cicloId?: string | null;
}

const ROTULO_STATUS: Record<string, string> = {
  pendente: 'PENDENTE',
  concluido: 'CONCLUÍDO',
  cancelado: 'CANCELADO',
};

export function OrigemHomologacao({
  visivel,
  feedbacks,
  colaboradores = [],
  ciclos = [],
  cicloId,
}: OrigemHomologacaoProps) {
  const ativo = import.meta.env.DEV && import.meta.env.VITE_HOMOLOG_ORIGEM === 'true';
  const [aberto, setAberto] = useState(true);

  const linhas = useMemo(() => {
    const nome = new Map(
      colaboradores.map((c) => [String(c?.id ?? ''), String(c?.nome_completo ?? '').trim()])
    );
    const ciclo = new Map(ciclos.map((c) => [String(c?.id ?? ''), String(c?.nome ?? '').trim()]));
    const selecionado = String(cicloId ?? '').trim();
    return feedbacks
      .filter((f) => !selecionado || String(f?.ciclo_id ?? '') === selecionado)
      .map((f) => {
        const id = String(f?.id ?? '').trim();
        const status = normalizarStatus(f?.status);
        const demonstracao = idDemonstrativo(id);
        return {
          id,
          demonstrativa: demonstracao,
          origem: demonstracao ? 'DEMONSTRAÇÃO' : 'REAL',
          status,
          statusRotulo: ROTULO_STATUS[status] ?? String(f?.status ?? '—').toUpperCase(),
          avaliado: nome.get(String(f?.avaliado_id ?? '')) || String(f?.avaliado_id ?? '—'),
          ciclo: ciclo.get(String(f?.ciclo_id ?? '')) || String(f?.ciclo_id ?? '—'),
          tipo: String(f?.tipo ?? '—'),
        };
      })
      .sort((a, b) => {
        const peso = (x: typeof a) => (x.demonstrativa ? 1 : 0) * 10 + (x.status === 'pendente' ? 0 : 1);
        return peso(a) - peso(b) || a.avaliado.localeCompare(b.avaliado);
      });
  }, [feedbacks, colaboradores, ciclos, cicloId]);

  if (!ativo || !visivel) return null;

  const reaisPendentes = linhas.filter((l) => !l.demonstrativa && l.status === 'pendente').length;

  return (
    <aside
      data-testid="homolog-origem"
      className="fixed bottom-4 right-4 z-[120] w-[360px] max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-background/95 p-3 text-[10px] shadow-lg backdrop-blur"
      aria-label="Identificação de origem dos feedbacks"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-[11px] font-semibold">HOMOLOGAÇÃO · ORIGEM</p>
          <p className="text-muted-foreground">
            {linhas.length} registro(s) no ciclo · {reaisPendentes} REAL(is) pendente(s)
          </p>
        </div>
        <button
          type="button"
          className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent"
          onClick={() => setAberto((v) => !v)}
          aria-label={aberto ? 'Recolher identificação de origem' : 'Expandir identificação de origem'}
        >
          {aberto ? '−' : '+'}
        </button>
      </div>

      {aberto && (
        <div className="mt-2 max-h-[52vh] space-y-1.5 overflow-auto pr-1">
          {linhas.length === 0 && (
            <p className="py-2 text-muted-foreground">Nenhum feedback neste ciclo.</p>
          )}
          {linhas.map((l) => (
            <div key={l.id} className="rounded border border-border/70 bg-card/60 p-1.5">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={
                    l.demonstrativa
                      ? 'rounded border border-warning/50 bg-warning/15 px-1.5 py-0.5 font-semibold text-warning'
                      : 'rounded border border-success/50 bg-success/15 px-1.5 py-0.5 font-semibold text-success'
                  }
                >
                  {l.origem}
                </span>
                <span className="text-muted-foreground">{l.statusRotulo}</span>
              </div>
              <p className="mt-1 truncate font-medium" title={l.avaliado}>
                {l.avaliado} · {l.tipo}
              </p>
              <p className="truncate text-muted-foreground" title={l.ciclo}>
                {l.ciclo}
              </p>
              <div className="mt-1 flex items-center gap-1">
                <code className="min-w-0 flex-1 truncate text-[9px] text-muted-foreground" title={l.id}>
                  {l.id}
                </code>
                <button
                  type="button"
                  className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[9px] hover:bg-accent"
                  onClick={() => void navigator.clipboard?.writeText(l.id)}
                  aria-label={`Copiar identificador de ${l.avaliado}`}
                >
                  copiar
                </button>
              </div>
            </div>
          ))}
          <p className="pt-1 leading-relaxed text-muted-foreground">
            REAL = UUID do Supabase. Para cancelar, use somente um REAL com status PENDENTE: Feedbacks →
            Aguardando gestor → Ver avaliação → Cancelar avaliação.
          </p>
        </div>
      )}
    </aside>
  );
}
