# Homologação — cancelamento de feedback REAL

> Objetivo: cancelar um feedback **UUID real** com justificativa, sem tocar em
> mocks, no motor Nine-Box, nas regras de aprovação ou no layout aprovado.

## 1. Origem atual na interface

O módulo é **misto**: exibe fixtures (`mock-*`), registros criados na vitrine
(`demo-*`) e registros reais (`UUID`) quando a empresa ativa tem dados no
Supabase. A origem é decidida **por registro**, nunca pela flag global.

| Identificador | Origem |
| --- | --- |
| UUID (`6a606a8a-…`, por exemplo) | **REAL** — `public.feedbacks_360` |
| `mock-*` | **DEMONSTRAÇÃO** — fixture aprovada |
| `demo-*` | **DEMONSTRAÇÃO** — criado no navegador |

O ambiente local atual (`.env.local`) está com
`VITE_DESEMPENHO_MOCK=true` e `VITE_NINEBOX_MODO_REAL=false`. Nessa combinação a
vitrine aparece e a sessão `admin@teste.local` (empresa E2E) **não tem feedback
real**; por isso o painel mostra apenas DEMONSTRAÇÃO. Para homologar, use a
conta/empresa que possui os UUIDs reais.

## 2. Identificação visual temporária

Foi adicionado o painel **HOMOLOGAÇÃO · ORIGEM**, fora dos cards e sem alterar o
layout aprovado. Ele só existe quando:

```env
VITE_HOMOLOG_ORIGEM=true
```

no `.env.local` **local**. Depois de reiniciar o `vite dev`, ao abrir
**Feedbacks** o painel fica no canto inferior direito e mostra, para o ciclo
selecionado:

- selo **REAL** ou **DEMONSTRAÇÃO**;
- status (`PENDENTE`, `CONCLUÍDO`, `CANCELADO`);
- colaborador, tipo e ciclo;
- UUID (com botão **copiar**).

O painel não consulta nem grava nada; usa a lista que a tela já carregou.
Remova a variável (ou defina `false`) ao terminar a homologação.

## 3. Feedback real pendente

Inventário autenticado da empresa `66104399-aba8-4105-bbd3-9bf67820c1d0`
(TIME PROMO), registrado em `tmp-recuperacao-feedbacks/feedbacks_360.json` e na
documentação de recuperação:

| UUID | Ciclo | Colaborador | Status |
| --- | --- | --- | --- |
| `6a606a8a-3019-4a41-aebb-903b190b2958` | `HOMOLOG-NB Ciclo Nine-Box` | Camila Pereira Dias | **PENDENTE** |
| `38a18cbe-ecbb-4ea0-8240-06141d73aff0` | `HOMOLOG-NB Ciclo Nine-Box` | Bruno Henrique Alves | PENDENTE |
| `0f43fc81-9969-4621-878d-dd6ded0f8554` | `HOMOLOG-NB Ciclo Nine-Box` | HOMOLOG-NB Colaborador Descartavel | PENDENTE |
| `3c57dd41-3e0f-40f5-b3a9-323054dc4b02` | `HOMOLOG-NB Ciclo Nine-Box` | Bruno Henrique Alves | CONCLUÍDO |
| `69a20a9c-ee7c-49e9-a45d-6969bd837139` | `HOMOLOG-NB Ciclo Nine-Box` | HOMOLOG-NB Colaborador Descartavel | CONCLUÍDO |
| `c40f7529-7422-4f23-93c5-ff7dad68b9ab` | `CICLO APENAS DE TESTE` | Beatriz Silva Cardoso | CONCLUÍDO |

**Use o primeiro** (`6a606a8a-…`): é o grupo com um único registro e status
pendente, evitando que a fila escolha um registro concluído do mesmo conjunto.

> A leitura REST ao vivo deste ambiente de trabalho está com o token copiado do
> perfil expirado (`PGRST303: JWT expired`). O inventário acima veio da última
> leitura autenticada da mesma empresa e é o que deve ser conferido no painel
> após o login real.

## 4. Procedimento exato

1. **Sair** de qualquer conta E2E (`admin@teste.local`) e entrar com a conta real
   da TIME PROMO (`ti@promobrindes.com.br` ou a conta de RH/admin da empresa).
2. Confirme no topo a empresa **TIME | PROMO BRINDES**.
3. Se quiser eliminar a vitrine durante o teste, edite `.env.local` para:
   ```env
   VITE_DESEMPENHO_MOCK=false
   VITE_NINEBOX_MODO_REAL=true
   VITE_HOMOLOG_ORIGEM=true
   ```
   Reinicie:
   ```powershell
   npm run dev -- --port 8080
   ```
   (Alternativa: manter os mocks ligados e usar o painel de origem.)
4. Abra **Avaliação & Performance → Gestão de Desempenho → Feedbacks**.
5. No seletor de ciclo, escolha **HOMOLOG-NB Ciclo Nine-Box**
   (`5fa9996e-1d18-4942-b037-cbf3c46827a1`).
6. No painel **HOMOLOGAÇÃO · ORIGEM**, confirme:
   - selo **REAL**;
   - status **PENDENTE**;
   - colaborador **Camila Pereira Dias**;
   - UUID `6a606a8a-3019-4a41-aebb-903b190b2958`.
   Se o painel não mostrar nenhum REAL, a sessão ou a empresa está errada —
   **não continue** com um cartão DEMONSTRAÇÃO.
7. Na subaba **Aguardando gestor**, localize o card de **Camila Pereira Dias**.
8. Clique em **Ver avaliação**.
9. No rodapé do modal, clique em **Cancelar avaliação**.
10. Informe uma justificativa com pelo menos **3 caracteres**, por exemplo:
    ```text
    Cancelamento homologado após revisão do ciclo e alinhamento com o gestor.
    ```
11. Clique em **Confirmar cancelamento**.
12. O toast de sucesso deve ser o de banco:
    **“Avaliação cancelada (registro preservado).”**
    Se aparecer **“Demonstração: … armazenamento local …”**, o registro
    selecionado ainda é fictício: feche, volte ao painel e escolha um REAL.
13. Confirme no card o motivo do cancelamento e abra **Ver histórico**.
14. Pressione **F5** e repita a consulta; o motivo e o evento devem continuar.
15. Opcional, somente leitura no Supabase:
    ```sql
    select id, registro_id, justificativa, status_anterior, status_posterior,
           created_at
      from public.audit_log
     where tabela = 'feedbacks_360'
       and registro_id = '6a606a8a-3019-4a41-aebb-903b190b2958'
     order by created_at desc;
    ```

## 5. Regras

- Não converter `mock-*`/`demo-*` em UUID.
- Não criar registros remotos automaticamente.
- Não alterar o motor Nine-Box nem as regras de aprovação.
- Nenhum SQL de escrita nesta homologação.
- O painel de origem é temporário e não faz parte do layout aprovado.
