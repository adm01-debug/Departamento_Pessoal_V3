/**
 * ============================================================================
 * TURNOS & ESCALAS — VISUALIZAÇÃO EM LISTA.
 * ============================================================================
 *
 * A MESMA fonte de dados da semana e do mês, em tabela: colaborador, data,
 * turno, horário, status e ação. Serve para conferência rápida e para períodos
 * cheios (o mês inteiro em ordem cronológica), sem duplicar registros nem
 * recalcular nada — recebe as escalas já filtradas.
 *
 * ── ROLAGEM INTERNA (a altura do card não segue o número de registros) ──────
 * Antes a tabela crescia com o período: um mês cheio empurrava a coluna lateral,
 * o rodapé e o resto da página para baixo. Depois virou um card com teto fixo
 * (`min(32rem, 70dvh)`) — que resolvia o crescimento, mas deixava a base do card
 * flutuando acima da base do último card lateral (o `max-h` é um número, e a
 * coluna lateral é outra altura).
 *
 * Agora a altura é ESTRUTURAL: o card é `flex-1` na coluna, então a base dele
 * coincide com a base do último card da lateral em qualquer recorte. Quem rola
 * é só o miolo, com o cabeçalho das colunas parado no topo:
 *
 *   • `contain: 'size'` no card — o conteúdo deixa de contribuir para a altura
 *     da linha da grade. Sem isso o `flex-1` só funcionaria enquanto a lista
 *     fosse mais curta que a lateral, e o mês inteiro (centenas de linhas)
 *     voltaria a empurrar a página;
 *   • `min-h-[20rem]` é piso de usabilidade em tela baixa, não número de
 *     alinhamento;
 *   • `overflow-auto` + `scroll-interno` (a barra fina do DS, já escura);
 *   • `<thead>` `sticky` — e para ele funcionar de verdade a tabela é escrita
 *     aqui: o `Table` do DS embrulha o `<table>` num `div overflow-auto` que
 *     vira o scrollport e desativaria o `sticky`.
 *
 * `border-separate border-spacing-0` é o que mantém o `sticky` dos `<th>` com a
 * divisória junto do cabeçalho (o Preflight deixa a tabela em `collapse`).
 * Nenhum menu/dropdown é desenhado aqui — a única ação da linha abre os
 * detalhes num diálogo —, então não há portal a preservar.
 *
 * O fundo das células fixas é `FUNDO_CARD_OPACO` (a cor aparente do card): pinta
 * sem emenda e cobre as linhas que passam por baixo do cabeçalho.
 * ============================================================================
 */
