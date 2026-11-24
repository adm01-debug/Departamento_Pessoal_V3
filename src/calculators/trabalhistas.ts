/**
 * @fileoverview Barrel re-export — mantém compatibilidade com imports existentes.
 * Módulos movidos para arquivos separados dentro de src/calculators/
 */
export { SALARIO_MINIMO_2026 } from './tabelas';
export { calcularINSS, calcularIRRF, calcularFGTS } from './impostos';
export { calcularHorasExtras, calcularDSR, calcular13Salario } from './trabalhista-base';
export { calcularDecimo13, calcularFerias, calcularAdicionalNoturno, calcularPericulosidade, calcularInsalubridade, calcularDescontoVT, calcularPensaoAlimenticia, calcularSobreaviso, calcularProntidao, calcularGratificacao, calcularComissao, calcularAdicionalTransferencia, calcularSalarioFamilia, calcularSalarioMaternidade, calcularAuxilioDoenca, calcularDiarias, calcularQuilometragem, calcularBancoHoras, calcularMedias } from './beneficios';
export type { ParamsDecimo13, GrauInsalubridade } from './beneficios';
export { calcularRescisao, calcularAvisoPrevioIndenizado, calcularSeguroDesemprego, calcularMultaFGTS, calcularMulta477, calcularProvisaoFerias, calcularProvisao13, calcularEncargos, calcularProRata, calcularMargemConsignado, calcularPLR } from './rescisao';
export type { TipoRescisao } from './rescisao';
export { calcularFolhaCompleta, calcularSalarioLiquido } from './folhaCompleta';
export type { ParamsFolhaCompleta } from './folhaCompleta';
