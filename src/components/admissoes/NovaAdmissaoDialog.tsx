import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X } from 'lucide-react';
import { useAdmissoes } from '@/hooks/useAdmissoes';
import {
  cascadeContainerVariants,
  cascadeItemVariants,
  cascadeOverlayVariants,
  cascadeShellVariants,
} from '@/components/ui/cascade-motion';

/**
 * A MESMA coreografia da janela "Pendências" (`ui/animated-cascade-dialog.tsx`;
 * fonte única em `ui/cascade-motion.ts`): véu `bg-black/60` + `backdrop-blur-sm`
 * entrando rápido, casca nascendo pequena "de dentro para fora" (estica as
 * laterais, depois a altura) e, só então, o conteúdo cascateando; no fechamento
 * tudo corre ao contrário e a caixa encolhe por último.
 *
 * `BLOCOS_CASCATA` = quantos pedaços cascateiam (cabeçalho, corpo, rodapé) — é
 * dele que sai o atraso do encolhimento. Mesmo valor e mesmo par de variants do
 * `DetalhesAdmissaoDialog` (a outra janela grande da mesma família).
 */
const BLOCOS_CASCATA = 3;
const SHELL_CASCATA = cascadeShellVariants(BLOCOS_CASCATA);
const OVERLAY_CASCATA = cascadeOverlayVariants(BLOCOS_CASCATA);

/** `DialogHeader` animável — mesmo padrão do `DetalhesAdmissaoDialog`. */
const MotionDialogHeader = motion.create(DialogHeader);

const departamentos = [
  'Administrativo',
  'Comercial',
  'Contabilidade',
  'Financeiro',
  'Jurídico',
  'Marketing',
  'Operações',
  'RH',
  'TI',
  'Outro',
];

/** Formulário vazio (criar) ou preenchido com a admissão (editar). */
function formDe(admissao?: any | null) {
  return {
    nome: admissao?.nome ?? '',
    cargo: admissao?.cargo ?? '',
    departamento: admissao?.departamento ?? '',
    data_prevista: (admissao?.data_prevista ?? '').slice(0, 10),
    salario_proposto: admissao?.salario_proposto != null ? String(admissao.salario_proposto) : '',
    email: admissao?.email ?? '',
    telefone: admissao?.telefone ?? '',
    cpf: admissao?.cpf ?? '',
    observacoes: admissao?.observacoes ?? '',
  };
}

interface NovaAdmissaoDialogProps {
  children?: React.ReactNode;
  /**
   * Quando informado, o diálogo entra em MODO EDIÇÃO: preenche o mesmo
   * formulário com os dados da admissão e grava via `useAdmissoes().atualizar`
   * (mesmo service/regra da criação — nada de um segundo caminho de escrita).
   */
  admissao?: any | null;
  /**
   * Quando informado, o diálogo vira CONTROLADO e não renderiza trigger próprio:
   * é assim que a janela de detalhes abre a edição a partir de "Editar".
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Recebe os campos gravados após criar/editar (a janela de detalhes reflete). */
  onSaved?: (dados: Record<string, unknown>) => void;
}

