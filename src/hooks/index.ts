export { useDebounce } from "./useDebounce";
export { useLocalStorage } from "./useLocalStorage";
export { useMediaQuery } from "./useMediaQuery";
export { useToast } from "./useToast";
export { useAuth } from "./useAuth";
export { useEmpresas } from "./useEmpresas";
export { useNotificacoes } from "./useNotificacoes";
export { useIsMobile } from "./use-mobile";
export { useColaboradores } from "./useColaboradores";
export { useAdmissoes } from "./useAdmissoes";
export { useAdmissaoWorkflow } from "./useAdmissaoWorkflow";
export { useContratacaoDigital } from "./useContratacaoDigital";
export { useAssinaturaDigital } from "./useAssinaturaDigital";
export { useAfastamentos } from "./useAfastamentos";
export { useCargos } from "./useCargos";
export { useDepartamentos } from "./useDepartamentos";
export { useFerias } from "./useFerias";
export { useFolha } from "./useFolha";
export { useBeneficios } from "./useBeneficios";
export { useBeneficiosColaborador } from "./useBeneficiosColaborador";
export { useValeTransporte } from "./useValeTransporte";
export { useContratos } from "./useContratos";
export { useDesligamentos } from "./useDesligamentos";
export { usePonto } from "./usePonto";
export { useDocumentos } from "./useDocumentos";
export { useFeriados } from "./useFeriados";
export { usePDFExport } from "./usePDFExport";
export { useExcelExport } from "./useExcelExport";
export { useESocial } from "./useESocial";
export { useLocaisTrabalho } from "./useLocaisTrabalho";
export { useHistoricoContratos } from "./useHistoricoContratos";
export { useHorasExtras } from "./useHorasExtras";
export { useConfiguracoesIntervalo } from "./useConfiguracoesIntervalo";
export { useWebhooksAvancados, useWebhookLogs } from "./useWebhooksAvancados";
export { usePontosAbertos } from "./usePontosAbertos";
export { useNavigationGuard } from "./useNavigationGuard";
export { useNow } from "./useNow";
export { usePeriodosAquisitivos } from "./usePeriodosAquisitivos";
export { usePontoOffline } from "./usePontoOffline";

// Novas tabelas (doc externo)
export {
  useBatidasPonto, useBatidasPontoDia, useRegistrarBatida,
  useFaltas, useFaltasColaborador, useCriarFalta, useAtualizarFalta, useExcluirFalta,
  useMedidasDisciplinares, useMedidasDisciplinaresColaborador, useCriarMedidaDisciplinar, useAtualizarMedidaDisciplinar,
  useEpis, useCriarEpi, useAtualizarEpi, useExcluirEpi,
  useEpisEntregas, useEpisEntregasColaborador, useCriarEpiEntrega, useDevolverEpi,
  useJornadaHorarios, useSalvarGradeHorarios,
  useBancoHorasConfig, useSalvarBancoHorasConfig,
} from "./useNovasTabelas";

// Colaborador Detalhes
export {
  useDependentes, useCriarDependente, useExcluirDependente, useAtualizarDependente,
  useContatosEmergencia, useCriarContatoEmergencia, useExcluirContatoEmergencia,
  useHistoricoSalarial, useCriarRegistroSalarial,
  useASOs, useCriarASO,
  useFormacoes, useCriarFormacao, useExcluirFormacao,
  useDadosEstrangeiro, useSalvarDadosEstrangeiro,
  useDeficiencia, useSalvarDeficiencia,
  usePeriodoExperiencia, useSalvarPeriodoExperiencia,
  useAnotacoes, useCriarAnotacao, useExcluirAnotacao,
  useEtnias, useIdentidadesGenero, useTiposAdmissao, useTiposEstabilidade,
  useTimes, useWebhooks, useCriarWebhook,
  useFeriasColetivas, useCriarFeriasColetivas,
  useCamposCustomizados,
} from "./useColaboradorDetalhes";

// Tabelas de Referência
export {
  useNacionalidades, useTiposDesligamento, useTiposAvisoPrevio,
  useTiposDeficiencia, useTiposPagamento, useTiposSalario,
  useRelacionamentosDependentes, useGenerosDocumento,
  useTiposVisto, useCondicoesIngresso, useTemposResidencia,
  useDescricoesLogradouro, usePaises, useCategoriasTrabalhador,
  useRelacionamentosContatoEmergencia, useMotivosAfastamento,
  useCentrosCusto, useCriarCentroCusto, useAtualizarCentroCusto, useExcluirCentroCusto,
  useContasBancarias, useCriarContaBancaria, useAtualizarContaBancaria, useExcluirContaBancaria,
  useDadosEstagiario, useSalvarDadosEstagiario,
  useDocumentosPessoais, useCriarDocumentoPessoal, useExcluirDocumentoPessoal,
  useFeriasAprovacoes, useCriarFeriasAprovacao, useAtualizarFeriasAprovacao,
  useFeriasArquivos, useCriarFeriasArquivo,
  useDependentesBeneficios, useVincularDependenteBeneficio, useDesvincularDependenteBeneficio,
} from "./useTabelasReferencia";
