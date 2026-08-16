# ESTADO ATUAL DO SISTEMA — Departamento Pessoal V3

> **Auditoria de estado** — levantamento do que o sistema *deveria* fazer versus o que *de fato*
> está implementado e funcionando.
> Data: **16/08/2026** · Branch: `claude/system-status-roadmap-5ifcl7` · Projeto Supabase: `frjbfeamybqsejlvmqbl`
> Método: 11 lotes de análise em paralelo + verificação independente do coordenador contra o banco de produção (somente leitura).

---

## 1. Veredito em uma tela

**O sistema é um protótipo muito grande, não um produto em operação.**

O código existe em volume real e, em boa parte, com qualidade real: 176.772 linhas em `src/`,
61 Edge Functions, 359 tabelas, 599 policies, RLS habilitada em **359/359 tabelas**. O que não existe
é **uso**. O banco de produção inteiro tem **2.129 linhas** somando todas as 359 tabelas, e
**12 dos 13 colaboradores são seed** — UUID `11110000-…-0001..0012`, CPF sequencial
`123.456.789-01..12`, todos com o mesmo `created_at` (2026-07-27 11:01:59).

Três fatos estruturais governam o resto do documento:

1. **Nenhuma funcionalidade de negócio tem prova de uso real em produção.** Aplicando a regra
   *pronto = em produção com uso real*, o placar de `IMPLEMENTADO_TOTAL` para features de negócio é **0**.
   Os únicos componentes com execução comprovada são o `external-db-bridge` e os 6 cron jobs de infraestrutura.
2. **O ambiente não é reconstruível a partir do repositório.** Dos 30 versionamentos registrados em
   `supabase_migrations.schema_migrations`, **nenhum** corresponde a algum dos 641 arquivos de migration
   do repo. Existem 20 tabelas `dp_*` vivas — **com dado real** — sem uma única menção em todo o repositório.
3. **O CI está vermelho em `main` desde 11/08/2026** e o commit que o quebrou foi mergeado *com o check
   vermelho*, violando um invariante escrito no próprio `CLAUDE.md`.

O sistema não está pronto para operar folha de pagamento. Os dois motores de cálculo divergem por
ano-base inteiro, as integrações governamentais e bancárias são todas simuladas, e não há um único
bucket de storage em produção — o que quebra toda geração e upload de documento.

---

## 2. Placar honesto por classificação

### Páginas (109 arquivos em `src/pages/`, 100% classificados)

| Classificação | Qtd | % |
|---|---:|---:|
| ✅ IMPLEMENTADO_TOTAL | **0** | 0% |
| 🟨 IMPLEMENTADO_PARCIAL | 71 | 65,7% |
| 🟦 SUGERIDO_OU_INICIADO | 33 | 30,6% |
| ⬛ MORTO_OU_ABANDONADO | 4 | 3,7% |
| — | **108 de 109** | 1 página não conciliada |

> **Discrepância declarada:** o lote D–M informa 34 páginas mas suas classificações somam 33.
> Os três lotes somam **108 classificações para 109 arquivos**. Não inventei a 109ª para fechar a
> conta — o denominador honesto é 108 classificadas de 109 existentes.

> ⚠️ **Correção aplicada na consolidação — ver §6.** Os lotes de páginas A–C e N–Z classificaram
> 15 páginas como `IMPLEMENTADO_TOTAL`. O lote D–M provou que o dado do banco é seed, não uso real.
> Reclassifiquei as 15 para `IMPLEMENTADO_PARCIAL`, aplicando a regra de ouro uniformemente.
> Números originais preservados nos documentos de detalhe.

### Demais dimensões

| Dimensão | Medido | Observação |
|---|---|---|
| Rotas | 113 `<Route>` / 110 `path=` | 3 páginas importadas **sem rota** → 404 |
| Rotas admin | 23 (21%) | **Inacessíveis hoje**: gate de MFA com `auth.mfa_factors = 0` |
| Edge Functions | 61 (60 auditadas) | **21 sem chamador algum (35%)** |
| Tabelas `public` | 359 | **247 vazias (68,8%)**, 112 com dado |
| Views | 43 | **42 sem `security_invoker`**, 43 concedem SELECT a `anon` |
| Policies | 599 | **55 são `USING (true)`** |
| Migrations | 641 arquivos | **30 registradas, interseção 0** |
| Cron jobs | 6 ativos, 112 execuções, 100% sucesso | 1 deles é `UPDATE` no-op que infla a métrica |
| Arquivos de teste | 497 | Cobertura real comprometida — ver §4 |
| Integrações levantadas | 33 | **10 com HTTP real**; gov/bancárias 100% simuladas |

