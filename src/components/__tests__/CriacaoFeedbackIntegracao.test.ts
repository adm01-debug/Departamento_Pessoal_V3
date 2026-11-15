/**
 * Integração local da criação — a ponte entre o formulário existente e a RPC
 * auditada. Cobre idempotência (mesma tentativa × operação nova), preservação
 * de TODOS os campos, validações e payload da RPC. Sem rede, sem banco.
 */
import { describe, it, expect } from 'vitest';
import {
  assinaturaFeedback,
  camposParaGuarda,
  criarChaveIdempotente,
  gerarIdOperacao,
  payloadCriacaoSegura,
  textoOuNulo,
  validarEntradaFeedback,
  type EntradaFeedbackForm,
} from '../avaliacao/criacaoFeedback';

const ENTRADA: EntradaFeedbackForm = {
  avaliado_id: 'colab-1',
  avaliador_id: 'colab-2',
  ciclo_id: 'ciclo-1',
  tipo: 'gestor',
  nota_geral: 4.5,
  potencial: 4,
  pontos_fortes: 'Entrega consistente',
  pontos_melhoria: 'Delegação',
  comentarios: 'Ciclo fechado no prazo',
};

const CTX = { empresaId: 'emp-1', idOperacao: 'op-1' };

describe('textoOuNulo', () => {
  it('apara e converte vazio em nulo', () => {
    expect(textoOuNulo('  ok  ')).toBe('ok');
    expect(textoOuNulo('')).toBeNull();
    expect(textoOuNulo('   ')).toBeNull();
    expect(textoOuNulo(null)).toBeNull();
    expect(textoOuNulo(undefined)).toBeNull();
  });
});

describe('assinaturaFeedback (identifica a TENTATIVA)', () => {
  it('é estável e ignora a ordem das chaves', () => {
    const reordenado: EntradaFeedbackForm = {
      comentarios: ENTRADA.comentarios,
      nota_geral: ENTRADA.nota_geral,
      tipo: ENTRADA.tipo,
      ciclo_id: ENTRADA.ciclo_id,
      avaliador_id: ENTRADA.avaliador_id,
      avaliado_id: ENTRADA.avaliado_id,
      potencial: ENTRADA.potencial,
      pontos_melhoria: ENTRADA.pontos_melhoria,
      pontos_fortes: ENTRADA.pontos_fortes,
    };
    expect(assinaturaFeedback(reordenado)).toBe(assinaturaFeedback(ENTRADA));
  });

  it('ignora espaço sobrando nos textos', () => {
    expect(assinaturaFeedback({ ...ENTRADA, comentarios: '  Ciclo fechado no prazo ' })).toBe(
      assinaturaFeedback(ENTRADA)
    );
  });

  it('muda quando qualquer campo enviado muda', () => {
    const base = assinaturaFeedback(ENTRADA);
    expect(assinaturaFeedback({ ...ENTRADA, nota_geral: 4 })).not.toBe(base);
    expect(assinaturaFeedback({ ...ENTRADA, potencial: null })).not.toBe(base);
    expect(assinaturaFeedback({ ...ENTRADA, comentarios: 'outro texto' })).not.toBe(base);
    expect(assinaturaFeedback({ ...ENTRADA, tipo: 'par' })).not.toBe(base);
  });
});

describe('gerarIdOperacao', () => {
  it('gera identificador não vazio e distinto a cada chamada', () => {
    const a = gerarIdOperacao();
    const b = gerarIdOperacao();
    expect(a.length).toBeGreaterThan(8);
    expect(a).not.toBe(b);
  });
});

