import { PageTitle } from '@/components/PageTitle';
import { formatDateLocalISO, addDaysLocal } from '@/utils/dateLocal';
import { useState, useMemo } from 'react';
import { useNow } from '@/hooks/useNow';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { lgpdService } from '@/services/lgpdService';
import { colaboradorService } from '@/services';
import { useEmpresas } from '@/hooks';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Plus,
  ShieldCheck,
  FileSearch,
  Lock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Database,
  Eye,
  Clock,
  Users,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  pendente: 'bg-warning/15 text-warning border-0',
  em_andamento: 'bg-info/15 text-info border-0',
  concluida: 'bg-success/15 text-success border-0',
  recusada: 'bg-destructive/15 text-destructive border-0',
};
const tipoConsentimento: Record<string, string> = {
  dados_pessoais: 'Dados Pessoais',
  dados_sensiveis: 'Dados Sensíveis',
  compartilhamento: 'Compartilhamento',
  marketing: 'Marketing',
};
const tipoSolicitacao: Record<string, string> = {
  acesso: 'Acesso aos Dados',
  retificacao: 'Retificação',
  exclusao: 'Exclusão',
  portabilidade: 'Portabilidade',
  revogacao: 'Revogação de Consentimento',
};

const MAPEAMENTO_DADOS = [
  {
    categoria: 'Dados Pessoais',
    tabela: 'colaboradores',
    campos: ['nome_completo', 'cpf', 'rg', 'data_nascimento', 'email', 'telefone'],
    base_legal: 'Execução de Contrato (Art. 7°, V)',
    finalidade: 'Gestão de RH e cumprimento de obrigações trabalhistas',
  },
  {
    categoria: 'Dados Bancários',
    tabela: 'colaboradores',
    campos: ['banco', 'agencia', 'conta', 'pix'],
    base_legal: 'Execução de Contrato (Art. 7°, V)',
    finalidade: 'Pagamento de salários e benefícios',
  },
  {
    categoria: 'Dados de Saúde',
    tabela: 'asos',
    campos: ['tipo_exame', 'resultado', 'cid', 'medico_nome'],
    base_legal: 'Obrigação Legal (Art. 7°, II)',
    finalidade: 'Cumprimento de NRs e saúde ocupacional',
  },
  {
    categoria: 'Dados de Dependentes',
    tabela: 'dependentes',
    campos: ['nome', 'cpf', 'parentesco', 'data_nascimento'],
    base_legal: 'Obrigação Legal (Art. 7°, II)',
    finalidade: 'IRRF, salário-família, plano de saúde',
  },
  {
    categoria: 'Dados Biométricos',
    tabela: 'batidas_ponto',
    campos: ['latitude', 'longitude', 'ip_address'],
    base_legal: 'Legítimo Interesse (Art. 7°, IX)',
    finalidade: 'Controle de jornada de trabalho',
  },
  {
    categoria: 'Dados de Candidatos',
    tabela: 'candidatos',
    campos: ['nome', 'email', 'curriculo_url', 'pretensao_salarial'],
    base_legal: 'Consentimento (Art. 7°, I)',
    finalidade: 'Processo seletivo',
  },
];

