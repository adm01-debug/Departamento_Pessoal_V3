import { test, expect, type Page } from '@pla
ywright/test';

/**
 * Regressão da nova cen
tral de auditoria de Premiações.
 * Usa o m
ock visual aprovado (`VITE_PREMIACOES_MOCK=tr
ue`) e não grava nada.
 */
async function ab
rirAuditoria(page: Page) {
  await page.goto(
'/premiacoes');
  await expect(page.getByRole
('heading', { name: /Hub de Premiações/i })
).toBeVisible();
  await page.getByRole('tab'
, { name: /Auditoria/i }).click();
  await ex
pect(page.locator('[data-testid="auditoria-ev
ento"]').first()).toBeVisible({ timeout: 20_0
00 });
}

test.describe('Premiações — aud
itoria em timeline', () => {
  test.use({ vie
wport: { width: 1440, height: 900 } });

  te
st('substitui KPIs/tabela pela timeline, filt
ra e abre detalhes', async ({ page }) => {
  
  await abrirAuditoria(page);

    // A compo
sição antiga saiu da aba; os cards continua
m existindo apenas nas
    // outras abas do 
Hub.
    await expect(page.getByText('Total A
provado')).toHaveCount(0);
    await expect(p
age.getByText('Painel Gerencial de Auditoria 
& ROI v1.2')).toHaveCount(0);
    await expec
t(page.locator('table')).toHaveCount(0);

   
 await expect(page.getByLabel('Filtros da aud
itoria')).toBeVisible();
    await expect(pag
e.getByText(/Hoje ·/)).toBeVisible();
    aw
ait expect(page.getByRole('button', { name: '
CSV' })).toBeVisible();
    await expect(page
.getByRole('button', { name: 'PDF' })).toBeVi
sible();

    const busca = page.getByLabel(/
Buscar evento, campanha, colaborador ou valor
/i);
    await busca.fill('IRRF');
    await 
expect(page.getByText('Divergência identific
ada na conciliação').first()).toBeVisible()
;
    await expect(page.getByText('Campanha c
riada')).toHaveCount(0);

    await busca.fil
l('');
    await page.getByRole('button', { n
ame: /Campanhas\s*2/ }).click();
    await ex
pect(page.getByText('Campanha criada').first(
)).toBeVisible();
    await expect(page.getBy
Text('Divergência identificada na conciliaç
ão')).toHaveCount(0);

    await page.getByR
ole('button', { name: /Ver detalhes/ }).first
().click();
    const dialog = page.getByRole
('dialog');
    await expect(dialog).toBeVisi
ble();
    await expect(dialog.getByText('Inf
ormações financeiras')).toBeVisible();
    
await expect(dialog.getByText('Dados anterior
es')).toBeVisible();
    await page.keyboard.
press('Escape');

    await page.screenshot({
 path: 'tmp-premiacoes-auditoria/e2e-auditori
a-1440.png', fullPage: false });
  });

  tes
t('os KPIs permanecem nas outras abas e somem
 apenas da Auditoria', async ({ page }) => {

    await page.goto('/premiacoes');
    await
 expect(page.getByText('Total Aprovado')).toB
eVisible();
    await page.getByRole('tab', {
 name: /Auditoria/i }).click();
    await exp
ect(page.getByText('Total Aprovado')).toHaveC
ount(0);
    await page.getByRole('tab', { na
me: /Campanhas/i }).click();
    await expect
(page.getByText('Total Aprovado')).toBeVisibl
e();
  });

  test('mobile reorganiza os even
tos em cards verticais', async ({ page }) => 
{
    await page.setViewportSize({ width: 390
, height: 844 });
    await abrirAuditoria(pa
ge);
    await expect(page.getByRole('button'
, { name: /Ver detalhes/ }).first()).toBeVisi
ble();
    await page.screenshot({ path: 'tmp
-premiacoes-auditoria/e2e-auditoria-390.png',
 fullPage: false });
  });
});


