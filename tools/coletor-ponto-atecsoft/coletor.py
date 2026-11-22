"""
Coletor do Ponto AtecSoft -> Departamento Pessoal V3.

Lê o banco Firebird do Ponto AtecSoft em modo somente leitura e envia o cadastro
de funcionários, as justificativas e o cartão ponto dos últimos dias para a
Edge Function `ingest-ponto-rep`. Não interpreta nada: quem decide o que é
falta, atraso ou hora extra é o DP V3.

Não guarda estado: a cada execução reenvia a janela inteira (padrão 45 dias).
O servidor compara o hash de cada dia e só reprocessa o que mudou, então
reenviar é barato, uma correção tardia no AtecSoft chega sozinha e uma queda de
internet menor que a janela não perde nada.

Uso:
  python coletor.py                 envia a janela
  python coletor.py --configurar    grava URL, token e dados do banco
  python coletor.py --diagnostico   testa DLL, banco, internet e token
"""

import argparse
import ctypes
import hashlib
import json
import logging
import logging.handlers
import os
import sys
import urllib.error
import urllib.request
from datetime import date, datetime, time, timedelta

VERSAO = '1.0.1'
PASTA = os.path.dirname(os.path.abspath(__file__))
ARQ_CONFIG = os.path.join(PASTA, 'config.json')
ARQ_TOKEN = os.path.join(PASTA, 'token.dpapi')
ARQ_SENHA_FB = os.path.join(PASTA, 'firebird.dpapi')
ARQ_LOG = os.path.join(PASTA, 'coletor.log')
ARQ_TRAVA = os.path.join(PASTA, 'coletor.lock')

POSICOES = ['E1', 'S1', 'E2', 'S2', 'E3', 'S3', 'E4', 'S4', 'E5', 'S5', 'E6', 'S6']
DIAS_POR_ENVIO = 400
TENTATIVAS = 4

SQL_FUNCIONARIOS = (
    'SELECT CODIGO, NOME, MATRICULA, CPF, PIS, SITUACAO, EMPRESA, HORARIO, DATA_ADM, DATA_DESLIG '
    'FROM FUNCIONARIO ORDER BY CODIGO'
)
SQL_JUSTIFICATIVAS = 'SELECT CODIGO, NOME, NORMAL, FALTA FROM JUSTFICATIVA ORDER BY CODIGO'
SQL_FERIADOS = (
    'SELECT CODIGO, NOME, DATA, NBH, VINC_CIDADE, VINC_DEPART, VINC_EMP '
    'FROM FERIADO ORDER BY DATA, CODIGO'
)
# Só o que o DP V3 já sabe usar: os pares de jornada do dia e as tolerâncias.
# TB_* e J_* (tolerância e justificativa por batida) ficam para quando o
# significado de REF_* estiver provado (etapa 11).
SQL_HORARIOS = (
    'SELECT CODIGO, IDENT, DIA_SEMANA, '
    + ', '.join('ENT' + str(n) for n in range(1, 7)) + ', '
    + ', '.join('SAI' + str(n) for n in range(1, 7)) + ', '
    + 'TIPO_CALCULO, TOL_FALTA, TOL_EXTRA, NEUTRO, FECHA, AJUSTE, FOLGA, EXTRA '
    + 'FROM HORARIO_LINHAS ORDER BY CODIGO, DIA_SEMANA'
)
SQL_DIAS = (
    'SELECT IDENT, DATA_BATIDA, '
    + ', '.join(POSICOES) + ', '
    + ', '.join('REF_' + p for p in POSICOES) + ', '
    + ', '.join('OBS_' + p for p in POSICOES) + ', '
    + ', '.join('J' + p for p in POSICOES) + ', '
    + ', '.join('EQUIP_' + p for p in POSICOES) + ', '
    + ', '.join('DATA_' + p for p in POSICOES) + ', '
    + 'ABONO, ABONO_NEG, FOLGA, NEUTRO, JUST_ABN, HORARIO '
    + 'FROM CP WHERE DATA_BATIDA >= ? ORDER BY DATA_BATIDA, IDENT'
)

log = logging.getLogger('coletor')


# ---------------------------------------------------------------- conversão

def so_digitos(valor):
    if valor is None:
        return None
    digitos = ''.join(c for c in str(valor) if c.isdigit())
    return digitos or None


def texto(valor):
    if valor is None:
        return None
    limpo = str(valor).strip()
    return limpo or None


