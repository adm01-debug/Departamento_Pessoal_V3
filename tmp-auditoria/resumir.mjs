import { readFileSync } from 'node:fs';

const dados = JSON.parse(readFileSync(process.argv[2], 'utf8'));
for (const item of dados) {
  console.log(
    `${item.status === 'APROVADO' ? 'OK  ' : 'FALHA'} ${item.id} — ${item.descricao} | esperado=${JSON.stringify(item.esperado)} obtido=${JSON.stringify(item.obtido)}`
  );
}
console.log('---');
console.log({
  total: dados.length,
  aprovados: dados.filter((d) => d.status === 'APROVADO').length,
  reprovados: dados.filter((d) => d.status !== 'APROVADO').length,
});
