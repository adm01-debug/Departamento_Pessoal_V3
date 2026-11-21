import { test, expect, type Page } from '@pla
ywright/test';

/**
 * APROVAÇÃO → NINE-B
OX (demonstração; nenhum dado real é grava
do).
 *
 * Contrato atual homologado:
 *   T1
/T2 — o gestor aprova a avaliação consoli
dada;
 *   T3/T4 — a aprovação classifica
 diretamente o Nine-Box (sem etapa
 *        
    posterior de validação do RH);
 *   T5 
— a pessoa aparece no quadrante classificad
o;
 *   T6 — F5 mantém a classificação;

 *   T7 — as abas compartilham o mesmo esta
do.
 */
const DIR = 'tmp-ninebox-aprovacao';

const COLAB = 'Ana Beatriz Souza';

async fun
ction abrirFeedbacks(page: Page) {
  await pa
ge.goto('/avaliacao');
  await expect(page.ge
tByRole('heading', { name: /Gestão de Desemp
enho/ })).toBeVisible();
  await page.getByRo
le('tab', { name: /Feedbacks/i }).click();
  
await expect(page.getByText('Avaliado por').f
irst()).toBeVisible({ timeout: 15000 });
  aw
ait page.waitForTimeout(2200);
}

test.descri
be('Nine-Box × aprovação', () => {
  test.
use({ viewport: { width: 1440, height: 1000 }
 });

  test('aprovado classifica direto no N
ine-Box e a classificação persiste', async 
({ page }) => {
    // Papéis do cenário (a
 validação do Potencial é do RH).
    awai
t page.route('**/rest/v1/rpc/get_user_roles',
 (route) =>
      route.fulfill({
        sta
tus: 200,
        contentType: 'application/j
son',
        body: JSON.stringify(['admin', 
'gestor', 'rh']),
      })
    );

    await 
abrirFeedbacks(page);
    // Estado demonstra
tivo determinístico.
    await page.evaluate
(() => {
      localStorage.removeItem('dp-de
sempenho-demo-registros');
      localStorage
.removeItem('dp-desempenho-aprovacoes-demo');

    });
    await page.reload();
    await p
age.getByRole('tab', { name: /Feedbacks/i }).
click();
    await expect(page.getByText('Ava
liado por').first()).toBeVisible({ timeout: 1
5000 });
    await page.waitForTimeout(2400);


    const grupo = page.getByRole('group', {
 name: 'Segmentar por tipo de feedback' });
 
   const card = page.locator('[data-testid="c
artao-feedback"]').filter({ hasText: COLAB })
.first();
    await grupo.getByRole('button',
 { name: /Aguardando gestor/ }).click();
    
await page.waitForTimeout(1200);

    // T1 �
�� aprovação.
    await card.getByRole('but
ton', { name: 'Aprovar avaliação' }).click(
);
    await expect(card.getByRole('status').
first()).toHaveText(/Aprovada pelo gestor/i, 
{ timeout: 15000 });

    // T2/T3 — aprova
ção classifica diretamente: não há pendê
ncia de RH.
    await page.getByRole('tab', {
 name: /Nine-Box/i }).click();
    await expe
ct(page.getByText(/Matriz Nine-Box/i).first()
).toBeVisible({ timeout: 15000 });
    await 
page.waitForTimeout(2200);
    await expect(p
age.getByText(/aprovada pelo gestor aguardand
o/i).first()).toHaveCount(0);
    await expec
t(page.getByText(new RegExp(COLAB)).first()).
toBeVisible();

    // T4/T5 — a pessoa apa
rece no quadrante classificado.
    await pag
e
      .getByRole('button', { name: /Estrela
 — \d+ colaborador/i })
      .first()
    
  .click();
    const quadrante = page.getByR
ole('dialog');
    await expect(quadrante).to
BeVisible();
    await expect(quadrante.getBy
Text(new RegExp(COLAB))).toBeVisible();
    a
wait page.keyboard.press('Escape');
    await
 page.screenshot({ path: `${DIR}/e2e-02-nineb
ox-classificado.png`, fullPage: true });

   
 // T6 — F5 mantém a classificação.
    
await page.reload();
    await page.getByRole
('tab', { name: /Nine-Box/i }).click();
    a
wait expect(page.getByText(/Matriz Nine-Box/i
).first()).toBeVisible({ timeout: 15000 });
 
   await page.waitForTimeout(2400);
    await
 expect(page.getByText(new RegExp(COLAB)).fir
st()).toBeVisible();
    await expect(page.ge
tByText(/aprovada pelo gestor aguardando/i).f
irst()).toHaveCount(0);
    await page.screen
shot({ path: `${DIR}/e2e-03-ninebox-validado.
png`, fullPage: true });
  });
});