---

## 3. Riscos estruturais, por gravidade

### 🔴 R1 — Bypass de RLS por views expostas ao papel `anon`
**Verificado por mim no banco vivo.** 42 das 43 views de `public` não têm `security_invoker`, pertencem
a `postgres` (`rolbypassrls = true`) e **as 43 concedem SELECT a `anon`**. Isso inclui
`vw_colaboradores_completo`, `v_audit_trail` e `vw_folha_compliance`. Uma view sem `security_invoker`
executa com os privilégios do dono, ignorando as policies das tabelas-base — anulando na prática a RLS
que está corretamente habilitada nas 359 tabelas.

*Nuance:* a exploração depende de o endpoint PostgREST estar publicamente alcançável com a chave `anon`.
Não testei isso (seria acesso ofensivo a produção). O fato no nível do banco é certo; o alcance, não.

**O repositório já contém a correção** — 91 ocorrências de `security_invoker = true` e 37 arquivos com
`REVOKE … FROM anon` — e ela nunca chegou ao banco. É o R2 se manifestando.

### 🔴 R2 — Ambiente não reconstruível a partir do repositório
- 641 arquivos de migration ⨯ 30 versões registradas, **interseção zero**.
- 56 tabelas declaradas no repo **não existem** no banco (inclui as 5 `pcs_*` que o código consulta em runtime).
- 20 tabelas `dp_*` vivas, **com dado real** (`dp_audit_log_2026_07`=59, `dp_mcp_config`=39), com
  **zero menções** em `src/`, `supabase/functions/` e nas 641 migrations. Sumiriam num rebuild.
- 13 matviews declaradas, 0 vivas. 17 cron declarados ⨯ 6 vivos, interseção 0.
- **Causa raiz provável:** `supabase/config.toml:1` aponta para `ciziytrrjjotlsjzshnm` — **outro projeto**.

### 🔴 R3 — Cálculo de folha com dois motores divergentes
| Constante | Front (`src/calculators/tabelas.ts`) | Edge (`calcular-folha/index.ts`) |
|---|---|---|
| Teto INSS | `8475.55` (:12) | `8157.41` (:34) |
| 1ª faixa INSS | `1621.00` (:6) | `1518.00` (:19) |

Ambos calculam folha na mesma tela, com tabelas de anos-base diferentes, sem fonte da verdade.
O mesmo arquivo declara `SALARIO_MINIMO_2026 = 1621.00` (:3) e comenta seguro-desemprego com
*"base SM R$1.518,00"* (:46) — contradição interna provável sem consultar fonte externa.

`FAIXAS_IRRF_2026` (1ª faixa `2259.20`, dedução simplificada `564.80`) é idêntica nos dois motores e
corresponde à tabela vigente desde fev/2024. **Divergência a confirmar contra a tabela oficial de 2026** —
não afirmo aqui o valor correto, que não tive como verificar.

### 🔴 R4 — 15 RPCs chamadas pelo frontend retornam 403 por construção
`src/integrations/supabase/client.ts:391` exporta `supabase` como um Proxy que roteia **todo** `.rpc()`
para o bridge, incondicionalmente. O bridge nega com 403 tudo que não está na `RPC_ALLOWLIST`
(`index.ts:760`). `registrar_batida_ponto` aparece **0 vezes** em `validation.ts`.

**Consequência medida:** `batidas_ponto` = **0 linhas**, enquanto a RPC viva
`registrar_batida_ponto` insere justamente nela. O caminho de registro de ponto nunca foi exercido.
Também fora da allowlist: `log_frontend_error` (perde 100% dos erros de front), as 8 RPCs de Medidas
Disciplinares e as 4 do PCS.

### 🟠 R5 — Zero buckets de storage em produção
`storage.buckets = 0`, `storage.objects = 0`. Quebram: upload de documentos, comprovantes de despesa,
anexos de contabilidade, contratos, PDFs gerados, OCR, backup. O `CLAUDE.md` afirma ter criado o bucket
`ferias-avisos` — não existe.

### 🟠 R6 — Split-brain de benefícios: 74 registros reais invisíveis
`beneficios_colaboradores` = **74 linhas** (2ª maior tabela de negócio) aparece **6 vezes, todas em
`types.ts` gerado**, e **nenhuma** em código de aplicação. Todo o caminho — hook, 3 services e a edge
`gerar-holerite` — lê `beneficios_colaborador` (singular) = **0 linhas**. A folha calcula benefícios como zero.

