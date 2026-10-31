import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { linhaCertificado } from './certRow.ts';

const COLUNAS_REAIS = new Set([
  'id', 'empresa_id', 'subject', 'issuer', 'valid_from', 'valid_to', 'thumbprint', 'ativo',
  'created_at', 'arquivo_base64', 'senha_encriptada', 'cnpj_cpf',
]);

Deno.test('certificados_digitais: só grava colunas que existem', () => {
  const row = linhaCertificado(
    { empresaId: 'e', nome: 'ACME', cnpj: '12.345.678/0001-90', issuer: 'AC', validFrom: '2026-01-01', validTo: '2027-01-01' },
    'S', 'A',
  );
  for (const k of Object.keys(row)) assertEquals(COLUNAS_REAIS.has(k), true, `coluna inexistente: ${k}`);
  assertEquals(row.subject, 'ACME');
  assertEquals(row.cnpj_cpf, '12345678000190');
  assertEquals(row.senha_encriptada, 'S');
});

Deno.test('certificados_digitais: cnpj ausente vira null', () => {
  const row = linhaCertificado({ empresaId: 'e', nome: 'X', issuer: 'AC', validFrom: '2026-01-01', validTo: '2027-01-01' }, 'S', 'A');
  assertEquals(row.cnpj_cpf, null);
});
