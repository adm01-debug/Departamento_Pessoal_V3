import { describe, it, expect } from 'vitest';
import { menuGroups } from '@/components/layout/AppSidebar';

// Valida a config de dados do grupo "Estrutura" (o que decide para onde cada
// item do menu navega, via `to={item.path}` no NavLink) — ver justificativa
// para não montar o AppSidebar inteiro no comentário acima de `menuGroups`.

describe('AppSidebar — menu "Estrutura"', () => {
  const estrutura = menuGroups.find((g) => g.id === 'estrutura');

  it('existe o grupo "Estrutura"', () => {
    expect(estrutura).toBeDefined();
  });

  it.each([
    ['Empresas', '/empresas'],
    ['Cargos', '/cargos'],
    ['Departamentos', '/departamentos'],
    ['Times & Equipes', '/times'],
    ['Centros de Custo', '/centros-custo'],
    ['Locais de Trabalho', '/locais-trabalho'],
    ['Lotações', '/lotacoes'],
  ])('contém o item "%s" apontando para "%s"', (label, path) => {
    expect(estrutura?.items).toContainEqual(expect.objectContaining({ label, path }));
  });

  it('não duplica nenhuma rota dentro do grupo', () => {
    const paths = estrutura?.items.map((i) => i.path) ?? [];
    expect(new Set(paths).size).toBe(paths.length);
  });
});