### 🟠 R7 — CI vermelho e sem proteção
- `package.json:135` fixa `typescript 7.0.2`; `typescript-eslint 8.66.0` exige `>=4.8.4 <6.1.0`
  (verificado no lockfile). O `CLAUDE.md:8` **proíbe explicitamente** esse bump.
- O run do PR #35 falhou e o PR **foi mergeado assim mesmo**; o push seguinte em `main` também falhou.
  `main` está vermelha há 5 dias. Isso prova, por comportamento, que **não há branch protection**.
- Os 7 gates de RLS/SECDEF dependem de `SUPABASE_DB_URL`, que não existe: executam em ~1 segundo,
  não verificam nada e **passam verdes**.
- `deno check` das Edge Functions é `continue-on-error: true` (`ci.yml:81`).
- CodeQL nunca gerou alerta (*"Code scanning is not enabled"*); `npm audit` é anulado por `|| true`.

### 🟠 R8 — 23 rotas administrativas inacessíveis
`AdminRoute.tsx` exige AAL2; sem fator cadastrado o estado cai em `'missing'` e bloqueia. Produção tem
`auth.mfa_factors = 0` para 5 usuários. **O guard está correto** — é fail-closed por desenho.
A correção é cadastrar MFA, **não** remover o gate. Um "conserto" ingênuo aqui abriria toda a superfície admin.

### 🟡 R9 — Dado fictício exibido como fato ao usuário
Amostra verificada: `SSTPage.tsx:129` — o botão "Registrar Incidente" executa apenas
`toast.success('Incidente registrado!')`; não há `insert` nem menção a `sst_incidentes` no arquivo.
Um acidente de trabalho reportado **desaparece com mensagem de sucesso**.
`PontoKioskPage.tsx:79-84` anuncia *"Identidade confirmada"* via `setTimeout(3500)` sem chamar
`validarBiometria` — que existe e é usada corretamente em `usePonto.ts:52`.
Outros: protocolo eSocial via `Math.random()` (`contratacaoService.ts:193`), conciliação de premiações que
compara um valor consigo mesmo, WhatsApp que grava `status:'sent'` sem nenhum `fetch`, "IA" com texto hardcoded.

### 🟡 R10 — Testes que não protegem
Testes-espelho que reimplementam a lógica em vez de importá-la; `rpc-permissions.test.ts:22-23` desliga
as checagens anti-DoS quando `isCI`; 13 testes Deno em `supabase/` (incluindo 283 linhas anti-SQL-injection
do bridge) **sem runner algum**; 2 specs E2E fora de todos os `testMatch`; 8 `vi.mock` com caminho
irresolvível. Nos 30 runs recentes: **0 sucessos** (23 failure, 7 cancelled) — nenhum E2E jamais rodou.

---

## 4. Situação das integrações

33 integrações levantadas. Resumo por veredito:

| Situação | Integrações |
|---|---|
| ✅ **HTTP real confirmado** | gov.br SSO, Bitrix24, BrasilAPI (CNPJ), ViaCEP, Lovable AI/OCR/biometria, Resend, Slack, Metabase, Sentry |
| 🟨 **Em produção com uso comprovado** | Apenas `external-db-bridge` (`query_telemetry` = 265 registros) |
| 🟦 **Simuladas — sem uma única chamada HTTP** | eSocial, FGTS Digital, DCTFWeb, PIX em lote, CNAB (240 e 400), Guias de impostos |
| 🟦 **Fachada** | WhatsApp/Evolution — grava log `status:'sent'` com `setTimeout(1000)` simulando latência |
| ⬛ **Inexistentes** (0 ocorrências) | CAGED, RAIS, Telegram, Stripe, SMTP próprio |
| ⬛ **Morta** | Domínio/Alterdata — tem `fetch`, zero consumidores |

Pontos críticos: o assinador eSocial gera `assinaturaMock` / `CERTIFICADO_MOCK` (`utils/signer.ts:17,36,41`) —
**nenhum XML é assinado**. `cnab-remessa` não gera arquivo CNAB. Protocolos são `Date.now()`.

**PWA:** ativo no build, mas os 7 ícones PNG do manifest estão ausentes de `public/`; há 3 manifestos concorrentes.
**Capacitor (mobile):** esqueleto — `@capacitor` não aparece no `package.json`, sem `android/`/`ios/`, sem CI.
**Infra declarada** (`k8s`, `helm`, `terraform`, `ansible`): 20 de 21 arquivos são placeholder;
`terraform/backend.tf` contém YAML, não HCL.

---

## 5. O que está bom

Não distorço o quadro para parecer rigoroso. É genuinamente sólido:

