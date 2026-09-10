# Simulação pré-execução — plano de melhorias em 50 etapas

**Data:** 10/09/2026
**Escopo:** validação não destrutiva antes de executar as melhorias E50-001–E50-050
**Decisão:** não promover, aplicar migrações, alterar ACL/RLS, alterar secrets ou integrar `origin/main` até que os gates vermelhos abaixo sejam resolvidos.

> Esta simulação não alterou o banco canônico, GitHub, variáveis, secrets, workflows remotos ou dados. Ela verifica se a ordem do plano é executável e se seus critérios de êxito realmente medem o que afirmam medir.

## Resultado executivo

O plano tem estrutura adequada (**50 etapas, 500 subetapas e 200 checkpoints**, sem dependência futura ou circular na validação estática), mas ainda não é seguro promovê-lo integralmente. Credenciais previamente expostas precisam ser rotacionadas; não há ambiente Supabase local; E2E não possui identidades sintéticas configuradas; e falta definir a URL canônica da aplicação para o health-check. Correções preventivas de configuração e supply chain já foram validadas localmente, sem tocar no banco.

| Estado   | Quantidade | Interpretação                                                           |
| -------- | ---------: | ----------------------------------------------------------------------- |
| Verde    |          3 | evidência reproduzível suficiente para prosseguir em uma etapa limitada |
| Amarelo  |          5 | há teste/evidência, mas insuficiente para promoção                      |
| Vermelho |          3 | bloqueia alteração de banco, release ou declaração de 10/10             |

## Matriz de cenários simulados