describe('criarChaveIdempotente (reenvio × operação nova)', () => {
  it('reaproveita a chave na MESMA tentativa', () => {
    const chave = criarChaveIdempotente(() => 'k1');
    expect(chave.para('sig-a')).toBe('k1');
    expect(chave.para('sig-a')).toBe('k1');
    expect(chave.para('sig-a')).toBe('k1');
    expect(chave.tentativas()).toBe(3);
  });

  it('gera chave nova quando o CONTEÚDO muda', () => {
    const geradas = ['k1', 'k2'];
    const chave = criarChaveIdempotente(() => geradas.shift() as string);
    expect(chave.para('sig-a')).toBe('k1');
    expect(chave.para('sig-b')).toBe('k2');
  });

  it('gera chave nova depois do sucesso (operação nova de mesmo conteúdo)', () => {
    const geradas = ['k1', 'k2'];
    const chave = criarChaveIdempotente(() => geradas.shift() as string);
    expect(chave.para('sig-a')).toBe('k1');
    chave.confirmar();
    expect(chave.atual()).toBeNull();
    expect(chave.tentativas()).toBe(0);
    expect(chave.para('sig-a')).toBe('k2');
  });

  it('mantém a chave após FALHA (reenvio seguro)', () => {
    const chave = criarChaveIdempotente(() => 'k1');
    const primeira = chave.para(assinaturaFeedback(ENTRADA));
    // falha de rede / erro da RPC: nada é confirmado
    const reenvio = chave.para(assinaturaFeedback(ENTRADA));
    expect(reenvio).toBe(primeira);
  });
});

describe('validarEntradaFeedback', () => {
  it('aceita a entrada completa do formulário', () => {
    const r = validarEntradaFeedback(ENTRADA);
    expect(r.valida).toBe(true);
    expect(r.faltando).toEqual([]);
  });

  it('lista o que falta em linguagem de interface', () => {
    const r = validarEntradaFeedback({});
    expect(r.valida).toBe(false);
    expect(r.faltando).toEqual([
      'colaborador avaliado',
      'ciclo de avaliação',
      'tipo do feedback',
      'nota de desempenho (escala de 0,5 a 5)',
    ]);
    expect(r.descricao).toContain('Informe:');
  });

  it('recusa nota fora da escala e tipo desconhecido', () => {
    expect(validarEntradaFeedback({ ...ENTRADA, nota_geral: 7 }).faltando).toContain(
      'nota de desempenho (escala de 0,5 a 5)'
    );
    expect(validarEntradaFeedback({ ...ENTRADA, tipo: 'chefia' }).faltando).toContain('tipo do feedback');
  });
});

describe('payloadCriacaoSegura', () => {
  it('preserva TODOS os campos do formulário', () => {
    const p = payloadCriacaoSegura(ENTRADA, CTX);
    expect(p).toEqual({
      empresaId: 'emp-1',
      avaliadoId: 'colab-1',
      cicloId: 'ciclo-1',
      tipo: 'gestor',
      notaGeral: 4.5,
      potencial: 4,
      avaliadorId: 'colab-2',
      pontosFortes: 'Entrega consistente',
      pontosMelhoria: 'Delegação',
      comentarios: 'Ciclo fechado no prazo',
      idOperacao: 'op-1',
    });
  });

  it('normaliza textos vazios e Potencial fora da escala para nulo', () => {
    const p = payloadCriacaoSegura({ ...ENTRADA, pontos_fortes: '  ', potencial: 0, comentarios: '' }, CTX);
    expect(p?.pontosFortes).toBeNull();
    expect(p?.comentarios).toBeNull();
    expect(p?.potencial).toBeNull();
  });

  it('normaliza o tipo para minúsculas', () => {
    expect(payloadCriacaoSegura({ ...ENTRADA, tipo: 'GESTOR' }, CTX)?.tipo).toBe('gestor');
  });

  it('devolve nulo sem empresa, sem chave de idempotência ou com dados faltando', () => {
    expect(payloadCriacaoSegura(ENTRADA, { idOperacao: 'op-1' })).toBeNull();
    expect(payloadCriacaoSegura(ENTRADA, { empresaId: 'emp-1' })).toBeNull();
    expect(payloadCriacaoSegura({}, CTX)).toBeNull();
  });
});

describe('camposParaGuarda', () => {
  it('expõe todos os identificadores que a guarda deve inspecionar', () => {
    expect(camposParaGuarda(ENTRADA, 'emp-1', 'op-1')).toEqual({
      empresa_id: 'emp-1',
      avaliado_id: 'colab-1',
      avaliador_id: 'colab-2',
      ciclo_id: 'ciclo-1',
      id_operacao: 'op-1',
    });
  });

  it('mostra o id fictício do cenário de demonstração', () => {
    const campos = camposParaGuarda({ ...ENTRADA, ciclo_id: 'mock-ciclo-3' }, 'mock-empresa-1', 'op-1');
    expect(campos.ciclo_id).toBe('mock-ciclo-3');
    expect(campos.empresa_id).toBe('mock-empresa-1');
  });
});
