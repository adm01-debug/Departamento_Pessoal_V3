// Centralized Services Export
export { authService } from './authService';
export { afastamentoService } from './afastamentoService';
export { contratoService } from './contratoService';
export { bancoHorasService } from './bancoHorasService';
export { desligamentoService } from './desligamentoService';
export { auditoriaService, notificacaoService } from './auditoriaService';
export { historicoContratoService } from './historicoContratoService';
export { horaExtraService } from './horaExtraService';
export { intervaloService } from './intervaloService';
export { webhookService } from './webhookService';
export { pontoAbertoService } from './pontoAbertoService';
export { pesquisaService } from './pesquisaService';
export { workflowService } from './workflowService';
export { turnoService } from './turnoService';
export { jornadaService } from './jornadaService';
export { comunicacaoService } from './comunicacaoService';
export { despesaService } from './despesaService';
export { controleAcessoService } from './controleAcessoService';
export { lgpdService } from './lgpdService';
export { avaliacaoService } from './avaliacaoService';
export { batidasPontoService } from './batidasPontoService';
export { faltasService } from './faltasService';
export { medidasDisciplinaresService } from './medidasDisciplinaresService';
export { episService, episEntregasService } from './episService';
export { jornadaHorariosService } from './jornadaHorariosService';
export { bancoHorasConfigService } from './bancoHorasConfigService';
export { pontoService } from './pontoService';
export { provisaoService } from './provisaoService';
export { cnabService } from './cnabService';
export type { CNABConfig } from './cnabService';
export { contabilidadeService } from './contabilidadeService';
export { beneficioService } from './beneficioService';
export * from './calculoBeneficiosService';
export { catalogoCursoService } from './catalogoCursoService';

// Refactored Services
export { cargoService } from './cargoService';
export { departamentoService } from './departamentoService';
export { localTrabalhoService } from './localTrabalhoService';
export { colaboradorService } from './colaboradorService';
export { empresaService } from './empresaService';
export { feriasService } from './feriasService';
export { folhaService } from './folhaService';
export { documentoService } from './documentoService';
export { admissaoService } from './admissaoService';

// Utilities
export const fgtsService = { calcular: (salario: number) => salario * 0.08 };

