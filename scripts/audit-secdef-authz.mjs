#!/usr/bin/env node
/**
 * Gate de regressão de funções SECURITY DEFINER.
 *
 * Uma função `SECURITY DEFINER` roda com os privilégios do OWNER, o que
 * significa que ela ATRAVESSA todo o RLS da tabela que toca. Se ela também
 * é executável por `anon`/`authenticated` e aceita identificadores vindos do
 * chamador (`p_colaborador_id`, `p_empresa_id`, ...) sem conferir nada, ela
 * vira um buraco que anula todo o isolamento multi-tenant construído nas
 * políticas — sem que nenhuma política precise estar errada.
 *
 * Incidentes reais que motivaram este gate:
 * - `registrar_batida_ponto`: recebia colaborador E empresa do cliente e
 *   gravava como veio. Qualquer usuário logado podia forjar batida de ponto
 *   para qualquer colaborador de qualquer empresa (fraude de jornada,
 *   Portaria 671).
 * - `gerar_canonical_espelho_ponto`: devolvia nome, CPF, PIS e matrícula de
 *   qualquer colaborador do sistema.
 * - `sst_regimento_assinar`: registrava aceite formal do regimento interno em
 *   nome de colaborador de outra empresa.
 * - `clinicas_proximas`: listava clínicas parceiras (razão social, telefone)
 *   de qualquer empresa informando o id dela.
 *
 * ESTRATÉGIA
 * O ponto delicado é evitar falso positivo. Uma função pode não citar
 * `auth.uid()` em lugar nenhum e ainda assim ser segura, porque delega a
 * verificação a um helper — `pcs_gerar_grades` chama `pcs_pode_gerir_plano`,
 * que por sua vez chama `has_role`/`user_belongs_to_empresa`. Uma varredura
 * por regex raso reprova essas funções, o time perde a confiança no gate e
 * desliga o gate. Por isso a verificação segue o FECHO TRANSITIVO de chamadas:
 * uma função é considerada autorizada se ela, ou qualquer função que ela
 * invoque (até MAX_DEPTH), correlaciona com o usuário ou com o tenant.
 *
 * Saída: 0 quando limpo, 1 quando há regressão. Sem banco acessível encerra
 * em 0 avisando — um gate que não pôde rodar não deve reprovar o build, mas
 * também não deve se declarar aprovado em silêncio.
 */

import { execFileSync } from 'node:child_process';

/** Profundidade máxima ao seguir chamadas função→função. */
const MAX_DEPTH = 4;

/**
 * Marcadores que provam correlação com o usuário autenticado ou com o tenant.
 * `current_setting` entra porque algumas rotinas internas leem o contexto da
 * requisição em vez de `auth.uid()`.
 */
const AUTHZ_MARKERS =
  /auth\.uid\(\)|has_role|is_admin|pertence_a_empresa|user_belongs_to_empresa|get_user_empresas|get_user_scope_empresas|current_setting/i;

/**
 * Funções deliberadamente alcançáveis sem sessão. A autorização delas NÃO é
 * o usuário logado — é a posse de um token opaco de alta entropia, validado
 * dentro do próprio corpo, com expiração e limite de tentativas. Exigir
 * `auth.uid()` aqui quebraria o produto: são justamente os fluxos que o
 * candidato/colaborador acessa por link, antes de ter conta.
 *
 * Cada entrada precisa de justificativa — a allowlist é o lugar onde um
 * buraco futuro passaria despercebido se virasse depósito.
 */
const ALLOWLIST = new Map([
  // Helper de RLS: 10 políticas (dependentes, holerites, documentos_colaborador,
  // exames...) a invocam no próprio predicado, então `authenticated` PRECISA
  // manter EXECUTE — revogar derrubaria as políticas que protegem esse PII.
  // Não pode autorizar internamente sem recursão. Exposição residual: mapeia
  // colaborador_id -> empresa_id, ambos uuid, sem PII e exigindo um uuid já
  // conhecido. Verificar as políticas dependentes antes de remover daqui.
  ['empresa_do_colaborador', 'Helper usado dentro de 10 políticas RLS; retorna apenas empresa_id (uuid) a partir de um colaborador_id já conhecido.'],
  ['contrato_assinar_por_token', 'Assinatura de contrato por link; valida token + CPF.'],
  ['contrato_consultar_por_token', 'Leitura do contrato pelo signatário; valida token.'],
  ['contrato_preview_url_por_token', 'Preview do PDF pelo signatário; valida token.'],
  ['contrato_verificar_autenticidade', 'Portal público de verificação por hash.'],
  ['contrato_verificar_autenticidade_v2', 'Portal público de verificação por hash.'],
  ['get_admissao_por_token', 'Formulário de admissão acessado por link antes de haver conta.'],
  ['medida_consultar_por_token', 'Ciência de medida disciplinar por link; valida token.'],
  ['medida_registrar_ciencia_publica', 'Ciência de medida disciplinar por link; valida token.'],
  ['medida_verificar_ciencia_hash', 'Portal público de verificação por hash.'],
  // Primitivos de autorização: SÃO o mecanismo que as demais checagens usam.
  // Recebem `_user_id` por parâmetro por design e sustentam 289 políticas RLS.
  // Restringi-los internamente arrisca quebrar o isolamento inteiro em troca
  // de impedir uma enumeração de baixo valor (exige conhecer o UUID alvo).
  ['has_role', 'Primitivo de autorização usado pelas políticas RLS.'],
  ['is_admin', 'Primitivo de autorização usado pelas políticas RLS.'],
  ['get_user_empresas', 'Primitivo de escopo de tenant usado por 289 políticas RLS.'],
  ['get_user_default_empresa', 'Primitivo de escopo de tenant.'],
]);

