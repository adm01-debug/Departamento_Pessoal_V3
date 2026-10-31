// S-2299 (Desligamento) — corpo de evtDeslig, leiaute S-1.2.
//
// Estrutura (MOS / leiaute S-1.2, sem XSD versionado no repo — conferir com o
// XSD oficial antes de produção):
//   ideVinculo { cpfTrab, matricula }
//   infoDeslig {
//     mtvDeslig, dtDeslig, [dtAvPrv], indPagtoAPI, [dtProjFimAPI],
//     pensAlim, [percAliment], [vrAlim], [nrCertObito], [nrProcTrab],
//     indCumprParc, ...
//     [verbasResc {                         <- DENTRO de infoDeslig
//       dmDev+ { ideDmDev,
//         infoPerApur { ideEstabLot+ { tpInsc, nrInsc, codLotacao,
//           detVerbas+ { codRubr, ideTabRubr, [qtdRubr], [fatorRubr], vrRubr, indApurIR } } } }
//     }]
//   }
//
// Campos obrigatórios do leiaute sem valor no payload NÃO recebem valor
// inventado (exceto os defaults históricos já existentes): o evento sai
// incompleto e o eSocial recusa, em vez de transmitir dado falso.

export type XmlEscape = (v: unknown) => string;

type Rec = Record<string, unknown>;

const present = (v: unknown) => v !== undefined && v !== null && v !== '';

function opt(xe: XmlEscape, tag: string, v: unknown): string {
  return present(v) ? `<${tag}>${xe(v)}</${tag}>` : '';
}

function montarDetVerbas(xe: XmlEscape, vb: Rec): string {
  return (
    `<detVerbas><codRubr>${xe(vb.codRubr ?? '')}</codRubr>` +
    `<ideTabRubr>${xe(vb.ideTabRubr ?? '1')}</ideTabRubr>` +
    opt(xe, 'qtdRubr', vb.qtdRubr) +
    opt(xe, 'fatorRubr', vb.fatorRubr) +
    `<vrRubr>${xe(vb.vrRubr ?? '0')}</vrRubr>` +
    opt(xe, 'indApurIR', vb.indApurIR) +
    `</detVerbas>`
  );
}

function montarIdeEstabLot(xe: XmlEscape, est: Rec, detVerbas: Rec[]): string {
  return (
    `<ideEstabLot>` +
    opt(xe, 'tpInsc', est.tpInsc) +
    opt(xe, 'nrInsc', est.nrInsc) +
    opt(xe, 'codLotacao', est.codLotacao) +
    detVerbas.map((vb) => montarDetVerbas(xe, vb)).join('') +
    `</ideEstabLot>`
  );
}

function montarDmDev(xe: XmlEscape, dm: Rec): string {
  // Formato canônico: dm.ideEstabLot = [{ tpInsc, nrInsc, codLotacao, detVerbas: [...] }].
  // Compatibilidade: dm.detVerbas direto vira um único ideEstabLot com os
  // dados de estabelecimento do próprio dm (tpInsc/nrInsc/codLotacao).
  let estabs: string;
  if (Array.isArray(dm.ideEstabLot)) {
    estabs = (dm.ideEstabLot as Rec[])
      .map((est) => montarIdeEstabLot(xe, est, Array.isArray(est.detVerbas) ? (est.detVerbas as Rec[]) : []))
      .join('');
  } else if (Array.isArray(dm.detVerbas)) {
    estabs = montarIdeEstabLot(xe, dm, dm.detVerbas as Rec[]);
  } else {
    estabs = '';
  }
  return (
    `<dmDev><ideDmDev>${xe(dm.ideDmDev ?? '1')}</ideDmDev>` +
    (estabs ? `<infoPerApur>${estabs}</infoPerApur>` : '') +
    `</dmDev>`
  );
}

export function montarS2299(xe: XmlEscape, d: Rec, matriculaFallback: string): string {
  let infoDeslig =
    `<mtvDeslig>${xe(d.mtvDeslig ?? d.mTvDeslig ?? '01')}</mtvDeslig>` +
    `<dtDeslig>${xe(d.dtDeslig ?? new Date().toISOString().split('T')[0])}</dtDeslig>` +
    opt(xe, 'dtAvPrv', d.dtAvPrv) +
    `<indPagtoAPI>${xe(d.indPagtoAPI ?? 'N')}</indPagtoAPI>`;
  if (d.indPagtoAPI === 'S') infoDeslig += opt(xe, 'dtProjFimAPI', d.dtProjFimAPI);
  if (present(d.pensAlim)) {
    infoDeslig += `<pensAlim>${xe(d.pensAlim)}</pensAlim>`;
    infoDeslig += opt(xe, 'percAliment', d.percAliment);
    infoDeslig += opt(xe, 'vrAlim', d.vrAlim);
  }
  infoDeslig += opt(xe, 'nrCertObito', d.nrCertObito);
  infoDeslig += opt(xe, 'nrProcTrab', d.nrProcTrab);
  infoDeslig += opt(xe, 'indCumprParc', d.indCumprParc);

  if (Array.isArray(d.verbasResc) && d.verbasResc.length > 0) {
    infoDeslig +=
      '<verbasResc>' + (d.verbasResc as Rec[]).map((dm) => montarDmDev(xe, dm)).join('') + '</verbasResc>';
  }

  return (
    `<ideVinculo><cpfTrab>${xe(d.cpfTrab ?? '')}</cpfTrab>` +
    `<matricula>${xe(d.matricula ?? matriculaFallback)}</matricula></ideVinculo>` +
    `<infoDeslig>${infoDeslig}</infoDeslig>`
  );
}
