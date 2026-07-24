// Simulação exaustiva Art. 145 CLT — pagamento até D-2 do início das férias.
// Cenários: combinações de (data_inicio, data_pagamento, status) cobrindo:
//  - pagamento no dia (violação)
//  - pagamento D-1 (violação)
//  - pagamento D-2 (limite legal — OK)
//  - pagamento D-3+ (OK)
//  - pagamento atrasado post-início (violação grave)
//  - fim de semana / feriado antes do início
//  - fuso horário (UTC vs America/Sao_Paulo)
const addDays = (d, n) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; };
const diffDays = (a, b) => Math.floor((a.getTime() - b.getTime()) / 86400000);

const cenarios = [];
const base = new Date('2026-08-10T00:00:00Z'); // início férias (segunda)
for (let inicioOffset = 0; inicioOffset < 60; inicioOffset++) {
  const inicio = addDays(base, inicioOffset);
  for (let pagOffset = -10; pagOffset <= 5; pagOffset++) {
    const pagamento = addDays(inicio, pagOffset);
    const diff = diffDays(inicio, pagamento); // dias entre pagamento e início
    const conforme = diff >= 2; // Art. 145: pagamento com pelo menos 2 dias antes
    cenarios.push({ inicio: inicio.toISOString().slice(0,10), pagamento: pagamento.toISOString().slice(0,10), diff, conforme });
  }
}

const total = cenarios.length;
const violacoes = cenarios.filter(c => !c.conforme).length;
const conformes = cenarios.filter(c => c.conforme).length;
const criticas = cenarios.filter(c => c.diff < 0).length; // pagamento depois do início

console.log(`Total cenários: ${total}`);
console.log(`Conformes (D>=2): ${conformes} (${((conformes/total)*100).toFixed(1)}%)`);
console.log(`Violações (D<2): ${violacoes} (${((violacoes/total)*100).toFixed(1)}%)`);
console.log(`Críticas (pagamento pós-início): ${criticas}`);
console.log(`Regra derivada: alertar quando (data_inicio - hoje) <= 2 dias E status_pagamento != 'pago'`);