| ID  | Cenário e etapas afetadas                     | Simulação/evidência                                                                                                                                                                                                                                                                                                   | Resultado       | Gate para avançar                                                                                                                                                   |
| --- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S01 | Integridade do plano, todas                   | Validador estático: 50 etapas, 500 subetapas, 200 checkpoints e zero dependência adiante/circular.                                                                                                                                                                                                                    | **Verde**       | Manter ordem E50-001 → E50-050 e anexar evidências a cada C4.                                                                                                       |
| S02 | Cálculos trabalhistas, E50-020–029            | `03_SIMULACAO_CENARIOS.md` registra 1.850 cenários de IRRF e 236.544 de rescisão pós-correção com divergência zero contra os motores canônicos definidos.                                                                                                                                                             | **Verde**       | Reexecutar no CI ao tocar calculadoras ou Edge Functions.                                                                                                           |
| S03 | Migrações recentes, E50-009–019               | `bun run test:migrations` criou banco Docker efêmero, aplicou duas vezes as três migrações de 20260830 e aprovou 28 asserts.                                                                                                                                                                                          | **Amarelo**     | Não extrapolar o resultado para as 640 versões históricas; reconstruir e comparar baseline antes de `db push`/`migration repair`.                                   |
| S04 | Projeto Supabase canônico, E50-003            | A configuração local está ligada a `frjbfeamybqsejlvmqbl`; `origin/main` está um commit à frente e altera `vite.config.ts` para `ciziytrrjjotlsjzshnm`. Foi criado o gate `audit-canonical-project`: ele valida CLI, proxy, deploy, E2E, allowlist e workflow.                                                        | **Amarelo**     | Integrar por PR uma reversão deliberada do commit remoto; o gate local passa, mas `main` ainda não contém a correção.                                               |
| S05 | Segurança de supply chain, E50-030/047        | O último workflow `Security Scan & Code Quality` falhou em `npm audit --audit-level=high` por `sharp <0.35.4`. O `package-lock.json` foi regenerado por `npm audit fix --package-lock-only`, passando a `sharp 0.35.4`; `npm audit`, `npm ci --ignore-scripts` e `bun install --frozen-lockfile` passaram localmente. | **Verde local** | Publicar por PR e confirmar nova execução da workflow sem reduzir o nível do audit.                                                                                 |
| S06 | E2E autenticado, E50-035–039/047              | O workflow exige seis valores; URL e chave pública existem, mas faltam as quatro credenciais sintéticas `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `E2E_NON_ADMIN_EMAIL` e `E2E_NON_ADMIN_PASSWORD`. Falha antes de executar Playwright.                                                                                  | **Vermelho**    | Criar duas identidades descartáveis com papéis distintos, salvar apenas em GitHub Secrets e comprovar o fluxo positivo e a negação de privilégio.                   |
| S07 | Health de produção, E50-043/047               | O workflow passou a definir `REQUIRE_APP=1`; o teste negativo local prova que ausência de URL de app e backend agora falha. A variável de repositório `APP_URL` continua ausente.                                                                                                                                     | **Vermelho**    | Definir hospedagem canônica em variável de repositório; validar HTTP, conteúdo esperado e execução agendada após o merge.                                           |
| S08 | Simulação local Supabase, E50-009–019/030–039 | `supabase status` confirma o link ao projeto canônico, mas não há container local `supabase_db_frjbfeamybqsejlvmqbl`.                                                                                                                                                                                                 | **Vermelho**    | Criar ambiente local/efêmero com versão fixada do CLI e rodar schema, RLS, funções, Storage, cron e Edge Functions nele antes do canônico.                          |
| S09 | Orquestração Docker, E50-040/047              | `docker compose -f docker/docker-compose.yml config` falha: o arquivo contém chaves não reconhecidas (`enabled`, `settings`, `config`) e não é um Compose válido. Os Compose raiz de desenvolvimento e produção só declaram serviços próprios.                                                                        | **Amarelo**     | Classificar o arquivo como artefato obsoleto e removê-lo, ou substituí-lo por Compose válido com owner, propósito e smoke documentados; não adivinhar sua intenção. |
| S10 | Governança de merge, E50-047                  | Há ruleset ativo para `main` com PR, revisão e checks obrigatórios; também existe ator em bypass permanente. A proteção clássica retorna 404 porque a governança está em ruleset, não em branch protection legado.                                                                                                    | **Amarelo**     | Auditar a justificativa do bypass, adotar bypass temporário/expirável quando possível e provar que um push direto não autorizado falha.                             |
| S11 | Qualidade local ampla, E50-030–046            | Build de produção, typecheck da aplicação/e2e, lint, teste focado (19 asserts) e validação do E2E sem configuração passaram. O lint mantém 14 warnings conhecidos e há uma suíte Vitest concorrente em execução no ambiente, portanto a regressão integral ainda não é evidência de promoção.                         | **Amarelo**     | Registrar artefatos e códigos de saída de `ci:verify`, Vitest integral, build e checks Deno isolados, sem execuções concorrentes.                                   |

## Falhas de ordem evitadas pela simulação

1. **Não integrar `origin/main` antes de resolver o projeto canônico.** O único commit remoto pendente troca `frjb…` por `ciziy…`; aceitá-lo restauraria uma conexão incorreta.
2. **Não usar o sucesso do health-check como evidência de disponibilidade da aplicação.** Hoje ele permite frontend ausente.
3. **Não chamar `supabase db push`, `migration repair` ou reset remoto.** O teste de três migrações não demonstra equivalência do histórico de 640 versões nem garante segurança de ACL, RLS, funções, triggers, cron e Storage.
4. **Não desabilitar o audit para deixar a workflow verde.** A correção deve remover a versão vulnerável, não reduzir o nível de bloqueio.
5. **Não configurar E2E com conta administrativa ou dados reais.** As duas contas precisam ser descartáveis, com tenant e permissões explicitamente controlados.
6. **Não reutilizar segredos enviados anteriormente.** Mesmo sendo ambiente em implantação, senha de banco e credencial administrativa expostas devem ser consideradas revogadas.

## Sequência revisada de execução

### P00 — Pré-requisitos externos (bloqueantes)

1. Rotacionar no painel Supabase todas as credenciais que foram expostas e revogar as antigas.
2. Fornecer acesso novo por secret manager/variável de ambiente efêmera, nunca por chat ou commit: uma credencial de banco para staging efêmero e, se necessária, uma credencial de gestão com privilégio mínimo e expiração.
3. Confirmar por escrito a hospedagem web canônica e a intenção do commit remoto que aponta para `ciziy…`.
4. Definir duas identidades E2E sintéticas (admin e não-admin) e registrar seus segredos exclusivamente no GitHub.
5. Confirmar backup/export verificável e a autorização explícita para qualquer reset do projeto descartável após restauração ensaiada.

### P01 — Correções reversíveis, em branch protegida

1. Criar branch de trabalho a partir do estado local preservado e não fazer push direto em `main`.
2. Corrigir a fonte única do projeto Supabase e introduzir teste que rejeite refs diferentes.
3. Corrigir o health-check para ser fail-closed para aplicação e backend na workflow de produção.
4. Corrigir a cadeia de `sharp` e lockfiles, com audit de alta severidade mantido.
5. Reparar ou retirar o artefato Compose inválido somente após classificação de uso.
6. Provisionar Supabase local/efêmero, reconstruir schema e gerar diff físico contra o canônico.

#### Evidências locais já produzidas

- **E50-003 parcial:** criado `scripts/audit-canonical-project.mjs`; o gate reprovou inicialmente o bypass global de JWT e passou após o deploy ser fixado para o ref canônico, com opt-in explícito para outro ref.
- **E50-030/047 parcial:** regenerado `package-lock.json` para `sharp 0.35.4`; `npm audit --audit-level=high` retorna zero vulnerabilidades.
- **E50-035 parcial:** o teste público da API não usa mais fallback remoto e consome o mesmo nome de chave pública da workflow; sem configuração ele é pulado, nunca apontado a outro projeto.
- **E50-043 parcial:** a workflow de health agora exige aplicação; o teste negativo sem `APP_URL` e sem backend retorna falha, como deve ser.
- **E50-040 parcial:** o Vitest passou a usar o plugin React padrão e `import.meta.dirname`; o aviso de configuração nativa deixou de aparecer no teste focado.

### P02 — Banco e controles de acesso

Somente depois de P00 e P01: aplicar primeiro em efêmero, depois staging, a contenção de views, `SECURITY DEFINER`, RLS/ACL, hashes, Auth, Storage e cron. Cada mudança deverá demonstrar acesso permitido e as negações anon, usuário sem empresa e tenant vizinho.

### P03 — Promoção e certificação

Com todos os testes capturados, executar E2E, build, testes de Edge Function, restore/rollback e checks de segurança. A promoção do canônico continuará condicionada a PR, revisão, checks requeridos e evidência de pós-deploy.

## Comandos de reprodução seguros

```bash
# Estrutura do plano
node scripts/validate-plan-50.mjs

# Checagens locais
bun run test:migrations
bun run ci:verify
bun run test --run
bun run build

# Sem tocar no banco canônico
supabase start
supabase db reset
supabase db diff --local
```

> Os três últimos comandos de banco só são permitidos depois de criar o ambiente local e nunca devem receber flags de projeto remoto.

## Critério para sair da simulação

Esta fase termina quando S04–S08 estiverem verdes, o resultado final de S11 estiver registrado e P00 tiver evidências sem segredos. Nesse ponto, a execução começará por uma branch contendo mudanças pequenas, auditáveis e reversíveis; “10/10” só poderá ser declarado após a certificação P03.