def inteiro(valor):
    if valor is None:
        return None
    try:
        return int(valor)
    except (TypeError, ValueError):
        return None


def iso_data(valor):
    if isinstance(valor, datetime):
        valor = valor.date()
    if isinstance(valor, date):
        return valor.isoformat()
    return None


def iso_hora(valor):
    """Hora como está no banco. 00:00:00 é enviado como veio: se isso é "vazio"
    ou meia-noite batida é decisão do servidor, não do coletor."""
    if isinstance(valor, datetime):
        valor = valor.time()
    if isinstance(valor, time):
        return valor.strftime('%H:%M:%S')
    return None


def marcado(valor):
    return inteiro(valor) == 1


def montar_funcionario(linha):
    return {
        'codigo': inteiro(linha.get('codigo')),
        'nome': texto(linha.get('nome')),
        'matricula': texto(linha.get('matricula')),
        'cpf': so_digitos(linha.get('cpf')),
        'pis': so_digitos(linha.get('pis')),
        'situacao': texto(linha.get('situacao')),
        'empresa_codigo': inteiro(linha.get('empresa')),
        'horario_codigo': inteiro(linha.get('horario')),
        'data_admissao': iso_data(linha.get('data_adm')),
        'data_desligamento': iso_data(linha.get('data_deslig')),
    }


def montar_justificativa(linha):
    return {
        'codigo': inteiro(linha.get('codigo')),
        'nome': texto(linha.get('nome')),
        'considera_normal': marcado(linha.get('normal')),
        'considera_falta': marcado(linha.get('falta')),
    }


def montar_feriado(linha):
    """Uma linha da FERIADO. `vinculo_*` diz para quem o feriado vale; NULL
    significa "vale para todos", e o DP V3 decide com o cadastro real."""
    return {
        'codigo': inteiro(linha.get('codigo')),
        'nome': texto(linha.get('nome')),
        'data': iso_data(linha.get('data')),
        'nao_computa_banco_horas': marcado(linha.get('nbh')),
        'vinculo_cidade': inteiro(linha.get('vinc_cidade')) or None,
        'vinculo_departamento': inteiro(linha.get('vinc_depart')) or None,
        'vinculo_empresa': inteiro(linha.get('vinc_emp')) or None,
    }


def montar_horario(linha):
    """Uma linha da HORARIO_LINHAS: a jornada de UM dia da semana. Só os pares
    entrada/saída com hora; dia sem jornada (domingo) sai com `pares` vazio."""
    pares = []
    for n in range(1, 7):
        entrada = iso_hora(linha.get('ent' + str(n)))
        saida = iso_hora(linha.get('sai' + str(n)))
        if entrada is None and saida is None:
            continue
        pares.append({'entrada': entrada, 'saida': saida})
    return {
        'codigo': inteiro(linha.get('codigo')),
        'ident': inteiro(linha.get('ident')) or None,
        'dia_semana': inteiro(linha.get('dia_semana')),
        'pares': pares,
        'tipo_calculo': inteiro(linha.get('tipo_calculo')),
        'tolerancia_falta': iso_hora(linha.get('tol_falta')),
        'tolerancia_extra': iso_hora(linha.get('tol_extra')),
        'neutro': marcado(linha.get('neutro')),
        'fecha': marcado(linha.get('fecha')),
        'ajuste': marcado(linha.get('ajuste')),
        'folga': marcado(linha.get('folga')),
        'extra': marcado(linha.get('extra')),
    }


def montar_dia(linha):
    """Uma linha da tabela CP vira um dia. Só ficam de fora as posições sem
    hora (NULL no banco) e sem justificativa."""
    marcacoes = []
    for pos in POSICOES:
        chave = pos.lower()
        hora = iso_hora(linha.get(chave))
        justificativa = inteiro(linha.get('j' + chave)) or None
        if hora is None and justificativa is None:
            continue
        marcacoes.append({
            'pos': pos,
            'hora': hora,
            'data': iso_data(linha.get('data_' + chave)),
            'ref': inteiro(linha.get('ref_' + chave)),
            'obs': texto(linha.get('obs_' + chave)),
            'justificativa': justificativa,
            'equip': inteiro(linha.get('equip_' + chave)),
        })
    dia = {
        'funcionario_codigo': inteiro(linha.get('ident')),
        'data': iso_data(linha.get('data_batida')),
        'marcacoes': marcacoes,
        'abono': iso_hora(linha.get('abono')),
        'abono_negativo': iso_hora(linha.get('abono_neg')),
        'folga': marcado(linha.get('folga')),
        'neutro': marcado(linha.get('neutro')),
        'justificativa_abono': inteiro(linha.get('just_abn')) or None,
        'horario_codigo': inteiro(linha.get('horario')),
    }
    dia['hash'] = hash_dia(dia)
    return dia


