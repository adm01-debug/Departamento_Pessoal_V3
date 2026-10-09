/**
 * ============================================================================
 * MOCK VISUAL — Desligamentos (rota `/desligamentos`).
 *
 * ESCOPO: exclusivamente apresentação/validação de LAYOUT — KPIs, gráfico de
 * turnover, tabela (desktop), lista (mobile), filtros, drawer de detalhes,
 * checklist e estados de cada badge. Nenhuma linha é lida do Supabase: o hook
 * `useDesligamentos` curto-circuita a leitura com estes registros fictícios.
 *
 * ⚠️ SOMENTE LEITURA. As ações de escrita (Novo Desligamento, Calcular Agora,
 * Homologar, itens do checklist e Excluir) continuam apontando para o Supabase
 * real, então ficam BLOQUEADAS enquanto este mock estiver ligado — ver
 * `bloquearEscritaDesligamento()`. Sem o bloqueio, um clique gravaria um
 * desligamento órfão com `empresa_id`/`colaborador_id` fictícios.
 *
 * GATE (mesmo padrão de src/mocks/admissoesMock.ts, auditoriaMock.ts,
 * colaboradoresMock.ts e dashboardMockData.ts): liga somente com as DUAS
 * condições abaixo — logo, nunca em produção:
 *   1. `import.meta.env.DEV` (build de desenvolvimento);
 *   2. `VITE_DESLIGAMENTOS_MOCK=true` no `.env`/`.env.local`.
 * A guarda `MODE !== 'test'` é essencial: o Vitest carrega o mesmo `.env.local`
 * do `vite dev` — sem ela os testes receberiam estes dados fictícios em vez das
 * fixtures que cada teste monta.
 *
 * PARA DESATIVAR: defina `VITE_DESLIGAMENTOS_MOCK=false` no `.env.local` e
 * reinicie o `vite dev`.
 * PARA REMOVER DE VEZ: apague este arquivo e os trechos marcados com
 * "MOCK VISUAL — ver src/mocks/desligamentosMock.ts" em:
 *   - src/hooks/useDesligamentos.ts
 *   - src/pages/DesligamentosPage.tsx
 *   - src/components/desligamentos/NovoDesligamentoDialog.tsx
 *   - src/components/desligamentos/DesligamentoDetailSheet.tsx
 *   - src/components/ponto/PontoAuditTimeline.tsx (trilha de auditoria da aba
 *     "Trilha de Auditoria" — só o ramo `filterTabela === 'desligamentos'`)
 * ============================================================================
 */
import { toast } from 'sonner';
import { MOCK_COLABORADORES, MOCK_EMPRESA } from './colaboradoresMock';
import { addDaysLocal, formatDateLocalISO, parseDateLocalISO } from '@/utils/dateLocal';

/** Ativa o mock apenas em dev e apenas com o opt-in explícito da env var. */
export function isDesligamentosMockEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.MODE !== 'test' && import.meta.env.VITE_DESLIGAMENTOS_MOCK === 'true';
}

/** Valores aceitos pela coluna `tipo` — os mesmos de `TipoBadge`/filtro. */
export type TipoDesligamentoMock =
  'sem_justa_causa' | 'com_justa_causa' | 'pedido_demissao' | 'acordo_mutuo' | 'termino_contrato';

/** Valores aceitos pela coluna `status` — cobrem `StatusBadge`, filtro e KPIs. */
export type StatusDesligamentoMock =
  | 'pendente'
  | 'comunicado'
  | 'calculado'
  | 'homologado'
  | 'pagamento'
  | 'finalizado'
  | 'cancelado'
  | 'em_andamento'
  | 'concluido';

/** Etapas do `EtapaStepper` do drawer. */
export type EtapaDesligamentoMock =
  'comunicacao' | 'documentacao' | 'calculo' | 'homologacao' | 'pagamento' | 'finalizado';

/** Colaborador embutido (o serviço real entrega `colaborador:colaboradores(...)`). */
export interface ColaboradorDoDesligamentoMock {
  nome_completo: string;
  cpf: string;
  cargo: string;
  departamento: string;
  data_admissao: string;
}

/** Campos consumidos pelo layout da tela (lista + drawer + exportação). */
export interface DesligamentoMockRow {
  id: string;
  empresa_id: string;
  colaborador_id: string;
  colaborador: ColaboradorDoDesligamentoMock;
  data_desligamento: string;
  data_aviso_previo: string | null;
  tipo: TipoDesligamentoMock;
  status: StatusDesligamentoMock;
  etapa: EtapaDesligamentoMock;
  motivo: string | null;
  salario_base: number;
  /* ── Bloco de rescisão (nulos enquanto não houve cálculo) ── */
  saldo_salario: number | null;
  decimo_terceiro: number | null;
  ferias_proporcionais: number | null;
  ferias_vencidas: number | null;
  terco_constitucional: number | null;
  aviso_previo: number | null;
  total_proventos: number | null;
  total_descontos: number | null;
  inss: number | null;
  irrf: number | null;
  multa_fgts: number | null;
  valor_liquido: number | null;
  /* ── Checklist (8 itens de `DesligamentoChecklist`) ── */
  checklist_comunicacao: boolean;
  checklist_documentacao: boolean;
  checklist_calculo_rescisao: boolean;
  checklist_revogacao_acessos: boolean;
  checklist_devolucao_equipamentos: boolean;
  checklist_esocial: boolean;
  checklist_homologacao: boolean;
  checklist_pagamento: boolean;
  /* ── Controle ── */
  created_at: string;
  updated_at: string;
}

