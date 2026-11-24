/**
 * ============================================================================
 * DETECTOR DE REACT DUPLICADO — guarda-corpo de DESENVOLVIMENTO (dev-only)
 * ============================================================================
 *
 * SINTOMA QUE ELE EXPLICA
 * -----------------------
 *     "Cannot read properties of null (reading 'useState')"
 * é o TypeError que aparece quando um hook roda com o dispatcher nulo — ou seja,
 * `ReactSharedInternals.H` era `null` no instante da chamada (ver
 * `resolveDispatcher()` em `react.development.js`). Duas causas possíveis:
 *
 *   1. o hook rodou FORA de um render (violação das regras de hooks) — pego pelo
 *      ESLint (`react-hooks/rules-of-hooks`), não por este módulo; ou
 *   2. existem DUAS CÓPIAS de React na página: a que renderiza é uma, a que
 *      executa o hook é a outra. Só a cópia que renderizou tem dispatcher.
 *
 * Em Vite a causa 2 tem assinatura objetiva. Em DEV as dependências são servidas
 * como `/node_modules/.vite/deps/react.js?v=<hash>`; quando o cache é
 * re-otimizado (dep nova descoberta por rota lazy, `optimizeDeps.include`,
 * upgrade, restart do servidor) o hash muda. Uma ABA ABERTA ANTES da troca
 * mantém o módulo antigo em memória e baixa o novo ao abrir outra rota → duas
 * cópias de React no mesmo documento.
 *
 * O QUE ELE DETECTA
 * -----------------
 *  1. Mais de uma URL para o MESMO arquivo de React/ReactDOM na aba
 *     (`?v=<hash>` distintos) → duplicata comprovada;
 *  2. `react` e `react-dom` com versões diferentes (par inválido);
 *  3. a mensagem `Invalid hook call` que o próprio React imprime — o detector
 *     acrescenta o diagnóstico e o comando de recuperação ao lado dela;
 *  4. o TypeError final (`Cannot read properties of null (reading 'use…')`),
 *     vindo por `console.error` ou por `window.onerror`, com instrução de
 *     recuperação em vez de stack cru;
 *  5. duas avaliações distintas do módulo React no mesmo processo (sentinela em
 *     `globalThis`) — cobre HMR/grafo duplicado;
 *  6. falha de import dinâmico (`vite:preloadError`) — primeiro sinal de dep
 *     re-otimizada (hash antigo → 504 "Outdated Optimize Dep").
 *
 * COLETA DAS URLS
 * ---------------
 * O buffer de resource timing do Chromium tem 250 entradas e este app o enche no
 * boot; por isso a coleta usa `PerformanceObserver` (entradas ao vivo) além do
 * buffer, que também é ampliado com `setResourceTimingBufferSize`.
 *
 * LIMITES (o que ele NÃO faz)
 * ---------------------------
 *  • Só vê o que a aba realmente BAIXOU; uma cópia instalada mas nunca
 *    requisitada não aparece;
 *  • Não corrige nada: não recarrega a página, não mexe em storage, não altera
 *    UI, não toca em componentes. Observa e reporta no console;
 *  • Não substitui o ESLint nem o teste de layout protegido.
 *
 * EM PRODUÇÃO É INERTE: o primeiro `if` é `import.meta.env.DEV` (o Vite troca por
 * `false` no build) e este módulo NÃO importa nada — nem `react`, nem `react-dom`.
 * As versões/módulo chegam por parâmetro de `src/main.tsx`. Resultado: no build
 * de produção a chamada e o módulo inteiro saem do bundle (tree-shaking) e nada
 * é logado.
 *
 * RELATÓRIO MANUAL (a qualquer momento, no console do DevTools):
 *     __dpDiagnosticoReact()
 * ============================================================================
 */

/** Prefixo único no console — facilita filtrar (`DP/react`). */
const PREFIXO = '[DP/react]';

/** Sentinela global usada para detectar grafo duplicado (HMR / duas cópias). */
const CHAVE_SENTINELA = '__DP_MODULO_REACT__';

/** Comando que o usuário deve rodar quando a duplicata vem do cache em disco. */
const COMANDO_RECUPERACAO = 'npm run dev:clean';

/**
 * Arquivos que o Vite serve em DEV para o React e derivados:
 *   react.js · react_jsx-runtime.js · react_jsx-dev-runtime.js ·
 *   react-dom.js · react-dom_client.js
 */
const MODULO_REACT_RE = /\/deps\/(react(?:-dom(?:_client)?|_jsx(?:-dev)?-runtime)?)\.js$/i;

/** `Invalid hook call` — mensagem do React em `resolveDispatcher()`. */
const INVALID_HOOK_RE = /Invalid hook call/i;

