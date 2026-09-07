# Plano de correção — Departamento Pessoal V3

**PLANO COMPLETO COM 100 ETAPAS REAIS** · derivado de 34 achados confirmados em `AUDITORIA.md` · ordem: P0 → P1 → P2 → P3.

Princípios de execução: uma etapa por PR/sessão; migrations primeiro em preview; nenhuma mudança destrutiva sem expand-contract; promoção para produção somente após a verificação indicada. Tamanhos: S (até 1 dia), M (1–3 dias), L (mais de 3 dias).

## P0 — contenção e correção de exposição ativa

### E-001 · [P0] · Cloudflare — bloquear imediatamente a rota pública atual do MCP
Corrige: A-001
Onde: Worker `supabase-deptpessoal-gw` · rota `/***/mcp`
Ação:
1. Desabilitar a rota pública atual ou aplicar regra temporária deny-all no Cloudflare.
2. Preservar logs e permitir acesso apenas por canal administrativo de emergência já autenticado.
Diff estimado: configuração externa · S
Depende de: —
Verificação: POST sem autenticação à URL antiga retorna 403/404; nenhum método JSON-RPC responde 200.
Risco: interrompe automações MCP; rollback é restaurar temporariamente allowlist nominal, nunca reabrir ao mundo.

### E-002 · [P0] · credenciais — rotacionar a URL-capability e invalidar o path vazado
Corrige: A-001
Onde: secrets/rotas do Cloudflare Worker · clientes autorizados do MCP
Ação:
1. Gerar identificador aleatório novo e remover o path antigo do Worker.
2. Atualizar somente consumidores inventariados, sem registrar o novo valor em Git ou logs.
Diff estimado: configuração externa · S
Depende de: E-001
Verificação: URL antiga permanece 404; novo path só funciona por trás do controle de E-003.
Risco: cliente esquecido perde acesso; mitigar com inventário e janela curta de migração, sem alias público.

### E-003 · [P0] · Cloudflare Access — exigir identidade forte antes do MCP
Corrige: A-001
Onde: Cloudflare Access/Application do Worker MCP
Ação:
1. Criar aplicação Access com service token ou mTLS e policy deny-by-default.
2. Exigir autenticação no Worker antes de encaminhar qualquer `initialize` ou `tools/call`.
Diff estimado: Worker + configuração Access · M
Depende de: E-002
Verificação: matriz sem credencial/inválida/expirada retorna 401/403; service token autorizado executa somente tools permitidas.
Risco: lockout administrativo; manter break-glass auditado e com expiração curta.

### E-004 · [P0] · MCP — separar ferramentas read-only das administrativas
Corrige: A-001
Onde: servidor `supabase-full-mcp-server` · catálogo `tools/list`
Ação:
1. Criar perfil padrão somente leitura sem DML/DDL, Auth delete/update, Storage delete ou deploy.
2. Mover tools mutáveis para perfil administrativo com autorização explícita e sessão curta.
Diff estimado: servidor MCP + testes · M
Depende de: E-003
Verificação: `tools/list` padrão não contém tools destrutivas; tentativa manual é negada e auditada.
Risco: automação legítima de escrita quebra; migrar consumidor a consumidor para perfil privilegiado.

### E-005 · [P0] · banco — revogar imediatamente `SELECT` de `anon` nas 42 views vulneráveis
Corrige: A-002
Onde: 42 views `public` exceto `v_system_health` · `supabase/migrations/`
Classe (só banco): aditiva de segurança
Ação:
1. Criar migration com `REVOKE SELECT ... FROM anon` para a lista congelada pela auditoria.
2. Conceder somente views públicas justificadas, com lista explícita e comentário de finalidade.
Diff estimado: ~60 linhas · 1 migration · S
Depende de: —
Verificação: query `has_table_privilege('anon', oid, 'SELECT')` retorna false para as 42; REST anon recebe 401/403.
Risco: dashboards públicos podem parar; restaurar grant apenas após prova de ausência de PII e filtro próprio.

### E-006 · [P0] · banco — converter views tenant para `security_invoker=true`
Corrige: A-002
Onde: `vw_colaboradores_completo`, `v_audit_trail` e demais views tenant · migrations
Classe (só banco): aditiva/compatível
Ação:
1. Recriar cada view com `WITH (security_invoker=true)` preservando colunas e nomes.
2. Remover das views de usuário campos não consumidos como CPF/IP/JSON, após inventário de uso.
Diff estimado: 2–4 migrations por lote · M
Depende de: E-005
Verificação: `reloptions` contém `security_invoker=true`; testes anon/tenant A/tenant B provam isolamento.
Risco: queries antes sustentadas pelo privilégio do owner passam a falhar; validar consumidores em preview antes da promoção.

### E-007 · [P0] · banco — criar policies substitutas para as cinco tabelas abertas
Corrige: A-003
Onde: `audit_log`, `cnab_configuracoes`, `historico_rescisoes`, `integracao_logs`, `notificacoes_admissao`
Classe (só banco): aditiva
Ação:
1. Criar policies tenant-scoped e role-scoped com nomes novos, `USING` e `WITH CHECK` explícitos.
2. Adicionar comentários SQL que indiquem papéis permitidos por comando.
Diff estimado: ~120 linhas · 1 migration · M
Depende de: —
Verificação: transações `SET ROLE authenticated` confirmam acesso próprio e recusa cross-tenant antes do corte.
Risco: as policies antigas ainda mantêm exposição nesta fase; janela entre E-007 e E-008 deve ser mínima.

### E-008 · [P0] · banco — remover as cinco policies universais legadas
Corrige: A-003
Onde: policies `USING(true)` identificadas em A-003 · migrations
Classe (só banco): destrutiva → expand-contract (E-007 expande; esta etapa contrai)
Ação:
1. Fazer preview de nomes/predicados e `DROP POLICY` somente das cinco policies universais.
2. Manter intactas as substitutas de E-007 e registrar checksum do catálogo pós-migration.
Diff estimado: ~35 linhas · 1 migration · S
Depende de: E-007
Verificação: `pg_policies` não retorna `qual=true`; testes por papel continuam permitindo operações esperadas.
Risco: policy nomeada incorretamente pode cortar acesso; rollback recria exatamente a policy anterior por migration reversa temporária.

### E-009 · [P0] · testes SQL — bloquear views definer e policies universais no CI
Corrige: A-002, A-003, A-022
Onde: `scripts/audit-rls-tenant-open.mjs` · novo `scripts/audit-views-security.mjs` · `ci.yml`
Ação:
1. Fazer o gate falhar para view tenant sem `security_invoker`/filtro ou grant `anon` não aprovado.
2. Cobrir `USING(true)` e combinações permissivas que anulam policy por papel.
Diff estimado: ~180 linhas · M
Depende de: E-006, E-008
Verificação: fixtures vulneráveis fazem ambos scripts sair 1; catálogo corrigido sai 0.
Risco: falsos positivos em catálogos públicos; controlar com allowlist pequena versionada e revisada.

### E-010 · [P0] · banco — revogar execução ampla das funções definer de alto risco
Corrige: A-008
Onde: funções listadas em A-008 · migrations
Classe (só banco): aditiva de segurança
Ação:
1. `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` nas funções destrutivas/PII vulneráveis.
2. Regrantar apenas `service_role` até cada função receber autorização interna nas etapas seguintes.
Diff estimado: ~70 linhas · 1 migration · S
Depende de: —
Verificação: `has_function_privilege` retorna false para anon/authenticated; service-role mantém execução controlada.
Risco: fluxos frontend que chamam RPC quebram temporariamente; aplicar em janela coordenada e expor somente após hardening.

### E-011 · [P0] · banco/LGPD — autorizar `anonimizar_dados_pessoais` por tenant e papel
Corrige: A-008
Onde: RPC `anonimizar_dados_pessoais(uuid)` · migrations · `lgpdService.ts`
Classe (só banco): aditiva/compatível
Ação:
1. Obter `auth.uid()` internamente, derivar empresa do alvo e exigir papel LGPD/admin autorizado.
2. Recusar alvo de outro tenant e registrar solicitante, motivo e hash em auditoria bloqueante.
Diff estimado: ~90 linhas · 1 migration + testes · M
Depende de: E-010
Verificação: matriz usuário comum/RH/admin e tenants A/B; somente caso autorizado altera dados.
Risco: processos LGPD automáticos podem perder permissão; migrá-los a service-role identificado.

### E-012 · [P0] · banco/ponto — autorizar `registrar_batida_ponto` sem confiar em `empresa_id`
Corrige: A-008, A-010
Onde: RPC `registrar_batida_ponto(...)` · migrations
Classe (só banco): aditiva/compatível
Ação:
1. Derivar empresa pelo `colaborador_id` e validar usuário/dispositivo/quiosque permitido.
2. Rejeitar divergência com `p_empresa_id`, preservando lock e unique atômicos existentes.
Diff estimado: ~100 linhas · 1 migration + testes · M
Depende de: E-010
Verificação: ponto próprio/dispositivo autorizado passa; colaborador de outro tenant e empresa forjada falham.
Risco: quiosques sem identidade deixam de operar; mantê-los desativados até E-041–E-043.

