// Simulação exaustiva: adiantamento 13º nas férias (Lei 4.749/65 art. 2º §2º)
// Regra: colaborador pode solicitar 1ª parcela do 13º junto com férias,
// desde que solicite até 31/janeiro do ano corrente. Empresa deve pagar
// junto com as férias. Só pode ser solicitado 1x por ano.
//
// Cenários: salários (6) × meses_trabalhados (12) × ano_inicio (3) ×
//           dias_solicitacao (61: 1/nov → 31/jan) × jaRecebeuNoAno (2)
//           = 26.136 combinações. Auto-validação integrada.

const SALARIOS = [1518, 2000, 3000, 5000, 10000, 20000];
const ANOS = [2024, 2025, 2026];

function round2(v) { return Math.round((v + Number.EPSILON) * 100) / 100; }

// Datas de solicitação: 1/Nov(ano-1) até 31/Out(ano) — ano completo
// Inclui: Nov/Dez (pré-prazo), Jan (dentro do prazo), Fev-Out (pós-prazo)
function gerarDatasSolicitacao(ano) {
  const datas = [];
  // Nov e Dez do ano anterior (elegíveis: antes de 31/jan)
  for (let m = 10; m <= 11; m++) { // 10=nov, 11=dez (mês 0-based)
    const dias = m === 10 ? 30 : 31;
    for (let d = 1; d <= dias; d++) {
      datas.push({ data: new Date(Date.UTC(ano - 1, m, d)), fase: 'pre_prazo' });
    }
  }
  // Jan do ano corrente — até dia 31 é elegível
  for (let d = 1; d <= 31; d++) {
    datas.push({ data: new Date(Date.UTC(ano, 0, d)), fase: 'jan', dia: d });
  }
  // Fev-Out do ano corrente (pós-deadline: bloqueados por prazo)
  const diasPorMes = [0, 0, 28, 31, 30, 31, 30, 31, 31, 30, 31]; // fev=28, mar=31...out=31
  for (let m = 1; m <= 9; m++) { // 1=fev, 9=out (mês 0-based)
    for (let d = 1; d <= diasPorMes[m + 1]; d++) {
      datas.push({ data: new Date(Date.UTC(ano, m, d)), fase: 'pos_prazo' });
    }
  }
  return datas;
}

// Motor correto: elegível SE solicitou ATÉ 31/jan do ano das férias E não recebeu antes
function elegivel(dataSolicitacao, anoFerias, jaRecebeuNoAno) {
  if (jaRecebeuNoAno) return false;
  const limite = new Date(Date.UTC(anoFerias, 0, 31)); // 31/jan
  return dataSolicitacao <= limite;
}

function calcularValor(salario, mesesTrabalhados) {
  const avos = Math.min(mesesTrabalhados, 12);
  if (avos === 0) return 0;
  return round2((salario / 12) * avos / 2); // 1ª parcela = 50%
}

let total = 0;
let totalElegiveis = 0;
let totalBloqueadosDupla = 0;
let totalBloqueadosPrazo = 0;
let totalValor = 0;
let errosAssertion = 0;
const exemplosViolacao = [];

