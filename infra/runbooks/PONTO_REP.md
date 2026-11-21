# Runbook — Relógio de ponto (coletor AtecSoft → DP V3)

> Operação do coletor que leva as batidas do relógio Henry, via Ponto AtecSoft, para o DP V3. Um coletor por
> unidade, no PC onde o AtecSoft está instalado. Fluxo do DP: `docs/guides/ponto-eletronico.md`. Detalhes do
> programa: `tools/coletor-ponto-atecsoft/README.md`. Plano: `docs/PLANO_INTEGRACAO_PONTO_HENRY_ATECSOFT.md`.

## 1. Peças

| Peça | Onde | Observação |
| --- | --- | --- |
| Coletor | Pasta do PC da unidade (ex.: `C:\DP_V3\coletor`), `coletor.py` | Só lê o banco do AtecSoft |
| Tarefa agendada | Agendador do Windows, `DP_V3_Coletor_Ponto` | A cada 10 min, com o usuário que instalou |
| Log | `coletor.log` na pasta do coletor | Só contagens e erros; sem nome, CPF ou PIS |
| Segredos | `token.dpapi` e `firebird.dpapi` | Cifrados pela DPAPI para o usuário do Windows que configurou |
| Configuração | `config.json` | URL, caminhos e usuário do banco; sem senha e sem token |
| Cadastro do coletor | DP V3, Integrações > Relógios de ponto (tabela `ponto_rep_dispositivos`) | Token guardado só em hash SHA-256 |
| Envios recebidos | `ponto_rep_lotes` | Um registro por envio |

Cada execução reenvia os **últimos 45 dias** inteiros (`dias` em `config.json`, padrão 45). O servidor ignora o dia
que não mudou. Por isso qualquer parada menor que 45 dias não perde batida: basta o coletor voltar a rodar.

## 2. Coletor parado

Sinal: em Integrações > Relógios de ponto, o último contato da unidade não avança.

1. No PC da unidade, abra um prompt na pasta do coletor e rode:
   ```
   python coletor.py --diagnostico
   ```
   Cada linha sai `[ OK ]` ou `[FALHA] <motivo>`, nesta ordem: Python de 32 bits, `config.json`, `gds32.dll`, arquivo
   do banco, token gravado, leitura do banco, servidor e token.
2. Leia o fim de `coletor.log`. Linhas `falhou: ...` trazem o motivo da última execução.
3. Confira a tarefa `DP_V3_Coletor_Ponto` no Agendador: existe, está habilitada, última execução recente. Ela só roda
   com o usuário logado, a menos que esteja marcada "Executar estando o usuário conectado ou não".

| Falha | Causa provável | Ação |
| --- | --- | --- |
| Python de 32 bits | Python trocado por um de 64 bits | Instale o Python 32 bits e recrie a tarefa com `instalar.bat` |
| `gds32.dll` ou arquivo do banco | AtecSoft movido ou atualizado | `python coletor.py --configurar` com os caminhos novos |
| token gravado | `token.dpapi` apagado, ou outro usuário do Windows | Seção 5 (PC ou usuário trocado) |
| leitura do banco | Firebird do AtecSoft parado, senha trocada ou AtecSoft atualizado | Inicie o Firebird; senha trocada → `--configurar`; atualização → seção 7 |
| servidor e token: `HTTP 401`/`403` | Token revogado ou errado | Seção 4 (gerar novo token) |
| servidor e token: sem resposta | Internet ou servidor fora | Teste a internet; o envio volta sozinho quando a rede voltar |
| `outra execução em andamento` no log | Execução anterior ainda rodando | Normal se for eventual; constante → reinicie o PC |

Feito quando: `--diagnostico` todo `[ OK ]` e o último contato atualiza na tela em até 10 minutos.

## 3. Token vazado

Token apareceu em chat, e-mail, print ou arquivo, ou o PC foi acessado por quem não devia.

1. Em Integrações > Relógios de ponto, **revogue** o token da unidade. O antigo para de funcionar na hora: os próximos
   envios com ele são recusados.
