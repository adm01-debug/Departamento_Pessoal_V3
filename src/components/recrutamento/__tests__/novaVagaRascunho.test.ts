import { describe, expect, it } from 'vitest';
import {
  LIMITES,
  LIMITACOES_SCHEMA,
  RASCUNHO_VAZIO,
  adicionarNaLista,
  errosDaPublicacao,
  formatarFaixaSalarial,
  formatarMoedaDigitada,
  lerMoedaDigitada,
  montarPayloadVaga,
  normalizarLista,
  podeSalvarRascunho,
  removerDaLista,
  temErros,
  textoDescricao,
  validarEtapa,
  type RascunhoVaga,
} from '../novaVagaRascunho';

/** Rascunho completo e válido nas duas primeiras etapas (base dos cenários). */
const COMPLETO: RascunhoVaga = {
  titulo: 'Desenvolvedor(a) Full Stack Sênior',
  departamento: 'Tecnologia',
  tipoContrato: 'CLT',
  senioridade: 'Sênior',
  modalidade: 'Remoto',
  quantidade: 2,
  localizacao: 'São Paulo - SP',
  divulgarFaixa: true,
  faixaMin: 12000,
  faixaMax: 16000,
  descricao: 'Desenvolvimento de aplicações web de alta performance no time de plataforma.',
  responsabilidades: ['Desenvolver novas features', 'Revisar código do time'],
  requisitos: ['React', 'TypeScript', 'PostgreSQL'],
  diferenciais: ['Experiência com AWS'],
  beneficios: ['Plano de saúde', 'Vale-refeição'],
};

function rascunho(override: Partial<RascunhoVaga> = {}): RascunhoVaga {
  return { ...COMPLETO, ...override };
}

/**
 * O `Intl` usa espaço não separável entre “R$” e o número; formatar pela mesma
 * régua evita comparar com um espaço comum e quebrar o teste sem motivo.
 */
const moeda = (valor: number, casas = 0) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: casas });

describe('validarEtapa', () => {
  it('aceita um rascunho completo na etapa 1', () => {
    expect(validarEtapa(1, rascunho())).toEqual({});
  });

  it('exige título, departamento, contratação, senioridade e modalidade', () => {
    const erros = validarEtapa(1, RASCUNHO_VAZIO);
    expect(Object.keys(erros).sort()).toEqual(['departamento', 'modalidade', 'senioridade', 'tipoContrato', 'titulo']);
    expect(temErros(erros)).toBe(true);
  });

  it('cobra o mínimo de 3 caracteres no título', () => {
    expect(validarEtapa(1, rascunho({ titulo: '  RH  ' })).titulo).toBe('O título precisa de pelo menos 3 caracteres.');
    expect(validarEtapa(1, rascunho({ titulo: '   ' })).titulo).toBe('Informe o título da vaga.');
  });

  it('recusa quantidade que não seja inteiro positivo', () => {
    expect(validarEtapa(1, rascunho({ quantidade: 0 })).quantidade).toContain('inteiro');
    expect(validarEtapa(1, rascunho({ quantidade: 1.5 })).quantidade).toContain('inteiro');
  });

  it('só compara a faixa salarial quando “divulgar faixa” está ligado', () => {
    expect(validarEtapa(1, rascunho({ faixaMin: 9000, faixaMax: 5000 })).faixaMax).toBe(
      'O máximo não pode ser menor que o mínimo.'
    );
    expect(
      validarEtapa(1, rascunho({ divulgarFaixa: false, faixaMin: 9000, faixaMax: 5000 })).faixaMax
    ).toBeUndefined();
  });

  it('exige descrição mínima e ao menos um requisito na etapa 2', () => {
    const erros = validarEtapa(2, rascunho({ descricao: 'Curta', requisitos: [] }));
    expect(erros.descricao).toBe(`Descreva a vaga com pelo menos ${LIMITES.descricao.min} caracteres.`);
    expect(erros.requisitos).toBe('Adicione ao menos um requisito.');
    expect(validarEtapa(2, rascunho())).toEqual({});
  });

  it('não tem campos próprios na etapa 3 (revisão)', () => {
    expect(validarEtapa(3, RASCUNHO_VAZIO)).toEqual({});
  });
});

describe('errosDaPublicacao', () => {
  it('reúne os erros das etapas 1 e 2', () => {
    const erros = errosDaPublicacao(RASCUNHO_VAZIO);
    expect(erros.titulo).toBeTruthy();
    expect(erros.descricao).toBeTruthy();
  });

  it('libera a publicação de um rascunho completo', () => {
    expect(temErros(errosDaPublicacao(rascunho()))).toBe(false);
  });
});

describe('podeSalvarRascunho', () => {
  it('aceita apenas o título preenchido', () => {
    expect(podeSalvarRascunho(RASCUNHO_VAZIO)).toBe(false);
    expect(podeSalvarRascunho(rascunho({ titulo: 'Analista de RH' }))).toBe(true);
  });
});

