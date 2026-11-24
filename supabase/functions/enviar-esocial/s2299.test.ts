import { assert, assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { montarS2299 } from './s2299.ts';

const xe = (v: unknown) =>
  v === null || v === undefined ? '' : String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

Deno.test('S-2299: verbasResc fica DENTRO de infoDeslig', () => {
  const xml = montarS2299(xe, {
    cpfTrab: '12345678909', matricula: 'M1', mtvDeslig: '02', dtDeslig: '2026-10-01',
    indPagtoAPI: 'N', pensAlim: '0', indCumprParc: '4',
    verbasResc: [{ ideDmDev: 'R1', tpInsc: '1', nrInsc: '12345678000190', codLotacao: 'L1',
      detVerbas: [{ codRubr: '1000', ideTabRubr: 'T1', vrRubr: '1500.00', indApurIR: '0' }] }],
  }, 'fallback');
  const ini = xml.indexOf('<infoDeslig>');
  const fim = xml.indexOf('</infoDeslig>');
  const vr = xml.indexOf('<verbasResc>');
  assert(ini >= 0 && vr > ini && vr < fim, 'verbasResc precisa estar entre <infoDeslig> e </infoDeslig>');
  assert(xml.endsWith('</infoDeslig>'));
});

Deno.test('S-2299: detVerbas fica em dmDev > infoPerApur > ideEstabLot', () => {
  const xml = montarS2299(xe, {
    cpfTrab: '1', verbasResc: [{ ideDmDev: 'R1', tpInsc: '1', nrInsc: '1', codLotacao: 'L1',
      detVerbas: [{ codRubr: '1000', vrRubr: '10' }] }],
  }, 'm');
  assertStringIncludes(xml,
    '<dmDev><ideDmDev>R1</ideDmDev><infoPerApur><ideEstabLot><tpInsc>1</tpInsc><nrInsc>1</nrInsc>' +
    '<codLotacao>L1</codLotacao><detVerbas><codRubr>1000</codRubr><ideTabRubr>1</ideTabRubr>' +
    '<vrRubr>10</vrRubr></detVerbas></ideEstabLot></infoPerApur></dmDev>');
  assertEquals(xml.includes('<dmDev><ideDmDev>R1</ideDmDev><detVerbas>'), false);
});

Deno.test('S-2299: formato canônico com vários ideEstabLot', () => {
  const xml = montarS2299(xe, {
    verbasResc: [{ ideDmDev: 'R1', ideEstabLot: [
      { tpInsc: '1', nrInsc: 'A', codLotacao: 'L1', detVerbas: [{ codRubr: '1', vrRubr: '1' }] },
      { tpInsc: '1', nrInsc: 'B', codLotacao: 'L2', detVerbas: [{ codRubr: '2', vrRubr: '2' }] },
    ] }],
  }, 'm');
  assertEquals(xml.split('<ideEstabLot>').length - 1, 2);
});

Deno.test('S-2299: sem verbasResc não emite o grupo e escapa campos', () => {
  const xml = montarS2299(xe, { cpfTrab: '<x>', indPagtoAPI: 'S', dtProjFimAPI: '2026-11-01' }, 'm');
  assertEquals(xml.includes('<verbasResc>'), false);
  assertStringIncludes(xml, '<cpfTrab>&lt;x&gt;</cpfTrab>');
  assertStringIncludes(xml, '<matricula>m</matricula>');
  assertStringIncludes(xml, '<dtProjFimAPI>2026-11-01</dtProjFimAPI>');
});
