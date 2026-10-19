/** TEMPORÁRIO — resume o relatório da validação da aba Pagamentos. */
import { readFileSync, writeFileSync } from 'node:fs';

const r = JSON.parse(readFileSync('tmp-pagamentos-tab/relatorio.json', 'utf8'));
const d = r.desktop;
const a = d.antes;
const linhas = [
  `FALHAS: ${JSON.stringify(d.falhas)}`,
  `ERROS CONSOLE: ${JSON.stringify(d.erros)}`,
  '',
  `TÍTULO: ${a.titulo}`,
  `SUBTÍTULO: ${a.subtituloPresente} | PERÍODO: ${a.periodoChip} | CICLO: ${a.cicloChip}`,
  `KPIS: ${JSON.stringify(a.kpis, null, 1)}`,
  `FLUXO: ${JSON.stringify(a.fluxo)}`,
  `FORA DO FLUXO: ${a.foraDoFluxo}`,
  `FILTROS: ${JSON.stringify(a.filtros)}`,
  `COLUNAS: ${JSON.stringify(a.colunas)}`,
  `LINHAS (${a.linhas.length}) rolagemH=${a.rolagemHorizontal}:`,
  ...a.linhas.map((l) => `   - ${l}`),
  `AÇÕES: ${JSON.stringify(a.acoesNasLinhas)}`,
  `RODAPÉ: ${a.rodape}`,
  `LATERAIS: ${JSON.stringify(a.laterais)}`,
  `LEGENDA RESUMO: ${JSON.stringify(a.legendaResumo)}`,
  `PRÓXIMAS AÇÕES: ${JSON.stringify(a.proximasAcoes)}`,
  '',
  `PERÍODO (opções reais): ${JSON.stringify(d.periodoSelecionado)}`,
  `DIÁLOGO APROVAÇÃO: ${JSON.stringify((d.dialogoAprovacao || '').slice(0, 220))}`,
  `DIÁLOGO REJEIÇÃO: ${JSON.stringify((d.dialogoRejeicao || '').slice(0, 160))}`,
  `DIÁLOGO CONCILIAÇÃO: ${JSON.stringify((d.dialogoConciliacao || '').slice(0, 160))}`,
  `DIÁLOGO DETALHES: ${JSON.stringify((d.dialogoDetalhes || '').slice(0, 200))}`,
  `TOAST (guard do mock): ${JSON.stringify((d.toastMock || '').slice(0, 140))}`,
  `BARRA DE LOTE: ${d.barraLote}`,
  `FLUXO FILTRA → ${d.depoisFluxo?.linhas?.length ?? '—'} linha(s)`,
  `BUSCA "juliana" → ${d.depoisBusca?.linhas?.length ?? '—'} linha(s): ${JSON.stringify(d.depoisBusca?.linhas ?? [])}`,
  `ORDEM "Maior valor" → ${JSON.stringify((d.depoisOrdem?.linhas ?? []).map((l) => l.slice(0, 70)))}`,
  `AÇÃO LATERAL "${d.acaoTexto}" → ${d.depoisAcaoLateral?.linhas?.length ?? '—'} linha(s)`,
  `"VER TODAS" → aba Auditoria selecionada: ${d.abaAuditoriaAtiva}`,
  '',
  `TABLET 1024: rolagemH=${r['tablet-1024']?.aba?.rolagemHorizontal} erros=${r['tablet-1024']?.erros?.length} colunas=${r['tablet-1024']?.aba?.colunas?.length} linhas=${r['tablet-1024']?.aba?.linhas?.length}`,
  `MOBILE 390: rolagemH=${r['mobile-390']?.aba?.rolagemHorizontal} erros=${r['mobile-390']?.erros?.length} colunas=${r['mobile-390']?.aba?.colunas?.length} linhas=${r['mobile-390']?.aba?.linhas?.length}`,
];
writeFileSync('tmp-pagamentos-tab/resumo.txt', linhas.join('\n'));
console.log(linhas.join('\n'));