for (const anoFerias of ANOS) {
  const datasSolicitacao = gerarDatasSolicitacao(anoFerias);
  for (const salario of SALARIOS) {
    for (let meses = 1; meses <= 12; meses++) {
      for (const { data: dataSol, fase, dia } of datasSolicitacao) {
        for (const jaRecebeuNoAno of [false, true]) {
          total++;
          const apto = elegivel(dataSol, anoFerias, jaRecebeuNoAno);
          const valor = apto ? calcularValor(salario, meses) : 0;

          if (apto) {
            totalElegiveis++;
            totalValor += valor;
          } else if (jaRecebeuNoAno) {
            totalBloqueadosDupla++;
          } else {
            totalBloqueadosPrazo++;
          }

          // — Auto-validação: assertions que pegam bugs de lógica —

          // 1. Elegível sempre implica valor > 0 (dado meses >= 1)
          if (apto && valor <= 0) {
            errosAssertion++;
            exemplosViolacao.push(`ASSERT-1: elegível mas valor=0 | sal=${salario} meses=${meses}`);
          }
          // 2. Bloqueado sempre implica valor = 0
          if (!apto && valor !== 0) {
            errosAssertion++;
            exemplosViolacao.push(`ASSERT-2: bloqueado mas valor=${valor} | sal=${salario}`);
          }
          // 3. Jan 31 é elegível (limite exato do prazo)
          if (!jaRecebeuNoAno && fase === 'jan' && dia === 31 && !apto) {
            errosAssertion++;
            exemplosViolacao.push(`ASSERT-3: 31/jan deve ser elegível | ano=${anoFerias}`);
          }
          // 4. Nov/Dez do ano anterior: antes de 31/jan → deve ser elegível
          if (!jaRecebeuNoAno && fase === 'pre_prazo' && !apto) {
            errosAssertion++;
            exemplosViolacao.push(`ASSERT-4: nov/dez (pré-prazo) deve ser elegível | ano=${anoFerias}`);
          }
          // 5. Fev-Out do ano corrente: após 31/jan → sempre bloqueado por prazo
          if (!jaRecebeuNoAno && fase === 'pos_prazo' && apto) {
            errosAssertion++;
            exemplosViolacao.push(`ASSERT-5: fev-out (pós-prazo) deve ser bloqueado | ano=${anoFerias}`);
          }
          // 4. Valor máximo: salário/2 (12 avos, 1ª parcela)
          if (apto && valor > salario / 2 + 0.01) {
            errosAssertion++;
            exemplosViolacao.push(`ASSERT-5: valor ${valor} excede máximo ${salario/2} | sal=${salario}`);
          }
        }
      }
    }
  }
}

const valorMedioElegivel = totalElegiveis > 0
  ? round2(totalValor / totalElegiveis)
  : 0;

console.log(`=== SIMULAÇÃO EXAUSTIVA — Adiantamento 13º nas Férias (Lei 4.749/65 art. 2º §2º) ===`);
console.log(`Cenários simulados: ${total.toLocaleString('pt-BR')}`);
console.log(`  Elegíveis:                ${totalElegiveis.toLocaleString('pt-BR')} (${(totalElegiveis/total*100).toFixed(1)}%)`);
console.log(`  Bloqueados (já recebeu):  ${totalBloqueadosDupla.toLocaleString('pt-BR')}`);
console.log(`  Bloqueados (prazo >31/jan):${totalBloqueadosPrazo.toLocaleString('pt-BR')}`);
console.log(`Valor médio 1ª parcela (elegíveis): R$ ${valorMedioElegivel.toLocaleString('pt-BR', {minimumFractionDigits:2})}`);
console.log(`Auto-validação: ${errosAssertion === 0 ? '✅ 0 erros de assertion' : `❌ ${errosAssertion} ERROS`}`);

if (errosAssertion > 0) {
  console.error('\nErros encontrados:');
  exemplosViolacao.slice(0, 10).forEach(e => console.error(' ', e));
  process.exit(1);
}

// Resumo por salário (ilustrativo)
console.log('\nElegibilidade por salário (% média entre anos):');
for (const salario of SALARIOS) {
  let eleg = 0, tot = 0;
  for (const anoFerias of ANOS) {
    const datas = gerarDatasSolicitacao(anoFerias);
    for (let meses = 1; meses <= 12; meses++) {
      for (const { data } of datas) {
        for (const jr of [false, true]) {
          tot++;
          if (elegivel(data, anoFerias, jr)) eleg++;
        }
      }
    }
  }
  console.log(`  R$ ${salario.toLocaleString('pt-BR').padStart(6)}: ${(eleg/tot*100).toFixed(1)}% elegíveis`);
}
