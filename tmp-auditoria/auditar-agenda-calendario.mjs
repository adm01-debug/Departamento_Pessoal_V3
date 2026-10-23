  { truncado: chipLongo?.truncado, classeContemTruncate: Boolean(chipLongo?.classe.includes('truncate')) }
);

/* Tamanhos de mês, ano bissexto e virada de ano */
const meses = [
  [2026, 0, 31],
  [2026, 1, 28],
  [2026, 3, 30],
  [2026, 4, 31],
  [2026, 8, 30],
  [2028, 1, 29],
  [2028, 11, 31],
];
for (const [ano, indice, esperado] of meses) {
  await irParaMes(ano, indice);
  const dados = await contarDiasDoMes(ano, indice);
  registrar(
    `CAL-14-${ano}-${indice + 1}`,
    `${MESES[indice]}/${ano} tem ${esperado} dias`,
    { dias: esperado, primeiro: 1, ultimo: esperado, celulasUnicas: true },
    { dias: dados.diasNoMes, primeiro: dados.diasPrimeiro, ultimo: dados.diasUltimo, celulasUnicas: dados.celulasUnicas }
  );
}
await irParaMes(2029, 0);
registrar('CAL-15', 'Virada dezembro → janeiro atualiza o ano', 'Janeiro de 2029', (await mesAtual()).texto);

/* Responsividade do modal */
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
await abrirTurmas();
await page.getByRole('button', { name: /Ver calendário completo/i }).click();
await page.waitForTimeout(700);
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(700);
const calendarioMobile = await lerCalendario();
registrar(
  'CAL-16',
  'Modal cabe na tela de 390 px, sem overflow horizontal',
  { larguraMax: 390, overflowX: 0 },
  { larguraMax: calendarioMobile.caixa?.w, overflowX: calendarioMobile.caixa?.overflowX }
);
registrar('CAL-17', 'Lista “Turmas do mês” visível no mobile', true, calendarioMobile.listaMobileVisivel);
registrar(
  'CAL-18',
  'Conteúdo do modal é rolável, sem corte silencioso',
  true,
  Boolean(calendarioMobile.caixa?.scrollable)
);
await page.screenshot({ path: 'tmp-auditoria/calendario-mobile.png', fullPage: false });

/* Divergência de filtros: semana sugerida x dados filtrados */
await page.setViewportSize({ width: 1440, height: 900 });
await abrirTurmas();
await page.getByRole('combobox', { name: 'Status' }).click();
await page.getByRole('option', { name: 'Concluído' }).click();
await page.waitForTimeout(600);
const agendaFiltrada = await lerAgenda();
registrar(
  'FIL-01',
  'Filtro “Concluído” mantém a semana 14–20/09 (semana calculada sem filtros)',
  { range: '14 set – 20 set 2026', eventos: 0 },
  { range: agendaFiltrada.range, eventos: agendaFiltrada.dias.reduce((t, d) => t + d.eventos.length, 0) }
);
await page.getByRole('button', { name: /Ver calendário completo/i }).click();
await page.waitForTimeout(700);
const calendarioFiltrado = await lerCalendario();
registrar(
  'FIL-02',
  'Calendário respeita o filtro ativo (setembro sem chips)',
  { mes: 'Setembro de 2026', chips: 0, mensagem: true },
  {
    mes: calendarioFiltrado.mes,
    chips: calendarioFiltrado.chips.length,
    mensagem: Boolean(calendarioFiltrado.dialogoTexto?.includes('Nenhuma turma neste mês.')),
  }
);
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
await page.getByRole('button', { name: /Limpar filtros/i }).click();
await page.waitForTimeout(400);

console.log(JSON.stringify(resultados, null, 2));
await browser.close();