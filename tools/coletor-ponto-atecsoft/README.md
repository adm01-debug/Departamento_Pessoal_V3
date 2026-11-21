# Coletor do Ponto AtecSoft

Programa pequeno que roda no PC onde o Ponto AtecSoft está instalado (um por unidade). A cada 10 minutos ele lê o
banco do AtecSoft **somente para leitura** e envia para o DP V3 o cadastro de funcionários, as justificativas e o
cartão ponto dos últimos 45 dias.

Plano completo: `docs/PLANO_INTEGRACAO_PONTO_HENRY_ATECSOFT.md` (Fase 4).

## Estado

- Pronto e testado: leitura, conversão, divisão em envios, repetição em falha de rede (16 testes).
- **Ainda não funciona de ponta a ponta**: a função `ingest-ponto-rep` que recebe os envios ainda não existe no DP V3.
- **Não testado em Windows nem com banco real.** As três consultas foram validadas contra o banco vazio do instalador
  2.1.13; o caminho da DLL, a DPAPI e a tarefa agendada só podem ser provados no PC da unidade.
- Não escreve no AtecSoft. A gravação de atestado, férias e cadastro é a Fase 9 do plano.

## O que precisa no PC

- Windows com o Ponto AtecSoft instalado e o Firebird dele em execução.
- Python **de 32 bits** (a `gds32.dll` do AtecSoft é de 32 bits). Sem biblioteca extra.
- Saída de internet por HTTPS.
- Um token de coletor gerado no DP V3 para a unidade.

## Instalar

1. Copie esta pasta para o PC, por exemplo `C:\DP_V3\coletor`.
2. Entre no Windows com o usuário que vai ficar logado no PC.
3. Execute `instalar.bat`. Ele pede a URL, o caminho do banco, o usuário e a senha do Firebird e o token, testa tudo e
   cria a tarefa agendada `DP_V3_Coletor_Ponto`.

A tarefa roda com o usuário que instalou e só enquanto ele estiver com sessão aberta. Para rodar com o PC bloqueado ou
sem sessão, edite a tarefa no Agendador e marque "Executar estando o usuário conectado ou não".

## Comandos

| Comando | O que faz |
| --- | --- |
| `python coletor.py` | Lê e envia a janela. É o que a tarefa agendada chama |
| `python coletor.py --configurar` | Regrava URL, banco, usuário, senha e token |
| `python coletor.py --diagnostico` | Testa Python 32 bits, DLL, banco, token e servidor, um por linha |

## Onde ficam os segredos

- `token.dpapi` e `firebird.dpapi`: cifrados pela DPAPI do Windows para o usuário que configurou. Copiados para outro
  PC ou outro usuário, não abrem.
- `config.json`: só URL, caminhos e nome do usuário do banco. Sem senha e sem token.
- `coletor.log`: só contagens e erros. Nome, CPF e PIS nunca são escritos. Rotaciona em 1 MB, guarda 5 arquivos.

Nenhum desses arquivos é versionado (`.gitignore` desta pasta).

## O que é enviado

`POST` para a URL configurada, cabeçalho `x-coletor-token`, corpo JSON:

```json
{
  "versao_coletor": "1.0.0",
  "periodo": { "inicio": "2026-10-07", "fim": "2026-11-21" },
  "parte": 1,
  "partes": 1,
  "funcionarios": [
    { "codigo": 7, "nome": "...", "matricula": "...", "cpf": "...", "pis": "...", "situacao": "ATIVO",
      "empresa_codigo": 1, "horario_codigo": 2, "data_admissao": "2021-03-01", "data_desligamento": null }
  ],
  "justificativas": [{ "codigo": 1, "nome": "Atestado", "considera_normal": true, "considera_falta": false }],
  "dias": [
    { "funcionario_codigo": 7, "data": "2026-11-20",
      "marcacoes": [{ "pos": "E1", "hora": "07:58:00", "data": null, "ref": null, "obs": null,
                      "justificativa": null, "equip": 4 }],
      "abono": null, "abono_negativo": null, "folga": false, "neutro": false,
      "justificativa_abono": null, "horario_codigo": 2, "hash": "<sha256 do dia>" }
  ]
}
```

Cadastro e justificativas vão só na parte 1; os dias vão em blocos de 400. Sem nenhum dia na janela, sai um envio
vazio, que serve de sinal de vida.

## Decisões de desenho

- **Sem estado local.** Toda execução reenvia a janela inteira; o servidor compara o `hash` de cada dia e ignora o que
  não mudou. Correção tardia no AtecSoft chega sozinha, e uma queda de internet menor que a janela não perde nada.
- **O coletor não interpreta.** Não decide falta, atraso nem entrada/saída, e envia `00:00:00` como veio do banco. O
  protótipo anterior tratava `00:00:00` como "vazio"; isso só pode ser confirmado com o banco real (etapa 11 do plano).
- **Funcionário do dia = `CP.IDENT`**, tratado como `FUNCIONARIO.CODIGO`, como no protótipo anterior. NÃO VERIFICADO
  com banco real (etapa 10 do plano).

## Testes

```
python -m unittest discover -s tools/coletor-ponto-atecsoft/tests
```

Rodam em qualquer sistema. Ainda não estão ligados ao CI.
