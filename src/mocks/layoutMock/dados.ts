/**
 * MOCK VISUAL (layout) — dataset fictício de Tempo & Ausências.
 *
 * Linhas no MESMO formato das tabelas reais (colunas de
 * `src/integrations/supabase/types.ts`), distribuídas em torno de "hoje" para
 * que calendários, gráficos de período e contadores de prazo apareçam
 * preenchidos. Nenhuma linha é gravada em lugar nenhum — ver `index.ts`.
 *
 * Os colaboradores vêm de `colaboradoresMock.ts` (mesmos nomes/cargos que o
 * restante das telas já exibe em modo demonstração).
 */
import { MOCK_COLABORADORES, MOCK_EMPRESA } from '../colaboradoresMock';
import { addDaysLocal, formatDateLocalISO } from '@/utils/dateLocal';
import type { Row, Tabelas } from './postgrest';

type Colab = (typeof MOCK_COLABORADORES)[number];

const EMPRESA_ID = MOCK_EMPRESA.id as string;

// ---------------------------------------------------------------------------
// Helpers de data (tudo relativo a "hoje")
// ---------------------------------------------------------------------------

const HOJE = new Date();
const dia = (offset: number): string => formatDateLocalISO(addDaysLocal(HOJE, offset));
const instante = (offset: number, hora: string): string => {
  const [h, m] = hora.split(':');
  return `${dia(offset)}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00-03:00`;
};
const hhmm = (minutos: number): string => {
  const sinal = minutos < 0 ? '-' : '';
  const abs = Math.abs(minutos);
  return `${sinal}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
};
const somaHora = (hora: string, minutos: number): string => {
  const [h, m] = hora.split(':').map(Number);
  const total = h * 60 + m + minutos;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};
const ciclo = <T,>(lista: readonly T[], i: number): T => lista[((i % lista.length) + lista.length) % lista.length];

// ---------------------------------------------------------------------------
// Colaboradores (desligados ficam de fora dos dados de rotina)
// ---------------------------------------------------------------------------

const ativos: Colab[] = MOCK_COLABORADORES.filter((c) => c.status !== 'desligado');
const porId = (id: string): Colab => MOCK_COLABORADORES.find((c) => c.id === id) as Colab;
const nome = (c: Colab): string => c.nome_completo;

// ---------------------------------------------------------------------------
// Horas extras
// ---------------------------------------------------------------------------

const MOTIVOS_HE = [
  'Fechamento mensal de folha',
  'Entrega de campanha sazonal',
  'Inventário de estoque',
  'Atendimento a pico de demanda',
  'Migração de sistema fora do horário',
  'Auditoria externa',
  'Cobertura de colaborador afastado',
  'Evento corporativo',
];
const STATUS_HE = ['pendente', 'aprovada', 'aprovada', 'pendente', 'rejeitada', 'aprovada', 'pendente', 'aprovada'];

function horasExtras(): Row[] {
  return Array.from({ length: 20 }, (_, i) => {
    const c = ciclo(ativos, i * 3 + 1);
    const status = ciclo(STATUS_HE, i);
    const offset = -27 + i * 1.3;
    return {
      id: `mock-he-${i + 1}`,
      empresa_id: EMPRESA_ID,
      colaborador_id: c.id,
      data: dia(Math.round(offset)),
      horas_solicitadas: ciclo([1, 1.5, 2, 2.5, 3, 4, 2, 1], i),
      motivo: ciclo(MOTIVOS_HE, i),
      status,
      aprovado_por: status === 'pendente' ? null : 'mock-13',
      aprovado_em: status === 'pendente' ? null : instante(Math.round(offset) + 1, '10:30'),
      observacoes_aprovador:
        status === 'rejeitada' ? 'Compensar no banco de horas.' : status === 'aprovada' ? 'Aprovado conforme demanda.' : null,
      created_by: c.id,
      created_at: instante(Math.round(offset) - 1, '16:45'),
      updated_at: instante(Math.round(offset), '09:00'),
    };
  });
}

// ---------------------------------------------------------------------------
// Banco de horas — saldo acumulado coerente por colaborador
// ---------------------------------------------------------------------------

const LANCAMENTOS_BH: Array<{ tipo: 'credito' | 'debito'; min: number; motivo: string }> = [
  { tipo: 'credito', min: 120, motivo: 'Hora extra aprovada — fechamento mensal' },
  { tipo: 'credito', min: 90, motivo: 'Trabalho em feriado compensável' },
  { tipo: 'debito', min: 60, motivo: 'Saída antecipada autorizada' },
  { tipo: 'credito', min: 180, motivo: 'Plantão de fim de semana' },
  { tipo: 'debito', min: 240, motivo: 'Folga compensatória' },
  { tipo: 'credito', min: 45, motivo: 'Extensão de jornada — evento' },
  { tipo: 'debito', min: 30, motivo: 'Atraso justificado' },
  { tipo: 'credito', min: 150, motivo: 'Inventário de estoque' },
];

function bancoHoras(): Row[] {
  const linhas: Row[] = [];
  const participantes = ativos.slice(0, 8);
  let seq = 1;
  participantes.forEach((c, ci) => {
    let saldo = ci % 3 === 0 ? 60 : 0;
    for (let k = 0; k < 3; k++) {
      const l = ciclo(LANCAMENTOS_BH, ci * 3 + k);
      const anterior = saldo;
      saldo += l.tipo === 'credito' ? l.min : -l.min;
      linhas.push({
        id: `mock-bh-${seq++}`,
        empresa_id: EMPRESA_ID,
        colaborador_id: c.id,
        data: dia(-52 + ci * 3 + k * 13),
        tipo: l.tipo,
        horas: hhmm(l.min),
        saldo_anterior: hhmm(anterior),
        saldo_atual: hhmm(saldo),
        motivo: l.motivo,
        registro_ponto_id: null,
        created_by: 'mock-13',
        created_at: instante(-52 + ci * 3 + k * 13, '18:00'),
      });
    }
  });
  return linhas;
}

// ---------------------------------------------------------------------------
// Turnos & escalas
// ---------------------------------------------------------------------------

const TURNOS: Row[] = [
  { nome: 'Manhã', horario_inicio: '06:00', horario_fim: '14:00', intervalo_minutos: 30, cor: '#3b82f6', ativo: true },
  { nome: 'Tarde', horario_inicio: '14:00', horario_fim: '22:00', intervalo_minutos: 30, cor: '#f59e0b', ativo: true },
  { nome: 'Noturno', horario_inicio: '22:00', horario_fim: '06:00', intervalo_minutos: 45, cor: '#6366f1', ativo: true },
  { nome: 'Administrativo', horario_inicio: '08:00', horario_fim: '17:00', intervalo_minutos: 60, cor: '#10b981', ativo: true },
  { nome: 'Comercial', horario_inicio: '09:00', horario_fim: '18:00', intervalo_minutos: 60, cor: '#8b5cf6', ativo: true },
  { nome: '12x36 Diurno', horario_inicio: '07:00', horario_fim: '19:00', intervalo_minutos: 60, cor: '#ef4444', ativo: true },
  { nome: 'Plantão Fim de Semana', horario_inicio: '08:00', horario_fim: '14:00', intervalo_minutos: 30, cor: '#64748b', ativo: false },
].map((t, i) => ({
  id: `mock-turno-${i + 1}`,
  empresa_id: EMPRESA_ID,
  created_at: instante(-300, '09:00'),
  updated_at: instante(-30, '09:00'),
  ...t,
}));

const STATUS_ESCALA = ['agendado', 'confirmado', 'agendado', 'confirmado', 'trocado'];

function escalasTrabalho(): Row[] {
  const turnosAtivos = TURNOS.filter((t) => t.ativo);
  const linhas: Row[] = [];
  let seq = 1;
  for (let d = -3; d <= 10; d++) {
    for (let k = 0; k < 3; k++) {
      // k=2: sempre o 1º colaborador — é quem o card "Hoje" do Ponto resolve (vínculo por e-mail).
      const c = k === 2 ? ativos[0] : ciclo(ativos.slice(1), d + 3 + k * 4);
      const t = ciclo(turnosAtivos, d + 5 + k * 2);
      linhas.push({
        id: `mock-escala-t-${seq}`,
        empresa_id: EMPRESA_ID,
        colaborador_id: c.id,
        turno_id: t.id,
        data: dia(d),
        status: d < 0 ? 'concluido' : ciclo(STATUS_ESCALA, seq),
        observacoes: null,
        created_by: 'mock-13',
        created_at: instante(-5, '11:00'),
        updated_at: instante(-1, '11:00'),
      });
      seq++;
    }
  }
  return linhas;
}

const ESCALAS: Row[] = [
  { nome: 'Administrativa 5x2', tipo: '5x2', dias_trabalho: 5, dias_folga: 2, horario_entrada: '08:00', horario_saida: '17:00', intervalo_minutos: 60, ativo: true },
  { nome: 'Comercial 6x1', tipo: '6x1', dias_trabalho: 6, dias_folga: 1, horario_entrada: '09:00', horario_saida: '17:20', intervalo_minutos: 60, ativo: true },
  { nome: 'Logística 12x36', tipo: '12x36', dias_trabalho: 1, dias_folga: 1, horario_entrada: '07:00', horario_saida: '19:00', intervalo_minutos: 60, ativo: true },
  { nome: 'Produção 4x2', tipo: '4x2', dias_trabalho: 4, dias_folga: 2, horario_entrada: '06:00', horario_saida: '14:20', intervalo_minutos: 30, ativo: true },
  { nome: 'Suporte Personalizada', tipo: 'personalizada', dias_trabalho: 5, dias_folga: 2, horario_entrada: '10:00', horario_saida: '19:00', intervalo_minutos: 60, ativo: true },
  { nome: 'Escala de Verão (encerrada)', tipo: '5x2', dias_trabalho: 5, dias_folga: 2, horario_entrada: '07:00', horario_saida: '16:00', intervalo_minutos: 60, ativo: false },
].map((e, i) => ({
  id: `mock-escala-${i + 1}`,
  empresa_id: EMPRESA_ID,
  created_at: instante(-200, '09:00'),
  updated_at: instante(-20, '09:00'),
  ...e,
}));

// ---------------------------------------------------------------------------
// Férias
// ---------------------------------------------------------------------------

/** Um período aquisitivo vigente (e um vencendo) por colaborador ativo. */
function periodosAquisitivos(): Row[] {
  const linhas: Row[] = [];
  ativos.forEach((c, i) => {
    const admissao = new Date(`${c.data_admissao}T12:00:00`);
    const anos = Math.max(1, Math.floor((HOJE.getTime() - admissao.getTime()) / (365.25 * 86400000)));
    for (let n = Math.max(1, anos - 1); n <= anos; n++) {
      const inicio = new Date(admissao);
      inicio.setFullYear(admissao.getFullYear() + n - 1);
      const fim = new Date(inicio);
      fim.setFullYear(inicio.getFullYear() + 1);
      fim.setDate(fim.getDate() - 1);
      const limite = new Date(fim);
      limite.setFullYear(limite.getFullYear() + 1);
      limite.setMonth(limite.getMonth() - 1);
      const vigente = n === anos;
      const vencendo = !vigente && i % 4 === 0;
      linhas.push({
        id: `mock-pa-${c.id}-${n}`,
        colaborador_id: c.id,
        numero_periodo: n,
        data_inicio: formatDateLocalISO(inicio),
        data_fim: formatDateLocalISO(fim),
        data_limite_concessao: vencendo ? dia(25 + i * 3) : formatDateLocalISO(limite),
        dias_direito: 30,
        dias_descontados: i % 5 === 0 ? 5 : 0,
        faltas_periodo: i % 5 === 0 ? 7 : i % 3,
        status: vigente ? 'aberto' : vencendo ? 'vencendo' : 'utilizado',
        em_dobra: false,
        perdeu_direito: false,
        motivo_perda: null,
        created_at: instante(-365, '08:00'),
      });
    }
  });
  return linhas;
}

type StatusFerias = 'pendente' | 'aprovada' | 'rejeitada' | 'em_gozo' | 'concluida' | 'cancelada';
const PLANO_FERIAS: Array<{ status: StatusFerias; inicio: number; dias: number; abono?: boolean; d13?: boolean }> = [
  { status: 'em_gozo', inicio: -6, dias: 20 },
  { status: 'em_gozo', inicio: -2, dias: 15, abono: true },
  { status: 'pendente', inicio: 35, dias: 30 },
  { status: 'pendente', inicio: 48, dias: 14, d13: true },
  { status: 'pendente', inicio: 62, dias: 20, abono: true },
  { status: 'aprovada', inicio: 2, dias: 15 },
  { status: 'aprovada', inicio: 4, dias: 10 },
  { status: 'aprovada', inicio: 6, dias: 15 },
  { status: 'aprovada', inicio: 14, dias: 20, d13: true },
  { status: 'aprovada', inicio: 28, dias: 10 },
  { status: 'aprovada', inicio: 75, dias: 30 },
  { status: 'concluida', inicio: -80, dias: 30 },
  { status: 'concluida', inicio: -120, dias: 20, abono: true },
  { status: 'concluida', inicio: -160, dias: 15 },
  { status: 'concluida', inicio: -200, dias: 30, d13: true },
  { status: 'rejeitada', inicio: 20, dias: 30 },
  { status: 'cancelada', inicio: 90, dias: 14 },
  { status: 'pendente', inicio: 95, dias: 30 },
  { status: 'aprovada', inicio: 110, dias: 20 },
  { status: 'concluida', inicio: -240, dias: 30 },
];

function ferias(periodos: Row[]): Row[] {
  return PLANO_FERIAS.map((p, i) => {
    const c = ciclo(ativos, i * 2 + 1);
    const periodo = periodos.filter((x) => x.colaborador_id === c.id).at(-1) as Row;
    const inicio = dia(p.inicio);
    const fim = dia(p.inicio + p.dias - 1);
    const salario = Number(c.salario_base);
    const valorFerias = (salario / 30) * p.dias;
    const terco = valorFerias / 3;
    const abono = p.abono ? (salario / 30) * 10 : 0;
    const bruto = valorFerias + terco + abono * (4 / 3);
    const inss = Math.min(bruto * 0.11, 908.85);
    const irrf = Math.max(0, (bruto - inss - 2259.2) * 0.15);
    const decididas: StatusFerias[] = ['aprovada', 'em_gozo', 'concluida'];
    const aprovada = decididas.includes(p.status);
    return {
      id: `mock-ferias-${i + 1}`,
      empresa_id: EMPRESA_ID,
      colaborador_id: c.id,
      colaborador_nome: nome(c),
      periodo_aquisitivo_id: periodo.id,
      periodo_aquisitivo_inicio: periodo.data_inicio,
      periodo_aquisitivo_fim: periodo.data_fim,
      data_inicio: inicio,
      data_fim: fim,
      dias_gozo: p.dias,
      dias_ferias: p.dias,
      dias_abono: p.abono ? 10 : 0,
      abono_pecuniario: !!p.abono,
      vender_abono: !!p.abono,
      adiantamento_13: !!p.d13,
      adiantamento_13o: !!p.d13,
      salario_base: salario,
      valor_ferias: Number(valorFerias.toFixed(2)),
      valor_terco: Number(terco.toFixed(2)),
      valor_abono: Number(abono.toFixed(2)),
      valor_abono_pecuniario: Number(abono.toFixed(2)),
      valor_adiantamento_13: p.d13 ? Number((salario / 2).toFixed(2)) : 0,
      valor_total: Number(bruto.toFixed(2)),
      valor_liquido: Number((bruto - inss - irrf).toFixed(2)),
      descontos_inss: Number(inss.toFixed(2)),
      descontos_irrf: Number(irrf.toFixed(2)),
      status: p.status,
      cancelado: p.status === 'cancelada',
      aprovado_gestor: aprovada || p.status === 'rejeitada' ? p.status !== 'rejeitada' : i % 2 === 0,
      aprovado_gestor_em: aprovada ? instante(p.inicio - 20, '14:10') : null,
      aprovado_gestor_por: aprovada ? 'mock-12' : null,
      aprovado_rh: aprovada,
      aprovado_rh_em: aprovada ? instante(p.inicio - 18, '09:40') : null,
      aprovado_rh_por: aprovada ? 'mock-13' : null,
      status_aprovacao_gestor: aprovada ? 'aprovado' : p.status === 'rejeitada' ? 'rejeitado' : 'pendente',
      status_aprovacao_rh: aprovada ? 'aprovado' : 'pendente',
      enviado_contabilidade: p.status === 'em_gozo' || p.status === 'concluida',
      enviado_contabilidade_em: p.status === 'em_gozo' || p.status === 'concluida' ? instante(p.inicio - 12, '11:00') : null,
      data_pagamento: dia(p.inicio - 2),
      pagamento_valor: Number((bruto - inss - irrf).toFixed(2)),
      // A 2ª férias em gozo fica SEM confirmação de pagamento: alimenta o alerta Art. 145 (violação).
      pagamento_confirmado: p.status === 'concluida' || (p.status === 'em_gozo' && i !== 1),
      pagamento_confirmado_em: p.status === 'concluida' || (p.status === 'em_gozo' && i !== 1) ? instante(p.inicio - 2, '10:00') : null,
      motivo_cancelamento: p.status === 'cancelada' ? 'Alteração de calendário a pedido do gestor.' : null,
      justificativa: p.status === 'rejeitada' ? 'Período de fechamento — reagendar para o mês seguinte.' : null,
      observacoes: null,
      aviso_gerado_em: aprovada ? instante(p.inicio - 17, '09:00') : null,
      aviso_assinatura_em: p.status === 'em_gozo' || p.status === 'concluida' ? instante(p.inicio - 16, '15:00') : null,
      created_by: c.id,
      created_at: instante(p.inicio - 30, '09:00'),
      updated_at: instante(p.inicio - 10, '09:00'),
    };
  });
}

function aprovacoesLog(listaFerias: Row[]): Row[] {
  const linhas: Row[] = [];
  listaFerias.forEach((f, i) => {
    const inicio = new Date(`${f.data_inicio}T12:00:00`).getTime();
    const base = Math.round((inicio - HOJE.getTime()) / 86400000);
    linhas.push({ id: `mock-fl-${i}-1`, ferias_id: f.id, nivel: 'solicitacao', status: 'pendente', aprovador_id: f.colaborador_id, observacao: 'Solicitação registrada.', created_at: instante(base - 30, '09:00') });
    if (f.aprovado_gestor) linhas.push({ id: `mock-fl-${i}-2`, ferias_id: f.id, nivel: 'gestor', status: 'aprovado', aprovador_id: 'mock-12', observacao: 'De acordo com a escala da equipe.', created_at: instante(base - 20, '14:10') });
    if (f.aprovado_rh) linhas.push({ id: `mock-fl-${i}-3`, ferias_id: f.id, nivel: 'rh', status: 'aprovado', aprovador_id: 'mock-13', observacao: 'Saldo e período conferidos.', created_at: instante(base - 18, '09:40') });
  });
  return linhas;
}

/** View `v_ferias_alerta_pagamento_d2` (CLT Art. 145): pagamento pendente por severidade. */
function alertasPagamento(listaFerias: Row[]): Row[] {
  return listaFerias
    .filter((f) => !f.pagamento_confirmado && (f.status === 'aprovada' || f.status === 'em_gozo'))
    .map((f) => {
      const dias = Math.round((new Date(`${f.data_inicio}T12:00:00`).getTime() - HOJE.getTime()) / 86400000);
      const severidade = dias <= 0 ? 'violacao_grave' : dias <= 2 ? 'critico' : dias <= 5 ? 'atencao' : 'ok';
      return {
        id: f.id,
        empresa_id: f.empresa_id,
        colaborador_id: f.colaborador_id,
        colaborador_nome: f.colaborador_nome,
        data_inicio: f.data_inicio,
        data_pagamento: f.data_pagamento,
        pagamento_confirmado_em: null,
        status: f.status,
        dias_ate_inicio: dias,
        severidade,
      };
    });
}

/** View `v_ferias_folha_reconciliacao`: férias decididas × rubricas lançadas na folha. */
function reconciliacaoFolha(listaFerias: Row[]): Row[] {
  const situacoes = ['divergente', 'pendente_envio', 'ok', 'divergente', 'pendente_envio'];
  return listaFerias
    .filter((f) => ['aprovada', 'em_gozo', 'concluida'].includes(String(f.status)))
    .map((f, i) => {
      const situacao = ciclo(situacoes, i);
      const esperadas = f.abono_pecuniario ? 5 : 3;
      return {
        ferias_id: f.id,
        empresa_id: f.empresa_id,
        colaborador_id: f.colaborador_id,
        colaborador_nome: f.colaborador_nome,
        data_inicio: f.data_inicio,
        data_fim: f.data_fim,
        status: f.status,
        enviado_contabilidade: f.enviado_contabilidade,
        competencia: `${String(f.data_inicio).slice(0, 7)}-01`,
        rubricas_esperadas: esperadas,
        rubricas_geradas: situacao === 'ok' ? esperadas : situacao === 'divergente' ? esperadas - 1 : 0,
        situacao,
      };
    });
}

const RECONCILIACAO_LOGS: Row[] = Array.from({ length: 6 }, (_, i) => ({
  id: `mock-frl-${i + 1}`,
  executado_em: instante(-i, '03:00'),
  verificadas: 40 + i * 3,
  corrigidas: i % 3,
  restantes: i === 0 ? 4 : 2 + (i % 3),
  duracao_ms: 820 + i * 95,
}));

const FERIAS_COLETIVAS: Row[] = [
  { data_inicio: dia(-70), dias: 10, status: 'concluida', departamentos: ['Administrativo', 'Financeiro'], justificativa: 'Recesso de meio de ano.' },
  { data_inicio: dia(70), dias: 14, status: 'aprovada', departamentos: ['Comercial', 'Marketing'], justificativa: 'Baixa sazonal de demanda.' },
  { data_inicio: dia(78), dias: 12, status: 'planejada', departamentos: ['Tecnologia'], justificativa: 'Janela de manutenção anual da infraestrutura.' },
].map((c, i) => ({
  id: `mock-fc-${i + 1}`,
  empresa_id: EMPRESA_ID,
  ...c,
  data_fim: formatDateLocalISO(addDaysLocal(new Date(`${c.data_inicio}T12:00:00`), (c.dias as number) - 1)),
  aprovado_por: 'mock-13',
  comunicado_gerado_em: i < 2 ? instante(-20, '10:00') : null,
  created_by: 'mock-13',
  created_at: instante(-90, '09:00'),
  updated_at: instante(-10, '09:00'),
}));

const PROGRAMACAO_STATUS = ['sugerido_gestor', 'aprovado_gestor', 'aprovado_rh', 'rascunho', 'convertido', 'sugerido_gestor', 'rejeitado', 'aprovado_rh'];

function feriasProgramacao(periodos: Row[]): Row[] {
  const ano = HOJE.getFullYear();
  return Array.from({ length: 16 }, (_, i) => {
    const c = ciclo(ativos, i);
    const mes = ((i * 5 + 1) % 12) + 1;
    const status = ciclo(PROGRAMACAO_STATUS, i);
    const dias = ciclo([30, 15, 20, 10, 14], i);
    const inicio = new Date(ano, mes - 1, 5 + (i % 10));
    const fim = addDaysLocal(inicio, dias - 1);
    return {
      id: `mock-prog-${i + 1}`,
      empresa_id: EMPRESA_ID,
      colaborador_id: c.id,
      periodo_aquisitivo_id: (periodos.filter((p) => p.colaborador_id === c.id).at(-1) as Row)?.id ?? null,
      ano,
      mes_previsto: mes,
      dias_previstos: dias,
      data_inicio_prevista: formatDateLocalISO(inicio),
      data_fim_prevista: formatDateLocalISO(fim),
      status,
      observacoes: i % 4 === 0 ? 'Alinhado com o gestor em reunião de planejamento.' : null,
      aprovado_gestor_por: ['aprovado_gestor', 'aprovado_rh', 'convertido'].includes(status) ? 'mock-12' : null,
      aprovado_gestor_em: ['aprovado_gestor', 'aprovado_rh', 'convertido'].includes(status) ? instante(-15, '10:00') : null,
      aprovado_rh_por: ['aprovado_rh', 'convertido'].includes(status) ? 'mock-13' : null,
      aprovado_rh_em: ['aprovado_rh', 'convertido'].includes(status) ? instante(-10, '10:00') : null,
      rejeitado_por: status === 'rejeitado' ? 'mock-13' : null,
      rejeitado_em: status === 'rejeitado' ? instante(-8, '10:00') : null,
      rejeitado_motivo: status === 'rejeitado' ? 'Conflito com fechamento trimestral.' : null,
      ferias_id: status === 'convertido' ? 'mock-ferias-6' : null,
      created_at: instante(-40, '09:00'),
      updated_at: instante(-5, '09:00'),
    };
  });
}

// ---------------------------------------------------------------------------
// Afastamentos
// ---------------------------------------------------------------------------

type TipoAf = 'doenca' | 'acidente_trabalho' | 'acidente_trajeto' | 'licenca_maternidade' | 'licenca_paternidade' | 'licenca_casamento' | 'licenca_obito' | 'licenca_nao_remunerada' | 'servico_militar' | 'mandato_sindical' | 'suspensao_disciplinar' | 'outros';
const PLANO_AFAST: Array<{ tipo: TipoAf; status: string; inicio: number; dias: number; cid?: [string, string] }> = [
  { tipo: 'doenca', status: 'ativo', inicio: -4, dias: 12, cid: ['J11', 'Influenza (gripe)'] },
  { tipo: 'doenca', status: 'ativo', inicio: -18, dias: 30, cid: ['M54.5', 'Dor lombar baixa'] },
  { tipo: 'acidente_trabalho', status: 'ativo', inicio: -25, dias: 45, cid: ['S62.0', 'Fratura do osso escafoide'] },
  { tipo: 'licenca_maternidade', status: 'ativo', inicio: -40, dias: 120 },
  { tipo: 'licenca_paternidade', status: 'finalizado', inicio: -30, dias: 20 },
  { tipo: 'doenca', status: 'finalizado', inicio: -90, dias: 8, cid: ['A09', 'Gastroenterite infecciosa'] },
  { tipo: 'doenca', status: 'finalizado', inicio: -140, dias: 15, cid: ['F41.1', 'Ansiedade generalizada'] },
  { tipo: 'licenca_casamento', status: 'finalizado', inicio: -60, dias: 3 },
  { tipo: 'licenca_obito', status: 'finalizado', inicio: -75, dias: 2 },
  { tipo: 'acidente_trajeto', status: 'aprovado', inicio: -50, dias: 20, cid: ['V43', 'Ocupante de automóvel ferido em colisão'] },
  { tipo: 'doenca', status: 'aprovado', inicio: -35, dias: 25, cid: ['M75.1', 'Síndrome do manguito rotador'] },
  { tipo: 'licenca_nao_remunerada', status: 'ativo', inicio: -10, dias: 60 },
  { tipo: 'suspensao_disciplinar', status: 'finalizado', inicio: -100, dias: 3 },
  { tipo: 'doenca', status: 'pendente', inicio: 2, dias: 5, cid: ['J03.9', 'Amigdalite aguda'] },
  { tipo: 'doenca', status: 'pendente', inicio: 6, dias: 10, cid: ['K29.7', 'Gastrite não especificada'] },
  { tipo: 'servico_militar', status: 'finalizado', inicio: -220, dias: 30 },
  { tipo: 'mandato_sindical', status: 'ativo', inicio: -150, dias: 365 },
  { tipo: 'doenca', status: 'rejeitado', inicio: -12, dias: 7, cid: ['J00', 'Resfriado comum'] },
  { tipo: 'doenca', status: 'finalizado', inicio: -170, dias: 10, cid: ['N39.0', 'Infecção do trato urinário'] },
  { tipo: 'outros', status: 'finalizado', inicio: -190, dias: 4 },
];

function afastamentos(): Row[] {
  return PLANO_AFAST.map((p, i) => {
    const c = ciclo(ativos, i * 2 + 2);
    const fimPrevisto = dia(p.inicio + p.dias - 1);
    const acimaDe15 = p.dias > 15;
    return {
      id: `mock-af-${i + 1}`,
      empresa_id: EMPRESA_ID,
      colaborador_id: c.id,
      tipo: p.tipo,
      status: p.status,
      data_inicio: dia(p.inicio),
      data_fim_prevista: fimPrevisto,
      data_fim_real: p.status === 'finalizado' ? fimPrevisto : null,
      dias_total: p.dias,
      dias_empresa: Math.min(p.dias, 15),
      dias_inss: acimaDe15 ? p.dias - 15 : 0,
      cid: p.cid?.[0] ?? null,
      cid_descricao: p.cid?.[1] ?? null,
      cid_id: null,
      atestado_numero: p.cid ? `AT-${2026000 + i * 17}` : null,
      medico_nome: p.cid ? ciclo(['Dra. Helena Marques', 'Dr. Ricardo Tavares', 'Dra. Paula Nogueira'], i) : null,
      nome_medico: p.cid ? ciclo(['Dra. Helena Marques', 'Dr. Ricardo Tavares', 'Dra. Paula Nogueira'], i) : null,
      medico_crm: p.cid ? `CRM/SP ${120000 + i * 731}` : null,
      crm_medico: p.cid ? `CRM/SP ${120000 + i * 731}` : null,
      numero_beneficio: acimaDe15 ? `B31/${600000000 + i * 913}` : null,
      data_pericia: acimaDe15 ? dia(p.inicio + 16) : null,
      local_pericia: acimaDe15 ? 'Agência INSS — Centro' : null,
      observacoes: null,
      aprovado_por: p.status === 'pendente' ? null : 'mock-13',
      aprovado_em: p.status === 'pendente' ? null : instante(p.inicio + 1, '11:00'),
      rejeitado_por: null,
      rejeitado_em: null,
      motivo_rejeicao: null,
      hash_integridade: null,
      created_by: 'mock-13',
      created_at: instante(p.inicio, '08:30'),
      updated_at: instante(p.inicio + 1, '08:30'),
    };
  });
}

function prorrogacoes(lista: Row[]): Row[] {
  return lista
    .filter((a) => a.status === 'aprovado' || a.id === 'mock-af-2' || a.id === 'mock-af-3')
    .map((a, i) => ({
      id: `mock-prorr-${i + 1}`,
      afastamento_id: a.id,
      data_fim_anterior: a.data_fim_prevista,
      data_fim_antiga: a.data_fim_prevista, // nome que a tela de Prorrogações lê
      data_fim_nova: formatDateLocalISO(addDaysLocal(new Date(`${a.data_fim_prevista}T12:00:00`), 15 + i * 5)),
      dias_adicionais: 15 + i * 5,
      motivo: ciclo(['Persistência dos sintomas — novo atestado.', 'Indicação de fisioterapia.', 'Perícia concedeu prorrogação.'], i),
      numero_beneficio_novo: `B31/${700000000 + i * 311}`,
      data_pericia: dia(-2 + i * 3),
      created_by: 'mock-13',
      created_at: instante(-3 - i, '10:00'),
    }));
}

function documentosAfastamento(lista: Row[]): Row[] {
  return lista
    .filter((a) => a.atestado_numero)
    .slice(0, 8)
    .map((a, i) => ({
      id: `mock-docaf-${i + 1}`,
      afastamento_id: a.id,
      tipo: ciclo(['atestado', 'laudo', 'comprovante_inss'], i),
      nome_arquivo: `${ciclo(['atestado', 'laudo-medico', 'comprovante-inss'], i)}-${i + 1}.pdf`,
      url: `https://example.invalid/mock/${i + 1}.pdf`,
      metadados: {},
      validado: i % 3 !== 2,
      validado_por: i % 3 !== 2 ? 'mock-13' : null,
      validado_em: i % 3 !== 2 ? instante(-2, '15:00') : null,
      created_by: 'mock-13',
      created_at: instante(-5 - i, '09:00'),
    }));
}