def hash_dia(dia):
    """Hash estável do conteúdo do dia: mesma linha no AtecSoft, mesmo hash."""
    base = {k: v for k, v in dia.items() if k != 'hash'}
    canonico = json.dumps(base, sort_keys=True, ensure_ascii=False, separators=(',', ':'))
    return hashlib.sha256(canonico.encode('utf-8')).hexdigest()


def dia_valido(dia):
    return bool(dia['funcionario_codigo']) and dia['funcionario_codigo'] > 0 and dia['data'] is not None


def montar_envios(funcionarios, justificativas, dias, inicio, fim, por_envio=DIAS_POR_ENVIO,
                  feriados=None, horarios=None):
    """Divide em requisições. Cadastro, justificativas, feriados e horários vão
    só na primeira. Sem dias, ainda sai um envio: é o sinal de vida do coletor.

    `feriados`/`horarios` em None significam "catálogo não consultado" e a chave
    sai do corpo: o servidor só reconcilia (apaga o que sumiu) quando a chave
    veio, então o diagnóstico de conexão não pode apagar o catálogo."""
    base = {'versao_coletor': VERSAO, 'periodo': {'inicio': inicio, 'fim': fim}}
    partes = [dias[i:i + por_envio] for i in range(0, len(dias), por_envio)] or [[]]
    envios = []
    for indice, parte in enumerate(partes):
        envio = dict(base)
        envio['parte'] = indice + 1
        envio['partes'] = len(partes)
        envio['funcionarios'] = funcionarios if indice == 0 else []
        envio['justificativas'] = justificativas if indice == 0 else []
        if indice == 0 and feriados is not None:
            envio['feriados'] = feriados
        if indice == 0 and horarios is not None:
            envio['horarios'] = horarios
        envio['dias'] = parte
        envios.append(envio)
    return envios


# ---------------------------------------------------------------- segredo (DPAPI)

class _Blob(ctypes.Structure):
    _fields_ = [('tamanho', ctypes.c_ulong), ('dados', ctypes.POINTER(ctypes.c_char))]


def _dpapi(dados, proteger):
    """Cifra ou decifra com a DPAPI do Windows, presa ao usuário que roda o
    coletor. O arquivo copiado para outra máquina ou outro usuário não abre."""
    entrada = _Blob(len(dados), ctypes.cast(ctypes.create_string_buffer(dados, len(dados)),
                                            ctypes.POINTER(ctypes.c_char)))
    saida = _Blob()
    crypt32 = ctypes.windll.crypt32
    funcao = crypt32.CryptProtectData if proteger else crypt32.CryptUnprotectData
    if not funcao(ctypes.byref(entrada), None, None, None, None, 0, ctypes.byref(saida)):
        raise OSError('DPAPI recusou a operação')
    try:
        return ctypes.string_at(saida.dados, saida.tamanho)
    finally:
        ctypes.windll.kernel32.LocalFree(saida.dados)


def gravar_segredo(caminho, valor):
    with open(caminho, 'wb') as arquivo:
        arquivo.write(_dpapi(valor.encode('utf-8'), True))


def ler_segredo(caminho):
    with open(caminho, 'rb') as arquivo:
        return _dpapi(arquivo.read(), False).decode('utf-8')


# ---------------------------------------------------------------- configuração

def carregar_config():
    with open(ARQ_CONFIG, 'r', encoding='utf-8') as arquivo:
        config = json.load(arquivo)
    for chave in ('url', 'banco', 'usuario_banco'):
        if not config.get(chave):
            raise ValueError('config.json sem "%s". Rode: python coletor.py --configurar' % chave)
    config.setdefault('dll', r'C:\Ponto AtecSoft\gds32.dll')
    config.setdefault('dias', 45)
    return config


