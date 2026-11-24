import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { validarAllowlist } from '../../../../supabase/functions/_shared/trainingImages/allowlist';
import { isUuid } from '../../../../supabase/functions/_shared/trainingImages/uuid';

const EMPRESA = '66104399-aba8-4105-bbd3-9bf67820c1d0';
const CURSO = 'aaaa1111-1111-1111-1111-111111111111';
const OUTRA_EMPRESA = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const OUTRO_CURSO = 'a0000003-0000-4000-8000-000000000003';

const CONFIG_VALIDA = { empresaId: EMPRESA, contentId: CURSO };

describe('allowlist temporária de geração de imagem', () => {
  it('aceita empresa e curso exatamente autorizados', () => {
    expect(validarAllowlist({ empresaId: EMPRESA, contentId: CURSO }, CONFIG_VALIDA)).toEqual({
      ok: true,
    });
  });

  it('aceita o UUID de seed do curso (sem bits de variante RFC)', () => {
    expect(isUuid(CURSO)).toBe(true);
    expect(validarAllowlist({ empresaId: EMPRESA, contentId: CURSO }, CONFIG_VALIDA).ok).toBe(true);
  });

  it('normaliza espaços e caixa', () => {
    expect(
      validarAllowlist(
        { empresaId: ` ${EMPRESA.toUpperCase()} `, contentId: `${CURSO.toUpperCase()} ` },
        CONFIG_VALIDA
      )
    ).toEqual({ ok: true });
  });

  it('recusa empresa diferente com 403', () => {
    const resultado = validarAllowlist(
      { empresaId: OUTRA_EMPRESA, contentId: CURSO },
      CONFIG_VALIDA
    );
    expect(resultado).toMatchObject({ ok: false, status: 403, motivo: 'fora_da_allowlist' });
  });

  it('recusa curso diferente com 403', () => {
    const resultado = validarAllowlist(
      { empresaId: EMPRESA, contentId: OUTRO_CURSO },
      CONFIG_VALIDA
    );
    expect(resultado).toMatchObject({ ok: false, status: 403, motivo: 'fora_da_allowlist' });
  });

  it('bloqueia quando a empresa permitida está ausente', () => {
    const resultado = validarAllowlist(
      { empresaId: EMPRESA, contentId: CURSO },
      { empresaId: '', contentId: CURSO }
    );
    expect(resultado).toMatchObject({
      ok: false,
      status: 503,
      motivo: 'allowlist_nao_configurada',
    });
  });

  it('bloqueia quando o curso permitido está ausente', () => {
    const resultado = validarAllowlist(
      { empresaId: EMPRESA, contentId: CURSO },
      { empresaId: EMPRESA, contentId: '' }
    );
    expect(resultado).toMatchObject({
      ok: false,
      status: 503,
      motivo: 'allowlist_nao_configurada',
    });
  });

  it('bloqueia quando ambas as variáveis estão ausentes', () => {
    expect(validarAllowlist({ empresaId: EMPRESA, contentId: CURSO }, {})).toMatchObject({
      ok: false,
      status: 503,
      motivo: 'allowlist_nao_configurada',
    });
  });

  it('bloqueia configuração com UUID inválido', () => {
    expect(
      validarAllowlist(
        { empresaId: EMPRESA, contentId: CURSO },
        { empresaId: 'nao-e-uuid', contentId: CURSO }
      )
    ).toMatchObject({ ok: false, status: 503, motivo: 'allowlist_nao_configurada' });
  });
});

describe('ordem de segurança da allowlist no handler', () => {
  const FUNCAO = readFileSync(
    path.join(process.cwd(), 'supabase/functions/training-image-generate/index.ts'),
    'utf8'
  );

  it('preserva JWT, vínculo e papel antes da allowlist', () => {
    const posAllowlist = FUNCAO.lastIndexOf('validarAllowlist');
    const posVinculo = FUNCAO.indexOf('SEM_ACESSO_A_EMPRESA');
    const posPapel = FUNCAO.indexOf('SEM_PERMISSAO_PARA_GERAR');
    const posGetUser = FUNCAO.indexOf('supabase.auth.getUser');

    expect(posGetUser).toBeGreaterThan(-1);
    expect(posVinculo).toBeGreaterThan(posGetUser);
    expect(posPapel).toBeGreaterThan(posVinculo);
    expect(posAllowlist).toBeGreaterThan(posPapel);
  });

  it('aplica a allowlist antes de idempotência, quota, claim e provedor', () => {
    const posAllowlist = FUNCAO.lastIndexOf('validarAllowlist');

    for (const marco of [
      'consultarEstadoDaCapa',
      'checkRateLimitDuplo',
      'criarOpenAITrainingImageProvider',
      'gerarCapaDeTreinamento',
    ]) {
      expect(posAllowlist, `${marco} deve vir depois da allowlist`).toBeLessThan(
        FUNCAO.lastIndexOf(marco)
      );
    }
  });

  it('lê as duas variáveis server-side e não aceita override do corpo', () => {
    expect(FUNCAO).toMatch(/TRAINING_IMAGE_ALLOWED_EMPRESA_ID/);
    expect(FUNCAO).toMatch(/TRAINING_IMAGE_ALLOWED_CONTENT_ID/);
    expect(FUNCAO).not.toMatch(/allowed_empresa_id/);
    expect(FUNCAO).not.toMatch(/allowed_content_id/);
  });
});
