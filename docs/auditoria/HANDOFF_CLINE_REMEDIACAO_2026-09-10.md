# Handoff para o Cline — Remediação Pós-Auditoria Viva

**Projeto:** Departamento Pessoal V3
**Data:** 10/09/2026
**Banco canônico confirmado:** `frjbfeamybqsejlvmqbl`
**Dados atuais:** 100% sintéticos e descartáveis, conforme o proprietário
**Situação:** nota 4,11/10; entrada de dados reais e promoção bloqueadas
**Fontes obrigatórias:**

- `AUDITORIA_TECNICA_EXAUSTIVA_2026-09-10.md`;
- `AUDITORIA_BANCO_CANONICO_AO_VIVO_2026-09-10.md`;
- `PLANO_100_ETAPAS_2026-09-10.md`.

## 1. Missão

Remediar o banco e a aplicação até que um ambiente vazio possa ser criado de forma determinística a partir de uma fonte versionada, sem exposição anônima/cross-tenant, com Auth, RPCs, hashes, Storage, cron, tipos, CI e E2E coerentes.

Não interpretar “massa descartável” como autorização para mudanças destrutivas imediatas. Reset, troca de projeto, alteração do JWT signing key, `db reset`, `db push`, `migration repair`, deleção de usuário/bucket ou substituição do canônico exigem checkpoint explícito do proprietário, backup verificável e rollback.

## 2. Estado exato entregue

### Git

- branch local: `main`;
- HEAD local: `ef66e39d08c2a864a5459771e5ebc0d36d3a0dfb`;
- `origin/main`: `3fc90810332289884b7a2a5978afcbddb6b51420`;
- local está um commit atrás;
- o commit remoto muda `vite.config.ts` para `ciziytrrjjotlsjzshnm`, mas o proprietário confirmou `frjbfeamybqsejlvmqbl` como canônico;
- arquivos novos a preservar: os quatro documentos de auditoria de 10/09 nesta pasta.

### Qualidade local

- typecheck app/testes/E2E: verde;
- lint: zero erros e 14 warnings sob teto 18;
- Vitest: 462 arquivos aprovados, 1 ignorado; 4.853 testes aprovados, 9 ignorados;
- cobertura: 60,94% statements, 56,11% branches, 53,72% functions, 65,26% lines;
- build: verde;
- Deno bridge check: verde;
- Deno shared tests: 27 verdes;
- migration repair tests: 28 asserts verdes, mas só cobrem 3 migrations;
- `npm audit`: uma vulnerabilidade alta em `sharp@0.35.3` transitiva de `vite-imagetools`;
- Playwright remoto: não inicia porque faltam quatro secrets.

### Banco vivo

- PostgreSQL 17.6; aproximadamente 40,9 MiB;
- 362 tabelas, 44 views, 299 funções, 611 policies e 398 triggers públicos;
- 362/362 tabelas com RLS, mas os testes comportamentais falham;
- 43/44 views selecionáveis por `anon`; quatro vazamentos confirmados;
- 204 overloads `SECURITY DEFINER`; 23 executáveis por `anon` e 113 por `authenticated`;
- 11 smokes de hash quebrados;
- 2 triggers de folha desabilitados;
- 12 checks públicos `NOT VALID`;
- 24 FKs sem índice compatível e 31 grupos de índices duplicados;
- 4/19 buckets esperados;
- ledger com 33 versões versus 640 versões locais únicas;
- 13 policies foram acrescentadas depois do baseline sem nova versão no ledger;
- tipos locais e banco divergem materialmente.

## 3. Credenciais: ação zero obrigatória

A senha do banco e um JWT `service_role` foram publicados na conversa. Considere ambos comprometidos.

