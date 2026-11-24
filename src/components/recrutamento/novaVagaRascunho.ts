/**
 * ============================================================================
 * RECRUTAMENTO — NOVA VAGA: rascunho do assistente, validação e payload.
 *
 * Este arquivo NÃO tem React nem Supabase: é a régua do diálogo “Anunciar nova
 * vaga” (3 etapas) e a única tradução entre o que o usuário digita e o que a
 * tabela `vagas` aceita. Manter a regra aqui deixa o componente só com a
 * apresentação e permite testar tudo sem montar a janela.
 *
 * ── O QUE A TABELA `vagas` REALMENTE TEM ──────────────────────────────────
 * `supabase/migrations/20260402112748_*.sql` + `chk_vagas_status`
 * (`20260713110053_*.sql`) definem: `titulo`, `descricao`, `departamento`,
 * `cargo`, `tipo_contrato`, `modalidade`, `faixa_salarial_min/max`,
 * `quantidade`, `requisitos`, `beneficios_oferecidos`, `status`
 * (`rascunho|aberta|pausada|encerrada|preenchida|cancelada|arquivada`),
 * `data_abertura`, `data_encerramento`, `responsavel_id`.
 *
 * Consequências (nada é inventado e nenhuma chave desconhecida é enviada):
 *   • `descricao` recebe o texto da vaga + as seções “Responsabilidades” e
 *     “Diferenciais” — o banco só tem UM campo de texto longo para o anúncio;
 *   • `requisitos` e `beneficios_oferecidos` são TEXT com itens separados por
 *     vírgula (é assim que o card da vaga volta a montar as pílulas), então as
 *     listas são unidas por “, ”;
 *   • “Salvar rascunho” é REAL: grava com `status = 'rascunho'` (valor aceito
 *     pelo CHECK do banco). Publicar grava `status = 'aberta'`.
 * ============================================================================
 */

/** `status` usados por este fluxo — os dois valores aceitos pelo CHECK. */
export type NovaVagaStatus = 'aberta' | 'rascunho';

/** Etapas do assistente. */
export type EtapaNovaVaga = 1 | 2 | 3;

/**
 * O que o assistente coleta. `senioridade` e `localizacao` existem na tela
 * aprovada, mas NÃO têm coluna em `vagas`: ficam no rascunho (prévia/revisão) e
 * não são enviados ao banco — ver `LIMITACOES_SCHEMA`.
 */
export interface RascunhoVaga {
  titulo: string;
  departamento: string;
  tipoContrato: string;
  senioridade: string;
  modalidade: string;
  quantidade: number;
  localizacao: string;
  divulgarFaixa: boolean;
  /** Valores em reais (não em centavos). `0` = campo vazio. */
  faixaMin: number;
  faixaMax: number;
  descricao: string;
  responsabilidades: string[];
  requisitos: string[];
  diferenciais: string[];
  beneficios: string[];
}

/** Estado inicial: nada selecionado além da quantidade padrão (1 vaga). */
export const RASCUNHO_VAZIO: RascunhoVaga = {
  titulo: '',
  departamento: '',
  tipoContrato: '',
  senioridade: '',
  modalidade: '',
  quantidade: 1,
  localizacao: '',
  divulgarFaixa: false,
  faixaMin: 0,
  faixaMax: 0,
  descricao: '',
  responsabilidades: [],
  requisitos: [],
  diferenciais: [],
  beneficios: [],
};

/**
 * Campos que a tela coleta e a tabela `vagas` não armazena. A limitação é
 * declarada aqui (e no relatório da tarefa) em vez de virar chave inválida no
 * INSERT ou texto escondido dentro de outro campo.
 */
export const LIMITACOES_SCHEMA = {
  semColuna: ['senioridade', 'localizacao'] as const,
  observacao:
    'A tabela `vagas` não possui colunas `senioridade` nem `localizacao`; os dois campos ficam na prévia/revisão e não são persistidos até existir migration autorizada.',
};

/**
 * Opções canônicas dos seletores. `tipo_contrato` e `modalidade` são TEXT no
 * banco (sem CHECK), então os rótulos seguem os valores já usados nos registros
 * do módulo (`CLT`, `Remoto`, `Híbrido`, `Presencial`).
 */
export const OPCOES_TIPO_CONTRATO = ['CLT', 'PJ', 'Estágio', 'Aprendiz', 'Temporário'] as const;
export const OPCOES_SENIORIDADE = ['Júnior', 'Pleno', 'Sênior', 'Especialista'] as const;
export const OPCOES_MODALIDADE = ['Presencial', 'Híbrido', 'Remoto'] as const;