/* ─── Datas relativas a "hoje" (a tela continua coerente em qualquer mês) ─── */

/**
 * Data `YYYY-MM-DD` de `mesesAtras` meses atrás, no dia `dia`.
 *
 * Usa os getters LOCAIS (`formatDateLocalISO`) de propósito: `toISOString()`
 * devolveria o dia anterior em UTC-3. Os dias usados na base são 5–25 para que
 * o `new Date('YYYY-MM-DD')` (que o JS lê como UTC) não derrape para o mês
 * anterior em fusos negativos — isso bagunçaria o gráfico de turnover.
 */
function dataRelativa(mesesAtras: number, dia: number): string {
  const hoje = new Date();
  return formatDateLocalISO(new Date(hoje.getFullYear(), hoje.getMonth() - mesesAtras, dia));
}

/** `YYYY-MM-DD` somando (ou subtraindo) dias de uma data local. */
function somarDias(iso: string, dias: number): string {
  const base = parseDateLocalISO(iso);
  return base ? formatDateLocalISO(addDaysLocal(base, dias)) : iso;
}

/** Timestamp ISO de `horas` horas atrás (colunas TIMESTAMPTZ). */
function horasAtras(horas: number): string {
  return new Date(Date.now() - horas * 3_600_000).toISOString();
}

/* ─── Checklist ───────────────────────────────────────────────────────────── */

/** Mesma ordem de `DesligamentoChecklist.CHECKLIST_ITEMS`. */
const CHAVES_CHECKLIST = [
  'checklist_comunicacao',
  'checklist_documentacao',
  'checklist_calculo_rescisao',
  'checklist_revogacao_acessos',
  'checklist_devolucao_equipamentos',
  'checklist_esocial',
  'checklist_homologacao',
  'checklist_pagamento',
] as const;

type ChaveChecklist = (typeof CHAVES_CHECKLIST)[number];

/** `'11000000'` → objeto com os 8 booleanos do checklist (1 = cumprido). */
function checklistDe(mascara: string): Record<ChaveChecklist, boolean> {
  const objeto = {} as Record<ChaveChecklist, boolean>;
  CHAVES_CHECKLIST.forEach((chave, i) => {
    objeto[chave] = mascara[i] === '1';
  });
  return objeto;
}

/* ─── Encargos e bloco de rescisão ────────────────────────────────────────── */

function arredondar(valor: number): number {
  return Math.trunc(valor * 100) / 100;
}

/**
 * INSS progressivo usado SÓ para os totais da tela fecharem entre si.
 *
 * O cálculo oficial — com todas as regras, tetos e casos especiais — é o de
 * `src/calculators/rescisao.ts`; este mock não o substitui nem o replica.
 */
const FAIXAS_INSS = [
  { ate: 1518.0, aliquota: 0.075 },
  { ate: 2793.88, aliquota: 0.09 },
  { ate: 4190.83, aliquota: 0.12 },
  { ate: 8157.41, aliquota: 0.14 },
];

function inssSobre(base: number): number {
  let anterior = 0;
  let total = 0;
  for (const faixa of FAIXAS_INSS) {
    const tributavel = Math.min(base, faixa.ate) - anterior;
    if (tributavel <= 0) break;
    total += tributavel * faixa.aliquota;
    anterior = faixa.ate;
  }
  return arredondar(total);
}

/** IRRF simplificado (mesma ressalva do INSS acima). */
const FAIXAS_IRRF = [
  { ate: 2259.2, aliquota: 0, deducao: 0 },
  { ate: 2826.65, aliquota: 0.075, deducao: 169.44 },
  { ate: 3751.05, aliquota: 0.15, deducao: 381.44 },
  { ate: 4664.68, aliquota: 0.225, deducao: 662.77 },
  { ate: Number.POSITIVE_INFINITY, aliquota: 0.275, deducao: 896.0 },
];

function irrfSobre(base: number): number {
  const faixa = FAIXAS_IRRF.find((item) => base <= item.ate) ?? FAIXAS_IRRF[FAIXAS_IRRF.length - 1];
  return arredondar(Math.max(0, base * faixa.aliquota - faixa.deducao));
}

/** Aviso prévio registrado na base fictícia. */
interface AvisoMock {
  /** Dias registrados em `data_aviso_previo` (null = sem aviso). */
  dias: number | null;
  /** Indenizado (pago) em vez de trabalhado — é o que entra como verba. */
  indenizado: boolean;
}

/** Bloco numérico da rescisão, exatamente como o `DesligamentoDetailSheet` o lê. */
interface BlocoRescisaoMock {
  saldo_salario: number;
  decimo_terceiro: number;
  ferias_proporcionais: number;
  ferias_vencidas: number;
  terco_constitucional: number;
  aviso_previo: number;
  total_proventos: number;
  total_descontos: number;
  inss: number;
  irrf: number;
  multa_fgts: number;
  valor_liquido: number;
}

type BlocoRescisaoNulo = { [K in keyof BlocoRescisaoMock]: null };