1. Rotacionar a senha do database user.
2. Rotacionar/revogar a credencial administrativa conforme o modelo de API keys do projeto.
3. Atualizar Supabase, GitHub Environments, provedor de deploy e consumidores autorizados.
4. Invalidar o valor antigo e provar que ele recebe 401/403 sem registrar o valor.
5. Não colocar segredo em arquivo, issue, PR, log, screenshot ou comando versionado.
6. A chave publicável não é segredo, mas sua associação ao projeto deve permanecer correta.

**Checkpoint G0:** credenciais antigas inválidas; novas armazenadas somente no secret manager; smoke autorizado verde.

## 4. Contenção P0 antes do baseline

Criar uma migration de contenção pequena, revisável e reversível. Aplicá-la primeiro em clone/staging vazio ou snapshot restaurável.

### 4.1 Views anônimas

Prioridade imediata:

- `vw_colaboradores_completo`;
- `v_audit_events_unified`;
- `dp_slow_queries`;
- `vw_banco_horas_saldo`.

Requisitos:

1. revogar `SELECT` de `anon` e `PUBLIC`;
2. definir `security_invoker=true` quando consumidores autenticados precisarem da view;
3. conceder somente ao papel necessário;
4. minimizar CPF, PIS, e-mail, payload de auditoria e SQL;
5. revisar as outras 39 views selecionáveis por `anon`;
6. criar teste PostgREST com apenas publishable key;
7. exigir zero linhas e nenhum campo protegido para não autenticado;
8. testar usuário autenticado sem empresa;
9. testar tenant A contra IDs de tenant B;
10. anexar status HTTP, contagem e schema de resposta, nunca valores de PII.

**Checkpoint G1:** 44/44 views classificadas; zero exposição não aprovada; quatro reproduções originais agora negadas ou vazias.

### 4.2 Funções `SECURITY DEFINER`

Prioridade imediata:

- `reset_login_attempts`;
- `anonimizar_dados_pessoais`;
- `registrar_batida_ponto`;
- `gerar_canonical_espelho_ponto`;
- `sst_regimento_assinar`;
- `cleanup_ciencia_rate_limits`;
- `get_user_roles`;
- `next_cnab_sequencial`;
- `clinicas_proximas`.

Para cada overload:

1. registrar owner, grants, `prosecdef`, `proconfig`, callers e mutations;
2. revogar `EXECUTE` de `PUBLIC`/`anon` salvo contrato público explícito;
3. validar `auth.uid()` dentro da função;
4. derivar tenant pelo vínculo persistido, nunca pelo `empresa_id` recebido isoladamente;
5. validar papel por tabela server-owned, não `user_metadata` ou claim livre;
6. impedir enumeração por mensagens/status/tempo;
7. fixar `search_path` somente com schemas confiáveis necessários;
8. qualificar tabelas e funções sensíveis por schema;
9. adicionar testes positivos e quatro negativos: sem login, papel errado, tenant vizinho, ID arbitrário;
10. repetir `audit-secdef-authz` até zero.

**Checkpoint G2:** zero função mutante privilegiada sem autorização interna; grants mínimos; auditor verde.

### 4.3 RLS e ACL

Tratar como defeito comprovado:

- usuário autenticado inexistente/sem empresa leu `audit_log`, `cnab_configuracoes`, `rubricas_folha`, `sst_exposicao_riscos` e `sst_regimento_interno`;
- 60 policies falharam isolamento tenant;
- 17 policies de PII não provaram correlação;
- 50 policies falharam menor privilégio;
- 55 usam `USING(true)`;
- 150 alcançam `anon` ou `PUBLIC`;
- ACLs padrão concedem privilégios amplos a `anon`/`authenticated`.

Não revogar tudo cegamente no canônico. Em staging:

