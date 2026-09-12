import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useSyncedState } from '@/hooks/useSyncedState';
import { motion } from 'framer-motion';
import { Building2, Save } from 'lucide-react';
import { REGIMES_OPTIONS, type RegimeTributario } from '@/constants/regimes';
import { toast } from 'sonner';

const percentToFraction = (value: number) => Number((value / 100).toFixed(8));

export function EmpresaSettingsTab() {
  const { empresaAtual, atualizarEmpresa, loadingEmpresas } = useEmpresas();
  // Formulário derivado da empresa ativa (multi-tenant): troca de empresa ressincroniza.
  const [form, setForm] = useSyncedState(empresaAtual, (e) => ({
    razao_social: e?.razao_social || '',
    nome_fantasia: e?.nome_fantasia || '',
    cnpj: e?.cnpj || '',
    inscricao_estadual: e?.inscricao_estadual || '',
    inscricao_municipal: e?.inscricao_municipal || '',
    cidade: e?.cidade || '',
    uf: e?.uf || '',
    email: e?.email || '',
    telefone: e?.telefone || '',
    regime_tributario: e?.regime_tributario || 'lucro_real',
    simples_anexo: e?.simples_anexo || '',
    rat_percentual: String((e?.rat ?? 0.02) * 100),
    fap: String(e?.fap ?? 1),
    terceiros_percentual: String((e?.terceiros ?? 0.058) * 100),
    aliquota_encargos_percentual: e?.aliquota_encargos_folha == null ? '' : String(e.aliquota_encargos_folha * 100),
  }));

  const handleSave = () => {
    if (!empresaAtual?.id) return;
    const rat = Number(form.rat_percentual);
    const fap = Number(form.fap);
    const terceiros = Number(form.terceiros_percentual);
    const encargoEfetivo = form.aliquota_encargos_percentual === '' ? null : Number(form.aliquota_encargos_percentual);
    if (
      form.rat_percentual.trim() === '' ||
      !Number.isFinite(rat) ||
      rat < 0 ||
      rat > 3 ||
      form.fap.trim() === '' ||
      !Number.isFinite(fap) ||
      fap < 0 ||
      fap > 2 ||
      form.terceiros_percentual.trim() === '' ||
      !Number.isFinite(terceiros) ||
      terceiros < 0 ||
      terceiros > 20 ||
      (encargoEfetivo !== null && (!Number.isFinite(encargoEfetivo) || encargoEfetivo < 0 || encargoEfetivo > 100))
    ) {
      toast.error('Revise RAT, FAP, Terceiros e Encargo efetivo antes de salvar.');
      return;
    }
    if (form.regime_tributario === 'simples_nacional' && !form.simples_anexo && encargoEfetivo === null) {
      toast.error('Informe o Anexo do Simples ou uma alíquota efetiva revisada.');
      return;
    }
    const { rat_percentual, terceiros_percentual, aliquota_encargos_percentual, ...dadosCadastrais } = form;
    atualizarEmpresa.mutate({
      id: empresaAtual.id,
      ...dadosCadastrais,
      simples_anexo:
        form.regime_tributario === 'simples_nacional'
          ? ((form.simples_anexo || null) as 'I' | 'II' | 'III' | 'IV' | 'V' | null)
          : null,
      rat: percentToFraction(rat),
      fap,
      terceiros: percentToFraction(terceiros),
      aliquota_encargos_folha: encargoEfetivo === null ? null : percentToFraction(encargoEfetivo),
    });
  };

  if (loadingEmpresas)
    return (
      <div className="p-8 flex justify-center">
        <Spinner />
      </div>
    );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
        <div className="h-[2px] bg-gradient-to-r from-primary to-primary-glow" />
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Dados da Empresa
          </CardTitle>
          <CardDescription className="font-body">Informações cadastrais e fiscais da organização ativa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Razão Social</Label>
              <Input
                value={form.razao_social}
                onChange={(e) => setForm((p) => ({ ...p, razao_social: e.target.value }))}
                placeholder="Razão Social"
              />
            </div>
            <div className="space-y-2">
              <Label>Nome Fantasia</Label>
              <Input
                value={form.nome_fantasia}
                onChange={(e) => setForm((p) => ({ ...p, nome_fantasia: e.target.value }))}
                placeholder="Nome Fantasia"
              />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input
                value={form.cnpj}
                onChange={(e) => setForm((p) => ({ ...p, cnpj: e.target.value }))}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Inscrição Estadual</Label>
                <Input
                  value={form.inscricao_estadual}
                  onChange={(e) => setForm((p) => ({ ...p, inscricao_estadual: e.target.value }))}
                  placeholder="IE"
                />
              </div>
              <div className="space-y-2">
                <Label>Inscrição Municipal</Label>
                <Input
                  value={form.inscricao_municipal}
                  onChange={(e) => setForm((p) => ({ ...p, inscricao_municipal: e.target.value }))}
                  placeholder="IM"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>E-mail Corporativo</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="email@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={form.telefone}
                onChange={(e) => setForm((p) => ({ ...p, telefone: e.target.value }))}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="grid grid-cols-4 gap-3 md:col-span-2">
              <div className="col-span-3 space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={form.cidade}
                  onChange={(e) => setForm((p) => ({ ...p, cidade: e.target.value }))}
                  placeholder="Cidade"
                />
              </div>
              <div className="space-y-2">
                <Label>UF</Label>
                <Input
                  value={form.uf}
                  onChange={(e) => setForm((p) => ({ ...p, uf: e.target.value.toUpperCase() }))}
                  maxLength={2}
                  placeholder="UF"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Regime tributário</Label>
              <Select
                value={form.regime_tributario}
                onValueChange={(value: RegimeTributario) => setForm((p) => ({ ...p, regime_tributario: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REGIMES_OPTIONS.map((regime) => (
                    <SelectItem key={regime.value} value={regime.value}>
                      {regime.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.regime_tributario === 'simples_nacional' && (
              <div className="space-y-2">
                <Label>Anexo do Simples</Label>
                <Select
                  value={form.simples_anexo}
                  onValueChange={(value) => setForm((p) => ({ ...p, simples_anexo: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o anexo" />
                  </SelectTrigger>
                  <SelectContent>
                    {['I', 'II', 'III', 'IV', 'V'].map((anexo) => (
                      <SelectItem key={anexo} value={anexo}>
                        Anexo {anexo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:col-span-2">
              <div className="space-y-2">
                <Label>RAT (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="3"
                  step="0.01"
                  value={form.rat_percentual}
                  onChange={(e) => setForm((p) => ({ ...p, rat_percentual: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>FAP</Label>
                <Input
                  type="number"
                  min="0"
                  max="2"
                  step="0.0001"
                  value={form.fap}
                  onChange={(e) => setForm((p) => ({ ...p, fap: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Terceiros (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="20"
                  step="0.01"
                  value={form.terceiros_percentual}
                  onChange={(e) => setForm((p) => ({ ...p, terceiros_percentual: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Encargo efetivo (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.aliquota_encargos_percentual}
                  onChange={(e) => setForm((p) => ({ ...p, aliquota_encargos_percentual: e.target.value }))}
                  placeholder="Regra automática"
                />
              </div>
            </div>
          </div>
          <div className="pt-2">
            <Button
              onClick={handleSave}
              disabled={atualizarEmpresa.isPending}
              className="rounded-xl shadow-glow gap-2 min-w-[140px]"
            >
              {atualizarEmpresa.isPending ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
              Salvar Alterações
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
