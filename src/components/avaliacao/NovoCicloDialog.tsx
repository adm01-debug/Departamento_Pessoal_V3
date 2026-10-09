import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

/**
 * ============================================================================
 * DIÁLOGO "NOVO CICLO" — Gestão de Desempenho.
 *
 * Ação funcional ligada à mutation `criarCiclo` que já existia na página
 * (`avaliacaoService.criarCiclo` → INSERT em `ciclos_avaliacao`, respeitando o
 * isolamento por `empresa_id`). O diálogo apenas coleta os campos reais da
 * tabela e delega o envio; nenhum comportamento decorativo.
 * ============================================================================
 */

export interface NovoCicloDados {
  nome: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  tipo: string;
  status: string;
}

const TIPOS = [
  { valor: 'semestral', rotulo: 'Semestral' },
  { valor: 'anual', rotulo: 'Anual' },
  { valor: 'trimestral', rotulo: 'Trimestral' },
  { valor: 'experiencia', rotulo: 'Experiência' },
];

const STATUS_INICIAIS = [
  { valor: 'rascunho', rotulo: 'Rascunho' },
  { valor: 'ativo', rotulo: 'Ativo' },
];

interface NovoCicloDialogProps {
  onSubmit: (dados: NovoCicloDados) => void;
  salvando?: boolean;
}

export function NovoCicloDialog({ onSubmit, salvando }: NovoCicloDialogProps) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState('semestral');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [status, setStatus] = useState('rascunho');

  const valido = nome.trim().length > 0 && !!inicio && !!fim;

  const limpar = () => {
    setNome('');
    setDescricao('');
    setTipo('semestral');
    setInicio('');
    setFim('');
    setStatus('rascunho');
  };

  const enviar = () => {
    if (!valido) return;
    onSubmit({
      nome: nome.trim(),
      descricao: descricao.trim(),
      data_inicio: inicio,
      data_fim: fim,
      tipo,
      status,
    });
    limpar();
    setAberto(false);
  };

  return (
    <Dialog
      open={aberto}
      onOpenChange={(o) => {
        setAberto(o);
        if (!o) limpar();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="h-10 gap-1.5 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-glow-sm">
          <Plus className="h-4 w-4" /> Novo Ciclo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Novo Ciclo de Avaliação</DialogTitle>
          <DialogDescription>Defina o período e o tipo do ciclo de desempenho.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="novo-ciclo-nome">Nome *</Label>
            <Input
              id="novo-ciclo-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Ciclo S1 2027"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="novo-ciclo-descricao">Descrição</Label>
            <Textarea
              id="novo-ciclo-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Objetivo do ciclo"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="novo-ciclo-inicio">Início *</Label>
              <Input id="novo-ciclo-inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="novo-ciclo-fim">Fim *</Label>
              <Input id="novo-ciclo-fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t.valor} value={t.valor}>
                      {t.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status inicial</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_INICIAIS.map((s) => (
                    <SelectItem key={s.valor} value={s.valor}>
                      {s.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
          <Button onClick={enviar} disabled={!valido || salvando}>
            {salvando ? 'Criando...' : 'Criar ciclo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
