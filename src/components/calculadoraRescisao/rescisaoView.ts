/**
 * ============================================================================
 * Modelo de APRESENTAÇÃO da Calculadora de Rescisão (`/calculadora-rescisao`).
 *
 * Este arquivo NÃO calcula nada: todo valor sai de `RescisaoResult`
 * (`@/utils/rescisaoCalc`), o motor canônico da tela. Aqui mora só a TRADUÇÃO
 * desse resultado para as listas/tabelas que o painel direito desenha
 * (demonstrativo, resumo, base de cálculo) — separada do JSX para poder ser
 * testada e reaproveitada sem tocar em regra de negócio.
 *
 * Regra da casa: nenhum número é inventado. Cada linha do demonstrativo é um
 * campo de `RescisaoResult`; cada linha da base de cálculo é uma soma dos
 * MESMOS campos que o motor já usou para chegar aos encargos.
 * ============================================================================
 */
import type { RescisaoResult } from '@/utils/rescisaoCalc';

/** Estado do formulário da calculadora (string em tudo: é o que os inputs devolvem). */
export interface RescisaoFormState {
  nomeColaborador: string;
  cpf: string;
  cargo: string;
  /** Não entra no payload de gravação — é informativo, ao lado do cargo. */
  departamento: string;
  salario: string;
  dataAdmissao: string;
  dataDesligamento: string;
  tipo: string;
  avisoTrabalhado: boolean;
  feriasVencidas: boolean;
  saldoFGTS: string;
  motivoDesligamento: string;
  observacoes: string;
}

/** Motor de cálculo escolhido no card "Mecanismo de cálculo". */
export type MecanismoCalculo = 'local' | 'servidor';

/**
 * Opção do combobox "Importar colaborador ativo". `cpf`/`matricula` só chegam
 * no modo demonstração (a consulta real projeta apenas `id, nome_completo`):
 * quando vêm vazios, a busca simplesmente filtra só por nome.
 */
export interface ColaboradorOpcao {
  id: string;
  nome_completo: string;
  cpf?: string | null;
  matricula?: string | null;
}

/** Resumo exibido no card do colaborador selecionado. */
export interface ColaboradorResumo {
  nome: string;
  cargo: string;
  departamento: string;
  matricula: string;
  fotoUrl: string | null;
}

/**
 * Linha da aba "Histórico" do painel de resultado.
 *
 * É o histórico da SESSÃO (cada cálculo disparado na tela), não o histórico
 * persistido: a gravação em `historico_rescisoes` continua sendo a do botão
 * "Salvar simulação", que é bloqueada no modo demonstração. Nada é inventado —
 * cada linha nasce do `RescisaoResult` que acabou de ser calculado.
 */
export interface HistoricoCalculo {
  id: string;
  /** ISO (`RescisaoResult.timestamp`) do momento do cálculo. */
  timestamp: string;
  nome: string;
  tipo: string;
  totalLiquido: number;
}

/** As MESMAS três opções que o `<Select>` da tela sempre teve. */
export const TIPOS_RESCISAO = [
  { value: 'sem_justa_causa', label: 'Sem Justa Causa' },
  { value: 'justa_causa', label: 'Justa Causa' },
  { value: 'pedido_demissao', label: 'Pedido de Demissão' },
] as const;

/** Rótulo legível do tipo de rescisão (cai no próprio valor se for desconhecido). */
export function labelTipoRescisao(tipo: string): string {
  return TIPOS_RESCISAO.find((t) => t.value === tipo)?.label ?? tipo;
}

export interface LinhaDemonstrativo {
  descricao: string;
  /** "6 dias", "45/12" — ou "-" quando a verba não tem referência proporcional. */
  referencia: string;
  valor: number;
}

export interface SecaoDemonstrativo {
  id: 'proventos' | 'descontos' | 'fgts';
  titulo: string;
  total: number;
  linhas: LinhaDemonstrativo[];
}

/**
 * Blocos do demonstrativo — os mesmos três da referência (PROVENTOS,
 * DESCONTOS, FGTS), com a "Referência" que o motor devolve (dias trabalhados,
 * dias de aviso, avos de férias e de 13º).
 */