/** Limites de texto/listas (validados na tela e usados nos contadores). */
export const LIMITES = {
  titulo: { min: 3, max: 120 },
  departamento: { max: 80 },
  localizacao: { max: 80 },
  descricao: { min: 40, max: 2000 },
  lista: { itens: 12, item: 60 },
} as const;

export type CampoRascunho = keyof RascunhoVaga;
export type ErrosRascunho = Partial<Record<CampoRascunho, string>>;

export function temErros(erros: ErrosRascunho): boolean {
  return Object.keys(erros).length > 0;
}
/**
 * Valida uma etapa isolada. A etapa 3 (revisão) não tem campos próprios: quem
 * publica revalida 1 e 2 com `errosDaPublicacao`.
 */
export function validarEtapa(etapa: EtapaNovaVaga, rascunho: RascunhoVaga): ErrosRascunho {
  const erros: ErrosRascunho = {};

  if (etapa === 1) {
    const titulo = rascunho.titulo.trim();
    if (!titulo) erros.titulo = 'Informe o título da vaga.';
    else if (titulo.length < LIMITES.titulo.min) erros.titulo = 'O título precisa de pelo menos 3 caracteres.';

    if (!rascunho.departamento.trim()) erros.departamento = 'Informe o departamento.';
    if (!rascunho.tipoContrato.trim()) erros.tipoContrato = 'Selecione o tipo de contratação.';
    if (!rascunho.senioridade.trim()) erros.senioridade = 'Selecione a senioridade.';
    if (!rascunho.modalidade.trim()) erros.modalidade = 'Selecione a modalidade de trabalho.';

    if (!Number.isInteger(rascunho.quantidade) || rascunho.quantidade < 1) {
      erros.quantidade = 'A quantidade deve ser um número inteiro maior que zero.';
    }

    if (
      rascunho.divulgarFaixa &&
      rascunho.faixaMin > 0 &&
      rascunho.faixaMax > 0 &&
      rascunho.faixaMax < rascunho.faixaMin
    ) {
      erros.faixaMax = 'O máximo não pode ser menor que o mínimo.';
    }
    return erros;
  }

  if (etapa === 2) {
    const descricao = rascunho.descricao.trim();
    if (!descricao) erros.descricao = 'Descreva a vaga.';
    else if (descricao.length < LIMITES.descricao.min) {
      erros.descricao = `Descreva a vaga com pelo menos ${LIMITES.descricao.min} caracteres.`;
    }
    if (normalizarLista(rascunho.requisitos).length === 0) {
      erros.requisitos = 'Adicione ao menos um requisito.';
    }
  }

  return erros;
}

/** Revalida 1 + 2 antes de publicar (a revisão não tem campos próprios). */
export function errosDaPublicacao(rascunho: RascunhoVaga): ErrosRascunho {
  return { ...validarEtapa(1, rascunho), ...validarEtapa(2, rascunho) };
}

/** Rascunho salvo parcialmente: exige apenas o título (o resto fica para depois). */
export function podeSalvarRascunho(rascunho: RascunhoVaga): boolean {
  return rascunho.titulo.trim().length >= LIMITES.titulo.min;
}

/** Remove espaços, vazios e repetidos (sem diferenciar maiúsculas). */
export function normalizarLista(itens: readonly string[]): string[] {
  const vistos = new Set<string>();
  const saida: string[] = [];
  for (const item of itens) {
    const limpo = item.trim().replace(/\s+/g, ' ');
    if (!limpo) continue;
    const chave = limpo.toLocaleLowerCase('pt-BR');
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    saida.push(limpo);
  }
  return saida;
}

/**
 * Adiciona um item à lista (Enter/vírgula no campo de pílulas). Devolve a MESMA
 * referência quando o item é vazio, repetido ou a lista já está no limite — o
 * componente usa isso para não re-renderizar à toa.
 */
export function adicionarNaLista(lista: readonly string[], texto: string): readonly string[] {
  const limpo = texto.trim().replace(/\s+/g, ' ').slice(0, LIMITES.lista.item);
  if (!limpo) return lista;
  const atual = normalizarLista(lista);
  if (atual.length >= LIMITES.lista.itens) return lista;
  if (atual.some((item) => item.toLocaleLowerCase('pt-BR') === limpo.toLocaleLowerCase('pt-BR'))) return lista;
  return [...atual, limpo];
}

/** Remove um item (comparação pelo texto exibido). */
export function removerDaLista(lista: readonly string[], texto: string): string[] {
  return lista.filter((item) => item !== texto);
}

