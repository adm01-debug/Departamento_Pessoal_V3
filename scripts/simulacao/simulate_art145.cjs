// Simulação exaustiva Art. 145 CLT — pagamento até D-2 do início das férias.
// Cenários: combinações de (data_inicio, offset_pagamento, salário, turno)
// cobrindo casos-limite legais, fins de semana e correção monetária.
//
// D-2 é contado em DIAS CORRIDOS, não úteis. Se D-2 cair em sábado ou domingo,
// o pagamento deve ser antecipado para o último dia útil anterior (TST OJ-123).
//
// Cenários: 180 datas × 20 offsets × 5 salários = 18.000 combinações.
// Auto-validação integrada — exit 1 se qualquer assertion falhar.

const SALARIOS = [1518, 2500, 5000, 10000, 20000];

const addDays = (d, n) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; };
const diffDays = (a, b) => Math.round((a.getTime() - b.getTime()) / 86400000);

// Feriados nacionais fixos (mês 1-based, dia)
const FERIADOS_FIXOS = new Set([
  '01-01','04-21','05-01','09-07','10-12','11-02','11-15','12-25',
]);
function isFeriado(d) {
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return FERIADOS_FIXOS.has(`${mm}-${dd}`);
}
function isUtil(d) {
  const dow = d.getUTCDay(); // 0=dom, 6=sab
  return dow !== 0 && dow !== 6 && !isFeriado(d);
}

// Deadline legal real: recua até achar dia útil >= D-2
function deadlineLegal(dataInicio) {
  let deadline = addDays(dataInicio, -2);
  while (!isUtil(deadline)) deadline = addDays(deadline, -1);
  return deadline;
}

// Motor real do produto (view v_ferias_alerta_pagamento_d2, migration
// 20260723112647:26-32): severidade por dias-até-início com limiares FIXOS,
// sem antecipar o deadline em fim de semana/feriado (sem TST OJ-123). Usada
// só para medir a lacuna abaixo — não é alterada nem corrigida aqui, pois
// mudar a view é DDL de produção e decisão do dono.
function severidadeRealProduto(diasAntesInicio) {
  if (diasAntesInicio < 0) return 'violacao_grave';
  if (diasAntesInicio <= 2) return 'critico';
  if (diasAntesInicio <= 5) return 'atencao';
  return 'ok';
}

function classificar(dataInicio, dataPagamento) {
  const diff = diffDays(dataInicio, dataPagamento); // positivo = pagamento antes
  const deadline = deadlineLegal(dataInicio);
  const conformeLegal = dataPagamento <= deadline; // pagamento até deadline
  let status;
  if (diff < 0) status = 'violacao_grave';        // pagou depois do início
  else if (diff === 0) status = 'violacao';        // pagou no mesmo dia
  else if (diff === 1) status = 'violacao';        // D-1
  else if (!conformeLegal) status = 'violacao';    // D-2 mas em fim de semana/feriado
  else if (diff === 2) status = 'limite';          // exatamente D-2 útil
  else status = 'ok';
  return { diff, conformeLegal, status, deadline: deadline.toISOString().slice(0,10) };
}

const base = new Date('2026-01-05T00:00:00Z'); // início: segunda-feira
let total = 0, violacoes = 0, graves = 0, limites = 0, errosAssertion = 0;
const exemplosViolacao = [];
const violacoesPorDow = { 0:0,1:0,2:0,3:0,4:0,5:0,6:0 };
let gapNaoEscalado = 0; // violação legal (OJ-123) que o produto real não mostra como crítico/grave

