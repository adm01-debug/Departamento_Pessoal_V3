# Auditoria Exaustiva do Sistema — Departamento Pessoal v2

Auditoria independente conduzida em 2026-07-18 sobre 662 arquivos TS/TSX (~106k LOC), 102 páginas, ~90 services, ~66 hooks, 54 Edge Functions e 405 migrations. **Fase atual: descoberta e documentação — nenhuma correção aplicada.**

## Documentos

| Arquivo                                                | Conteúdo                                                                                      |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| [`00_PLANO_AUDITORIA.md`](./00_PLANO_AUDITORIA.md)     | Decomposição em **30 etapas** de auditoria + **plano de execução em 50 passos** + limitações. |
| [`01_FALHAS_E_GAPS.md`](./01_FALHAS_E_GAPS.md)         | **Achados exaustivos** por domínio, com `arquivo:linha`, severidade e cenário de falha.       |
| [`02_MATRIZ_TESTES_E2E.md`](./02_MATRIZ_TESTES_E2E.md) | Inventário de testes, matriz jornada×cobertura e bateria E2E proposta.                        |

## Método

8 frentes de auditoria paralelas (segurança de edge functions, RLS/migrations, cálculo de folha, RBAC/services frontend, hooks React, testes, infra/CI, módulos de negócio) + execução dos portões reais (`tsc`/`eslint`/`vitest`/`npm audit`) + verificação manual dos achados críticos (marcados **[VERIFICADO]**).

## Conclusão de alto nível

O sistema é **amplo e sofisticado**, com um núcleo fiscal moderno (`calcular-*`, `pix-lote`, `assinaturaDigital`) genuinamente bem endurecido. Porém, contrariando relatórios anteriores que o declaravam "saudável", a auditoria encontrou **falhas críticas em produção** de segurança, conformidade e cálculo. O padrão recorrente: **a função endurecida existe, mas a UI chama um caminho paralelo não-endurecido/stub**.

### Cadeia de risco priorizada (top 12)

| #   | Achado                                                                                                                                                     | Ref        | Impacto                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------- |
| 1   | Edge functions service-role sem auth, deployadas com `--no-verify-jwt` (`validar-biometria`, `alertas-dp`, `OCR`, `backup`, `processar-ponto`, `metricas`) | E1–E7, I1  | Exfiltração/adulteração por qualquer um com a anon key pública |
| 2   | Escalonamento a admin via `user_roles` pelo bridge; páginas admin só com autenticação                                                                      | R1, R2     | Qualquer usuário vira admin                                    |
| 3   | RLS: `folhas`/`pontos`/`entity_versions`/`admissao_tokens` anon-readable; 6 tabelas de recrutamento sem RLS                                                | L1–L4      | Leitura anônima de folha, PII e snapshots                      |
| 4   | UPDATE/DELETE em massa no bridge (filtros não-`eq` descartados); DELETE ignora tenant                                                                      | B1, B2     | Destruição/alteração cross-tenant de dados                     |
| 5   | Adiantamento e consignado nunca descontados da folha                                                                                                       | N1, N2     | Perda de caixa recorrente                                      |
| 6   | Duas engines de folha divergentes; IRRF/rescisão/provisão legalmente errados                                                                               | K1–K5      | Passivo trabalhista/fiscal, valores incorretos                 |
| 7   | Rescisão paga e fecha sem homologação nem assinaturas                                                                                                      | N24, N25   | Violação art. 477 CLT                                          |
| 8   | Apagamento LGPD nunca executado (e quebrado se fosse)                                                                                                      | N22, N23   | Não-conformidade LGPD                                          |
| 9   | Biometria de ponto é `Math.random()` / teatro; fotos em bucket público                                                                                     | E1, N7     | Fraude de ponto, vazamento de biometria                        |
| 10  | Batidas offline nunca persistem (NOT-NULL `ordem`)                                                                                                         | N7         | Perda silenciosa de jornada                                    |
| 11  | eSocial/CNAB: assinatura mock, CNPJ zerado, XML inválido                                                                                                   | N14–N19    | Rejeição gov/banco                                             |
| 12  | `.env` versionado + credenciais de teste no CI + deps vulneráveis (1 crítica)                                                                              | I2, I4, I5 | Higiene de segredos e supply-chain                             |

### Ações imediatas recomendadas (fase seguinte)

1. Remover `--no-verify-jwt` e autenticar/retirar as edge functions service-role legadas.
2. Impor `WITH CHECK` server-side em `user_roles` e adicionar guarda de papel às páginas admin.
3. Confirmar se `EXTERNAL_DB_KEY` é `service_role`; corrigir políticas `USING(true)` e tabelas sem RLS.
4. Corrigir a guarda de filtros do bridge (exigir `eq` efetivo; escopo de tenant em DELETE).
5. Unificar em **uma** engine de cálculo e ligar adiantamento/consignado à folha.
6. Tornar homologação/assinatura obrigatórias antes de pagar rescisão; implementar apagamento LGPD real.

> As correções **não** foram aplicadas nesta fase, conforme escopo. Este material serve de backlog priorizado para a fase de remediação.
