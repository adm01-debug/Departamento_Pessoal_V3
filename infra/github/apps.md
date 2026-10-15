# GitHub Apps com Acesso de Escrita

> Inventário de GitHub Apps instalados com permissões de escrita.
> Última revisão: 15/10/2026

| App                        | Permissões                                           | Como revogar                                                                  |
| -------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| Claude (Anthropic)         | Contents: write, Pull requests: write, Issues: write | Settings → Integrations → Applications → Claude → Revoke                      |
| Devin (Cognition AI)       | Contents: write, Pull requests: write                | Settings → Integrations → Applications → Devin → Revoke                       |
| Vercel                     | Deployments, Contents: read                          | Settings → Integrations → Applications → Vercel → Revoke                      |
| Supabase                   | Contents: read                                       | Settings → Integrations → Applications → Supabase → Revoke                    |
| SonarCloud                 | Code scanning: write, Checks: write                  | sonarcloud.io → My Projects → Unlink                                          |
| Mermaid Chart              | Contents: write                                      | Settings → Integrations → Applications → Mermaid Chart → Revoke               |
| N8N (`gh-push-graph-sync`) | Webhooks                                             | ❌ 404 desde 2026-08-29 (D16) — Settings → Webhooks: verificar URL ou excluir |
| Dependabot                 | Security alerts, Pull requests: write                | Settings → Code security → Disable Dependabot                                 |

## Notas

- Apps com Contents: write podem criar branches e commits. Revisar periodicamente.
- Devin: 41 de 50 commits recentes na main foram de `devin-ai-integration[bot]` — requer W32 (decisão do owner: aprovação humana obrigatória para PRs de agentes).
- N8N webhook `gh-push-graph-sync` retorna 404 em todo push desde 2026-08-29 (D16) — W89: verificar URL em Settings → Webhooks ou excluir o webhook se não for mais necessário.