/** Executa SQL via psql usando as variáveis PG* do ambiente. */
function query(sql) {
  return execFileSync('psql', ['-At', '-F', '\u0001', '-c', sql], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function main() {
  let rows;
  try {
    rows = query(`
      SELECT p.proname,
             p.prosecdef::text,
             has_function_privilege('anon', p.oid, 'EXECUTE')::text,
             has_function_privilege('authenticated', p.oid, 'EXECUTE')::text,
             replace(coalesce(p.prosrc, ''), E'\\n', ' ')
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.prokind = 'f'
    `);
  } catch (err) {
    console.warn(
      `[secdef-authz] AVISO: banco inacessível, gate não executado (${
        err instanceof Error ? err.message.split('\n')[0] : err
      }).`,
    );
    return 0;
  }

  /** @type {Map<string, {secdef: boolean, anon: boolean, auth: boolean, src: string}>} */
  const fns = new Map();
  for (const line of rows.split('\n')) {
    if (!line.trim()) continue;
    const [name, secdef, anon, auth, src] = line.split('\u0001');
    // `boolean::text` no Postgres devolve 'true'/'false' (não 't'/'f').
    const yes = (v) => v === 'true' || v === 't';
    // Sobrecargas: concatena os corpos, pois qualquer uma delas é alcançável.
    const prev = fns.get(name);
    fns.set(name, {
      secdef: yes(secdef) || prev?.secdef === true,
      anon: yes(anon) || prev?.anon === true,
      auth: yes(auth) || prev?.auth === true,
      src: (prev?.src ?? '') + ' ' + (src ?? ''),
    });
  }

  /**
   * Uma função é autorizada se ela própria correlaciona, ou se delega a
   * verificação a alguma função que correlaciona (fecho transitivo).
   */
  const memo = new Map();
  function isAuthorized(name, depth, seen) {
    if (depth > MAX_DEPTH) return false;
    if (memo.has(name)) return memo.get(name);
    const fn = fns.get(name);
    if (!fn) return false;
    if (AUTHZ_MARKERS.test(fn.src)) {
      memo.set(name, true);
      return true;
    }
    if (seen.has(name)) return false;
    seen.add(name);
    for (const callee of fns.keys()) {
      if (callee === name) continue;
      // Só desce em funções efetivamente citadas no corpo.
      if (!new RegExp(`\\b${callee}\\s*\\(`).test(fn.src)) continue;
      if (isAuthorized(callee, depth + 1, seen)) {
        memo.set(name, true);
        return true;
      }
    }
    return false;
  }

  const violations = [];
  let inspected = 0;

  for (const [name, fn] of fns) {
    if (!fn.secdef) continue;
    if (!fn.anon && !fn.auth) continue; // já revogada da API
    inspected++;
    if (ALLOWLIST.has(name)) continue;
    if (isAuthorized(name, 0, new Set())) continue;
    violations.push({ name, exposedTo: fn.anon ? 'anon' : 'authenticated' });
  }

  if (violations.length === 0) {
    console.log(
      `[secdef-authz] OK — ${inspected} função(ões) SECURITY DEFINER expostas na API, ` +
        `todas com autorização comprovada (${ALLOWLIST.size} em allowlist justificada).`,
    );
    return 0;
  }

  console.error(
    `\n[secdef-authz] ${violations.length} função(ões) SECURITY DEFINER expostas sem autorização interna:\n`,
  );
  for (const v of violations) {
    console.error(`  ✖ public.${v.name}()  — executável por: ${v.exposedTo}`);
  }
  console.error(
    '\n  SECURITY DEFINER atravessa o RLS. Se a função é alcançável pela API,\n' +
      '  ela precisa provar autorização no próprio corpo. Escolha uma saída:\n' +
      '    1. Derive o tenant do dado (não confie no id recebido) e valide com\n' +
      '       public.pertence_a_empresa(...) / public.has_role(auth.uid(), ...);\n' +
      '    2. REVOKE EXECUTE ... FROM anon, authenticated (rotina interna/cron);\n' +
      '    3. Se a autorização é um token opaco validado no corpo, registre a\n' +
      '       função na ALLOWLIST de scripts/audit-secdef-authz.mjs COM justificativa.\n',
  );
  return 1;
}

process.exit(main());
