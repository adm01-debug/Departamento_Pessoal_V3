import { describe, expect, it } from 'vitest';
import { buildReportScheduleInsert, type ReportScheduleForm } from './reportScheduleContract';

const base: ReportScheduleForm = {
  nome: 'Resumo',
  tipo_relatorio: 'folha_resumo',
  frequencia: 'diario',
  email_destinatario: 'rh@example.invalid',
  hora_envio: '08:00',
  dia_semana: 1,
  dia_mes: 15,
};

describe('buildReportScheduleInsert', () => {
  it('alinha o agendamento diário ao contrato da Edge Function', () => {
    expect(buildReportScheduleInsert(base, 'empresa-1', 'user-1')).toMatchObject({
      formato: 'csv',
      empresa_id: 'empresa-1',
      created_by: 'user-1',
      parametros: { empresaId: 'empresa-1' },
      dia_semana: null,
      dia_mes: null,
    });
  });

  it('persiste apenas o calendário pertinente à frequência', () => {
    expect(
      buildReportScheduleInsert({ ...base, frequencia: 'semanal', dia_semana: 5 }, 'empresa-1', 'user-1')
    ).toMatchObject({ dia_semana: 5, dia_mes: null });

    expect(
      buildReportScheduleInsert({ ...base, frequencia: 'mensal', dia_mes: 28 }, 'empresa-1', 'user-1')
    ).toMatchObject({ dia_semana: null, dia_mes: 28 });
  });

  it('falha fechada sem tenant ou autor', () => {
    expect(() => buildReportScheduleInsert(base, '', 'user-1')).toThrow('empresa_id é obrigatório');
    expect(() => buildReportScheduleInsert(base, 'empresa-1', '')).toThrow('Usuário autenticado é obrigatório');
  });
});