/** TypeError que sobra quando o hook roda com dispatcher nulo. */
const DISPATCHER_NULO_RE =
  /Cannot read propert(?:y|ies) of null \(reading '(?:use[A-Za-z]+|readContext)'\)/;

export interface ModuloReactCarregado {
  /** Nome do arquivo servido (ex.: `react.js`, `react-dom_client.js`). */
  modulo: string;
  /** URLs completas (com `?v=<hash>`). Mais de uma = mais de uma cópia. */
  urls: string[];
}

export interface AnaliseModulosReact {
  modulos: ModuloReactCarregado[];
  /** `true` quando algum arquivo do React foi baixado mais de uma vez. */
  duplicado: boolean;
}

export interface RelatorioReact {
  versaoReact: string | null;
  versaoReactDom: string | null;
  /** `react` e `react-dom` na mesma versão (par válido). */
  versoesCompativeis: boolean;
  modulos: ModuloReactCarregado[];
  /** Alguma cópia duplicada de React/ReactDOM na aba. */
  duplicado: boolean;
  /** Mensagens legíveis — vazio quando está tudo certo. */
  problemas: string[];
}

/** Nome do módulo React a partir da URL de DEV — `null` se não for um deles. */
export function nomeDoModuloReact(url: string): string | null {
  const encontrado = url.split('?')[0].match(MODULO_REACT_RE);
  return encontrado ? `${encontrado[1]}.js` : null;
}

/**
 * Agrupa as URLs carregadas por arquivo. Duplicata = mesmo arquivo com mais de
 * uma URL distinta (hash diferente ou caminho diferente).
 */
export function analisarModulosReact(urls: readonly string[]): AnaliseModulosReact {
  const porModulo = new Map<string, Set<string>>();
  for (const url of urls) {
    const modulo = nomeDoModuloReact(url);
    if (!modulo) continue;
    const conjunto = porModulo.get(modulo) ?? new Set<string>();
    conjunto.add(url);
    porModulo.set(modulo, conjunto);
  }

  const modulos = [...porModulo.entries()]
    .map(([modulo, conjunto]) => ({ modulo, urls: [...conjunto].sort() }))
    // Ordenação ASCII explícita (não `localeCompare`): a ordem precisa ser igual
    // em qualquer locale/máquina, senão o relatório muda de formato por ambiente.
    .sort((a, b) => (a.modulo < b.modulo ? -1 : a.modulo > b.modulo ? 1 : 0));

  return { modulos, duplicado: modulos.some((m) => m.urls.length > 1) };
}

/** Monta o relatório completo — função pura, testável sem browser. */
export function montarRelatorio(entrada: {
  versaoReact: string | null;
  versaoReactDom: string | null;
  urls: readonly string[];
}): RelatorioReact {
  const analise = analisarModulosReact(entrada.urls);
  const problemas: string[] = [];

  for (const modulo of analise.modulos) {
    if (modulo.urls.length > 1) {
      problemas.push(`${modulo.urls.length} cópias de ${modulo.modulo} carregadas na mesma aba`);
    }
  }

  const versoesCompativeis =
    entrada.versaoReact !== null &&
    entrada.versaoReactDom !== null &&
    entrada.versaoReact === entrada.versaoReactDom;
  if (!versoesCompativeis) {
    problemas.push(
      `react@${entrada.versaoReact ?? '?'} e react-dom@${entrada.versaoReactDom ?? '?'} ` +
        'não são a mesma versão',
    );
  }

  return {
    versaoReact: entrada.versaoReact,
    versaoReactDom: entrada.versaoReactDom,
    versoesCompativeis,
    modulos: analise.modulos,
    duplicado: analise.duplicado,
    problemas,
  };
}

/**
 * URLs de módulos React vistos nesta aba.
 *
 * Por que não ler só `performance.getEntriesByType('resource')`: o buffer de
 * resource timing do Chromium tem 250 entradas por padrão e este app (dev, com
 * PWA + centenas de módulos) enche o buffer no boot. Depois disso novas
 * requisições NÃO entram na lista e a duplicata passaria batida. Solução:
 * aumentar o buffer e, principalmente, observar as entradas ao vivo com
 * `PerformanceObserver` — o observer recebe cada resposta mesmo com o buffer
 * cheio.
 */
const urlsReact = new Set<string>();

function registrarUrlReact(url: string): void {
  if (nomeDoModuloReact(url) !== null) urlsReact.add(url);
}

/** URLs de módulos React já baixados (buffer + observadas ao vivo). */
function coletarUrlsDeModulos(): string[] {
  if (typeof performance === 'undefined') return [...urlsReact];
  if (typeof performance.getEntriesByType === 'function') {
    for (const entrada of performance.getEntriesByType('resource')) {
      registrarUrlReact(entrada.name);
    }
  }
  return [...urlsReact];
}