/**
 * Avos de 13º do ano do desligamento: meses com ao menos 15 dias trabalhados,
 * contando o mês do desligamento quando o dia é ≥ 15 (regra usual da folha).
 */
function avosDecimoTerceiro(admissao: string, desligamento: string): number {
  const inicio = parseDateLocalISO(admissao);
  const fim = parseDateLocalISO(desligamento);
  if (!inicio || !fim) return 0;

  const marco = inicio.getFullYear() === fim.getFullYear() ? inicio : new Date(fim.getFullYear(), 0, 1);
  let avos = (fim.getFullYear() - marco.getFullYear()) * 12 + (fim.getMonth() - marco.getMonth());
  if (fim.getDate() >= 15) avos += 1;
  return Math.max(0, Math.min(12, avos));
}

/**
 * Avos de FÉRIAS do período aquisitivo EM CURSO no desligamento: meses (ou
 * fração ≥ 15 dias) desde o último aniversário de admissão.
 *
 * Férias de períodos aquisitivos já FECHADOS não entram aqui — elas vivem em
 * `feriasVencidasPeriodos`, como no serviço real.
 */
function avosFeriasProporcionais(admissao: string, desligamento: string): number {
  const inicio = parseDateLocalISO(admissao);
  const fim = parseDateLocalISO(desligamento);
  if (!inicio || !fim) return 0;

  let decorridos = (fim.getFullYear() - inicio.getFullYear()) * 12 + (fim.getMonth() - inicio.getMonth());
  if (fim.getDate() < inicio.getDate()) decorridos -= 1;
  return Math.max(0, Math.min(12, decorridos % 12));
}

/**
 * Monta o bloco de rescisão mantendo os invariantes do cálculo real:
 * `total_proventos` é a soma das verbas, `total_descontos` é INSS + IRRF e
 * `valor_liquido = total_proventos - total_descontos`. A multa do FGTS fica
 * FORA do líquido (é depósito, não verba) — igual ao serviço.
 */
function montarRescisao(params: {
  salario: number;
  tipo: TipoDesligamentoMock;
  diasTrabalhados: number;
  meses13: number;
  mesesFerias: number;
  feriasVencidasPeriodos: number;
  aviso: AvisoMock;
  saldoFgts: number;
}): BlocoRescisaoMock {
  const { salario, tipo, diasTrabalhados, meses13, mesesFerias, feriasVencidasPeriodos, aviso, saldoFgts } = params;

  const saldoSalario = arredondar((salario / 30) * diasTrabalhados);
  const decimoTerceiro = arredondar((salario / 12) * meses13);
  const feriasProporcionais = arredondar((salario / 12) * mesesFerias);
  const feriasVencidas = arredondar(salario * feriasVencidasPeriodos);
  const tercoConstitucional = arredondar((feriasProporcionais + feriasVencidas) / 3);
  const avisoPrevio = aviso.indenizado && aviso.dias ? arredondar((salario / 30) * aviso.dias) : 0;

  const totalProventos = arredondar(
    saldoSalario + decimoTerceiro + feriasProporcionais + feriasVencidas + tercoConstitucional + avisoPrevio
  );
  const inss = arredondar(inssSobre(saldoSalario) + inssSobre(decimoTerceiro));
  const irrf = arredondar(irrfSobre(saldoSalario) + irrfSobre(decimoTerceiro));
  const totalDescontos = arredondar(inss + irrf);
  const multaFgts =
    tipo === 'sem_justa_causa'
      ? arredondar(saldoFgts * 0.4)
      : tipo === 'acordo_mutuo'
        ? arredondar(saldoFgts * 0.2)
        : 0;

  return {
    saldo_salario: saldoSalario,
    decimo_terceiro: decimoTerceiro,
    ferias_proporcionais: feriasProporcionais,
    ferias_vencidas: feriasVencidas,
    terco_constitucional: tercoConstitucional,
    aviso_previo: avisoPrevio,
    total_proventos: totalProventos,
    total_descontos: totalDescontos,
    inss,
    irrf,
    multa_fgts: multaFgts,
    valor_liquido: arredondar(totalProventos - totalDescontos),
  };
}

/* ─── Base fictícia ───────────────────────────────────────────────────────── */

/**
 * Quando o desligamento aconteceu.
 *
 * - `diasAtras`: dentro do MÊS CORRENTE (alimenta o KPI "Este Mês"), sempre
 *   entre o dia 1 e hoje — nunca no futuro;
 * - `mesesAtras` + `dia`: mês já fechado, no dia fixo (alimenta o gráfico de
 *   turnover dos últimos 12 meses).
 */
type QuandoMock = { diasAtras: number } | { mesesAtras: number; dia: number };

/**
 * Data do mês CORRENTE `diasAtras` dias atrás, sem sair do mês.
 *
 * O mínimo é o dia **2**, não o dia 1: `new Date('YYYY-MM-01')` é meia-noite UTC
 * e, num fuso negativo (UTC-3), cai no mês ANTERIOR — o que zeraria o KPI
 * "Este Mês" da tela mesmo com o registro sendo do mês corrente.
 */
