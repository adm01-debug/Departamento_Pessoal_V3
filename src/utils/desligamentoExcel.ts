import { toast } from 'sonner';
import {
  buildTabularWorkbook,
  downloadWorkbook,
} from './importacao/excelDownload';
import { todayLocalISO } from '@/utils/dateLocal';


const TIPO_LABELS: Record<string, string> = {
  sem_justa_causa: 'Sem Justa Causa',
  com_justa_causa: 'Com Justa Causa',
  pedido_demissao: 'Pedido de Demissão',
  acordo_mutuo: 'Acordo Mútuo',
  termino_contrato: 'Término de Contrato',
};

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
};

const HEADERS = [
  'Colaborador', 'Data Desligamento', 'Tipo', 'Status', 'Motivo',
  'Salário Base', 'Valor Líquido', 'Aviso Prévio', 'Saldo Salário',
  '13º Proporcional', 'Férias Proporcionais', 'Multa FGTS',
  'Total Proventos', 'Total Descontos',
];

function rowFor(d: any): unknown[] {
  return [
    d.colaborador?.nome_completo || '—',
    d.data_desligamento ? new Date(d.data_desligamento).toLocaleDateString('pt-BR') : '—',
    TIPO_LABELS[d.tipo] || d.tipo || '—',
    STATUS_LABELS[d.status] || d.status || '—',
    d.motivo || '—',
    d.salario_base || 0,
    d.valor_liquido || 0,
    d.data_aviso_previo ? new Date(d.data_aviso_previo).toLocaleDateString('pt-BR') : '—',
    d.saldo_salario || 0,
    d.decimo_terceiro || 0,
    d.ferias_proporcionais || 0,
    d.multa_fgts || 0,
    d.total_proventos || 0,
    d.total_descontos || 0,
  ];
}

export async function exportarDesligamentosExcel(desligamentos: any[]) {
  if (desligamentos.length === 0) {
    toast.error('Nenhum desligamento para exportar');
    return;
  }
  const rows = desligamentos.map(rowFor);
  const wb = buildTabularWorkbook('Desligamentos', HEADERS, rows);
  const filename = `Desligamentos_${todayLocalISO()}.xlsx`;
  await downloadWorkbook(wb, filename);
  toast.success('Planilha exportada com sucesso!');
}
