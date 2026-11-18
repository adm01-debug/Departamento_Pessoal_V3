import { test, expect, type Page } from '@playwright/test';

/**
 * ============================================================================
 * RECRUTAMENTO — animação de entrada IGUAL à do Kanban de Admissões
 * ============================================================================
 * As duas telas usam o MESMO mecanismo:
 *   • keyframes CSS em `src/index.css` (`.kanban-column-visual`,
 *     `.kanban-em-entrada`, `.kanban-coluna-concluida`, `.kb-*`, `.kanban-card`);
 *   • o MESMO gatilho compartilhado (`components/kanban/entradaKanban.ts`), que
 *     mede o slot, espera a coluna estar pintada e agenda a troca para
 *     `kanban-coluna-concluida`.
 *
 * Estes testes leem os valores COMPUTADOS no navegador (nome, duração, delay e
 * easing) e comparam Admissão × Recrutamento. Não é comparação de pixel: é a
 * prova de que a mesma coreografia/timing está ligada nos dois boards.
 */

const COL_ADMISSAO = '.kanban-lane-slot';
const VISUAL_ADMISSAO = '.kanban-column-visual';
const COL_PIPELINE = '[data-pipeline-coluna]';
const VISUAL_PIPELINE = '.kanban-column-visual';

test.describe.configure({ mode: 'serial' });

interface LeituraAnimacao {
  nombre: string;
  duracao: string;
  delay: string;
  easing: string;
}

interface LeituraColuna {
  indice: number;
  rotulo: string;
  classe: string;
  altura: number;
  coluna: LeituraAnimacao;
  header: LeituraAnimacao | null;
  card: LeituraAnimacao | null;
  footer: LeituraAnimacao | null;
}

async function medirEntrada(page: Page, seletorColuna: string): Promise<LeituraColuna[]> {
  return page.evaluate((seletor) => {
    const ler = (el: Element | null) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        duracao: cs.animationDuration,
        delay: cs.animationDelay,
        easing: cs.animationTimingFunction,
        nombre: cs.animationName,
      };
    };
    return [...document.querySelectorAll(seletor)].map((slot, indice) => {
      const visual = slot.querySelector('.kanban-column-visual') ?? slot;
      const csVisual = getComputedStyle(visual);
      const rotulo =
        visual.querySelector('h2,h3')?.textContent?.trim() ?? slot.getAttribute('aria-label') ?? String(indice);
      return {
        indice,
        rotulo,
        classe: visual.className?.toString() ?? '',
        altura: Math.round(visual.getBoundingClientRect().height),
        coluna: {
          duracao: csVisual.animationDuration,
          delay: csVisual.animationDelay,
          easing: csVisual.animationTimingFunction,
          nombre: csVisual.animationName,
        },
        header: ler(visual.querySelector('.kb-header')),
        card: ler(visual.querySelector('.kanban-card')),
        footer: ler(visual.querySelector('.kb-footer')),
      };
    });
  }, seletorColuna);
}

async function abrirRecrutamentoNoInicio(page: Page) {
  await page.goto('/recrutamento');
  await page.waitForFunction(
    () => document.querySelector('.kanban-column-visual.kanban-em-entrada') !== null,
    undefined,
    { timeout: 25_000 }
  );
  return medirEntrada(page, COL_PIPELINE);
}

async function abrirAdmissaoNoInicio(page: Page) {
  await page.goto('/admissoes');
  const aba = page.getByRole('tab', { name: 'Kanban' });
  await aba.waitFor({ state: 'visible', timeout: 25_000 });
  await aba.click();
  await page.waitForFunction(
    () => document.querySelector('.kanban-column-visual.kanban-em-entrada') !== null,
    undefined,
    { timeout: 25_000 }
  );
  return medirEntrada(page, COL_ADMISSAO);
}

