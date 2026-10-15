# Nine-Box · Proposta localizada dos controles de feedback (aguardando aprovação)

Documento de **aprovação visual**. Nada aqui foi renderizado: o
`FeedbackDetalheDialog` segue exatamente como está no design aprovado. As
decisões que a interface precisa (quais ações existem, quais podem ser
oferecidas, qual a situação do Potencial) já estão implementadas em
`src/components/avaliacao/acoesFeedback.ts` e testadas.

## 1. Estado atual

| Camada | Situação |
|---|---|
| Decisão pura (transições, motivo, situação de Potencial) | **pronta** (`statusFeedback.ts`, `acoesFeedback.ts`) |
| Serviço (RPC transacional) | **pronto** (`finalizarFeedback`, `validarPotencialAvaliacao`, `listarValidacoesPotencial`, `listarVersoesAvaliacao`) |
| Interface | **não alterada** — aguardando esta aprovação |

## 2. Onde os controles entrariam (local exato)

`src/components/avaliacao/FeedbackDetalheDialog.tsx`, **abaixo** do bloco
`{onFiltrarAvaliado && (...)}` que já existe (linha ~177) e **antes** de
`</DialogContent>`:

```
┌─ DialogContent (max-w-2xl) ──────────────────────────────┐
│ cabeçalho (avatar, nome, tipo, nota, faixa)              │
│ grade "Avaliado por" + "Datas"                           │
│ blocos Pontos fortes / melhoria / Comentários            │
│ [Ver só deste colaborador]              ← linha atual    │
│ ── separator (border-t border-border/50) ──              │  ← NOVO
│ situação do Potencial (badge)                            │  ← NOVO
│ [Concluir] [Cancelar] [Reabrir] [Validar Potencial]      │  ← NOVO
└──────────────────────────────────────────────────────────┘
```