### E-013 · [P0] · banco/Gov.br — vincular conta somente ao usuário autenticado
Corrige: A-008
Onde: `fn_link_gov_br_account(uuid,text,text)` · `auth-gov-br` · migrations
Classe (só banco): aditiva/compatível
Ação:
1. Eliminar `_user_id` confiado ou exigir igualdade estrita com `auth.uid()`.
2. Validar CPF já verificado no callback Gov.br e impedir alteração de perfil arbitrário.
Diff estimado: ~80 linhas · migration + Edge tests · M
Depende de: E-010
Verificação: callback válido vincula o próprio usuário; UUID/CPF de terceiro retorna forbidden sem UPDATE.
Risco: callbacks antigos podem usar service-role; adaptar chamada antes de regrantar authenticated.

### E-014 · [P0] · banco/folha — proteger RPCs de rubricas e medidas disciplinares
Corrige: A-008
Onde: `gerar_rubricas_ferias`, `garantir_rubrica_suspensao`, `consumir_pendencias_medida_no_holerite`
Classe (só banco): aditiva/compatível
Ação:
1. Derivar tenant dos IDs persistidos e exigir papel RH/folha em cada função.
2. Tornar inserções idempotentes e auditar chamador/entidades sem PII em texto.
Diff estimado: ~160 linhas · 1–2 migrations + testes · L
Depende de: E-010
Verificação: matriz cross-tenant/role e replay; nenhuma linha nasce para empresa alheia ou em duplicidade.
Risco: rotinas internas podem depender de execução direta; identificá-las e conceder apenas ao executor específico.

### E-015 · [P0] · banco/ponto — restringir `gerar_canonical_espelho_ponto`
Corrige: A-008
Onde: RPC `gerar_canonical_espelho_ponto(uuid,text)` · migrations
Classe (só banco): aditiva/compatível
Ação:
1. Exigir vínculo com a empresa do colaborador e papel com acesso a CPF/PIS.
2. Retornar versão minimizada para autoatendimento e versão completa apenas a RH autorizado.
Diff estimado: ~100 linhas · migration + testes · M
Depende de: E-010
Verificação: empregado vê apenas o próprio espelho minimizado; tenant B e anônimo recebem denied.
Risco: geração de PDF pode esperar campos completos; separar contratos e atualizar consumidor no mesmo release.

### E-016 · [P0] · banco — fechar enumeração anônima e cleanup público
Corrige: A-008
Onde: `get_user_empresas`, `is_admin`, `cleanup_ciencia_rate_limits`, `get_user_roles`, `get_user_default_empresa`
Classe (só banco): aditiva de segurança
Ação:
1. Revogar anon e remover parâmetros de usuário quando a consulta deve usar `auth.uid()`.
2. Restringir cleanup a `service_role`/`pg_cron` e validar chamadas internas afetadas.
Diff estimado: ~110 linhas · migration + testes · M
Depende de: E-010
Verificação: anon não enumera UUIDs nem limpa rate limits; usuário só obtém seus próprios papéis/empresas.
Risco: policies antigas chamam assinaturas atuais; criar versões seguras antes de retirar as antigas.

### E-017 · [P0] · CI/banco — tornar o gate `audit-secdef-authz` obrigatório e transitivo
Corrige: A-008, A-022
Onde: `scripts/audit-secdef-authz.mjs` · `ci.yml`
Ação:
1. Falhar para definer público que aceita IDs sensíveis sem authz direta ou helper aprovado.
2. Executar contra banco de teste real e imprimir apenas nome/assinatura, sem corpo/PII.
Diff estimado: ~120 linhas · M
Depende de: E-011, E-012, E-013, E-014, E-015, E-016
Verificação: versões vulneráveis das seis RPCs saem 1; catálogo corrigido sai 0.
Risco: detecção estática pode errar delegação; manter allowlist com justificativa por função.

### E-018 · [P0] · bridge — exigir JWT em toda ação de tabela
Corrige: A-006
Onde: `external-db-bridge/index.ts` · autenticação pré-dispatch
Ação:
1. Remover exceção de leitura anônima para tabelas de negócio.
2. Permitir anon somente em endpoints/tabelas públicas nomeadas e com projeção fixa.
Diff estimado: ~45 linhas + testes · S
Depende de: —
Verificação: SELECT anônimo genérico retorna 401; endpoints públicos aprovados continuam funcionando.
Risco: rotas públicas dependentes do proxy quebram; inventariá-las e criar contratos mínimos antes do corte.

### E-019 · [P0] · bridge — encaminhar JWT real em SELECT ao banco externo
Corrige: A-006
Onde: `external-db-bridge/index.ts:627-655` · factory de cliente externo
Ação:
1. Criar cliente por request com `Authorization: Bearer <jwt>` para SELECT.
2. Proibir o cliente estático privilegiado no caminho de dados do usuário.
Diff estimado: ~55 linhas + testes · M
Depende de: E-018
Verificação: RLS externo distingue usuários/tenants A/B em SELECT; header não aparece em logs.
Risco: JWT local pode não ser aceito no projeto externo; validar issuer/audience e bloquear rollout se incompatível.

### E-020 · [P0] · bridge — encaminhar JWT real em INSERT/UPDATE/DELETE
Corrige: A-006
Onde: `external-db-bridge/index.ts:674-735`
Ação:
1. Trocar os quatro caminhos DML para o cliente por request de E-019.
2. Preservar idempotência/telemetria, removendo qualquer fallback silencioso à chave estática.
Diff estimado: ~70 linhas + testes · M
Depende de: E-019
Verificação: write próprio passa; write cross-tenant falha no bridge e no RLS externo; chave estática não é usada.
Risco: policies externas incompletas podem interromper writes legítimos; corrigir em preview, nunca habilitar fallback privilegiado.

### E-021 · [P0] · bridge — reduzir `EXTERNAL_DB_KEY` a publishable e validar configuração
Corrige: A-006
Onde: secrets da Edge Function · `external-db-bridge/index.ts`
Ação:
1. Rotacionar qualquer service-role existente e configurar somente chave pública compatível com JWT.
2. Adicionar guard que rejeita token com role privilegiada no boot/health do bridge.
Diff estimado: configuração + ~35 linhas · S
Depende de: E-020
Verificação: inspeção mascarada de claims confirma role pública; smoke de RLS continua verde.
Risco: bridge indisponível se projeto externo exigir outra chave; corrigir relação de confiança antes de promover.

### E-022 · [P0] · bridge — trocar allowlist parcial de tenant por classificação deny-by-default
Corrige: A-006
Onde: `external-db-bridge/validation.ts:83-91` · catálogo versionado de tabelas
Ação:
1. Gerar inventário explícito das tabelas públicas, classificando public-read, tenant e proibida.
2. Negar qualquer tabela ausente e exigir campo/derivação tenant para toda classe de negócio.
Diff estimado: ~250 linhas + gerador/testes · L
Depende de: E-018
Verificação: as 360 tabelas têm classe; tabela fictícia/nova é negada; nenhuma sensível fica public-read.
Risco: tabelas não inventariadas param; liberar uma a uma com owner e evidência.

### E-023 · [P0] · bridge — derivar tenant da sessão, não do payload
Corrige: A-006, A-009
Onde: `assertTenantScope` · `get_user_scope_empresas` · DML do bridge
Ação:
1. Resolver empresas autorizadas pelo JWT/DB e comparar IDs de payload/filtros.
2. Injetar `empresa_id` confiável no INSERT e impedir troca no UPDATE.
Diff estimado: ~140 linhas + testes · L
Depende de: E-020, E-022
Verificação: payload sem empresa recebe empresa derivada quando unívoca; empresa forjada sempre retorna 403.
Risco: usuário multiempresa precisa seleção explícita; exigir header/claim de contexto assinado e validar associação.

### E-024 · [P0] · bridge — limitar projeções e filtros de leitura por tabela
Corrige: A-002, A-006
Onde: `external-db-bridge/validation.ts` · contratos de SELECT
Ação:
1. Definir colunas permitidas e limites máximos para tabelas com CPF, salário, banco e auditoria.
2. Recusar `select=*` em dados sensíveis e forçar paginação/tenant.
Diff estimado: ~220 linhas + testes · L
Depende de: E-022, E-023
Verificação: consulta excessiva retorna 403/422; telas existentes usam projeções mínimas e passam.
Risco: consumidores ocultos podem depender de `*`; coletar telemetria de bloqueio em preview antes do enforcement.

