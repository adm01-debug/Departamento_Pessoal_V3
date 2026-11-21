import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Link2, Unlink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  mascararCpfLast4,
  vinculosRelogioService,
  type ColaboradorOpcao,
  type FuncionarioRelogio,
  type VinculoMetodo,
} from '@/services/relogio/vinculosService';

type Filtro = 'pendentes' | 'vinculados' | 'todos';

const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: 'pendentes', rotulo: 'Pendentes' },
  { valor: 'vinculados', rotulo: 'Vinculados' },
  { valor: 'todos', rotulo: 'Todos' },
];

const ROTULO_METODO: Record<VinculoMetodo, string> = {
  cpf: 'CPF',
  pis: 'PIS',
  matricula: 'Matrícula',
  manual: 'Manual',
};

function mensagemErro(err: unknown): string {
  return err instanceof Error ? err.message : 'Erro inesperado';
}

interface SeletorColaboradorProps {
  colaboradores: ColaboradorOpcao[];
  carregando: boolean;
  desabilitado: boolean;
  onEscolher: (colaboradorId: string) => void;
}

function SeletorColaborador({ colaboradores, carregando, desabilitado, onEscolher }: SeletorColaboradorProps) {
  const [aberto, setAberto] = useState(false);
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" disabled={desabilitado}>
          <Link2 className="mr-1 h-4 w-4" />
          Vincular
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Command>
          <CommandInput placeholder="Buscar colaborador..." />
          <CommandList>
            <CommandEmpty>{carregando ? 'Carregando...' : 'Nenhum colaborador encontrado.'}</CommandEmpty>
            <CommandGroup>
              {colaboradores.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.nomeCompleto} ${c.matricula ?? ''} ${c.cpfLast4 ?? ''} ${c.id}`}
                  onSelect={() => {
                    setAberto(false);
                    onEscolher(c.id);
                  }}
                >
                  <div className="flex flex-col">
                    <span>{c.nomeCompleto}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.matricula ? `Matrícula ${c.matricula} · ` : ''}CPF {mascararCpfLast4(c.cpfLast4)}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function VinculosRelogioTab({ empresaId }: { empresaId: string }) {
  const queryClient = useQueryClient();
  const [filtro, setFiltro] = useState<Filtro>('pendentes');
  const chaveFuncionarios = ['relogio', 'vinculos', empresaId] as const;

  const funcionariosQuery = useQuery({
    queryKey: chaveFuncionarios,
    queryFn: () => vinculosRelogioService.listarFuncionarios(empresaId),
    enabled: Boolean(empresaId),
  });
  const colaboradoresQuery = useQuery({
    queryKey: ['relogio', 'colaboradores-elegiveis', empresaId],
    queryFn: () => vinculosRelogioService.listarColaboradoresElegiveis(empresaId),
    enabled: Boolean(empresaId),
  });

  const aoConcluir = (mensagem: string) => {
    toast.success(mensagem);
    void queryClient.invalidateQueries({ queryKey: chaveFuncionarios });
  };
  const vincular = useMutation({
    mutationFn: ({ funcionarioId, colaboradorId }: { funcionarioId: string; colaboradorId: string }) =>
      vinculosRelogioService.vincular(funcionarioId, colaboradorId),
    onSuccess: () => aoConcluir('Funcionário vinculado. Os dias dele serão reprocessados.'),
    onError: (err) => toast.error(`Não foi possível vincular: ${mensagemErro(err)}`),
  });
  const desvincular = useMutation({
    mutationFn: (funcionarioId: string) => vinculosRelogioService.desvincular(funcionarioId),
    onSuccess: () => aoConcluir('Vínculo desfeito. Os dias dele serão reprocessados.'),
    onError: (err) => toast.error(`Não foi possível desfazer: ${mensagemErro(err)}`),
  });

  const funcionarios = useMemo(() => funcionariosQuery.data ?? [], [funcionariosQuery.data]);
  const pendentes = funcionarios.filter((f) => !f.colaboradorId).length;
  const visiveis = funcionarios.filter((f: FuncionarioRelogio) =>
    filtro === 'todos' ? true : filtro === 'pendentes' ? !f.colaboradorId : Boolean(f.colaboradorId)
  );
  const ocupado = vincular.isPending || desvincular.isPending;

  if (funcionariosQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground" role="status">
        <Spinner size="sm" /> Carregando funcionários do relógio...
      </div>
    );
  }

  if (funcionariosQuery.isError) {
    return (
      <div className="space-y-2 p-6 text-sm" role="alert">
        <p className="text-destructive">
          Não foi possível carregar os funcionários do relógio: {mensagemErro(funcionariosQuery.error)}
        </p>
        <Button size="sm" variant="outline" onClick={() => void funcionariosQuery.refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1" role="group" aria-label="Filtrar funcionários">
          {FILTROS.map((f) => (
            <Button
              key={f.valor}
              size="sm"
              variant={filtro === f.valor ? 'default' : 'outline'}
              aria-pressed={filtro === f.valor}
              onClick={() => setFiltro(f.valor)}
            >
              {f.rotulo}
            </Button>
          ))}
        </div>
        <Badge variant={pendentes > 0 ? 'destructive' : 'secondary'} data-testid="contador-pendentes">
          {pendentes} {pendentes === 1 ? 'pendente' : 'pendentes'}
        </Badge>
      </div>

      {colaboradoresQuery.isError && (
        <p className="text-sm text-destructive" role="alert">
          Não foi possível carregar os colaboradores para vínculo: {mensagemErro(colaboradoresQuery.error)}
        </p>
      )}

      {visiveis.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">
          {funcionarios.length === 0
            ? 'Nenhum funcionário recebido do relógio ainda.'
            : filtro === 'pendentes'
              ? 'Todos os funcionários do relógio estão vinculados.'
              : 'Nenhum funcionário neste filtro.'}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome no relógio</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Matrícula</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Colaborador vinculado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiveis.map((f) => (
              <TableRow key={f.id} data-testid={`funcionario-${f.codigo}`}>
                <TableCell>{f.codigo}</TableCell>
                <TableCell>{f.nome ?? '—'}</TableCell>
                <TableCell>{mascararCpfLast4(f.cpfLast4)}</TableCell>
                <TableCell>{f.matricula ?? '—'}</TableCell>
                <TableCell>{f.situacao ?? '—'}</TableCell>
                <TableCell>
                  {f.colaboradorId ? (
                    <span className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      {f.colaboradorNome ?? 'Colaborador sem acesso'}
                      {f.vinculoMetodo && <Badge variant="outline">{ROTULO_METODO[f.vinculoMetodo]}</Badge>}
                    </span>
                  ) : (
                    <Badge variant="secondary">Pendente</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {f.colaboradorId ? (
                    <Button size="sm" variant="ghost" disabled={ocupado} onClick={() => desvincular.mutate(f.id)}>
                      <Unlink className="mr-1 h-4 w-4" />
                      Desfazer
                    </Button>
                  ) : (
                    <SeletorColaborador
                      colaboradores={colaboradoresQuery.data ?? []}
                      carregando={colaboradoresQuery.isLoading}
                      desabilitado={ocupado}
                      onEscolher={(colaboradorId) => vincular.mutate({ funcionarioId: f.id, colaboradorId })}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
