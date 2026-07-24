// Simulação: notificação D-3 (Art. 145) - identificar quais status de férias
// devem gerar notificação diária ao RH.
const hoje = new Date('2026-08-10T00:00:00Z');
const cenarios = [];
for (let d = -5; d <= 15; d++) {
  const inicio = new Date(hoje); inicio.setUTCDate(inicio.getUTCDate() + d);
  for (const pago of [true, false]) {
    for (const status of ['aprovada', 'em_gozo', 'rascunho', 'rejeitada']) {
      const dias = d;
      let severidade = 'ok';
      if (!pago) {
        if (dias < 0) severidade = 'violacao_grave';
        else if (dias <= 2) severidade = 'critico';
        else if (dias <= 5) severidade = 'atencao';
      }
      const notificar = !pago && status === 'aprovada' && dias >= 0 && dias <= 5;
      cenarios.push({ dias, pago, status, severidade, notificar });
    }
  }
}
const notif = cenarios.filter(c => c.notificar).length;
const criticos = cenarios.filter(c => c.severidade === 'critico').length;
const graves = cenarios.filter(c => c.severidade === 'violacao_grave').length;
console.log(`Total: ${cenarios.length}`);
console.log(`A notificar (aprovadas ≤5d sem pagto): ${notif}`);
console.log(`Críticos (≤2d): ${criticos} | Violação grave: ${graves}`);
