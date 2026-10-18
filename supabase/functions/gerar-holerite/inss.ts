// Delega ao canônico _shared/inss.ts — cálculo em centavos inteiros com
// truncamento único (IN RFB 2110/2022). A cópia local acumulava faixas em
// float e arredondava, divergindo 1 centavo do canônico em bases na
// fronteira (ex.: 1.700,50 → 128,73 e não 128,72).
export { calcularINSS as calcularInssEmpregado } from '../_shared/inss.ts';
