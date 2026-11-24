/**
 * Testes do detector de React duplicado (`src/lib/detectorReactDuplicado.ts`).
 *
 * Cobrem só a parte pura (reconhecimento das URLs de DEV do Vite, agrupamento
 * por arquivo e montagem do relatório). O que depende de `performance`/`window`
 * é exercitado no navegador (dev server), não aqui.
 */
import { describe, expect, it } from 'vitest';
import {
  analisarModulosReact,
  montarRelatorio,
  nomeDoModuloReact,
} from './detectorReactDuplicado';

/** URLs como o Vite 8 serve em DEV (`?v=<hash>` = uma otimização de deps). */
const REACT_HASH_A = '/node_modules/.vite/deps/react.js?v=19d7921e';
const REACT_HASH_B = '/node_modules/.vite/deps/react.js?v=3f2a91cc';
const REACT_DOM_A = '/node_modules/.vite/deps/react-dom_client.js?v=7f30ff93';
const REACT_DOM_B = '/node_modules/.vite/deps/react-dom_client.js?v=aa11bb22';
const JSX_DEV = '/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=19d7921e';
const JSX_RUNTIME = '/node_modules/.vite/deps/react_jsx-runtime.js?v=19d7921e';
const REACT_DOM_LEGACY = '/node_modules/.vite/deps/react-dom.js?v=19d7921e';

describe('nomeDoModuloReact', () => {
  it('reconhece os arquivos servidos pelo Vite para React e ReactDOM', () => {
    expect(nomeDoModuloReact(REACT_HASH_A)).toBe('react.js');
    expect(nomeDoModuloReact(REACT_DOM_A)).toBe('react-dom_client.js');
    expect(nomeDoModuloReact(REACT_DOM_LEGACY)).toBe('react-dom.js');
    expect(nomeDoModuloReact(JSX_DEV)).toBe('react_jsx-dev-runtime.js');
    expect(nomeDoModuloReact(JSX_RUNTIME)).toBe('react_jsx-runtime.js');
  });

  it('funciona sem query string (URL limpa)', () => {
    expect(nomeDoModuloReact('/node_modules/.vite/deps/react-dom.js')).toBe('react-dom.js');
  });

  it('ignora URLs que não são módulos do React', () => {
    expect(nomeDoModuloReact('/node_modules/.vite/deps/react-router-dom.js?v=1')).toBeNull();
    expect(nomeDoModuloReact('/node_modules/.vite/deps/lucide-react.js?v=1')).toBeNull();
    expect(nomeDoModuloReact('/src/main.tsx')).toBeNull();
  });
});

describe('analisarModulosReact', () => {
  it('uma URL por arquivo → sem duplicata', () => {
    const analise = analisarModulosReact([REACT_HASH_A, REACT_DOM_A, JSX_DEV, JSX_RUNTIME]);

    expect(analise.duplicado).toBe(false);
    // Ordem ASCII: `-` < `.` < `_`
    expect(analise.modulos.map((m) => m.modulo)).toEqual([
      'react-dom_client.js',
      'react.js',
      'react_jsx-dev-runtime.js',
      'react_jsx-runtime.js',
    ]);
    expect(analise.modulos.every((m) => m.urls.length === 1)).toBe(true);
  });

  it('mesmo arquivo com dois hashes → duplicata (caso "useState de null")', () => {
    const analise = analisarModulosReact([REACT_HASH_A, REACT_HASH_B, REACT_DOM_A]);

    expect(analise.duplicado).toBe(true);
    const react = analise.modulos.find((m) => m.modulo === 'react.js');
    expect(react?.urls).toEqual([REACT_HASH_A, REACT_HASH_B]);
    // ReactDOM com uma só URL continua listado, mas não é a duplicata.
    expect(analise.modulos.find((m) => m.modulo === 'react-dom_client.js')?.urls).toEqual([
      REACT_DOM_A,
    ]);
  });

  it('duplicata só em react-dom também é detectada', () => {
    const analise = analisarModulosReact([REACT_HASH_A, REACT_DOM_A, REACT_DOM_B]);
    expect(analise.duplicado).toBe(true);
  });

  it('URL repetida (mesma query) NÃO é duplicata — é o mesmo módulo', () => {
    const analise = analisarModulosReact([REACT_HASH_A, REACT_HASH_A]);
    expect(analise.duplicado).toBe(false);
    expect(analise.modulos[0].urls).toHaveLength(1);
  });

  it('lista vazia (nada carregado ainda) é válida', () => {
    expect(analisarModulosReact([])).toEqual({ modulos: [], duplicado: false });
  });
});

describe('montarRelatorio', () => {
  it('cópia única e versões iguais → sem problemas', () => {
    const relatorio = montarRelatorio({
      versaoReact: '19.2.8',
      versaoReactDom: '19.2.8',
      urls: [REACT_HASH_A, REACT_DOM_A, JSX_DEV],
    });

    expect(relatorio.versoesCompativeis).toBe(true);
    expect(relatorio.duplicado).toBe(false);
    expect(relatorio.problemas).toEqual([]);
  });

  it('duas cópias de react.js → problema explícito', () => {
    const relatorio = montarRelatorio({
      versaoReact: '19.2.8',
      versaoReactDom: '19.2.8',
      urls: [REACT_HASH_A, REACT_HASH_B, REACT_DOM_A],
    });

    expect(relatorio.duplicado).toBe(true);
    expect(relatorio.problemas).toContain('2 cópias de react.js carregadas na mesma aba');
  });

  it('react e react-dom em versões diferentes → problema explícito', () => {
    const relatorio = montarRelatorio({
      versaoReact: '19.2.8',
      versaoReactDom: '19.1.0',
      urls: [REACT_HASH_A, REACT_DOM_A],
    });

    expect(relatorio.versoesCompativeis).toBe(false);
    expect(relatorio.problemas.join(' ')).toContain(
      'react@19.2.8 e react-dom@19.1.0 não são a mesma versão',
    );
  });

  it('versão desconhecida (null) conta como incompatível', () => {
    const relatorio = montarRelatorio({
      versaoReact: null,
      versaoReactDom: '19.2.8',
      urls: [],
    });

    expect(relatorio.versoesCompativeis).toBe(false);
    expect(relatorio.problemas.join(' ')).toContain('react@? e react-dom@19.2.8');
  });

  it('acumula os dois problemas quando ambos acontecem', () => {
    const relatorio = montarRelatorio({
      versaoReact: '19.2.8',
      versaoReactDom: '19.1.0',
      urls: [REACT_HASH_A, REACT_HASH_B],
    });

    expect(relatorio.duplicado).toBe(true);
    expect(relatorio.problemas).toHaveLength(2);
  });
});
