# MODELO B DE ONBOARDING — DEPRECATED

**Status:** DEPRECATED (somente leitura de compatibilidade). **Sem `DROP`.**
**Data:** fechamento do domínio de onboarding (Jornada de Onboarding).

## O que é o MODELO B

O produto tem DUAS modelagens de onboarding no banco:

| | MODELO A — **CANÔNICO** | MODELO B — **DEPRECATED** |
|---|---|---|
| Tabelas | `public.admissoes` + `public.tarefas_onboarding` | `public.onboarding_colaborador` + `public.onboarding_tarefas` + `public.onboarding_templates` + `public.onboarding_template_tarefas` |
| Vincula a | **admissão** (`admissao_id`) | **colaborador** (`colaborador_id`) |
| Tela | **Jornada de Onboarding** (`/onboarding`) | aba *Desenvolvimento* do dossiê |
| Escrita pela UI | `concluirTarefa` (1 mutation) | **nenhuma** |
| Service | `services/onboardingJornadaService.ts` | `onboardingService` em `services/tabelas/rhService.ts` |

A Jornada de Onboarding é a **única fonte operacional**. O modelo B não recebe
mais nenhuma escrita da aplicação.

## Consumidores (FASE 9.2)

Consumidores de LEITURA do modelo B — apenas um hook:

- `src/hooks/useDesenvolvimentoColaborador.ts` → `useOnboardingColaborador()`
  - usado por `JornadaInternaCard` (aba Desenvolvimento)
  - usado por `useHistoricoColaborador()` (Histórico do colaborador)

Escritas do modelo B (`onboardingService.iniciarOnboarding`, `criarTemplate`,
`criarTemplateTarefa`, `listarTemplates`, `listarColaboradores`,
`listarTemplateTarefas`) foram **removidas por não terem nenhum consumidor**.

## Convergência aplicada (FASE 9.3)

`useOnboardingColaborador()` passou a ler o **modelo A**:

```
colaboradores.cpf  →  admissoes.cpf  →  tarefas_onboarding
                                        ↓
                     services/onboardingJornadaService.ts
                     (buscarJornadaDoColaborador + listarTarefasDaAdmissao)
                                        ↓
              JornadaInternaCard  +  Histórico do colaborador
```

O vínculo é o **CPF** porque `admissoes` **não tem `colaborador_id`**.

## Compatibilidade temporária (o que ainda falta)

Enquanto a conferência de dados abaixo não for feita, o hook mantém um
**fallback SOMENTE DE LEITURA** para o modelo B — apenas quando o colaborador
NÃO tem admissão localizável pelo CPF. Isso evita que qualquer histórico já
gravado desapareça. **Não há dual write**: nada é escrito nos dois lados.

### RESULTADO DA CONFERÊNCIA DE DADOS (evidência de repositório)

| Pergunta | Resposta | Evidência |
|---|---|---|
| A) Existem registros no modelo B? | **SIM** | `20260730000000_seed_admissao_onboarding_desligamento_avaliacao.sql:149` insere **6** `onboarding_colaborador` |
| B) Quantos têm equivalente no canônico? | 6 (por CPF) — mas **não equivalentes em conteúdo** | o canônico só recebe as 3 tarefas padrão do trigger `tr_create_onboarding_tasks` |
| C) Quantos existem SOMENTE no modelo B? | **as TAREFAS** (`onboarding_tarefas`, 26 linhas no seed) | `...:165,176,186,196,208,217` |
| D) Campos históricos só no legado | `categoria`, `ordem`, `data_prazo`, `data_conclusao`, `template_tarefa_id`, `status`/`progresso` do onboarding | colunas de `onboarding_tarefas` / `onboarding_colaborador` |

➡️ **Existem dados exclusivos** ⇒ nada é apagado; a convergência é feita por
migration **aditiva** (ver abaixo) e o fallback só sai depois dela.

### Migrations do fechamento (aditivas, idempotentes)

| Arquivo | O que faz | Estado |
|---|---|---|
| `20261005000000_onboarding_kits_rls_additive.sql` | `ENABLE RLS` + 3 policies de tenant + índice em `onboarding_kits` | **não aplicada** |
| `20261005010000_onboarding_audit_trigger.sql` | instala `audit_tarefas_onboarding` reusando `log_audit_change()` | **não aplicada** |
| `20261005020000_onboarding_modelo_b_convergencia.sql` | copia (INSERT) as tarefas do modelo B para `tarefas_onboarding` da admissão do mesmo CPF, sem duplicar | **não aplicada** |

**Blocker real e único:** o CLI Supabase deste ambiente está linkado ao projeto
**`frjbfeamybqsejlvmqbl`**, enquanto o projeto deste repositório é
**`ciziytrrjjotlsjzshnm`** (`.env` → `VITE_SUPABASE_URL`). Aplicar em outro
projeto seria violar a regra de segurança. Com o projeto correto linkado:

```bash
supabase link --project-ref ciziytrrjjotlsjzshnm
supabase migration up --linked        # aplica SÓ as migrations pendentes
```

### Conferência obrigatória antes de remover o fallback

```sql
-- 1. O modelo B tem dados?
SELECT count(*) AS registros_onboarding_colaborador FROM public.onboarding_colaborador;
SELECT count(*) AS tarefas_modelo_b FROM public.onboarding_tarefas;

-- 2. Quantos colaboradores do modelo B NÃO têm admissão com o mesmo CPF?
--    (esses são os que hoje só aparecem pelo fallback)
SELECT oc.colaborador_id, c.cpf, c.nome_completo
FROM public.onboarding_colaborador oc
JOIN public.colaboradores c ON c.id = oc.colaborador_id
WHERE c.cpf IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.admissoes a WHERE a.cpf = c.cpf);

-- 3. DEPOIS da convergência: sobrou alguma tarefa do modelo B sem par no canônico?
SELECT ot.id, ot.titulo, c.cpf
FROM public.onboarding_tarefas ot
JOIN public.onboarding_colaborador oc ON oc.id = ot.onboarding_id
JOIN public.colaboradores c ON c.id = oc.colaborador_id
WHERE c.cpf IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.admissoes a
    JOIN public.tarefas_onboarding t ON t.admissao_id = a.id
    WHERE a.cpf = c.cpf AND t.titulo = ot.titulo
  );
```

- **Consulta 3 com zero linhas** → convergência comprovada ⇒ remover o fallback
  (`onboardingService.buscarPorColaborador` / `listarTarefas` e o bloco de
  compatibilidade em `useOnboardingColaborador`). Aí o modelo B fica sem
  QUALQUER consumidor ativo.
- **Com linhas** → investigar antes (nunca apagar).

## O que NÃO foi feito (e por quê)

- `DROP` das tabelas do modelo B: proibido nesta tarefa.
- Migration de cópia de dados do modelo B: depende da conferência acima e de
  autorização explícita.

## Conferência também pendente em `onboarding_kits`

Ver `supabase/migrations/20261005000000_onboarding_kits_rls_additive.sql`:
a tabela nasceu **sem RLS/policies**; a migration aditiva fecha isso. Depois de
aplicada, `SELECT count(*) FROM public.onboarding_kits;` decide se a grade mostra
perfis ou o estado vazio legítimo.
