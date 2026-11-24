/**
 * MOCK DE DEMONSTRAÇÃO — dataset das áreas operacionais.
 *
 * As linhas têm o MESMO formato das tabelas reais (colunas de
 * `src/integrations/supabase/types.ts`) e são coerentes entre si: todas giram
 * em torno dos mesmos 13 colaboradores fictícios de `colaboradoresMock.ts` e
 * da mesma empresa (`MOCK_EMPRESA`). Assim, Folha, Holerites, Provisões,
 * Benefícios, eSocial, Passivo Trabalhista etc. mostram números que "fecham"
 * entre as telas.
 *
 * Como funciona a montagem:
 *   1. parte do dataset de Tempo & Ausências (`layoutMock/dados.ts`) — assim
 *      colaboradores, férias, afastamentos e locais de trabalho são os mesmos;
 *   2. acrescenta fixtures SEMÂNTICAS para as tabelas de negócio (folha,
 *      holerite, benefícios, eSocial, SST, estrutura…);
 *   3. completa as colunas que a fixture não declarou com valores plausíveis
 *      derivados do schema (`esquema.ts`);
 *   4. para as tabelas que ninguém semeou, gera 3 linhas genéricas — é o que
 *      evita tela vazia em módulos secundários.
 *
 * NADA aqui toca rede, Supabase, storage ou localStorage.
 */
import { MOCK_COLABORADORES, MOCK_EMPRESA } from '../colaboradoresMock';
import { construirTabelas } from '../layoutMock/dados';
import type { Row, Tabelas } from '../layoutMock/postgrest';
import { addDaysLocal, formatDateLocalISO } from '@/utils/dateLocal';
import { colunasDaTabela, ESQUEMA_TABELAS, type TipoColuna } from './esquema';

// ---------------------------------------------------------------------------
// Base: datas, ciclos e colaboradores
// ---------------------------------------------------------------------------

const HOJE = new Date();
const EMPRESA_ID = MOCK_EMPRESA.id as string;