### E-025 · [P0] · testes — provar isolamento end-to-end do bridge
Corrige: A-006, A-007, A-009
Onde: `src/tests/validateBridgeContract.ts` · novos testes Edge/integration
Ação:
1. Cobrir anon, tenant A/B, usuário sem papel, DML, RPC e tabela desconhecida.
2. Executar contra projeto de teste com RLS real, sem mocks de query builder.
Diff estimado: ~350 linhas · L
Depende de: E-019, E-020, E-022, E-023, E-024
Verificação: suíte demonstra 401/403 cross-tenant e sucesso somente nos casos autorizados; CI bloqueia regressão.
Risco: fixture pode divergir de produção; aplicar migrations do mesmo commit antes de cada suíte.

### E-026 · [P0] · operação — promover correções P0 com canário e prova pós-deploy
Corrige: A-001, A-002, A-003, A-006, A-008
Onde: Cloudflare Worker · Supabase migrations/Edge · checklist de release
Ação:
1. Implantar em preview/canário, executar matrizes de E-009/E-017/E-025 e só então promover.
2. Reexecutar as queries da auditoria e anexar resultados mascarados ao release.
Diff estimado: runbook + release · M
Depende de: E-004, E-009, E-017, E-025
Verificação: zero view anon indevida, zero definer vulnerável conhecido, MCP autenticado e cross-tenant negado.
Risco: corte simultâneo afeta clientes; usar flags/canário e rollback de código, sem reabrir grants inseguros.

## P1 — restauração dos fluxos e controles condicionados

### E-027 · [P1] · Storage — congelar inventário de buckets e consumidores
Corrige: A-005, A-018
Onde: chamadas `storage.from()` em `src/` e `supabase/functions/` · migrations
Ação:
1. Mapear bucket, path, MIME, tamanho, owner e papel para cada upload/download real.
2. Falhar o inventário se código referenciar bucket ausente do manifesto.
Diff estimado: manifesto + script ~160 linhas · M
Depende de: E-026
Verificação: todos os nomes usados no código aparecem uma vez no manifesto e têm owner/policy definida.
Risco: nomes dinâmicos podem escapar ao scan; completar com instrumentação de preview e revisão manual.

### E-028 · [P1] · banco/Storage — criar buckets privados ausentes
Corrige: A-005, A-018
Onde: `storage.buckets` · `supabase/migrations/`
Classe (só banco): aditiva
Ação:
1. Criar por migration `ferias-avisos`, `backups` e os demais buckets confirmados em E-027, todos privados.
2. Fixar limites/MIME por caso de uso e usar insert idempotente por nome.
Diff estimado: ~100 linhas · 1 migration · S
Depende de: E-027
Verificação: catálogo de produção coincide com manifesto; upload de tipo/tamanho inválido é recusado.
Risco: nome legado divergente pode fragmentar arquivos; manter aliases somente na aplicação durante migração.

### E-029 · [P1] · banco/Storage — criar policies por empresa, usuário e path
Corrige: A-005
Onde: `storage.objects` · buckets de E-028 · migrations
Classe (só banco): aditiva
Ação:
1. Criar SELECT/INSERT/UPDATE/DELETE separados, derivando empresa/owner de metadado confiável e path canônico.
2. Reservar `backups` a service-role/admin explícito e proibir listagem cross-tenant.
Diff estimado: ~180 linhas · 1 migration + testes · M
Depende de: E-028
Verificação: matriz anon/usuário A/B/RH/admin por bucket; URL assinada não permite outro path.
Risco: policy de path malformada corta acesso; testar nomes Unicode e traversal antes de produção.

### E-030 · [P1] · frontend — alinhar uploads ao manifesto e testar os cinco fluxos
Corrige: A-005
Onde: `useGerarComunicadoColetivas.ts`, `despesaService.ts`, `DocumentosPage.tsx`, `PerfilPage.tsx`, `PontoClockRegister.tsx`
Ação:
1. Centralizar nomes/path no módulo Storage tipado e remover strings locais.
2. Adicionar testes de sucesso, bucket ausente, policy denied, tamanho e MIME para cada fluxo.
Diff estimado: ~280 linhas · L
Depende de: E-029
Verificação: smoke em preview gera/baixa cada artefato e tenant B não consegue enumerá-lo.
Risco: path novo perde referência a arquivos futuros/legados; manter leitura compatível por período definido.

### E-031 · [P1] · cliente — reutilizar uma única chave de idempotência por operação
Corrige: A-007
Onde: `src/integrations/supabase/client.ts:55-90`
Ação:
1. Gerar/copiar `Idempotency-Key` antes do laço e reutilizá-la em todas as tentativas.
2. Preservar chave fornecida pelo chamador e criar nova somente em nova operação lógica.
Diff estimado: ~20 linhas + testes · S
Depende de: E-026
Verificação: teste simula commit+502 e inspeciona a mesma chave nas três tentativas; só uma linha é criada.
Risco: reutilização indevida entre ações distintas; limitar escopo à chamada de `fetchWithRetry`.

### E-032 · [P1] · testes — validar replay idempotente no bridge e nos endpoints financeiros
Corrige: A-007
Onde: testes de `external-db-bridge`, folha, guias, assinatura e documentos
Ação:
1. Injetar timeout após commit e repetir request com a mesma chave.
2. Provar mesmo status/body ou conflito determinístico, nunca segundo side effect.
Diff estimado: ~240 linhas · M
Depende de: E-031
Verificação: contagem de registros/auditoria permanece 1 em todos os cenários de replay.
Risco: endpoints sem suporte aparecerão; mantê-los bloqueados para retry automático até correção.

### E-033 · [P1] · autorização — versionar matriz de papéis por entidade/comando
Corrige: A-009
Onde: `docs/security/rls-role-matrix.md` · helpers `has_role/dp_require_role`
Ação:
1. Definir SELECT/INSERT/UPDATE/DELETE para banco, colaborador, férias, ponto, folha e itens.
2. Associar cada célula a papel real (`admin`, `rh`, `gestor`, colaborador) e owner de negócio.
Diff estimado: ~120 linhas · S
Depende de: E-026
Verificação: matriz aprovada por RH/financeiro e referenciada nominalmente nas migrations E-034–E-037.
Risco: regra organizacional ambígua; bloquear implementação da célula sem decisão, não assumir privilégio.

### E-034 · [P1] · banco — adicionar policies restritivas por papel para seis entidades
Corrige: A-009
Onde: tabelas de A-009 · migrations
Classe (só banco): aditiva
Ação:
1. Criar policies novas por comando conforme E-033, com tenant em `USING` e `WITH CHECK`.
2. Não remover ainda policies amplas; validar a matriz em preview com usuários reais de teste.
Diff estimado: ~260 linhas · 1–2 migrations · L
Depende de: E-033
Verificação: policies novas existem e testes unitários SQL exercitam cada célula da matriz.
Risco: exposição persiste até contração; aplicar E-035–E-037 na mesma janela de release.

### E-035 · [P1] · banco — remover policies amplas de colaboradores e contas bancárias
Corrige: A-009
Onde: `colaboradores`, `contas_bancarias` · migrations
Classe (só banco): destrutiva → expand-contract (E-034 expande; esta etapa contrai)
Ação:
1. Preview de policy names e `DROP POLICY` apenas das variantes tenant-only de write.
2. Preservar SELECT/autosserviço estritamente definidos na matriz.
Diff estimado: ~45 linhas · 1 migration · S
Depende de: E-034
Verificação: usuário sem RH não altera salário/conta nem exclui colaborador; RH autorizado funciona.
Risco: front pode escrever com papel errado; rollback temporário recria policy nominal enquanto o papel é corrigido.

### E-036 · [P1] · banco — remover policies amplas de folha e itens
Corrige: A-009, A-013
Onde: `folhas_pagamento`, `folha_itens` · migrations
Classe (só banco): destrutiva → expand-contract (E-034 expande; esta etapa contrai)
Ação:
1. Remover `FOR ALL` tenant-only e a policy `public` redundante após preview de impacto.
2. Manter writes somente por papel/Edge autoritativa e leitura conforme matriz.
Diff estimado: ~55 linhas · 1 migration · S
Depende de: E-034
Verificação: usuário comum não fecha/altera item; função de folha autorizada continua operando.
Risco: cálculo direto do frontend pode parar; migrar chamadas ao endpoint autoritativo antes do deploy.

### E-037 · [P1] · banco — remover policies amplas de férias/ponto e fechar regressão RLS
Corrige: A-009
Onde: `ferias`, `registros_ponto` · `audit-rls-least-privilege.mjs`
Classe (só banco): destrutiva → expand-contract (E-034 expande; esta etapa contrai)
Ação:
1. Remover `FOR ALL` tenant-only, preservando autosserviço específico por colaborador.
2. Tornar o gate de menor privilégio obrigatório para todas as seis entidades.
Diff estimado: ~100 linhas · migration + script · M
Depende de: E-034
Verificação: matriz completa passa e qualquer nova policy write sem papel faz CI falhar.
Risco: app de ponto pode depender de write direto; usar RPC segura de E-012/E-038.