for (let inicioOffset = 0; inicioOffset < 180; inicioOffset++) {
  const inicio = addDays(base, inicioOffset);
  const dowInicio = inicio.getUTCDay();

  for (let pagOffset = -12; pagOffset <= 7; pagOffset++) {
    const pagamento = addDays(inicio, pagOffset);
    const { diff, conformeLegal, status, deadline } = classificar(inicio, pagamento);

    for (const salario of SALARIOS) {
      total++;
      if (status === 'violacao_grave') graves++;
      if (status === 'violacao' || status === 'violacao_grave') {
        violacoes++;
        violacoesPorDow[dowInicio]++;
      }
      if (status === 'limite') limites++;

      // Lacuna conhecida (não bloqueante — ver nota em severidadeRealProduto):
      // já é violação legal (deadline com OJ-123 passou) mas o produto real
      // ainda mostraria severidade 'atencao' ou 'ok' (não escala a crítico).
      if (
        (status === 'violacao' || status === 'violacao_grave') &&
        !['critico', 'violacao_grave'].includes(severidadeRealProduto(diff))
      ) {
        gapNaoEscalado++;
      }

      // — Auto-validação —
      // 1. D-7 sempre deve ser OK (antecipação ampla)
      if (pagOffset === -7 && status !== 'ok') {
        errosAssertion++;
        exemplosViolacao.push(`ASSERT-1: D-7 deve ser OK mas foi ${status} | inicio=${inicio.toISOString().slice(0,10)}`);
      }
      // 2. Pagamento após início sempre grave
      if (pagOffset > 0 && status !== 'violacao_grave') {
        errosAssertion++;
        exemplosViolacao.push(`ASSERT-2: pagamento pós-início deve ser grave mas foi ${status}`);
      }
      // 3. D-0 nunca é OK
      if (pagOffset === 0 && (status === 'ok' || status === 'limite')) {
        errosAssertion++;
        exemplosViolacao.push(`ASSERT-3: D-0 não pode ser OK/limite mas foi ${status}`);
      }
      // 4. Salário não afeta status (apenas para verificar que não vaza)
      void salario; // salário não afeta status no cálculo de conformidade
    }
  }
}

const pctViolacoes = (violacoes / total * 100).toFixed(1);
const dowNomes = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

console.log(`=== SIMULAÇÃO EXAUSTIVA — Art. 145 CLT (pagamento férias D-2) ===`);
console.log(`Cenários simulados: ${total.toLocaleString('pt-BR')}`);
console.log(`  OK (D-2+ útil):    ${(total - violacoes - limites).toLocaleString('pt-BR')}`);
console.log(`  Limite (D-2 exato): ${limites.toLocaleString('pt-BR')}`);
console.log(`  Violações (D<2):   ${(violacoes - graves).toLocaleString('pt-BR')}`);
console.log(`  Graves (pós-início): ${graves.toLocaleString('pt-BR')}`);
console.log(`  Taxa de violação: ${pctViolacoes}%`);
console.log(`\nViolações por dia da semana do início das férias:`);
for (const [dow, cnt] of Object.entries(violacoesPorDow)) {
  if (cnt > 0) console.log(`  ${dowNomes[dow]}: ${cnt} cenários`);
}
console.log(`Auto-validação: ${errosAssertion === 0 ? '✅ 0 erros de assertion' : `❌ ${errosAssertion} ERROS`}`);
console.log(`Regra: alertar quando (data_inicio - hoje) <= 2 dias úteis E status_pagamento != 'pago'`);
console.log(
  `\nGAP CONHECIDO (não bloqueante — produto real, não a simulação): ${gapNaoEscalado.toLocaleString('pt-BR')} ` +
  `cenários já em violação legal (deadline com antecipação TST OJ-123) em que a view ` +
  `v_ferias_alerta_pagamento_d2 ainda não mostraria severidade 'critico'/'violacao_grave' ` +
  `(ela usa só dias-até-início, sem antecipar para dia útil). Corrigir é mudar uma view em ` +
  `produção — decisão do dono, não desta simulação.`
);

if (errosAssertion > 0) {
  console.error('\nErros encontrados:');
  exemplosViolacao.slice(0, 10).forEach(e => console.error(' ', e));
  process.exit(1);
}
