import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useOnMount } from '@/hooks/useMountEffects';
import { motion } from 'framer-motion';
import { Building2, Save } from 'lucide-react';

export function EmpresaSettingsTab() {
  const { empresaAtual, atualizarEmpresa, loadingEmpresas } = useEmpresas();
  const [form, setForm] = useState({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    inscricao_estadual: '',
    inscricao_municipal: '',
    cidade: '',
    uf: '',
    email: '',
    telefone: ''});

  useOnMount(() => {
    if (empresaAtual) {
      setForm({
        razao_social: empresaAtual.razao_social || '',
        nome_fantasia: empresaAtual.nome_fantasia || '',
        cnpj: empresaAtual.cnpj || '',
        inscricao_estadual: empresaAtual.inscricao_estadual || '',
        inscricao_municipal: empresaAtual.inscricao_municipal || '',
        cidade: empresaAtual.cidade || '',
        uf: empresaAtual.uf || '',
        email: empresaAtual.email || '',
        telefone: empresaAtual.telefone || ''});
    }
  });

  useEffect(() => {
    if (empresaAtual) {
      setForm({
        razao_social: empresaAtual.razao_social || '',
        nome_fantasia: empresaAtual.nome_fantasia || '',
        cnpj: empresaAtual.cnpj || '',
        inscricao_estadual: empresaAtual.inscricao_estadual || '',
        inscricao_municipal: empresaAtual.inscricao_municipal || '',
        cidade: empresaAtual.cidade || '',
        uf: empresaAtual.uf || '',
        email: empresaAtual.email || '',
        telefone: empresaAtual.telefone || ''});
    }
  }, [empresaAtual]);

  const handleSave = () => {
    if (!empresaAtual?.id) return;
    atualizarEmpresa.mutate({
      id: empresaAtual.id,
      ...form});
  };

  if (loadingEmpresas) return <div className="p-8 flex justify-center"><Spinner /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
        <div className="h-[2px] bg-gradient-to-r from-primary to-primary-glow" />
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Dados da Empresa
          </CardTitle>
          <CardDescription className="font-body">
            Informações cadastrais e fiscais da organização ativa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Razão Social</Label>
              <Input 
                value={form.razao_social} 
                onChange={(e) => setForm(p => ({ ...p, razao_social: e.target.value }))}
                placeholder="Razão Social"
              />
            </div>
            <div className="space-y-2">
              <Label>Nome Fantasia</Label>
              <Input 
                value={form.nome_fantasia} 
                onChange={(e) => setForm(p => ({ ...p, nome_fantasia: e.target.value }))}
                placeholder="Nome Fantasia"
              />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input 
                value={form.cnpj} 
                onChange={(e) => setForm(p => ({ ...p, cnpj: e.target.value }))}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Inscrição Estadual</Label>
                <Input 
                  value={form.inscricao_estadual} 
                  onChange={(e) => setForm(p => ({ ...p, inscricao_estadual: e.target.value }))}
                  placeholder="IE"
                />
              </div>
              <div className="space-y-2">
                <Label>Inscrição Municipal</Label>
                <Input 
                  value={form.inscricao_municipal} 
                  onChange={(e) => setForm(p => ({ ...p, inscricao_municipal: e.target.value }))}
                  placeholder="IM"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>E-mail Corporativo</Label>
              <Input 
                type="email"
                value={form.email} 
                onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="email@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input 
                value={form.telefone} 
                onChange={(e) => setForm(p => ({ ...p, telefone: e.target.value }))}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="grid grid-cols-4 gap-3 md:col-span-2">
              <div className="col-span-3 space-y-2">
                <Label>Cidade</Label>
                <Input 
                  value={form.cidade} 
                  onChange={(e) => setForm(p => ({ ...p, cidade: e.target.value }))}
                  placeholder="Cidade"
                />
              </div>
              <div className="space-y-2">
                <Label>UF</Label>
                <Input 
                  value={form.uf} 
                  onChange={(e) => setForm(p => ({ ...p, uf: e.target.value.toUpperCase() }))}
                  maxLength={2}
                  placeholder="UF"
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