2. Gere um **novo token** para a mesma unidade (mostrado uma vez só).
3. No PC da unidade: `python coletor.py --configurar` e cole o token novo quando pedir.
4. `python coletor.py --diagnostico` → "servidor e token" `[ OK ]`.

Nada se perde: o histórico continua no mesmo registro da unidade e o primeiro envio depois da troca leva os 45 dias.

## 4. Rotação de token sem perder batida

Rotação planejada (ex.: semestral) ou depois de vazamento.

1. Em Integrações > Relógios de ponto, gere um novo token para a unidade. O registro da unidade, os envios e os dias já
   recebidos continuam os mesmos; só o token muda, e o antigo para na hora.
2. No PC: `python coletor.py --configurar` com o token novo e `python coletor.py --diagnostico`.
3. Confira na tela que o último contato voltou a andar.

Entre os passos 1 e 2 os envios são recusados, mas o AtecSoft continua guardando as batidas. Como cada envio repete os
últimos 45 dias, **nenhuma batida se perde se o passo 2 for feito em até 45 dias**. Passou disso, aumente `dias` em
`config.json` para cobrir o período parado, rode uma vez e volte para 45.

## 5. PC trocado (ou outro usuário do Windows)

A DPAPI prende `token.dpapi` e `firebird.dpapi` ao usuário do Windows do PC onde foram gravados. Copiados para outro
PC ou outro usuário, não abrem.

1. No PC novo, instale o Ponto AtecSoft (com o Firebird dele) e o Python **de 32 bits**.
2. Copie a pasta do coletor **sem** `config.json`, `token.dpapi`, `firebird.dpapi` e `coletor.log`.
3. Em Integrações > Relógios de ponto, gere um novo token para a unidade (isso também invalida o do PC antigo).
4. Entre no Windows com o usuário que vai ficar logado e rode `instalar.bat`: ele pede URL, banco, usuário e senha do
   Firebird e o token, roda o diagnóstico e cria a tarefa `DP_V3_Coletor_Ponto`.
5. No PC antigo, se ainda ligado: `schtasks /delete /tn DP_V3_Coletor_Ponto /f`.

Feito quando: diagnóstico todo `[ OK ]` no PC novo e último contato andando na tela.

## 6. Relógio trocado

O coletor não fala com o relógio: ele lê o AtecSoft. Trocar o Henry é assunto do AtecSoft.

1. Cadastre o relógio novo no AtecSoft e confirme que ele recolhe as batidas.
2. `python coletor.py --diagnostico`: a linha "leitura do banco" mostra a data da última batida; ela deve ser de hoje.
3. Nada muda no coletor nem no token. Cada batida enviada traz o relógio de origem (`equip`), então dá para separar o
   antigo do novo no DP V3.

## 7. AtecSoft atualizado

1. Depois de qualquer atualização do AtecSoft, rode `python coletor.py --diagnostico`.
2. Se `gds32.dll` ou o arquivo do banco mudaram de lugar: `python coletor.py --configurar`.
3. Se "leitura do banco" falhar com erro de tabela ou coluna, a atualização mudou o banco. **Não contorne no PC**: as
   consultas do coletor (`SQL_*` em `tools/coletor-ponto-atecsoft/coletor.py`) precisam ser corrigidas em PR, com os
   testes (`python -m unittest discover -s tools/coletor-ponto-atecsoft/tests`) verdes, e o `coletor.py` novo copiado
   para o PC.
4. Até a correção os envios param, mas nada se perde se ela entrar em até 45 dias (seção 4).

## 8. Escalar

- Falha que este runbook não resolve, ou envio recusado com `HTTP 5xx` repetido: abrir issue com a unidade, o horário e
  a saída do `--diagnostico` (ela não tem dado pessoal; **nunca cole o token**).
- Token, coletor e tabelas `ponto_rep_*` são itens da regra 8 do `AGENTS.md`: mudança de banco, segredo ou CI passa
  pelo dono.
