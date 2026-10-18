# Reconciliação do ledger — repo × produção (13/10/2026)

Diagnóstico executado via `canonical-sql-diag.yml` no canônico `frjbfeamybqsejlvmqbl`.

## Números

- **747** arquivos de migration no repo · **428** versões no ledger (`supabase_migrations.schema_migrations`)
- **105** matches exatos de versão
- **14** versões prod-only (aplicadas por CLI com nomes divergentes — twins ±180s)
- **598** versões do repo marcadas como aplicadas pelo repair (`20261014170000_ledger_repair.sql`)
- **44** versões **não** marcadas — pendências reais abaixo

## Método (verificação de efeitos, não de nomes)

Cada arquivo sem match exato foi classificado por:

1. **Gêmeo ±180s** — versão prod a <3 min da do repo = mesmo batch renomeado na geração.
2. **Probe de objeto** — primeiro objeto que o arquivo criaria existe? (726 checks)
3. **Probe de intenção** — cada `CREATE TABLE/COLUMN/FUNCTION/VIEW/TRIGGER/INDEX/POLICY` do arquivo.

## Por que versões foram marcadas como aplicadas

| Categoria                                         | Exemplos                                                                                                                                                                       | Decisão          |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| Renomeadas na geração (CLI)                       | twins ±180s                                                                                                                                                                    | repair `applied` |
| Efeito verificado presente                        | probes `t`                                                                                                                                                                     | repair `applied` |
| Linhagem morta (objetos existem com outros nomes) | `create_*` 20251228 → `homologacoes_rescisao`, `documentos_assinatura`, `treinamento_certificados`                                                                             | repair `applied` |
| Intenção coberta por migration posterior          | batches `p0_001_rls` (policies tenant com outros nomes), `p1_025`/`p3_065`/`p0_006` (suplantados pela onda 4b), policies `whatsapp_*` (suplantadas pela #220), `p0_004/p0_007` | repair `applied` |
| Enum `admissao_etapa`                             | `20261012140000` — aplicada pela onda 19 com outra versão                                                                                                                      | repair `applied` |
| Bucket `ferias-avisos`                            | `20260723113000` — objeto confirmado em prod                                                                                                                                   | repair `applied` |

## Pendências reais (44 versões NÃO marcadas)

| Versão                                       | Assunto                              | Ação                                                       |
| -------------------------------------------- | ------------------------------------ | ---------------------------------------------------------- |
| 20260719150000, t008                         | hardening de storage buckets         | portar adiante após verificar `storage.objects` policies   |
| 20260719170000, 20260719180000               | índices de segurança + retenção      | índices: portar; retenção: suplantada pela LGPD da onda 4b |
| 20260719190000                               | `audit_delete_trigger`               | avaliar necessidade                                        |
| 20260719191000, 20260724000200               | NOT NULL `empresa_id`                | portar com backfill defensivo                              |
| 20260719193000                               | views de monitoramento               | portar                                                     |
| 20260720040000                               | fix ordem FK jornada                 | verificar FK atual                                         |
| 20260724000100                               | remover usuário teste hardcoded      | **Onda 4: remover conta E2E de prod**                      |
| 20260724000500, 0007, 0009, 0012, 0013, 0020 | fixes faltas/RLS/constraints         | verificar objeto a objeto (NOPROBE)                        |
| 20260724110000                               | `v_login_anomalies`                  | portar (view de segurança)                                 |
| 20260724130002/03                            | placeholders ledger remoto           | ignorar (eram placeholders)                                |
| 20260724140000, 20260817010000               | MVs dashboards                       | portar (nice-to-have)                                      |
| 20260724140001                               | `t007_backup_logs_rls`               | junto com `p3_060_backup_logs`                             |
| 20260725100000                               | `backup_logs`                        | portar                                                     |
| 20260725120000, 20260817000000               | índices compostos top-20             | portar (perf)                                              |
| 20260725130000                               | `mv_passivo_trabalhista`             | portar                                                     |
| 20260726110000                               | `p2_037_consolidate_duplicates`      | revisar manualmente (dedup destrutivo?)                    |
| 20260726120000                               | `p4_068_connection_pooling` idx      | portar (perf)                                              |
| 20260730000000                               | seed admissão/desligamento           | ignorar (seed)                                             |
| 20260804000000                               | write policies `provisoes_folha`     | verificar se writes são só via service_role                |
| 20260815000000, 20260816000000               | `naming_pattern`, `policies_orfas`   | portar após verificação                                    |
| 20260911190000–12152000                      | search_path fixes p0/p1              | maioria suplantada; verificar remanescentes                |
| 20260912140000                               | `replay_backfill_canonical_routines` | verificar rotinas canônicas ausentes                       |
| 20260317*×5, 20260509*×2                     | uuid March/May (NOPROBE)             | revisar um a um                                            |

## Tabelas referenciadas pelo app que não existem em prod nem no repo

`health_checks`, `cbo`, `cnae`, `faixas_irrf`, `faixas_inss` — referenciadas por `dominioService`/`tabelas-dominio`. Criar via migration nova com seed (Onda 4d).

## Achados corrigidos na mesma onda (20261014160000)

- Vínculo colaborador↔usuário: e-mail confirmado + match unívoco por empresa (BUG_0001/SEC_0002)
- Criptografia bancária: sem fallback `app.encryption_key` (SEC_0001)
- `run_lgpd_purge`: bypass do append-only desligado ao final (SEC_0003)
- `documentos`: RH gerencia docs sem `colaborador_id` por escopo de empresa (BUG_0002)
- `empresa_id` + backfill + índice em `historico_cargo`, `colaborador_beneficios`, `documentos_colaborador`, `logs_sistema`

## Veredito

O drift do ledger era majoritariamente **cosmético** (renomeação CLI + linhagem morta) — as policies RLS abertas suspeitas eram, na prática, tabelas globais sem `empresa_id` por design (`config_afastamentos`, `periodos_ponto`). Gaps funcionais reais confirmados estão na tabela de pendências e nas correções já aplicadas.