function dataDoMesCorrente(diasAtras: number): string {
  const hoje = new Date();
  return formatDateLocalISO(new Date(hoje.getFullYear(), hoje.getMonth(), Math.max(2, hoje.getDate() - diasAtras)));
}

function dataDoDesligamento(quando: QuandoMock): string {
  return 'diasAtras' in quando ? dataDoMesCorrente(quando.diasAtras) : dataRelativa(quando.mesesAtras, quando.dia);
}

/**
 * Configuração enxuta de cada linha fictícia — tudo que é dedutível (saldo de
 * salário, avos de 13º/férias, proventos, descontos, líquido, `data_aviso_previo`)
 * é calculado em `construirRegistro`, para os números NUNCA se contradizerem.
 */
interface RegistroBaseMock {
  id: string;
  colaboradorId: string;
  nome: string;
  cpf: string;
  cargo: string;
  departamento: string;
  dataAdmissao: string;
  salario: number;
  tipo: TipoDesligamentoMock;
  status: StatusDesligamentoMock;
  etapa: EtapaDesligamentoMock;
  motivo: string | null;
  quando: QuandoMock;
  /** Períodos aquisitivos de férias já FECHADOS e não gozados (0 ou 1). */
  feriasVencidasPeriodos: number;
  aviso: AvisoMock;
  /** Saldo de FGTS, usado apenas na multa (40% sem justa causa / 20% acordo). */
  saldoFgts: number;
  /** 8 dígitos na ordem de `CHAVE_CHECKLIST` (1 = item cumprido). */
  checklist: string;
}

/**
 * Cenário fictício — 12 desligamentos cobrindo TODOS os tipos, todos os status
 * do filtro (`DesligamentoFilters`), todas as etapas do stepper e todos os
 * estados de checklist, para a tela inteira ser conferida sem "buracos".
 *
 * Os dois primeiros reaproveitam colaboradores que já são `desligado` na base de
 * `colaboradoresMock` (coerência entre as áreas); os demais são nomes extras que
 * só existem aqui — o desligamento é fictício e não altera a lista de ativos.
 */