export function NovaAdmissaoDialog({
  children,
  admissao = null,
  open: openProp,
  onOpenChange,
  onSaved,
}: NovaAdmissaoDialogProps) {
  const editando = !!admissao;
  const controlado = openProp !== undefined;
  const [openInterno, setOpenInterno] = useState(false);
  const open = controlado ? openProp : openInterno;
  const [loading, setLoading] = useState(false);
  const { criar, atualizar } = useAdmissoes();

  const [form, setForm] = useState(() => formDe(admissao));

  const setOpen = (valor: boolean) => {
    setOpenInterno(valor);
    onOpenChange?.(valor);
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.cargo || !form.departamento || !form.data_prevista || !form.salario_proposto) {
      return;
    }
    setLoading(true);
    try {
      const dados = {
        nome: form.nome,
        cargo: form.cargo,
        departamento: form.departamento,
        data_prevista: form.data_prevista,
        salario_proposto: parseFloat(form.salario_proposto),
        email: form.email || null,
        telefone: form.telefone || null,
        cpf: form.cpf || null,
        observacoes: form.observacoes || null,
      };
      if (editando) {
        await atualizar({ id: admissao.id, data: dados });
      } else {
        await criar(dados);
        setForm(formDe(null));
      }
      onSaved?.(dados);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  // Se a admissão em edição tem um departamento fora da lista fixa, ele entra
  // como opção para o Select não exibir o valor em branco.
  const opcoesDepartamento =
    form.departamento && !departamentos.includes(form.departamento)
      ? [form.departamento, ...departamentos]
      : departamentos;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      {!controlado && (
        <DialogPrimitive.Trigger asChild>
          {children || (
            <Button className="rounded-xl bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 shadow-lg font-body text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Nova Admissão
            </Button>
          )}
        </DialogPrimitive.Trigger>
      )}

      {/* RADIX + FRAMER na MESMA montagem do popup "Pendências" (`AnimatePresence`
          + `forceMount` mantêm a árvore viva no exit; variants de
          `ui/cascade-motion.ts`). Véu, casca, X e cascata são os MESMOS — o que
          muda é só o tamanho/layout desta janela, que são dela. */}
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                variants={OVERLAY_CASCATA}
                initial="closed"
                animate="open"
                exit="closed"
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] overflow-hidden border bg-background shadow-lg sm:rounded-lg"
                style={{ transformOrigin: 'top center' }}
                variants={SHELL_CASCATA}
                initial="closed"
                animate="open"
                exit="closed"
              >
                {/* CONTÊINER da cascata: cabeçalho, corpo e rodapé entram em
                    sequência (e somem de trás para frente). Carrega o `grid gap-3
                    p-5` que antes vivia no `DialogContent` — layout idêntico. */}
                <motion.div
                  className="grid max-h-[90vh] gap-3 overflow-y-auto p-5"
                  variants={cascadeContainerVariants}
                  initial="closed"
                  animate="open"
                  exit="closed"
                >
                  <MotionDialogHeader variants={cascadeItemVariants}>
                    <DialogTitle className="font-display">{editando ? 'Editar Admissão' : 'Nova Admissão'}</DialogTitle>
                  </MotionDialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <motion.div variants={cascadeItemVariants} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <Label htmlFor="nome">Nome completo *</Label>
                          <Input
                            id="nome"
                            value={form.nome}
                            onChange={(e) => handleChange('nome', e.target.value)}
                            required
                            placeholder="Nome do candidato"
                          />
                        </div>
                        <div>
                          <Label htmlFor="cargo">Cargo *</Label>
                          <Input
                            id="cargo"
                            value={form.cargo}
                            onChange={(e) => handleChange('cargo', e.target.value)}
                            required
                            placeholder="Ex: Analista"
                          />
                        </div>
                        <div>
                          <Label htmlFor="departamento">Departamento *</Label>
                          <Select value={form.departamento} onValueChange={(v) => handleChange('departamento', v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {opcoesDepartamento.map((d) => (
                                <SelectItem key={d} value={d}>
                                  {d}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="data_prevista">Data prevista *</Label>
                          <Input
                            id="data_prevista"
                            type="date"
                            value={form.data_prevista}
                            onChange={(e) => handleChange('data_prevista', e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="salario_proposto">Salário proposto *</Label>
                          <Input
                            id="salario_proposto"
                            type="number"
                            step="0.01"
                            min="0"
                            value={form.salario_proposto}
                            onChange={(e) => handleChange('salario_proposto', e.target.value)}
                            required
                            placeholder="0,00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">E-mail</Label>
                          <Input
                            id="email"
                            type="email"
                            value={form.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            placeholder="email@exemplo.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="telefone">Telefone</Label>
                          <Input
                            id="telefone"
                            value={form.telefone}
                            onChange={(e) => handleChange('telefone', e.target.value)}
                            placeholder="(00) 00000-0000"
                          />
                        </div>
                        <div>
                          <Label htmlFor="cpf">CPF</Label>
                          <Input
                            id="cpf"
                            value={form.cpf}
                            onChange={(e) => handleChange('cpf', e.target.value)}
                            placeholder="000.000.000-00"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="observacoes">Observações</Label>
                        <Textarea
                          id="observacoes"
                          value={form.observacoes}
                          onChange={(e) => handleChange('observacoes', e.target.value)}
                          rows={3}
                          placeholder="Informações adicionais..."
                        />
                      </div>
                    </motion.div>

                    {/* RODAPÉ — bloco próprio da cascata (entra por último). */}
                    <motion.div variants={cascadeItemVariants} className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={loading}
                        className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-primary-foreground"
                      >
                        {loading ? 'Salvando...' : editando ? 'Salvar alterações' : 'Criar Admissão'}
                      </Button>
                    </motion.div>
                  </form>
                </motion.div>

                <DialogPrimitive.Close className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md opacity-70 transition-colors hover:bg-accent hover:opacity-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Fechar</span>
                </DialogPrimitive.Close>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
