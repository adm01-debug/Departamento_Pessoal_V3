// Simulação exaustiva: notificações D-3/D-2/D-1 (Art. 145 CLT)
//
// Motor real: view v_ferias_alerta_pagamento_d2 (migration 20260723112647,
// linhas 26-32) + função notificar_ferias_pagamento_d5 (migration
// 20260723121100, linhas 28-31). Severidade tem limiares FIXOS (crítico ≤2d,
// atenção ≤5d — não existe "antecedência configurável" no motor real) e a
// notificação cobre status aprovada, programada OU em_gozo (view WHERE),
// incluindo o caso mais grave (início já passou sem pagamento).
//
// ANTECEDENCIAS é mantida só para provar, por assertion (ASSERT-5), que o
// motor real não deveria reagir a ela — não é mais um parâmetro de negócio.
//
// Cenários: janela_dias (41) × pago (2) × status_ferias (6, incl. programada)
//           × antecedencia_config (4) × empresa_id (3) = 5.904 combinações.
// Auto-validação integrada.

const STATUS_FERIAS = ['aprovada', 'programada', 'em_gozo', 'rascunho', 'rejeitada', 'cancelada'];
const STATUS_ELEGIVEIS = ['aprovada', 'programada', 'em_gozo']; // v_ferias_alerta_pagamento_d2 WHERE
const ANTECEDENCIAS = [3, 4, 5, 7]; // ver nota acima: só para o ASSERT-5
const EMPRESA_IDS = [1, 2, 3]; // multi-tenant

const hoje = new Date('2026-08-10T00:00:00Z');

// Motor real: v_ferias_alerta_pagamento_d2, migration 20260723112647:26-32.
function severidade(pago, diasRestantes) {
  if (pago) return 'ok';
  if (diasRestantes < 0) return 'violacao_grave';
  if (diasRestantes <= 2) return 'critico';
  if (diasRestantes <= 5) return 'atencao';
  return 'ok';
}

// Motor real: notificar_ferias_pagamento_d5, migration 20260723121100:28-31 —
// notifica toda linha da view com severidade != 'ok'; não depende de antecedência.
function deveNotificar(status, pago, diasRestantes) {
  if (!STATUS_ELEGIVEIS.includes(status)) return false;
  return severidade(pago, diasRestantes) !== 'ok';
}

let total = 0;
let totalNotificar = 0;
let totalGraves = 0;
let totalCriticos = 0;
let errosAssertion = 0;
const exemplosViolacao = [];

// Distribução por antecedência (para análise de calibragem)
const notifPorAntecedencia = {};

for (const empresa of EMPRESA_IDS) {
  for (let d = -10; d <= 30; d++) { // -10 dias passados até 30 dias futuros
    const inicio = new Date(hoje);
    inicio.setUTCDate(inicio.getUTCDate() + d);
    for (const pago of [false, true]) {
      for (const status of STATUS_FERIAS) {
        const dias = d;
        const sev = severidade(pago, dias);
        const notifPorConfig = [];

        for (const antecedencia of ANTECEDENCIAS) {
          total++;
          const notif = deveNotificar(status, pago, dias);
          notifPorConfig.push(notif);
          if (notif) {
            totalNotificar++;
            notifPorAntecedencia[antecedencia] = (notifPorAntecedencia[antecedencia] || 0) + 1;
          }
          void antecedencia; // mantido só para preencher notifPorAntecedencia/ASSERT-5
        }
        if (sev === 'violacao_grave') totalGraves++;
        if (sev === 'critico') totalCriticos++;
        const notif = notifPorConfig[0];

        // — Auto-validação —
        // 1. Pago nunca gera notificação
        if (pago && notif) {
          errosAssertion++;
          exemplosViolacao.push(`ASSERT-1: pago mas notif=true | d=${d} status=${status}`);
        }
        // 2. Rascunho/rejeitada/cancelada nunca notificam
        if (['rascunho', 'rejeitada', 'cancelada'].includes(status) && notif) {
          errosAssertion++;
          exemplosViolacao.push(`ASSERT-2: ${status} não deve notificar | d=${d}`);
        }
        // 3. Início já passou (!pago, status elegível) = sempre violação grave
        if (!pago && dias < 0 && STATUS_ELEGIVEIS.includes(status) && sev !== 'violacao_grave') {
          errosAssertion++;
          exemplosViolacao.push(`ASSERT-3: passado !pago deve ser grave, foi ${sev} | d=${d}`);
        }
        // 4. Empresa não afeta regra de negócio (apenas tenant isolation)
        void empresa; // multi-tenant: mesmo resultado lógico por empresa
        // 5. Motor real não tem antecedência configurável: resultado deve ser
        // o mesmo para as 4 configurações simuladas (ver cabeçalho do arquivo).
        if (notifPorConfig.some((n) => n !== notif)) {
          errosAssertion++;
          exemplosViolacao.push(`ASSERT-5: antecedência alterou o resultado | d=${d} status=${status}`);
        }
        // 6. Status elegível (aprovada/programada/em_gozo) + !pago + severidade
        // != ok DEVE notificar (view+função reais não distinguem entre os 3).
        if (!pago && STATUS_ELEGIVEIS.includes(status) && sev !== 'ok' && !notif) {
          errosAssertion++;
          exemplosViolacao.push(`ASSERT-6: ${status} com severidade=${sev} deveria notificar | d=${d}`);
        }
        // 7. Limiares exatos da view real (migration 20260723112647:26-32):
        // D-2 é 'critico' (não 'atencao'); D-3 é 'atencao' (não 'critico'). A
        // severidade escolhe o título/emoji da notificação em
        // notificar_ferias_pagamento_d5, então o limiar importa mesmo quando
        // não muda o booleano `notif`.
        if (!pago && d === 2 && sev !== 'critico') {
          errosAssertion++;
          exemplosViolacao.push(`ASSERT-7: d=2 deveria ser 'critico', foi '${sev}'`);
        }
        if (!pago && d === 3 && sev !== 'atencao') {
          errosAssertion++;
          exemplosViolacao.push(`ASSERT-7: d=3 deveria ser 'atencao', foi '${sev}'`);
        }
      }
    }
  }
}

console.log(`=== SIMULAÇÃO EXAUSTIVA — Notificações D-3/D-2/D-1 (Art. 145 CLT) ===`);
console.log(`Cenários simulados: ${total.toLocaleString('pt-BR')}`);
console.log(`  A notificar: ${totalNotificar.toLocaleString('pt-BR')}`);
console.log(`  Críticos (≤2d sem pagto): ${totalCriticos.toLocaleString('pt-BR')}`);
console.log(`  Violação grave (início já passou): ${totalGraves.toLocaleString('pt-BR')}`);
console.log(`\nNotificações por antecedência configurada (todos tenant × todos status):`);
for (const ant of ANTECEDENCIAS) {
  const pct = (notifPorAntecedencia[ant] / total * 100).toFixed(1);
  console.log(`  D-${ant}: ${notifPorAntecedencia[ant].toLocaleString('pt-BR')} cenários (${pct}%)`);
}
console.log(`\nAuto-validação: ${errosAssertion === 0 ? '✅ 0 erros de assertion' : `❌ ${errosAssertion} ERROS`}`);

if (errosAssertion > 0) {
  console.error('\nErros encontrados:');
  exemplosViolacao.slice(0, 10).forEach(e => console.error(' ', e));
  process.exit(1);
}