function bloco(titulo: string, itens: readonly string[]): string | null {
  const lista = normalizarLista(itens);
  if (lista.length === 0) return null;
  return `${titulo}:\n${lista.map((item) => `• ${item}`).join('\n')}`;
}

/**
 * Texto final do campo `descricao`: o anúncio digitado + as seções que não têm
 * coluna própria. Some quando a seção está vazia (nenhum cabeçalho órfão).
 */
export function textoDescricao(rascunho: RascunhoVaga): string {
  return [
    rascunho.descricao.trim(),
    bloco('Responsabilidades', rascunho.responsabilidades),
    bloco('Diferenciais', rascunho.diferenciais),
  ]
    .filter((parte): parte is string => Boolean(parte))
    .join('\n\n');
}
/**
 * Payload do INSERT em `vagas`. Type alias (e não interface) de propósito:
 * `recrutamentoService.criarVaga` recebe `Record<string, unknown>`, e só um
 * alias ganha a assinatura de índice implícita.
 */
export type PayloadVaga = {
  empresa_id?: string;
  titulo: string;
  cargo: string;
  departamento: string;
  tipo_contrato: string;
  modalidade: string;
  quantidade: number;
  faixa_salarial_min: number | null;
  faixa_salarial_max: number | null;
  descricao: string;
  requisitos: string;
  beneficios_oferecidos: string | null;
  status: NovaVagaStatus;
  data_abertura?: string | null;
};

/**
 * Traduz o rascunho para o contrato do banco.
 *
 * • `cargo` recebe o título (mesma convenção das vagas já existentes/mocks);
 * • faixa salarial só é enviada quando “divulgar faixa” está ligado — o toggle
 *   decide se o dado vai para o anúncio;
 * • `data_abertura` é omitida quando publicada (o banco usa `CURRENT_DATE`) e
 *   enviada como `null` no rascunho (a vaga ainda não foi aberta).
 */
export function montarPayloadVaga(
  rascunho: RascunhoVaga,
  opcoes: { empresaId?: string; status: NovaVagaStatus }
): PayloadVaga {
  const { empresaId, status } = opcoes;
  const requisitos = normalizarLista(rascunho.requisitos);
  const beneficios = normalizarLista(rascunho.beneficios);
  const divulgar = rascunho.divulgarFaixa;

  return {
    ...(empresaId ? { empresa_id: empresaId } : {}),
    titulo: rascunho.titulo.trim().slice(0, LIMITES.titulo.max),
    cargo: rascunho.titulo.trim().slice(0, LIMITES.titulo.max),
    departamento: rascunho.departamento.trim().slice(0, LIMITES.departamento.max),
    tipo_contrato: rascunho.tipoContrato.trim(),
    modalidade: rascunho.modalidade.trim(),
    quantidade: Math.max(1, Math.trunc(rascunho.quantidade)),
    faixa_salarial_min: divulgar && rascunho.faixaMin > 0 ? rascunho.faixaMin : null,
    faixa_salarial_max: divulgar && rascunho.faixaMax > 0 ? rascunho.faixaMax : null,
    descricao: textoDescricao(rascunho),
    requisitos: requisitos.join(', '),
    beneficios_oferecidos: beneficios.length > 0 ? beneficios.join(', ') : null,
    status,
    ...(status === 'rascunho' ? { data_abertura: null } : {}),
  };
}

const MOEDA = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

/** “R$ 4.500 – R$ 6.000” / “A partir de R$ 4.500” / “Até R$ 6.000”. */
export function formatarFaixaSalarial(minimo: number, maximo: number): string | null {
  const min = Number.isFinite(minimo) ? minimo : 0;
  const max = Number.isFinite(maximo) ? maximo : 0;
  if (min > 0 && max > 0) return `${MOEDA.format(min)} – ${MOEDA.format(max)}`;
  if (min > 0) return `A partir de ${MOEDA.format(min)}`;
  if (max > 0) return `Até ${MOEDA.format(max)}`;
  return null;
}

/** Valor em reais → texto do campo mascarado (“R$ 4.500,00”), vazio quando 0. */
export function formatarMoedaDigitada(reais: number): string {
  if (!Number.isFinite(reais) || reais <= 0) return '';
  return reais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Texto do campo mascarado → reais. Mesma régua do `CurrencyInput` (centavos). */
export function lerMoedaDigitada(texto: string): number {
  const digitos = texto.replace(/\D/g, '');
  if (!digitos) return 0;
  return Number(digitos) / 100;
}
