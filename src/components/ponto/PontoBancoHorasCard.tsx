/**
 * @fileoverview Card "Banco de Horas" do Controle de Ponto (2ª linha, 1ª coluna).
 *
 * Composição da referência: o saldo consolidado ocupa a faixa esquerda (~35%)
 * em um painel único de destaque e as quatro métricas do recorte semanal ficam
 * à direita (~65%) em grade 2×2 — sem cards individuais, valor em cima e rótulo
 * embaixo, separados apenas por fios discretos (`border-border`).
 *
 * Mantém o dado que a página já calculava (saldo consolidado de `banco_horas`,
 * soma de créditos menos débitos) e o recorte da semana que o card antigo já
 * mostrava: trabalhado, previsto, extras e horas devidas — todos derivados de
 * `registros_ponto`, com `minutosDeDuracao` para somar `HH:MM` sem `NaN`.
 *
 * SINAL DO SALDO: o selo "Credor/Devedor" saiu (a referência não o tem), mas a
 * regra continua visível por dois canais: o `+`/`-` do próprio texto e a cor
 * (verde para crédito, vermelho do módulo para débito).
 *
 * ESCALA: o `<html>` do produto é 125% (`src/index.css`) e o plugin
 * `scripts/postcss-escala-rem.mjs` converte utilities em `px` arbitrário para
 * `rem`. Então `text-[26px]` mede 32,5px na tela e `gap-3` mede 15px reais.
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { VERMELHO_TEXTO } from './vermelhoVibrante';
import { ACAO_CARD_LIME } from './acoesCardsPonto';
import { formatarMinutosDuracao, minutosDeDuracao } from '@/utils/pontoDuracao';

/** Saldo consolidado de `banco_horas` (calculado na página). */
export interface BancoHorasResumo {
  saldo: string;
  saldoMinutos: number;
  tipo: 'credito' | 'debito';
}

/** Recorte de `registros_ponto` que este card soma. */
interface RegistroHoras {
  horas_trabalhadas?: string | null;
  horas_extras?: string | null;
  horas_falta?: string | null;
  entrada_esperada?: string | null;
  saida_esperada?: string | null;
}

/**
 * Minutos PREVISTOS de um dia = `saida_esperada − entrada_esperada`.
 *
 * Vem da própria linha de `registros_ponto` (a mesma janela que o card já lê
 * para trabalhadas/extras/devidas), então "Previstas" reflete a escala
 * apurada no dia — sem inventar carga horária nem depender do turno atual.
 * Dia sem as duas marcações esperadas não entra na soma.
 */
function minutosPrevistos(registro: RegistroHoras): number {
  const entrada = registro?.entrada_esperada;
  const saida = registro?.saida_esperada;
  if (!entrada || !saida) return 0;
  const [hEntrada, mEntrada] = entrada.split(':').map(Number);
  const [hSaida, mSaida] = saida.split(':').map(Number);
  if ([hEntrada, mEntrada, hSaida, mSaida].some((valor) => Number.isNaN(valor))) return 0;
  const minutos = hSaida * 60 + mSaida - (hEntrada * 60 + mEntrada);
  return minutos > 0 ? minutos : 0;
}

interface PontoBancoHorasCardProps {
  bancoResumo?: BancoHorasResumo | null;
  registrosSemana?: RegistroHoras[];
  /** Abre o detalhamento do banco de horas (aba de gestão). */
  onVerDetalhes?: () => void;
}

