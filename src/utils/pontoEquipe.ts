/**
 * @fileoverview Resumo do dia da equipe para os cards do Controle de Ponto.
 *
 * Três lugares precisam da MESMA leitura de "quem está em jornada hoje":
 * o card Situação da Equipe, o card Pendências e o card Fechamento. Se cada um
 * contasse do seu jeito, a tela mostraria números diferentes para a mesma
 * pergunta — por isso a regra vive aqui, pura e testável, longe do JSX.
 *
 * Regra de jornada: a jornada está ENCERRADA quando a ÚLTIMA batida do
 * colaborador é `saida`. Não é uma contagem de tipos: quem bateu `saida` e
 * depois `entrada` voltou a estar em jornada, e quem bateu `saida_almoco` e
 * nada mais continua em jornada (saiu para o almoço).
 */

/** Só o necessário de `batidas_ponto` para montar o retrato do dia. */
export interface BatidaEquipe {
  colaborador_id?: string | null;
  tipo?: string | null;
}

/** Retrato agregado do dia: um colaborador conta uma vez, sempre. */
export interface ResumoEquipeDia {
  /** Colaboradores com pelo menos uma batida hoje. */
  comBatida: number;
  /** Jornada encerrada (última batida = `saida`). */
  encerraram: number;
  /** Em jornada agora (última batida anterior à saída final). */
  emJornada: number;
  /**
   * Em intervalo de almoço agora (última batida = `saida_almoco`).
   * Subconjunto de `emJornada` — quem saiu para o intervalo ainda não
   * encerrou a jornada. O card "Situação da Equipe" usa a diferença
   * (`emJornada - emIntervalo`) para separar "trabalhando agora" de
   * "em intervalo" sem inventar uma segunda varredura das batidas.
   */
  emIntervalo: number;
  /** Ativos sem nenhuma batida hoje. */
  semBatida: number;
  /** `comBatida / totalAtivos` em %, limitado a 100. */
  cobertura: number;
}

/**
 * Agrega as batidas do dia por colaborador e devolve o retrato da equipe.
 *
 * @param batidas     batidas de hoje (qualquer ordem — a última por colaborador
 *                    é a que vale, então a lista é lida em sequência por quem
 *                    a monta em ordem cronológica; aqui basta a última vista).
 * @param totalAtivos colaboradores ativos da empresa (denominador da cobertura).
 */
export function resumirEquipeDoDia(
  batidas: BatidaEquipe[] = [],
  totalAtivos = 0
): ResumoEquipeDia {
  const ultimaBatida = new Map<string, string>();

  batidas.forEach((batida) => {
    const id = batida?.colaborador_id;
    if (!id) return;
    ultimaBatida.set(id, String(batida?.tipo ?? '').trim().toLowerCase());
  });

  const comBatida = ultimaBatida.size;
  let encerraram = 0;
  let emIntervalo = 0;
  ultimaBatida.forEach((tipo) => {
    if (tipo === 'saida') encerraram += 1;
    if (tipo === 'saida_almoco') emIntervalo += 1;
  });

  const emJornada = Math.max(0, comBatida - encerraram);
  const semBatida = Math.max(0, totalAtivos - comBatida);
  const cobertura = totalAtivos > 0 ? Math.min(100, Math.round((comBatida / totalAtivos) * 100)) : 0;

  return { comBatida, encerraram, emJornada, emIntervalo, semBatida, cobertura };
}

/**
 * Registro com entrada e sem saída = saída não marcada (mesma regra de
 * `PontoInconsistencyPanel`, tipo `forgotten_out`). Serve de pendência de
 * apuração no fechamento.
 */
export function temSaidaPendente(registro: {
  entrada_1?: string | null;
  saida_1?: string | null;
}): boolean {
  return !!registro?.entrada_1 && !registro?.saida_1;
}