1. criar matriz objeto × operação × papel × tenant;
2. remover grants padrão e conceder explicitamente o necessário;
3. substituir claims livres `auth.jwt()->>'role'` por autorização server-owned;
4. decidir e testar registros `empresa_id IS NULL`;
5. aplicar `WITH CHECK` equivalente ao `USING` em toda escrita;
6. testar SELECT/INSERT/UPDATE/DELETE por papel;
7. testar FK para ID de outro tenant;
8. testar `.single()`, contagem, paginação e RPC indireta;
9. manter exceção somente com owner, justificativa e expiração;
10. executar os três auditores RLS até zero.

**Checkpoint G3:** nenhum usuário sem vínculo lê/grava dados de empresa; gates RLS/PII/least-privilege verdes.

### 4.4 Hashes, triggers e constraints

1. corrigir as 24 funções únicas reportadas por `audit-db-search-path`;
2. incluir `extensions` no `search_path` somente onde necessário ou qualificar `extensions.digest`;
3. repetir os 11 cenários de `smoke-hash-triggers` em transação descartável;
4. provar que alteração posterior invalida o selo;
5. decidir e documentar os dois triggers desabilitados de `folhas_pagamento`;
6. ativar/corrigir ou remover o código morto deliberadamente;
7. validar os 12 checks depois de sanear massa sintética;
8. adicionar gate para constraint nova `NOT VALID`;
9. testar rollback da migration;
10. guardar o relatório sem valores de negócio.

**Checkpoint G4:** 11/11 smokes verdes; zero função quebrada por extensão; zero constraint crítica não validada.

## 5. Reconstrução/baseline por ambiente vazio

Como não há dados reais, preferir substituição controlada a reparar centenas de versões históricas.

### Fase B1 — Preservar evidência

1. exportar schema-only, roles/grants suportados, ledger, Storage config, cron e inventário;
2. gerar hash do inventário;
3. obter backup lógico completo e testar leitura/restauração;
4. registrar somente contagens da massa sintética;
5. não versionar dump com segredos ou dados.

### Fase B2 — Montar o estado desejado

1. usar o schema físico atual apenas como insumo, não como verdade automaticamente segura;
2. incorporar a migration de contenção P0;
3. decidir cada objeto ausente/presente com base em consumidor ativo;
4. incluir as RPCs requeridas por Auth, rate limit, authz, LGPD e vínculo;
5. incluir ou remover deliberadamente o módulo PCS;
6. provisionar os 19 buckets privados esperados com policies, limites e MIME;
7. versionar os sete cron jobs válidos e os três jobs de segurança requeridos, ou remover a expectativa da aplicação;
8. validar triggers, checks, FKs e índices;
9. gerar uma baseline/squash única com cabeçalho e checksum;
10. arquivar as 644 migrations antigas fora do diretório ativo, preservando mapa de rastreabilidade.

### Fase B3 — Restaurar do zero

1. criar projeto/banco temporário vazio;
2. aplicar somente baseline e migrations pós-baseline;
3. criar buckets/jobs via processo versionado idempotente;
4. gerar inventário e comparar com o manifest desejado;
5. rodar todos os auditores SQL;
6. rodar 11 smokes de hash;
7. rodar fixtures T1/T2 e matriz RLS;
8. rodar Edge Functions contra as RPCs reais;
9. gerar `types.ts` do ambiente aprovado;
10. destruir o staging somente depois de guardar evidências e confirmar restauração repetível.

**Checkpoint B:** duas restaurações limpas consecutivas produzem o mesmo hash e todos os gates ficam verdes.

## 6. Drift de tipos e funções ausentes

Antes da correção, a comparação encontrou:

- 8 tabelas somente nos tipos e 17 somente no banco;
- 26 funções somente nos tipos e 158 somente no banco;
- 6 views vivas ausentes dos tipos.

Dependências locais obrigatórias a decidir:

- `auth-login`: `check_account_lockout`, `record_login_attempt`;
- `_shared/rateLimit`: `edge_rate_limit_check`;
- `limpeza`: `drenar_fila_limpeza_lgpd`, `run_lgpd_purge`, `lgpd_retencao_logs`;
- `_shared/authz`: `pode_gerir_rh_para`, `pode_gerir_pessoas_para`;
- `useColaboradorVinculo`: `vincular_colaborador_ao_usuario`;
- `pcsService`: tabelas e RPCs `pcs_*`.

