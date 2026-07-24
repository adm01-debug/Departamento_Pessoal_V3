import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, DollarSign, Calendar, TrendingUp, Cake, BarChart3, FileText, Loader2, Mail, Send } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks/useEmpresas';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { edgeFunctionsService } from '@/services/edgeFunctionsService';
import { useExcelExport } from '@/hooks/useExcelExport';
import { usePDFExport } from '@/hooks/usePDFExport';
import { RelatoriosAnalyticsTab } from '@/components/relatorios/RelatoriosAnalyticsTab';
import { RelatoriosExportTab } from '@/components/relatorios/RelatoriosExportTab';
import { RelatoriosAgendadosTab } from '@/components/relatorios/RelatoriosAgendadosTab';
import { currentCompetenciaLocal, formatDateLocalISO } from '@/utils/dateLocal';

const relatorios = [
  { id: 'colaboradores', title: 'Resumo Colaboradores', description: 'Colaboradores ativos com dados completos', icon: Users, gradient: 'from-info to-info/70' },
  { id: 'folha', title: 'Folha de Pagamento', description: 'Relatório detalhado da folha', icon: DollarSign, gradient: 'from-success to-success/70' },
  { id: 'ferias', title: 'Férias', description: 'Colaboradores com férias próximas ou vencidas', icon: Calendar, gradient: 'from-warning to-warning/70' },
  { id: 'aniversariantes', title: 'Aniversariantes', description: 'Aniversariantes do mês', icon: Cake, gradient: 'from-destructive to-destructive/70' },
  { id: 'turnover', title: 'Turnover', description: 'Análise de rotatividade', icon: TrendingUp, gradient: 'from-primary to-primary/70' },
  { id: 'encargos', title: 'Encargos Sociais', description: 'Resumo INSS, FGTS, IRRF', icon: FileText, gradient: 'from-info to-primary' },
];

async function fetchReportData(id: string, empresaId?: string) {
  if (!empresaId) throw new Error('Selecione uma empresa');
  
  switch (id) {
    case 'colaboradores': { 
      const { data, error } = await supabase
        .from('colaboradores')
        .select('nome_completo, cpf, cargo, departamento, status, data_admissao, salario_base')
        .eq('empresa_id', empresaId)
        .eq('status', 'ativo')
        .order('nome_completo'); 
      if (error) throw error; 
      return { 
        title: 'Colaboradores Ativos', 
        rows: data || [], 
        columns: ['nome_completo', 'cpf', 'cargo', 'departamento', 'salario_base', 'data_admissao'] 
      }; 
    }
    case 'folha': { 
      const comp = currentCompetenciaLocal(); 
      const { data, error } = await supabase
        .from('folhas_pagamento')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('competencia', comp); 
      if (error) throw error; 
      return { 
        title: `Histórico de Folha - ${comp}`, 
        rows: data || [], 
        columns: ['competencia', 'tipo', 'total_proventos', 'total_descontos', 'total_liquido', 'status'] 
      }; 
    }
    case 'ferias': {
      const em30Dias = new Date();
      em30Dias.setDate(em30Dias.getDate() + 30);
      const { data, error } = await supabase
        .from('ferias')
        .select('*, colaborador:colaboradores(nome_completo, departamento)')
        .eq('empresa_id', empresaId)
        .gte('data_inicio', new Date().toISOString())
        .lte('data_inicio', em30Dias.toISOString());
      if (error) throw error;
      return {
        title: 'Férias Próximas (30 dias)',
        rows: (data || []).map(f => ({
          colaborador: (f.colaborador as any)?.nome_completo,
          departamento: (f.colaborador as any)?.departamento,
          inicio: f.data_inicio,
          fim: f.data_fim,
          status: f.status
        })),
        columns: ['colaborador', 'departamento', 'inicio', 'fim', 'status']
      };
    }
    case 'aniversariantes': { 
      const mes = new Date().getMonth() + 1; 
      const { data, error } = await supabase
        .from('colaboradores')
        .select('nome_completo, data_nascimento, departamento, cargo')
        .eq('empresa_id', empresaId)
        .eq('status', 'ativo'); 
      if (error) throw error; 
      const rows = (data || []).filter(c => {
        if (!c.data_nascimento) return false;
        return new Date(c.data_nascimento).getUTCMonth() + 1 === mes;
      });
      return { 
        title: `Aniversariantes do Mês`, 
        rows: rows, 
        columns: ['nome_completo', 'data_nascimento', 'departamento', 'cargo'] 
      }; 
    }
    case 'turnover': {
      // Multi-tenant: agrega no client filtrando por empresa_id (view vw_kpi_turnover é global)
      const inicio = new Date();
      inicio.setFullYear(inicio.getFullYear() - 1);
      const inicioISO = formatDateLocalISO(inicio);

      const [desligRes, ativosRes, admRes] = await Promise.all([
        supabase
          .from('desligamentos')
          .select('data_desligamento')
          .eq('empresa_id', empresaId)
          .gte('data_desligamento', inicioISO),
        supabase
          .from('colaboradores')
          .select('id', { count: 'exact', head: true })
          .eq('empresa_id', empresaId)
          .eq('status', 'ativo'),
        supabase
          .from('colaboradores')
          .select('data_admissao')
          .eq('empresa_id', empresaId)
          .gte('data_admissao', inicioISO),
      ]);
      if (desligRes.error) throw desligRes.error;
      if (admRes.error) throw admRes.error;

      const ativos = ativosRes.count ?? 0;
      const byMes = new Map<string, { admissoes: number; desligamentos: number }>();
      (desligRes.data || []).forEach((d: any) => {
        const m = String(d.data_desligamento).slice(0, 7);
        const cur = byMes.get(m) || { admissoes: 0, desligamentos: 0 };
        cur.desligamentos += 1;
        byMes.set(m, cur);
      });
      (admRes.data || []).forEach((a: any) => {
        const m = String(a.data_admissao).slice(0, 7);
        const cur = byMes.get(m) || { admissoes: 0, desligamentos: 0 };
        cur.admissoes += 1;
        byMes.set(m, cur);
      });

      const rows = Array.from(byMes.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([competencia, v]) => ({
          competencia,
          admissoes: v.admissoes,
          desligamentos: v.desligamentos,
          taxa_turnover: ativos > 0
            ? Number((((v.admissoes + v.desligamentos) / 2 / ativos) * 100).toFixed(2))
            : 0,
        }));

      return {
        title: 'Análise de Turnover',
        rows,
        columns: ['competencia', 'taxa_turnover', 'admissoes', 'desligamentos']
      };
    }
    case 'encargos': {
      const comp = currentCompetenciaLocal();
      const { data, error } = await supabase
        .from('folhas_pagamento')
        .select('competencia, total_fgts, total_inss_patronal, total_liquido')
        .eq('empresa_id', empresaId)
        .eq('competencia', comp);
      if (error) throw error;
      return {
        title: `Resumo de Encargos - ${comp}`,
        rows: data || [],
        columns: ['competencia', 'total_fgts', 'total_inss_patronal', 'total_liquido']
      };
    }
    default: return { title: 'Relatório', rows: [], columns: [] };
  }
}

