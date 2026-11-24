# 🔑 ENVIRONMENT.md

## Variáveis de Ambiente

### Obrigatórias
```env
VITE_API_URL=https://api.empresa.com
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### Opcionais
```env
VITE_SENTRY_DSN=https://xxx@sentry.io
VITE_GA_ID=G-XXXXXXXXXX
VITE_BITRIX_WEBHOOK=https://empresa.bitrix24.com.br/rest/...
```

### Produção
```env
NODE_ENV=production
VITE_ENABLE_DEVTOOLS=false
```

### Mocks de demonstração (somente DEV)

Cada área do sistema tem a **sua própria** flag. Todas obedecem ao mesmo gate:
`import.meta.env.DEV === true` **e** `MODE !== 'test'` **e** a flag `= 'true'`.
Logo, nunca ligam em produção nem no Vitest. Sem a linha no `.env` / `.env.local`
a área mostra apenas os dados reais do Supabase.

```env
VITE_LAYOUT_MOCK=true            # Tempo & Ausências (Ponto, Horas Extras, Banco de Horas,
                                 # Turnos & Escalas, Férias, Afastamentos, Feriados, Controle de Acesso)
VITE_COLABORADORES_MOCK=true     # Colaboradores + todas as abas do dossiê
VITE_DASHBOARD_MOCK=true         # Dashboard (KPIs, timeline, briefing, status do sistema)
VITE_ADMISSOES_MOCK=true         # Admissões / Onboarding / Jornada
VITE_DESLIGAMENTOS_MOCK=true     # Desligamentos + trilha de auditoria
VITE_AUDITORIA_MOCK=true         # Auditoria
VITE_DESEMPENHO_MOCK=true        # Gestão de Desempenho (Ciclos, Metas, Feedbacks, PDI,
                                 # Nine-Box, Auditoria do módulo)
VITE_PESQUISAS_MOCK=true         # Pesquisas de Clima
VITE_PREMIACOES_MOCK=true        # Premiações
VITE_RECRUTAMENTO_MOCK=true      # Recrutamento & Seleção
VITE_TREINAMENTOS_MOCK=true      # Treinamentos
VITE_CALCULADORA_MOCK=true       # Calculadora de Rescisão
VITE_PONTO_MOCK=true             # Controle de Ponto: série demonstrativa SÓ do gráfico
                                 # "Fluxo de Entradas por Horário" (Gestão da Equipe → Visão Geral).
                                 # Não alimenta indicador, KPI nem gravação — o resto do painel
                                 # continua 100% nos registros (src/mocks/pontoFluxoMock.ts).
VITE_GESTAO_MOCK=true            # Demais áreas operacionais (ver detalhamento abaixo)
# VITE_NINEBOX_MODO_REAL=true    # desliga a vitrine do Desempenho e usa o banco
```

#### `VITE_GESTAO_MOCK` — áreas operacionais sem mock dedicado

Uma única flag cobre as telas que antes não tinham fonte fictícia. A diferença
em relação às flags acima é que ela atua **por rota** (`ROTAS_GESTAO_MOCK` em
`src/mocks/gestaoMock/gate.ts`): só dentro dessas rotas as leituras do PostgREST
são respondidas em memória; nas demais o cliente Supabase é usado como sempre.

| Grupo | Rotas cobertas |
|---|---|
| Passivo | `/passivo-trabalhista` |
| Folha | `/folha` (inclui `/folha/calcular` e `/folha/compliance`), `/holerites`, `/provisoes`, `/rubricas` |
| Remuneração | `/beneficios`, `/descontos`, `/despesas`, `/vales`, `/financeiro-bancario`, `/contabilidade` (inclui `/contabilidade/canal`) |
| Estrutura | `/cargos` (inclui `/cargos-salarios`), `/departamentos`, `/centros-custo`, `/locais-trabalho`, `/lotacoes`, `/times`, `/jornadas` |
| Documentos & Compliance | `/documentos`, `/gerador-documentos`, `/assinaturas`, `/contratos-gerados`, `/esocial`, `/obrigacoes-fiscais`, `/lgpd`, `/seguranca` |
| SST | `/sst`, `/admin/sst/*`, `/epis`, `/exames`, `/convenios`, `/planos-saude`, `/seguros-vida` |
| Outros | `/relatorios`, `/movimentacoes`, `/medidas-disciplinares`, `/pensoes`, `/sindicatos`, `/faltas`, `/comunicacao-interna`, `/notificacoes`, `/promo-brindes` (inclui `/promo-brindes/vinculos`), `/canal-etica` |

O dataset (`src/mocks/gestaoMock/dados.ts`) parte dos mesmos 13 colaboradores e
da mesma empresa fictícia dos outros mocks, então os números fecham entre as
telas: Folha → Holerites → Provisões → Passivo Trabalhista, eSocial e
contabilidade usam a mesma folha e o mesmo salário base.

Ficam **fora** de propósito (continuam 100% reais): sessão/permissões
(`get_user_roles`), `empresas`, `user_*`, `profiles`, `security_alerts`,
`/empresas`, `/usuarios`, `/configuracoes`, `/admin/*` (exceto `/admin/sst`),
`/importacao`, `/integracoes`, `/workflows`, `/portal`, `/perfil`, e todas as
áreas que já têm flag própria (Desempenho, Colaboradores, Admissões,
Desligamentos, Recrutamento, Treinamentos, Premiações, Pesquisas, Auditoria,
Calculadora, Dashboard e Tempo & Ausências).

Para desligar só essas áreas: `VITE_GESTAO_MOCK=false` + reiniciar o `vite dev`.
O esquema usado pelo gerador sai de `src/integrations/supabase/types.ts`; para
regenerá-lo depois de uma migration, rode `node scripts/gerar-esquema-mock.mjs`.


Exceções (não usam env var): `src/mocks/feriasPeriodosAquisitivosMock.ts` tem a
constante interna `ATIVAR_MOCK`; `src/components/avaliacao/pdiProgressoMock.ts`
idem (`MOCK_PROGRESSO_PDI_ATIVO`). Ambas já vêm ligadas em DEV.

> Os mocks cobrem **leitura**. Escritas nas áreas mockadas são bloqueadas com o
> aviso "Modo demonstração" (ver o cabeçalho de cada arquivo em `src/mocks/`).
> Para ver a vitrine, rode **`npm run dev`** — em `vite preview`/build de
> produção `import.meta.env.DEV` é `false` e os mocks ficam inertes.
