// Simulação: adiantamento 13º nas férias (Lei 4.749/65 art. 2º §2º)
// Regra: colaborador pode solicitar 1ª parcela do 13º junto com férias,
// desde que solicite até 31/janeiro do ano corrente. Empresa deve pagar
// junto com as férias. Só pode ser solicitado 1x por ano.
const cenarios = [];
for (let mes = 1; mes <= 12; mes++) {
  for (const solicitouAteJan of [true, false]) {
    for (const jaRecebeuNoAno of [true, false]) {
      for (const mesesTrabalhados of [1, 3, 6, 9, 12]) {
        const inicioFerias = new Date(Date.UTC(2026, mes - 1, 15));
        const podeReceber = solicitouAteJan && !jaRecebeuNoAno;
        const avos = Math.min(mesesTrabalhados, 12);
        const salario = 3000;
        const valor13 = podeReceber ? (salario * avos) / 12 / 2 : 0; // 1ª parcela = 50%
        cenarios.push({ mes, solicitouAteJan, jaRecebeuNoAno, mesesTrabalhados, podeReceber, valor13 });
      }
    }
  }
}
const total = cenarios.length;
const elegiveis = cenarios.filter(c => c.podeReceber).length;
const bloqueadosPorDupla = cenarios.filter(c => !c.podeReceber && c.jaRecebeuNoAno).length;
const bloqueadosPorPrazo = cenarios.filter(c => !c.podeReceber && !c.solicitouAteJan && !c.jaRecebeuNoAno).length;
console.log(`Total cenários: ${total}`);
console.log(`Elegíveis: ${elegiveis} (${(elegiveis/total*100).toFixed(1)}%)`);
console.log(`Bloqueados por duplicidade: ${bloqueadosPorDupla}`);
console.log(`Bloqueados por prazo (>31/jan): ${bloqueadosPorPrazo}`);
console.log(`Valor médio 1ª parcela (elegíveis): R$ ${(cenarios.filter(c=>c.podeReceber).reduce((s,c)=>s+c.valor13,0)/elegiveis).toFixed(2)}`);
