import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Target, TargetIcon, Calculator, Plus, Trash2, Sparkles, Info } from 'lucide-react';
import { premiacoesService } from '@/services/premiacoesService';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface CampaignWizardProps {
  isOpen: boolean;
  onClose: () => void;
  empresaId?: string;
}

export function CampaignWizard({ isOpen, onClose, empresaId }: CampaignWizardProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = React.useState(1);
  const [formData, setFormData] = React.useState({
    nome: '',
    descricao: '',
    data_inicio: '',
    data_fim: '',
    orcamento_estimado: 0,
    empresa_id: empresaId,
    status: 'ativo'
  });

  const [rules, setRules] = React.useState([
    { nome: 'Bônus de Batimento', tipo_calculo: 'valor_fixo', valor_base: 500, condicao_metrica: 'atingimento_meta' }
  ]);

  const handleSave = async () => {
    try {
      const campanha = await premiacoesService.criarCampanha({
        ...formData,
        empresa_id: empresaId
      });
      
      for (const rule of rules) {
        await premiacoesService.criarRegra({
          ...rule,
          campanha_id: campanha.id
        });
      }

      queryClient.invalidateQueries({ queryKey: ['premiacoes_campanhas'] });
      toast.success("Campanha estratégica criada com sucesso!");
      onClose();
    } catch (e) {
      toast.error("Erro ao criar campanha.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Configurar Nova Campanha de Incentivo
          </DialogTitle>
          <DialogDescription>
            Defina o período, orçamento e as regras de cálculo para este ciclo.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {step === 1 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2">
                <Label>Nome da Campanha</Label>
                <Input placeholder="Ex: Campanha de Vendas Q2" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Início</Label>
                  <Input type="date" value={formData.data_inicio} onChange={e => setFormData({...formData, data_inicio: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <Label>Fim</Label>
                  <Input type="date" value={formData.data_fim} onChange={e => setFormData({...formData, data_fim: e.target.value})} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Orçamento Máximo Estimado</Label>
                <Input type="number" placeholder="R$ 0,00" value={formData.orcamento_estimado} onChange={e => setFormData({...formData, orcamento_estimado: Number(e.target.value)})} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-1" />
                <div>
                  <h4 className="text-sm font-bold text-primary">Inteligência de Incentivos</h4>
                  <p className="text-[10px] text-muted-foreground">Analise as metas atuais para sugerir as melhores regras de premiação.</p>
                  <Button variant="link" className="p-0 h-auto text-[10px] font-bold text-primary" onClick={() => {
                    setRules([
                      ...rules,
                      { nome: 'Atingimento Meta Vendas', tipo_calculo: 'percentual_comissao', valor_base: 5, condicao_metrica: 'meta_vendas > 100%' },
                      { nome: 'Superação de Meta (Kicker)', tipo_calculo: 'valor_fixo', valor_base: 1000, condicao_metrica: 'meta_vendas > 120%' }
                    ]);
                    toast.success("Regras sugeridas aplicadas!");
                  }}>
                    Aplicar sugestões baseadas em OKRs
                  </Button>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2">
                <Label className="text-sm font-bold">Regras de Premiação</Label>
                <Button size="sm" variant="outline" className="h-8 text-[10px]" onClick={() => setRules([...rules, { nome: '', tipo_calculo: 'valor_fixo', valor_base: 0, condicao_metrica: '' }])}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar Regra
                </Button>
              </div>
              {rules.map((rule, idx) => {
                const patch = (changes: Record<string, unknown>) =>
                  setRules(rules.map((r, i) => (i === idx ? { ...r, ...changes } : r)));
                return (
                <div key={idx} className="p-3 border rounded-xl space-y-3 relative group">
                  <Button variant="ghost" size="icon" aria-label="Excluir" className="h-6 w-6 absolute right-2 top-2 text-destructive opacity-0 group-hover:opacity-100" onClick={() => setRules(rules.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Nome da Regra" value={rule.nome} onChange={e => patch({ nome: e.target.value })} />
                    <Select value={rule.tipo_calculo} onValueChange={v => patch({ tipo_calculo: v })}>
                      <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="valor_fixo">Valor Fixo</SelectItem>
                        <SelectItem value="percentual_salario">% do Salário Base</SelectItem>
                        <SelectItem value="percentual_comissao">% de Comissão</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input type="number" placeholder="Valor/Base" value={rule.valor_base} onChange={e => patch({ valor_base: Number(e.target.value) })} />
                    <Input placeholder="Critério (Ex: Meta > 100%)" value={rule.condicao_metrica} onChange={e => patch({ condicao_metrica: e.target.value })} />
                  </div>
                </div>
              );})}
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 1 ? (
            <Button className="w-full" onClick={() => setStep(2)}>Próximo: Regras de Pagamento</Button>
          ) : (
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
              <Button variant="secondary" className="flex-1" onClick={() => {
                setFormData({...formData, status: 'rascunho'});
                handleSave();
              }}>Salvar Rascunho</Button>
              <Button className="flex-2" onClick={() => {
                setFormData({...formData, status: 'ativo'});
                handleSave();
              }}>Lançar Campanha</Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