const dia = (offset: number): string => formatDateLocalISO(addDaysLocal(HOJE, offset));
const instante = (offset: number, hora = '09:30'): string => {
  const [h, m] = hora.split(':');
  return `${dia(offset)}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00-03:00`;
};
/** Competência (`yyyy-MM`), com `mesesAtras` meses de recuo. */
const competencia = (mesesAtras: number): string => {
  const d = new Date(HOJE.getFullYear(), HOJE.getMonth() - mesesAtras, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const ciclo = <T,>(lista: readonly T[], i: number): T => lista[((i % lista.length) + lista.length) % lista.length];
const arredondar = (valor: number): number => Math.round(valor * 100) / 100;
const brl = (v: number) => arredondar(v);

const ATIVOS = MOCK_COLABORADORES.filter((c) => c.status !== 'desligado');
const TODOS = MOCK_COLABORADORES;
const RH = 'Mariana Oliveira';
const EMAIL_RH = 'mariana.oliveira@promobrindes.com.br';

/** Slug estável para ids legíveis (`cargo-gerente-de-rh`). */
const slug = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const DEPARTAMENTOS = Array.from(new Set(TODOS.map((c) => c.departamento))).sort();
const CARGOS = Array.from(new Set(TODOS.map((c) => c.cargo))).sort();
const CENTROS_CUSTO = Array.from(new Set(TODOS.map((c) => c.centro_custo))).sort();
const TIMES = Array.from(new Set(TODOS.map((c) => c.time_id))).sort();

const idDepartamento = (nome: string): string => `depto-${slug(nome)}`;
const idCargo = (nome: string): string => `cargo-${slug(nome)}`;
const idCentroCusto = (nome: string): string => `cc-${slug(nome)}`;
const idFolha = (comp: string): string => `folha-${comp}`;
const idRubrica = (nome: string): string => `rubrica-${slug(nome)}`;


// ---------------------------------------------------------------------------
// Valores genéricos (preenchem o que a fixture semântica não declarou)
// ---------------------------------------------------------------------------

/** FK → tabela referenciada (para os ids gerados apontarem para linhas existentes). */
const TABELA_DA_FK: Record<string, string> = {
  colaborador: 'colaboradores',
  gestor: 'colaboradores',
  lider: 'colaboradores',
  responsavel: 'colaboradores',
  aprovador: 'colaboradores',
  empresa: 'empresas',
  folha: 'folhas_pagamento',
  folha_item: 'folha_itens',
  rubrica: 'rubricas_folha',
  cargo: 'cargos',
  cargo_anterior: 'cargos',
  cargo_novo: 'cargos',
  departamento: 'departamentos',
  departamento_pai: 'departamentos',
  departamento_anterior: 'departamentos',
  departamento_novo: 'departamentos',
  centro_custo: 'centros_custo',
  lotacao: 'lotacoes',
  time: 'times',
  beneficio: 'beneficios',
  tipo_beneficio: 'beneficios',
  convenio: 'convenios',
  plano_saude: 'planos_saude',
  seguro_vida: 'seguros_vida',
  jornada: 'jornadas',
  epi: 'epis',
  exame: 'exames',
  aso: 'asos',
  holerite: 'holerites',
  remessa: 'cnab_remessas',
  evento: 'esocial_eventos',
  periodo_aquisitivo: 'periodos_aquisitivos',
  afastamento: 'afastamentos',
  conta_debito: 'plano_contas',
  conta_credito: 'plano_contas',
  contrato: 'contratos',
  admissao: 'admissoes',
  clinica_partner: 'clinicas_parceiras',
  agendamento: 'agendamentos_exames',
  usuario: 'profiles',
  user: 'profiles',
  log: 'provisao_logs',
};

const NOMES_AMOSTRA = TODOS.map((c) => c.nome_completo);
const EMAILS_AMOSTRA = TODOS.map((c) => c.email);

/**
 * Ids já semeados (tabela → ids). As FKs das linhas genéricas passam a apontar
 * para registros que realmente existem no dataset — assim listas que fazem
 * join (ex.: `folha_itens` com `colaboradores`) exibem nome/cargo reais.
 */
const IDS_SEMEADOS = new Map<string, string[]>();

function idDaTabela(alvo: string | undefined, indice: number): string {
  if (!alvo) return `mock-${indice + 1}`;
  if (alvo === 'empresas') return EMPRESA_ID;
  const existentes = IDS_SEMEADOS.get(alvo);
  if (existentes?.length) return existentes[indice % existentes.length];
  return `${alvo}-${indice + 1}`;
}

/**
 * Valor plausível para uma coluna, decidido pelo NOME e pelo tipo grosseiro.
 * É o suficiente para listas, cards e gráficos aparecerem preenchidos sem
 * inventar regra de negócio nenhuma.
 */
function valorGenerico(tabela: string, coluna: string, tipo: TipoColuna, indice: number): unknown {
  if (coluna === 'id') return `${tabela}-${indice + 1}`;
  if (tipo === 'id') {
    if (coluna === 'empresa_id') return EMPRESA_ID;
    if (coluna === 'colaborador_id') return ciclo(ATIVOS, indice).id;
    const base = coluna.slice(0, -3);
    const alvo = TABELA_DA_FK[base] ?? (ESQUEMA_TABELAS[`${base}s`] ? `${base}s` : undefined);
    return idDaTabela(alvo, indice);
  }
  if (tipo === 'numero') {
    if (/salario|vencimento|provento|liquido/.test(coluna)) return brl(3200 + indice * 480);
    if (/valor|total|base|capital|premio|limite|teto|saldo|remuneracao|fgts|inss|irrf|debito/.test(coluna)) return brl(950 + indice * 275.4);
    if (/percentual|aliquota|taxa|juros/.test(coluna)) return 8;
    if (/minuto/.test(coluna)) return 60;
    if (/hora/.test(coluna)) return 8;
    if (/dias/.test(coluna)) return 20;
    if (/quantidade|parcelas|dependentes|colaboradores/.test(coluna)) return 4 + indice;
    if (/ano/.test(coluna)) return HOJE.getFullYear();
    if (/mes/.test(coluna)) return HOJE.getMonth() + 1;
    if (/dia/.test(coluna)) return 15;
    if (/version|progresso|tentativas|nivel/.test(coluna)) return 1;
    return 10 + indice;
  }
  if (tipo === 'data') return /_at$|_em$/.test(coluna) ? instante(-indice * 3, '10:15') : dia(-indice * 12);
  if (tipo === 'competencia') return competencia(1);
  if (tipo === 'booleano') return coluna === 'ativo' ? true : indice % 2 === 0;
  if (tipo === 'json') return /erro|lista|itens|eventos|restricoes/.test(coluna) ? [] : {};
  if (tipo === 'lista') return [];

  // texto
  if (coluna === 'nome' || coluna === 'nome_completo' || coluna === 'colaborador_nome') return ciclo(NOMES_AMOSTRA, indice);
  if (coluna === 'email' || coluna === 'user_email') return ciclo(EMAILS_AMOSTRA, indice);
  if (coluna === 'cpf' || coluna === 'cpf_beneficiario') return ciclo(TODOS.map((c) => c.cpf), indice);
  if (coluna === 'cnpj' || coluna === 'cpf_cnpj' || coluna === 'cnpj_cpf') return MOCK_EMPRESA.cnpj;
  if (coluna === 'matricula') return ciclo(TODOS.map((c) => c.matricula), indice);
  if (coluna === 'cargo') return ciclo(CARGOS, indice);
  if (coluna === 'departamento') return ciclo(DEPARTAMENTOS, indice);
  if (coluna === 'status' || coluna === 'status_vinculo') return 'ativo';
  if (coluna === 'tipo' || coluna === 'tipo_evento' || coluna === 'categoria') return 'normal';
  if (coluna === 'codigo' || coluna === 'codigo_esocial') return `C${String(indice + 1).padStart(3, '0')}`;
  if (coluna === 'uf') return 'SP';
  if (coluna === 'cidade' || coluna === 'municipio') return 'São Paulo';
  if (coluna === 'telefone' || coluna === 'celular') return '(11) 3000-0000';
  if (coluna === 'descricao') return `Registro demonstrativo de ${tabela.replace(/_/g, ' ')}`;
  if (coluna === 'observacoes' || coluna === 'motivo' || coluna === 'mensagem') return 'Dado fictício gerado para a demonstração.';
  if (coluna === 'titulo') return `Demonstração — ${tabela.replace(/_/g, ' ')}`;
  if (coluna === 'usuario_id' || coluna === 'criado_por' || coluna === 'aprovado_por') return RH;
  return `${tabela} ${indice + 1}`;
}


// ---------------------------------------------------------------------------
// Estrutura organizacional
// ---------------------------------------------------------------------------

type Semear = (tabela: string, linhas: Row[]) => Row[];

const LOTACOES = [
  { id: 'lotacao-sp-matriz', nome: 'São Paulo — Matriz', endereco: 'Av. Paulista, 1000 — Bela Vista, São Paulo/SP' },
  { id: 'lotacao-rj-filial', nome: 'Rio de Janeiro — Filial', endereco: 'Av. Atlântica, 2000 — Copacabana, Rio de Janeiro/RJ' },
  { id: 'lotacao-floripa', nome: 'Florianópolis — Centro', endereco: 'Av. Beira Mar Norte, 1050 — Centro, Florianópolis/SC' },
  { id: 'lotacao-cd-guarulhos', nome: 'Guarulhos — Centro de Distribuição', endereco: 'Rod. Presidente Dutra, km 225 — Cumbica, Guarulhos/SP' },
];

function semearEstrutura(semear: Semear): void {
  semear(
    'cargos',
    CARGOS.map((nome, i) => {
      const referencia = TODOS.find((c) => c.cargo === nome)!;
      return {
        id: idCargo(nome),
        nome,
        cbo: referencia.cbo,
        descricao: `Descrição sumária do cargo de ${nome} (dado demonstrativo).`,
        departamento_id: idDepartamento(referencia.departamento),
        salario_base: referencia.salario_base,
        nivel_hierarquico: /Gerente|Supervisor|Coordenador/.test(nome) ? 2 : 1,
        requisitos: 'Ensino médio completo · experiência de 2 anos na função',
        ativo: true,
        version: 1,
        created_at: instante(-360 + i, '09:00'),
        updated_at: instante(-30 + i, '09:00'),
      };
    }),
  );

  semear(
    'departamentos',
    DEPARTAMENTOS.map((nome, i) => {
      const integrantes = TODOS.filter((c) => c.departamento === nome);
      const gestor = integrantes.find((c) => /Gerente|Supervisor|Coordenador/.test(c.cargo)) ?? integrantes[0];
      return {
        id: idDepartamento(nome),
        nome,
        codigo_centro_custo: integrantes[0].centro_custo.split(' ')[0],
        gestor_id: gestor.id,
        responsavel_id: gestor.id,
        ativo: true,
        created_at: instante(-400 + i, '09:00'),
        updated_at: instante(-20 + i, '09:00'),
      };
    }),
  );

  semear(
    'centros_custo',
    CENTROS_CUSTO.map((nome, i) => ({
      id: idCentroCusto(nome),
      codigo: nome.split(' ')[0],
      nome,
      descricao: `Centro de custo ${nome} (demonstração)`,
      ativo: true,
      created_at: instante(-420 + i, '09:00'),
      updated_at: instante(-40 + i, '09:00'),
    })),
  );

  semear(
    'lotacoes',
    LOTACOES.map((l, i) => ({
      id: l.id,
      codigo: `LOT-${String(i + 1).padStart(3, '0')}`,
      nome: l.nome,
      endereco: l.endereco,
      ativa: true,
      created_at: instante(-500 + i, '09:00'),
      updated_at: instante(-10 + i, '09:00'),
    })),
  );

  semear(
    'colaborador_lotacoes',
    ATIVOS.map((c, i) => ({
      id: `colaborador-lotacao-${i + 1}`,
      colaborador_id: c.id,
      lotacao_id: ciclo(LOTACOES, i).id,
      principal: true,
      created_at: instante(-300 + i, '09:00'),
      updated_at: instante(-5 + i, '09:00'),
    })),
  );

  semear(
    'times',
    TIMES.map((id, i) => {
      const integrantes = TODOS.filter((c) => c.time_id === id);
      const lider = integrantes.find((c) => /Gerente|Supervisor|Coordenador/.test(c.cargo)) ?? integrantes[0];
      const departamento = integrantes[0].departamento;
      return {
        id,
        nome: `Time ${departamento}`,
        descricao: `Equipe de ${departamento} (demonstração)`,
        departamento_id: idDepartamento(departamento),
        lider_id: lider.id,
        ativo: true,
        created_at: instante(-350 + i, '09:00'),
        updated_at: instante(-15 + i, '09:00'),
      };
    }),
  );

  const jornadas = [
    { id: 'jornada-administrativo', nome: 'Administrativo — 44h', entrada: '08:00', saida: '17:00', intervalo: 60, carga: 44, tipo: 'mensalista' },
    { id: 'jornada-comercial', nome: 'Comercial — 44h', entrada: '09:00', saida: '18:00', intervalo: 60, carga: 44, tipo: 'mensalista' },
    { id: 'jornada-producao', nome: 'Produção — turno A', entrada: '06:00', saida: '15:00', intervalo: 60, carga: 44, tipo: 'turno' },
    { id: 'jornada-estagio', nome: 'Estágio — 30h', entrada: '13:00', saida: '19:00', intervalo: 0, carga: 30, tipo: 'estagiario' },
  ];

  semear(
    'jornadas',
    jornadas.map((j, i) => ({
      id: j.id,
      nome: j.nome,
      tipo: j.tipo,
      carga_horaria_semanal: j.carga,
      horario_entrada: j.entrada,
      horario_saida: j.saida,
      intervalo_minutos: j.intervalo,
      ativa: true,
      created_at: instante(-380 + i, '09:00'),
      updated_at: instante(-25 + i, '09:00'),
    })),
  );

  semear(
    'jornadas_horarios',
    jornadas.flatMap((j) =>
      [1, 2, 3, 4, 5].map((diaSemana) => ({
        id: `${j.id}-dia-${diaSemana}`,
        jornada_id: j.id,
        dia_semana: diaSemana,
        dia_util: true,
        entrada: j.entrada,
        saida: j.saida,
        intervalo_inicio: j.intervalo ? '12:00' : null,
        intervalo_fim: j.intervalo ? '13:00' : null,
        created_at: instante(-380, '09:00'),
      })),
    ),
  );
}

/** Mescla a fixture semântica com os valores genéricos das colunas restantes. */
function completar(tabela: string, parcial: Row, indice: number): Row {
  const colunas = colunasDaTabela(tabela) ?? {};
  const linha: Row = {};
  for (const [coluna, tipo] of Object.entries(colunas)) {
    linha[coluna] = coluna in parcial ? parcial[coluna] : valorGenerico(tabela, coluna, tipo, indice);
  }
  // Colunas que existem na fixture mas não no schema (ex.: views) são preservadas.
  for (const [coluna, valor] of Object.entries(parcial)) {
    if (!(coluna in linha)) linha[coluna] = valor;
  }
  return linha;
}


// ---------------------------------------------------------------------------
// Folha de pagamento, holerites, provisões e trilha de compliance
// ---------------------------------------------------------------------------

const RUBRICAS = [
  { nome: 'Salário Base', tipo: 'provento', natureza: 'salario', esocial: '1000', inss: true, irrf: true, fgts: true },
  { nome: 'Horas Extras 50%', tipo: 'provento', natureza: 'horas_extras', esocial: '1002', inss: true, irrf: true, fgts: true },
  { nome: 'Horas Extras 100%', tipo: 'provento', natureza: 'horas_extras', esocial: '1003', inss: true, irrf: true, fgts: true },
  { nome: 'Adicional Noturno', tipo: 'provento', natureza: 'adicionais', esocial: '1005', inss: true, irrf: true, fgts: true },
  { nome: 'Adicional de Insalubridade', tipo: 'provento', natureza: 'adicionais', esocial: '1006', inss: true, irrf: true, fgts: true },
  { nome: 'Comissões', tipo: 'provento', natureza: 'comissoes', esocial: '1010', inss: true, irrf: true, fgts: true },
  { nome: 'Gratificação de Função', tipo: 'provento', natureza: 'gratificacoes', esocial: '1015', inss: true, irrf: true, fgts: true },
  { nome: 'INSS', tipo: 'desconto', natureza: 'inss', esocial: '5001', inss: false, irrf: false, fgts: false },
  { nome: 'IRRF', tipo: 'desconto', natureza: 'irrf', esocial: '5002', inss: false, irrf: false, fgts: false },
  { nome: 'Vale Transporte', tipo: 'desconto', natureza: 'vale_transporte', esocial: '5004', inss: false, irrf: false, fgts: false },
  { nome: 'Vale Alimentação', tipo: 'desconto', natureza: 'vale_alimentacao', esocial: '5005', inss: false, irrf: false, fgts: false },
  { nome: 'Plano de Saúde', tipo: 'desconto', natureza: 'plano_saude', esocial: '5007', inss: false, irrf: false, fgts: false },
  { nome: 'Pensão Alimentícia', tipo: 'desconto', natureza: 'pensao', esocial: '5008', inss: false, irrf: false, fgts: false },
  { nome: 'Faltas e Atrasos', tipo: 'desconto', natureza: 'faltas', esocial: '5010', inss: false, irrf: false, fgts: false },
  { nome: 'Empréstimo Consignado', tipo: 'desconto', natureza: 'emprestimo', esocial: '5012', inss: false, irrf: false, fgts: false },
];

/** Competências exibidas nas telas de folha: 3 fechadas + a atual em cálculo. */
const COMPETENCIAS_FOLHA = [3, 2, 1, 0].map(competencia);

interface CalculoItem {
  colaborador: (typeof ATIVOS)[number];
  salario: number;
  extras: number;
  gratificacao: number;
  proventos: number;
  inss: number;
  irrf: number;
  vt: number;
  va: number;
  plano: number;
  descontos: number;
  liquido: number;
  fgts: number;
}

function calcularItens(indiceCompetencia: number): CalculoItem[] {
  return ATIVOS.map((c, i) => {
    const salario = c.salario_base;
    const extras = (i + indiceCompetencia) % 3 === 0 ? brl((salario / 220) * 10 * 1.5) : 0;
    const gratificacao = /Gerente|Supervisor|Coordenador/.test(c.cargo) ? brl(salario * 0.1) : 0;
    const proventos = brl(salario + extras + gratificacao);
    const inss = brl(Math.min(proventos, 8157.41) * 0.14);
    const irrf = brl(Math.max(0, (proventos - inss - 528) * 0.15 - 896));
    const vt = brl(salario * 0.06);
    const va = 550;
    const plano = 180;
    const descontos = brl(inss + irrf + vt + va + plano);
    return {
      colaborador: c,
      salario,
      extras,
      gratificacao,
      proventos,
      inss,
      irrf,
      vt,
      va,
      plano,
      descontos,
      liquido: brl(proventos - descontos),
      fgts: brl(proventos * 0.08),
    };
  });
}

function semearFolha(semear: Semear): void {
  semear(
    'rubricas_folha',
    RUBRICAS.map((r, i) => ({
      id: idRubrica(r.nome),
      codigo: String(i + 1).padStart(3, '0'),
      descricao: r.nome,
      tipo: r.tipo,
      natureza_rubrica: r.natureza,
      codigo_esocial: r.esocial,
      incide_inss: r.inss,
      incide_irrf: r.irrf,
      incide_fgts: r.fgts,
      automatico: i < 2,
      ativo: true,
      created_at: instante(-420 + i, '08:30'),
      updated_at: instante(-30 + i, '08:30'),
    })),
  );

  COMPETENCIAS_FOLHA.forEach((comp, indiceCompetencia) => {
    const itens = calcularItens(indiceCompetencia);
    const aberta = indiceCompetencia === COMPETENCIAS_FOLHA.length - 1;
    const totalProventos = brl(itens.reduce((s, i) => s + i.proventos, 0));
    const totalDescontos = brl(itens.reduce((s, i) => s + i.descontos, 0));
    const totalLiquido = brl(itens.reduce((s, i) => s + i.liquido, 0));
    const totalFgts = brl(itens.reduce((s, i) => s + i.fgts, 0));

    semear('folhas_pagamento', [
      {
        id: idFolha(comp),
        competencia: comp,
        tipo: 'mensal',
        status: aberta ? 'calculada' : 'fechada',
        total_colaboradores: ATIVOS.length,
        total_proventos: totalProventos,
        total_descontos: totalDescontos,
        total_liquido: totalLiquido,
        total_fgts: totalFgts,
        total_inss_patronal: brl(totalProventos * 0.2),
        data_calculo: instante(-indiceCompetencia * 30 - 2, '17:40'),
        data_fechamento: aberta ? null : instante(-indiceCompetencia * 30 - 1, '18:10'),
        data_pagamento: dia(-indiceCompetencia * 30 + (aberta ? 5 : 4)),
        fechada_por: aberta ? null : RH,
        version: 2,
        hash_integridade: `sha256-folha-${comp}`,
        esocial_status: aberta ? 'pendente' : 'transmitido',
        observacoes: aberta ? 'Competência em cálculo (demonstração).' : 'Competência fechada na demonstração.',
      },
    ]);

    semear(
      'folha_itens',
      itens.map((item, i) => ({
        id: `folha-item-${comp}-${i + 1}`,
        folha_id: idFolha(comp),
        colaborador_id: item.colaborador.id,
        salario_base: item.salario,
        total_proventos: item.proventos,
        total_descontos: item.descontos,
        total_liquido: item.liquido,
        inss_mes: item.inss,
        irrf_mes: item.irrf,
        fgts_mes: item.fgts,
        status_pagamento: aberta ? 'pendente' : 'pago',
        detalhes: {
          horas_extras: item.extras,
          gratificacao: item.gratificacao,
          vale_transporte: item.vt,
          vale_alimentacao: item.va,
          plano_saude: item.plano,
        },
        created_at: instante(-indiceCompetencia * 30 - 2, '17:40'),
      })),
    );

    semear(
      'holerites',
      itens.map((item, i) => ({
        id: `holerite-${comp}-${i + 1}`,
        folha_id: idFolha(comp),
        colaborador_id: item.colaborador.id,
        colaborador_nome: item.colaborador.nome_completo,
        colaborador_cpf: item.colaborador.cpf,
        colaborador_cargo: item.colaborador.cargo,
        colaborador_departamento: item.colaborador.departamento,
        colaborador_matricula: item.colaborador.matricula,
        salario_base: item.salario,
        total_proventos: item.proventos,
        total_descontos: item.descontos,
        liquido: item.liquido,
        base_inss: item.proventos,
        valor_inss: item.inss,
        base_irrf: brl(item.proventos - item.inss),
        valor_irrf: item.irrf,
        base_fgts: item.proventos,
        valor_fgts: item.fgts,
        horas_extras_50: item.extras > 0 ? 10 : 0,
        horas_extras_100: 0,
        faltas_dias: 0,
        dependentes_irrf: i % 4 === 0 ? 1 : 0,
        assinado: !aberta,
        data_assinatura: aberta ? null : instante(-indiceCompetencia * 30, '09:20'),
        data_visualizacao: aberta ? null : instante(-indiceCompetencia * 30, '10:05'),
        hash_validacao: `sha256-${comp}-${String(i + 1).padStart(3, '0')}`,
        created_at: instante(-indiceCompetencia * 30 - 2, '17:45'),
      })),
    );
  });
}

/** Distribuição de holerites, auditoria da folha e trilha de compliance. */
function semearFolhaExtras(semear: Semear): void {
  COMPETENCIAS_FOLHA.forEach((comp, indiceCompetencia) => {
    const itens = calcularItens(indiceCompetencia);
    const aberta = indiceCompetencia === COMPETENCIAS_FOLHA.length - 1;

    semear(
      'holerite_distribuicoes',
      itens.map((item, i) => ({
        id: `holerite-distribuicao-${comp}-${i + 1}`,
        folha_id: idFolha(comp),
        holerite_id: `holerite-${comp}-${i + 1}`,
        colaborador_id: item.colaborador.id,
        canal: i % 3 === 0 ? 'whatsapp' : 'email',
        status: aberta ? 'pendente' : 'entregue',
        distribuido_por: RH,
        created_at: instante(-indiceCompetencia * 30, '08:00'),
      })),
    );

    semear(
      'folha_auditoria',
      itens.slice(0, 6).map((item, i) => ({
        id: `folha-auditoria-${comp}-${i + 1}`,
        folha_id: idFolha(comp),
        colaborador_id: item.colaborador.id,
        tipo_evento: i % 2 === 0 ? 'calculo' : 'validacao',
        severidade: i % 3 === 0 ? 'info' : 'baixa',
        mensagem:
          i % 2 === 0
            ? `Cálculo da competência ${comp} concluído para ${item.colaborador.nome_completo}.`
            : `Divergência de rubrica conferida manualmente (${comp}).`,
        criado_por: RH,
        detalhes: { competencia: comp, liquido: item.liquido },
        created_at: instante(-indiceCompetencia * 30 - 3 + i, '11:00'),
      })),
    );
  });

  const acoes = ['calculo', 'fechamento', 'reabertura', 'recalculo', 'fechamento'];
  const totalProventos = brl(ATIVOS.reduce((s, c) => s + c.salario_base * 1.12, 0));
  const totalDescontos = brl(ATIVOS.reduce((s, c) => s + c.salario_base * 0.28, 0));

  semear(
    'vw_folha_compliance',
    COMPETENCIAS_FOLHA.slice(0, 3).flatMap((comp, indiceCompetencia) =>
      acoes.slice(0, 3).map((acao, i) => ({
        id: `compliance-${comp}-${i + 1}`,
        audit_id: `audit-${comp}-${i + 1}`,
        folha_id: idFolha(comp),
        competencia: comp,
        acao,
        event_at: instante(-indiceCompetencia * 30 - 1 + i, `18:0${i}`),
        version_anterior: indiceCompetencia + 1,
        version_nova: indiceCompetencia + 2,
        integrity_hash: `9f2c${comp.replace('-', '')}${i}ab77de41c8`,
        total_proventos: totalProventos,
        total_descontos: totalDescontos,
        total_liquido: brl(totalProventos - totalDescontos),
        total_fgts: brl(totalProventos * 0.08),
        holerites_count: ATIVOS.length,
        itens_count: ATIVOS.length,
        motivo: acao === 'reabertura' ? 'Ajuste de rubrica solicitado pelo RH' : null,
        override_esocial: acao === 'recalculo',
        user_email: EMAIL_RH,
        user_id: 'mock-user',
        ip_address: '187.0.0.10',
        dados_novos: { origem: 'demonstracao' },
      })),
    ),
  );
}


/** Provisões mensais (base do Passivo Trabalhista) e eventos variáveis. */
function semearProvisoes(semear: Semear): void {
  semear(
    'provisoes_mensais',
    [1, 0].flatMap((mesesAtras) =>
      ATIVOS.flatMap((c, i) => {
        const comp = `${competencia(mesesAtras)}-01`;
        const salario = c.salario_base;
        const ferias = brl(salario * (1 + 1 / 3) * (((i % 6) + 2) / 12));
        const decimo = brl(salario * (((i % 5) + 3) / 12));
        return [
          {
            id: `provisao-${c.id}-ferias-${comp}`,
            colaborador_id: c.id,
            competencia: comp,
            tipo: 'ferias',
            valor_principal: brl(ferias / 1.28),
            encargos_fgts: brl((ferias / 1.28) * 0.08),
            encargos_inss: brl((ferias / 1.28) * 0.2),
            total: ferias,
            log_id: `provisao-log-${mesesAtras + 1}`,
            created_at: instante(-mesesAtras * 30 - 1, '18:30'),
            updated_at: instante(-mesesAtras * 30 - 1, '18:30'),
          },
          {
            id: `provisao-${c.id}-13-${comp}`,
            colaborador_id: c.id,
            competencia: comp,
            tipo: '13',
            valor_principal: brl(decimo / 1.28),
            encargos_fgts: brl((decimo / 1.28) * 0.08),
            encargos_inss: brl((decimo / 1.28) * 0.2),
            total: decimo,
            log_id: `provisao-log-${mesesAtras + 1}`,
            created_at: instante(-mesesAtras * 30 - 1, '18:30'),
            updated_at: instante(-mesesAtras * 30 - 1, '18:30'),
          },
        ];
      }),
    ),
  );

  semear(
    'provisao_logs',
    [1, 0].map((mesesAtras, i) => ({
      id: `provisao-log-${mesesAtras + 1}`,
      competencia: `${competencia(mesesAtras)}-01`,
      tipo_calculo: 'completo',
      status: 'sucesso',
      total_colaboradores: ATIVOS.length,
      valor_total_provisionado: brl(ATIVOS.reduce((s, c) => s + c.salario_base * 0.35, 0)),
      duracao_ms: 1800 + i * 400,
      usuario_id: RH,
      metadados: { origem: 'demonstracao' },
      created_at: instante(-mesesAtras * 30 - 1, '18:31'),
    })),
  );

  // Eventos variáveis: horas extras e comissões lançadas na competência atual.
  semear(
    'eventos_variaveis',
    ATIVOS.flatMap((c, i) => [
      {
        id: `evento-extra-${c.id}`,
        colaborador_id: c.id,
        rubrica_id: idRubrica('Horas Extras 50%'),
        competencia: competencia(0),
        referencia: 10 + (i % 5) * 2,
        valor: brl((c.salario_base / 220) * (10 + (i % 5) * 2) * 1.5),
        origem_ferias_id: null,
        observacao: 'Horas extras apuradas no ponto (demonstração).',
        created_by: RH,
        created_at: instante(-6 + i, '16:30'),
      },
      {
        id: `evento-comissao-${c.id}`,
        colaborador_id: c.id,
        rubrica_id: idRubrica('Comissões'),
        competencia: competencia(0),
        referencia: 1,
        valor: brl(c.salario_base * 0.05),
        origem_ferias_id: null,
        observacao: 'Comissão sobre vendas (demonstração).',
        created_by: RH,
        created_at: instante(-5 + i, '16:35'),
      },
    ]),
  );
}

/** Parâmetros fiscais vigentes (INSS e IRRF). */
function semearParametrosFiscais(semear: Semear): void {
  const faixasInss = [
    { faixa: 1, inicial: 0, final: 1518, aliquota: 7.5 },
    { faixa: 2, inicial: 1518.01, final: 2793.88, aliquota: 9 },
    { faixa: 3, inicial: 2793.89, final: 4190.83, aliquota: 12 },
    { faixa: 4, inicial: 4190.84, final: 8157.41, aliquota: 14 },
  ];
  const faixasIrrf = [
    { faixa: 1, inicial: 0, final: 2259.2, aliquota: 0, deducao: 0 },
    { faixa: 2, inicial: 2259.21, final: 2826.65, aliquota: 7.5, deducao: 169.44 },
    { faixa: 3, inicial: 2826.66, final: 3751.05, aliquota: 15, deducao: 381.44 },
    { faixa: 4, inicial: 3751.06, final: 4664.68, aliquota: 22.5, deducao: 662.77 },
    { faixa: 5, inicial: 4664.69, final: 999999, aliquota: 27.5, deducao: 896 },
  ];

  semear('parametros_fiscais', [
    ...faixasInss.map((f) => ({
      id: `inss-faixa-${f.faixa}`,
      tipo: 'inss',
      faixa: f.faixa,
      valor_inicial: f.inicial,
      valor_final: f.final,
      aliquota: f.aliquota,
      valor_fixo: 0,
      deducao: 0,
      vigencia_inicio: `${HOJE.getFullYear()}-01-01`,
      vigencia_fim: `${HOJE.getFullYear()}-12-31`,
      ativo: true,
      created_at: instante(-300, '08:00'),
    })),
    ...faixasIrrf.map((f) => ({
      id: `irrf-faixa-${f.faixa}`,
      tipo: 'irrf',
      faixa: f.faixa,
      valor_inicial: f.inicial,
      valor_final: f.final,
      aliquota: f.aliquota,
      deducao: f.deducao,
      valor_fixo: 0,
      vigencia_inicio: `${HOJE.getFullYear()}-01-01`,
      vigencia_fim: `${HOJE.getFullYear()}-12-31`,
      ativo: true,
      created_at: instante(-300, '08:00'),
    })),
  ]);
}


// ---------------------------------------------------------------------------
// Benefícios, vales e descontos
// ---------------------------------------------------------------------------

const BENEFICIOS = [
  { id: 'beneficio-plano-saude', nome: 'Plano de Saúde Unimed', categoria: 'saude', tipo: 'plano_saude', operadora: 'Unimed', valor: 480, empresa: 300, colaborador: 180, esocial: '9201', lei: false },
  { id: 'beneficio-plano-odonto', nome: 'Plano Odontológico OdontoPrev', categoria: 'saude', tipo: 'plano_odontologico', operadora: 'OdontoPrev', valor: 65, empresa: 45, colaborador: 20, esocial: '9203', lei: false },
  { id: 'beneficio-vale-transporte', nome: 'Vale Transporte', categoria: 'transporte', tipo: 'vale_transporte', operadora: 'SPTrans', valor: 275, empresa: 220, colaborador: 55, esocial: '9205', lei: true },
  { id: 'beneficio-vale-alimentacao', nome: 'Vale Alimentação', categoria: 'alimentacao', tipo: 'vale_alimentacao', operadora: 'Alelo', valor: 550, empresa: 550, colaborador: 0, esocial: '9207', lei: false },
  { id: 'beneficio-vale-refeicao', nome: 'Vale Refeição', categoria: 'alimentacao', tipo: 'vale_refeicao', operadora: 'Sodexo', valor: 480, empresa: 384, colaborador: 96, esocial: '9209', lei: false },
  { id: 'beneficio-seguro-vida', nome: 'Seguro de Vida em Grupo', categoria: 'seguro', tipo: 'seguro_vida', operadora: 'Porto Seguro', valor: 45, empresa: 45, colaborador: 0, esocial: '9211', lei: false },
  { id: 'beneficio-auxilio-creche', nome: 'Auxílio Creche', categoria: 'assistencial', tipo: 'auxilio_creche', operadora: 'Reembolso', valor: 320, empresa: 320, colaborador: 0, esocial: '9213', lei: true },
];

function semearBeneficios(semear: Semear): void {
  semear(
    'beneficios',
    BENEFICIOS.map((b, i) => ({
      id: b.id,
      nome: b.nome,
      descricao: `${b.nome} — oferta demonstrativa da empresa`,
      categoria: b.categoria,
      tipo: b.tipo,
      operadora: b.operadora,
      metodo_pagamento: b.categoria === 'transporte' || b.categoria === 'alimentacao' ? 'cartao' : 'desconto_folha',
      valor: b.valor,
      valor_empresa: b.empresa,
      valor_colaborador: b.colaborador,
      percentual_subsidio_empresa: brl((b.empresa / b.valor) * 100),
      teto_coparticipacao: b.colaborador,
      carencia_dias: b.categoria === 'saude' ? 30 : 0,
      codigo_esocial: b.esocial,
      obrigatorio_por_lei: b.lei,
      exige_anexo_comprovante: b.categoria === 'assistencial',
      colaborador_id: null,
      data_inicio: dia(-720 + i * 10),
      data_fim: null,
      status: 'ativo',
      ativo: true,
      observacoes: 'Benefício fictício usado apenas para demonstração.',
      created_at: instante(-700 + i, '09:00'),
      updated_at: instante(-60 + i, '09:00'),
    })),
  );

  semear(
    'beneficios_colaborador',
    ATIVOS.flatMap((c, i) =>
      ['beneficio-plano-saude', 'beneficio-vale-transporte', 'beneficio-vale-alimentacao'].map((beneficioId, j) => {
        const b = BENEFICIOS.find((x) => x.id === beneficioId)!;
        return {
          id: `beneficio-colaborador-${i + 1}-${j + 1}`,
          colaborador_id: c.id,
          tipo_beneficio_id: beneficioId,
          valor: b.valor,
          desconto: b.colaborador,
          data_inicio: dia(-600 + i * 5 + j),
          data_fim: null,
          data_validacao_rh: dia(-598 + i * 5 + j),
          status_vinculo: 'ativo',
          ativo: true,
          observacoes: null,
          created_by: RH,
          ip_adesao: '187.0.0.10',
          hash_autorizacao: `sha256-adesao-${i + 1}-${j + 1}`,
          created_at: instante(-600 + i * 5 + j, '10:00'),
          updated_at: instante(-30 + i, '10:00'),
        };
      }),
    ),
  );

  semear(
    'beneficio_movimentacoes',
    ATIVOS.slice(0, 8).map((c, i) => ({
      id: `beneficio-movimentacao-${i + 1}`,
      colaborador_id: c.id,
      beneficio_id: ciclo(BENEFICIOS, i).id,
      tipo_movimentacao: i % 3 === 0 ? 'adesao' : i % 3 === 1 ? 'alteracao' : 'cancelamento',
      data_movimentacao: dia(-120 + i * 9),
      motivo: i % 3 === 2 ? 'Encerramento do vínculo (demonstração)' : 'Solicitação do colaborador',
      usuario_id: RH,
      created_at: instante(-120 + i * 9, '11:20'),
    })),
  );

  semear(
    'vales_transporte',
    ATIVOS.map((c, i) => {
      const diario = 12.5;
      const diasUteis = 22;
      const mensal = brl(diario * diasUteis);
      return {
        id: `vale-transporte-${i + 1}`,
        colaborador_id: c.id,
        optante: i % 7 !== 0,
        valor_diario: diario,
        dias_uteis: diasUteis,
        valor_mensal: mensal,
        percentual_desconto: 6,
        desconto: brl(c.salario_base * 0.06),
        valor_liquido: brl(mensal - c.salario_base * 0.06),
        created_at: instante(-400 + i, '09:00'),
        updated_at: instante(-25 + i, '09:00'),
      };
    }),
  );

  semear(
    'vales_alimentacao',
    ATIVOS.map((c, i) => ({
      id: `vale-alimentacao-${i + 1}`,
      colaborador_id: c.id,
      tipo: i % 3 === 0 ? 'refeicao' : 'alimentacao',
      valor_por_dia: i % 3 === 0 ? 24 : 25,
      dias_uteis: 22,
      valor_mensal: i % 3 === 0 ? 528 : 550,
      data_inicio: dia(-500 + i * 4),
      data_fim: null,
      ativo: true,
      created_at: instante(-500 + i * 4, '09:00'),
      updated_at: instante(-20 + i, '09:00'),
    })),
  );

  semear(
    'recargas_vale',
    ATIVOS.slice(0, 8).map((c, i) => ({
      id: `recarga-vale-${i + 1}`,
      colaborador_id: c.id,
      vale_id: i % 2 === 0 ? `vale-transporte-${i + 1}` : `vale-alimentacao-${i + 1}`,
      valor: i % 2 === 0 ? 275 : 550,
      data_recarga: dia(-10 + (i % 5) * 3),
      mes_referencia: competencia(0),
      status: i === 7 ? 'pendente' : 'processada',
      origem_recurso: 'empresa',
      created_at: instante(-10 + (i % 5) * 3, '07:30'),
    })),
  );
}


// ---------------------------------------------------------------------------
// Descontos, despesas e financeiro/contábil
// ---------------------------------------------------------------------------

function semearDescontos(semear: Semear): void {
  semear(
    'adiantamentos_salariais',
    ATIVOS.slice(0, 6).map((c, i) => ({
      id: `adiantamento-${i + 1}`,
      colaborador_id: c.id,
      valor_solicitado: brl(c.salario_base * 0.4),
      data_solicitacao: dia(-12 + i),
      data_pagamento: i < 4 ? dia(-10 + i) : null,
      competencia_desconto: competencia(0),
      status: i < 4 ? 'aprovado' : 'pendente',
      motivo: 'Adiantamento quinzenal solicitado pelo colaborador (demonstração).',
      aprovado_por: i < 4 ? RH : null,
      created_at: instante(-12 + i, '08:20'),
      updated_at: instante(-9 + i, '08:20'),
    })),
  );

  semear(
    'emprestimos_consignados',
    ATIVOS.slice(0, 5).map((c, i) => {
      const valorTotal = brl(c.salario_base * 2.5);
      const parcelas = 12;
      return {
        id: `emprestimo-${i + 1}`,
        colaborador_id: c.id,
        instituicao_financeira: ['Banco do Brasil', 'Itaú', 'Bradesco', 'Caixa', 'Santander'][i % 5],
        valor_total: valorTotal,
        valor_parcela: brl(valorTotal / parcelas),
        numero_parcelas: parcelas,
        parcelas_pagas: (i * 2) % parcelas,
        taxa_juros: 1.7,
        data_inicio: dia(-180 + i * 15),
        status: i === 4 ? 'quitado' : 'ativo',
        observacoes: 'Empréstimo fictício para demonstração.',
        created_at: instante(-180 + i * 15, '10:00'),
        updated_at: instante(-20 + i, '10:00'),
      };
    }),
  );

  semear(
    'despesas',
    Array.from({ length: 10 }).map((_, i) => {
      const c = ciclo(ATIVOS, i);
      return {
        id: `despesa-${i + 1}`,
        colaborador_id: c.id,
        tipo: ['reembolso', 'adiantamento', 'viagem'][i % 3],
        categoria: ['transporte', 'alimentacao', 'hospedagem', 'material'][i % 4],
        descricao: `Despesa de ${['deslocamento', 'alimentação', 'hospedagem', 'material de escritório'][i % 4]} (demonstração)`,
        valor: brl(120 + i * 87.5),
        data_despesa: dia(-20 + i * 2),
        comprovante_url: `https://exemplo.invalid/comprovante-${i + 1}.pdf`,
        status: ['pendente', 'aprovada', 'rejeitada', 'reembolsada'][i % 4],
        aprovado_por: i % 4 === 0 ? null : RH,
        aprovado_em: i % 4 === 0 ? null : instante(-18 + i * 2, '15:00'),
        observacoes: 'Despesa fictícia gerada para demonstração.',
        folha_id: null,
        created_at: instante(-20 + i * 2, '09:10'),
        updated_at: instante(-18 + i * 2, '09:10'),
      };
    }),
  );

  semear(
    'contas_bancarias',
    [
      { banco: '341', nome: 'Itaú', agencia: '1234', conta: '56789-0' },
      { banco: '001', nome: 'Banco do Brasil', agencia: '4321', conta: '98765-4' },
      { banco: '237', nome: 'Bradesco', agencia: '2468', conta: '13579-2' },
      { banco: '033', nome: 'Santander', agencia: '1122', conta: '33445-6' },
      { banco: '104', nome: 'Caixa', agencia: '5566', conta: '77889-1' },
    ].map((b, i) => ({
      id: `conta-bancaria-${i + 1}`,
      banco_codigo: b.banco,
      banco_nome: b.nome,
      agencia: b.agencia,
      agencia_digito: String(i + 1),
      conta: b.conta,
      digito: b.conta.split('-')[1],
      tipo_conta: 'corrente',
      modalidade: 'folha',
      principal: i === 0,
      ativo: true,
      pix_chave: `${b.banco}@promobrindes.com.br`,
      pix_tipo: 'email',
      colaborador_id: null,
      created_at: instante(-500 + i, '09:00'),
      updated_at: instante(-50 + i, '09:00'),
    })),
  );
}


/** CNAB/Pix, plano de contas e lançamentos contábeis. */
function semearFinanceiro(semear: Semear): void {
  semear('cnab_configuracoes', [
    {
      id: 'cnab-configuracao-1',
      banco_codigo: '341',
      nome_empresa: MOCK_EMPRESA.razao_social,
      agencia: '1234',
      agencia_digito: '1',
      conta: '56789',
      conta_digito: '0',
      convenio: '1234567',
      codigo_empresa: 'PROMO001',
      created_at: instante(-500, '09:00'),
      updated_at: instante(-50, '09:00'),
    },
  ]);

  const remessas = [1, 0].map((mesesAtras, i) => ({
    id: `cnab-remessa-${i + 1}`,
    banco_codigo: '341',
    sequencial_arquivo: i + 1,
    data_geracao: instante(-mesesAtras * 30 - 1, '19:00'),
    total_pagamentos: ATIVOS.length,
    valor_total: brl(ATIVOS.reduce((s, c) => s + c.salario_base * 0.85, 0)),
    status: 'processado',
    arquivo_url: `https://exemplo.invalid/remessa-${i + 1}.rem`,
    hash_integridade: `sha256-cnab-${i + 1}`,
    created_at: instante(-mesesAtras * 30 - 1, '19:00'),
    updated_at: instante(-mesesAtras * 30 - 1, '19:05'),
  }));
  semear('cnab_remessas', remessas);

  semear(
    'cnab_itens',
    remessas.flatMap((remessa, r) =>
      ATIVOS.map((c, i) => ({
        id: `cnab-item-${r + 1}-${i + 1}`,
        remessa_id: remessa.id,
        folha_item_id: `folha-item-${competencia(r)}-${i + 1}`,
        colaborador_id: c.id,
        nome_favorecido: c.nome_completo,
        cpf_cnpj_favorecido: c.cpf,
        banco_favorecido: '341',
        agencia_favorecido: '1234',
        conta_favorecido: `${50000 + i}-${i % 9}`,
        valor_pagamento: brl(c.salario_base * 0.85),
        data_pagamento: dia(-r * 30 + 4),
        tipo_pagamento: 'credito_conta',
        seu_numero: String(i + 1).padStart(6, '0'),
        status: 'pago',
        codigo_ocorrencia: '00',
        mensagem_ocorrencia: 'Pagamento efetuado (demonstração)',
        created_at: instante(-r * 30 - 1, '19:00'),
      })),
    ),
  );

  semear(
    'pix_lotes',
    [1, 0].map((mesesAtras, i) => ({
      id: `pix-lote-${i + 1}`,
      quantidade_pagamentos: ATIVOS.length,
      valor_total: brl(ATIVOS.reduce((s, c) => s + c.salario_base * 0.15, 0)),
      status: 'processado',
      data_criacao: instante(-mesesAtras * 30 - 1, '19:10'),
      created_at: instante(-mesesAtras * 30 - 1, '19:10'),
      updated_at: instante(-mesesAtras * 30 - 1, '19:12'),
    })),
  );

  const CONTAS = [
    { codigo: '1.1.01', nome: 'Caixa e equivalentes', tipo: 'ativo', natureza: 'devedora' },
    { codigo: '1.1.02', nome: 'Contas a receber', tipo: 'ativo', natureza: 'devedora' },
    { codigo: '2.1.01', nome: 'Salários a pagar', tipo: 'passivo', natureza: 'credora' },
    { codigo: '2.1.02', nome: 'INSS a recolher', tipo: 'passivo', natureza: 'credora' },
    { codigo: '2.1.03', nome: 'FGTS a recolher', tipo: 'passivo', natureza: 'credora' },
    { codigo: '2.1.04', nome: 'IRRF a recolher', tipo: 'passivo', natureza: 'credora' },
    { codigo: '2.2.01', nome: 'Provisão de férias', tipo: 'passivo', natureza: 'credora' },
    { codigo: '2.2.02', nome: 'Provisão de 13º salário', tipo: 'passivo', natureza: 'credora' },
    { codigo: '3.1.01', nome: 'Despesa com pessoal', tipo: 'despesa', natureza: 'devedora' },
    { codigo: '3.1.02', nome: 'Encargos sociais', tipo: 'despesa', natureza: 'devedora' },
  ];
  semear(
    'plano_contas',
    CONTAS.map((c, i) => ({
      id: `plano-conta-${i + 1}`,
      codigo: c.codigo,
      nome: c.nome,
      tipo: c.tipo,
      natureza: c.natureza,
      created_at: instante(-600 + i, '09:00'),
      updated_at: instante(-90 + i, '09:00'),
    })),
  );

  semear(
    'lancamentos_contabeis',
    COMPETENCIAS_FOLHA.slice(0, 3).flatMap((comp, indiceCompetencia) =>
      [0, 1, 2].map((variacao) => ({
        id: `lancamento-${comp}-${variacao + 1}`,
        folha_id: idFolha(comp),
        data_lancamento: dia(-indiceCompetencia * 30 + 1),
        descricao: [
          `Provisão de salários — ${comp}`,
          `Encargos sociais — ${comp}`,
          `Provisão de férias e 13º — ${comp}`,
        ][variacao],
        conta_debito_id: `plano-conta-${[9, 10, 7][variacao]}`,
        conta_credito_id: `plano-conta-${[3, 4, 8][variacao]}`,
        valor: brl(ATIVOS.reduce((s, c) => s + c.salario_base * (0.12 + variacao * 0.05), 0)),
        origem: 'folha',
        status: 'contabilizado',
        created_at: instante(-indiceCompetencia * 30 + 1, '20:00'),
        updated_at: instante(-indiceCompetencia * 30 + 1, '20:00'),
      })),
    ),
  );
}

// ---------------------------------------------------------------------------
// Documentos, contratos, eSocial e obrigações fiscais
// ---------------------------------------------------------------------------

const TIPOS_DOCUMENTO = [
  { tipo: 'rg', nome: 'RG — Carteira de Identidade', validade: 3650 },
  { tipo: 'cpf', nome: 'CPF', validade: 0 },
  { tipo: 'ctps', nome: 'CTPS Digital', validade: 0 },
  { tipo: 'contrato', nome: 'Contrato de Trabalho', validade: 0 },
  { tipo: 'aso', nome: 'ASO — Atestado de Saúde Ocupacional', validade: 365 },
  { tipo: 'comprovante_endereco', nome: 'Comprovante de Endereço', validade: 90 },
];

function semearDocumentos(semear: Semear): void {
  semear(
    'documentos',
    ATIVOS.flatMap((c, i) =>
      TIPOS_DOCUMENTO.map((d, j) => ({
        id: `documento-${i + 1}-${j + 1}`,
        colaborador_id: c.id,
        tipo: d.tipo,
        nome: d.nome,
        url: `https://exemplo.invalid/documentos/${slug(c.nome_completo)}-${d.tipo}.pdf`,
        data_validade: d.validade ? dia(d.validade - 300 + i) : null,
        validado: j !== 5,
        validado_por: j !== 5 ? RH : null,
        observacoes: 'Documento fictício para demonstração.',
        created_at: instante(-500 + i * 2 + j, '09:00'),
        updated_at: instante(-100 + i * 2 + j, '09:00'),
      })),
    ),
  );

  semear(
    'contratos',
    TODOS.map((c, i) => ({
      id: `contrato-${i + 1}`,
      colaborador_id: c.id,
      tipo: c.tipo_contrato === 'clt' ? 'clt' : c.tipo_contrato,
      status: c.status === 'desligado' ? 'encerrado' : 'vigente',
      data_inicio: c.data_admissao,
      data_fim: c.status === 'desligado' ? dia(-180 + i * 10) : null,
      observacoes: 'Contrato fictício usado na demonstração.',
      created_at: instante(-500 + i * 3, '09:00'),
      updated_at: instante(-60 + i, '09:00'),
    })),
  );

  const eventosEsocial = [
    { tipo: 'S-2200', descricao: 'Admissão / Cadastramento Inicial' },
    { tipo: 'S-1200', descricao: 'Remuneração do Trabalhador RGPS' },
    { tipo: 'S-1280', descricao: 'Informações Complementares aos Eventos Periódicos' },
    { tipo: 'S-2230', descricao: 'Afastamento Temporário' },
    { tipo: 'S-2299', descricao: 'Desligamento' },
  ];

  semear(
    'esocial_eventos',
    ATIVOS.flatMap((c, i) =>
      eventosEsocial.slice(0, 3).map((e, j) => ({
        id: `esocial-evento-${i + 1}-${j + 1}`,
        tipo_evento: e.tipo,
        competencia: j === 0 ? null : competencia(1),
        status: j === 2 ? 'processado_com_sucesso' : 'transmitido',
        recibo: `1.2.${String(i + 1).padStart(6, '0')}${j}`,
        protocolo: `PROT-${i + 1}-${j + 1}`,
        data_envio: instante(-20 + j, '10:00'),
        data_processamento: instante(-20 + j, '10:05'),
        tentativas_envio: 1,
        hash_arquivo: `sha256-esocial-${i + 1}-${j + 1}`,
        hash_seguranca: `seg-${i + 1}-${j + 1}`,
        xml: `<evento tipo="${e.tipo}"><ideVinculo><cpfTrab>${c.cpf}</cpfTrab></ideVinculo></evento>`,
        erros: [],
        dados: { colaborador: c.nome_completo, descricao: e.descricao },
        created_at: instante(-20 + j, '10:00'),
        updated_at: instante(-20 + j, '10:05'),
      })),
    ),
  );

  semear(
    'esocial_lotes',
    [2, 1, 0].map((mesesAtras, i) => ({
      id: `esocial-lote-${i + 1}`,
      ambiente: 'producao_restrita',
      status: i === 2 ? 'processando' : 'processado',
      progresso: i === 2 ? 45 : 100,
      protocolo: `LOTE-${i + 1}`,
      eventos: [{ quantidade: 8 + i, tipo: 'S-1200' }],
      created_at: instante(-mesesAtras * 30 - 1, '20:00'),
      updated_at: instante(-mesesAtras * 30 - 1, '20:10'),
    })),
  );

  semear(
    'esocial_transmissao_logs',
    [2, 1, 0].flatMap((mesesAtras, i) =>
      [0, 1].map((j) => ({
        id: `esocial-log-${i + 1}-${j + 1}`,
        evento_id: `esocial-evento-${i + 1}-${j + 1}`,
        status: 'sucesso',
        duracao_ms: 850 + i * 120 + j * 60,
        request_xml: '<envioLoteEventos/>',
        response_xml: '<retornoProcessamento/>',
        error_details: {},
        created_at: instante(-mesesAtras * 30 - 1 - j, '20:0' + j),
      })),
    ),
  );
}

/** Guias, declarações e certificados digitais. */
function semearObrigacoes(semear: Semear): void {
  const competenciasGuia = [3, 2, 1].map(competencia);

  semear(
    'guias_fgts',
    competenciasGuia.map((comp, i) => ({
      id: `guia-fgts-${comp}`,
      competencia: comp,
      tipo: 'mensal',
      valor_total: brl(ATIVOS.reduce((s, c) => s + c.salario_base * 0.08, 0)),
      valor_multa: 0,
      valor_total_recolher: brl(ATIVOS.reduce((s, c) => s + c.salario_base * 0.08, 0)),
      data_vencimento: dia(-i * 30 + 7),
      data_pagamento: i === 0 ? dia(-i * 30 + 5) : null,
      status: i === 0 ? 'pendente' : 'pago',
      codigo_barras: `8580000000${i}${comp.replace('-', '')}`,
      created_at: instante(-i * 30 - 2, '09:00'),
    })),
  );

  semear(
    'guias_inss',
    competenciasGuia.map((comp, i) => ({
      id: `guia-inss-${comp}`,
      competencia: comp,
      tipo: 'previdenciario',
      valor_empresa: brl(ATIVOS.reduce((s, c) => s + c.salario_base * 0.2, 0)),
      valor_segurados: brl(ATIVOS.reduce((s, c) => s + c.salario_base * 0.11, 0)),
      valor_total: brl(ATIVOS.reduce((s, c) => s + c.salario_base * 0.31, 0)),
      data_vencimento: dia(-i * 30 + 20),
      data_pagamento: i === 0 ? dia(-i * 30 + 18) : null,
      status: i === 0 ? 'pendente' : 'pago',
      codigo_barras: `1870000000${i}${comp.replace('-', '')}`,
      created_at: instante(-i * 30 - 2, '09:10'),
    })),
  );

  semear(
    'dctfweb_declaracoes',
    competenciasGuia.map((comp, i) => ({
      id: `dctfweb-${comp}`,
      competencia: comp,
      status: i === 0 ? 'gerada' : 'transmitida',
      total_remuneracao: brl(ATIVOS.reduce((s, c) => s + c.salario_base, 0)),
      total_fgts: brl(ATIVOS.reduce((s, c) => s + c.salario_base * 0.08, 0)),
      total_debitos: brl(ATIVOS.reduce((s, c) => s + c.salario_base * 0.31, 0)),
      debitos: [{ tributo: 'INSS', valor: brl(ATIVOS.reduce((s, c) => s + c.salario_base * 0.31, 0)) }],
      data_geracao: instante(-i * 30 - 1, '11:00'),
      data_transmissao: i === 0 ? null : instante(-i * 30, '11:30'),
      created_at: instante(-i * 30 - 1, '11:00'),
    })),
  );

  semear(
    'sefip_arquivos',
    competenciasGuia.map((comp, i) => ({
      id: `sefip-${comp}`,
      competencia: comp,
      modalidade: 1,
      status: 'processado',
      total_colaboradores: ATIVOS.length,
      total_remuneracao: brl(ATIVOS.reduce((s, c) => s + c.salario_base, 0)),
      total_fgts: brl(ATIVOS.reduce((s, c) => s + c.salario_base * 0.08, 0)),
      conteudo: 'SEFIP-FICTICIA-DEMONSTRACAO',
      created_at: instante(-i * 30 - 2, '12:00'),
      updated_at: instante(-i * 30 - 2, '12:05'),
    })),
  );

  semear('certificados_digitais', [
    {
      id: 'certificado-digital-1',
      subject: MOCK_EMPRESA.razao_social,
      issuer: 'AC Certisign RFB G5',
      cnpj_cpf: MOCK_EMPRESA.cnpj,
      thumbprint: '9F2C41AB77DE41C8',
      valid_from: dia(-180),
      valid_to: dia(185),
      ativo: true,
      arquivo_base64: null,
      senha_encriptada: null,
      created_at: instante(-180, '09:00'),
    },
  ]);
}

// ---------------------------------------------------------------------------
// SST / Saúde ocupacional
// ---------------------------------------------------------------------------

const TIPOS_EXAME = ['admissional', 'periodico', 'demissional', 'mudanca_risco', 'retorno_trabalho'];

function semearSst(semear: Semear): void {
  semear(
    'asos',
    ATIVOS.map((c, i) => ({
      id: `aso-${i + 1}`,
      colaborador_id: c.id,
      tipo: ciclo(TIPOS_EXAME, i),
      resultado: 'apto',
      clinica: 'Clínica Ocupar Saúde',
      medico_nome: `Dr(a). ${['Ricardo Alves', 'Fernanda Prado', 'Marcos Tavares'][i % 3]}`,
      medico_crm: `CRM-SP ${100000 + i}`,
      data_exame: dia(-150 + i * 7),
      data_validade: dia(215 + i * 7),
      status: 'aprovado',
      observacoes: 'ASO fictício para demonstração.',
      restricoes: [],
      arquivo_url: `https://exemplo.invalid/aso/${i + 1}.pdf`,
      hash_integridade: `sha256-aso-${i + 1}`,
      recebido_rh_em: instante(-148 + i * 7, '10:00'),
      recebido_rh_por: RH,
      validado_em: instante(-147 + i * 7, '10:30'),
      validado_por: RH,
      created_at: instante(-150 + i * 7, '08:30'),
      updated_at: instante(-147 + i * 7, '10:30'),
    })),
  );

  semear(
    'exames',
    ATIVOS.map((c, i) => ({
      id: `exame-${i + 1}`,
      colaborador_id: c.id,
      tipo: ciclo(TIPOS_EXAME, i),
      resultado: 'normal',
      medico: 'Dr(a). Ricardo Alves',
      crm: `CRM-SP ${100000 + i}`,
      data_exame: dia(-150 + i * 7),
      data_validade: dia(215 + i * 7),
      observacoes: 'Exame fictício para demonstração.',
      created_at: instante(-150 + i * 7, '08:30'),
    })),
  );

  const EPIS = [
    { id: 'epi-1', nome: 'Protetor auricular plug', categoria: 'protecao_auditiva', ca: 'CA 12345', estoque: 180, minimo: 40 },
    { id: 'epi-2', nome: 'Luva de segurança tricotada', categoria: 'protecao_maos', ca: 'CA 23456', estoque: 240, minimo: 60 },
    { id: 'epi-3', nome: 'Bota de segurança', categoria: 'protecao_pes', ca: 'CA 34567', estoque: 90, minimo: 20 },
    { id: 'epi-4', nome: 'Óculos de proteção', categoria: 'protecao_ocular', ca: 'CA 45678', estoque: 120, minimo: 30 },
    { id: 'epi-5', nome: 'Máscara PFF2', categoria: 'protecao_respiratoria', ca: 'CA 56789', estoque: 35, minimo: 50 },
  ];

  semear(
    'epis',
    EPIS.map((e, i) => ({
      id: e.id,
      nome: e.nome,
      descricao: `${e.nome} — EPI demonstrativo`,
      categoria: e.categoria,
      fabricante: ['3M', 'Danny', 'Marluvas', 'MSA', 'Delta Plus'][i % 5],
      ca: e.ca,
      ca_validade: dia(400 + i * 30),
      validade_ca: dia(400 + i * 30),
      estoque_atual: e.estoque,
      estoque_minimo: e.minimo,
      unidade_medida: 'unidade',
      ativo: true,
      created_at: instante(-300 + i, '09:00'),
      updated_at: instante(-40 + i, '09:00'),
    })),
  );

  semear(
    'epis_entregas',
    ATIVOS.slice(0, 10).map((c, i) => ({
      id: `epi-entrega-${i + 1}`,
      epi_id: ciclo(EPIS, i).id,
      colaborador_id: c.id,
      quantidade: 1 + (i % 2),
      data_entrega: dia(-90 + i * 6),
      data_devolucao: null,
      entregue_por: 'Técnico de Segurança do Trabalho',
      assinatura_url: `https://exemplo.invalid/epi/ficha-${i + 1}.pdf`,
      hash_integridade: `sha256-epi-${i + 1}`,
      observacoes: 'Entrega fictícia para demonstração.',
      created_at: instante(-90 + i * 6, '14:00'),
    })),
  );
}


// ---------------------------------------------------------------------------
// Convênios, planos de saúde e seguros
// ---------------------------------------------------------------------------

const CONVENIOS = [
  { id: 'convenio-saude', nome: 'Convênio Saúde Ocupacional', tipo: 'saude', limite: 250000 },
  { id: 'convenio-odonto', nome: 'Convênio Odontológico', tipo: 'odontologico', limite: 80000 },
  { id: 'convenio-farmacia', nome: 'Convênio Farmácia', tipo: 'farmacia', limite: 45000 },
  { id: 'convenio-academia', nome: 'Convênio Academia / Bem-estar', tipo: 'bem_estar', limite: 30000 },
];

function semearConveniosESeguros(semear: Semear): void {
  semear(
    'convenios',
    CONVENIOS.map((c, i) => ({
      id: c.id,
      nome: c.nome,
      tipo: c.tipo,
      limite_global: c.limite,
      ativo: true,
      created_at: instante(-400 + i, '09:00'),
    })),
  );

  semear(
    'convenios_colaboradores',
    ATIVOS.flatMap((colab, i) =>
      CONVENIOS.slice(0, 2 + (i % 2)).map((conv, j) => ({
        id: `convenio-colaborador-${i + 1}-${j + 1}`,
        convenio_id: conv.id,
        colaborador_id: colab.id,
        limite_individual: brl(conv.limite / ATIVOS.length),
        saldo_utilizado: brl((conv.limite / ATIVOS.length) * ((i % 4) / 10)),
        ativo: true,
        created_at: instante(-380 + i * 3 + j, '09:00'),
      })),
    ),
  );

  semear(
    'planos_saude',
    ATIVOS.map((c, i) => ({
      id: `plano-saude-${i + 1}`,
      colaborador_id: c.id,
      operadora: i % 2 === 0 ? 'Unimed' : 'Bradesco Saúde',
      tipo_plano: i % 3 === 0 ? 'enfermaria' : 'apartamento',
      abrangencia: 'nacional',
      ans_registro: `ANS ${400000 + i}`,
      numero_carteirinha: `00${100000 + i}`,
      valor_mensal: 480 + (i % 4) * 90,
      percentual_empresa: 62,
      percentual_colaborador: 38,
      coparticipacao_teto: 180,
      data_inicio: dia(-400 + i * 8),
      data_fim: null,
      ativo: true,
      created_at: instante(-400 + i * 8, '09:00'),
      updated_at: instante(-30 + i, '09:00'),
    })),
  );

  semear(
    'seguros_vida',
    ATIVOS.map((c, i) => ({
      id: `seguro-vida-${i + 1}`,
      colaborador_id: c.id,
      seguradora: 'Porto Seguro Vida',
      apolice_numero: `AP-2026-${String(i + 1).padStart(4, '0')}`,
      numero_apolice: `AP-2026-${String(i + 1).padStart(4, '0')}`,
      capital_segurado: brl(c.salario_base * 24),
      premio_mensal: brl(c.salario_base * 0.012),
      possui_assistencia_funeral: true,
      data_inicio: dia(-400 + i * 8),
      data_fim: null,
      data_vencimento_apolice: dia(200 + i),
      ativo: true,
      created_at: instante(-400 + i * 8, '09:00'),
      updated_at: instante(-30 + i, '09:00'),
    })),
  );

  semear(
    'sinistros_seguro',
    ATIVOS.slice(0, 3).map((c, i) => ({
      id: `sinistro-${i + 1}`,
      colaborador_id: c.id,
      seguro_vida_id: `seguro-vida-${i + 1}`,
      tipo: ['acidente', 'doenca', 'invalidez'][i],
      status: 'em_analise',
      data_sinistro: dia(-45 + i * 12),
      descricao: 'Sinistro fictício para demonstração.',
      created_at: instante(-45 + i * 12, '10:00'),
    })),
  );
}

// ---------------------------------------------------------------------------
// Pensionistas, sindicatos, movimentações, medidas disciplinares e avisos
// ---------------------------------------------------------------------------

function semearOutros(semear: Semear): void {
  semear(
    'pensoes',
    ATIVOS.slice(0, 4).map((c, i) => ({
      id: `pensao-${i + 1}`,
      colaborador_id: c.id,
      beneficiario: `${i % 2 === 0 ? 'Ana Clara' : 'Pedro Henrique'} ${c.nome_completo.split(' ')[0]}`,
      cpf_beneficiario: `***.***.***-${String(10 + i).padStart(2, '0')}`,
      tipo: i % 2 === 0 ? 'judicial' : 'acordo',
      percentual: 20 + i * 5,
      valor_fixo: null,
      banco: '341',
      agencia: '1234',
      conta: `${70000 + i}-1`,
      ativo: true,
      created_at: instante(-300 + i * 10, '09:00'),
    })),
  );

  semear('sindicatos', [
    {
      id: 'sindicato-comercio-sp',
      nome: 'Sindicato dos Comerciários de São Paulo',
      cnpj: '61.695.227/0001-75',
      telefone: '(11) 3291-0000',
      email: 'contato@sindicatocomercisp.org.br',
      data_base: `${HOJE.getFullYear()}-01-01`,
      contribuicao_mensal: 38,
      created_at: instante(-600, '09:00'),
    },
    {
      id: 'sindicato-industria-sp',
      nome: 'Sindicato da Indústria Metalúrgica de SP',
      cnpj: '60.887.096/0001-60',
      telefone: '(11) 3345-0000',
      email: 'contato@sindicatometalurgicosp.org.br',
      data_base: `${HOJE.getFullYear()}-05-01`,
      contribuicao_mensal: 42,
      created_at: instante(-600, '09:00'),
    },
  ]);

  semear(
    'promocoes',
    ATIVOS.slice(0, 4).map((c, i) => ({
      id: `promocao-${i + 1}`,
      colaborador_id: c.id,
      cargo_anterior_id: idCargo(c.cargo),
      cargo_novo_id: idCargo(CARGOS[(CARGOS.indexOf(c.cargo) + 1) % CARGOS.length]),
      salario_anterior: c.salario_base,
      salario_novo: brl(c.salario_base * 1.15),
      data_vigencia: dia(-120 + i * 20),
      motivo: 'Promoção por mérito (demonstração).',
      created_at: instante(-125 + i * 20, '10:00'),
    })),
  );

  semear(
    'transferencias',
    ATIVOS.slice(0, 3).map((c, i) => ({
      id: `transferencia-${i + 1}`,
      colaborador_id: c.id,
      departamento_anterior_id: idDepartamento(c.departamento),
      departamento_novo_id: idDepartamento(DEPARTAMENTOS[(DEPARTAMENTOS.indexOf(c.departamento) + 1) % DEPARTAMENTOS.length]),
      data_vigencia: dia(-90 + i * 15),
      motivo: 'Transferência de área a pedido da gestão (demonstração).',
      created_at: instante(-95 + i * 15, '10:00'),
    })),
  );

  semear(
    'faltas',
    ATIVOS.slice(0, 6).map((c, i) => ({
      id: `falta-${i + 1}`,
      colaborador_id: c.id,
      data: dia(-25 + i * 4),
      tipo: ['justificada', 'injustificada', 'atestado'][i % 3],
      motivo: ['Consulta médica', 'Problema particular', 'Atestado de 1 dia'][i % 3],
      justificada: i % 3 !== 1,
      dias_total: 1 + (i % 2),
      horas_falta: i % 3 === 0 ? '02:00' : null,
      desconto_aplicado: i % 3 === 1,
      status: i % 3 === 2 ? 'pendente' : 'aprovado',
      documento_url: i % 3 === 2 ? `https://exemplo.invalid/atestado-${i + 1}.pdf` : null,
      created_by: RH,
      created_at: instante(-25 + i * 4, '08:00'),
    })),
  );

  semear(
    'medidas_disciplinares',
    ATIVOS.slice(0, 3).map((c, i) => ({
      id: `medida-${i + 1}`,
      colaborador_id: c.id,
      numero_sequencial: i + 1,
      tipo: ['advertencia_verbal', 'advertencia_escrita', 'suspensao'][i],
      gravidade: ['leve', 'media', 'grave'][i],
      descricao: 'Ocorrência fictícia criada apenas para demonstração do fluxo.',
      artigo_clt: 'Art. 482 — CLT',
      data_ocorrencia: dia(-60 + i * 15),
      data_conhecimento_fato: dia(-61 + i * 15),
      data_ciencia: dia(-58 + i * 15),
      dias_suspensao: i === 2 ? 1 : 0,
      status: ['aplicada', 'em_analise', 'aplicada'][i],
      status_workflow: ['concluido', 'em_aprovacao', 'concluido'][i],
      aplicado_por: RH,
      aprovador_id: ATIVOS[ATIVOS.length - 1].id,
      colaborador_ciente: i !== 1,
      testemunha_1_nome: 'Testemunha Demo 1',
      testemunha_2_nome: 'Testemunha Demo 2',
      evidenciado_por: [],
      hash_integridade: `sha256-medida-${i + 1}`,
      created_at: instante(-60 + i * 15, '10:00'),
      updated_at: instante(-58 + i * 15, '10:30'),
    })),
  );
}

/** Avisos, comunicados e simulações fiscais. */
function semearAvisos(semear: Semear): void {
  semear(
    'notificacoes',
    [
      { titulo: 'Folha em cálculo', mensagem: `A competência ${competencia(0)} está pronta para revisão.`, tipo: 'folha' },
      { titulo: 'Documentos a vencer', mensagem: '3 documentos vencem nos próximos 30 dias.', tipo: 'documento' },
      { titulo: 'ASO pendente', mensagem: '2 colaboradores estão com ASO a vencer.', tipo: 'sst' },
      { titulo: 'eSocial processado', mensagem: 'Lote S-1200 processado com sucesso.', tipo: 'esocial' },
      { titulo: 'Reembolso aprovado', mensagem: 'Sua despesa foi aprovada pelo gestor.', tipo: 'despesa' },
    ].map((n, i) => ({
      id: `notificacao-${i + 1}`,
      titulo: n.titulo,
      mensagem: n.mensagem,
      tipo: n.tipo,
      lida: i > 2,
      data_referencia: dia(-i),
      entidade_tipo: n.tipo,
      entidade_id: `demo-${i + 1}`,
      user_id: 'mock-user',
      created_at: instante(-i, '08:00'),
      updated_at: instante(-i, '08:00'),
    })),
  );

  semear(
    'comunicados',
    [
      { titulo: 'Campanha de vacinação 2026', tipo: 'saude', prioridade: 1 },
      { titulo: 'Nova política de home office', tipo: 'politica', prioridade: 2 },
      { titulo: 'Fechamento da folha — prazos', tipo: 'folha', prioridade: 1 },
    ].map((c, i) => ({
      id: `comunicado-${i + 1}`,
      titulo: c.titulo,
      conteudo: 'Conteúdo fictício criado para a demonstração do módulo de comunicação interna.',
      tipo: c.tipo,
      prioridade: c.prioridade,
      data_publicacao: dia(-10 + i * 3),
      data_expiracao: dia(30 + i * 3),
      ativo: true,
      created_by: RH,
      created_at: instante(-10 + i * 3, '09:00'),
    })),
  );

  semear(
    'simulacoes_fiscais',
    [0, 1, 2].map((i) => ({
      id: `simulacao-${i + 1}`,
      titulo: `Simulação de encargos — cenário ${i + 1}`,
      descricao: 'Simulação fictícia de custo de folha usada na demonstração.',
      configuracao: { regime: 'simples_nacional', colaboradores: ATIVOS.length },
      resultado: { custo_total: brl(ATIVOS.reduce((s, c) => s + c.salario_base * (1.2 + i * 0.05), 0)) },
      usuario_id: 'mock-user',
      created_at: instante(-40 + i * 10, '15:00'),
    })),
  );
}

// ---------------------------------------------------------------------------
// Promo Brindes e Canal de Ética
// ---------------------------------------------------------------------------

const BRINDES = [
  { id: 'brinde-camiseta', nome: 'Camiseta institucional', categoria: 'vestuario', preco: 49.9, estoque: 180 },
  { id: 'brinde-caneca', nome: 'Caneca térmica', categoria: 'utilidades', preco: 39.9, estoque: 240 },
  { id: 'brinde-garrafa', nome: 'Garrafa squeeze', categoria: 'utilidades', preco: 34.9, estoque: 150 },
  { id: 'brinde-mochila', nome: 'Mochila executiva', categoria: 'acessorios', preco: 129.9, estoque: 60 },
  { id: 'brinde-bone', nome: 'Boné bordado', categoria: 'vestuario', preco: 44.9, estoque: 120 },
  { id: 'brinde-kit', nome: 'Kit boas-vindas', categoria: 'kit', preco: 189.9, estoque: 40 },
];

function semearBrindes(semear: Semear): void {
  semear(
    'promo_brindes',
    BRINDES.map((b, i) => ({
      id: b.id,
      nome: b.nome,
      descricao: `${b.nome} — brinde fictício da campanha de demonstração`,
      categoria: b.categoria,
      preco: b.preco,
      estoque: b.estoque,
      created_at: instante(-200 + i * 8, '09:00'),
      updated_at: instante(-20 + i, '09:00'),
    })),
  );

  semear(
    'times_brindes',
    TIMES.flatMap((timeId, i) =>
      BRINDES.slice(0, 2).map((b, j) => ({
        id: `time-brinde-${i + 1}-${j + 1}`,
        time_id: timeId,
        brinde_id: b.id,
        quantidade_alocada: 10 + i * 5 + j * 2,
        created_at: instante(-90 + i * 5 + j, '10:00'),
      })),
    ),
  );

  semear(
    'canal_etica',
    [
      { categoria: 'assedio', prioridade: 'alta', status: 'em_analise' },
      { categoria: 'discriminacao', prioridade: 'media', status: 'respondido' },
      { categoria: 'conduta', prioridade: 'baixa', status: 'concluido' },
    ].map((d, i) => ({
      id: `canal-etica-${i + 1}`,
      protocolo: `ETICA-${HOJE.getFullYear()}-${String(i + 1).padStart(3, '0')}`,
      categoria: d.categoria,
      prioridade: d.prioridade,
      status: d.status,
      anonimo: i !== 1,
      descricao: 'Relato fictício criado apenas para demonstrar o fluxo do Canal de Ética.',
      resposta: d.status === 'respondido' ? 'Retorno fictício da área de Compliance.' : null,
      created_at: instante(-30 + i * 9, '11:00'),
      updated_at: instante(-18 + i * 9, '11:00'),
    })),
  );
}

// ---------------------------------------------------------------------------
// Montagem do dataset
// ---------------------------------------------------------------------------

/**
 * Tabelas que NÃO entram no mock: sessão, tenant, permissões e infraestrutura.
 * Sem isso o RouteGuard/RBAC e o seletor de empresa passariam a operar sobre
 * dados fictícios e a navegação quebraria.
 */
const TABELAS_FORA_DO_MOCK = new Set([
  'empresas',
  'user_empresas',
  'user_roles',
  'user_permissions',
  'profiles',
  'security_alerts',
  'versao_banco',
  'audit_log_unified',
  'audit_log',
  'webhook_logs',
  'webhooks_config',
  'whatsapp_config',
  'whatsapp_mensagens_logs',
  'feature_flags',
  'idempotencia_registros',
  'rate_limit_registros',
  'sessoes_usuario',
  'user_sessions',
]);

/** Nome no singular = tabela de configuração → uma única linha. */
const PADRAO_TABELA_SINGULAR = /(^|_)config(uracao|uracoes)?($|_)|parametro|whatsapp|webhook|feature_flag/;

export function construirTabelasGestao(): Tabelas {
  const tabelas: Tabelas = { ...construirTabelas() };
  const semear: Semear = (tabela, linhas) => {
    // Acumula: o mesmo `semear` é chamado uma vez por competência em várias
    // tabelas da folha (4 competências → 4 chamadas para `folhas_pagamento`).
    const anteriores = tabelas[tabela] ?? [];
    const preenchidas = linhas.map((linha, i) => completar(tabela, linha, anteriores.length + i));
    const todas = [...anteriores, ...preenchidas];
    tabelas[tabela] = todas;
    IDS_SEMEADOS.set(
      tabela,
      todas.map((linha) => String(linha.id)),
    );
    return preenchidas;
  };

  // Colaboradores e locais já vêm prontos do dataset de Tempo & Ausências.
  IDS_SEMEADOS.set(
    'colaboradores',
    (tabelas.colaboradores ?? []).map((linha) => String(linha.id)),
  );
  IDS_SEMEADOS.set(
    'locais_trabalho',
    (tabelas.locais_trabalho ?? []).map((linha) => String(linha.id)),
  );

  semearEstrutura(semear);
  semearFolha(semear);
  semearFolhaExtras(semear);
  semearProvisoes(semear);
  semearParametrosFiscais(semear);
  semearBeneficios(semear);
  semearDescontos(semear);
  semearFinanceiro(semear);
  semearDocumentos(semear);
  semearObrigacoes(semear);
  semearSst(semear);
  semearConveniosESeguros(semear);
  semearOutros(semear);
  semearAvisos(semear);
  semearBrindes(semear);

  // Varredura final: nenhuma tabela coberta fica sem linha.
  for (const tabela of Object.keys(ESQUEMA_TABELAS)) {
    const prefixoProtegido =
      tabela.startsWith('user_') ||
      tabela.startsWith('auth') ||
      tabela.startsWith('pg_') ||
      tabela.startsWith('admin_');
    if (TABELAS_FORA_DO_MOCK.has(tabela) || prefixoProtegido) continue;
    if (tabelas[tabela]?.length) continue;

    const quantidade = PADRAO_TABELA_SINGULAR.test(tabela) || !tabela.endsWith('s') ? 1 : 3;
    const linhas: Row[] = [];
    for (let i = 0; i < quantidade; i += 1) {
      linhas.push(completar(tabela, {}, i));
    }
    tabelas[tabela] = linhas;
  }

  return tabelas;
}