const REGISTROS_BASE: RegistroBaseMock[] = [
  {
    id: 'mock-dsl-0001',
    colaboradorId: 'mock-8',
    nome: 'Pedro Henrique Barbosa',
    cpf: '876.543.210-12',
    cargo: 'Estoquista',
    departamento: 'Logística',
    dataAdmissao: '2020-01-10',
    salario: 2400,
    tipo: 'sem_justa_causa',
    status: 'finalizado',
    etapa: 'finalizado',
    motivo: 'Redução do quadro da expedição',
    quando: { mesesAtras: 8, dia: 18 },
    feriasVencidasPeriodos: 0,
    aviso: { dias: 30, indenizado: true },
    saldoFgts: 9800,
    checklist: '11111111',
  },
  {
    id: 'mock-dsl-0002',
    colaboradorId: 'mock-11',
    nome: 'Vanessa Rodrigues Dias',
    cpf: '987.654.321-23',
    cargo: 'Recepcionista',
    departamento: 'Administrativo',
    dataAdmissao: '2019-07-08',
    salario: 2100,
    tipo: 'pedido_demissao',
    status: 'finalizado',
    etapa: 'finalizado',
    motivo: 'Nova oportunidade profissional',
    quando: { mesesAtras: 6, dia: 20 },
    feriasVencidasPeriodos: 0,
    aviso: { dias: 30, indenizado: false },
    saldoFgts: 7600,
    checklist: '11111111',
  },
  {
    id: 'mock-dsl-0003',
    colaboradorId: 'mock-dsl-colab-1',
    nome: 'Rodrigo Menezes Tavares',
    cpf: '321.654.987-45',
    cargo: 'Analista de Suporte',
    departamento: 'Tecnologia',
    dataAdmissao: '2021-05-03',
    salario: 4800,
    tipo: 'sem_justa_causa',
    status: 'pagamento',
    etapa: 'pagamento',
    motivo: 'Reestruturação da área de atendimento',
    quando: { mesesAtras: 4, dia: 19 },
    feriasVencidasPeriodos: 0,
    aviso: { dias: 30, indenizado: true },
    saldoFgts: 14200,
    checklist: '11111110',
  },
  {
    id: 'mock-dsl-0004',
    colaboradorId: 'mock-dsl-colab-2',
    nome: 'Camila Duarte Nogueira',
    cpf: '456.789.123-56',
    cargo: 'Assistente de Marketing',
    departamento: 'Marketing',
    dataAdmissao: '2022-08-15',
    salario: 3600,
    tipo: 'acordo_mutuo',
    status: 'homologado',
    etapa: 'homologacao',
    motivo: 'Acordo entre as partes (art. 484-A da CLT)',
    quando: { mesesAtras: 3, dia: 17 },
    feriasVencidasPeriodos: 0,
    aviso: { dias: 15, indenizado: true },
    saldoFgts: 6400,
    checklist: '11111000',
  },
  {
    id: 'mock-dsl-0005',
    colaboradorId: 'mock-dsl-colab-3',
    nome: 'Bruno Carvalho Antunes',
    cpf: '567.890.234-67',
    cargo: 'Motorista',
    departamento: 'Logística',
    dataAdmissao: '2020-11-02',
    salario: 2900,
    tipo: 'com_justa_causa',
    status: 'cancelado',
    etapa: 'comunicacao',
    motivo: 'Falta grave em apuração — processo revertido pela diretoria',
    quando: { mesesAtras: 3, dia: 26 },
    feriasVencidasPeriodos: 0,
    aviso: { dias: null, indenizado: false },
    saldoFgts: 0,
    checklist: '10000000',
  },
  {
    id: 'mock-dsl-0006',
    colaboradorId: 'mock-dsl-colab-4',
    nome: 'Letícia Ferreira Ramos',
    cpf: '678.901.345-78',
    cargo: 'Analista de Compras',
    departamento: 'Administrativo',
    dataAdmissao: '2021-02-08',
    salario: 5100,
    tipo: 'termino_contrato',
    status: 'calculado',
    etapa: 'calculo',
    motivo: 'Encerramento de contrato por prazo determinado',
    quando: { mesesAtras: 2, dia: 16 },
    feriasVencidasPeriodos: 1,
    aviso: { dias: null, indenizado: false },
    saldoFgts: 11800,
    checklist: '11100000',
  },
  {
    id: 'mock-dsl-0007',
    colaboradorId: 'mock-dsl-colab-5',
    nome: 'Eduardo Nakamura Prado',
    cpf: '789.012.456-89',
    cargo: 'Desenvolvedor Backend',
    departamento: 'Tecnologia',
    dataAdmissao: '2019-09-23',
    salario: 8300,
    tipo: 'pedido_demissao',
    status: 'comunicado',
    etapa: 'documentacao',
    motivo: 'Proposta de outra empresa',
    quando: { mesesAtras: 2, dia: 9 },
    feriasVencidasPeriodos: 0,
    aviso: { dias: 30, indenizado: false },
    saldoFgts: 18500,
    checklist: '11000000',
  },
  {
    id: 'mock-dsl-0008',
    colaboradorId: 'mock-dsl-colab-6',
    nome: 'Patrícia Lemos Andrade',
    cpf: '890.123.567-90',
    cargo: 'Supervisora de Atendimento',
    departamento: 'Comercial',
    dataAdmissao: '2018-03-19',
    salario: 7600,
    tipo: 'sem_justa_causa',
    status: 'em_andamento',
    etapa: 'calculo',
    motivo: 'Fechamento da unidade de atendimento',
    quando: { mesesAtras: 1, dia: 22 },
    feriasVencidasPeriodos: 0,
    aviso: { dias: 30, indenizado: true },
    saldoFgts: 21000,
    checklist: '11000000',
  },
  {
    id: 'mock-dsl-0009',
    colaboradorId: 'mock-dsl-colab-7',
    nome: 'Marcos Vinícius Teles',
    cpf: '901.234.678-01',
    cargo: 'Auxiliar de Expedição',
    departamento: 'Logística',
    dataAdmissao: '2023-01-09',
    salario: 2200,
    tipo: 'termino_contrato',
    status: 'pendente',
    etapa: 'comunicacao',
    motivo: 'Fim do contrato de experiência',
    quando: { mesesAtras: 1, dia: 27 },
    feriasVencidasPeriodos: 0,
    aviso: { dias: null, indenizado: false },
    saldoFgts: 3200,
    checklist: '00000000',
  },
  {
    id: 'mock-dsl-0010',
    colaboradorId: 'mock-dsl-colab-8',
    nome: 'Tatiane Souza Barreto',
    cpf: '012.345.789-12',
    cargo: 'Analista de RH',
    departamento: 'Recursos Humanos',
    dataAdmissao: '2020-07-13',
    salario: 4700,
    tipo: 'pedido_demissao',
    status: 'homologado',
    etapa: 'homologacao',
    motivo: 'Mudança de cidade com a família',
    quando: { diasAtras: 1 },
    feriasVencidasPeriodos: 0,
    aviso: { dias: 30, indenizado: false },
    saldoFgts: 9600,
    checklist: '11111100',
  },
  {
    id: 'mock-dsl-0011',
    colaboradorId: 'mock-dsl-colab-9',
    nome: 'Henrique Paiva Lacerda',
    cpf: '123.456.890-23',
    cargo: 'Vendedor Interno',
    departamento: 'Comercial',
    dataAdmissao: '2022-04-11',
    salario: 3400,
    tipo: 'acordo_mutuo',
    status: 'calculado',
    etapa: 'calculo',
    motivo: 'Acordo mútuo após revisão de metas',
    quando: { diasAtras: 3 },
    feriasVencidasPeriodos: 0,
    aviso: { dias: 15, indenizado: true },
    saldoFgts: 5800,
    checklist: '11100000',
  },
  {
    id: 'mock-dsl-0012',
    colaboradorId: 'mock-dsl-colab-10',
    nome: 'Simone Alves Rodrigues',
    cpf: '234.567.901-34',
    cargo: 'Auxiliar de Limpeza',
    departamento: 'Administrativo',
    dataAdmissao: '2021-10-05',
    salario: 1900,
    tipo: 'com_justa_causa',
    status: 'pendente',
    etapa: 'comunicacao',
    motivo: 'Abandono de emprego (5 faltas consecutivas)',
    quando: { diasAtras: 5 },
    feriasVencidasPeriodos: 0,
    aviso: { dias: null, indenizado: false },
    saldoFgts: 0,
    checklist: '10000000',
  },
];