export default function LGPDPage() {
  const { empresaAtual } = useEmpresas();
  const now = useNow();
  const qc = useQueryClient();
  const [openSol, setOpenSol] = useState(false);
  const [formSol, setFormSol] = useState({ colaborador_id: '', tipo: 'acesso', descricao: '' });

  const { data: consentimentos = [], isLoading: loadCons } = useQuery({ queryKey: ['lgpd_consentimentos', empresaAtual?.id], queryFn: () => lgpdService.listarConsentimentos(empresaAtual!.id), enabled: !!empresaAtual?.id });
  const { data: solicitacoes = [], isLoading: loadSol } = useQuery({ queryKey: ['lgpd_solicitacoes', empresaAtual?.id], queryFn: () => lgpdService.listarSolicitacoes(empresaAtual!.id), enabled: !!empresaAtual?.id });
  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores', empresaAtual?.id], queryFn: () => colaboradorService.list(empresaAtual!.id), enabled: !!empresaAtual?.id });

  const criarSol = useMutation({
    mutationFn: () =>
      lgpdService.criarSolicitacao({
        ...formSol,
        empresa_id: empresaAtual?.id,
        prazo_legal: formatDateLocalISO(addDaysLocal(new Date(), 15)),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lgpd_solicitacoes'] });
      setOpenSol(false);
      toast.success('Solicitação LGPD registrada!');
      setFormSol({ colaborador_id: '', tipo: 'acesso', descricao: '' });
    },
    onError: () => toast.error('Erro ao registrar'),
  });

  const concluirSol = useMutation({
    mutationFn: (id: string) => lgpdService.atualizarSolicitacao(id, { status: 'concluida', concluida_em: new Date().toISOString() }, empresaAtual!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lgpd_solicitacoes'] }); toast.success('Solicitação concluída!'); },
  });

  const revogar = useMutation({
    mutationFn: (id: string) => lgpdService.revogarConsentimento(id, empresaAtual!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lgpd_consentimentos'] }); toast.success('Consentimento revogado'); },
  });

  const aceitos = consentimentos.filter((c: any) => c.aceito).length;
  const pendentes = solicitacoes.filter((s: any) => s.status === 'pendente').length;
  const vencendo = solicitacoes.filter((s: any) => {
    if (s.status !== 'pendente') return false;
    const prazo = new Date(s.prazo_legal);
    const diff = (prazo.getTime() - now) / (1000 * 60 * 60 * 24);
    return diff <= 5 && diff >= 0;
  }).length;

  return (
    <>
      <PageTitle title="LGPD" description="Conformidade com Lei Geral de Proteção de Dados" />
      <PageLayout
        title="LGPD — Proteção de Dados"
        description="Consentimentos, solicitações, mapeamento de dados e conformidade"
        icon={<ShieldCheck className="h-5 w-5 text-primary-foreground" />}
        gradient="from-primary to-info"
        actions={
          <Dialog open={openSol} onOpenChange={setOpenSol}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-gradient-to-r from-primary to-primary-glow font-body">
                <Plus className="mr-2 h-4 w-4" />
                Nova Solicitação
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle className="font-display">Solicitação LGPD (Art. 18)</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="font-body">Titular (Colaborador)</Label>
                  <Select
                    value={formSol.colaborador_id}
                    onValueChange={(v) => setFormSol((p) => ({ ...p, colaborador_id: v }))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {colaboradores.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome_completo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="font-body">Tipo de Solicitação</Label>
                  <Select value={formSol.tipo} onValueChange={(v) => setFormSol((p) => ({ ...p, tipo: v }))}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(tipoSolicitacao).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="font-body">Descrição</Label>
                  <Textarea
                    value={formSol.descricao}
                    onChange={(e) => setFormSol((p) => ({ ...p, descricao: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div className="p-3 bg-warning/5 rounded-xl border border-warning/20">
                  <p className="text-xs text-warning font-body flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Prazo legal: 15 dias corridos (Art. 18, §5° LGPD)
                  </p>
                </div>
                <Button
                  className="w-full rounded-xl bg-gradient-to-r from-primary to-primary-glow"
                  onClick={() => criarSol.mutate()}
                  disabled={!formSol.colaborador_id || criarSol.isPending}
                >
                  {criarSol.isPending ? 'Registrando...' : 'Registrar Solicitação'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      >
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            {
              label: 'Consentimentos',
              value: consentimentos.length,
              icon: ShieldCheck,
              gradient: 'from-primary to-primary-glow',
            },
            { label: 'Aceitos', value: aceitos, icon: CheckCircle, gradient: 'from-success to-success/70' },
            { label: 'Solicitações', value: solicitacoes.length, icon: FileSearch, gradient: 'from-info to-info/70' },
            { label: 'Pendentes', value: pendentes, icon: AlertTriangle, gradient: 'from-warning to-warning/70' },
            { label: 'Prazo Crítico', value: vencendo, icon: Clock, gradient: 'from-destructive to-destructive/70' },
          ].map(({ label, value, icon: Icon, gradient }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="border-border/30 rounded-2xl overflow-hidden">
                <div className={cn('h-[2px] bg-gradient-to-r', gradient)} />
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={cn('p-2 rounded-xl bg-gradient-to-br', gradient)}>
                    <Icon className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-bold font-display">{value}</p>
                    <p className="text-[10px] text-muted-foreground font-body">{label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Tabs defaultValue="consentimentos">
          <TabsList className="rounded-xl mb-4">
            <TabsTrigger value="consentimentos" className="rounded-lg font-body">
              <Lock className="mr-1 h-4 w-4" />
              Consentimentos
            </TabsTrigger>
            <TabsTrigger value="solicitacoes" className="rounded-lg font-body">
              <FileSearch className="mr-1 h-4 w-4" />
              Solicitações
            </TabsTrigger>
            <TabsTrigger value="mapeamento" className="rounded-lg font-body">
              <Database className="mr-1 h-4 w-4" />
              Mapeamento
            </TabsTrigger>
            <TabsTrigger value="conformidade" className="rounded-lg font-body">
              <Eye className="mr-1 h-4 w-4" />
              Conformidade
            </TabsTrigger>
          </TabsList>

          {/* Consentimentos */}
          <TabsContent value="consentimentos">
            {loadCons ? (
              <div className="flex justify-center p-8">
                <Spinner size="lg" />
              </div>
            ) : (
              <Card className="rounded-2xl border-border/30 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-display">Colaborador</TableHead>
                      <TableHead className="font-display">Tipo</TableHead>
                      <TableHead className="font-display">Status</TableHead>
                      <TableHead className="font-display">Versão</TableHead>
                      <TableHead className="font-display">Aceito em</TableHead>
                      <TableHead className="font-display">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consentimentos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8 font-body">
                          Nenhum consentimento registrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      consentimentos.map((c: any) => (
                        <TableRow key={c.id} className="hover:bg-accent/30 transition-colors">
                          <TableCell className="font-body font-medium">
                            {(c as any).colaborador?.nome_completo || '—'}
                          </TableCell>
                          <TableCell className="font-body text-sm">{tipoConsentimento[c.tipo] || c.tipo}</TableCell>
                          <TableCell>
                            {c.aceito ? (
                              <Badge className="bg-success/15 text-success border-0 font-body">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Aceito
                              </Badge>
                            ) : (
                              <Badge className="bg-destructive/15 text-destructive border-0 font-body">
                                <XCircle className="h-3 w-3 mr-1" />
                                Revogado
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-body text-sm">v{c.versao}</TableCell>
                          <TableCell className="text-xs font-body">
                            {c.aceito_em ? new Date(c.aceito_em).toLocaleDateString('pt-BR') : '—'}
                          </TableCell>
                          <TableCell>
                            {c.aceito && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive text-xs h-7 rounded-lg"
                                onClick={() => revogar.mutate(c.id)}
                              >
                                Revogar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* Solicitações */}
          <TabsContent value="solicitacoes">
            {loadSol ? (
              <div className="flex justify-center p-8">
                <Spinner size="lg" />
              </div>
            ) : (
              <Card className="rounded-2xl border-border/30 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-display">Titular</TableHead>
                      <TableHead className="font-display">Tipo</TableHead>
                      <TableHead className="font-display">Status</TableHead>
                      <TableHead className="font-display">Prazo Legal</TableHead>
                      <TableHead className="font-display">Data</TableHead>
                      <TableHead className="font-display">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {solicitacoes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8 font-body">
                          Nenhuma solicitação
                        </TableCell>
                      </TableRow>
                    ) : (
                      solicitacoes.map((s: any) => {
                        const prazoCritico =
                          s.status === 'pendente' &&
                          s.prazo_legal &&
                          (new Date(s.prazo_legal).getTime() - now) / (1000 * 60 * 60 * 24) <= 5;
                        return (
                          <TableRow
                            key={s.id}
                            className={cn('hover:bg-accent/30 transition-colors', prazoCritico && 'bg-destructive/5')}
                          >
                            <TableCell className="font-body font-medium">
                              {(s as any).colaborador?.nome_completo || '—'}
                            </TableCell>
                            <TableCell className="font-body text-sm">{tipoSolicitacao[s.tipo] || s.tipo}</TableCell>
                            <TableCell>
                              <Badge
                                className={cn('font-body text-xs', statusColors[s.status] || statusColors.pendente)}
                              >
                                {s.status}
                              </Badge>
                            </TableCell>
                            <TableCell
                              className={cn('text-xs font-body', prazoCritico && 'text-destructive font-semibold')}
                            >
                              {s.prazo_legal || '—'}
                              {prazoCritico && ' ⚠️'}
                            </TableCell>
                            <TableCell className="text-xs font-body">
                              {new Date(s.created_at).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell>
                              {s.status === 'pendente' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7 rounded-lg"
                                  onClick={() => concluirSol.mutate(s.id)}
                                >
                                  Concluir
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* Mapeamento de Dados - NEW */}
          <TabsContent value="mapeamento">
            <div className="space-y-4">
              {MAPEAMENTO_DADOS.map((item, i) => (
                <motion.div
                  key={item.categoria}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Card className="border-border/30 rounded-2xl overflow-hidden">
                    <div className="h-[2px] bg-gradient-to-r from-primary to-info" />
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-info shrink-0">
                          <Database className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-display font-bold text-sm">{item.categoria}</p>
                            <Badge variant="outline" className="text-[10px] font-body">
                              {item.tabela}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {item.campos.map((c) => (
                              <Badge key={c} variant="outline" className="text-[9px] font-body font-mono">
                                {c}
                              </Badge>
                            ))}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-body">
                            <div className="p-2 bg-muted/30 rounded-lg">
                              <span className="text-muted-foreground">Base Legal:</span>
                              <p className="font-medium mt-0.5">{item.base_legal}</p>
                            </div>
                            <div className="p-2 bg-muted/30 rounded-lg">
                              <span className="text-muted-foreground">Finalidade:</span>
                              <p className="font-medium mt-0.5">{item.finalidade}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Conformidade - NEW */}
          <TabsContent value="conformidade">
            <div className="space-y-4">
              <Card className="rounded-2xl border-border/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    Score de Conformidade LGPD
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const checks = [
                      { item: 'Consentimentos coletados', ok: consentimentos.length > 0 },
                      { item: 'Processo de solicitação ativo', ok: true },
                      { item: 'Mapeamento de dados documentado', ok: true },
                      { item: 'Base legal definida para cada tratamento', ok: true },
                      { item: 'Prazo de resposta ≤15 dias', ok: pendentes === 0 || vencendo === 0 },
                      { item: 'Encarregado (DPO) designado', ok: false },
                      { item: 'Relatório de Impacto (RIPD)', ok: false },
                      { item: 'Política de Privacidade publicada', ok: false },
                    ];
                    const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
                    return (
                      <div>
                        <div className="flex items-center gap-4 mb-4">
                          <div className="relative w-20 h-20">
                            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                              <circle
                                cx="18"
                                cy="18"
                                r="15.5"
                                fill="none"
                                className="stroke-muted/20"
                                strokeWidth="3"
                              />
                              <circle
                                cx="18"
                                cy="18"
                                r="15.5"
                                fill="none"
                                className={cn(
                                  'stroke-current',
                                  score >= 75 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-destructive'
                                )}
                                strokeWidth="3"
                                strokeDasharray={`${score} ${100 - score}`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center font-display font-bold text-lg">
                              {score}%
                            </span>
                          </div>
                          <div>
                            <p className="font-display font-bold text-lg">
                              {score >= 75 ? 'Bom' : score >= 50 ? 'Regular' : 'Crítico'}
                            </p>
                            <p className="text-xs text-muted-foreground font-body">
                              {checks.filter((c) => c.ok).length} de {checks.length} itens em conformidade
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {checks.map((check, i) => (
                            <div key={i} className="flex items-center gap-3 text-sm font-body">
                              {check.ok ? (
                                <CheckCircle className="h-4 w-4 text-success shrink-0" />
                              ) : (
                                <XCircle className="h-4 w-4 text-destructive shrink-0" />
                              )}
                              <span className={cn(!check.ok && 'text-muted-foreground')}>{check.item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </PageLayout>
    </>
  );
}