- Reaproveitamento **estrito** do Design System: `Separator`, `Badge`,
  `Button` (`variant="outline"` / `"destructive"` / `"default"`, `size="sm"`,
  `className="h-8 gap-1.5 text-xs"` — a MESMA pele de "Ver só deste
  colaborador"), `Dialog`, `Textarea` + `Label` do formulário existente e os
  toasts `sonner` já usados na página.
- Ícones: `CheckCircle2`, `Ban`, `RotateCcw`, `ShieldCheck` (mesma família
  lucide já importada no arquivo).

## 3. Comportamento proposto por controle

| Controle | Quando aparece | O que faz | Motivo obrigatório |
|---|---|---|---|
| **Concluir** | `acoesDisponiveis(...)` com `disponivel: true` (transição `pendente→concluido`) | RPC `finalizar_feedback` com `acao: "concluir"` | não |
| **Cancelar** | `pendente→cancelado` | RPC `finalizar_feedback` com `acao: "cancelar"` | **sim** (textarea "Motivo do cancelamento") |
| **Reabrir** | `concluido/cancelado→pendente` | RPC `finalizar_feedback` com `acao: "reabrir"` | **sim** (textarea "Justificativa da reabertura") |
| **Validar Potencial** | somente papel **`rh`** (`podeValidarPotencial`) | RPC `validar_potencial_avaliacao` (+ observação opcional) | não |

Regras de comportamento (todas já válidas na camada pura):

1. `concluido → cancelado` **não existe**: cancelar exige reabrir primeiro (o
   botão "Cancelar" aparece desabilitado com o motivo real no `title`).
2. Controles indisponíveis ficam **desabilitados com o motivo** — nunca
   escondidos silenciosamente (o operador precisa saber por quê).
3. O motivo é validado **antes** de enviar; erro do servidor aparece como toast
   com a mensagem REAL (nunca sucesso falso).
4. Durante a chamada, os botões entram em `disabled` + "Salvando…" (mesmo padrão
   dos demais diálogos do módulo).
5. Sucesso → `invalidateQueries(['feedbacks_360'])` + fechar o diálogo.
6. **Idempotência**: chave gerada uma vez por tentativa
   (`criarChaveIdempotente`) e reaproveitada em reenvio; nova só após sucesso ou
   mudança de ação/motivo.
7. Toda ação é oferecida **apenas quando o modo real está ligado**
   (`modoRealAtivo()`); com a flag desligada a linha nova **não é renderizada** e
   o diálogo é idêntico ao design aprovado.

## 4. Situação do Potencial (badge)

Vem de `situacaoPotencial(validacaoVigente, versaoAtual)` — a versão canônica
vem do BANCO (`listarVersoesAvaliacao`):

| Situação | Texto do badge | Tom sugerido |
|---|---|---|
| `sem_validacao` | "Potencial sem validação do RH" | neutro (`text-muted-foreground`) |
| `validada` | "Potencial validado pelo RH" | sucesso (`text-success`) |
| `desatualizada` | "Potencial alterado após a validação" | atenção (`text-warning`) |

O status do feedback usa `rotuloStatus()` (Pendente / Concluída / Cancelada) no
mesmo badge cinza já usado para o tipo de feedback.

## 5. O que NÃO muda

- matriz, quadrantes, KPIs, Insights, coluna lateral e animações;
- o bloco "Ver só deste colaborador" e todo o conteúdo atual do diálogo;
- `NovoFeedbackDialog` (formulário, campos, validações e mensagens);
- mocks de demonstração e `MOCK_NINEBOX_COMPARAR_INICIAL`.

## 6. Aprovação e implementação — CONCLUÍDA

A proposta foi aprovada e implementada **exatamente** neste local, sem mudar
dimensões, cores, tipografia ou estrutura do restante do modal:

| Item | Como ficou |
|---|---|
| Local | rodapé do `FeedbackDetalheDialog`, **depois** de "Ver só deste colaborador": um `Separator` + linha de ações (`flex-wrap justify-end gap-2`) |
| Concluir | `Button` padrão, `h-8 text-xs`, ícone `CheckCircle2`; desabilitado com motivo quando falta dado mínimo (`validarConclusao`) |
| Cancelar | abre diálogo com `Textarea` (**motivo ≥ 3 caracteres**) e botões "Cancelar" / "Confirmar cancelamento"; **nunca DELETE** |
| Reabrir | mesmo diálogo (**justificativa ≥ 10 caracteres**) e botão "Confirmar reabertura" |
| Validar Potencial | `Button` outline com `ShieldCheck`, visível **só para RH**, em avaliação do **gestor**, **concluída**, com **Potencial na escala** e validação ausente/desatualizada |
| Situação do Potencial | selo discreto (`span` com a pele dos badges, `h-6`, ícone `ShieldCheck`): **"Aguardando validação"** · **"Validado pelo RH"** · **"Validação desatualizada"** — exibido a quem consulta o dado (RH) |
| Demonstração | o bloco devolve `null`: nada renderiza, nada consulta, nada grava (mocks preservados) |
| Segurança | idempotência por operação (mesma tentativa ⇒ mesma chave), controles desabilitados durante a RPC, erros reais no toast, sucesso só depois da resposta do servidor, cache invalidado após sucesso |

Arquivos: `src/components/avaliacao/FeedbackAcoesRodape.tsx` (novo) + a linha de
montagem em `src/components/avaliacao/FeedbackDetalheDialog.tsx`.
Testes: `src/components/__tests__/FeedbackAcoesRodape.test.tsx` (25 casos).

> O bloco só aparece com `NINEBOX_MODO_REAL_ATIVO = true`. Com a flag desligada
> (padrão) o modal é byte a byte o de hoje — e é por isso que a conferência
> visual no navegador depende da homologação (ver `docs/ninebox-homologacao.md`).


---

# Anexo · Testes de concorrência entre sessões (dependem de banco real)

Só podem ser executados na homologação, com o banco acessível. Duas sessões
independentes (`psql` distintos, transações separadas — **não** `BEGIN`
aninhado, que não caracteriza concorrência real).

### C1 · Duas criações simultâneas com a MESMA chave de idempotência

```
-- SESSÃO A                                   -- SESSÃO B (em paralelo)
set role authenticated;                       set role authenticated;
select public.criar_feedback_seguro(           select public.criar_feedback_seguro(
  :empresa, :avaliado, :ciclo, 'gestor',         :empresa, :avaliado, :ciclo, 'gestor',
  4.5, 4, :avaliador, null, null, null,          4.5, 4, :avaliador, null, null, null,
  'op-conc-1');                                  'op-conc-1');
```
**Esperado:** exatamente **1** linha nova em `feedbacks_360`; a segunda resposta
com `idempotente = true`; 1 linha em `feedbacks_360_operacoes`. Sem erro de
chave duplicada exposto ao usuário (a proteção é `ON CONFLICT`/lock no servidor).

### C2 · Concluir × Cancelar na mesma avaliação

```
-- SESSÃO A                                   -- SESSÃO B
select public.finalizar_feedback(              select public.finalizar_feedback(
  :feedback, 'concluir', null, 'op-c1');          :feedback, 'cancelar', 'motivo', 'op-c2');
```
**Esperado:** uma das duas vence; a perdedora falha com erro de transição (ou
encontra o status já alterado) e **não** grava auditoria órfã. Estado final
consistente com **uma** linha de auditoria.

### C3 · Validar Potencial × Reabrir

**Esperado:** a validação gravada nunca se refere a uma versão inexistente — se
a reabertura vencer, a validação fica `desatualizada` (versão divergente) e a
interface mostra isso, não "validado".

### C4 · Validação de Potencial com dois usuários `rh`

**Esperado:** no máximo **uma** validação vigente por versão de avaliação; a
segunda grava histórico (nova versão) ou é idempotente — nunca sobrescreve a
primeira sem rastro.

### C5 · Criação sob bloqueio (nenhuma gravação em caso de recusa)

```
set role authenticated;   -- usuário SEM papel admin/rh
select public.criar_feedback_seguro(...);                        -- esperado: erro de autorização
select count(*) from public.feedbacks_360 where id = ...;         -- esperado: 0
select count(*) from public.audit_log where ...;                  -- esperado: 0
```

### C6 · Isolamento de empresa sob concorrência

Usuário da empresa A dispara `criar_feedback_seguro` com `p_empresa_id` da
empresa B. **Esperado:** erro de autorização/empresa, zero linhas gravadas em
qualquer uma das empresas.

