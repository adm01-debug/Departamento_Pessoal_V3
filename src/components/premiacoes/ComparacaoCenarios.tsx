import { cn } from '@/lib/utils';

/**
 * ============================================================================
 * COMPARAÇÃO DE CENÁRIOS — tabela horizontal compacta (4 colunas, 9 linhas).
 *
 * Sem cards, sem empilhamento e sem scroll: `table-fixed` + larguras em %,
 * padding enxuto e tipografia compacta. A tabela NUNCA cria overflow; em telas
 * muito estreitas só a escala da fonte diminui (container query), mantendo as
 * quatro colunas e todos os valores.
 * ============================================================================
 */

export interface LinhaComparacao {
  chave: string;
  rotulo: string;
  base: string;
  selecionados: { id: string; nome: string; valor: string }[];
  variacao: string;
  corVariacao: string;
}

export interface CenarioComparado {
  id: string;
  nome: string;
}

interface ComparacaoCenariosProps {
  linhas: LinhaComparacao[];
  cenarios: CenarioComparado[];
}

export function ComparacaoCenarios({ linhas, cenarios }: ComparacaoCenariosProps) {
  const colunas =
    cenarios.length > 1 ? ['28%', '18%', '18%', '18%', '18%'] : ['33%', '24%', '24%', '19%'];

  return (
    <div
      data-testid="scenario-comparison"
      data-comparison-layout="table-v3"
      className="scenario-comparison mt-3 min-w-0"
    >
      <table
        aria-label="Comparação de cenários"
        className="scenario-comparison__table w-full table-fixed border-collapse text-left"
      >
        <colgroup>
          {colunas.map((largura, indice) => (
            <col key={indice} style={{ width: largura }} />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-border/40 text-muted-foreground">
            <th className="text-left font-medium uppercase tracking-wide">Indicador</th>
            <th className="text-right font-medium uppercase tracking-wide">Cenário base</th>
            {cenarios.map((c) => (
              <th
                key={c.id}
                className="break-words text-right font-medium uppercase leading-tight tracking-wide"
                title={c.nome}
              >
                {c.nome}
              </th>
            ))}
            <th className="text-right font-medium uppercase tracking-wide">Variação</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, indice) => (
            <tr key={linha.chave} className={indice < linhas.length - 1 ? 'border-b border-border/20' : undefined}>
              <td className="break-words leading-snug text-muted-foreground">{linha.rotulo}</td>
              <td className="text-numeric whitespace-nowrap text-right font-medium tabular-nums">{linha.base}</td>
              {linha.selecionados.map((s) => (
                <td key={s.id} className="text-numeric whitespace-nowrap text-right tabular-nums">
                  {s.valor}
                </td>
              ))}
              <td
                className={cn(
                  'text-numeric whitespace-nowrap text-right font-medium tabular-nums',
                  linha.corVariacao,
                )}
              >
                {linha.variacao}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