const CONFIG_AFASTAMENTOS: Row[] = [
  ['doenca', 'Doença / atestado médico', 1, null, 15, true, true, true],
  ['acidente_trabalho', 'Acidente de trabalho (CAT)', 1, null, 15, true, true, true],
  ['acidente_trajeto', 'Acidente de trajeto', 1, null, 15, true, true, true],
  ['licenca_maternidade', 'Licença-maternidade', 120, 180, 120, false, false, true],
  ['licenca_paternidade', 'Licença-paternidade', 5, 20, 20, false, true, false],
  ['licenca_casamento', 'Licença-casamento (gala)', 3, 3, 3, false, true, false],
  ['licenca_obito', 'Licença-nojo (óbito)', 2, 2, 2, false, true, false],
  ['licenca_nao_remunerada', 'Licença não remunerada', 1, 90, 0, false, false, false],
  ['servico_militar', 'Serviço militar', 1, null, 0, false, false, false],
  ['mandato_sindical', 'Mandato sindical', 1, null, 0, false, false, false],
  ['suspensao_disciplinar', 'Suspensão disciplinar', 1, 30, 0, false, false, false],
  ['outros', 'Outros', 1, null, 0, false, false, false],
].map(([tipo, descricao, min, max, empresaMax, exigeCid, pagoEmpresa, pagoInss], i) => ({
  id: `mock-cfgaf-${i + 1}`,
  tipo,
  descricao,
  dias_minimos: min,
  dias_maximos: max,
  dias_empresa_maximo: empresaMax,
  exige_cid: exigeCid,
  pago_empresa: pagoEmpresa,
  pago_inss: pagoInss,
  created_at: instante(-400, '09:00'),
}));