/* ─── Construção e leitura ────────────────────────────────────────────────── */

/** Status a partir dos quais a rescisão já foi calculada (bloco numérico preenchido). */
const STATUS_COM_CALCULO: StatusDesligamentoMock[] = [
  'calculado',
  'homologado',
  'pagamento',
  'finalizado',
  'concluido',
];

/**
 * Bloco nulo enquanto não houve cálculo — é o "R$ 0,00" que a tela exibe e o
 * que mantém o botão "Calcular Agora" habilitado no drawer.
 */
const SEM_CALCULO: BlocoRescisaoNulo = {
  saldo_salario: null,
  decimo_terceiro: null,
  ferias_proporcionais: null,
  ferias_vencidas: null,
  terco_constitucional: null,
  aviso_previo: null,
  total_proventos: null,
  total_descontos: null,
  inss: null,
  irrf: null,
  multa_fgts: null,
  valor_liquido: null,
};

/** Constrói a linha final, no mesmo formato devolvido pelo serviço real. */
function construirRegistro(base: RegistroBaseMock, indice: number, empresaId: string): DesligamentoMockRow {
  const dataDesligamento = dataDoDesligamento(base.quando);

  return {
    id: base.id,
    // Carimba a empresa ATIVA (a fictícia é só o fallback quando não há nenhuma):
    // assim a linha nunca "vaza" para outro tenant em nenhuma comparação da tela.
    empresa_id: empresaId,
    colaborador_id: base.colaboradorId,
    colaborador: {
      nome_completo: base.nome,
      cpf: base.cpf,
      cargo: base.cargo,
      departamento: base.departamento,
      data_admissao: base.dataAdmissao,
    },
    data_desligamento: dataDesligamento,
    data_aviso_previo: base.aviso.dias ? somarDias(dataDesligamento, -base.aviso.dias) : null,
    tipo: base.tipo,
    status: base.status,
    etapa: base.etapa,
    motivo: base.motivo,
    salario_base: base.salario,
    ...(STATUS_COM_CALCULO.includes(base.status)
      ? montarRescisao({
          salario: base.salario,
          tipo: base.tipo,
          // Saldo de salário = dias trabalhados no mês do desligamento.
          diasTrabalhados: parseDateLocalISO(dataDesligamento)?.getDate() ?? 30,
          meses13: avosDecimoTerceiro(base.dataAdmissao, dataDesligamento),
          mesesFerias: avosFeriasProporcionais(base.dataAdmissao, dataDesligamento),
          feriasVencidasPeriodos: base.feriasVencidasPeriodos,
          aviso: base.aviso,
          saldoFgts: base.saldoFgts,
        })
      : SEM_CALCULO),
    ...checklistDe(base.checklist),
    created_at: horasAtras(6 + indice * 9),
    updated_at: horasAtras(3 + indice * 9),
  };
}

/**
 * Linhas fictícias prontas para a tela, já ordenadas como o serviço real
 * (`data_desligamento DESC`).
 *
 * Devolve `undefined` quando o mock está DESLIGADO — e aí o hook segue para a
 * consulta real. A decisão é SÓ pela env var, igual às outras áreas (Admissões,
 * Colaboradores, Dashboard): com o modo demonstração ligado a área mostra o
 * conjunto fictício, independentemente de haver empresa real ativa.
 */
export function getMockDesligamentos(empresaId?: string | null): DesligamentoMockRow[] | undefined {
  if (!isDesligamentosMockEnabled()) return undefined;
  const tenant = empresaId || MOCK_EMPRESA.id;
  return REGISTROS_BASE.map((base, indice) => construirRegistro(base, indice, tenant)).sort((a, b) =>
    b.data_desligamento.localeCompare(a.data_desligamento)
  );
}

/** Colaborador oferecido no select do "Novo Desligamento". */
export interface ColaboradorParaDesligamentoMock {
  id: string;
  nome_completo: string;
  cargo: string;
  salario_base: number;
}

/**
 * Colaboradores ATIVOS da base fictícia, no formato exato da consulta que o
 * `NovoDesligamentoDialog` faz em `colaboradores` (id, nome, cargo, salário).
 * `undefined` quando o mock está desligado.
 */
export function getMockColaboradoresParaDesligamento(): ColaboradorParaDesligamentoMock[] | undefined {
  if (!isDesligamentosMockEnabled()) return undefined;
  return MOCK_COLABORADORES.filter((colaborador) => colaborador.status === 'ativo')
    .map((colaborador) => ({
      id: colaborador.id,
      nome_completo: colaborador.nome_completo,
      cargo: colaborador.cargo,
      salario_base: colaborador.salario_base,
    }))
    .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
}

/**
 * Bloqueia uma ação de ESCRITA enquanto o mock estiver ligado.
 *
 * Os registros são fictícios (`id`, `empresa_id` e `colaborador_id` não existem
 * no banco): gravar criaria lixo, falharia por FK ou deixaria um desligamento
 * órfão. Devolve `true` quando a ação deve ser ABORTADA, então o chamador só
 * precisa de `if (bloquearEscritaDesligamento('...')) return;`.
 */