- **RLS habilitada em 359/359 tabelas.** A base de segurança foi construída com disciplina. O problema
  são as views que a contornam — corrigível sem tocar nas policies.
- **`external-db-bridge` é um gateway sério e real:** allowlist de 32 RPCs, denylist de tabelas,
  validação de `ORDER BY`, rate limiting, cap de payload, telemetria com severidade. Os controles que o
  `CLAUDE.md` alega **existem de fato** no código (a contagem é que estava errada: 32, não 25).
- **Os 6 cron jobs funcionam:** 112 execuções, 100% de sucesso, última hoje. Retenção, particionamento e
  rotação de log rodando de verdade.
- **Guards de rota fail-closed** no caminho administrativo, com MFA obrigatório e desafio TOTP por sessão.
- **Volume de teste existe** (497 arquivos) — o problema é o que eles asseguram, não a falta deles.
- **A biometria do ponto principal foi corrigida** e o código documenta honestamente a decisão de não
  bloquear a marcação por falha biométrica (risco trabalhista) — engenharia madura.

---

## 6. Correções feitas durante esta auditoria

Registro em voz alta o que precisei corrigir, inclusive em mim mesmo:

| # | Afirmação inicial | Correção | Origem |
|---|---|---|---|
| 1 | "331 tabelas vazias" | **247** (68,8%). Usei `reltuples`, que vale `-1` para tabelas nunca analisadas. Contagem exata refeita. | **Minha** |
| 2 | 15 páginas `IMPLEMENTADO_TOTAL` | Reclassificadas para `PARCIAL`: o dado do banco é seed. Dois lotes não aplicaram a regra de ouro; o terceiro aplicou. | Lotes 01/03 |
| 3 | "`beneficios_colaboradores` tem 0 ocorrências no repo" | Aparece **6 vezes, todas em `types.ts` gerado**; nenhuma em código de aplicação. | Lote 04 |
| 4 | "constraint `batidas_ponto_colaborador_id_fkey` não existe" | **Existe** — em `batidas_ponto`, não em `registros_ponto`. O achado procede (o hint quebra no PostgREST), a formulação não. | Lote 07 |
| 5 | "43 policies `USING (true)`" | **55**, medido por mim. | Lote 09 |
| 6 | "15 tabelas `dp_*`" | **20**, medido por mim. | Lote 09 |
| 7 | "171 de 265 requisições falharam" | `query_telemetry` só grava `error`/`slow`/`very_slow`. São 171 erros **entre anomalias registradas**, não entre todas as requisições. | Lote 08 |

**Recontagem de cobertura:** extraí os 207 caminhos de arquivo citados como prova em todos os lotes e
comparei com a árvore real. **206 existem.** A única exceção (`supabase/types.ts`) é erro de digitação
para `src/integrations/supabase/types.ts`. Nenhum lote fabricou evidência.

**Documentação canônica derrubada:** `docs/LEVANTAMENTO_FUNCIONALIDADES.md` descreve React 18.3 / Vite 5.4 /
TS 5.8 / Tailwind 3.4 — o `package.json` tem React 19.2 / Vite 8.2 / Tailwind 4.3. `ROADMAP.md` lista PWA e
integrações como "próximas versões (V16–V18)" num repo já na 18.0.1. `CLAUDE.md` erra a contagem da
allowlist e afirma um bucket que não existe. **Nenhum desses arquivos serve como fonte.**

---

## 7. O que esta auditoria NÃO cobriu

Declarado, não escondido:

- **Quais Edge Functions estão deployadas.** A Management API exige um PAT que não está disponível.
  Todo o capítulo de Edge Functions é análise de código-fonte: `NAO_VERIFICADO` quanto a deploy.
  **Também não posso garantir que o bridge deployado é igual ao do repositório.**
- **Execução de build, typecheck, lint e testes.** `node_modules` está ausente. Nenhuma afirmação
  deste documento diz que algo compila ou que teste passa. As conclusões sobre CI vêm dos logs reais
  do GitHub Actions, não de execução minha.
- **Comportamento em navegador.** Nada foi validado via UI real.
- **Exploração do bypass de RLS.** Constatei o fato no banco; não testei alcance externo, o que seria
  acesso ofensivo a produção.
- **Conteúdo semântico das 599 policies.** Contei e classifiquei as `USING (true)`; não li uma a uma.
- **`src/components/ui/`** (58 primitivos shadcn) e os 224 arquivos em `components/__tests__/`
  ficaram fora do escopo de classificação funcional.
- **Origem das linhas em tabelas cujo caminho de escrita provei estar quebrado.** Sei que não vieram
  pelo app; não rastreei por onde entraram.