import { useMemo } from 'react';
import { ChevronRight, ListX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/user-avatar';
import { cn } from '@/lib/utils';
import { rotuloDataCompleta, rotuloDiaMes, rotuloDiaSemana } from './turnosCalendario';
import { normalizarHex } from './turnosCores';
import { faixaHoraria, escalaEhFolga, type EscalaRegistro, type TurnoRegistro } from './turnosMetricas';
import { FUNDO_CARD, FUNDO_CARD_OPACO } from './turnosSuperficies';

export interface ListaEscalasProps {
  escalas: readonly EscalaRegistro[];
  turnos: readonly TurnoRegistro[];
  onAbrirEscala: (data: string, escalas: EscalaRegistro[]) => void;
}

/** Cabeçalho fixo: 36px de classe, alinhado ao `px-1.5` das células. */
const CLASSE_CABECALHO = cn(
  'sticky top-0 z-10 h-9 border-b border-border/40 px-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-muted-foreground',
  FUNDO_CARD_OPACO
);

/** Célula padrão (mesma régua horizontal do cabeçalho). */
const CLASSE_CELULA = 'border-b border-border/40 px-1.5 py-2 align-middle';

export function ListaEscalas({ escalas, turnos, onAbrirEscala }: ListaEscalasProps) {
  const turnosPorId = useMemo(() => new Map(turnos.map((turno) => [turno.id, turno])), [turnos]);

  const ordenadas = useMemo(
    () =>
      [...escalas].sort((a, b) => {
        const data = a.data.slice(0, 10).localeCompare(b.data.slice(0, 10));
        if (data !== 0) return data;
        return (a.colaborador?.nome_completo ?? '').localeCompare(b.colaborador?.nome_completo ?? '', 'pt-BR');
      }),
    [escalas]
  );

  if (ordenadas.length === 0) {
    return (
      <div
        className={cn(
          'flex min-h-[20rem] flex-1 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-border/40 px-4 text-center',
          FUNDO_CARD
        )}
        // Mesmo motivo do card cheio (ver "ALTURA" no cabeçalho): o card ocupa a
        // sobra da coluna e a base acompanha a do último card lateral — inclusive
        // com zero resultado, sem esticar linha nenhuma.
        style={{ contain: 'size' }}
      >
        <ListX className="h-7 w-7 text-muted-foreground" aria-hidden />
        <p className="text-[13px] text-muted-foreground">Nenhuma escala encontrada no período com os filtros atuais.</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex min-h-[20rem] flex-1 flex-col overflow-hidden rounded-2xl border border-border/40',
        FUNDO_CARD
      )}
      // Ver "ALTURA" no cabeçalho: `contain: size` tira o conteúdo da conta da
      // altura da linha da grade, então quem manda na altura é a coluna.
      style={{ contain: 'size' }}
    >
      <div className="min-h-0 flex-1 overflow-auto scroll-interno">
        <table className="w-full min-w-[34rem] table-fixed border-separate border-spacing-0 text-left">
          {/*
            Uma régua só de larguras (`table-fixed` + `colgroup`): o `<col>`
            manda na coluna inteira, então cabeçalho e células caem exatamente
            na mesma caixa e o texto que não couber é truncado (nome e turno já
            têm `truncate`). Sem isso o auto-layout dimensionava cada coluna pelo
            conteúdo e a soma passava da largura do card em telas médias (~12 px
            em 1440), cortando o botão "Detalhes" na borda direita.
            `min-w-[34rem]` continua sendo o piso: abaixo disso (mobile) a
            tabela rola na horizontal DENTRO do card, nunca na página.
          */}
          <colgroup>
            <col className="w-[34%]" />
            <col className="w-[13%]" />
            <col className="w-[21%]" />
            <col className="w-[17%]" />
            <col className="w-[15%]" />
          </colgroup>
          <caption className="sr-only">
            Escalas do período por colaborador, data, turno e status — {ordenadas.length} registro(s)
          </caption>
          <thead>
            <tr>
              <th scope="col" className={CLASSE_CABECALHO}>
                Colaborador
              </th>
              <th scope="col" className={CLASSE_CABECALHO}>
                Data
              </th>
              <th scope="col" className={CLASSE_CABECALHO}>
                Turno
              </th>
              <th scope="col" className={CLASSE_CABECALHO}>
                Status
              </th>
              <th scope="col" className={cn(CLASSE_CABECALHO, 'text-right')}>
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((escala) => {
              const turno = turnosPorId.get(escala.turno_id) ?? null;
              const folga = escalaEhFolga(escala);
              const data = escala.data.slice(0, 10);

              return (
                <tr key={escala.id} className="transition-colors hover:bg-muted/20">
                  <td className={CLASSE_CELULA}>
                    <div className="flex items-center gap-2">
                      <UserAvatar name={escala.colaborador?.nome_completo ?? 'Colaborador'} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium leading-tight">
                          {escala.colaborador?.nome_completo ?? 'Colaborador'}
                        </p>
                        <p className="truncate text-[10px] leading-tight text-muted-foreground">
                          {escala.colaborador?.departamento || 'Sem departamento'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={cn(CLASSE_CELULA, 'whitespace-nowrap text-[13px] tabular-nums')}>
                    {rotuloDiaMes(data)}
                    <span className="ml-1 text-[10px] text-muted-foreground">{rotuloDiaSemana(data)}</span>
                  </td>
                  <td className={CLASSE_CELULA}>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: normalizarHex(turno?.cor ?? escala.turno?.cor) }}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] leading-tight">
                          {turno?.nome ?? escala.turno?.nome ?? 'Turno removido'}
                        </p>
                        <p className="truncate text-[10px] leading-tight tabular-nums text-muted-foreground">
                          {faixaHoraria(turno ?? escala.turno ?? null)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={CLASSE_CELULA}>
                    <Badge variant={folga ? 'secondary' : 'outline'} className={cn('text-[10px] capitalize')}>
                      {escala.status || 'agendado'}
                    </Badge>
                  </td>
                  <td className={cn(CLASSE_CELULA, 'text-right')}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                      onClick={() => onAbrirEscala(data, [escala])}
                      aria-label={`Detalhes da escala de ${escala.colaborador?.nome_completo ?? 'colaborador'} em ${rotuloDataCompleta(data)}`}
                    >
                      Detalhes
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
