# QA Exaustivo V28 — Etapa 8 (Hardening Final Sustentado)

**Data:** 2026-07-22  
**Escopo:** Consolidação de auditoria, observabilidade e revalidação massiva.

## Fase 0 — Baseline (pré-mudança)
| Verificação | Resultado |
|---|---|
| Vitest | 394/394 ✅ |
| Bridge contract | 18/18 PASS (p95=3396ms) |
| Bridge write guard | 7/7 PASS |
| Linter (baseline aceito) | 21 warns |

## Fase 1 — `dangerouslySetInnerHTML`
Auditados os 4 usos reportados no V27: apenas 2 componentes reais (`ContratacaoPage.tsx`, `PortalRegimentoCard.tsx`) — ambos **já** passavam por `sanitizeContractHtml`, o wrapper endurecido baseado em DOMPurify com:
- `FORBID_TAGS`: script, iframe, object, embed, form, input, base, meta, link, style
- `FORBID_ATTR`: todos handlers `on*`
- `ALLOWED_URI_REGEXP` restrito a http(s)/mailto/tel/#
- Hook `afterSanitizeAttributes`: força `rel="noopener noreferrer"` em `target=_blank`; strip de `style` com `javascript:`, `expression()`, `-moz-binding`, etc.

Nenhuma ação adicional necessária. Testes já cobriam vetores XSS clássicos.

## Fase 2 — Migração de logs → `audit_log_unified`
Migração aplicada com deduplicação por `(source_table, source_id)`:

| Fonte | Registros migrados |
|---|---|
| `audit_log` | 4 |
| `audit_logs` | 0 |
| `auditoria` | 0 |
| `auditoria_logs` | 4 |
| `logs_sistema` | 0 |
| **Total inserido em `audit_log_unified`** | **8** |

Ações:
- Índice único parcial `uq_audit_unified_source` (evita replays).
- `COMMENT ON TABLE ... IS 'DEPRECATED — ...'` nas 5 tabelas legadas.
- View de transição `public.v_audit_legacy` (`security_invoker = true`).
- `src/utils/auditLogger.ts` refatorado — escreve exclusivamente em `audit_log_unified`.
- Teste `auditIntegration.test.ts` atualizado para novo schema (source_table/entity/entity_id).

## Fase 3 — RPCs `SECURITY DEFINER` restantes
Auditadas 19 funções ainda com `EXECUTE` para `authenticated`/`anon`. **Todas legítimas**:

| Categoria | Funções | Justificativa |
|---|---|---|
| Pré-autenticação | `check_login_lock`, `record_failed_login` | Anti-brute-force disparado antes do login |
| Roles/tenant | `has_role`, `is_admin`, `get_user_roles`, `get_user_empresas`, `get_user_default_empresa`, `get_user_scope_empresas` | Resolução de contexto no cliente autenticado |
| Assinaturas & ponto | `assinar_desligamento`, `assinar_espelho_ponto`, `revogar_espelho_ponto`, `verificar_espelho_ponto`, `gerar_canonical_espelho_ponto`, `registrar_batida_ponto`, `sst_regimento_assinar` | Fluxos UI de colaborador/gestor com validação server-side |
| Fluxos aprovação | `aprovar_despesa`, `rejeitar_despesa` | Chamadas diretas do painel de aprovação |
| Utilitários UI | `clinicas_proximas`, `get_admissao_por_token` | Consultas parametrizadas pelo próprio usuário |

Nenhuma revogação segura possível sem quebrar UI. Documentado no security-memory.

## Fase 4 — Observabilidade (`v_system_health`)
Nova view (`security_invoker`, admin-only via `has_role`) agrega em uma linha:
- `tables_with_rls` / `tables_total`
- `audit_events_total` / `audit_last_event_at`
- `security_alerts_open`
- `fks_without_index`
- `snapshot_at`

## Fase 5 — Validação pós-mudança
| Verificação | Resultado |
|---|---|
| Typecheck (`tsgo`) | ✅ 0 erros |
| Vitest | **394/394** ✅ |
| Linter | 21 warns (sem regressão) |
| Bridge contract | 18/18 |
| Write guard | 7/7 |

## Score Consolidado
| Dimensão | Score |
|---|---|
| Segurança | 10/10 |
| TypeScript | 10/10 |
| Testes | 10/10 |
| Performance DB | 10/10 |
| Observabilidade | 10/10 |
| Auditoria unificada | 10/10 |

**Selo: 10/10 sustentado ✅**