Não apagar chamadas só para o typecheck passar. Para cada dependência, escolher uma das duas opções e documentar: implementar no baseline com contrato/teste, ou remover o recurso e todos os consumidores/rotas/testes.

**Checkpoint T:** `supabase gen types` não gera diff; zero chamada a objeto ausente; typecheck app/testes/E2E verde.

## 7. Git e publicação

1. criar branch local de segurança contendo os quatro documentos de auditoria;
2. atualizar com `origin/main` sem aceitar silenciosamente o project ref `ciziy...`;
3. parametrizar `vite.config.ts` e validar `frjb...` como destino canônico deste ambiente;
4. nunca inserir URL de banco com senha no Git;
5. produzir migrations pequenas por domínio durante a contenção;
6. produzir baseline em PR separado após os gates;
7. regenerar lockfiles ao corrigir `sharp`;
8. executar todos os checks locais;
9. publicar por PR, respeitando ruleset e revisão;
10. não fazer push direto em `main` nem usar bypass administrativo.

## 8. Comandos de validação

As credenciais devem vir do secret manager para variáveis de processo. Nunca colar os valores no terminal compartilhado ou no arquivo.

```bash
bun run ci:verify
bun run test
bun run build

node scripts/audit-db-search-path.mjs
node scripts/audit-rls-pii.mjs
node scripts/audit-rls-least-privilege.mjs
node scripts/audit-rls-tenant-open.mjs
node scripts/audit-secdef-authz.mjs
node scripts/audit-embed-hints.mjs
node scripts/smoke-hash-triggers.mjs
```

Confirmar os nomes exatos dos scripts em `package.json` antes de automatizar. Se um gate estiver desenhado para “pular e sair 0” sem conexão, alterar o workflow para registrar **não executado** como bloqueio de release.

## 9. E2E mínimo obrigatório

Criar identidades sintéticas separadas:

- usuário sem empresa;
- colaborador do tenant A;
- gestor/RH do tenant A;
- financeiro do tenant A;
- auditor do tenant A;
- usuário equivalente do tenant B;
- admin com AAL2.

Cobrir:

1. login, lockout, reset e MFA;
2. leitura e mutação nominal no tenant A;
3. tentativa por ID do tenant B;
4. quatro views anteriormente expostas;
5. nove RPCs críticas;
6. batida de ponto e selo;
7. folha, provisão e alerta;
8. upload/download em todos os buckets utilizados;
9. limpeza/retenção LGPD em dry-run e execução descartável;
10. módulos que dependem das funções/tabelas ausentes atuais.

## 10. Evidência exigida por PR

- ID da etapa E-xxx;
- ameaça/defeito reproduzido antes;
- migration/código e rollback;
- teste positivo;
- teste negativo;
- saída dos gates sem segredo/PII;
- diff de inventário esperado;
- resultado de restore quando aplicável;
- aprovação do revisor de banco/segurança;
- smoke pós-promoção.

## 11. Definição de concluído

O trabalho não termina com “migration aplicada” ou “CI verde”. Termina somente quando:

- credenciais expostas estiverem revogadas;
- zero PII/auditoria/SQL estiver acessível sem autorização;
- zero ação privilegiada puder ser executada por identificador arbitrário;
- seis gates anteriormente vermelhos estiverem verdes;
- 11/11 smokes de hash passarem;
- baseline restaurar duas vezes com o mesmo inventário;
- tipos, schema, ledger, Storage e cron vierem do mesmo commit;
- CI, Security, E2E e healthcheck estiverem verdes no mesmo SHA;
- rollback/restore tiver evidência;
- nenhum dado real for admitido antes da recertificação.
