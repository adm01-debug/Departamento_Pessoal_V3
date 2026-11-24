import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * ============================================================================
 * MIGRATION `training_images` — invariantes de segurança (análise estática).
 *
 * A migration NÃO é aplicada nesta fase. Este teste garante que o arquivo que
 * será aplicado na Fase 3 preserva: bucket privado, escrita só admin/backend,
 * leitura por tenant, validação de posse no SQL e reivindicação atômica.
 * Não substitui um teste de RLS em banco real — é o gate possível sem deploy.
 * ============================================================================
 */

const CAMINHO = path.resolve(process.cwd(), 'supabase/migrations/20261023120000_training_images_infrastructure.sql');
const SQL = readFileSync(CAMINHO, 'utf8');

/** SQL sem comentários de linha — evita casar texto explicativo. */
const SEM_COMENTARIOS = SQL.replace(/--[^\n]*/g, '');

describe('migration — bucket e Storage', () => {
  it('cria o bucket privado com limite e MIME allowlist', () => {
    expect(SEM_COMENTARIOS).toMatch(/INSERT INTO storage\.buckets[\s\S]*?'training-images'/);
    expect(SEM_COMENTARIOS).toMatch(/'training-images',\s*false,/);
    expect(SEM_COMENTARIOS).toMatch(/file_size_limit/);
    expect(SEM_COMENTARIOS).toMatch(/image\/webp/);
    expect(SEM_COMENTARIOS).not.toMatch(/'training-images',\s*true/);
  });

  it('leitura de objeto exige vínculo com a empresa do caminho', () => {
    expect(SEM_COMENTARIOS).toMatch(
      /CREATE POLICY "training_images_select_authenticated"[\s\S]*?user_belongs_to_empresa\(auth\.uid\(\),\s*\(\(storage\.foldername\(name\)\)\[1\]\)::uuid\)/
    );
  });

  it('escrita de objeto exige admin E vínculo com a empresa', () => {
    for (const operacao of ['insert', 'update', 'delete']) {
      expect(SEM_COMENTARIOS).toMatch(
        new RegExp(
          `CREATE POLICY "training_images_${operacao}_admin"[\\s\\S]*?is_admin\\(auth\\.uid\\(\\)\\)[\\s\\S]*?user_belongs_to_empresa`
        )
      );
    }
    expect(SEM_COMENTARIOS).not.toMatch(
      /training_images_(insert|update|delete)_authenticated"\s*\n\s*ON storage\.objects\s+FOR (INSERT|UPDATE|DELETE)/
    );
  });
});

describe('migration — tabela training_images', () => {
  it('tem os campos de referência, estado e controle de custo', () => {
    for (const coluna of [
      'empresa_id',
      'content_type',
      'content_id',
      'source_content_id',
      'storage_path',
      'content_hash',
      'status',
      'attempts',
      'last_error',
      'prompt_version',
      'requested_at',
      'completed_at',
    ]) {
      expect(SEM_COMENTARIOS).toMatch(new RegExp(`\\b${coluna}\\b`));
    }
  });

  it('garante uma única capa por conteúdo e caminho dentro do tenant', () => {
    expect(SEM_COMENTARIOS).toMatch(/UNIQUE \(empresa_id, content_type, content_id\)/);
    expect(SEM_COMENTARIOS).toMatch(/UNIQUE \(empresa_id, storage_path\)/);
    expect(SEM_COMENTARIOS).toMatch(/storage_path LIKE empresa_id::text \|\| '\/%'/);
  });

  it('limita estados, tipos e tentativas no banco', () => {
    expect(SEM_COMENTARIOS).toMatch(/content_type IN \('course', 'learning_path', 'training_session', 'certificate'\)/);
    expect(SEM_COMENTARIOS).toMatch(/status IN \('pending', 'processing', 'succeeded', 'failed', 'disabled'\)/);
    expect(SEM_COMENTARIOS).toMatch(/attempts.*<= 5/);
  });

  it('ativa RLS, limita leitura ao tenant e bloqueia escrita do cliente', () => {
    expect(SEM_COMENTARIOS).toMatch(/ALTER TABLE public\.training_images ENABLE ROW LEVEL SECURITY/);
    expect(SEM_COMENTARIOS).toMatch(
      /CREATE POLICY "training_images_select_tenant"[\s\S]*?user_belongs_to_empresa\(auth\.uid\(\), empresa_id\)/
    );
    expect(SEM_COMENTARIOS).toMatch(
      /REVOKE INSERT, UPDATE, DELETE ON public\.training_images FROM anon, authenticated/
    );
    expect(SEM_COMENTARIOS).toMatch(/GRANT SELECT ON public\.training_images TO authenticated/);
    // Política administrativa ampla removida (evita escrita cross-tenant).
    expect(SEM_COMENTARIOS).not.toMatch(/CREATE POLICY "training_images_admin_all"/);
  });

  it('mantém trigger de updated_at e índices de tenant/status', () => {
    expect(SEM_COMENTARIOS).toMatch(/CREATE TRIGGER update_training_images_updated_at/);
    expect(SEM_COMENTARIOS).toMatch(/update_updated_at_column\(\)/);
    expect(SEM_COMENTARIOS).toMatch(/idx_training_images_empresa/);
    expect(SEM_COMENTARIOS).toMatch(/idx_training_images_status/);
  });
});

