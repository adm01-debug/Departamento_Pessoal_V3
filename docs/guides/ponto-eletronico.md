# Ponto eletrônico — relógio Henry + Ponto AtecSoft

Guia do DP para o dia a dia do ponto de quem bate no relógio. Operação técnica do coletor (parado, token, troca de
PC): `infra/runbooks/PONTO_REP.md`.

## Como funciona

1. O colaborador bate no **relógio Henry** da unidade.
2. O **Ponto AtecSoft**, no PC da unidade, recolhe as batidas do relógio como sempre.
3. O **coletor**, instalado nesse mesmo PC, lê o AtecSoft **a cada 10 minutos** e envia para o DP V3 o cadastro de
   funcionários, as justificativas e o cartão ponto dos **últimos 45 dias**. Ele só lê: nunca altera o AtecSoft.
4. O DP confere tudo no DP V3, em **Integrações > Relógios de ponto**.

Como cada envio repete os últimos 45 dias, uma correção feita no AtecSoft chega sozinha no envio seguinte, e uma
queda de internet de algumas horas ou dias não perde nada.

## Regras

- **Quem bate no relógio não bate pelo app nem pelo quiosque do DP V3.** Uma pessoa, um jeito de bater.
- **Batida do relógio se corrige no AtecSoft**, nunca no DP V3. O coletor leva a correção em até 10 minutos.
- A assinatura do espelho continua **no papel**.

## O que conferir em Integrações > Relógios de ponto

| O que | Onde olhar | O que fazer |
| --- | --- | --- |
| **Coletores** | Uma linha por unidade, com o último contato | Sem contato há mais de 30 minutos em horário de expediente: avise o TI (runbook, "Coletor parado") |
| **Envios** | Lista dos últimos envios, com quantos dias mudaram | Envio com erro: avise o TI com a unidade e o horário |
| **Vínculos pendentes** | Funcionários do AtecSoft que o DP V3 não achou entre os colaboradores | Confira CPF, PIS e matrícula nos dois sistemas e vincule ao colaborador certo |
| **Justificativas** | Justificativas do AtecSoft (atestado, folga, etc.) | Diga a que tipo de dia cada uma corresponde no DP V3 (normal, falta, atestado, férias...) |

Só administrador e RH veem esta tela, e cada um vê só a própria empresa.

## Fim do mês

1. Confira que todos os coletores estão em dia e que não há vínculo pendente.
2. Imprima o espelho de cada colaborador.
3. Colha a assinatura em papel e controle quem já devolveu o espelho assinado.

## O que ainda não está ligado

- **As batidas recebidas ainda não viram batidas do DP V3.** O DP V3 guarda uma cópia fiel do cartão do AtecSoft, mas
  a conversão em batidas, que alimenta o espelho do DP V3, ainda não existe (etapa 41 do plano). Ela depende de
  conferir o banco real do AtecSoft. **Até lá, o espelho que vale é o impresso pelo AtecSoft.**
- **O controle de espelhos devolvidos ainda não existe no sistema** (etapa 85 do plano). Até lá, mantenha o controle
  como hoje.
- **O DP V3 não grava nada no AtecSoft.** Atestado, férias e afastamento continuam sendo lançados também no AtecSoft. A
  gravação automática é a Fase 9 do plano e também depende do banco real do AtecSoft.

Plano completo: `docs/PLANO_INTEGRACAO_PONTO_HENRY_ATECSOFT.md`.
