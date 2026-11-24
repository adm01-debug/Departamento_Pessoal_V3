import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { NineBoxFiltros } from '@/components/avaliacao/NineBoxFiltros';

/**
 * GUARDA DO SELETOR DE CICLO ÚNICO — aba "Nine-Box".
 *
 * A área mostrava DOIS controles para a mesma informação: o seletor de ciclo do
 * chrome (`AvaliacaoPage`, ao lado de "Novo Ciclo") e um segundo `Select`
 * ("Ciclo em visão") na barra de busca/filtros do Nine-Box. Os dois escreviam no
 * MESMO estado (`cicloSelecionadoId`), então o segundo era redundante e foi
 * removido a pedido do usuário — o do topo é o único.
 *
 * Esta guarda prende as duas pontas da decisão:
 *   • na BARRA de filtros só restam os combobox de Departamento e Cargo;
 *   • ninguém na cadeia (`NineBoxFiltros` → `NineBoxTab` → `AvaliacaoPage`)
 *     volta a repassar `onCicloId`, e o seletor do topo continua existindo.
 *
 * A leitura dos arquivos é proposital (o mesmo padrão de
 * `FeedbacksAlinhamentoLateral.test.tsx`): o que se quer travar é a AUSÊNCIA de
 * um laço de estado entre a página e a aba, e isso não aparece no DOM.
 */

const ler = (relativo: string) => fs.readFileSync(path.resolve(process.cwd(), relativo), 'utf8');

const FILTROS = ler('src/components/avaliacao/NineBoxFiltros.tsx');
const TAB = ler('src/components/avaliacao/NineBoxTab.tsx');
const PAGINA = ler('src/pages/AvaliacaoPage.tsx');

/** Props obrigatórias da barra — só o que o teste exercita. */
const propsBase = {
  busca: '',
  onBusca: vi.fn(),
  departamento: '',
  onDepartamento: vi.fn(),
  departamentos: ['Tecnologia', 'Recursos Humanos'],
  cargo: '',
  onCargo: vi.fn(),
  cargos: ['Desenvolvedor Frontend'],
  comPdi: false,
  onComPdi: vi.fn(),
  emAtencao: false,
  onEmAtencao: vi.fn(),
  comparar: false,
  onComparar: vi.fn(),
  filtrosAtivos: 0,
  onLimpar: vi.fn(),
};

describe('Nine-Box — seletor de ciclo único (só o do topo)', () => {
  it('a barra de filtros tem exatamente dois combobox: Departamento e Cargo', () => {
    render(<NineBoxFiltros {...propsBase} />);

    const combos = screen.getAllByRole('combobox');
    expect(combos.map((c) => c.getAttribute('aria-label'))).toEqual(['Departamento', 'Cargo']);
  });

  it('não existe mais o seletor "Ciclo em visão" (nem a opção "Todos os ciclos")', () => {
    render(<NineBoxFiltros {...propsBase} />);

    expect(screen.queryByRole('combobox', { name: 'Ciclo em visão' })).toBeNull();
    // Sem o `Select` de ciclo, o rótulo e a opção "todos" saem do componente.
    expect(FILTROS).not.toContain('Todos os ciclos');
  });

  it('"Comparar ciclos" continua na barra e dispara o comparativo', () => {
    const onComparar = vi.fn();
    render(<NineBoxFiltros {...propsBase} onComparar={onComparar} />);

    fireEvent.click(screen.getByRole('button', { name: /Comparar ciclos/ }));
    expect(onComparar).toHaveBeenCalledWith(true);
  });

  it('nenhum arquivo da cadeia repassa `onCicloId` (o ciclo vem do chrome da área)', () => {
    for (const [nome, fonte] of Object.entries({ NineBoxFiltros: FILTROS, NineBoxTab: TAB, AvaliacaoPage: PAGINA })) {
      expect(fonte, `${nome} não deve mais repassar onCicloId`).not.toContain('onCicloId');
    }

    // O seletor do topo — o que o usuário pediu para manter — segue no lugar.
    expect(PAGINA).toContain('placeholder="Selecionar ciclo"');
  });
});