export function bloquearEscritaDesligamento(acao: string): boolean {
  if (!isDesligamentosMockEnabled()) return false;
  toast.info(`Modo demonstração: "${acao}" não é gravado — os desligamentos exibidos são fictícios.`);
  return true;
}

/* ─── Trilha de Auditoria (aba "Trilha de Auditoria" de `/desligamentos`) ───── */

/**
 * Linha de `audit_log` como a `PontoAuditTimeline` consome (a consulta é
 * `select('*')`), restrita à coluna `tabela = 'desligamentos'`.
 */
export interface TrilhaAuditoriaMockRow {
  id: string;
  tabela: string;
  registro_id: string;
  acao: string;
  user_id: string | null;
  user_email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  dados_anteriores: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  created_at: string;
}

/** Datas relativas a "agora" — mantém a trilha sempre com atividade recente. */
const agoraTrilha = Date.now();
const minAtras = (m: number) => new Date(agoraTrilha - m * 60_000).toISOString();
/** Nº de dias atrás (mesma régua do mock inteiro: sempre relativo a "agora"). */
const diasAtras = (d: number) => new Date(agoraTrilha - d * 86_400_000).toISOString();

const EMAIL_RH = 'rh.promobrindes@empresa.com.br';
const EMAIL_GESTOR = 'gestor.regional@empresa.com.br';
/** Autores extras usados pelas linhas de LAYOUT (ver bloco abaixo). */
const EMAIL_DP = 'ana.martins@empresa.com.br';
const EMAIL_FINANCEIRO = 'simone.rodrigues@empresa.com.br';
const UA_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const UA_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15';

/**
 * Registros fictícios da trilha — cobrem as ações do fluxo de desligamento
 * (criação, comunicação do aviso, cálculo rescisório + eSocial S-2299,
 * homologação, pagamento, finalização e exclusão). Todos com
 * `tabela = 'desligamentos'`, que é o filtro passado pela página.
 */
