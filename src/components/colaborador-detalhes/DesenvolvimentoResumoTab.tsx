import { useLayoutEffect, useRef, useState } from 'react';
import { FormacaoQualificacoesCard } from './desenvolvimento/FormacaoQualificacoesCard';
import { TreinamentosCard } from './desenvolvimento/TreinamentosCard';
import { DesenvolvimentoProfissionalCard } from './desenvolvimento/DesenvolvimentoProfissionalCard';
import { JornadaInternaCard } from './desenvolvimento/JornadaInternaCard';

/** Área "Desenvolvimento" do dossiê do colaborador — dashboard compacto em
 * grid de 2 colunas (mesmo padrão de proporções assimétricas já usado na aba
 * "Financeiro & Benefícios": `grid-cols-[Xfr_Yfr]`), reunindo Formação,
 * Treinamentos, Avaliação/PDI/Metas e Onboarding/Período de Experiência —
 * antes espalhados em 3 sub-abas e numa pilha vertical de cards únicos. */
export function DesenvolvimentoResumoTab({ colaboradorId }: { colaboradorId: string }) {
  // "Treinamentos" é a referência de altura fixa (nunca alterado); este wrapper
  // só observa a altura já renderizada dele via ResizeObserver — não muda nada
  // do próprio card — para espelhar em "Formação & Qualificações", que passa a
  // ter altura fixa igual, em vez de um max-height chutado que desalinha
  // sempre que a quantidade de itens de um dos dois cards mudar.
  const treinamentosRef = useRef<HTMLDivElement>(null);
  const [treinamentosHeight, setTreinamentosHeight] = useState<number>();

  useLayoutEffect(() => {
    const el = treinamentosRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setTreinamentosHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-4 items-start">
        <FormacaoQualificacoesCard colaboradorId={colaboradorId} matchHeight={treinamentosHeight} />
        <div ref={treinamentosRef}>
          <TreinamentosCard colaboradorId={colaboradorId} />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)] gap-4 items-start">
        <DesenvolvimentoProfissionalCard colaboradorId={colaboradorId} />
        <JornadaInternaCard colaboradorId={colaboradorId} />
      </div>
    </div>
  );
}