describe('migration — reivindicação atômica e autorização do backend', () => {
  it('define a função como SECURITY DEFINER com search_path fixo', () => {
    expect(SEM_COMENTARIOS).toMatch(/CREATE OR REPLACE FUNCTION public\.claim_training_image\(/);
    expect(SEM_COMENTARIOS).toMatch(/SECURITY DEFINER/);
    expect(SEM_COMENTARIOS).toMatch(/SET search_path = public/);
  });

  it('valida a posse do conteúdo usando as relações REAIS do schema', () => {
    // curso / trilha têm empresa_id direto
    expect(SEM_COMENTARIOS).toMatch(
      /FROM public\.catalogo_cursos c[\s\S]*?c\.id = p_content_id AND c\.empresa_id = p_empresa_id/
    );
    expect(SEM_COMENTARIOS).toMatch(
      /FROM public\.trilhas_aprendizado t[\s\S]*?t\.id = p_content_id AND t\.empresa_id = p_empresa_id/
    );
    // turma NÃO tem empresa_id: valida pelo curso
    expect(SEM_COMENTARIOS).toMatch(
      /treinamento_instancias i[\s\S]*?JOIN public\.catalogo_cursos c ON c\.id = i\.curso_id/
    );
    // certificado NÃO tem empresa_id: valida pelo colaborador (e curso)
    expect(SEM_COMENTARIOS).toMatch(
      /treinamento_certificados tc[\s\S]*?JOIN public\.colaboradores col ON col\.id = tc\.colaborador_id/
    );
    expect(SEM_COMENTARIOS).toMatch(/conteudo_nao_pertence_a_empresa/);
  });

  it('reivindica em UMA instrução com ON CONFLICT (proteção real de concorrência)', () => {
    expect(SEM_COMENTARIOS).toMatch(/INSERT INTO public\.training_images AS t/);
    expect(SEM_COMENTARIOS).toMatch(/ON CONFLICT \(empresa_id, content_type, content_id\) DO UPDATE/);
    expect(SEM_COMENTARIOS).toMatch(/attempts\s*=\s*CASE/);
    expect(SEM_COMENTARIOS).toMatch(
      /WHEN t\.content_hash IS DISTINCT FROM excluded\.content_hash THEN 1/
    );
    expect(SEM_COMENTARIOS).toMatch(/ELSE t\.attempts \+ 1/);
    expect(SEM_COMENTARIOS).toMatch(/t\.attempts < v_max/);
    expect(SEM_COMENTARIOS).toMatch(/requested_at < now\(\) - p_stale_after/);
    expect(SEM_COMENTARIOS).toMatch(/content_hash IS DISTINCT FROM excluded\.content_hash/);
    expect(SEM_COMENTARIOS).toMatch(/RETURN QUERY SELECT false/);
    expect(SEM_COMENTARIOS).toMatch(/RETURN QUERY SELECT true/);
  });

  it('separa tentativas de processamento, sucessos, falhas e incerteza', () => {
    for (const coluna of [
      'generations',
      'failures',
      'unknown_outcomes',
      'last_attempt_at',
      'operation_id',
      'reconciled_at',
      'reconciled_by',
      'reconciliation_notes',
    ]) {
      expect(SEM_COMENTARIOS).toMatch(new RegExp(`\\b${coluna}\\b`));
    }
    expect(SEM_COMENTARIOS).toMatch(/CREATE TRIGGER track_training_images_outcomes/);
    expect(SEM_COMENTARIOS).toMatch(/LIKE 'resultado_desconhecido%'/);
  });

  it('impede reconciliação sem operador, notas e estado de incerteza', () => {
    expect(SEM_COMENTARIOS).toMatch(
      /CREATE OR REPLACE FUNCTION public\.reconcile_training_image\(/
    );
    expect(SEM_COMENTARIOS).toMatch(/operador_obrigatorio/);
    expect(SEM_COMENTARIOS).toMatch(/notas_obrigatorias/);
    expect(SEM_COMENTARIOS).toMatch(/registro_nao_esta_em_estado_desconhecido/);
    expect(SEM_COMENTARIOS).toMatch(/confirmar_nao_gerado/);
    expect(SEM_COMENTARIOS).toMatch(/manter_bloqueado/);
    expect(SEM_COMENTARIOS).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.reconcile_training_image\([^)]*\) FROM anon, authenticated/
    );
    expect(SEM_COMENTARIOS).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.reconcile_training_image\([^)]*\) TO service_role/
    );
  });

  it('restringe a execução ao service role', () => {
    expect(SEM_COMENTARIOS).toMatch(/REVOKE ALL ON FUNCTION public\.claim_training_image\([^)]*\) FROM PUBLIC/);
    expect(SEM_COMENTARIOS).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.claim_training_image\([^)]*\) FROM anon, authenticated/
    );
    expect(SEM_COMENTARIOS).toMatch(/GRANT EXECUTE ON FUNCTION public\.claim_training_image\([^)]*\) TO service_role/);
  });
});