async function esperarConclusao(page: Page, coluna: string) {
  await expect(page.locator(`${coluna} .kanban-coluna-concluida`).first()).toBeVisible({ timeout: 25_000 });
  await page.waitForFunction(
    (seletor) =>
      document.querySelectorAll(`${seletor} .kanban-coluna-concluida`).length ===
      document.querySelectorAll(seletor).length,
    coluna,
    { timeout: 25_000 }
  );
}

test.describe('Animação do Pipeline × Kanban de Admissões', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test.setTimeout(150_000);

  test('A — entrada idêntica: keyframe, duração, easing e onda de 180ms', async ({ page }) => {
    const rec = await abrirRecrutamentoNoInicio(page);
    expect(rec).toHaveLength(5);
    expect(rec.map((c) => c.rotulo)).toEqual(['Triagem', 'Entrevista', 'Teste Técnico', 'Proposta', 'Contratado']);
    rec.forEach((coluna) => expect(coluna.classe).toContain('kanban-em-entrada'));

    // Fecha a entrada do Recrutamento antes de medir a referência.
    await esperarConclusao(page, COL_PIPELINE);
    const classesFinais = await page.evaluate(() =>
      [...document.querySelectorAll('[data-pipeline-coluna] .kanban-column-visual')].map((el) =>
        el.className.toString()
      )
    );
    expect(classesFinais).toHaveLength(5);
    classesFinais.forEach((classe) => expect(classe).toContain('kanban-coluna-concluida'));
    // Só a animação de entrada some; nada de loop de animação no board.
    const animacoesKanban = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((a) => a.playState === 'running' && /^kanban-/.test((a as CSSAnimation).animationName ?? '')).length
    );
    expect(animacoesKanban).toBe(0);

    const adm = await abrirAdmissaoNoInicio(page);
    expect(adm.length).toBeGreaterThanOrEqual(5);

    const semDelay = (a: LeituraAnimacao | null) =>
      a ? { nombre: a.nombre, duracao: a.duracao, easing: a.easing } : null;
    expect(semDelay(rec[0].coluna)).toEqual(semDelay(adm[0].coluna));
    expect(rec[0].coluna.delay).toBe(adm[0].coluna.delay);
    expect(semDelay(rec[0].header)).toEqual(semDelay(adm[0].header));
    expect(rec[0].header?.delay).toBe(adm[0].header?.delay);
    expect(semDelay(rec[0].footer)).toEqual(semDelay(adm[0].footer));

    // Cards: mesma keyframe/duração/easing e mesmo delay do primeiro card.
    test.skip(!rec[0].card || !adm[0].card, 'Coluna inicial sem cards para comparar o stagger');
    expect(semDelay(rec[0].card)).toEqual(semDelay(adm[0].card));
    expect(rec[0].card?.delay).toBe(adm[0].card?.delay);

    // Onda entre colunas: a 4ª coluna entra 540ms depois da primeira nas duas telas.
    expect(rec[3].coluna.delay).toBe('0.54s');
    expect(rec[3].coluna.delay).toBe(adm[3].coluna.delay);

    await esperarConclusao(page, COL_ADMISSAO);
  });

  test('B — sair e voltar para a aba Pipeline reinicia a entrada', async ({ page }) => {
    await page.goto('/recrutamento');
    await esperarConclusao(page, COL_PIPELINE);

    await page.getByRole('tab', { name: 'Vagas' }).click();
    await page.waitForTimeout(600);
    await page.getByRole('tab', { name: 'Pipeline' }).click();

    await page.waitForFunction(
      () => document.querySelector('.kanban-column-visual.kanban-em-entrada') !== null,
      undefined,
      { timeout: 20_000 }
    );
    const reiniciada = await medirEntrada(page, COL_PIPELINE);
    expect(reiniciada[0].classe).toContain('kanban-em-entrada');
    expect(reiniciada[0].altura).toBeLessThan(596);

    await esperarConclusao(page, COL_PIPELINE);
    await expect(page.locator('[data-candidato-card]').first()).toBeVisible();
  });

  test('C — filtro/pesquisa não reinicia a entrada nem esconde cards', async ({ page }) => {
    await page.goto('/recrutamento');
    await esperarConclusao(page, COL_PIPELINE);

    const nome = await page.locator('[data-pipeline-coluna="triagem"] [data-candidato-card] p').first().innerText();
    await page.getByLabel('Buscar candidatos').fill(nome.trim().split(/\s+/)[0]);
    await page.waitForTimeout(800);

    expect(await page.locator('.kanban-em-entrada').count()).toBe(0);
    expect(await page.locator('[data-pipeline-coluna] .kanban-coluna-concluida').count()).toBe(5);
    await expect(page.locator('[data-candidato-card]').first()).toBeVisible();

    const alturas = await page.evaluate(() =>
      [...document.querySelectorAll('[data-pipeline-coluna] .kanban-column-visual')].map((el) =>
        Math.round(el.getBoundingClientRect().height)
      )
    );
    expect(new Set(alturas).size).toBe(1);
    expect(alturas[0]).toBeGreaterThan(400);
  });

  test('I — prefers-reduced-motion: entrada curta (500ms) e interface utilizável', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/recrutamento');
    await page.waitForFunction(
      () => document.querySelector('.kanban-column-visual.kanban-em-entrada') !== null,
      undefined,
      { timeout: 20_000 }
    );
    const rec = await medirEntrada(page, COL_PIPELINE);
    expect(rec[0].coluna.duracao).toBe('0.5s');
    expect(rec[0].coluna.easing).toBe('ease-out');
    expect(rec[0].card?.duracao).toBe('0.24s');

    await esperarConclusao(page, COL_PIPELINE);
    await page.locator('[data-candidato-card]').first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await page.locator('.kanban-em-entrada').count()).toBe(0);
  });

  test('H — 1920/1600/1440/1366/390: entrada estabiliza sem mudar dimensões', async ({ page }) => {
    // Uma única carga (a entrada roda uma vez); os viewports são medidos após a
    // estabilização — redimensionar não deve alterar largura/altura nem criar
    // overflow horizontal na página.
    await page.goto('/recrutamento');
    await esperarConclusao(page, COL_PIPELINE);

    for (const [width, height] of [
      [1920, 1080],
      [1600, 900],
      [1440, 900],
      [1366, 768],
      [390, 844],
    ]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(450);

      const dados = await page.evaluate(() => {
        const board = document.querySelector('[data-pipeline-board]') as HTMLElement;
        const retangulo = board.getBoundingClientRect();
        return {
          larguras: [...document.querySelectorAll('[data-pipeline-coluna]')].map((el) =>
            Math.round(el.getBoundingClientRect().width)
          ),
          alturas: [...document.querySelectorAll('[data-pipeline-coluna] .kanban-column-visual')].map((el) =>
            Math.round(el.getBoundingClientRect().height)
          ),
          boardClient: board.clientWidth,
          boardScroll: board.scrollWidth,
          boardRight: Math.round(retangulo.right),
          boardLeft: Math.round(retangulo.left),
          janela: window.innerWidth,
        };
      });

      expect(dados.larguras, `${width}x${height}: largura da coluna`).toEqual([272, 272, 272, 272, 272]);
      expect(new Set(dados.alturas).size, `${width}x${height}: alturas diferentes`).toBe(1);
      expect(dados.alturas[0]).toBeGreaterThanOrEqual(520);
      // O board é a faixa que rola sozinha: ele não pode transbordar a viewport
      // (o header global tem overflow próprio, fora do escopo desta animação).
      expect(dados.boardLeft, `${width}x${height}: board fora à esquerda`).toBeGreaterThanOrEqual(0);
      expect(dados.boardRight, `${width}x${height}: board transborda a viewport`).toBeLessThanOrEqual(dados.janela + 1);
      if (width <= 1600) {
        expect(dados.boardScroll, `${width}x${height}: board deve rolar na horizontal`).toBeGreaterThan(
          dados.boardClient
        );
      }
    }
  });
});