### E-038 · [P1] · bridge — liberar `registrar_batida_ponto` somente após hardening
Corrige: A-010
Onde: `external-db-bridge/validation.ts` · `RPC_ALLOWLIST`
Ação:
1. Adicionar a assinatura exata à allowlist após E-012, sem wildcard.
2. Validar payload, tamanho de metadata e rate limit específico antes da RPC.
Diff estimado: ~45 linhas + testes · S
Depende de: E-012, E-025
Verificação: request válido chega à RPC; nome parecido, campo extra e tenant forjado são negados.
Risco: reabre superfície definer; rollback remove somente esse nome da allowlist.

### E-039 · [P1] · ponto — criar teste online real clique→RPC→linha→render
Corrige: A-010
Onde: `pontoService.ts` · `PontoClockRegister.tsx` · Playwright/integration
Ação:
1. Registrar uma batida em tenant de teste e confirmar retorno/estado visual.
2. Repetir com duplicidade, offline e erro do bridge, verificando feedback recuperável.
Diff estimado: ~180 linhas · M
Depende de: E-038
Verificação: teste passa contra Supabase de teste e confirma exatamente uma batida.
Risco: teste temporal pode flutuar; congelar clock/timezone e usar IDs dedicados.

### E-040 · [P1] · ponto — desativar o quiosque demonstrativo até autenticação real
Corrige: A-011
Onde: `src/App.tsx:180` · `PontoKioskPage.tsx` · feature flag
Ação:
1. Remover a rota pública do build produtivo ou exibir indisponibilidade sem formulário transacional.
2. Manter demo apenas em ambiente não produtivo explicitamente marcado.
Diff estimado: ~25 linhas + configuração · S
Depende de: E-026
Verificação: `/ponto/kiosk` em produção não aceita matrícula nem chama RPC; preview demo continua isolado.
Risco: clientes que usam quiosque ficam sem canal; oferecer fluxo autenticado existente durante transição.

### E-041 · [P1] · ponto — autenticar dispositivo e sessão do quiosque
Corrige: A-011
Onde: nova tabela `ponto_dispositivos` · Edge/RPC de ponto · Kiosk page
Classe (só banco): aditiva
Ação:
1. Registrar dispositivo por empresa com credencial rotacionável, status e geofence server-side.
2. Trocar matrícula como PIN por sessão curta do colaborador + challenge do dispositivo.
Diff estimado: migration + Edge/UI ~350 linhas · L
Depende de: E-040
Verificação: dispositivo revogado/tenant alheio é negado; autorizado cria sessão auditada com expiração.
Risco: provisionamento operacional complexo; piloto em um quiosque e fallback autenticado.

### E-042 · [P1] · ponto — implementar prova de presença ou remover alegação biométrica
Corrige: A-011
Onde: `PontoKioskPage.tsx` · `validar-biometria` · política LGPD
Ação:
1. Integrar captura/challenge/liveness e validar server-side, ou remover completamente a etapa/linguagem facial.
2. Persistir somente evidência mínima, com consentimento, retenção e acesso definidos.
Diff estimado: ~300 linhas + integração · L
Depende de: E-041
Verificação: timer sozinho nunca confirma identidade; replay de imagem/challenge expirado falha.
Risco: biometria amplia impacto LGPD; preferir método não biométrico se base legal/operação não estiver aprovada.

### E-043 · [P1] · ponto — substituir coordenadas fixas por configuração assinada
Corrige: A-011
Onde: `PontoKioskPage.tsx:94-98` · `ponto_dispositivos` · RPC
Ação:
1. Ler geofence do dispositivo no servidor e coletar posição real apenas quando requerida.
2. Calcular `dentro_raio` server-side e registrar precisão/origem, nunca aceitar boolean do browser.
Diff estimado: ~140 linhas + testes · M
Depende de: E-041
Verificação: São Paulo hardcoded desaparece; posição fora do raio/forjada é recusada e auditada.
Risco: browsers sem geolocalização; política explícita de exceção aprovada e registrada.

### E-044 · [P1] · colaboradores — passar empresa em busca, criação e atualização
Corrige: A-012
Onde: `ColaboradorFormPage.tsx` · `colaboradorService.ts` · `useEmpresas`
Ação:
1. Obter `empresaAtual.id`, incluir no payload de create e nos argumentos de lookup/update.
2. Bloquear render/submit sem empresa ativa e remover coerções `as any` desse fluxo.
Diff estimado: ~55 linhas · S
Depende de: E-026
Verificação: novo/editar funciona em tenant A; trocar ID por colaborador B retorna not found/forbidden.
Risco: deep link sem empresa selecionada exige recuperação; redirecionar para seletor mantendo destino.

### E-045 · [P1] · serviços — tornar `empresaId` obrigatório no contrato de colaborador
Corrige: A-012
Onde: `BaseService.buscarPorId/criar/atualizar` · `ColaboradorService` · tipos DTO
Ação:
1. Exigir empresa por assinatura, não argumento opcional, para entidade tenant-scoped.
2. Separar base global de base tenant ou criar wrapper que injete filtro em todos os métodos.
Diff estimado: ~120 linhas + ajustes de chamadas · M
Depende de: E-044
Verificação: TypeScript rejeita chamada sem empresa; busca/update SQL sempre contém filtro tenant.
Risco: muitos consumidores podem falhar no typecheck; migrar por serviço sem relaxar com `any`.

### E-046 · [P1] · testes — cobrir formulário de colaborador em dois tenants
Corrige: A-012, A-025
Onde: testes de `ColaboradorFormPage` · Playwright
Ação:
1. Cobrir create/edit, deep link, ausência de empresa, CPF/matrícula conflitantes e erro de rede.
2. Provar que dados de B nunca aparecem nem são alterados por sessão A.
Diff estimado: ~220 linhas · M
Depende de: E-045
Verificação: suíte passa com DB real de teste e falha se filtro `empresa_id` for removido.
Risco: seed multiempresa aumenta setup; encapsular fixture idempotente.

### E-047 · [P1] · folha — usar `folhaPagamentoService.fecharFolha` na tela
Corrige: A-013
Onde: `FolhaPagamentoPage.tsx:157-177` · `folhaPagamentoService.ts:139-195`
Ação:
1. Remover UPDATE direto e chamar o service com folha/version/observações.
2. Exibir conflitos, alertas críticos e warnings retornados sem marcar sucesso indevido.
Diff estimado: ~65 linhas + testes · S
Depende de: E-036
Verificação: spy/integration prova chamada à Edge `fechar-folha`; UPDATE direto não existe mais.
Risco: Edge pode não estar implantada; smoke obrigatório antes de habilitar botão.

### E-048 · [P1] · folha/UX — exigir confirmação contextual para encerramento
Corrige: A-013
Onde: `FolhaPagamentoPage.tsx` · componente `AlertDialog`
Ação:
1. Mostrar competência, empresa, totais e efeitos irreversíveis antes de confirmar.
2. Desabilitar duplo submit e exigir reconhecimento quando houver warnings não críticos.
Diff estimado: ~90 linhas + teste UI · S
Depende de: E-047
Verificação: primeiro clique não altera DB; cancelar preserva status; confirmar chama uma vez.
Risco: fricção operacional; manter texto curto e dados objetivos, sem remover confirmação.

### E-049 · [P1] · folha — testar lock otimista e fechamento concorrente
Corrige: A-013
Onde: `fechar-folha` · `folhaPagamentoService` · testes integration/E2E
Ação:
1. Disparar dois fechamentos com a mesma version e validar um sucesso/um `VERSION_CONFLICT`.
2. Cobrir alerta crítico, auditoria/hash bloqueante e refresh da UI após conflito.
Diff estimado: ~220 linhas · M
Depende de: E-047, E-048
Verificação: somente uma transição para fechada e uma trilha íntegra no banco.
Risco: teste concorrente flutua; coordenar requests com barrier determinístico.

### E-050 · [P1] · autenticação — escolher enforcement nativo e retirar promessa impossível do proxy
Corrige: A-014
Onde: Supabase Auth settings · `AuthContext.tsx` · `auth-login`
Ação:
1. Documentar que `/auth/v1/token` é público e definir controles no GoTrue (rate limit, CAPTCHA, MFA/política de senha).
2. Manter `auth-login` apenas como telemetria/UX ou removê-lo após migração, sem afirmar enforcement exclusivo.
Diff estimado: configuração + ~80 linhas docs/código · M
Depende de: E-026
Verificação: threat model e teste direto ao endpoint nativo mostram os limites efetivamente aplicados.
Risco: mudança de login afeta todos; canário com contas de teste e rollback de UI, não de limites nativos.