describe('normalizarLista', () => {
  it('remove vazios, espaços extra e repetidos sem diferenciar caixa', () => {
    expect(normalizarLista(['  React  ', 'react', '', '   ', 'Node   JS'])).toEqual(['React', 'Node JS']);
  });
});

describe('adicionarNaLista', () => {
  it('adiciona o item aparado e devolve a MESMA referência quando não muda', () => {
    const lista = ['React'];
    const comNode = adicionarNaLista(lista, '  Node.js  ');
    expect(comNode).toEqual(['React', 'Node.js']);
    expect(adicionarNaLista(comNode, 'REACT')).toBe(comNode);
    expect(adicionarNaLista(comNode, '   ')).toBe(comNode);
  });

  it('respeita o teto de itens e o tamanho de cada item', () => {
    const cheia = Array.from({ length: LIMITES.lista.itens }, (_, i) => `Item ${i}`);
    expect(adicionarNaLista(cheia, 'Extra')).toBe(cheia);
    const [longo] = adicionarNaLista([], 'x'.repeat(LIMITES.lista.item + 20)) as string[];
    expect(longo).toHaveLength(LIMITES.lista.item);
  });
});

describe('removerDaLista', () => {
  it('remove pelo texto exibido e preserva o resto', () => {
    expect(removerDaLista(['React', 'Vue'], 'React')).toEqual(['Vue']);
    expect(removerDaLista(['React'], 'Angular')).toEqual(['React']);
  });
});

describe('textoDescricao', () => {
  it('anexa responsabilidades e diferenciais ao anúncio', () => {
    expect(textoDescricao(rascunho())).toBe(
      [
        COMPLETO.descricao,
        'Responsabilidades:\n• Desenvolver novas features\n• Revisar código do time',
        'Diferenciais:\n• Experiência com AWS',
      ].join('\n\n')
    );
  });

  it('não deixa cabeçalho órfão quando as seções estão vazias', () => {
    expect(textoDescricao(rascunho({ responsabilidades: [], diferenciais: [] })).trim()).toBe(COMPLETO.descricao);
  });
});
describe('montarPayloadVaga', () => {
  it('traduz o rascunho para as colunas reais de `vagas`', () => {
    const payload = montarPayloadVaga(rascunho(), { empresaId: 'empresa-1', status: 'aberta' });
    expect(payload).toMatchObject({
      empresa_id: 'empresa-1',
      titulo: COMPLETO.titulo,
      cargo: COMPLETO.titulo,
      departamento: 'Tecnologia',
      tipo_contrato: 'CLT',
      modalidade: 'Remoto',
      quantidade: 2,
      faixa_salarial_min: 12000,
      faixa_salarial_max: 16000,
      requisitos: 'React, TypeScript, PostgreSQL',
      beneficios_oferecidos: 'Plano de saúde, Vale-refeição',
      status: 'aberta',
    });
  });

  it('não envia colunas inexistentes no schema', () => {
    const payload = montarPayloadVaga(rascunho(), { status: 'aberta' }) as Record<string, unknown>;
    for (const campo of LIMITACOES_SCHEMA.semColuna) {
      expect(payload).not.toHaveProperty(campo);
    }
    expect(payload).not.toHaveProperty('empresa_id');
  });

  it('omite `data_abertura` ao publicar e envia null no rascunho', () => {
    expect(montarPayloadVaga(rascunho(), { status: 'aberta' })).not.toHaveProperty('data_abertura');
    const salvo = montarPayloadVaga(rascunho(), { status: 'rascunho' });
    expect(salvo.data_abertura).toBeNull();
    expect(salvo.status).toBe('rascunho');
  });

  it('zera a faixa quando “divulgar faixa” está desligado e normaliza a quantidade', () => {
    const payload = montarPayloadVaga(rascunho({ divulgarFaixa: false, quantidade: 0 }), {
      status: 'aberta',
    });
    expect(payload.faixa_salarial_min).toBeNull();
    expect(payload.faixa_salarial_max).toBeNull();
    expect(payload.quantidade).toBe(1);
  });

  it('usa null quando não há benefícios', () => {
    expect(montarPayloadVaga(rascunho({ beneficios: [] }), { status: 'aberta' }).beneficios_oferecidos).toBeNull();
  });
});

describe('faixa salarial', () => {
  it('formata mínimo e máximo, só um dos lados ou nada', () => {
    expect(formatarFaixaSalarial(4500, 6000)).toBe(`${moeda(4500)} – ${moeda(6000)}`);
    expect(formatarFaixaSalarial(4500, 0)).toBe(`A partir de ${moeda(4500)}`);
    expect(formatarFaixaSalarial(0, 6000)).toBe(`Até ${moeda(6000)}`);
    expect(formatarFaixaSalarial(0, 0)).toBeNull();
  });

  it('converte reais para o texto do campo mascarado e de volta', () => {
    expect(formatarMoedaDigitada(0)).toBe('');
    expect(formatarMoedaDigitada(4500)).toBe(moeda(4500, 2));
    expect(lerMoedaDigitada('R$ 4.500,00')).toBe(4500);
    expect(lerMoedaDigitada('')).toBe(0);
  });
});
