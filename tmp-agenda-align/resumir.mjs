import { readFileSync } from 'node:fs';

const dados = JSON.parse(readFileSync(process.argv[2], 'utf8'));
for (const item of dados) {
  console.log(
    JSON.stringify({
      largura: item.largura,
      painel: item.painel?.h,
      header: item.header?.h,
      linhas: `${item.alturaMin}..${item.alturaMax}`,
      ultimoDia: item.ultimoDiaH,
      sobra: item.sobraAbaixoDoUltimoDia,
      diffBases: item.diferencaBases,
      overflowLinhas: item.dias.reduce((soma, d) => soma + Math.max(0, d.overflow), 0),
      overflowPainel: item.overflowPainel,
      overflowDocumento: item.overflowDocumento,
      cards: item.cards,
    })
  );
}
