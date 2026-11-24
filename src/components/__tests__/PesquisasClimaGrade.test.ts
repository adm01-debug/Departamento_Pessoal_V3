import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * ============================================================================
 * PESQUISAS DE CLIMA & eNPS — A GRADE TERMINA NO ÚLTIMO CARD REAL.
 *
 * Havia DUAS portas para criar pesquisa: o botão "+ Nova Pesquisa" no cabeçalho
 * e um SLOT TRACEJADO no fim da grade ("Criar Nova Pesquisa", com ícone grande
 * de "+" e a chamada "Desenvolva questionários personalizados…"). Era a mesma
 * ação duas vezes na mesma tela — e a segunda ainda cobria uma célula que
 * deveria pertencer a pesquisas de verdade. O slot foi removido; a criação
 * mora só no cabeçalho.
 *
 * O teste lê a FONTE da página (mesma técnica de
 * `PesquisasClimaJanelasCascata.test.tsx`): o arquivo é uma página com Supabase,
 * queries e diálogos, e o que precisa ficar travado aqui é o contrato de
 * composição — o que entra e o que NÃO entra na grade.
 * ============================================================================
 */

const PAGINA = readFileSync(path.resolve(process.cwd(), 'src/pages/PesquisasClimaPage.tsx'), 'utf8');

/** Página sem comentários: a documentação pode citar o nome antigo, o código não. */
const CODIGO = PAGINA.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('PesquisasClimaPage — grade de cartões sem o slot vazio de criação', () => {
  it('não renderiza mais o card "Criar Nova Pesquisa" nem importa o componente', () => {
    expect(CODIGO).not.toMatch(/CardCriarPesquisa/);
    expect(CODIGO).not.toMatch(/Criar Nova Pesquisa/);
    // A chamada do card vazio (título + descrição) não pode sobrar na página.
    expect(CODIGO).not.toMatch(/Desenvolva questionários personalizados/);
    // E o componente foi de fato apagado do projeto.
    expect(existsSync(path.resolve(process.cwd(), 'src/components/pesquisas/CardCriarPesquisa.tsx'))).toBe(false);
  });

  it('a grade é só o mapa das pesquisas filtradas (termina no último card real)', () => {
    const grade = CODIGO.match(
      /<div className="grid min-w-0 grid-cols-1 items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3">([\s\S]*?)<\/div>/
    );

    expect(grade).not.toBeNull();
    const filhos = grade![1];

    // Um único filho: o `map` de `CardPesquisa`. Nada depois dele.
    expect(filhos).toMatch(/pesquisasFiltradas\.map\(\(pesquisa, indice\) => \(/);
    expect(filhos).toMatch(/<CardPesquisa\b/);
    expect(filhos.trim().endsWith('))}')).toBe(true);
    expect(filhos.match(/<([A-Z]\w*)/g)).toEqual(['<CardPesquisa']);
  });

  it('o "+ Nova Pesquisa" do cabeçalho continua sendo a única porta de criação', () => {
    // Exatamente UM gatilho de criação na página: o botão do topo. Antes eram
    // dois (`abrirCriacao` também estava no `onClick` do card tracejado).
    expect(CODIGO.match(/onClick=\{abrirCriacao\}/g)).toHaveLength(1);
    expect(CODIGO).toMatch(/<Button\s+onClick=\{abrirCriacao\}/);
    expect(CODIGO).toMatch(/<Plus className="h-4 w-4" aria-hidden \/> Nova Pesquisa/);

    // E ele abre o diálogo animado de criação (não é decoração).
    expect(CODIGO).toMatch(/function abrirCriacao\(\)\s*\{[\s\S]*?setDialogoAberto\(true\)/);
    expect(CODIGO).toMatch(/editando \? 'Editar rascunho' : 'Nova Pesquisa'/);
  });

  it('o estado vazio aponta para o botão do topo, não para o card removido', () => {
    expect(CODIGO).toMatch(/Use “\+ Nova Pesquisa”, no topo, para montar a primeira\./);
  });
});