// ---------------------------------------------------------------------------
// Feriados (calendário completo do ano corrente)
// ---------------------------------------------------------------------------

function feriados(): Row[] {
  const ano = HOJE.getFullYear();
  const f = (mes: number, d: number, descricao: string, tipo: string, extras: Row = {}): Row => ({
    data: `${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    descricao,
    tipo,
    ...extras,
  });
  const lista: Row[] = [
    f(1, 1, 'Confraternização Universal', 'nacional'),
    f(2, 16, 'Carnaval (segunda-feira)', 'nacional'),
    f(2, 17, 'Carnaval (terça-feira)', 'nacional'),
    f(4, 3, 'Sexta-feira Santa', 'nacional'),
    f(4, 21, 'Tiradentes', 'nacional'),
    f(5, 1, 'Dia do Trabalho', 'nacional'),
    f(6, 4, 'Corpus Christi', 'nacional'),
    f(7, 9, 'Revolução Constitucionalista', 'estadual', { uf: 'SP' }),
    f(9, 7, 'Independência do Brasil', 'nacional'),
    f(10, 12, 'Nossa Senhora Aparecida', 'nacional'),
    f(11, 2, 'Finados', 'nacional'),
    f(11, 15, 'Proclamação da República', 'nacional'),
    f(11, 20, 'Dia da Consciência Negra', 'nacional'),
    f(12, 25, 'Natal', 'nacional'),
    f(1, 25, 'Aniversário da Cidade de São Paulo', 'municipal', { cidade: 'São Paulo', uf: 'SP' }),
    f(3, 19, 'Dia de São José (padroeiro)', 'municipal', { cidade: 'Curitiba', uf: 'PR' }),
    f(8, 15, 'Assunção de Nossa Senhora', 'municipal', { cidade: 'Belo Horizonte', uf: 'MG' }),
    f(6, 26, 'Aniversário da Empresa', 'empresa'),
    f(12, 24, 'Recesso de fim de ano (meio período)', 'empresa'),
    f(12, 31, 'Recesso de fim de ano (meio período)', 'empresa'),
  ];
  return lista.map((l, i) => ({
    id: `mock-fer-${i + 1}`,
    empresa_id: l.tipo === 'empresa' ? EMPRESA_ID : null,
    cidade: null,
    uf: null,
    created_at: instante(-200, '09:00'),
    ...l,
  }));
}

// ---------------------------------------------------------------------------
// Controle de acesso
// ---------------------------------------------------------------------------

const METODOS = ['biometria', 'cracha', 'qrcode', 'biometria', 'nfc', 'manual', 'cracha'];
const LOCAIS: Array<[string, string]> = [
  ['Sede São Paulo', 'Portaria Principal'],
  ['Sede São Paulo', 'Recepção'],
  ['Filial Campinas', 'Entrada Lateral'],
  ['Centro de Distribuição', 'Doca 2'],
  ['Sede São Paulo', 'Garagem'],
  ['Filial Curitiba', 'Portaria'],
];

function controleAcesso(): Row[] {
  const linhas: Row[] = [];
  let seq = 1;
  for (let d = -4; d <= 0; d++) {
    ativos.slice(0, 9).forEach((c, ci) => {
      const [local, area] = ciclo(LOCAIS, ci + d);
      const entrada = `${String(7 + (ci % 3)).padStart(2, '0')}:${String((ci * 7 + 12) % 60).padStart(2, '0')}`;
      const common = { empresa_id: EMPRESA_ID, colaborador_id: c.id, local, area, metodo: ciclo(METODOS, ci + d + 4), dispositivo: `LEITOR-${100 + (ci % 4)}`, ip_address: `10.0.${ci % 4}.${20 + ci}`, latitude: null, longitude: null };
      linhas.push({ id: `mock-ac-${seq++}`, tipo: 'entrada', created_at: instante(d, entrada), updated_at: instante(d, entrada), ...common });
      if (d < 0 || ci % 2 === 0) {
        const saida = somaHora(entrada, 9 * 60 + (ci % 4) * 5);
        linhas.push({ id: `mock-ac-${seq++}`, tipo: 'saida', created_at: instante(d, saida.slice(0, 5)), updated_at: instante(d, saida.slice(0, 5)), ...common });
      }
    });
  }
  return linhas;
}

// ---------------------------------------------------------------------------
// Ponto
// ---------------------------------------------------------------------------

const LOCAIS_TRABALHO: Row[] = [
  { nome: 'Sede São Paulo', cidade: 'São Paulo', uf: 'SP', latitude: -23.5614, longitude: -46.6559, raio_metros: 200 },
  { nome: 'Filial Campinas', cidade: 'Campinas', uf: 'SP', latitude: -22.9056, longitude: -47.0608, raio_metros: 150 },
  { nome: 'Filial Curitiba', cidade: 'Curitiba', uf: 'PR', latitude: -25.4284, longitude: -49.2733, raio_metros: 150 },
].map((l, i) => ({ id: `mock-local-mock-${i + 1}`, empresa_id: EMPRESA_ID, ativo: true, endereco: null, created_at: instante(-500, '09:00'), ...l }));

interface DiaPonto {
  c: Colab;
  data: string;
  ordem: number;
  e1: string;
  s1: string;
  e2: string;
  s2: string | null;
  atraso: number;
  extra: number;
  tipoDia: string;
}

function diasUteis(qtd: number): number[] {
  const offsets: number[] = [];
  for (let d = 0; offsets.length < qtd; d--) {
    const dow = addDaysLocal(HOJE, d).getDay();
    if (dow !== 0 && dow !== 6) offsets.push(d);
  }
  return offsets;
}

function baseDiasPonto(): DiaPonto[] {
  const lista: DiaPonto[] = [];
  const offsets = diasUteis(10);
  ativos.forEach((c, ci) => {
    offsets.forEach((off, oi) => {
      if (c.status !== 'ativo' && off > -3) return; // quem está de férias/afastado não bate ponto hoje
      const atraso = (ci + oi) % 7 === 0 ? 12 + ((ci * 5) % 20) : 0;
      const extra = (ci + oi) % 5 === 0 ? 45 + (ci % 3) * 30 : 0;
      const e1 = somaHora('08:00', Math.max(0, atraso + ((ci * 3 + oi) % 6) - 3));
      lista.push({
        c,
        data: dia(off),
        ordem: oi,
        e1,
        s1: '12:00',
        e2: '13:00',
        s2: off === 0 ? null : somaHora('17:00', extra + ((ci + oi) % 4) * 2),
        atraso,
        extra,
        tipoDia: 'normal',
      });
    });
  });
  return lista;
}

function registrosPonto(base: DiaPonto[]): Row[] {
  return base.map((r, i) => {
    const horasMin = r.s2 ? (Number(r.s2.slice(0, 2)) * 60 + Number(r.s2.slice(3)) - (Number(r.e1.slice(0, 2)) * 60 + Number(r.e1.slice(3)))) - 60 : null;
    return {
      id: `mock-rp-${i + 1}`,
      empresa_id: EMPRESA_ID,
      colaborador_id: r.c.id,
      data: r.data,
      entrada_1: r.e1,
      saida_1: r.s1,
      entrada_2: r.e2,
      saida_2: r.s2,
      saida_intervalo: r.s1,
      retorno_intervalo: r.e2,
      entrada_esperada: '08:00',
      saida_esperada: '17:00',
      total_batidas: r.s2 ? 4 : 3,
      horas_trabalhadas: horasMin != null ? hhmm(horasMin) : null,
      horas_extras: r.extra ? hhmm(r.extra) : '00:00',
      horas_falta: '00:00',
      atraso_minutos: r.atraso,
      saida_antecipada_minutos: 0,
      tipo_dia: r.tipoDia,
      aprovado: r.data !== dia(0),
      aprovado_por: r.data !== dia(0) ? 'mock-13' : null,
      aprovado_em: r.data !== dia(0) ? instante(1, '08:00') : null,
      justificativa: r.atraso > 25 ? 'Trânsito intenso na região.' : null,
      observacoes: null,
      is_offline: false,
      timezone: 'America/Sao_Paulo',
      version: 1,
      created_at: `${r.data}T${r.e1}:00-03:00`,
      updated_at: `${r.data}T${r.s2 ?? r.e2}:00-03:00`,
    };
  });
}

function batidasPonto(base: DiaPonto[]): Row[] {
  const linhas: Row[] = [];
  let seq = 1;
  // Só os últimos 3 dias úteis: o suficiente para listas, mapa e analytics.
  base
    .filter((r) => r.ordem < 3)
    .forEach((r) => {
      const horas: Array<[string, string]> = [
        ['entrada', r.e1],
        ['saida_almoco', r.s1],
        ['retorno_almoco', r.e2],
      ];
      if (r.s2) horas.push(['saida', r.s2]);
      const local = LOCAIS_TRABALHO[Number(String(r.c.local_trabalho_id).split('-').pop()) - 1] ?? LOCAIS_TRABALHO[0];
      horas.forEach(([tipo, hora], ordem) => {
        linhas.push({
          id: `mock-bp-${seq++}`,
          empresa_id: EMPRESA_ID,
          colaborador_id: r.c.id,
          data: r.data,
          hora,
          tipo,
          ordem: ordem + 1,
          origem: ciclo(['app', 'web', 'relogio'], seq),
          latitude: Number(local.latitude) + (seq % 5) * 0.0002,
          longitude: Number(local.longitude) - (seq % 4) * 0.0002,
          precisao_metros: 8 + (seq % 15),
          dentro_raio: seq % 17 !== 0,
          distancia_local_metros: 12 + (seq % 40),
          biometria_status: seq % 6 === 0 ? 'pendente' : 'validada',
          biometria_score: 0.9 + (seq % 9) / 100,
          anomalia_detectada: seq % 23 === 0,
          justificativa_anomalia: seq % 23 === 0 ? 'Localização fora do raio cadastrado.' : null,
          ajustado: false,
          ajustado_por: null,
          motivo_ajuste: null,
          dispositivo_id: `DEV-${100 + (seq % 5)}`,
          hash_comprovante: `HC${String(seq).padStart(8, '0')}`,
          is_offline: false,
          offline: false,
          created_at: `${r.data}T${hora}:00-03:00`,
          updated_at: `${r.data}T${hora}:00-03:00`,
        });
      });
    });
  return linhas;
}

const MOTIVOS_AJUSTE = [
  'Esqueci de registrar a saída do almoço.',
  'Relógio de ponto fora do ar na entrada.',
  'Atendimento externo a cliente — sem acesso ao app.',
  'Falha de GPS no celular corporativo.',
  'Consulta médica durante o expediente.',
];

function solicitacoesAjuste(): Row[] {
  const status = ['pendente', 'pendente', 'aprovado', 'rejeitado', 'aprovado', 'pendente', 'aprovado', 'pendente'];
  return Array.from({ length: 12 }, (_, i) => {
    const c = ciclo(ativos, i * 2);
    const st = ciclo(status, i);
    const off = -1 - i;
    return {
      id: `mock-saj-${i + 1}`,
      empresa_id: EMPRESA_ID,
      colaborador_id: c.id,
      data_ponto: dia(off),
      tipo_ponto: ciclo(['entrada', 'saida_almoco', 'retorno_almoco', 'saida'], i),
      hora_original: i % 3 === 0 ? null : '08:20',
      hora_sugerida: ciclo(['08:00', '12:00', '13:00', '17:00'], i),
      motivo: ciclo(MOTIVOS_AJUSTE, i),
      status: st,
      rascunho: false,
      analisado_por: st === 'pendente' ? null : 'mock-13',
      aprovado_por: st === 'aprovado' ? 'mock-13' : null,
      data_analise: st === 'pendente' ? null : instante(off + 1, '09:30'),
      observacoes_gestor: st === 'rejeitado' ? 'Sem comprovação anexada.' : st === 'aprovado' ? 'Conferido com a chefia imediata.' : null,
      relatorio_conformidade: null,
      created_at: instante(off, '18:20'),
      updated_at: instante(off + 1, '09:30'),
    };
  });
}

const CONFIGURACOES_PONTO: Row[] = [
  {
    id: 'mock-cfgp-1',
    empresa_id: EMPRESA_ID,
    tolerancia_minutos: 10,
    intervalo_minimo_minutos: 60,
    raio_maximo_metros: 200,
    exige_geolocalizacao: true,
    exige_reconhecimento_facial: true,
    permite_ponto_offline: true,
    created_at: instante(-400, '09:00'),
    updated_at: instante(-60, '09:00'),
  },
];

function trilhaAuditoriaPonto(): Row[] {
  const acoes = ['INSERT', 'UPDATE', 'APROVACAO', 'AJUSTE', 'INSERT', 'EXPORT_AEJ'];
  return Array.from({ length: 14 }, (_, i) => ({
    id: `mock-tap-${i + 1}`,
    ponto_id: `mock-rp-${i + 1}`,
    usuario_id: ciclo(['mock-13', 'mock-12', 'mock-1'], i),
    acao: ciclo(acoes, i),
    dados_anteriores: i % 3 === 1 ? { entrada_1: '08:20' } : null,
    dados_novos: { entrada_1: '08:00' },
    justificativa: i % 3 === 1 ? ciclo(MOTIVOS_AJUSTE, i) : null,
    ip_address: `10.0.0.${10 + i}`,
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    created_at: instante(-i, '09:15'),
  }));
}

// ---------------------------------------------------------------------------
// Trilha de auditoria (tabela `audit_log` + RPC `listar_auditoria`)
// ---------------------------------------------------------------------------

function auditLog(listaFerias: Row[]): Row[] {
  const usuarios = ['mariana.oliveira@promobrindes.com.br', 'william.cardoso@promobrindes.com.br', 'ana.souza@promobrindes.com.br'];
  const linhas: Row[] = [];
  const add = (tabela: string, registro: string, acao: string, offset: number, hora: string, novos: Row | null) =>
    linhas.push({
      id: `mock-audit-${linhas.length + 1}`,
      empresa_id: EMPRESA_ID,
      tabela,
      registro_id: registro,
      acao,
      user_id: 'mock-13',
      user_email: ciclo(usuarios, linhas.length),
      dados_anteriores: acao === 'UPDATE' ? { status: 'pendente' } : null,
      dados_novos: novos,
      payload: novos,
      created_at: instante(offset, hora),
    });
  ['batidas_ponto', 'registros_ponto', 'solicitacoes_ajuste_ponto'].forEach((t, ti) => {
    for (let i = 0; i < 5; i++) {
      add(t, `mock-${t}-${i + 1}`, ciclo(['INSERT', 'UPDATE', 'UPDATE', 'INSERT', 'DELETE'], i + ti), -i - ti, `${9 + i}:${String(10 + ti * 7).padStart(2, '0')}`, { status: ciclo(['aprovado', 'rejeitado', 'pendente'], i + ti), hora: '08:00' });
    }
  });
  listaFerias.slice(0, 12).forEach((f, i) => {
    add('ferias', String(f.id), 'INSERT', -30 + i, '09:00', { status: 'pendente' });
    if (f.aprovado_gestor) add('ferias', String(f.id), 'UPDATE', -20 + i, '14:10', { status: 'aprovada', aprovado_gestor: true });
  });
  return linhas.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

// ---------------------------------------------------------------------------
// Montagem
// ---------------------------------------------------------------------------

export function construirTabelas(): Tabelas {
  const periodos = periodosAquisitivos();
  const listaFerias = ferias(periodos);
  const listaAfastamentos = afastamentos();
  const basePonto = baseDiasPonto();

  return {
    colaboradores: MOCK_COLABORADORES.map((c) => ({ ...c, empresa_id: EMPRESA_ID })) as Row[],
    locais_trabalho: LOCAIS_TRABALHO,

    solicitacoes_hora_extra: horasExtras(),
    banco_horas: bancoHoras(),

    turnos: TURNOS,
    escalas_trabalho: escalasTrabalho(),
    escalas: ESCALAS,

    ferias: listaFerias,
    periodos_aquisitivos: periodos,
    ferias_coletivas: FERIAS_COLETIVAS,
    ferias_aprovacoes_log: aprovacoesLog(listaFerias),
    ferias_programacao: feriasProgramacao(periodos),
    v_ferias_alerta_pagamento_d2: alertasPagamento(listaFerias),
    v_ferias_folha_reconciliacao: reconciliacaoFolha(listaFerias),
    ferias_reconciliacao_logs: RECONCILIACAO_LOGS,

    audit_log: auditLog(listaFerias),

    afastamentos: listaAfastamentos,
    prorrogacoes_afastamento: prorrogacoes(listaAfastamentos),
    documentos_afastamento: documentosAfastamento(listaAfastamentos),
    config_afastamentos: CONFIG_AFASTAMENTOS,

    feriados: feriados(),
    controle_acesso: controleAcesso(),

    registros_ponto: registrosPonto(basePonto),
    batidas_ponto: batidasPonto(basePonto),
    solicitacoes_ajuste_ponto: solicitacoesAjuste(),
    configuracoes_ponto: CONFIGURACOES_PONTO,
    trilha_auditoria_ponto: trilhaAuditoriaPonto(),
  };
}

/** RPCs que apenas LEEM — as demais são tratadas como escrita e bloqueadas. */
export const RPC_LEITURA: Record<string, (dados: Tabelas, args: Record<string, unknown>) => unknown> = {
  // Trilha de auditoria (FeriasAuditTimeline → auditoriaService.listar)
  listar_auditoria: (dados, args) =>
    (dados.audit_log ?? [])
      .filter((l) => !args.p_tabela || l.tabela === args.p_tabela)
      .filter((l) => !args.p_registro_id || l.registro_id === args.p_registro_id)
      .slice(0, Number(args.p_limite ?? 200)),
};