const TRILHA_DESLIGAMENTOS: TrilhaAuditoriaMockRow[] = [
  { id: 'log-dsl-0010', tabela: 'desligamentos', registro_id: 'dsl-2026-0041', acao: 'UPDATE', user_id: 'usr-0001', user_email: EMAIL_RH, ip_address: '191.36.14.22', user_agent: UA_CHROME, dados_anteriores: { status: 'pagamento' }, dados_novos: { status: 'finalizado', data_pagamento: '2026-10-01' }, created_at: minAtras(14) },
  { id: 'log-dsl-0009', tabela: 'desligamentos', registro_id: 'dsl-2026-0040', acao: 'EXECUTE_CALC', user_id: null, user_email: null, ip_address: null, user_agent: null, dados_anteriores: null, dados_novos: { evento: 'S-2299', status: 'processado', recibo: '1.2.0000000451', valor_liquido: 8420.55 }, created_at: minAtras(52) },
  { id: 'log-dsl-0008', tabela: 'desligamentos', registro_id: 'dsl-2026-0040', acao: 'UPDATE', user_id: 'usr-0002', user_email: EMAIL_GESTOR, ip_address: '177.92.4.108', user_agent: UA_CHROME, dados_anteriores: { etapa: 'documentacao', status: 'comunicado' }, dados_novos: { etapa: 'calculo', status: 'calculado', motivo: 'sem_justa_causa' }, created_at: minAtras(138) },
  { id: 'log-dsl-0007', tabela: 'desligamentos', registro_id: 'dsl-2026-0039', acao: 'INSERT', user_id: 'usr-0001', user_email: EMAIL_RH, ip_address: '191.36.14.22', user_agent: UA_CHROME, dados_anteriores: null, dados_novos: { colaborador: 'Patrícia Lemos', tipo: 'pedido_demissao', data_desligamento: '2026-11-22', status: 'pendente' }, created_at: minAtras(214) },
  { id: 'log-dsl-0006', tabela: 'desligamentos', registro_id: 'dsl-2026-0038', acao: 'UPDATE', user_id: 'usr-0001', user_email: EMAIL_RH, ip_address: '191.36.14.22', user_agent: UA_CHROME, dados_anteriores: { status: 'calculado' }, dados_novos: { status: 'homologado', homologado_por: 'Sindicato Metais', data_homologacao: '2026-09-28' }, created_at: minAtras(367) },
  { id: 'log-dsl-0005', tabela: 'desligamentos', registro_id: 'dsl-2026-0037', acao: 'DELETE', user_id: 'usr-0001', user_email: EMAIL_RH, ip_address: '191.36.14.22', user_agent: UA_CHROME, dados_anteriores: { colaborador: 'Eduardo Lima', tipo: 'acordo_mutuo', data_desligamento: '2026-09-15' }, dados_novos: null, created_at: minAtras(521) },
  { id: 'log-dsl-0004', tabela: 'desligamentos', registro_id: 'dsl-2026-0036', acao: 'UPDATE', user_id: 'usr-0002', user_email: EMAIL_GESTOR, ip_address: '177.92.4.108', user_agent: UA_CHROME, dados_anteriores: { status: 'pendente' }, dados_novos: { status: 'comunicado', data_aviso_previo: '2026-09-05' }, created_at: minAtras(703) },
  { id: 'log-dsl-0003', tabela: 'desligamentos', registro_id: 'dsl-2026-0035', acao: 'EXECUTE_CALC', user_id: null, user_email: null, ip_address: null, user_agent: null, dados_anteriores: null, dados_novos: { evento: 'S-2299', status: 'enviado', recibo: null, competencia: '2026-09' }, created_at: minAtras(892) },
  { id: 'log-dsl-0002', tabela: 'desligamentos', registro_id: 'dsl-2026-0034', acao: 'INSERT', user_id: 'usr-0002', user_email: EMAIL_GESTOR, ip_address: '177.92.4.108', user_agent: UA_CHROME, dados_anteriores: null, dados_novos: { colaborador: 'Marcos Antunes', tipo: 'termino_contrato', data_desligamento: '2026-10-30', status: 'pendente' }, created_at: minAtras(1080) },
  { id: 'log-dsl-0001', tabela: 'desligamentos', registro_id: 'dsl-2026-0033', acao: 'UPDATE', user_id: 'usr-0001', user_email: EMAIL_RH, ip_address: '191.36.14.22', user_agent: UA_CHROME, dados_anteriores: { status: 'em_aviso' }, dados_novos: { status: 'concluido', data_efetiva: '2026-10-01' }, created_at: minAtras(1265) },

  /* ── Linhas de LAYOUT da Trilha de Auditoria ──────────────────────────────
   * Cobrem as categorias que faltavam nos registros acima (visualização,
   * exportação, simulação e geração de documento) para a faixa de chips e os
   * três níveis da trilha terem dado REAL em todas as colunas. Mesmo contrato
   * dos demais registros deste mock: só apresentação, nada de escrita. */
  { id: 'log-dsl-0011', tabela: 'desligamentos', registro_id: 'dsl-2026-0041', acao: 'VIEW', user_id: 'usr-0004', user_email: EMAIL_DP, ip_address: '189.5.77.14', user_agent: UA_CHROME, dados_anteriores: null, dados_novos: { secao: 'Resumo do Desligamento', origem: 'Aplicação Web' }, created_at: minAtras(26) },
  { id: 'log-dsl-0012', tabela: 'desligamentos', registro_id: 'dsl-2026-0040', acao: 'SIMULATION_CALC', user_id: 'usr-0005', user_email: EMAIL_FINANCEIRO, ip_address: '177.92.4.108', user_agent: UA_SAFARI, dados_anteriores: null, dados_novos: { valor_simulado: 5102.33, competencia: '2026-09' }, created_at: minAtras(96) },
  { id: 'log-dsl-0013', tabela: 'desligamentos', registro_id: 'dsl-2026-0038', acao: 'UPDATE', user_id: 'usr-0002', user_email: EMAIL_GESTOR, ip_address: '177.92.4.108', user_agent: UA_CHROME, dados_anteriores: { responsavel: 'Camila Ribeiro' }, dados_novos: { responsavel: 'Bruno Cardoso' }, created_at: minAtras(340) },
  { id: 'log-dsl-0014', tabela: 'desligamentos', registro_id: 'dsl-2026-0041', acao: 'UPDATE', user_id: 'usr-0004', user_email: EMAIL_DP, ip_address: '189.5.77.14', user_agent: UA_CHROME, dados_anteriores: { documentos_validados: 4 }, dados_novos: { documentos_validados: 6 }, created_at: minAtras(612) },
  { id: 'log-dsl-0015', tabela: 'desligamentos', registro_id: 'dsl-2026-0041', acao: 'GENERATE_DOC', user_id: null, user_email: null, ip_address: null, user_agent: null, dados_anteriores: null, dados_novos: { documento: 'Carta de Rescisão', formato: 'PDF' }, created_at: minAtras(908) },
  { id: 'log-dsl-0016', tabela: 'desligamentos', registro_id: 'dsl-2026-0037', acao: 'EXPORT', user_id: 'usr-0001', user_email: EMAIL_RH, ip_address: '191.36.14.22', user_agent: UA_CHROME, dados_anteriores: null, dados_novos: { formato: 'CSV' }, created_at: diasAtras(2) },
  { id: 'log-dsl-0017', tabela: 'desligamentos', registro_id: 'dsl-2026-0035', acao: 'UPDATE', user_id: 'usr-0002', user_email: EMAIL_GESTOR, ip_address: '177.92.4.108', user_agent: UA_CHROME, dados_anteriores: { status: 'calculado' }, dados_novos: { status: 'cancelado' }, created_at: diasAtras(3) },
  { id: 'log-dsl-0018', tabela: 'desligamentos', registro_id: 'dsl-2026-0034', acao: 'UPDATE', user_id: 'usr-0001', user_email: EMAIL_RH, ip_address: '191.36.14.22', user_agent: UA_CHROME, dados_anteriores: null, dados_novos: { documentos: 6 }, created_at: diasAtras(4) },
];

/**
 * Trilha fictícia de auditoria dos desligamentos, pronta para a
 * `PontoAuditTimeline` (mais recente primeiro). `undefined` quando o mock está
 * desligado — e aí a tela segue para a consulta real em `audit_log`.
 */
export function getMockTrilhaAuditoriaDesligamentos(): TrilhaAuditoriaMockRow[] | undefined {
  if (!isDesligamentosMockEnabled()) return undefined;
  return TRILHA_DESLIGAMENTOS;
}
