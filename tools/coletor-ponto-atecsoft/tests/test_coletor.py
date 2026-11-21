"""Testes da lógica pura do coletor. Rodam em qualquer sistema:
    python -m unittest discover -s tools/coletor-ponto-atecsoft/tests
"""
import io
import json
import os
import sys
import unittest
import urllib.error
from datetime import date, time
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
import coletor  # noqa: E402


def linha_cp(**extra):
    linha = {'ident': 7, 'data_batida': date(2026, 11, 20), 'folga': 0, 'neutro': None,
             'abono': None, 'abono_neg': None, 'just_abn': 0, 'horario': 2}
    linha.update(extra)
    return linha


class Conversao(unittest.TestCase):
    def test_funcionario_limpa_cpf_e_pis_e_nao_inventa_campo(self):
        f = coletor.montar_funcionario({
            'codigo': 12, 'nome': '  José da Conceição ', 'matricula': '0012', 'cpf': '123.456.789-09',
            'pis': '120.45678.90-1', 'situacao': 'ATIVO', 'empresa': 1, 'horario': 3,
            'data_adm': date(2021, 3, 1), 'data_deslig': None})
        self.assertEqual(f['cpf'], '12345678909')
        self.assertEqual(f['pis'], '12045678901')
        self.assertEqual(f['nome'], 'José da Conceição')
        self.assertEqual(f['data_admissao'], '2021-03-01')
        self.assertIsNone(f['data_desligamento'])

    def test_dia_mantem_posicao_e_ignora_slot_nulo(self):
        dia = coletor.montar_dia(linha_cp(e1=time(7, 58), s1=time(12, 1), e2=time(13, 0), s2=time(18, 4),
                                          obs_s2=' esqueceu ', ref_s2=1, equip_e1=4))
        self.assertEqual([m['pos'] for m in dia['marcacoes']], ['E1', 'S1', 'E2', 'S2'])
        self.assertEqual(dia['marcacoes'][0], {'pos': 'E1', 'hora': '07:58:00', 'data': None, 'ref': None,
                                               'obs': None, 'justificativa': None, 'equip': 4})
        self.assertEqual(dia['marcacoes'][3]['obs'], 'esqueceu')
        self.assertEqual(dia['funcionario_codigo'], 7)
        self.assertEqual(dia['data'], '2026-11-20')

    def test_meia_noite_e_enviada_como_veio(self):
        dia = coletor.montar_dia(linha_cp(e1=time(0, 0)))
        self.assertEqual(dia['marcacoes'][0]['hora'], '00:00:00')

    def test_justificativa_sem_hora_entra(self):
        dia = coletor.montar_dia(linha_cp(je1=1, js1=1))
        self.assertEqual([(m['pos'], m['hora'], m['justificativa']) for m in dia['marcacoes']],
                         [('E1', None, 1), ('S1', None, 1)])

    def test_virada_de_dia_leva_a_data_real_da_saida(self):
        dia = coletor.montar_dia(linha_cp(e1=time(19, 0), s1=time(6, 0), data_s1=date(2026, 11, 21)))
        self.assertEqual(dia['marcacoes'][1]['data'], '2026-11-21')

    def test_hash_estavel_e_sensivel_a_mudanca(self):
        a = coletor.montar_dia(linha_cp(e1=time(8, 0)))
        b = coletor.montar_dia(linha_cp(e1=time(8, 0)))
        c = coletor.montar_dia(linha_cp(e1=time(8, 1)))
        self.assertEqual(a['hash'], b['hash'])
        self.assertNotEqual(a['hash'], c['hash'])
        self.assertRegex(a['hash'], r'^[0-9a-f]{64}$')

    def test_dia_sem_funcionario_ou_sem_data_e_descartado(self):
        self.assertFalse(coletor.dia_valido(coletor.montar_dia(linha_cp(ident=0))))
        self.assertFalse(coletor.dia_valido(coletor.montar_dia(linha_cp(data_batida=None))))
        self.assertTrue(coletor.dia_valido(coletor.montar_dia(linha_cp())))

    def test_coletor_nao_classifica_falta(self):
        dia = coletor.montar_dia(linha_cp())
        self.assertEqual(dia['marcacoes'], [])
        self.assertNotIn('tipo', dia)


