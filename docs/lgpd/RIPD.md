# RIPD — Relatório de Impacto à Proteção de Dados (LGPD arts. 5º, X e 38)

> Versão 1.0 — 28/10/2026 · Escopo: plataforma Departamento Pessoal V3 (folha, ponto, admissão, eSocial).

## 1. Necessidade e proporcionalidade

O tratamento é indispensável para cumprir obrigações trabalhistas/previdenciárias do controlador (folha, eSocial, ponto). Os dados coletados limitam-se aos exigidos por lei ou estritamente necessários à finalidade declarada.

## 2. Riscos identificados e medidas

| Risco                                                                          | Prob.  | Impacto | Medidas implementadas                                                                                                            | Residual                                                                          |
| ------------------------------------------------------------------------------ | ------ | ------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Vazamento de PII via API genérica (bridge)                                     | alta → | alto    | allowlist de tabelas no bridge, colunas secretas removidas de qualquer resposta, writes de segredos bloqueados, embeds validados | baixo                                                                             |
| Roubo de sessão executando ação sensível (fechar folha, CNAB, PIX, exportação) | média  | alto    | verificação `aal2` server-side nas edges sensíveis (`_shared/aal2.ts`), CSRF fail-closed, rate limit, tenant scope               | baixo                                                                             |
| Credencial de certificado eSocial em claro                                     | alta → | médio   | senha e .pfx cifrados server-side via edge `upload-certificado` (vault AES-256); issuer/validade informados, não inventados      | baixo                                                                             |
| Força bruta no login                                                           | média  | médio   | rate limit IP+email, lockout escalonado, Turnstile opcional (`TURNSTILE_SECRET_KEY`)                                             | baixo                                                                             |
| Acesso indevido entre empresas (tenant)                                        | média  | alto    | RLS por `empresa_id`, `is_admin` com escopo próprio, contract tests T1/T2                                                        | baixo                                                                             |
| Dados retidos além do prazo legal                                              | média  | médio   | `run_lgpd_purge` + fila de drenagem agendada; políticas versionadas em `lgpd_politicas_retencao`                                 | baixo-médio (retentção aplicada hoje a logs/filas; expandir às demais categorias) |
| Telemetria com PII                                                             | baixa  | médio   | sanitizeEvent no Sentry; payload cap no bridge                                                                                   | baixo                                                                             |
| Conta de teste E2E em produção                                                 | média  | médio   | senha fora do repo (secrets), TOTP obrigatório, zero papéis; recomenda-se rotacionar e restringir a ambientes de staging         | baixo-médio                                                                       |

## 3. Consulta e revisão

Revisão anual ou a cada mudança material de tratamento. DPO/encarregado: designado pelo controlador (registrar documento `tipo=dpo` na aba Documentos para compor o score de conformidade).

## 4. Conclusão

Com as medidas implementadas (bridge hardening, cifragem, aal2, purge LGPD), os riscos residuais são aceitáveis para a finalidade legal declarada. Itens em acompanhamento: RoPA/RIPD mantidos em `docs/lgpd/`, retenção a estender-se às demais categorias do RoPA e pentest externo (§6.14).
