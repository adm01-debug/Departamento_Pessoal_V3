// Simulação exaustiva: notificações D-3/D-2/D-1 (Art. 145 CLT)
// Regra: RH deve ser notificado quando férias aprovadas se aproximam sem pagamento.
//
// Cenários: janela_dias (41) × pago (2) × status_ferias (5) × antecedencia_config (4)
//           × empresa_id (3) = 4.920 combinações. Auto-validação integrada.
//
// Comportamento esperado:
//  - Notificar quando: status=aprovada E !pago E dias_restantes ∈ [0, antecedencia]
//  - NÃO notificar: rascunho, rejeitada, cancelada (nunca notificar independente do prazo)
//  - NÃO notificar: em_gozo (já iniciou)
//  - Violação grave: !pago E dias_restantes < 0 (início já passou)

const STATUS_FERIAS = ['aprovada', 'em_gozo', 'rascunho', 'rejeitada', 'cancelada'];
const ANTECEDENCIAS = [3, 4, 5, 7]; // dias de aviso configuráveis
const EMPRESA_IDS = [1, 2, 3]; // multi-tenant

const hoje = new Date('2026-08-10T00:00:00Z');

function severidade(pago, diasRestantes) {
  if (pago) return 'ok';
  if (diasRestantes < 0) return 'violacao_grave';
  if (diasRestantes <= 1) return 'critico';
  if (diasRestantes <= 3) return 'alto';
  if (diasRestantes <= 5) return 'atencao';
  return 'ok';
}

function deveNotificar(status, pago, diasRestantes, antecedencia) {
  if (pago) return false;
  if (status !== 'aprovada') return false;
  // Só notifica antes do início (diasRestantes >= 0) dentro da janela configurada
  return diasRestantes >= 0 && diasRestantes <= antecedencia;
}

let total = 0;
let totalNotificar = 0;
let totalGraves = 0;
let totalCriticos = 0;
let errosAssertion = 0;
const exemplosViolacao = [];

// Distribução por antecedência (para análise de calibragem)
const notifPorAntecedencia = {};

for (const antecedencia of ANTECEDENCIAS) {
  notifPorAntecedencia[antecedencia] = 0;
  for (const empresa of EMPRESA_IDS) {
    for (let d = -10; d <= 30; d++) { // -10 dias passados até 30 dias futuros
      const inicio = new Date(hoje);
      inicio.setUTCDate(inicio.getUTCDate() + d);
      for (const pago of [false, true]) {
        for (const status of STATUS_FERIAS) {
          total++;
          const dias = d;
          const notif = deveNotificar(status, pago, dias, antecedencia);
          const sev = severidade(pago, dias);

          if (notif) {
            totalNotificar++;
            notifPorAntecedencia[antecedencia]++;
          }
          if (sev === 'violacao_grave') totalGraves++;
          if (sev === 'critico') totalCriticos++;

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
          // 3. Início já passou (!pago) = sempre grave ou critico
          if (!pago && dias < 0 && sev !== 'violacao_grave') {
            errosAssertion++;
            exemplosViolacao.push(`ASSERT-3: passado !pago deve ser grave, foi ${sev} | d=${d}`);
          }
          // 4. Empresa não afeta regra de negócio (apenas tenant isolation)
          void empresa; // multi-tenant: mesmo resultado lógico por empresa
        }
      }
    }
  }
}

console.log(`=== SIMULAÇÃO EXAUSTIVA — Notificações D-3/D-2/D-1 (Art. 145 CLT) ===`);
console.log(`Cenários simulados: ${total.toLocaleString('pt-BR')}`);
console.log(`  A notificar: ${totalNotificar.toLocaleString('pt-BR')}`);
console.log(`  Críticos (≤1d sem pagto): ${totalCriticos.toLocaleString('pt-BR')}`);
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
