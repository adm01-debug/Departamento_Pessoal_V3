import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AnimatedCascadeDialog } from '@/components/ui/animated-cascade-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, Pencil, Eye, EyeOff, AlertTriangle, Landmark } from 'lucide-react';
import { toast } from 'sonner';
import { useContasBancarias, useCriarContaBancaria, useAtualizarContaBancaria, useExcluirContaBancaria } from '@/hooks/useTabelasReferencia';
import { maskBankAccount, maskPixKey } from '@/utils/piiMask';
import { cn } from '@/lib/utils';
import { resolveBankBrand } from '@/lib/bankBrand';

const MotionCard = motion.create(Card);

const TIPOS_CONTA = ['Corrente', 'Poupança', 'Salário'];
const TIPOS_PIX = ['CPF', 'CNPJ', 'Email', 'Telefone', 'Chave aleatória'];

/** Único ponto de renderização da identidade visual de um banco — sempre
 * resolvida a partir do código/nome da conta (`resolveBankBrand`), nunca
 * escolhida manualmente. Ordem: símbolo oficial compacto (`logoSrc`, só
 * quando também `verified: true` — ver auditoria de fontes em
 * src/assets/banks/SOURCES.md) → sigla + cor (banco conhecido sem símbolo
 * verificado ainda) → ícone neutro (banco fora do catálogo). Nunca a marca
 * de outro banco. Usado tanto na tabela quanto no preview do formulário de
 * criar/editar, para nunca duplicar essa lógica.
 *
 * `logoSrc` só existe para bancos cujo asset confirmado já é um símbolo/
 * monograma/app icon compacto (sem o nome escrito por extenso ao lado) —
 * por isso a caixa continua quadrada 36×36, igual à dos fallbacks; nenhum
 * logo precisa de mais largura. */
function BancoLogo({ codigo, nome }: { codigo?: string | null; nome?: string | null }) {
  const brand = resolveBankBrand(codigo, nome);

  if (brand.logoSrc && brand.verified) {
    return (
      <div
        className={cn(
          'h-9 w-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0',
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
      <div className="h-9 w-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0 bg-muted text-muted-foreground" title={nome || 'Banco não identificado'}>
        <Landmark className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'h-9 w-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0 font-display font-bold text-[10px] leading-none tracking-tight',
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

  return (
    // Altura fixa calculada pra bater exatamente com a altura renderizada do
    // card "Resumo da remuneração" ao lado (que fica com sua própria altura
    // 100% intocada — sem h-full, sem items-stretch): CardContent p-4 (32px)
    // + linha de título text-sm/mb-1 (24px) + 4× LinhaResumo py-2 com border-b
    // (37px cada, exceto a última sem borda, 36px) + 2px de border do Card =
    // 205px. Não reaproveitar h-full aqui — o grid pai usa items-start, então
    // só uma altura explícita replica esse valor. O conteúdo (alertas +
    // tabela) rola por dentro em vez de esticar o card quando há mais contas.
    <MotionCard
      custom={4}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated h-[205px] flex flex-col"
    >
      <CardHeader className="flex flex-row items-center justify-between px-4 py-3.5 space-y-0 border-b border-border/20 shrink-0">
        <CardTitle className="text-sm font-display font-medium flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" /> Contas Bancárias
        </CardTitle>
        <Button size="sm" className="h-7 px-3 text-xs rounded-xl" onClick={() => setOpen(true)}><Plus className="mr-1 h-3.5 w-3.5" />Adicionar</Button>
      </CardHeader>

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
      <CardContent className="p-4 flex-1 min-h-0 overflow-y-auto">
        {isLoading ? <div className="flex items-center justify-center py-6"><Spinner /></div> : !data?.length ? <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada.</p> : (
          <>
            {principalCount === 0 && (
              <Alert className="mb-3 py-2.5">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Nenhuma conta principal definida. O colaborador poderá ser ignorado nas remessas de pagamento.
                </AlertDescription>
              </Alert>
            )}
            {principalCount > 1 && (
              <Alert variant="destructive" className="mb-3 py-2.5">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Mais de uma conta principal encontrada ({principalCount}). Revise os dados antes de gerar pagamentos.
                </AlertDescription>
              </Alert>
            )}
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent">
              <TableHead className="h-7 px-2 text-[11px]">Banco</TableHead>
              <TableHead className="h-7 px-2 text-[11px] text-center">Agência</TableHead>
              <TableHead className="h-7 px-2 text-[11px] text-center">Conta</TableHead>
              <TableHead className="h-7 px-2 text-[11px] text-center">Tipo</TableHead>
              <TableHead className="h-7 px-2 text-[11px] text-center">PIX</TableHead>
              <TableHead className="h-7 px-2 text-[11px] text-center">Principal</TableHead>
              <TableHead className="h-7 px-2 text-[11px] text-center">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.map((c: any) => {
                const rev = revelados.has(c.id);
                return (
                  <TableRow key={c.id} className="hover:bg-background/70 transition-colors">
                    <TableCell className="px-2 py-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <BancoLogo codigo={c.banco_codigo} nome={c.banco_nome} />
                        <div className="min-w-0">
                          <p className="text-xs font-medium leading-tight truncate">{c.banco_nome}</p>
                          {c.banco_codigo && <p className="text-[10px] text-muted-foreground leading-tight">({c.banco_codigo})</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-xs whitespace-nowrap text-center">
                      {rev ? c.agencia : maskBankAccount(c.agencia)}{c.agencia_digito ? `-${c.agencia_digito}` : ''}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-xs whitespace-nowrap text-center">
                      <span className="inline-flex items-center justify-center gap-1">
                        {rev ? c.conta : maskBankAccount(c.conta)}{c.digito ? `-${c.digito}` : ''}
                        <button type="button" onClick={() => toggleRevelado(c.id)} className="text-muted-foreground hover:text-foreground shrink-0" aria-label={rev ? 'Ocultar conta' : 'Revelar conta'}>
                          {rev ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-xs text-center">{c.tipo_conta}</TableCell>
                    <TableCell className="px-2 py-1.5 text-xs text-center">
                      {c.pix_tipo ? (
                        <span className="inline-flex items-center justify-center gap-1">
                          {c.pix_tipo}: {rev ? c.pix_chave : maskPixKey(c.pix_chave)}
                          <button type="button" onClick={() => toggleRevelado(c.id)} className="text-muted-foreground hover:text-foreground shrink-0" aria-label={rev ? 'Ocultar PIX' : 'Revelar PIX'}>
                            {rev ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-center">{c.principal ? <Badge size="sm">Sim</Badge> : <span className="text-xs text-muted-foreground">Não</span>}</TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => abrirEdicao(c)} aria-label="Editar conta">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { if (confirm('Excluir conta?')) excluir.mutate(c.id); }} aria-label="Excluir conta">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </>
        )}
      </CardContent>

      <Dialog open={!!editId} onOpenChange={(v) => { if (!v) setEditId(null); }}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader><DialogTitle>Editar Conta Bancária</DialogTitle></DialogHeader>
          <ContaFormFields form={editForm} setForm={setEditForm} />
          <div className="flex justify-end pt-1">
            <Button size="sm" className="rounded-lg px-4" onClick={handleSalvarEdicao} disabled={atualizar.isPending}>Salvar alterações</Button>
          </div>
        </DialogContent>
      </Dialog>
    </MotionCard>
  );
}
