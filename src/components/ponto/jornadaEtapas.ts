/**
 * ============================================================================
 * CARD "JORNADA DE HOJE" — PALETA DAS QUATRO ETAPAS DO DIA
 *
 * Cada etapa do dia tem cor própria; a cor identifica o marco (não o estado),
 * então `Entrada` continua verde tanto antes quanto depois da batida. Antes da
 * refatoração, `cumprida` e `atual` compartilhavam `success`/`primary`, e a
 * linha do tempo ficava praticamente monocromática — impossível dizer de
 * relance qual círculo era qual.
 *
 * POR QUE CLASSES UTILITÁRIAS (e não tokens em `index.css`): estes quatro
 * matizes existem só nesta linha do tempo. Criar `--timeline-entrada`,
 * `--timeline-saida` e companhia encheria o tema com tokens de uso único.
 *
 * Estes valores são LITERAIS em classe arbitrária (e não `style`) porque o
 * Tailwind só gera o CSS do que encontra escrito no fonte; e são strings
 * completas (sem interpolação) para o scanner não perder a classe.
 *
 * Passo a passo da leitura visual:
 *   `registrada` . círculo cheio: borda 0.75, fundo 0.12 e ícone na cor
 *   `discreta` ... mesma cor, apagada: borda 0.32, fundo 0.06 e ícone 0.62
 *                  (etapa sem registro — o `--:--` continua no lugar da hora)
 * ============================================================================
 */

export interface PaletaEtapaJornada {
  /** Etapa com batida registrada — círculo na cor cheia. */
  registrada: string;
  /**
   * Etapa ainda sem batida — mantém a identificação da cor, porém discreta,
   * para o `--:--` não parecer um marco "apagado" do sistema.
   */
  discreta: string;
}

/**
 * Ordem idêntica à das colunas reais de `registros_ponto`:
 * `entrada_1` · `saida_intervalo` · `retorno_intervalo` · `saida_1`.
 */
export const PALETA_ETAPAS_JORNADA: readonly PaletaEtapaJornada[] = [
  // Entrada — verde (#00D66B)
  {
    registrada: 'border-[rgba(0,214,107,0.75)] bg-[rgba(0,214,107,0.12)] text-[#00D66B]',
    discreta: 'border-[rgba(0,214,107,0.32)] bg-[rgba(0,214,107,0.06)] text-[rgba(0,214,107,0.62)]',
  },
  // Saída Almoço — âmbar (#FFB900)
  {
    registrada: 'border-[rgba(255,185,0,0.75)] bg-[rgba(255,185,0,0.12)] text-[#FFB900]',
    discreta: 'border-[rgba(255,185,0,0.32)] bg-[rgba(255,185,0,0.06)] text-[rgba(255,185,0,0.62)]',
  },
  // Retorno Almoço — azul (#00AFFF)
  {
    registrada: 'border-[rgba(0,175,255,0.75)] bg-[rgba(0,175,255,0.12)] text-[#00AFFF]',
    discreta: 'border-[rgba(0,175,255,0.32)] bg-[rgba(0,175,255,0.06)] text-[rgba(0,175,255,0.62)]',
  },
  // Saída — roxo (#A855F7)
  {
    registrada: 'border-[rgba(168,85,247,0.75)] bg-[rgba(168,85,247,0.12)] text-[#A855F7]',
    discreta: 'border-[rgba(168,85,247,0.32)] bg-[rgba(168,85,247,0.06)] text-[rgba(168,85,247,0.62)]',
  },
];