### E-051 · [P1] · autenticação — configurar limites, CAPTCHA e alertas no GoTrue
Corrige: A-014
Onde: configuração Supabase Auth · secrets CAPTCHA · alertas de login
Ação:
1. Definir limites de password grant/recovery/OTP e habilitar CAPTCHA nas superfícies anônimas suportadas.
2. Alertar por taxa de falha/IP/e-mail sem armazenar senha ou PII desnecessária.
Diff estimado: configuração + testes · M
Depende de: E-050
Verificação: rajada controlada ao endpoint nativo recebe 429/challenge e gera alerta mascarado.
Risco: falso positivo bloqueia usuário legítimo; calibrar em monitor-only antes de enforcement.

### E-052 · [P1] · autenticação — tornar falha do lockout observável e coerente
Corrige: A-014, A-019
Onde: `auth-login/index.ts:84-92` · Sentry/metrics
Ação:
1. Emitir métrica `lockout_check_degraded` e resposta/circuit policy definida quando a RPC falhar.
2. Remover fire-and-forget opaco do registro de tentativa ou enfileirar com confirmação.
Diff estimado: ~100 linhas + dashboard/alerta · M
Depende de: E-050
Verificação: indisponibilidade simulada produz alerta e comportamento previsto, nunca sucesso silencioso.
Risco: fail-closed pode bloquear login global; usar limites nativos de E-051 como camada de continuidade.

### E-053 · [P1] · testes — comparar login pela UI e pelo endpoint nativo
Corrige: A-014
Onde: E2E segurança de autenticação · Supabase de teste
Ação:
1. Executar tentativas equivalentes em `auth-login` e `/auth/v1/token`.
2. Validar rate limits, CAPTCHA, MFA e auditoria nos dois caminhos autorizados.
Diff estimado: ~180 linhas · M
Depende de: E-051, E-052
Verificação: nenhum caminho contorna o limite definido; teste falha se configuração regredir.
Risco: rate limit torna suíte lenta; usar ambiente isolado e janelas configuráveis de teste.

### E-054 · [P1] · repositório — remover `migrate-helper` e negar funções temporárias no deploy
Corrige: A-015
Onde: `supabase/functions/migrate-helper/` · `supabase/config.toml` · deploy scripts
Ação:
1. Excluir helper/config e adicionar denylist de nomes temporários/debug no pipeline de Edge deploy.
2. Fazer o build falhar se código retornar `SERVICE_ROLE_KEY`/`DB_URL` ao cliente.
Diff estimado: remoção + script ~80 linhas · S
Depende de: E-026
Verificação: `rg`/gitleaks não encontra chave/helper; deploy de fixture proibida falha.
Risco: migração manual antiga perde atalho; usar CLI/SQL autenticado e auditado.

### E-055 · [P1] · secrets — rotacionar chave do helper e credenciais potencialmente expostas
Corrige: A-015
Onde: Supabase secrets/DB password/service role · consumidores autorizados
Ação:
1. Invalidar `ACCESS_KEY` hardcoded e, por precaução, rotacionar service-role/DB URL se o helper já foi deployado em qualquer ambiente.
2. Atualizar consumidores via secret store e registrar data/owner sem valores.
Diff estimado: configuração externa · M
Depende de: E-054
Verificação: credenciais antigas falham; novas não aparecem no Git, logs ou bundle.
Risco: rotação quebra jobs esquecidos; inventariar acessos e observar erros durante janela controlada.

### E-056 · [P1] · CI — bloquear segredos no working tree e em commits novos
Corrige: A-015
Onde: `.github/workflows/security.yml` · `.gitleaks.toml` · pre-commit opcional
Ação:
1. Rodar gitleaks com redaction e exit não zero, com allowlist apenas para fixtures comprovadas.
2. Cobrir diff/branch e impedir upload de relatório que contenha o próprio segredo.
Diff estimado: ~90 linhas · S
Depende de: E-054
Verificação: fixture hardcoded reprova; test key allowlisted passa; output exibe apenas metadados.
Risco: falsos positivos travam CI; allowlist por fingerprint/arquivo de teste, nunca por valor amplo.

### E-057 · [P1] · produto — retirar alegações de integração legal ativa
Corrige: A-016, A-026
Onde: `LoginPage.tsx`, `IntegracoesPage.tsx`, `ESocialPage.tsx`, `FGTSDigitalDashboard.tsx`
Ação:
1. Substituir “100% integrado/API ativa/sincronizado” por estado obtido do backend ou “não configurado”.
2. Desabilitar transmissão/sync quando conector real e ambiente não estiverem saudáveis.
Diff estimado: ~120 linhas + testes · S
Depende de: E-026
Verificação: produção sem conector nunca mostra ativo/sucesso; UI expõe ação de recuperação/configuração.
Risco: reduz percepção de feature; é correção de veracidade, não deve ser revertida sem conector real.

### E-058 · [P1] · dados — modelar estados `rascunho/gerado/transmitido/aceito/rejeitado`
Corrige: A-016
Onde: `esocial_eventos`, `guias_fgts_digital`, `dctfweb_declaracoes` · types/UI
Classe (só banco): aditiva
Ação:
1. Adicionar campos de destino, ambiente, protocolo externo, recibo, timestamps e erro estruturado sem apagar estados atuais.
2. Mapear “gerado localmente” separadamente de “transmitido/aceito”.
Diff estimado: migration + types/UI ~260 linhas · L
Depende de: E-057
Verificação: registro local nunca satisfaz filtro de transmitido; transições inválidas são bloqueadas.
Risco: relatórios atuais confundem status; manter coluna antiga durante migração e comparar contagens.

### E-059 · [P1] · eSocial — implementar cliente SOAP produtivo com timeout e idempotência
Corrige: A-016
Onde: `supabase/functions/enviar-esocial/` · certificado/signing · secrets
Ação:
1. Substituir ramo 503 por cliente oficial configurável, timeout, retries apenas idempotentes e correlação de lote.
2. Persistir request/response minimizados, protocolo real e erros do governo nos estados de E-058.
Diff estimado: integração + testes · L
Depende de: E-058
Verificação: sandbox oficial aceita evento assinado e devolve protocolo consultável; timeout não duplica envio.
Risco: obrigação legal e certificado; revisão especializada e rollout primeiro em produção restrita oficial.

### E-060 · [P1] · FGTS/DCTFWeb — implementar conector real ou assumir exportação manual
Corrige: A-016
Onde: `fgts-digital`, `dctfweb`, `ObrigacoesFiscaisPage`, `FGTSDigitalDashboard`
Ação:
1. Validar disponibilidade/contrato oficial; integrar transmissão/consulta se suportado.
2. Se não houver API adequada, renomear ações para “Gerar arquivo/dados” e exigir confirmação manual do protocolo.
Diff estimado: L (integração) ou ~160 linhas (relabel/manual)
Depende de: E-058
Verificação: status externo tem prova/protocolo; sem conector, nenhum toast/badge afirma sincronização.
Risco: dependência governamental pode mudar; encapsular adapter e versionar layout.

### E-061 · [P1] · testes legais — reconciliar transmissão, consulta e reenvio
Corrige: A-016
Onde: testes de `enviar-esocial`, FGTS, DCTFWeb · ambiente oficial de teste
Ação:
1. Cobrir aceito, rejeitado, timeout, consulta posterior, certificado inválido e replay.
2. Provar que UI e banco exibem o mesmo estado/protocolo externo.
Diff estimado: ~350 linhas + fixtures · L
Depende de: E-059, E-060
Verificação: suite oficial/sandbox gera evidência anexável sem PII e bloqueia promoção se divergir.
Risco: sandbox instável; separar falha externa de regressão e nunca converter indisponibilidade em sucesso.

### E-062 · [P1] · banco/Bitrix — criar chaves naturais tenant-scoped válidas
Corrige: A-017
Onde: `departamentos`, mapeamento Bitrix de colaboradores · migrations
Classe (só banco): aditiva
Ação:
1. Criar unique `(empresa_id,nome_normalizado)` para departamentos após preview de duplicatas.
2. Criar tabela de mapeamento `(empresa_id,bitrix_user_id,colaborador_id)` em vez de usar e-mail como conflito.
Diff estimado: ~140 linhas · 1–2 migrations · M
Depende de: E-026
Verificação: preview retorna zero colisões não tratadas; PostgREST aceita os `onConflict` novos.
Risco: índice em tabela grande deve usar `CREATE UNIQUE INDEX CONCURRENTLY`; resolver duplicatas em lotes antes de anexar constraint.