class Envios(unittest.TestCase):
    def test_cadastro_so_na_primeira_parte(self):
        dias = [{'n': i} for i in range(5)]
        envios = coletor.montar_envios([{'codigo': 1}], [{'codigo': 9}], dias, '2026-10-01', '2026-11-21', por_envio=2)
        self.assertEqual([len(e['dias']) for e in envios], [2, 2, 1])
        self.assertEqual([len(e['funcionarios']) for e in envios], [1, 0, 0])
        self.assertEqual([e['parte'] for e in envios], [1, 2, 3])
        self.assertTrue(all(e['partes'] == 3 for e in envios))

    def test_sem_dias_ainda_envia_sinal_de_vida(self):
        envios = coletor.montar_envios([], [], [], '2026-11-21', '2026-11-21')
        self.assertEqual(len(envios), 1)
        self.assertEqual(envios[0]['dias'], [])


class Rede(unittest.TestCase):
    def _resposta(self, corpo):
        r = mock.MagicMock()
        r.read.return_value = json.dumps(corpo).encode()
        r.__enter__.return_value = r
        return r

    def test_repete_em_falha_de_rede_e_entrega(self):
        esperas = []
        efeitos = [urllib.error.URLError('fora'), urllib.error.URLError('fora'), self._resposta({'lote_id': 'x'})]
        with mock.patch('urllib.request.urlopen', side_effect=efeitos) as abrir:
            saida = coletor.enviar('https://exemplo.invalid/f', 'tok', {'dias': []}, esperar=esperas.append)
        self.assertEqual(saida, {'lote_id': 'x'})
        self.assertEqual(abrir.call_count, 3)
        self.assertEqual(esperas, [2, 4])

    def test_token_vai_no_cabecalho_e_nao_no_corpo(self):
        with mock.patch('urllib.request.urlopen', return_value=self._resposta({})) as abrir:
            coletor.enviar('https://exemplo.invalid/f', 'segredo-do-teste', {'dias': []}, esperar=lambda s: None)
        pedido = abrir.call_args[0][0]
        self.assertEqual(pedido.get_header('X-coletor-token'), 'segredo-do-teste')
        self.assertNotIn(b'segredo-do-teste', pedido.data)

    def test_401_nao_repete(self):
        erro = urllib.error.HTTPError('u', 401, 'nao', {}, io.BytesIO(b''))
        with mock.patch('urllib.request.urlopen', side_effect=erro) as abrir:
            with self.assertRaisesRegex(RuntimeError, 'HTTP 401'):
                coletor.enviar('https://exemplo.invalid/f', 't', {}, esperar=lambda s: None)
        self.assertEqual(abrir.call_count, 1)

    def test_desiste_apos_o_limite(self):
        with mock.patch('urllib.request.urlopen', side_effect=urllib.error.URLError('fora')) as abrir:
            with self.assertRaisesRegex(RuntimeError, 'sem resposta'):
                coletor.enviar('https://exemplo.invalid/f', 't', {}, esperar=lambda s: None)
        self.assertEqual(abrir.call_count, coletor.TENTATIVAS)


class Consultas(unittest.TestCase):
    def test_so_select(self):
        for sql in (coletor.SQL_FUNCIONARIOS, coletor.SQL_JUSTIFICATIVAS, coletor.SQL_DIAS):
            self.assertTrue(sql.startswith('SELECT '))
            for proibido in ('INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', ';'):
                self.assertNotIn(proibido, sql.upper())

    def test_leitura_usa_janela(self):
        class Falsa:
            def __init__(self):
                self.parametros = None

            def execute(self, sql, params=None):
                if 'FROM CP' in sql:
                    self.parametros = params
                    return [linha_cp(e1=time(8, 0)), linha_cp(ident=0)]
                if 'FUNCIONARIO' in sql:
                    return [{'codigo': 7, 'nome': 'A'}, {'codigo': 0, 'nome': 'lixo'}]
                return [{'codigo': 1, 'nome': 'Atestado', 'normal': 1, 'falta': 0}]

        falsa = Falsa()
        f, j, d, inicio, fim = coletor.ler_tudo(falsa, 45, hoje=date(2026, 11, 21))
        self.assertEqual(falsa.parametros, [date(2026, 10, 7)])
        self.assertEqual((len(f), len(j), len(d)), (1, 1, 1))
        self.assertEqual((inicio, fim), ('2026-10-07', '2026-11-21'))
        self.assertTrue(j[0]['considera_normal'])


if __name__ == '__main__':
    unittest.main()
