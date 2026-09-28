import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnimatedCascadeDialog } from '@/components/ui/animated-cascade-dialog';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, Pencil, Eye, EyeOff, AlertTriangle, Landmark, ShieldCheck, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useContasBancarias, useCriarContaBancaria, useAtualizarContaBancaria, useExcluirContaBancaria } from '@/hooks/useTabelasReferencia';
import { maskBankAccount, maskPixKey } from '@/utils/piiMask';
import { cn } from '@/lib/utils';
import { resolveBankBrand } from '@/lib/bankBrand';

const MotionCard = motion.create(Card);

const TIPOS_CONTA = ['Corrente', 'Poupança', 'Salário'];
const TIPOS_PIX = ['CPF', 'CNPJ', 'Email', 'Telefone', 'Chave aleatória'];

const LOGO_SIZE_CLASSES = { sm: 'h-9 w-9', md: 'h-11 w-11' } as const;

/** Único ponto de renderização da identidade visual de um banco — sempre
 * resolvida a partir do código/nome da conta (`resolveBankBrand`), nunca
 * escolhida manualmente. Ordem: símbolo oficial compacto (`logoSrc`, só
 * quando também `verified: true` — ver auditoria de fontes em
 * src/assets/banks/SOURCES.md) → sigla + cor (banco conhecido sem símbolo
 * verificado ainda) → ícone neutro (banco fora do catálogo). Nunca a marca
 * de outro banco. Usado tanto na lista de contas quanto no preview do
 * formulário de criar/editar, para nunca duplicar essa lógica.
 *
 * `logoSrc` só existe para bancos cujo asset confirmado já é um símbolo/
 * monograma/app icon compacto (sem o nome escrito por extenso ao lado) —
 * por isso a caixa continua quadrada (`sm` 36×36 no formulário, `md` 44×44
 * nos cards da lista), igual à dos fallbacks; nenhum logo precisa de mais
 * largura. */
function BancoLogo({ codigo, nome, size = 'sm' }: { codigo?: string | null; nome?: string | null; size?: keyof typeof LOGO_SIZE_CLASSES }) {
  const brand = resolveBankBrand(codigo, nome);
  const sizeClass = LOGO_SIZE_CLASSES[size];

  if (brand.logoSrc && brand.verified) {
    return (
      <div
        className={cn(
          sizeClass, 'rounded-xl overflow-hidden flex items-center justify-center shrink-0',
          brand.logoBg === 'light' ? 'bg-white p-1.5' : 'p-1'
        )}
        title={brand.name}
      >
        <img src={brand.logoSrc} alt={brand.name} className="h-full w-full object-contain" />
      </div>
    );
  }

  if (!brand.isKnown) {
    return (
      <div className={cn(sizeClass, 'rounded-xl overflow-hidden flex items-center justify-center shrink-0 bg-muted text-muted-foreground')} title={nome || 'Banco não identificado'}>
        <Landmark className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        sizeClass, 'rounded-xl overflow-hidden flex items-center justify-center shrink-0 font-display font-bold text-[10px] leading-none tracking-tight',
        brand.bg, brand.text ?? 'text-white'
      )}
      title={brand.name}
    >
      {brand.shortLabel}
    </div>
  );
}

const FORM_INICIAL = {
  banco_codigo: '', banco_nome: '', agencia: '', agencia_digito: '', conta: '', digito: '',
  tipo_conta: 'Corrente', pix_tipo: '', pix_chave: '', principal: false,
};

type ContaForm = typeof FORM_INICIAL;

/** Campos do formulário — reaproveitado pelos dialogs de criar e editar, que
 * só diferem no título e na mutation disparada ao salvar. */