### E-063 · [P1] · Bitrix — alinhar upserts às chaves de E-062
Corrige: A-017
Onde: `supabase/functions/sincronizar-bitrix/index.ts:105-149`
Ação:
1. Incluir `empresa_id` em departamentos e usar IDs externos pela tabela de mapeamento.
2. Remover `onConflict:'nome'/'email'` inválidos e validar schema da resposta Bitrix.
Diff estimado: ~150 linhas + testes · M
Depende de: E-062
Verificação: dois tenants com mesmo nome/e-mail externo sincronizam sem colisão ou movimento de registro.
Risco: primeiro sync pode criar duplicatas; executar dry-run e reconciliar IDs antes do upsert.

### E-064 · [P1] · Bitrix — falhar corretamente em erro parcial
Corrige: A-017
Onde: `sincronizar-bitrix/index.ts:102-183` · `ConfigPanels.tsx:63-75`
Ação:
1. Retornar status parcial/erro quando `totalErrors>0`, com itens falhos e retry seguro.
2. Exibir toast de sucesso somente com zero erros e oferecer reprocessamento dos IDs falhos.
Diff estimado: ~90 linhas + testes · S
Depende de: E-063
Verificação: uma falha em lote não produz `success:true` puro nem toast de conclusão total.
Risco: consumidores esperam 200; versionar resposta e atualizar UI no mesmo release.

### E-065 · [P1] · testes Bitrix — cobrir contratos, paginação e idempotência
Corrige: A-017
Onde: testes `sincronizar-bitrix` · fake server HTTP
Ação:
1. Cobrir departamentos/usuários, páginas, dados inválidos, 429/500, retry e repetição do lote.
2. Incluir dois tenants com dados iguais, paginação e repetição do mesmo lote.
Diff estimado: ~300 linhas · L
Depende de: E-064
Verificação: segunda sincronização não duplica; falha parcial é retomada e tenants não colidem.
Risco: fake pode divergir da API; manter contratos capturados sem PII e smoke de sandbox.

### E-066 · [P1] · backup — criar formato/manifeste de snapshot completo e paginado
Corrige: A-018
Onde: `backup-automatico` ou job dedicado · manifesto de tabelas
Ação:
1. Remover cap silencioso de 10.000 por paginação/stream e falhar se tabela obrigatória não exportar.
2. Gravar manifesto com contagens, schema version, hashes por parte e status completo/parcial.
Diff estimado: ~260 linhas · L
Depende de: E-028, E-029
Verificação: fixture >10.000 preserva todas as linhas; diferença de contagem torna backup failed.
Risco: snapshot app-level não substitui PITR; limitar memória e manter E-067 como proteção principal.

### E-067 · [P1] · plataforma — habilitar backup gerenciado/PITR do Postgres
Corrige: A-018
Onde: configuração Supabase/infra do projeto de produção
Ação:
1. Configurar backup diário e PITR compatível com RPO 15 min/RTO 60 min declarados.
2. Definir retenção, criptografia, região e responsáveis pela restauração.
Diff estimado: configuração externa + runbook · M
Depende de: E-026
Verificação: console/API mostra snapshots e janela WAL; alerta acusa atraso acima do RPO.
Risco: custo/IO e falsa sensação de cobertura; incluir Storage e secrets separadamente.

### E-068 · [P1] · operação — agendar backup app-level e remover job órfão de despesa
Corrige: A-018
Onde: `cron.job` · `backup-automatico` · job `update-despesa-updated-at-daily`
Classe (só banco): destrutiva → expand-contract (novo job validado antes de `cron.unschedule` do órfão)
Ação:
1. Criar scheduler autenticado para backup e monitorá-lo por empresa/manifesto.
2. Após provar origem e zero dependências, remover o job não versionado que altera um UUID fixo.
Diff estimado: migration + configuração ~100 linhas · M
Depende de: E-066, E-067
Verificação: `cron.job` contém job versionado; execução gera manifesto; job órfão some após preview.
Risco: não apagar job sem owner confirmado; rollback reagenda comando capturado, embora sua alteração diária deva ficar bloqueada.

### E-069 · [P1] · restore — automatizar restauração em ambiente isolado
Corrige: A-018
Onde: `scripts/restore-drill.*` · projeto Supabase descartável · runbook
Ação:
1. Restaurar backup/PITR sem tocar produção e validar schema, contagens, hashes e amostra mascarada.
2. Medir RPO/RTO reais e registrar falhas/tempos por execução.
Diff estimado: ~250 linhas + infra · L
Depende de: E-067, E-068
Verificação: restore completo termina abaixo dos objetivos ou abre incidente com medida real.
Risco: script apontar para produção; exigir project ref allowlisted como não-produção e confirmação fail-closed.

### E-070 · [P1] · observabilidade — alertar ausência/falha de backup
Corrige: A-018, A-019
Onde: métricas/alertas de backup · `audit_log`/manifestos
Ação:
1. Emitir idade do último backup completo, duração, bytes e divergência de contagens.
2. Alertar antes do RPO e escalar quando restore drill falhar.
Diff estimado: ~100 linhas + regras · M
Depende de: E-068, E-069
Verificação: atrasar job em teste dispara alerta; execução/restore saudável encerra-o com evidência.
Risco: alerta sem plantão vira ruído; definir owner e canal de escalonamento.

### E-071 · [P1] · dependências — repinar TypeScript para a linha suportada
Corrige: A-020
Onde: `package.json:135` · `bun.lock` · notas AGENTS/CLAUDE
Ação:
1. Fixar TypeScript 6.0.3 conforme peer `<6.1.0`, preservando `@typescript/native-preview` se usado separadamente.
2. Regenerar `bun.lock` com Bun pinado e impedir bot de atualizar TS além do peer.
Diff estimado: 2 arquivos + config Dependabot · S
Depende de: E-026
Verificação: `bun run typecheck*` e `bun run lint:ci` iniciam sem erro de compatibilidade.
Risco: código pode depender de TS7; typechecks dos três configs detectam antes do merge.

### E-072 · [P1] · CI — restaurar lint real e baseline de warnings
Corrige: A-020
Onde: ESLint config · `package.json` · `ci.yml`
Ação:
1. Rodar `lint:ci` com TS6 e corrigir apenas erros/warnings acima do teto atual.
2. Fixar teste de compatibilidade entre TypeScript e typescript-eslint no script de dependências.
Diff estimado: config + correções localizadas · M
Depende de: E-071
Verificação: job Lint do mesmo commit fica verde e lista regras executadas; incompatibilidade fixture falha cedo.
Risco: 18 warnings permitidos podem esconder dívida; reduzir teto em etapas futuras com lista medida.

### E-073 · [P1] · workflows — usar `VITE_SUPABASE_PUBLISHABLE_KEY` canônica
Corrige: A-021, A-029
Onde: `.github/workflows/e2e.yml`, `deploy.yml`, `ci.yml`
Ação:
1. Renomear env dos workflows e remover `VITE_SUPABASE_ANON_KEY` do contrato do app.
2. Adicionar guard explícito de URL/key não vazias antes de build/E2E.
Diff estimado: ~35 linhas · S
Depende de: E-026
Verificação: workflow falha com mensagem de prerequisite quando vazio e build passa com publishable de teste.
Risco: secret existente pode ter nome antigo; cadastrar novo antes do corte e apagar legado depois.

### E-074 · [P1] · GitHub — provisionar secrets e environment de preview/teste
Corrige: A-021
Onde: GitHub Environments/Secrets · Netlify preview
Ação:
1. Criar environment não produtivo com Supabase URL/publishable e credenciais E2E de menor privilégio.
2. Cadastrar Netlify tokens com escopo mínimo, reviewers e rotação documentada.
Diff estimado: configuração externa · M
Depende de: E-073
Verificação: `gh secret list` mostra nomes (não valores), environment existe e preview usa ref não produtivo.
Risco: apontar teste para produção; gate compara ref com `dp_environments.is_production=false`.

### E-075 · [P1] · E2E — criar seed idempotente multiempresa no ambiente de teste
Corrige: A-021, A-024
Onde: `e2e/global-setup` · migrations/fixtures do projeto de teste
Ação:
1. Criar admin, não-admin, tenants A/B e entidades mínimas com IDs isolados por run.
2. Limpar apenas namespace do run e nunca usar credenciais/dados de produção.
Diff estimado: ~260 linhas · L
Depende de: E-074
Verificação: setup pode rodar duas vezes; ref de DB é não-prod e testes RBAC têm dados determinísticos.
Risco: limpeza ampla apaga fixtures; exigir prefixo/run-id e project ref allowlisted.

