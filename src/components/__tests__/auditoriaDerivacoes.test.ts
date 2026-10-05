import { describe, it, expect } from 'vitest';
import {
  FILTROS_AUDITORIA_VAZIOS,
  contarPorEtapa,
  filtrarAuditoria,
  formatarDataHora,
  ordenarAuditoria,
  possuiFiltrosAtivos,
  responsaveisDisponiveis,
  resumoAuditoria,
  tiposDeEvento,
  type EventoAuditoria,
  type FiltrosAuditoria,
} from '../admissoes/auditoriaDerivacoes';

/** Trilha de teste: 3 eventos com datas fixas (nada depende do relógio real). */
const EVENTOS: EventoAuditoria[] = [
  {
    id: 'e1',
    data_hora: '2026-12-20T12:00:00.000Z',
    candidato: 'Ana Silva Santos',
    cargo: 'Analista de Marketing',
    departamento: 'Marketing',
    acao: 'Transmissão do evento S-2200',
    etapa: 'esocial',
    evento_esocial: 'S-2200',
    protocolo: '1.2.345.678',
    status: 'sucesso',
    responsavel: 'Renata Alves',
    responsavel_cargo: 'Especialista em eSocial',
    detalhe: 'Admissão transmitida ao eSocial com recibo de protocolo.',
  },
  {
    id: 'e2',
    data_hora: '2026-12-10T12:00:00.000Z',
    candidato: 'Pedro Almeida Souza',
    cargo: 'Analista de TI',
    departamento: 'TI',
    acao: 'Admissão cancelada',
    etapa: 'cancelada',
    evento_esocial: null,
    protocolo: null,
    status: 'falha',
    responsavel: 'Bruno Cardoso',
    responsavel_cargo: 'Gestor de RH',
    detalhe: 'Processo encerrado sem contratação — vaga reaberta.',
  },
  {
    id: 'e3',
    data_hora: '2026-06-01T12:00:00.000Z',
    candidato: 'Aline Cristina Duarte',
    cargo: 'Analista Contábil',
    departamento: 'Contabilidade',
    acao: 'Pendência documental identificada',
    etapa: 'pendente',
    evento_esocial: null,
    protocolo: null,
    status: 'pendente',
    responsavel: 'Renata Alves',
    responsavel_cargo: 'Especialista em eSocial',
    detalhe: 'Aguardando comprovante de residência atualizado',
  },
];

/** 31/12/2026 no início do dia — a mesma régua do `inicioDoDia` do módulo. */
const HOJE = new Date('2026-12-31T00:00:00').getTime();

const comFiltro = (parcial: Partial<FiltrosAuditoria>): FiltrosAuditoria => ({
  ...FILTROS_AUDITORIA_VAZIOS,
  ...parcial,
});