def configurar():
    import getpass
    print('Configuração do coletor do ponto. Nada digitado aqui aparece no log.')
    config = {
        'url': input('URL da função (https://.../functions/v1/ingest-ponto-rep): ').strip(),
        'banco': input(r'Caminho do banco [C:\Ponto AtecSoft\DADOS\PONTO_ATECSOFT.FDB]: ').strip()
        or r'C:\Ponto AtecSoft\DADOS\PONTO_ATECSOFT.FDB',
        'dll': input(r'Caminho da gds32.dll [C:\Ponto AtecSoft\gds32.dll]: ').strip()
        or r'C:\Ponto AtecSoft\gds32.dll',
        'usuario_banco': input('Usuário do Firebird: ').strip(),
        'dias': 45,
    }
    if not config['url'].lower().startswith('https://'):
        raise ValueError('A URL precisa começar com https://')
    gravar_segredo(ARQ_SENHA_FB, getpass.getpass('Senha do Firebird: '))
    gravar_segredo(ARQ_TOKEN, getpass.getpass('Token do coletor (gerado no DP V3): ').strip())
    with open(ARQ_CONFIG, 'w', encoding='utf-8') as arquivo:
        json.dump(config, arquivo, indent=2, ensure_ascii=False)
    print('Configuração gravada. Teste com: python coletor.py --diagnostico')


# ---------------------------------------------------------------- banco e rede

def conectar(config):
    from fb15_client import Fb15Connection  # só existe no Windows 32 bits
    return Fb15Connection(config['banco'], config['usuario_banco'],
                          ler_segredo(ARQ_SENHA_FB), lib_path=config['dll'])


def ler_tudo(conexao, dias_janela, hoje=None):
    """Devolve um dict com tudo o que vai no lote. Cadastro, justificativas,
    feriados e horários são pequenos e vão inteiros; os dias respeitam a janela."""
    hoje = hoje or date.today()
    inicio = hoje - timedelta(days=dias_janela)
    funcionarios = [f for f in map(montar_funcionario, conexao.execute(SQL_FUNCIONARIOS))
                    if f['codigo'] and f['codigo'] > 0]
    justificativas = [j for j in map(montar_justificativa, conexao.execute(SQL_JUSTIFICATIVAS))
                      if j['codigo'] and j['nome']]
    feriados = [f for f in map(montar_feriado, conexao.execute(SQL_FERIADOS))
                if f['codigo'] and f['data']]
    horarios = [h for h in map(montar_horario, conexao.execute(SQL_HORARIOS))
                if h['codigo'] is not None and h['codigo'] > 0 and h['dia_semana'] is not None]
    dias = [d for d in map(montar_dia, conexao.execute(SQL_DIAS, [inicio])) if dia_valido(d)]
    return {
        'funcionarios': funcionarios,
        'justificativas': justificativas,
        'feriados': feriados,
        'horarios': horarios,
        'dias': dias,
        'inicio': inicio.isoformat(),
        'fim': hoje.isoformat(),
    }


def enviar(url, token, envio, esperar=None):
    """POST com repetição e espera crescente. Devolve o JSON de resposta."""
    import time as relogio
    esperar = esperar or relogio.sleep
    corpo = json.dumps(envio, ensure_ascii=False).encode('utf-8')
    ultimo_erro = None
    for tentativa in range(1, TENTATIVAS + 1):
        pedido = urllib.request.Request(url, data=corpo, method='POST', headers={
            'Content-Type': 'application/json; charset=utf-8',
            'x-coletor-token': token,
            'User-Agent': 'coletor-ponto-atecsoft/' + VERSAO,
        })
        try:
            with urllib.request.urlopen(pedido, timeout=60) as resposta:
                return json.loads(resposta.read().decode('utf-8') or '{}')
        except urllib.error.HTTPError as erro:
            # 4xx (menos 429) é erro do pedido: repetir não resolve.
            if 400 <= erro.code < 500 and erro.code != 429:
                raise RuntimeError('servidor recusou o envio: HTTP %d' % erro.code)
            ultimo_erro = 'HTTP %d' % erro.code
        except (urllib.error.URLError, TimeoutError, OSError) as erro:
            ultimo_erro = type(erro).__name__
        if tentativa < TENTATIVAS:
            esperar(2 ** tentativa)
    raise RuntimeError('sem resposta do servidor após %d tentativas (%s)' % (TENTATIVAS, ultimo_erro))


# ---------------------------------------------------------------- execução

def instancia_unica():
    """Trava de arquivo: uma segunda execução simultânea sai sem enviar."""
    import msvcrt
    arquivo = open(ARQ_TRAVA, 'w')
    try:
        msvcrt.locking(arquivo.fileno(), msvcrt.LK_NBLCK, 1)
    except OSError:
        arquivo.close()
        return None
    return arquivo