### E-076 · [P1] · E2E/deploy — zerar as 23 falhas e validar preview
Corrige: A-021
Onde: testes Playwright atuais · `e2e.yml` · `deploy.yml`
Ação:
1. Reexecutar as 23 falhas com env/seed corretos e corrigir seletores/contratos reais, sem skips novos.
2. Fazer smoke do preview para login, rota protegida, colaborador, folha e ponto.
Diff estimado: testes/seletores localizados · L
Depende de: E-075
Verificação: run E2E tem zero falhas e skips somente documentados; preview URL responde ao smoke.
Risco: testes podem revelar bugs adicionais; registrar novos achados em vez de afrouxar assertions.

### E-077 · [P1] · scripts SQL — falhar quando `DATABASE_URL` não estiver configurada
Corrige: A-022
Onde: sete scripts `audit-db-*`, `audit-rls-*`, `audit-secdef-*`, `smoke-*`, `audit-embed-hints.mjs`
Ação:
1. Em CI, ausência/erro de conexão deve sair com código distinto não zero.
2. Manter modo `--allow-offline` apenas para uso local explícito, nunca no workflow protegido.
Diff estimado: ~90 linhas + testes · S
Depende de: E-026
Verificação: env vazio e socket inexistente fazem job falhar; banco acessível executa queries e reporta contagens.
Risco: CI fica vermelho até E-078; aplicar as duas etapas no mesmo PR/configuração.

### E-078 · [P1] · CI/banco — fornecer conexão read-only ao banco de validação
Corrige: A-022
Onde: GitHub environment · role Postgres `ci_auditor` · `ci.yml`
Classe (só banco): aditiva
Ação:
1. Criar role read-only sem bypass RLS/DML e secret `SUPABASE_DB_URL` no environment de teste.
2. Aplicar migrations do PR a banco efêmero antes dos gates, quando necessário.
Diff estimado: migration/config + workflow · M
Depende de: E-074, E-077
Verificação: logs mostram host/ref mascarado e cada gate executado; role não consegue INSERT/DDL.
Risco: URL de produção no CI; bloquear `is_production=true` e exigir allowlist de project ref.

### E-079 · [P1] · CI/banco — corrigir todas as falhas reais e exigir os sete gates
Corrige: A-002, A-003, A-004, A-008, A-009, A-022
Onde: job `db-integrity` · scripts de auditoria
Ação:
1. Rodar gates contra schema corrigido, resolver os achados reportados e retirar qualquer `continue/exit 0` indevido.
2. Publicar sumário com contagens, nunca dados, e tornar o job required.
Diff estimado: scripts/migrations conforme resultados · L
Depende de: E-078
Verificação: fixture vulnerável faz cada gate correspondente falhar; main corrigida passa todos.
Risco: schema de teste divergir; reconstruí-lo sempre das migrations do commit.

### E-080 · [P1] · GitHub — proteger `main` com checks e revisão obrigatórios
Corrige: A-024
Onde: branch ruleset de `main`
Ação:
1. Exigir PR, um review, conversas resolvidas, branch atualizada e checks CI/Lint/E2E/DB já verdes.
2. Bloquear push direto/force push/delete inclusive para admins, com break-glass auditado.
Diff estimado: configuração externa · S
Depende de: E-072, E-076, E-079
Verificação: PR com check falho não mergeia; push direto de writer é rejeitado.
Risco: indisponibilidade de check bloqueia hotfix; usar bypass temporário nominal com auditoria pós-incidente.

### E-081 · [P1] · banco — medir colisões antes de alterar unicidade de CPF/matrícula
Corrige: A-025
Onde: `colaboradores` · relatório SQL mascarado
Classe (só banco): aditiva/somente leitura
Ação:
1. Contar duplicatas potenciais por `(empresa_id,cpf_hash)` e `(empresa_id,matricula)` e nulos.
2. Identificar dependências/FKs e comportamento esperado para múltiplos vínculos sem extrair PII.
Diff estimado: script SQL ~80 linhas · S
Depende de: E-026
Verificação: relatório apresenta apenas contagens/IDs mascarados e decisão aprovada para cada colisão.
Risco: CPF plaintext não deve sair do banco; operar por hash/contagem.

### E-082 · [P1] · banco — adicionar índices únicos compostos tenant-scoped
Corrige: A-025
Onde: `colaboradores(empresa_id,cpf_hash)` e `(empresa_id,matricula)` · migrations
Classe (só banco): aditiva
Ação:
1. Resolver colisões de E-081 em lotes e criar índices únicos compostos `CONCURRENTLY`.
2. Manter os índices globais nesta fase para compatibilidade expand-contract.
Diff estimado: ~70 linhas · 1 migration operacional · M
Depende de: E-081
Verificação: índices válidos e zero duplicatas por tenant; lock/latência monitorados durante criação.
Risco: índice pode falhar/consumir IO; criar fora de transação em janela e repetir após cleanup.

### E-083 · [P1] · aplicação — tratar CPF/matrícula como identidade por empresa
Corrige: A-025, A-012, A-017
Onde: schemas/queries/importações de colaborador · mensagens de conflito
Ação:
1. Incluir empresa em lookup/upsert e exibir conflito somente dentro do tenant.
2. Adaptar Bitrix/importações e testes para a mesma pessoa/matrícula em empresas distintas.
Diff estimado: ~180 linhas + testes · M
Depende de: E-082
Verificação: tenant A e B cadastram mesmo CPF/matrícula; duplicata dentro de A é recusada.
Risco: integrações que usam CPF como chave global; migrar para colaborador ID + empresa.

### E-084 · [P1] · banco — remover constraints globais antigas
Corrige: A-025
Onde: `colaboradores_cpf_key`, `colaboradores_matricula_key` · migrations
Classe (só banco): destrutiva → expand-contract (E-082/E-083 expandem; esta etapa contrai)
Ação:
1. Fazer preview de dependências e `DROP CONSTRAINT/INDEX` apenas após todos os consumidores usarem chave composta.
2. Preservar rollback lógico recriando índice global somente se não houver novos múltiplos vínculos.
Diff estimado: ~45 linhas · 1 migration · S
Depende de: E-083
Verificação: constraints globais somem, compostas permanecem; suíte multiempresa de E-046 passa.
Risco: após múltiplos vínculos, rollback global pode ser impossível; declarar irreversibilidade e restaurar código sem recriar regra errada.

### E-085 · [P1] · Edge/SSRF — validar e fixar destinos Bitrix permitidos
Corrige: A-031
Onde: `sincronizar-bitrix/index.ts` · novo helper `safeExternalUrl.ts`
Ação:
1. Aceitar somente HTTPS e hostname Bitrix aprovado por empresa, bloqueando localhost, IP literal/privado, redirects e DNS rebinding.
2. Revalidar cada redirect/resolução, nunca retornar corpo de destino e adicionar fixtures SSRF à suíte Bitrix.
Diff estimado: ~180 linhas + testes · M
Depende de: E-026
Verificação: fixtures 127.0.0.1, RFC1918, IPv6 local, redirect privado e domínio não Bitrix são negadas.
Risco: domínios Bitrix customizados legítimos; allowlist administrada com validação DNS e revisão.

## P2 e P3 — robustez, observabilidade e manutenção

### E-086 · [P2] · banco — fixar `search_path` nas 18 funções definer
Corrige: A-004
Onde: funções listadas pela query A-004 · migrations
Classe (só banco): aditiva/compatível
Ação:
1. Recriar funções com `SET search_path` mínimo e qualificar tabelas/funções por schema.
2. Usar `pg_catalog` e schemas de extensão explícitos, sem incluir schemas graváveis pelo usuário.
Diff estimado: 2–3 migrations por lote · M
Depende de: E-026
Verificação: query em `pg_proc.proconfig` retorna path fixo para todas; smoke de hashes/retention passa.
Risco: extensão fora do path gera erro; testar cada função no banco de preview antes da troca.

### E-087 · [P2] · CI/banco — ampliar gate de `search_path` a toda função definer
Corrige: A-004, A-022
Onde: `scripts/audit-db-search-path.mjs`
Ação:
1. Reprovar qualquer definer sem path seguro, não só funções que chamam extensões conhecidas.
2. Detectar schema gravável, nome não qualificado crítico e grants públicos combinados.
Diff estimado: ~120 linhas + fixtures · M
Depende de: E-086, E-078
Verificação: função fixture vulnerável sai 1; as 18 corrigidas e helpers seguros saem 0.
Risco: parser estático imperfeito; combinar catálogo e fixtures, com exceções justificadas por OID/assinatura.

### E-088 · [P2] · observabilidade — medir o bridge externo diretamente
Corrige: A-019
Onde: `healthcheck/index.ts`, `metrics/index.ts`, endpoint health do `external-db-bridge`
Ação:
1. Fazer probe autenticado e read-only ao bridge externo com timeout e resultado `.error` validado.
2. Separar estados DB local, bridge, DB externo e telemetria; não marcar fulfilled como healthy.
Diff estimado: ~150 linhas + testes · M
Depende de: E-021
Verificação: derrubar fake bridge muda apenas métrica bridge para 0 e health para degraded/503.
Risco: probe pode gerar carga/alarme; usar consulta constante barata e rate limit próprio.