export function montarDemonstrativo(result: RescisaoResult): SecaoDemonstrativo[] {
  return [
    {
      id: 'proventos',
      titulo: 'Proventos',
      total: result.totalProventos,
      linhas: [
        { descricao: 'Saldo de Salário', referencia: `${result.diasTrabalhados} dias`, valor: result.saldoSalario },
        { descricao: 'Aviso Prévio Indenizado', referencia: `${result.diasAviso} dias`, valor: result.avisoIndenizado },
        { descricao: 'Férias Vencidas', referencia: '-', valor: result.feriasVencidas },
        {
          descricao: 'Férias Proporcionais',
          referencia: `${result.mesesFerias}/12`,
          valor: result.feriasProporcionais,
        },
        { descricao: '1/3 Constitucional', referencia: '-', valor: result.tercoFerias },
        { descricao: '13º Proporcional', referencia: `${result.meses13}/12`, valor: result.decimoTerceiro },
      ],
    },
    {
      id: 'descontos',
      titulo: 'Descontos',
      total: result.totalDescontos,
      linhas: [
        { descricao: 'INSS', referencia: '-', valor: result.inss },
        { descricao: 'IRRF', referencia: '-', valor: result.irrf },
      ],
    },
    {
      id: 'fgts',
      titulo: 'FGTS',
      total: Math.round((result.fgtsRescisao + result.multaFGTS) * 100) / 100,
      linhas: [
        { descricao: 'FGTS sobre Rescisão', referencia: '8%', valor: result.fgtsRescisao },
        { descricao: 'Multa 40% FGTS', referencia: '-', valor: result.multaFGTS },
      ],
    },
  ];
}

export type TomResumo = 'success' | 'destructive' | 'info' | 'primary';

export interface ItemResumo {
  rotulo: string;
  valor: number;
  tom: TomResumo;
  /** Frase de apoio curta mostrada abaixo do rótulo. */
  detalhe: string;
}

export interface LinhaMemoria {
  rotulo: string;
  valor: string;
}

export interface ResumoRescisao {
  itens: ItemResumo[];
  memoria: LinhaMemoria[];
}

/** Resumo final + memória de cálculo (tipo, modo de cálculo, dias e avos usados). */
export function montarResumo(result: RescisaoResult, tipo: string, mecanismo: MecanismoCalculo): ResumoRescisao {
  return {
    itens: [
      {
        rotulo: 'Total de proventos',
        valor: result.totalProventos,
        tom: 'success',
        detalhe: 'Verbas rescisórias devidas',
      },
      {
        rotulo: 'Total de descontos',
        valor: result.totalDescontos,
        tom: 'destructive',
        detalhe: 'INSS + IRRF retidos na fonte',
      },
      {
        rotulo: 'Multa do FGTS',
        valor: result.multaFGTS,
        tom: 'info',
        detalhe: 'Entra no líquido, fora dos proventos',
      },
      {
        rotulo: 'Valor líquido estimado',
        valor: result.totalLiquido,
        tom: 'primary',
        detalhe: 'Proventos − descontos + multa FGTS',
      },
    ],
    memoria: [
      { rotulo: 'Tipo de rescisão', valor: labelTipoRescisao(tipo) },
      { rotulo: 'Modo de cálculo', valor: mecanismo === 'servidor' ? 'Servidor' : 'Local' },
      { rotulo: 'Dias trabalhados no mês', valor: `${result.diasTrabalhados} dias` },
      { rotulo: 'Avos de férias', valor: `${result.mesesFerias}/12` },
      { rotulo: 'Avos de 13º salário', valor: `${result.meses13}/12` },
      { rotulo: 'Dias de aviso prévio', valor: `${result.diasAviso} dias` },
    ],
  };
}

export interface LinhaBaseCalculo {
  descricao: string;
  /** Base sobre a qual o encargo foi aplicado. */
  base: number;
  /** Valor efetivamente retido/calculado sobre essa base. */
  encargo: number;
}

/**
 * Bases usadas pelo motor — as MESMAS somas que `utils/rescisaoCalc.ts` já faz
 * internamente, só expostas em tabela. A alíquota exibida é a EFETIVA
 * (`encargo / base`), nunca uma alíquota nominal fixa: INSS/IRRF são
 * progressivos e a tabela não deve afirmar um percentual que o motor não usou.
 */
export function montarBaseCalculo(result: RescisaoResult, saldoFGTS: number): LinhaBaseCalculo[] {
  const base13 = Math.round((result.saldoSalario + result.decimoTerceiro) * 100) / 100;
  const baseFGTS = Math.round((result.saldoSalario + result.avisoIndenizado + result.decimoTerceiro) * 100) / 100;

  return [
    { descricao: 'INSS (saldo + 13º)', base: base13, encargo: result.inss },
    { descricao: 'IRRF (saldo + 13º)', base: base13, encargo: result.irrf },
    { descricao: 'FGTS sobre a rescisão (8%)', base: baseFGTS, encargo: result.fgtsRescisao },
    {
      descricao: 'Multa do FGTS (saldo informado)',
      base: Math.round(saldoFGTS * 100) / 100,
      encargo: result.multaFGTS,
    },
  ];
}

/** Alíquota EFETIVA em % (encargo ÷ base). Zero quando não há base. */
export function aliquotaEfetiva(linha: LinhaBaseCalculo): number {
  if (!linha.base) return 0;
  return Math.round((linha.encargo / linha.base) * 10000) / 100;
}
