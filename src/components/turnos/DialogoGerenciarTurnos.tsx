/**
 * ============================================================================
 * TURNOS & ESCALAS — GERENCIAMENTO COMPLETO DE TURNOS ("Ver todos").
 * ============================================================================
 *
 * A tabela antiga da página não é perdida: ela vira esta janela, com pesquisa,
 * todos os campos que a tabela já mostrava (cor, nome, entrada, saída,
 * intervalo, status), a quantidade de colaboradores escalados por turno
 * (contada a partir das escalas carregadas) e a ação de editar — que abre o
 * diálogo de turno em modo edição, com exclusão em dois passos lá dentro.
 *
 * Moldura `CascadeDialogFrame` com `CASCADE_SAIDA_RAPIDA`: o corpo é uma LISTA
 * (um bloco por linha), e o perfil rápido evita que o fechamento cresça com o
 * número de turnos — exatamente o caso de uso documentado em
 * `ui/cascade-dialog.tsx`.
 * ============================================================================
 */
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CascadeDialogFrame } from '@/components/ui/cascade-dialog';
import { CASCADE_SAIDA_RAPIDA, cascadeItemVariants } from '@/components/ui/cascade-motion';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchInput } from '@/components/ui/search-input';
import { cn } from '@/lib/utils';
import { normalizarHex } from './turnosCores';
import {
  faixaHoraria,
  formatarIntervaloMinutos,
  normalizarTexto,
  type EscalaRegistro,
  type TurnoRegistro,
} from './turnosMetricas';

export interface DialogoGerenciarTurnosProps {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  turnos: readonly TurnoRegistro[];
  /** Escalas do período — só para contar colaboradores distintos por turno. */
  escalas: readonly EscalaRegistro[];
  podeGerenciar: boolean;
  onNovo: () => void;
  onEditar: (turno: TurnoRegistro) => void;
}

/** Blocos que cascateiam: cabeçalho · pesquisa · lista · rodapé. */
const BLOCOS_CASCATA = 4;