function exportCSV(title: string, rows: any[], columns: string[]) { 
  if (!rows.length) { toast.info('Sem dados'); return; } 
  const blob = new Blob([[columns.join(';'), ...rows.map(r => columns.map(c => r[c] ?? '').join(';'))].join('\n')], { type: 'text/csv;charset=utf-8;' }); 
  const url = URL.createObjectURL(blob); 
  const a = document.createElement('a'); 
  a.href = url; 
  a.download = `${title.replace(/\s/g, '_')}.csv`; 
  a.click(); 
  URL.revokeObjectURL(url); 
  toast.success('CSV exportado!'); 
}

export default function RelatoriosPage() {
  const { empresaAtual } = useEmpresas();
  const [generating, setGenerating] = useState<string | null>(null);
  const { exportarExcel } = useExcelExport();
  const { exportarPDF } = usePDFExport();
  const [exportFormat, setExportFormat] = useState('csv');
  const [emailDialog, setEmailDialog] = useState<string | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const { data: analytics } = useQuery({
    queryKey: ['relatorios_analytics', empresaAtual?.id], enabled: !!empresaAtual?.id,
    queryFn: async () => {
      const [{ data: cols }, { data: deslig }, { data: admissoes }] = await Promise.all([
        supabase.from('colaboradores').select('departamento, status, data_admissao, salario_base').eq('empresa_id', empresaAtual!.id),
        supabase.from('desligamentos').select('data_desligamento, motivo').eq('empresa_id', empresaAtual!.id),
        supabase.from('admissoes').select('data_prevista, departamento').eq('empresa_id', empresaAtual!.id),
      ]);
      const deptMap = new Map<string, number>(); (cols || []).filter(c => c.status === 'ativo').forEach(c => { const d = c.departamento || 'Sem Depto'; deptMap.set(d, (deptMap.get(d) || 0) + 1); });
      const porDepartamento = Array.from(deptMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
      const faixas: Record<string, number> = { 'Até 2k': 0, '2k-4k': 0, '4k-6k': 0, '6k-10k': 0, '10k+': 0 };
      (cols || []).filter(c => c.status === 'ativo' && c.salario_base).forEach(c => { const s = Number(c.salario_base); if (s <= 2000) faixas['Até 2k']++; else if (s <= 4000) faixas['2k-4k']++; else if (s <= 6000) faixas['4k-6k']++; else if (s <= 10000) faixas['6k-10k']++; else faixas['10k+']++; });
      const salarioDistribuicao = Object.entries(faixas).map(([name, value]) => ({ name, value }));
      const months: Record<string, { admissoes: number; desligamentos: number }> = {}; const now = new Date(); for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = { admissoes: 0, desligamentos: 0 }; }
      (admissoes || []).forEach(a => { const m = a.data_prevista?.slice(0, 7); if (m && months[m]) months[m].admissoes++; });
      (deslig || []).forEach(d => { const m = d.data_desligamento?.slice(0, 7); if (m && months[m]) months[m].desligamentos++; });
      const tendencia = Object.entries(months).map(([mes, v]) => ({ mes: mes.slice(5), ...v }));
      const custoTotal = (cols || []).filter(c => c.status === 'ativo').reduce((acc, c) => acc + Number(c.salario_base || 0), 0);
      return { porDepartamento, salarioDistribuicao, tendencia, custoTotal, totalAtivos: (cols || []).filter(c => c.status === 'ativo').length, totalDeslig: (deslig || []).length };
    },
  });

  const handleExport = async (id: string) => { 
    if (!empresaAtual?.id) {
      toast.error('Selecione uma empresa');
      return;
    }
    setGenerating(id); 
    try { 
      const r = await fetchReportData(id, empresaAtual.id); 
      if (exportFormat === 'excel') {
        exportarExcel(r.title, r.rows, r.columns);
      } else if (exportFormat === 'pdf') {
        exportarPDF(r.title, r.rows, r.columns);
      } else {
        exportCSV(r.title, r.rows, r.columns); 
      }

      await supabase.from('audit_log').insert({
        tabela: 'relatorios',
        acao: 'EXPORTACAO',
        registro_id: id,
        dados_novos: { 
          formato: exportFormat, 
          titulo: r.title,
          registros: r.rows.length 
        }
      });
    } catch (e: any) { 
      toast.error(safeErrorMessage(e, 'Erro ao gerar relatório.')); 
    } finally { 
      setGenerating(null); 
    } 
  };

  const handleSendEmail = async () => { 
    if (!emailDialog || !emailTo || !empresaAtual?.id) return; 
    setSendingEmail(true); 
    try { 
      await edgeFunctionsService.enviarRelatorioEmail({ 
        tipo: emailDialog, 
        destinatarios: emailTo.split(',').map(e => e.trim()), 
        empresaId: empresaAtual.id 
      }); 
      toast.success('Relatório enviado por email!'); 
      setEmailDialog(null); 
      setEmailTo(''); 
    } catch (e: any) { 
      toast.error(safeErrorMessage(e, 'Erro ao gerar relatório.')); 
    } finally { 
      setSendingEmail(false); 
    } 
  };

  return (
    <>
      <PageTitle title="Relatórios" description="Relatórios gerenciais" />
      <PageLayout title="Relatórios Analíticos" description="Dashboards, tendências e exportações" icon={<BarChart3 className="h-5 w-5 text-primary-foreground" />} gradient="from-info to-primary">
        <Tabs defaultValue="analytics">
          <div className="flex justify-between items-center mb-6">
            <TabsList className="rounded-xl">
              <TabsTrigger value="analytics" className="rounded-lg font-body">📊 Analytics</TabsTrigger>
              <TabsTrigger value="exportar" className="rounded-lg font-body">📥 Exportar</TabsTrigger>
              <TabsTrigger value="agendados" className="rounded-lg font-body">⏰ Agendamentos</TabsTrigger>
            </TabsList>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger className="w-[130px] rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="csv">📄 CSV</SelectItem><SelectItem value="excel">📊 Excel</SelectItem><SelectItem value="pdf">📋 PDF</SelectItem></SelectContent>
            </Select>
          </div>
          <TabsContent value="analytics"><RelatoriosAnalyticsTab analytics={analytics} /></TabsContent>
          <TabsContent value="exportar"><RelatoriosExportTab relatorios={relatorios} exportFormat={exportFormat} generating={generating} onExport={handleExport} onEmailOpen={setEmailDialog} /></TabsContent>
          <TabsContent value="agendados"><RelatoriosAgendadosTab empresaId={empresaAtual?.id || ''} /></TabsContent>
        </Tabs>
        <Dialog open={!!emailDialog} onOpenChange={(o) => { if (!o) setEmailDialog(null); }}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader><DialogTitle className="flex items-center gap-2 font-display"><Mail className="h-5 w-5" /> Enviar Relatório por Email</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label className="font-body">Destinatários (separados por vírgula)</Label><Input placeholder="email@empresa.com" value={emailTo} onChange={e => setEmailTo(e.target.value)} className="rounded-xl" /></div>
              <p className="text-sm text-muted-foreground font-body">Relatório: <span className="font-semibold text-foreground">{relatorios.find(r => r.id === emailDialog)?.title}</span></p>
              <Button onClick={handleSendEmail} disabled={sendingEmail || !emailTo.trim()} className="w-full rounded-xl bg-gradient-to-r from-primary to-primary-glow font-body">
                {sendingEmail ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}{sendingEmail ? 'Enviando...' : 'Enviar por Email'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageLayout>
    </>
  );
}
