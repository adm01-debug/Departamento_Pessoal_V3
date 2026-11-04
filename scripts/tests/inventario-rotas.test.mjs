// Contrato de scripts/inventario/gerar-rotas.mjs no DP V3: rotas aninhadas do App.tsx, protecao herdada,
// menu do AppSidebar e problemas (menu sem rota, menu visivel para rota admin, import quebrado).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gerarRotas, lerTagsDeRota, juntarCaminho, casaRota, extrairChamadas, semComentarios } from '../inventario/gerar-rotas.mjs';

const raizReal = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function repo(t, arquivos) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'inv-rotas-'));
  t.after(() => fs.rmSync(raiz, { recursive: true, force: true }));
  for (const [rel, conteudo] of Object.entries(arquivos)) {
    fs.mkdirSync(path.dirname(path.join(raiz, rel)), { recursive: true });
    fs.writeFileSync(path.join(raiz, rel), conteudo);
  }
  return raiz;
}

const APP = `import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout';
import LoginPage from '@/pages/LoginPage';
const FolhaPage = lazy(() => import('@/pages/FolhaPage'));
const UsuariosPage = lazy(() => import('@/pages/UsuariosPage'));
const PublicaPage = lazy(() => import('@/pages/PublicaPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="folha" element={<LazyPage Component={FolhaPage} />} />
        <Route path="folha/:id" element={<LazyPage Component={FolhaPage} />} />
        {/* comentario com 'aspas' */}
        <Route
          path="usuarios"
          element={
            <AdminRoute>
              <LazyPage Component={UsuariosPage} />
            </AdminRoute>
          }
        />
        <Route path="*" element={<LazyPage Component={NotFoundPage} />} />
      </Route>
      <Route path="/publica" element={<Suspense fallback={<PageLoader />}><PublicaPage /></Suspense>} />
    </Routes>
  );
}`;

const MENU = `const menuGroups: MenuGroup[] = [
  {
    id: 'remuneracao',
    label: 'Remuneração',
    icon: Wallet,
    color: 'x',
    items: [
      { icon: Wallet, label: 'Folha de Pagamento', path: '/folha', color: 'x' },
      { icon: Users, label: 'Usuários', path: '/usuarios', color: 'x' },
      {
        icon: FileText,
        label: 'Fantasma',
        path: '/nao-existe',
        color: 'x',
      },
    ],
  },
];

const portalItem: MenuItem = { icon: UserCircle, label: 'Meu Portal', path: '/portal', color: 'x' };
`;

test('caminhos aninhados, index, protecao herdada e admin', (t) => {
  const raiz = repo(t, {
    'src/App.tsx': APP,
    'src/components/layout/AppSidebar.tsx': MENU,
    'src/components/layout/index.ts': "export const MainLayout = () => null;\n",
    'src/pages/LoginPage.tsx': 'export default () => null;\n',
    'src/pages/FolhaPage.tsx': "import { useFolha } from '@/hooks/useFolha';\nimport { x } from './naoExiste';\n// import { y } from './comentado';\nexport default () => null;\n",
    'src/hooks/useFolha.ts': "export const useFolha = () => supabase.from('folhas_pagamento').select('*') && supabase.functions.invoke('calcular-folha') && supabase.rpc('fechar_folha');\n",
    'src/pages/UsuariosPage.tsx': 'export default () => null;\n',
    'src/pages/PublicaPage.tsx': 'export default () => null;\n',
    'src/pages/NotFoundPage.tsx': 'export default () => null;\n',
  });
  const inv = gerarRotas(raiz);
  const url = (c, comp) => inv.urls.find((u) => u.caminho === c && (!comp || u.componente === comp));
  assert.equal(url('/login').protegida, false);
  assert.equal(url('/', 'MainLayout').layout, true);
  assert.equal(inv.urls.find((u) => u.caminho === '/' && u.redireciona).redireciona, 'dashboard');
  assert.deepEqual([url('/folha').protegida, url('/folha').admin, url('/folha').arquivo], [true, false, 'src/pages/FolhaPage.tsx']);
  assert.deepEqual([url('/usuarios').admin, url('/usuarios').componente], [true, 'UsuariosPage']);
  assert.equal(url('/publica').componente, 'PublicaPage', 'fallback local (PageLoader) nao e a tela');
  assert.ok(url('/*'));

  const folha = inv.telas.find((t2) => t2.arquivo === 'src/pages/FolhaPage.tsx');
  assert.deepEqual(folha.urls, ['/folha', '/folha/:id']);
  assert.deepEqual(folha.menu, [{ grupo: 'Remuneração', rotulo: 'Folha de Pagamento' }]);
  assert.deepEqual([folha.tabelas, folha.edges, folha.rpcs], [['folhas_pagamento'], ['calcular-folha'], ['fechar_folha']]);
  assert.deepEqual(folha.hooks, [{ nome: 'useFolha', arquivo: 'src/hooks/useFolha.ts' }]);

  const tipos = inv.problemas.map((p) => `${p.tipo} ${p.id}`).sort();
  assert.deepEqual(tipos, [
    'import_quebrado src/pages/FolhaPage.tsx',
    'menu_aponta_rota_admin /usuarios',
    'menu_sem_rota /nao-existe',
    'menu_sem_rota /portal',
  ]);
  assert.ok(!inv.problemas.some((p) => p.detalhe.includes('comentado')), 'import comentado nao conta');
});

test('helpers: tags com > dentro de element, juntar caminho e casar padrao', () => {
  const tags = lerTagsDeRota('<Routes><Route path="/" element={<A>{x > 1}</A>}><Route path="b" element={<B />} /></Route></Routes>');
  assert.equal(tags.length, 2);
  assert.equal(tags[1].pai, tags[0]);
  assert.equal(juntarCaminho('/', 'b'), '/b');
  assert.equal(juntarCaminho('/admin', 'sst/cat'), '/admin/sst/cat');
  assert.equal(juntarCaminho('/x', '/abs'), '/abs');
  assert.equal(casaRota('/colaboradores/123', ['/colaboradores/:id']), true);
  assert.equal(casaRota('/qualquer', ['/*']), false, 'o * do NotFound nao conta como rota');
  assert.deepEqual(extrairChamadas("supabase.storage.from('docs'); supabase.from('ferias')").buckets, ['docs']);
  assert.equal(semComentarios("const u = 'https://x';\n// import a from 'b';\n/* c */").includes('https://x'), true);
});

// Mesmo gate do Zapp: so a parte estrutural (URLs, telas, menu, problemas). Hooks/tabelas de cada tela
// mudam a todo PR de front e ficam para o inventario semanal.
test('rotas.json commitado esta em dia na parte estrutural (rode node scripts/inventario/gerar-rotas.mjs)', () => {
  const estrutura = (inv) => ({
    urls: inv.urls,
    menu: inv.menu,
    telas: inv.telas.map(({ arquivo, componente, urls, menu }) => ({ arquivo, componente, urls, menu })),
    problemas: inv.problemas,
  });
  const commitado = JSON.parse(fs.readFileSync(path.join(raizReal, 'inventario/estado/rotas.json'), 'utf8'));
  assert.deepEqual(estrutura(commitado), estrutura(gerarRotas(raizReal)),
    'inventario/estado/rotas.json desatualizado: rode node scripts/inventario/gerar-rotas.mjs e commite');
});