export function PontoBancoHorasCard({ bancoResumo, registrosSemana = [], onVerDetalhes }: PontoBancoHorasCardProps) {
  const credor = (bancoResumo?.tipo ?? 'credito') === 'credito';

  const totalTrabalhado = registrosSemana.reduce(
    (soma, registro) => soma + minutosDeDuracao(registro?.horas_trabalhadas ?? null),
    0
  );
  const totalExtras = registrosSemana.reduce(
    (soma, registro) => soma + minutosDeDuracao(registro?.horas_extras ?? null),
    0
  );
  const totalDevidas = registrosSemana.reduce(
    (soma, registro) => soma + minutosDeDuracao(registro?.horas_falta ?? null),
    0
  );
  const totalPrevisto = registrosSemana.reduce((soma, registro) => soma + minutosPrevistos(registro ?? {}), 0);

  // Quatro métricas em grade 2×2 à direita do saldo — o mesmo recorte que o
  // card de referência mostra (trabalhadas, previstas, extras, devidas).
  const linhas = [
    { rotulo: 'Horas trabalhadas', valor: formatarMinutosDuracao(totalTrabalhado), cor: 'text-foreground' },
    { rotulo: 'Horas previstas', valor: formatarMinutosDuracao(totalPrevisto), cor: 'text-foreground' },
    { rotulo: 'Horas extras', valor: formatarMinutosDuracao(totalExtras, { sinal: true }), cor: 'text-success' },
    { rotulo: 'Horas devidas', valor: formatarMinutosDuracao(-totalDevidas), cor: VERMELHO_TEXTO },
  ];

  return (
    <motion.div custom={7} variants={cardVariants} initial="hidden" animate="visible" className="h-full">
      <Card className="border border-border/40 shadow-xs rounded-xl overflow-hidden h-full flex flex-col">
        <CardContent className="p-3.5 flex flex-1 flex-col @container">
          <div className="flex items-center gap-2 min-w-0">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
              <Wallet className="h-3.5 w-3.5" />
            </span>
            <p className="min-w-0 flex-1 truncate font-display text-[13px] font-semibold leading-tight">
              Banco de Horas
            </p>
            {onVerDetalhes && (
              /* Ação secundária do card: rótulo e seta em lime (`ACAO_CARD_LIME`
                 — geometria/tipografia/posição e véu de hover preservados; o
                 `<ArrowRight>` herda o `currentColor` do botão). */
              <Button size="sm" variant="ghost" className={ACAO_CARD_LIME} onClick={onVerDetalhes}>
                Ver detalhes
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Composição: painel do saldo (~34%) + os quatro indicadores (~66%).
              A linha cresce (`flex-1`) e as duas partes esticam juntas
              (`items-stretch`), então a composição ocupa TODA a altura que a
              linha do dashboard impõe em vez de flutuar no meio de dois vazios
              simétricos de ~67px (medido em 1024–1920px com a composição de
              91–97px). Nada de altura fixa: quem distribui é o flex/grid da
              própria composição. */}
          <div className="mt-3 flex min-w-0 flex-1 flex-col justify-center">
            <div className="flex min-w-0 flex-1 items-stretch gap-3">
              {/* Painel do saldo: valor grande centralizado e o rótulo logo abaixo.
                  A borda fica em /60 (e não /40): em dark o token `--border` já
                  é escuro, então 40% de alfa sumiria por completo na tela.
                  O painel é `@container` de si mesmo: o corpo do valor é medido
                  pela LARGURA DO PAINEL (110px no card estreito de 390px até
                  ~205px no card largo de 1920px), não pela largura do card —
                  assim o número cresce até 35px reais onde há espaço e nunca
                  encosta nas bordas onde não há. */}
              <div className="@container flex w-[34%] min-w-0 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-border/60 bg-background/60 px-2 py-3 @[25rem]:w-[36%] lg:py-4">
                <p
                  className={cn(
                    // O saldo nunca quebra nem trunca — é o dado principal.
                    // 18px escritos = 22,5px reais no card de 390px (mesma medida
                    // de antes, para a altura do card não mudar); a partir de 5rem
                    // de largura ÚTIL do painel (a container query mede a caixa de
                    // conteúdo, já sem o padding) sobe até 28px = 35px reais nos
                    // cards largos.
                    'whitespace-nowrap text-center font-display text-[18px] font-semibold leading-none tabular-nums @[5rem]:text-[22px] @[6rem]:text-[25px] @[9rem]:text-[28px]',
                    credor ? 'text-success' : VERMELHO_TEXTO
                  )}
                >
                  {bancoResumo ? `${credor ? '+' : '-'}${bancoResumo.saldo}` : '--:--'}
                </p>
                <p className="truncate text-[10px] leading-none text-muted-foreground @[6rem]:text-[11px]">
                  Saldo atual
                </p>
              </div>

              {/* Grade 2×2 sem caixas internas: valor em cima, rótulo embaixo e
                  fios separando a coluna da direita e a 2ª linha. Os fios usam
                  `border-border` cheio (sem alfa) — em dark o token já é discreto
                  e com /40 ele desaparecia.
                  `grid-rows-2` divide a altura útil em duas linhas IGUAIS e cada
                  célula centraliza o próprio par valor/rótulo (`justify-center`):
                  é isso que distribui os quatro indicadores por toda a área à
                  direita e afasta as duas linhas (de ~56px para ~98px reais nos
                  cards de 276,8px de altura) sem nenhuma altura fixa.
                  O corpo maior entra a partir de `lg` (1024px) de propósito: só
                  dali para cima o card é ESTICADO pela linha da grade (276,8px
                  fixos pelos vizinhos), então o texto cresce dentro de uma altura
                  que já existe. Em 390/768px a altura do card é o próprio conteúdo
                  e qualquer corpo maior faria o card crescer — por isso lá os
                  tamanhos ficam nos valores anteriores. Os rótulos quebram em duas
                  linhas quando o card é estreito: melhor duas linhas do que
                  "Horas trabalhad…" truncado. */}
              <div className="grid min-w-0 flex-1 grid-cols-2 grid-rows-2 max-lg:grid-rows-[auto_auto]">
                {linhas.map(({ rotulo, valor, cor }, indice) => (
                  <div
                    key={rotulo}
                    className={cn(
                      'flex min-w-0 flex-col justify-center py-2.5 max-lg:py-1',
                      indice % 2 === 0 ? 'pr-2.5 max-lg:pr-2' : 'border-l border-border pl-2.5 max-lg:pl-2',
                      // O fio horizontal fica entre as duas linhas; o respiro é
                      // simétrico dos dois lados dele (`py` de cada célula).
                      indice < 2 ? '' : 'border-t border-border'
                    )}
                  >
                    <p
                      className={cn(
                        // 17px escritos = ~21px reais a partir de 1024px de tela;
                        // 18px = 22,5px reais nos cards mais largos (1536px+).
                        // Abaixo de `lg` vale a escada anterior por container
                        // query (12→13→14px escritos), que é o que mantém a altura
                        // do card em 390/768px exatamente como era.
                        'truncate font-display text-[17px] font-semibold leading-none tabular-nums 2xl:text-[18px] max-lg:text-[12px] max-lg:@[18rem]:text-[13px] max-lg:@[25rem]:text-[14px]',
                        cor
                      )}
                    >
                      {valor}
                    </p>
                    <p className="mt-1 text-[10px] leading-snug text-muted-foreground max-lg:text-[7.5px] max-lg:@[18rem]:text-[8px] max-lg:@[25rem]:text-[9px] max-lg:@[32rem]:text-[10px]">
                      {rotulo}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sem legenda de rodapé (a referência não tem, e o espaço dela não é
              reservado). O texto abaixo é estado — só aparece sem lançamento. */}
          {!bancoResumo && (
            <p className="mt-2.5 truncate text-[9px] font-body leading-snug text-muted-foreground">
              Sem lançamento no banco de horas para este colaborador.
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
