import { Timer } from 'lucide-react';
import { ETAPAS } from './pipelineEtapas';
import { TONS_PIPELINE } from './pipelineVisual';
import type { TempoEtapa } from './analyticsComum';
import { AnalyticsPainel } from './AnalyticsPainel';
import { SUPERFICIE_SUAVE } from './analyticsVisual';
import { cn } from '@/lib/utils';

/**
 * TEMPO POR ETAPA — permanência média desde a última movimentação registrada.
 *
 * Não é uma soma histórica de durações (o modelo não expõe `historico_etapas`
 * na leitura da página): é a idade média dos candidatos que ESTÃO na etapa.
 * O painel mostra SÓ o cabeçalho e os cinco cartões (nome · ícone · dias); a
 * régua "dias desde a última movimentação" e a amostra de cada etapa continuam
 * acessíveis no `title` de cada cartão — as legendas que repetiam isso no
 * rodapé saíram da tela a pedido da revisão de layout.
 */
const ROTULO_CURTO: Record<string, string> = {
  triagem: 'Triagem',
  entrevista: 'Entrevista',
  teste: 'Teste',
  proposta: 'Proposta',
  contratado: 'Contratado',
};

export function AnalyticsTempo({ tempos, index }: { tempos: TempoEtapa[]; index: number }) {
  const temDados = tempos.some((tempo) => tempo.dias !== null);
  const iconePorEtapa = new Map(ETAPAS.map((etapa) => [etapa.id, etapa.icone]));
  const tokenPorEtapa = new Map(ETAPAS.map((etapa) => [etapa.id, etapa.token]));

  return (
    <AnalyticsPainel
      icon={Timer}
      title="Tempo médio por etapa"
      subtitle="Permanência média na etapa atual"
      tom="warning"
      index={index}
      /* Respiro vertical da faixa de três cards da referência: 10px até os
         ladrilhos e 12px até a borda inferior. Só ESTE painel recebe o padding —
         o casco (`AnalyticsPainel`) é compartilhado por sete painéis da aba.
         `justify-center`: com os cards da faixa em `items-stretch`, quem define a
         altura da linha é o painel de atenção (três alertas de duas linhas). Os
         ladrilhos crescem com a faixa até 155px reais (ver `max-h` abaixo) e o
         vão que sobra se reparte em cima e embaixo — o card lê como um bloco
         único, sem ladrilho esticado nem sobra morta no pé. */
      contentClassName="justify-center pb-3 pt-2.5"
    >
      {!temDados ? (
        <div
          className={`flex min-h-[100px] flex-col items-center justify-center gap-1.5 rounded-[7px] px-4 py-3 text-center ${SUPERFICIE_SUAVE}`}
        >
          <Timer className="h-5 w-5 text-muted-foreground/40" aria-hidden />
          <p className="text-[12px] font-medium text-foreground/80">Sem tempo registrado</p>
          <p className="max-w-[210px] text-[10.5px] leading-snug text-muted-foreground">
            A medição começa quando há candidatos em cada etapa.
          </p>
        </div>
      ) : (
        <>
          {/* Cinco ladrilhos VERTICAIS, na composição da referência: nome no topo,
              ícone no centro e permanência LOGO ABAIXO do ícone — as três
              regiões formam UM grupo centrado (`justify-center` + `gap-2`), como
              um bloco só.
              O que saiu: `justify-between` + `flex-1`. Com eles o nome ia para a
              borda de cima, o número para a de baixo e o grupo ficava com ~40px
              de ar no meio — o "número no rodapé" que a revisão apontou.
              `grid-cols-5` = `repeat(5, minmax(0, 1fr))`: cinco colunas IGUAIS que
              ocupam toda a largura interna sem ultrapassar o painel (o `minmax(0,…)`
              é o que impede um rótulo longo de empurrar a coluna além de 1/5).
              `gap-2` (10px reais) é o vão entre os ladrilhos.
              ALTURA ELÁSTICA `h-full` com piso de `min-h-[108px]` (135px reais) e
              teto de `max-h-[124px]` (155px reais): o ladrilho acompanha a altura
              da faixa (quem manda é o painel de atenção, com três alertas) até o
              teto, e o que sobrar fica repartido em cima e embaixo. Sem o teto os
              cinco virariam colunas de 270px; sem o piso, em telas estreitas o
              retângulo encolheria abaixo do chip de 35px + valor.
              `px-0.5` (2,5px reais) e rótulo de 9px (11,25px reais): no pior caso
              (main de 1060px) o ladrilho fica com ~53px úteis e "Entrevista" pede
              ~55px — o nome completo segue no `title`. */}
          <div className="grid flex-1 grid-cols-5 items-center gap-2">
            {tempos.map((tempo) => {
              const tom = TONS_PIPELINE[tempo.id];
              const token = tokenPorEtapa.get(tempo.id) ?? 'primary';
              const Icone = iconePorEtapa.get(tempo.id) ?? Timer;
              return (
                <div
                  key={tempo.id}
                  className={cn(
                    'flex h-full max-h-[124px] min-h-[108px] min-w-0 flex-col items-center justify-center gap-2 rounded-[9px] border px-0.5 py-2.5 text-center',
                    tom.borda
                  )}
                  /* Tonalidade sutil derivada da cor da etapa: o `fundo` do
                     Pipeline é um `background-image` (brilho no topo +
                     gradiente vertical), não uma classe — antes ele era passado
                     como `className` e o cartão ficava sem cor nenhuma. */
                  style={{ backgroundImage: tom.fundo }}
                  title={`${tempo.label}: ${tempo.dias ?? '—'} dias (${tempo.amostra} ${tempo.amostra === 1 ? 'candidato' : 'candidatos'})`}
                >
                  {/* Região 1 — nome da etapa (11,25px reais), em UMA linha. */}
                  <span className="w-full truncate text-[9px] font-medium leading-tight text-foreground/85">
                    {ROTULO_CURTO[tempo.id] ?? tempo.label}
                  </span>
                  {/* Região 2 — ícone (22,5px reais) dentro do chip CIRCULAR de
                      35px reais na cor da etapa, como na referência. */}
                  <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', tom.chip)}>
                    <Icone className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  {/* Região 3 — permanência: número de 22px reais com "dias" de
                      11,25px reais ao lado, na MESMA linha, encostado no ícone. O
                      tamanho do número é o maior que cabe no ladrilho de ~53px
                      reais do painel (o mais estreito da aba) com dois dígitos e a
                      unidade; a unidade usa `ml-0.5` porque `ml-1` estourava a
                      largura em "56 dias". */}
                  <span
                    className="whitespace-nowrap font-display text-[17.5px] font-semibold leading-none tracking-tight tabular-nums"
                    style={{ color: `hsl(var(--${token}))` }}
                  >
                    {tempo.dias ?? '—'}
                    {tempo.dias !== null && <span className="ml-0.5 text-[9px] font-normal">dias</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </AnalyticsPainel>
  );
}