describe('migration — não destrutiva', () => {
  it('não apaga nem altera registros de tabelas existentes', () => {
    expect(SEM_COMENTARIOS).not.toMatch(/\bDROP TABLE\b/i);
    expect(SEM_COMENTARIOS).not.toMatch(/\bTRUNCATE\b/i);
    expect(SEM_COMENTARIOS).not.toMatch(/\bDELETE FROM\b/i);
    expect(SEM_COMENTARIOS).not.toMatch(/ALTER TABLE public\.(catalogo_cursos|trilhas_aprendizado|treinamento_)/);
    expect(SEM_COMENTARIOS).not.toMatch(/UPDATE public\.(catalogo_cursos|trilhas_aprendizado|treinamento_)/);
  });
});

const AUTOQUEUE = readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20261023130000_training_image_autoqueue.sql'),
  'utf8'
).replace(/--[^\n]*/g, '');

describe('migration — fila automática (desligada por padrão)', () => {
  it('cria a flag de servidor DESLIGADA e inacessível ao navegador', () => {
    expect(AUTOQUEUE).toMatch(/CREATE TABLE IF NOT EXISTS public\.training_image_settings/);
    expect(AUTOQUEUE).toMatch(/autoqueue_enabled boolean NOT NULL DEFAULT false/);
    expect(AUTOQUEUE).toMatch(/REVOKE ALL ON public\.training_image_settings FROM anon, authenticated/);
  });

  it('enfileira por TRIGGER após INSERT de curso e de trilha', () => {
    expect(AUTOQUEUE).toMatch(/CREATE TABLE IF NOT EXISTS public\.training_image_requests/);
    expect(AUTOQUEUE).toMatch(/UNIQUE \(empresa_id, content_type, content_id\)/);
    expect(AUTOQUEUE).toMatch(/AFTER INSERT ON public\.catalogo_cursos/);
    expect(AUTOQUEUE).toMatch(/AFTER INSERT ON public\.trilhas_aprendizado/);
    expect(AUTOQUEUE).toMatch(/enqueue_training_image_request\('course'\)/);
    expect(AUTOQUEUE).toMatch(/enqueue_training_image_request\('learning_path'\)/);
  });

  it('nunca bloqueia o cadastro (erro vira WARNING)', () => {
    expect(AUTOQUEUE).toMatch(/EXCEPTION[\s\S]*?WHEN OTHERS THEN/);
    expect(AUTOQUEUE).toMatch(/RAISE WARNING/);
    expect(AUTOQUEUE).toMatch(/RETURN NEW;/);
  });

  it('reivindica lote com FOR UPDATE SKIP LOCKED e recupera trabalho travado', () => {
    expect(AUTOQUEUE).toMatch(/claim_training_image_requests/);
    expect(AUTOQUEUE).toMatch(/FOR UPDATE SKIP LOCKED/);
    expect(AUTOQUEUE).toMatch(/interval '30 minutes'/);
    expect(AUTOQUEUE).toMatch(/finish_training_image_request/);
    expect(AUTOQUEUE).toMatch(/REVOKE EXECUTE ON FUNCTION public\.claim_training_image_requests\(integer\) FROM anon, authenticated/);
    expect(AUTOQUEUE).toMatch(/GRANT EXECUTE ON FUNCTION public\.claim_training_image_requests\(integer\) TO service_role/);
  });

  it('registra responsável e adiamento sem loop de retentativa', () => {
    expect(AUTOQUEUE).toMatch(/requested_by\s+uuid/);
    expect(AUTOQUEUE).toMatch(/available_at\s+timestamptz NOT NULL DEFAULT now\(\)/);
    expect(AUTOQUEUE).toMatch(/r\.available_at <= now\(\)/);
    expect(AUTOQUEUE).toMatch(/p_retry_after_seconds integer DEFAULT NULL/);
    expect(AUTOQUEUE).toMatch(/p_retry_after_seconds/);
    expect(AUTOQUEUE).toMatch(/VALUES \(NEW\.empresa_id, TG_ARGV\[0\], NEW\.id, auth\.uid\(\)\)/);
  });

  it('oferece backfill idempotente para conteúdo sem capa', () => {
    expect(AUTOQUEUE).toMatch(/CREATE OR REPLACE FUNCTION public\.backfill_training_image_requests\(/);
    expect(AUTOQUEUE).toMatch(/ON CONFLICT \(empresa_id, content_type, content_id\) DO NOTHING/);
    expect(AUTOQUEUE).toMatch(/NOT EXISTS \(\s*SELECT 1 FROM public\.training_images/);
    expect(AUTOQUEUE).toMatch(/GET DIAGNOSTICS v_inseridos = ROW_COUNT/);
    expect(AUTOQUEUE).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.backfill_training_image_requests\(integer\) TO service_role/
    );
  });

  it('não agenda nada automaticamente nesta fase', () => {
    expect(AUTOQUEUE).not.toMatch(/cron\.schedule\(/);
    expect(AUTOQUEUE).not.toMatch(/net\.http_post\(/);
  });
});

const RATE_LIMIT_DUAL = readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20261023140000_edge_rate_limit_dual.sql'),
  'utf8'
).replace(/--[^\n]*/g, '');

describe('migration — rate limit duplo (empresa + usuário)', () => {
  it('verifica os dois baldes em uma única função', () => {
    expect(RATE_LIMIT_DUAL).toMatch(/CREATE OR REPLACE FUNCTION public\.edge_rate_limit_check_dual\(/);
    expect(RATE_LIMIT_DUAL).toMatch(/p_empresa_key/);
    expect(RATE_LIMIT_DUAL).toMatch(/p_usuario_key/);
  });

  it('adquire advisory locks em ordem determinística (sem deadlock)', () => {
    expect(RATE_LIMIT_DUAL).toMatch(/pg_advisory_xact_lock\(hashtext\('rl:' \|\| least\(/);
    expect(RATE_LIMIT_DUAL).toMatch(/pg_advisory_xact_lock\(hashtext\('rl:' \|\| greatest\(/);
  });

  it('só consome quota quando AMBOS permitem', () => {
    expect(RATE_LIMIT_DUAL).toMatch(/IF v_reason IS NOT NULL THEN/);
    expect(RATE_LIMIT_DUAL).toMatch(/INSERT INTO public\.rate_limits \(key, timestamp\)/);
  });

  it('permite modo empresa-only (worker sem usuário confiável)', () => {
    expect(RATE_LIMIT_DUAL).toMatch(/v_tem_usuario\s+boolean/);
    expect(RATE_LIMIT_DUAL).toMatch(/p_usuario_key IS NOT NULL/);
    expect(RATE_LIMIT_DUAL).toMatch(/limite_usuario_invalido/);
    expect(RATE_LIMIT_DUAL).toMatch(/ELSE\s+PERFORM pg_advisory_xact_lock\(hashtext\('rl:' \|\| p_empresa_key\)/);
  });

  it('é exclusivo do backend', () => {
    expect(RATE_LIMIT_DUAL).toMatch(/FROM anon, authenticated/);
    expect(RATE_LIMIT_DUAL).toMatch(/TO service_role/);
  });
});