def preparar_log():
    rotativo = logging.handlers.RotatingFileHandler(ARQ_LOG, maxBytes=1_000_000, backupCount=5,
                                                    encoding='utf-8')
    rotativo.setFormatter(logging.Formatter('%(asctime)s %(levelname)s %(message)s'))
    log.addHandler(rotativo)
    log.addHandler(logging.StreamHandler())
    log.setLevel(logging.INFO)


def executar():
    config = carregar_config()
    token = ler_segredo(ARQ_TOKEN)
    conexao = conectar(config)
    try:
        lido = ler_tudo(conexao, int(config['dias']))
    finally:
        conexao.close()
    envios = montar_envios(lido['funcionarios'], lido['justificativas'], lido['dias'],
                           lido['inicio'], lido['fim'],
                           feriados=lido['feriados'], horarios=lido['horarios'])
    # Só contagens no log: nome, CPF e PIS nunca são escritos aqui.
    log.info('lidos: %d funcionários, %d justificativas, %d feriados, %d jornadas, '
             '%d dias (%s a %s), %d envio(s)',
             len(lido['funcionarios']), len(lido['justificativas']), len(lido['feriados']),
             len(lido['horarios']), len(lido['dias']), lido['inicio'], lido['fim'], len(envios))
    for envio in envios:
        resposta = enviar(config['url'], token, envio)
        log.info('envio %d/%d aceito: %s', envio['parte'], envio['partes'],
                 json.dumps({k: resposta.get(k) for k in ('lote_id', 'dias_alterados', 'pendentes_vinculo')}))


def diagnostico():
    """Testa cada dependência e diz qual falhou, sem expor dado pessoal."""
    ok = True

    def passo(nome, funcao):
        nonlocal ok
        try:
            print('[ OK ] %s%s' % (nome, funcao() or ''))
        except Exception as erro:  # noqa: BLE001 - diagnóstico mostra qualquer falha
            ok = False
            print('[FALHA] %s: %s' % (nome, erro))

    passo('Python de 32 bits', lambda: _exigir(ctypes.sizeof(ctypes.c_void_p) == 4,
                                                'este Python é de 64 bits; instale o de 32 bits'))
    config = {}
    passo('config.json', lambda: config.update(carregar_config()))
    passo('gds32.dll', lambda: _exigir(os.path.isfile(config.get('dll', '')), 'arquivo não encontrado'))
    passo('arquivo do banco', lambda: _exigir(os.path.isfile(config.get('banco', '')), 'arquivo não encontrado'))
    passo('token gravado', lambda: _exigir(len(ler_segredo(ARQ_TOKEN)) >= 32, 'token ausente ou curto'))

    def banco():
        conexao = conectar(config)
        try:
            total = conexao.execute('SELECT COUNT(*) AS TOTAL FROM FUNCIONARIO')[0]['total']
            ultimo = conexao.execute('SELECT MAX(DATA_BATIDA) AS ULTIMO FROM CP')[0]['ultimo']
        finally:
            conexao.close()
        return ': %s funcionários, última batida em %s' % (total, ultimo)

    passo('leitura do banco', banco)
    passo('servidor e token', lambda: ': ' + json.dumps(enviar(
        config['url'], ler_segredo(ARQ_TOKEN),
        montar_envios([], [], [], date.today().isoformat(), date.today().isoformat())[0])))
    return 0 if ok else 1


def _exigir(condicao, mensagem):
    if not condicao:
        raise RuntimeError(mensagem)


def main(argumentos=None):
    analisador = argparse.ArgumentParser(description='Coletor do Ponto AtecSoft para o DP V3')
    analisador.add_argument('--configurar', action='store_true')
    analisador.add_argument('--diagnostico', action='store_true')
    opcoes = analisador.parse_args(argumentos)
    if opcoes.configurar:
        configurar()
        return 0
    if opcoes.diagnostico:
        return diagnostico()
    preparar_log()
    trava = instancia_unica()
    if trava is None:
        log.info('outra execução em andamento; saindo')
        return 0
    try:
        executar()
        return 0
    except Exception as erro:  # noqa: BLE001 - a tarefa agendada precisa do motivo no log
        log.error('falhou: %s', erro)
        return 1
    finally:
        trava.close()


if __name__ == '__main__':
    sys.exit(main())
