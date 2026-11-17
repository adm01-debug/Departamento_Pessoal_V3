import { describe, expect, it } from 'vitest';
import { menuGroups } from '@/components/layout/AppSidebar';

// Valida a config de dados do menu — é ela que decide para onde cada item
// navega (via `to={item.path}` no NavLink). Ver a justificativa de não montar
// o AppSidebar inteiro no comentário acima de `menuGroups`.

const todosOsItens = menuGroups.flatMap((g) => g.items.map((i) => ({ ...i, grupo: g.id })));

describe('AppSidebar — config do menu', () => {
  it.each([
    ['estrutura', 'Empresas', '/empresas'],
    ['estrutura', 'Cargos', '/cargos'],
    ['estrutura', 'Departamentos', '/departamentos'],
    // Centros de Custo: a rota `/centros-custo` está registrada em App.tsx
    // desde antes, mas não tinha entrada no menu — a página existia sem
    // nenhum caminho de navegação até ela.
    ['estrutura', 'Centros de Custo', '/centros-custo'],
    ['estrutura', 'Locais de Trabalho', '/locais-trabalho'],
    // `/faltas` e `/obrigacoes-fiscais`: rotas registradas em App.tsx com
    // página pronta (485 e 506 linhas) e nenhuma entrada de menu — telas
    // inalcançáveis. Nem a branch `muri` as tinha; a lacuna era da main.
    ['tempo-ausencias', 'Faltas', '/faltas'],
    ['remuneracao', 'Obrigações Fiscais', '/obrigacoes-fiscais'],
    ['gestao-pessoas', 'Times', '/times'],
    ['gestao-pessoas', 'Lotações', '/lotacoes'],
  ])('grupo "%s" contém "%s" apontando para "%s"', (grupo, label, path) => {
    expect(todosOsItens).toContainEqual(expect.objectContaining({ grupo, label, path }));
  });

  // `/sst` aparece duas vezes ("Visão Geral SST" no grupo SST e "SST" em
  // Administração) na main E na muri — é sobra anterior às duas, não desta
  // mudança, e sair daqui seria escopo que o dono não pediu. Fica registrada
  // para que o teste trave QUALQUER duplicata nova sem mascarar esta.
  const DUPLICATAS_CONHECIDAS = ['/sst'];

  it('não introduz rota repetida no menu', () => {
    const paths = todosOsItens.map((i) => i.path);
    const repetidas = [...new Set(paths.filter((p, i) => paths.indexOf(p) !== i))];
    expect(repetidas).toEqual(DUPLICATAS_CONHECIDAS);
  });

  it('todo item tem label e rota absoluta não vazias', () => {
    for (const item of todosOsItens) {
      expect(item.label.trim()).not.toBe('');
      expect(item.path).toMatch(/^\//);
    }
  });
});
