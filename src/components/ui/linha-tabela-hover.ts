/**
 * ============================================================================
 * HOVER DAS LINHAS DE TABELA — FONTE ÚNICA do realce de linha no sistema.
 *
 * CONSUMIDORES (as duas telas usam esta MESMA constante, então não podem
 * divergir de tom, de tempo nem de propriedade animada):
 *   - `horas-extras/HistoricoSolicitacoes.tsx` → Solicitações de Hora Extra ·
 *     "Histórico de solicitações" (a referência aprovada do efeito);
 *   - `recrutamento/TabelaCandidatos.tsx` → Recrutamento & Seleção · Candidatos.
 *
 * ONDE VIVE: no `<tr>` (o elemento que REPRESENTA a linha), nunca nos `<td>`.
 * Um único bloco de pintura cobre a largura inteira — inclusive os vãos entre
 * colunas e a área dos botões — e as células seguem transparentes. Pintar célula
 * a célula abriria emendas de tonalidade nas divisórias e na borda da tabela.
 *
 * O QUE MUDA: só `background-color`. Nenhuma cor de texto, selo de etapa,
 * badge, ícone ou opacidade; nenhuma borda, sombra, escala ou `translate` — a
 * caixa da linha não muda de tamanho nem de posição, portanto padding, altura
 * da linha e alinhamento das colunas ficam intactos e nada no fluxo se desloca.
 *
 * A COR: `--background` (216 48% 8% no tema escuro) é o token mais ESCURO do
 * sistema e já fica ABAIXO de `--card` (214 42% 12%, a superfície das tabelas) —
 * é o único jeito de escurecer usando o design system. A 60% de alfa o composto
 * cai para ~216 40% 10%: a linha afunda discretamente sem competir com o
 * conteúdo. `--muted`/`--secondary`/`--accent` (14% de luz) clareariam — o
 * pedido é o oposto. No tema claro o mesmo par se repete (card 100% →
 * background 96%), então o hover escurece nos DOIS temas.
 *
 * O TEMPO: 200 ms, dentro da faixa 180–250 ms da régua de hover do `index.css`.
 * `transition-colors` (e não `all`): o realce não pode arrastar uma sanfona de
 * propriedades junto com o fundo.
 * ============================================================================
 */
export const CLASSE_LINHA_HOVER = 'transition-colors duration-200 hover:bg-background/60';