describe('auditoriaDerivacoes', () => {
  it('conta os status e as fatias do resumo (nunca NaN)', () => {
    const resumo = resumoAuditoria(EVENTOS, HOJE);
    expect(resumo).toMatchObject({ total: 3, sucesso: 1, pendentes: 1, falhas: 1 });
    expect(resumo.pctSucesso).toBe(33);
    expect(resumo.pctPendentes).toBe(33);
    expect(resumo.pctFalhas).toBe(33);

    // Sem trilha: tudo zero (e nenhuma divisão por zero)
    const vazio = resumoAuditoria([], HOJE);
    expect(vazio).toMatchObject({ total: 0, pctSucesso: 0, pctPendentes: 0, pctFalhas: 0 });
    expect(Number.isNaN(vazio.pctSucesso)).toBe(false);
  });

  it('conta os eventos dos últimos 30 dias', () => {
    // 20/12 e 10/12 entram na janela; 01/06 não
    expect(resumoAuditoria(EVENTOS, HOJE).ultimos30Dias).toBe(2);
  });

  it('detecta filtros ativos (inclusive os do painel avançado)', () => {
    expect(possuiFiltrosAtivos(FILTROS_AUDITORIA_VAZIOS)).toBe(false);
    expect(possuiFiltrosAtivos(comFiltro({ termo: 'ana' }))).toBe(true);
    expect(possuiFiltrosAtivos(comFiltro({ status: 'falha' }))).toBe(true);
    expect(possuiFiltrosAtivos(comFiltro({ etapa: 'esocial' }))).toBe(true);
    expect(possuiFiltrosAtivos(comFiltro({ responsavel: 'Renata Alves' }))).toBe(true);
    expect(possuiFiltrosAtivos(comFiltro({ periodo: '7d' }))).toBe(true);
    expect(possuiFiltrosAtivos(comFiltro({ tipo: 'Admissão cancelada' }))).toBe(true);
    expect(possuiFiltrosAtivos(comFiltro({ somenteComProtocolo: true }))).toBe(true);
    expect(possuiFiltrosAtivos(comFiltro({ de: '2026-01-01' }))).toBe(true);
    expect(possuiFiltrosAtivos(comFiltro({ ate: '2026-12-31' }))).toBe(true);
    expect(possuiFiltrosAtivos(comFiltro({ termo: '   ' }))).toBe(false);
  });

  it('filtra por busca livre (candidato, ação, responsável, protocolo, cargo)', () => {
    expect(filtrarAuditoria(EVENTOS, comFiltro({ termo: 'ana silva' }), HOJE).map((e) => e.id)).toEqual(['e1']);
    expect(filtrarAuditoria(EVENTOS, comFiltro({ termo: 'cancelada' }), HOJE).map((e) => e.id)).toEqual(['e2']);
    expect(filtrarAuditoria(EVENTOS, comFiltro({ termo: 'bruno cardoso' }), HOJE).map((e) => e.id)).toEqual(['e2']);
    expect(filtrarAuditoria(EVENTOS, comFiltro({ termo: '1.2.345.678' }), HOJE).map((e) => e.id)).toEqual(['e1']);
    expect(filtrarAuditoria(EVENTOS, comFiltro({ termo: 'analista contábil' }), HOJE).map((e) => e.id)).toEqual(['e3']);
    expect(filtrarAuditoria(EVENTOS, comFiltro({ termo: 'inexistente' }), HOJE)).toEqual([]);
  });

  it('filtra por status, etapa, tipo e recibo do eSocial', () => {
    expect(filtrarAuditoria(EVENTOS, comFiltro({ status: 'falha' }), HOJE).map((e) => e.id)).toEqual(['e2']);
    expect(filtrarAuditoria(EVENTOS, comFiltro({ etapa: 'pendente' }), HOJE).map((e) => e.id)).toEqual(['e3']);
    expect(filtrarAuditoria(EVENTOS, comFiltro({ tipo: 'Admissão cancelada' }), HOJE).map((e) => e.id)).toEqual(['e2']);
    expect(filtrarAuditoria(EVENTOS, comFiltro({ somenteComProtocolo: true }), HOJE).map((e) => e.id)).toEqual(['e1']);
  });

  it('filtra por período relativo e por intervalo de datas', () => {
    // `filtrarAuditoria` preserva a ordem de entrada; a ordenação é outro passo.
    expect(filtrarAuditoria(EVENTOS, comFiltro({ periodo: '7d' }), HOJE)).toEqual([]);
    expect(filtrarAuditoria(EVENTOS, comFiltro({ periodo: '30d' }), HOJE).map((e) => e.id)).toEqual(['e1', 'e2']);
    expect(filtrarAuditoria(EVENTOS, comFiltro({ periodo: 'ano' }), HOJE).length).toBe(3);

    expect(filtrarAuditoria(EVENTOS, comFiltro({ de: '2026-12-15' }), HOJE).map((e) => e.id)).toEqual(['e1']);
    expect(filtrarAuditoria(EVENTOS, comFiltro({ ate: '2026-12-15' }), HOJE).map((e) => e.id)).toEqual(['e2', 'e3']);
  });

  it('conta por etapa, lista responsáveis e tipos de evento', () => {
    expect(contarPorEtapa(EVENTOS)).toEqual({ esocial: 1, cancelada: 1, pendente: 1 });
    expect(responsaveisDisponiveis(EVENTOS)).toEqual(['Bruno Cardoso', 'Renata Alves']);
    expect(tiposDeEvento(EVENTOS).map((t) => t.acao)).toEqual([
      'Admissão cancelada',
      'Pendência documental identificada',
      'Transmissão do evento S-2200',
    ]);
  });

  it('ordena por data, candidato e status (atenção primeiro)', () => {
    expect(ordenarAuditoria(EVENTOS, 'recentes').map((e) => e.id)).toEqual(['e1', 'e2', 'e3']);
    expect(ordenarAuditoria(EVENTOS, 'antigos').map((e) => e.id)).toEqual(['e3', 'e2', 'e1']);
    expect(ordenarAuditoria(EVENTOS, 'candidato').map((e) => e.id)).toEqual(['e3', 'e1', 'e2']);
    // falha → pendente → sucesso
    expect(ordenarAuditoria(EVENTOS, 'status').map((e) => e.id)).toEqual(['e2', 'e3', 'e1']);

    // Não muda o array recebido (ordenação é pura e estável)
    const copia = [...EVENTOS];
    expect(ordenarAuditoria(copia, 'antigos')).not.toBe(copia);
    expect(copia.map((e) => e.id)).toEqual(['e1', 'e2', 'e3']);
  });

  it('formata a data/hora com fallback para valor inválido', () => {
    const valido = formatarDataHora('2026-12-20T12:00:00.000Z');
    expect(valido.data).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(valido.hora).toMatch(/\d{2}:\d{2}/);
    expect(formatarDataHora(null)).toEqual({ data: '—', hora: '' });
    expect(formatarDataHora('data-invalida')).toEqual({ data: '—', hora: '' });
  });
});