---

## 8. Próximos passos

### Barato e seguro — posso executar sozinho
1. **Alinhar `typescript` para `6.0.3`** e devolver o CI ao verde. É reverter um bump que já estava
   documentado como proibido. Desbloqueia todo o resto.
2. **Corrigir o split-brain de benefícios**: apontar código para `beneficios_colaboradores`, onde estão
   os 74 registros reais. Mudança de nome de tabela em 7 arquivos.
3. **Acrescentar as RPCs faltantes à `RPC_ALLOWLIST`** (a começar por `registrar_batida_ponto` e
   `log_frontend_error`) — destrava ponto e observabilidade de erros.
4. **Remover ou rotear as 3 páginas órfãs** e o link morto para `/faltas` no dashboard.
5. **Substituir os handlers que só emitem `toast` por persistência real** — prioridade absoluta para
   `SSTPage.tsx:129` (registro de acidente de trabalho) pelo risco legal.
6. **Corrigir `supabase/config.toml`** para o projeto correto.
7. **Unificar as tabelas de INSS/IRRF** numa única fonte importada pelos dois motores.

### Toca produção — é decisão sua
8. **Aplicar `security_invoker` e `REVOKE … FROM anon` nas 42 views.** A correção já existe no repo.
   É a maior redução de risco disponível, e é DDL em produção.
9. **Cadastrar MFA para os administradores** — destrava 23 rotas sem enfraquecer o guard.
10. **Criar os buckets de storage.** Sem isso, nenhum documento trafega.
11. **Reconciliar o ledger de migrations.** Decidir entre adotar o banco como fonte da verdade
    (gerar baseline a partir dele) ou reconstruir. Enquanto não decidir, o repositório não descreve o sistema.
12. **Ligar branch protection** em `main` exigindo CI verde.

### Decisão de produto, não de engenharia
13. **eSocial, FGTS Digital, DCTFWeb, PIX e CNAB são simulações.** Nenhuma transmite nada. Definir se
    entram no escopo real — hoje o sistema não cumpre obrigação acessória alguma, apesar da UI sugerir que sim.

---

## 9. Documentos de detalhe

As tabelas de evidência por dimensão estão em [`docs/auditoria/estado/`](./docs/auditoria/estado/):

| # | Documento | Escopo |
|---|---|---|
| 01 | [Rotas e páginas A–C](./docs/auditoria/estado/01-rotas-e-paginas-A-C.md) | mapa completo das 110 rotas + 43 páginas |
| 02 | [Páginas D–M](./docs/auditoria/estado/02-paginas-D-M.md) | 34 páginas |
| 03 | [Páginas N–Z](./docs/auditoria/estado/03-paginas-N-Z.md) | 32 páginas |
| 04 | [Services a–f](./docs/auditoria/estado/04-services-a-f.md) | 44 services |
| 05 | [Services g–z](./docs/auditoria/estado/05-services-g-z.md) | 40 services |
| 06 | [Hooks e contextos](./docs/auditoria/estado/06-hooks-e-contextos.md) | 180 hooks, providers |
| 07 | [Componentes](./docs/auditoria/estado/07-componentes.md) | 272 arquivos / 43 domínios |
| 08 | [Edge Functions](./docs/auditoria/estado/08-edge-functions.md) | 60 funções |
| 09 | [Dados e migrations](./docs/auditoria/estado/09-dados-e-migrations.md) | drift repo ⨯ banco |
| 10 | [Infra, CI e testes](./docs/auditoria/estado/10-infra-ci-testes.md) | 5 workflows, 497 testes |
| 11 | [Integrações e cálculo](./docs/auditoria/estado/11-integracoes-e-calculo.md) | 33 integrações, motores fiscais |

---

## 10. Critério de pronto desta auditoria

- [x] 898 arquivos-fonte inventariados — verificado por recontagem, não por auto-relato
- [x] Toda funcionalidade classificada em uma das 4 categorias, com evidência `arquivo:linha`
      — exceto 1 página não conciliada, declarada em §2
- [x] Achados graves verificados de forma independente pelo coordenador contra o banco vivo
- [x] Itens de runtime marcados `VERIFICADO` ou `NAO_VERIFICADO`, sem meio-termo
- [x] Lacunas declaradas no próprio documento (§7)
- [x] 7 correções registradas em voz alta (§6), sem apagar os originais
- [x] **Nada foi alterado em produção** — zero DDL, zero DML, zero deploy

---

*Auditoria conduzida em 16/08/2026. Produção acessada exclusivamente em modo leitura.*
