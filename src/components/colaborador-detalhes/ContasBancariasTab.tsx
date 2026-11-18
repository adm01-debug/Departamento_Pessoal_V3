import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Landmark, Pencil, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveBankBrand } from '@/lib/bankBrand';
import { toast } from 'sonner';
import {
  useAtualizarContaBancaria,
  useContasBancarias,
  useCriarContaBancaria,
  useExcluirContaBancaria,
} from '@/hooks/useTabelasReferencia';
import { usePiiMask } from '@/hooks/usePiiMask';

const TIPOS_CONTA = ['Corrente', 'Poupança', 'Salário'];
const TIPOS_PIX = ['CPF', 'CNPJ', 'Email', 'Telefone', 'Chave aleatória'];

const FORM_VAZIO = {
  banco_codigo: '',
  banco_nome: '',
  agencia: '',
  conta: '',
  tipo_conta: 'Corrente',
  pix_tipo: '',
  pix_chave: '',
  principal: false,
};

/** Selo de identidade do banco — resgatado da branch `muri` (PR #546), sem os
 * assets de logo: a caixa mostra a sigla curta sobre a cor oficial, que é o
 * caminho que o próprio autor desenhou como fallback em `bankBrand.ts`. Banco
 * não reconhecido cai no ícone neutro, nunca na marca de outro banco. O motivo
 * de não trazer as imagens está medido no cabeçalho de src/lib/bankBrand.ts. */
function BancoLogo({ codigo, nome }: { codigo?: string | null; nome?: string | null }) {
  const brand = resolveBankBrand(codigo, nome);

  if (!brand.isKnown) {
    return (
      <div
        className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center bg-muted text-muted-foreground"
        title={nome || 'Banco não identificado'}
      >
        <Landmark className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'h-9 w-9 shrink-0 rounded-xl flex items-center justify-center font-bold text-[10px] leading-none tracking-tight',
        brand.bg,
        brand.text ?? 'text-white'
      )}
      title={brand.name}
    >
      {brand.shortLabel}
    </div>
  );
}

export function ContasBancariasTab({ colaboradorId }: { colaboradorId: string }) {
  const pii = usePiiMask();
  const { data, isLoading } = useContasBancarias(colaboradorId);
  const criar = useCriarContaBancaria();
  const atualizar = useAtualizarContaBancaria();
  const excluir = useExcluirContaBancaria(colaboradorId);
  const [open, setOpen] = useState(false);
  /** id da conta em edição; `null` = o diálogo está cadastrando uma nova. */
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);

  const fechar = () => {
    setOpen(false);
    setEditandoId(null);
    setForm(FORM_VAZIO);
  };

  const handleSubmit = async () => {
    if (!form.banco_nome.trim()) {
      toast.error('Nome do banco é obrigatório');
      return;
    }
    if (!form.agencia.trim()) {
      toast.error('Agência é obrigatória');
      return;
    }
    if (!form.conta.trim()) {
      toast.error('Conta é obrigatória');
      return;
    }
    try {
      if (editandoId) {
        await atualizar.mutateAsync({ id: editandoId, dados: form });
        toast.success('Conta bancária atualizada');
      } else {
        await criar.mutateAsync({ ...form, colaborador_id: colaboradorId });
        toast.success('Conta bancária adicionada');
      }
      fechar();
    } catch (erro) {
      // A guarda de empresa do hook devolve uma mensagem acionável ("Selecione
      // uma empresa..."); mostrá-la é melhor que o texto genérico.
      toast.error(
        erro instanceof Error ? erro.message : editandoId ? 'Erro ao salvar conta' : 'Erro ao adicionar conta'
      );
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Contas Bancárias</CardTitle>
        <Dialog open={open} onOpenChange={(aberto) => (aberto ? setOpen(true) : fechar())}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editandoId ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Código Banco</Label>
                  <Input
                    value={form.banco_codigo}
                    onChange={(e) => setForm((f) => ({ ...f, banco_codigo: e.target.value }))}
                    placeholder="001"
                  />
                </div>
                <div>
                  <Label>Nome Banco *</Label>
                  <Input
                    value={form.banco_nome}
                    onChange={(e) => setForm((f) => ({ ...f, banco_nome: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Agência *</Label>
                  <Input value={form.agencia} onChange={(e) => setForm((f) => ({ ...f, agencia: e.target.value }))} />
                </div>
                <div>
                  <Label>Conta *</Label>
                  <Input value={form.conta} onChange={(e) => setForm((f) => ({ ...f, conta: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Tipo de Conta</Label>
                <Select value={form.tipo_conta} onValueChange={(v) => setForm((f) => ({ ...f, tipo_conta: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_CONTA.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo PIX</Label>
                <Select value={form.pix_tipo} onValueChange={(v) => setForm((f) => ({ ...f, pix_tipo: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_PIX.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.pix_tipo && (
                <div>
                  <Label>Chave PIX</Label>
                  <Input
                    value={form.pix_chave}
                    onChange={(e) => setForm((f) => ({ ...f, pix_chave: e.target.value }))}
                  />
                </div>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.principal}
                  onChange={(e) => setForm((f) => ({ ...f, principal: e.target.checked }))}
                />
                Conta principal
              </label>
              <Button onClick={handleSubmit} disabled={criar.isPending || atualizar.isPending}>
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Spinner />
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Banco</TableHead>
                <TableHead>Agência</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>PIX</TableHead>
                <TableHead>Principal</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <BancoLogo codigo={c.banco_codigo} nome={c.banco_nome} />
                      <span>
                        {c.banco_nome} {c.banco_codigo ? `(${c.banco_codigo})` : ''}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{pii.bankAccount(c.agencia)}</TableCell>
                  <TableCell>{pii.bankAccount(c.conta)}</TableCell>
                  <TableCell>{c.tipo_conta}</TableCell>
                  <TableCell>{c.pix_tipo ? `${c.pix_tipo}: ${pii.pix(c.pix_tipo, c.pix_chave)}` : '-'}</TableCell>
                  <TableCell>{c.principal ? <Badge>Sim</Badge> : 'Não'}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Editar conta"
                      // O formulário exibe agência/conta/chave PIX sem máscara:
                      // quem não pode ver o dado bancário não pode abri-lo.
                      disabled={!pii.canViewPii}
                      onClick={() => {
                        // O formulário recebe os valores REAIS da conta (não os
                        // mascarados da tabela): editar não pode gravar "****".
                        setForm({
                          banco_codigo: c.banco_codigo ?? '',
                          banco_nome: c.banco_nome ?? '',
                          agencia: c.agencia ?? '',
                          conta: c.conta ?? '',
                          tipo_conta: c.tipo_conta ?? 'Corrente',
                          pix_tipo: c.pix_tipo ?? '',
                          pix_chave: c.pix_chave ?? '',
                          principal: !!c.principal,
                        });
                        setEditandoId(c.id);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Excluir conta"
                      onClick={() => {
                        if (confirm('Excluir conta?')) excluir.mutate(c.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
