# Matriz de Papéis e Permissões — DP V3 (§6.14)

> Versão 1.0 — 28/10/2026. Papéis do enum `app_role`: `admin` | `gestor` | `rh` | `user`.
> Enforcement em três camadas: RLS (Postgres), edges (`_shared/authz.ts`), front (rotas/menus).

## Capacidades por papel

| Capacidade                                                             | admin | gestor | rh  | user |
| ---------------------------------------------------------------------- | ----- | ------ | --- | ---- |
| Gerenciar usuários/empresas (global)                                   | ✅    | —      | —   | —    |
| Fechar/reabrir folha (`fechar-folha`, `reabrir-folha`)                 | ✅    | —      | ✅¹ | —    |
| Transmitir eSocial, gerar guias/DCTF (`enviar-esocial`, `gerar-guias`) | ✅    | —      | ✅¹ | —    |
| Exportar PII (`exportacao`)                                            | ✅    | —      | ✅¹ | —    |
| Remessas bancárias (`cnab-remessa`, `pix-lote`)                        | ✅    | —      | ✅¹ | —    |
| Upload certificado digital (`upload-certificado`)                      | ✅    | —      | ✅¹ | —    |
| Backup/criptografia (`backup`, `criptografia`)                         | ✅    | —      | ✅¹ | —    |
| Aprovar férias/afastamentos/ajustes de ponto                           | ✅    | ✅¹    | ✅¹ | —    |
| Ler dados da própria empresa                                           | ✅    | ✅¹    | ✅¹ | —    |
| Portal do colaborador (próprios holerites, ponto, documentos)          | ✅    | ✅¹    | ✅¹ | ✅²  |
| Registrar solicitação LGPD própria                                     | ✅    | ✅¹    | ✅¹ | ✅²  |
| Configurar webhooks/integrações da empresa                             | ✅    | —      | ✅¹ | —    |
| Gestão de papéis (`user_roles`)                                        | ✅    | —      | —   | —    |

¹ Somente para empresas às quais o usuário está vinculado (`pode_gerir_rh_para` / `user_belongs_to_empresa`).
² Restrito ao próprio `colaborador_id`/titular (`requireSelfOrRh` nas edges + RLS por titular).

## Ações que exigem aal2 (sessão com MFA — `_shared/aal2.ts`)

`fechar-folha`, `reabrir-folha`, `enviar-esocial`, `exportacao`, `cnab-remessa`, `pix-lote`, `backup`, `criptografia`, `upload-certificado`.

## Regras

- `admin` é global (não por empresa): `is_admin` retorna escopo próprio; verificações por empresa passam por `requireRh` (RH **ou** admin).
- A bridge (`external-db-bridge`) só aceita tabelas do catálogo allowlist + RPCs da allowlist; colunas secretas nunca saem nem entram por ela.
- Nenhuma concessão a `anon` para SECDEF sensíveis (revogado em prod via `revoke_orphan_secdef`); policies `USING(true)` não expõem linhas de outro tenant.