function ContaFormFields({ form, setForm }: { form: ContaForm; setForm: (updater: (f: ContaForm) => ContaForm) => void }) {
  const bankNameOrPlaceholder = form.banco_nome || 'Nome do banco';
  const bankHint = resolveBankBrand(form.banco_codigo, form.banco_nome).isKnown
    ? 'Logo identificado automaticamente'
    : 'Banco não identificado — ícone padrão será usado';

  return (
    <div className="grid gap-3">
      {/* Preview da identidade visual — só reflete o que o código/nome
          resolvem no catálogo (resolveBankBrand); não existe campo pra
          escolher a imagem manualmente. Linha inline (Quiet Compact UI) em
          vez de bloco tipo card. */}
      <div className="flex items-center gap-2.5 px-0.5">
        <BancoLogo codigo={form.banco_codigo} nome={form.banco_nome} />
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">{bankNameOrPlaceholder}</p>
          <p className="text-[10px] text-muted-foreground">{bankHint}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Código Banco</Label><Input value={form.banco_codigo} onChange={e => setForm(f => ({ ...f, banco_codigo: e.target.value }))} placeholder="001" /></div>
        <div><Label>Nome Banco *</Label><Input value={form.banco_nome} onChange={e => setForm(f => ({ ...f, banco_nome: e.target.value }))} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2"><Label>Agência *</Label><Input value={form.agencia} onChange={e => setForm(f => ({ ...f, agencia: e.target.value }))} /></div>
        <div><Label>Dígito da agência</Label><Input value={form.agencia_digito} onChange={e => setForm(f => ({ ...f, agencia_digito: e.target.value }))} placeholder="Opcional" maxLength={2} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2"><Label>Conta *</Label><Input value={form.conta} onChange={e => setForm(f => ({ ...f, conta: e.target.value }))} /></div>
        <div><Label>Dígito da conta</Label><Input value={form.digito} onChange={e => setForm(f => ({ ...f, digito: e.target.value }))} placeholder="Opcional" maxLength={2} /></div>
      </div>
      <div><Label>Tipo de Conta</Label>
        <Select value={form.tipo_conta} onValueChange={v => setForm(f => ({ ...f, tipo_conta: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{TIPOS_CONTA.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Tipo PIX</Label>
        <Select value={form.pix_tipo} onValueChange={v => setForm(f => ({ ...f, pix_tipo: v }))}>
          <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
          <SelectContent>{TIPOS_PIX.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {form.pix_tipo && <div><Label>Chave PIX</Label><Input value={form.pix_chave} onChange={e => setForm(f => ({ ...f, pix_chave: e.target.value }))} /></div>}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.principal} onChange={e => setForm(f => ({ ...f, principal: e.target.checked }))} />
        Conta principal
      </label>
    </div>
  );
}

/** Card horizontal de uma conta bancária — usado tanto para a conta principal
 * (com destaque de borda/glow e badge) quanto para as demais. Único ponto de
 * apresentação da conta: dados, mascaramento e ações continuam vindo de fora
 * (mesma fonte/lógica de sempre), este componente só monta o layout. */
function ContaCard({
  conta, revelado, onToggleRevelado, onEditar, onExcluir,
}: {
  conta: any; revelado: boolean; onToggleRevelado: () => void; onEditar: () => void; onExcluir: () => void;
}) {
  const agenciaExibida = `${revelado ? conta.agencia : maskBankAccount(conta.agencia)}${conta.agencia_digito ? `-${conta.agencia_digito}` : ''}`;
  const contaExibida = `${revelado ? conta.conta : maskBankAccount(conta.conta)}${conta.digito ? `-${conta.digito}` : ''}`;

  return (
    <div
      className={cn(
        'rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 transition-colors',
        conta.principal ? 'border border-primary/40 bg-primary/5 shadow-glow' : 'border-2 border-border'
      )}
    >
      {/* Identificação — logo + nome + código, badge "Principal" ao lado do nome */}
      <div className="flex items-center gap-3 sm:w-64 shrink-0">
        <BancoLogo codigo={conta.banco_codigo} nome={conta.banco_nome} size="md" />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-medium truncate">{conta.banco_nome}</p>
            {conta.principal && (
              <Badge size="sm" className="gap-1 shrink-0">
                <Star className="h-2.5 w-2.5 fill-current" /> Principal
              </Badge>
            )}
          </div>
          {conta.banco_codigo && <p className="text-xs text-muted-foreground leading-tight">({conta.banco_codigo})</p>}
        </div>
      </div>

      <div className="hidden sm:block w-px self-stretch bg-border/50" />

      {/* Dados bancários — mesmo mascaramento/toggle de revelação de sempre */}
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm text-muted-foreground flex items-center flex-wrap gap-x-1.5">
          <span>{conta.tipo_conta}</span>
          <span aria-hidden="true">•</span>
          <span>Ag. {agenciaExibida}</span>
          <span aria-hidden="true">•</span>
          <span className="inline-flex items-center gap-1">
            Conta {contaExibida}
            <button type="button" onClick={onToggleRevelado} className="text-muted-foreground hover:text-foreground shrink-0" aria-label={revelado ? 'Ocultar conta' : 'Revelar conta'}>
              {revelado ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </button>
          </span>
        </p>
        {conta.pix_tipo && (
          <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
            PIX: {conta.pix_tipo}: {revelado ? conta.pix_chave : maskPixKey(conta.pix_chave)}
            <button type="button" onClick={onToggleRevelado} className="text-muted-foreground hover:text-foreground shrink-0" aria-label={revelado ? 'Ocultar PIX' : 'Revelar PIX'}>
              {revelado ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </button>
          </p>
        )}
      </div>

      {/* Ações — Editar + excluir direto */}
      <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
        <Button variant="outline" size="sm" className="h-8 px-3 text-xs rounded-lg gap-1.5" onClick={onEditar}>
          <Pencil className="h-3.5 w-3.5" /> Editar
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
          aria-label="Excluir conta"
          onClick={onExcluir}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function ContasBancariasTab({ colaboradorId }: { colaboradorId: string }) {
  const { data, isLoading } = useContasBancarias(colaboradorId);
  const criar = useCriarContaBancaria();
  const atualizar = useAtualizarContaBancaria();
  const excluir = useExcluirContaBancaria(colaboradorId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ContaForm>(FORM_INICIAL);

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ContaForm>(FORM_INICIAL);

  // Ids com agência/conta/PIX revelados por completo (sem máscara) — só
  // local, sem persistir e sem expor nada que a query já não tenha trazido.
  const [revelados, setRevelados] = useState<Set<string>>(new Set());
  const toggleRevelado = (id: string) => setRevelados(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const jaTemPrincipal = Array.isArray(data) && data.some((c: any) => c.principal);
  const principalCount = Array.isArray(data) ? data.filter((c: any) => c.principal).length : 0;

  const handleSubmit = async () => {
    if (!form.banco_nome.trim()) { toast.error('Nome do banco é obrigatório'); return; }
    if (!form.agencia.trim()) { toast.error('Agência é obrigatória'); return; }
    if (!form.conta.trim()) { toast.error('Conta é obrigatória'); return; }
    // Checagem no cliente para feedback imediato — o service repete essa
    // validação (é a barreira que realmente vale, contra chamadas diretas ou
    // concorrentes). Nunca desmarca a conta principal existente.
    if (form.principal && jaTemPrincipal) {
      toast.error('Este colaborador já possui uma conta bancária principal.');
      return;
    }
    try {
      await criar.mutateAsync({ ...form, colaborador_id: colaboradorId });
      toast.success('Conta bancária adicionada');
      setOpen(false);
      setForm(FORM_INICIAL);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao adicionar conta');
    }
  };

  const abrirEdicao = (c: any) => {
    setEditForm({
      banco_codigo: c.banco_codigo ?? '', banco_nome: c.banco_nome ?? '',
      agencia: c.agencia ?? '', agencia_digito: c.agencia_digito ?? '',
      conta: c.conta ?? '', digito: c.digito ?? '',
      tipo_conta: c.tipo_conta ?? 'Corrente', pix_tipo: c.pix_tipo ?? '', pix_chave: c.pix_chave ?? '',
      principal: !!c.principal,
    });
    setEditId(c.id);
  };

  const handleSalvarEdicao = async () => {
    if (!editId) return;
    if (!editForm.banco_nome.trim()) { toast.error('Nome do banco é obrigatório'); return; }
    if (!editForm.agencia.trim()) { toast.error('Agência é obrigatória'); return; }
    if (!editForm.conta.trim()) { toast.error('Conta é obrigatória'); return; }
    if (editForm.principal && jaTemPrincipal && !data?.find((c: any) => c.id === editId)?.principal) {
      toast.error('Este colaborador já possui uma conta bancária principal.');
      return;
    }
    try {
      await atualizar.mutateAsync({ id: editId, dados: editForm });
      toast.success('Conta bancária atualizada');
      setEditId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar conta');
    }
  };

  const principal = Array.isArray(data) ? data.find((c: any) => c.principal) : undefined;
  const outras = Array.isArray(data) ? data.filter((c: any) => !c.principal) : [];

  return (
    // Sem altura fixa: o card cresce com o conteúdo (nº de contas). No grid
    // "financeiro" da página de detalhes ele fica ao lado do card "Resumo da
    // remuneração" com `items-start`, então alturas diferentes entre os dois
    // não quebram o layout — só deixam de ficar visualmente niveladas.
    <MotionCard
      custom={4}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated"
    >
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Cabeçalho — ícone + título/subtítulo à esquerda, ação à direita */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 * 0.15, duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-start justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Landmark className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-medium text-sm leading-tight">Contas Bancárias</h3>
              <p className="text-xs text-muted-foreground leading-tight">Dados bancários utilizados para pagamento do colaborador.</p>
            </div>
          </div>
          <Button size="sm" className="h-8 px-3 text-xs rounded-xl shrink-0" onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" />Adicionar conta
          </Button>
        </motion.div>

        {/* Banner de segurança */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 * 0.15, duration: 0.5 }}
          className="flex items-center gap-2 rounded-lg border border-info/20 bg-info/5 px-3 py-2"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-info shrink-0" />
          <p className="text-xs text-info">Seus dados estão protegidos e são exibidos parcialmente por segurança.</p>
        </motion.div>

        <AnimatedCascadeDialog
          open={open}
          onOpenChange={setOpen}
          title="Nova Conta Bancária"
          titleIcon={Landmark}
          emptyMessage=""
          className="max-w-[500px]"
          items={[
            <div key="form" className="space-y-3">
              <ContaFormFields form={form} setForm={setForm} />
              <div className="flex justify-end pt-1">
                <Button size="sm" className="rounded-lg px-4" onClick={handleSubmit} disabled={criar.isPending}>Salvar</Button>
              </div>
            </div>,
          ]}
        />

        {isLoading ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2 * 0.15, duration: 0.5 }} className="flex items-center justify-center py-6">
            <Spinner />
          </motion.div>
        ) : !data?.length ? (
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2 * 0.15, duration: 0.5 }} className="text-sm text-muted-foreground">
            Nenhuma conta cadastrada.
          </motion.p>
        ) : (
          <>
            {principalCount === 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2 * 0.15, duration: 0.5 }}>
                <Alert className="py-2.5">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Nenhuma conta principal definida. O colaborador poderá ser ignorado nas remessas de pagamento.
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
            {principalCount > 1 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2 * 0.15, duration: 0.5 }}>
                <Alert variant="destructive" className="py-2.5">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Mais de uma conta principal encontrada ({principalCount}). Revise os dados antes de gerar pagamentos.
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            {principal && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 3 * 0.15, duration: 0.5 }}
                className="space-y-2.5"
              >
                <div>
                  <p className="text-sm font-medium leading-tight flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 text-primary fill-current" /> Conta principal
                  </p>
                  <p className="text-xs text-muted-foreground leading-tight mt-0.5">Esta é a conta padrão para recebimento do salário.</p>
                </div>
                <ContaCard
                  conta={principal}
                  revelado={revelados.has(principal.id)}
                  onToggleRevelado={() => toggleRevelado(principal.id)}
                  onEditar={() => abrirEdicao(principal)}
                  onExcluir={() => { if (confirm('Excluir conta?')) excluir.mutate(principal.id); }}
                />
              </motion.div>
            )}

            {outras.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 4 * 0.15, duration: 0.5 }}
                className="space-y-2.5 pt-1"
              >
                <div>
                  <p className="text-sm font-medium leading-tight">Outras contas</p>
                  <p className="text-xs text-muted-foreground leading-tight mt-0.5">Contas adicionais do colaborador.</p>
                </div>
                <div className="space-y-2.5">
                  {outras.map((c: any) => (
                    <ContaCard
                      key={c.id}
                      conta={c}
                      revelado={revelados.has(c.id)}
                      onToggleRevelado={() => toggleRevelado(c.id)}
                      onEditar={() => abrirEdicao(c)}
                      onExcluir={() => { if (confirm('Excluir conta?')) excluir.mutate(c.id); }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}
      </CardContent>

      <AnimatedCascadeDialog
        open={!!editId}
        onOpenChange={(v) => { if (!v) setEditId(null); }}
        title="Editar Conta Bancária"
        titleIcon={Landmark}
        emptyMessage=""
        className="max-w-[500px]"
        items={[
          <div key="form" className="space-y-3">
            <ContaFormFields form={editForm} setForm={setEditForm} />
            <div className="flex justify-end pt-1">
              <Button size="sm" className="rounded-lg px-4" onClick={handleSalvarEdicao} disabled={atualizar.isPending}>Salvar alterações</Button>
            </div>
          </div>,
        ]}
      />
    </MotionCard>
  );
}