/** Liga o observer de recursos e amplia o buffer (best effort). */
function observarRecursos(): void {
  if (typeof performance !== 'undefined') {
    if (typeof performance.setResourceTimingBufferSize === 'function') {
      // O buffer guarda o histórico; ampliar evita perder carregamentos tardios.
      performance.setResourceTimingBufferSize(5000);
    }
    coletarUrlsDeModulos();
  }

  if (typeof PerformanceObserver === 'undefined') return;
  try {
    // Observers recebem entradas ao vivo mesmo com o buffer saturado.
    const observador = new PerformanceObserver((lista) => {
      for (const entrada of lista.getEntries()) registrarUrlReact(entrada.name);
    });
    observador.observe({ type: 'resource', buffered: true });
  } catch {
    // Navegador sem `PerformanceObserver` para recursos: resta o buffer acima.
  }
}

/**
 * Referências que o detector precisa e que vêm de `src/main.tsx` (para este
 * módulo não importar `react`/`react-dom` e sair inteiro do bundle de produção).
 */
export interface ReferenciasReact {
  /** Namespace do módulo `react` — usado só na sentinela de instância única. */
  modulo: unknown;
  /** `React.version`. */
  versaoReact: string | null;
  /** `version` exportado por `react-dom`. */
  versaoReactDom: string | null;
}

/** Preenchido por `instalarDetectorReactDuplicado()`; `null` = não instalado. */
let referencias: ReferenciasReact | null = null;

/** Relatório na hora — é o que fica exposto como `window.__dpDiagnosticoReact()`. */
function relatorioDaAba(): RelatorioReact {
  return montarRelatorio({
    versaoReact: referencias?.versaoReact ?? null,
    versaoReactDom: referencias?.versaoReactDom ?? null,
    urls: coletarUrlsDeModulos(),
  });
}

/** Evita recursão: o diagnóstico usa `console.warn` e o patch observa `console.error`. */
let emitindoDiagnostico = false;

/**
 * Uma falha de hook costuma gerar várias mensagens (o React repete o aviso por
 * componente e o mesmo erro chega por `console.error` e por `window.onerror`).
 * O cooldown consolida tudo num único bloco legível.
 */
const COOLDOWN_DIAGNOSTICO_MS = 2000;
/** `0` (epoch) = nunca diagnosticou; `Date.now()` é sempre muito maior que o cooldown. */
let ultimoDiagnosticoEm = 0;

function logar(relatorio: RelatorioReact, motivo: string): void {
  console.warn(
    `${PREFIXO} ⚠ ${motivo}\n` +
      `  react@${relatorio.versaoReact ?? '?'} · react-dom@${relatorio.versaoReactDom ?? '?'}\n` +
      `  ${relatorio.problemas.join('\n  ')}`,
  );

  if (relatorio.duplicado) {
    for (const modulo of relatorio.modulos) {
      if (modulo.urls.length > 1) {
        console.warn(`${PREFIXO}   ${modulo.modulo}:\n    ${modulo.urls.join('\n    ')}`);
      }
    }
    console.warn(
      `${PREFIXO} → Causa: o cache de deps do Vite foi re-otimizado com a aba aberta; ` +
        'a aba ficou com dois React (um com dispatcher, outro sem).\n' +
        `${PREFIXO} → Correção imediata: recarregue a aba (F5).\n` +
        `${PREFIXO} → Se voltar a acontecer: pare o dev server, rode \`${COMANDO_RECUPERACAO}\` ` +
        '(limpa node_modules/.vite) e abra a aba de novo.',
    );
  } else if (!relatorio.versoesCompativeis) {
    console.warn(
      `${PREFIXO} → Causa: versões diferentes de react e react-dom.\n` +
        `${PREFIXO} → Correção: alinhe as duas versões no package.json e rode \`npm install\`.`,
    );
  }
}

/**
 * Explica `Invalid hook call` / dispatcher nulo no momento em que acontecem,
 * sem impedir a mensagem original do React de aparecer.
 */
function diagnosticarFalhaDeHook(): void {
  if (emitindoDiagnostico) return;
  const agora = Date.now();
  if (agora - ultimoDiagnosticoEm < COOLDOWN_DIAGNOSTICO_MS) return;
  ultimoDiagnosticoEm = agora;
  emitindoDiagnostico = true;
  try {
    const relatorio = relatorioDaAba();
    if (relatorio.problemas.length > 0) {
      logar(relatorio, 'Hook executado com dispatcher nulo (Invalid hook call).');
    } else {
      console.warn(
        `${PREFIXO} ⚠ Hook executado com dispatcher nulo, mas NÃO há React duplicado nem par de ` +
          'versões inválido.\n' +
          `${PREFIXO}   Causa provável: hook chamado fora do corpo de um componente/hook.\n` +
          `${PREFIXO}   Onde procurar: \`npm run lint\` (regra react-hooks/rules-of-hooks).\n` +
          `${PREFIXO}   Outra possibilidade: componente chamado como função — \`Componente()\` em ` +
          'vez de `<Componente />` — ou hook executado em outro root React.',
      );
    }
  } finally {
    emitindoDiagnostico = false;
  }
}