### E-089 · [P2] · métricas — corrigir taxa de erro e adicionar freshness SLO
Corrige: A-019
Onde: `metrics/index.ts:78-177` · Prometheus rules
Ação:
1. Calcular `errors/total_requests` na mesma janela e expor counters monotônicos corretos.
2. Expor idade do último evento e alertar quando telemetria ficar stale por mais de cinco minutos.
Diff estimado: ~140 linhas + alert rules · M
Depende de: E-088
Verificação: carga sintética conhecida produz taxa exata; ausência de eventos dispara alerta de freshness.
Risco: mudança de nomes quebra dashboard; publicar métricas v2 paralelas e migrar queries antes de remover v1.

### E-090 · [P2] · dependências — corrigir as quatro vulnerabilidades observadas
Corrige: A-023
Onde: `bun.lock`, `package.json` · cadeias `brace-expansion`, `fast-uri`, `exceljs/uuid`
Ação:
1. Atualizar transitivas sem `--force`, usando overrides quando compatível, e isolar a quebra do `exceljs` em PR próprio.
2. Executar exportações Excel, build, testes e audit nos dois gerenciadores usados.
Diff estimado: lock/package + testes · M
Depende de: E-071
Verificação: `npm audit --audit-level=high` e equivalente Bun não reportam os dois high; Excel smoke passa.
Risco: override incompatível; rollback por lockfile e atualização direta do dependente raiz.

### E-091 · [P2] · GitHub Security — bloquear audit high e habilitar CodeQL
Corrige: A-023
Onde: `security.yml` · GitHub Code Security settings
Ação:
1. Remover `|| true` de install/audit e definir policy documentada para exceção temporária por advisory.
2. Habilitar code scanning/SARIF e acrescentar Security aos checks required de E-080 após o primeiro run verde.
Diff estimado: ~30 linhas + configuração · S
Depende de: E-090
Verificação: advisory high fixture reprova; CodeQL publica findings e run sem feature não fica verde.
Risco: licença/configuração pode bloquear upload; validar disponibilidade antes de tornar required.

### E-092 · [P2] · dashboards — substituir dados fixos por queries ou estado “sem dados”
Corrige: A-026
Onde: `OnboardingDashboard.tsx`, `FGTSDigitalDashboard.tsx`
Ação:
1. Calcular time-to-hire de datas reais e obter FGTS/status apenas do contrato externo de E-058/E-060.
2. Exibir loading/erro/vazio; remover valores, datas e badges hardcoded.
Diff estimado: ~220 linhas + testes · M
Depende de: E-057, E-060
Verificação: banco vazio mostra “sem dados”; fixtures alteradas mudam métricas; nenhuma string fixa auditada resta.
Risco: histórico insuficiente produz vazio; explicar requisito, não inventar média.

### E-093 · [P2] · contratos/privacidade — capturar IP server-side com timeout e base legal
Corrige: A-027
Onde: RPC/Edge de assinatura e verificação · `AssinarContratoPage.tsx`, `VerificarContratoPage.tsx`
Ação:
1. Remover chamadas browser→ipify e derivar IP de headers confiáveis no servidor, com timeout inexistente por não haver terceiro.
2. Documentar finalidade/retenção e minimizar/hash quando IP bruto não for juridicamente necessário.
Diff estimado: ~120 linhas + revisão de privacidade · M
Depende de: E-026
Verificação: network trace do browser não chama ipify; assinatura funciona offline desse terceiro e auditoria respeita retenção.
Risco: proxies podem fornecer IP incorreto; definir cadeia confiável e registrar proveniência.

### E-094 · [P2] · Nginx — adicionar baseline de headers e CSP gradual
Corrige: A-028
Onde: `nginx.conf`, `docker/nginx.conf` · testes HTTP
Ação:
1. Adicionar nosniff, referrer, permissions, frame-ancestors e HSTS apenas sob HTTPS.
2. Implantar CSP report-only, inventariar Metabase/Supabase/Sentry e depois promover a enforcing sem `unsafe-eval`.
Diff estimado: ~80 linhas + testes · M
Depende de: E-076
Verificação: curl/OWASP header check confirma valores; relatório CSP não mostra bloqueios legítimos antes do enforcement.
Risco: CSP quebra SDK/iframe; rollout report-only e rollback apenas da diretiva conflitante.

### E-095 · [P2] · frontend — validar env em um schema único de build
Corrige: A-021, A-029
Onde: novo `src/config/env.ts` · `vite.config.ts` · `.env.example`
Ação:
1. Declarar 14 `VITE_*` com tipo, obrigatoriedade por feature e proibição de nomes secretos como `VITE_*SECRET*`.
2. Fazer módulos consumirem config validada e atualizar exemplo sem valores reais.
Diff estimado: ~180 linhas + testes · M
Depende de: E-073
Verificação: build falha cedo com env obrigatória ausente/secret-like e passa com configuração mínima documentada.
Risco: features opcionais podem impedir build; usar discriminated config por feature, não defaults enganosos.

### E-096 · [P2] · Edge/infra — versionar manifesto de secrets e modos de runtime
Corrige: A-016, A-029
Onde: `supabase/functions/*/config.ts` · `docs/env-matrix.md` · deploy check
Ação:
1. Listar nome, função consumidora, obrigatório/opcional, ambiente e owner para secrets Edge.
2. Validar presença antes do deploy e impedir `ESOCIAL_SIMULATE=true` quando `is_production=true`.
Diff estimado: manifesto + script ~220 linhas · M
Depende de: E-057
Verificação: deploy de função sem secret falha com nome; produção em simulate é bloqueada antes do runtime.
Risco: manifesto vira inventário sensível; registrar nomes/owners, nunca valores.

### E-097 · [P3] · build — usar `bun.lock` congelado em Docker e preview
Corrige: A-030
Onde: `Dockerfile`, `deploy.yml`, imagens docker auxiliares
Ação:
1. Copiar `bun.lock` e usar versão Bun pinada com `bun install --frozen-lockfile` no builder.
2. Remover fallback npm sem lock ou adicionar lock npm mantido por pipeline único, não ambos divergentes.
Diff estimado: ~45 linhas · S
Depende de: E-071
Verificação: duas builds limpas do mesmo commit têm hash de assets/dependências idêntico.
Risco: lock stale bloqueia build; atualização deve ocorrer em PR explícito e revisável.

### E-098 · [P2] · webhook — não confirmar `processed` sem handler de negócio
Corrige: A-032
Onde: `supabase/functions/webhook/index.ts:169-203` · `webhook_logs`
Ação:
1. Trocar placeholders por roteamento explícito de eventos suportados e retornar 422 para desconhecidos.
2. Marcar `processed` somente após commit do efeito; usar `accepted/pending` se processamento assíncrono.
Diff estimado: ~180 linhas + testes · M
Depende de: E-026
Verificação: evento suportado altera entidade e log; desconhecido não recebe 200 processed; replay não duplica.
Risco: produtores podem reenviar após novo status; manter idempotência por `event_id` e contrato versionado.

### E-099 · [P3] · tipos — remover `any` das fronteiras críticas já implicadas nos bugs
Corrige: A-012, A-013, A-017, A-032, A-033
Onde: `ColaboradorFormPage`, `validadorFolha`, `sincronizar-bitrix`, `webhook`, `auditLogger`
Ação:
1. Criar DTOs/Zod e tipos gerados para payload/resposta, removendo coerções `as any` nesses cinco módulos.
2. Adicionar regra/contagem baseline que impede aumento das 1.132 ocorrências e reduz por lote.
Diff estimado: ~300 linhas · L
Depende de: E-046, E-049, E-065, E-098
Verificação: `rg` confirma zero `any` nas cinco fronteiras; typecheck rejeita fixtures com campo/tenant errado.
Risco: tipos revelam mais divergências; corrigir contrato real, nunca silenciar com cast/ignore.

### E-100 · [P2] · testes — impor cobertura por módulos críticos corrigidos
Corrige: A-034
Onde: `vitest.config.*` · cobertura de bridge/auth/folha/ponto/Storage/integrações
Ação:
1. Definir thresholds por arquivo para os módulos tocados no plano, priorizando branches e functions.
2. Elevar baseline apenas com testes de erro, cross-tenant, timeout/replay e estados vazios, sem testes cosméticos.
Diff estimado: config + testes incrementais · L
Depende de: E-032, E-039, E-046, E-049, E-053, E-061, E-065, E-098, E-099
Verificação: CI falha ao remover um branch de autorização/erro; relatório supera baseline registrado dos módulos críticos.
Risco: threshold global imediato gera testes frágeis; aplicar por módulo corrigido e subir progressivamente.