export function DialogoGerenciarTurnos({
  aberto,
  onOpenChange,
  turnos,
  escalas,
  podeGerenciar,
  onNovo,
  onEditar,
}: DialogoGerenciarTurnosProps) {
  const [busca, setBusca] = useState('');

  /** Colaboradores distintos escalados em cada turno (janela carregada). */
  const equipePorTurno = useMemo(() => {
    const mapa = new Map<string, Set<string>>();
    for (const escala of escalas) {
      const atual = mapa.get(escala.turno_id) ?? new Set<string>();
      atual.add(escala.colaborador_id);
      mapa.set(escala.turno_id, atual);
    }
    return mapa;
  }, [escalas]);

  const filtrados = useMemo(() => {
    const termo = normalizarTexto(busca);
    if (!termo) return turnos;
    return turnos.filter((turno) => normalizarTexto(turno.nome).includes(termo));
  }, [busca, turnos]);

  return (
    <CascadeDialogFrame
      open={aberto}
      onOpenChange={onOpenChange}
      blocks={BLOCOS_CASCATA}
      perfilSaida={CASCADE_SAIDA_RAPIDA}
      className="rounded-none sm:max-w-[720px] sm:rounded-lg"
      contentClassName="grid gap-3 p-5"
    >
      <motion.div variants={cascadeItemVariants}>
        <DialogHeader>
          <DialogTitle className="text-heading">Turnos cadastrados</DialogTitle>
          <DialogDescription className="text-[10px] text-muted-foreground">
            {turnos.length} turno(s) no catálogo da empresa.
          </DialogDescription>
        </DialogHeader>
      </motion.div>

      <motion.div variants={cascadeItemVariants}>
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={busca} onChange={setBusca} placeholder="Buscar turno…" className="min-w-[200px] flex-1" />
          {podeGerenciar && (
            <Button className="h-9 gap-2 rounded-xl px-3.5 text-[13px] font-semibold" onClick={onNovo}>
              <Plus className="h-4 w-4" aria-hidden />
              Novo turno
            </Button>
          )}
        </div>
      </motion.div>

      {/*
        TABELA — `table-fixed` + `<colgroup>`: as seis colunas têm largura
        declarada (30/16/13/15/13/13 %), então "Turno" não é mais esmagada por
        um horário longo e a coluna de ações não muda de lugar conforme o nome
        do turno. Com largura fixa o conteúdo PRECISA de `truncate`/`nowrap`
        explícito — é o que impede a última linha ("Plantão Fim de Semana") de
        quebrar em duas linhas e ser cortada pela borda do scroller.

        O scroller é UM só (este `div`), com borda/raio próprios: assim a lista
        tem começo e fim visíveis e o rodapé do modal fica numa faixa separada,
        em vez de encostar no último registro.
      */}
      <motion.div variants={cascadeItemVariants}>
        <div className="max-h-[52vh] overflow-y-auto overscroll-contain rounded-xl border border-border/40">
          {filtrados.length === 0 ? (
            <p className="px-1 py-6 text-center text-[13px] text-muted-foreground">Nenhum turno encontrado.</p>
          ) : (
            <Table className="table-fixed">
              <colgroup>
                <col className="w-[30%]" />
                <col className="w-[16%]" />
                <col className="w-[13%]" />
                <col className="w-[15%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
              </colgroup>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-10 px-3 text-[11px]">Turno</TableHead>
                  <TableHead className="h-10 px-3 text-[11px]">Horário</TableHead>
                  <TableHead className="h-10 px-3 text-[11px]">Intervalo</TableHead>
                  <TableHead className="h-10 px-3 text-[11px]">Colaboradores</TableHead>
                  <TableHead className="h-10 px-3 text-center text-[11px]">Status</TableHead>
                  <TableHead className="h-10 px-3 text-right text-[11px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((turno) => {
                  const colaboradores = equipePorTurno.get(turno.id)?.size ?? 0;
                  const inativo = turno.ativo === false;
                  return (
                    <TableRow key={turno.id} className="border-border/40">
                      <TableCell className="px-3 py-2.5">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: normalizarHex(turno.cor) }}
                            aria-hidden
                          />
                          <span className="truncate text-[13px] font-medium" title={turno.nome}>
                            {turno.nome}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-3 py-2.5 text-[12px] tabular-nums text-muted-foreground">
                        {faixaHoraria(turno)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-3 py-2.5 text-[12px] tabular-nums text-muted-foreground">
                        {formatarIntervaloMinutos(turno.intervalo_minutos)}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-[12px] tabular-nums text-muted-foreground">
                        {colaboradores > 0 ? colaboradores : '—'}
                      </TableCell>
                      {/* STATUS CENTRALIZADO na coluna: o veredito é lido na
                          vertical, então não pode "andar" conforme o tamanho do
                          pill. As cores são as de VEREDITO do sistema (fundo
                          translúcido + borda discreta + texto na cor), com o
                          ponto no mesmo tom à esquerda — nada de badge neutro
                          para Ativo/Inativo. */}
                      <TableCell className="px-3 py-2.5 text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            'gap-1.5 px-2 py-0.5 text-[10px] font-medium',
                            inativo
                              ? 'border-danger/35 bg-danger/12 text-danger'
                              : 'border-success/35 bg-success/12 text-success'
                          )}
                        >
                          <span
                            className={cn('h-1.5 w-1.5 rounded-full', inativo ? 'bg-danger' : 'bg-success')}
                            aria-hidden
                          />
                          {inativo ? 'Inativo' : 'Ativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right">
                        {podeGerenciar ? (
                          /* EDITAR em AZUL (`--info`, o azul oficial do DS):
                             edição é navegação, não criação — o lime da marca
                             fica reservado para "Novo turno". Hover = fundo
                             azul translúcido, como nas demais tabelas. */
                          <Button
                            variant="ghost"
                            className="h-[26px] gap-1.5 rounded-lg px-2 text-[10px] font-medium text-info transition-colors hover:bg-info/12 hover:text-info"
                            onClick={() => onEditar(turno)}
                          >
                            <Pencil className="h-3 w-3" aria-hidden />
                            Editar
                          </Button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </motion.div>

      <motion.div variants={cascadeItemVariants}>
        <DialogFooter className="gap-2 border-t border-border/40 pt-3">
          <span className="mr-auto text-[10px] text-muted-foreground">
            Colaboradores contados nas escalas do período aberto.
          </span>
          <Button
            variant="ghost"
            className="h-[32px] rounded-lg px-3 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </DialogFooter>
      </motion.div>
    </CascadeDialogFrame>
  );
}