/** Passa a observar `console.error` (é por ele que o React reporta o problema). */
function observarConsoleError(): void {
  const original = console.error;
  console.error = function consoleErrorObservado(...args: unknown[]): void {
    original.apply(console, args);
    if (emitindoDiagnostico) return;
    const texto = args.map((arg) => String(arg)).join(' ');
    if (INVALID_HOOK_RE.test(texto) || DISPATCHER_NULO_RE.test(texto)) {
      diagnosticarFalhaDeHook();
    }
  };
}

/** Rede de segurança: erro que escapou do ErrorBoundary / do React.lazy. */
function observarErrosGlobais(): void {
  window.addEventListener('error', (evento) => {
    if (DISPATCHER_NULO_RE.test(evento.message ?? '')) {
      diagnosticarFalhaDeHook();
    }
  });
}

/**
 * O client do Vite dispara `vite:preloadError` quando um import dinâmico (rota
 * lazy) falha. Depois de uma re-otimização de deps o hash antigo responde 504
 * ("Outdated Optimize Dep") e esse evento é o primeiro sinal do problema — vale
 * explicar antes de o usuário ver só "Failed to fetch dynamically imported
 * module".
 */
function observarFalhaDePreloadVite(): void {
  // `VitePreloadErrorEvent` (vite/client) carrega o erro em `payload`.
  window.addEventListener('vite:preloadError', (evento) => {
    const detalhe = evento.payload;
    const texto = detalhe instanceof Error ? detalhe.message : String(detalhe ?? '');
    console.warn(
      `${PREFIXO} ⚠ Falha ao carregar módulo dinâmico (vite:preloadError)${texto ? `: ${texto}` : ''}\n` +
        `${PREFIXO} → Sinal típico de dep re-otimizada: a aba pediu um \`?v=<hash>\` que já não existe.\n` +
        `${PREFIXO} → Correção imediata: recarregue a aba (F5). Se persistir: \`${COMANDO_RECUPERACAO}\`.`,
    );
  });
}

/**
 * Verifica a integridade e loga.
 * @param silencioso quando `true`, só fala se houver problema (checagem tardia).
 */
function verificar(silencioso: boolean): void {
  const relatorio = relatorioDaAba();
  if (relatorio.problemas.length > 0) {
    logar(relatorio, 'React em estado inconsistente nesta aba.');
    return;
  }
  if (!silencioso) {
    console.debug(
      `${PREFIXO} OK — react@${relatorio.versaoReact} + react-dom@${relatorio.versaoReactDom}, ` +
        `sem duplicata (${relatorio.modulos.map((m) => m.modulo).join(', ') ||
          'nenhum módulo visto ainda'}).`,
    );
  }
}

/**
 * Instala o detector. Idempotente e inerte fora de DEV — chame uma única vez,
 * antes de `createRoot(...).render(...)` (ver `src/main.tsx`).
 *
 * @param refs módulo `react` e as versões de `react`/`react-dom`, repassados
 *             pelo ponto de entrada (este módulo não importa React).
 */
export function instalarDetectorReactDuplicado(refs: ReferenciasReact): void {
  if (!import.meta.env.DEV) return;
  if (typeof window === 'undefined') return;
  if (referencias !== null) return;
  referencias = refs;

  // Sentinela: se duas cópias do módulo React forem avaliadas no mesmo processo
  // (grafo duplicado / HMR), a segunda referência é diferente da primeira.
  const escopo = globalThis as unknown as Record<string, unknown>;
  const anterior = escopo[CHAVE_SENTINELA];
  if (anterior !== undefined && anterior !== refs.modulo) {
    console.warn(
      `${PREFIXO} ⚠ Duas instâncias do módulo React neste documento — o hook pode rodar numa ` +
        `delas sem dispatcher. Recarregue a aba; se persistir, rode \`${COMANDO_RECUPERACAO}\`.`,
    );
  }
  escopo[CHAVE_SENTINELA] = refs.modulo;

  observarRecursos();
  observarConsoleError();
  observarErrosGlobais();
  observarFalhaDePreloadVite();

  // Relatório sob demanda no console do DevTools.
  Object.assign(window, { __dpDiagnosticoReact: relatorioDaAba });

  verificar(false);

  // Checagem tardia: rotas lazy puxam módulos depois do boot. Silenciosa quando
  // está tudo certo — só fala se a duplicata aparecer no meio da sessão.
  window.addEventListener('load', () => verificar(true));
  window.setTimeout(() => verificar(true), 5000);
}
