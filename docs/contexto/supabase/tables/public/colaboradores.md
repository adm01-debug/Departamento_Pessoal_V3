# public.colaboradores

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.excecoes_ponto, public.pontos_abertos, public.v_contratos_tokens_pendentes, public.v_ferias_alertas_criticos, public.v_ferias_folha_reconciliacao, public.vw_alertas_compensacao, public.vw_banco_horas_saldo, public.vw_batidas_dia, public.vw_batidas_resumo, public.vw_cadastro_incompleto, public.vw_colaboradores_completo, public.vw_dashboard_time, public.vw_espelho_ponto_mensal, public.vw_ferias_resumo, public.vw_folha_ponto_mensal, public.vw_kpi_ponto_resumo, public.vw_kpi_turnover, public.vw_matriz_nine_box, public.vw_passivo_trabalhista_consolidado, public.vw_saldo_compensacao_mensal |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 3 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 4 | `created_by` | `uuid` | sim |  |  |  |
| 5 | `nome_completo` | `text` | não |  |  |  |
| 6 | `nome_social` | `text` | sim |  |  |  |
| 7 | `cpf` | `text` | não |  |  |  |
| 8 | `rg` | `text` | sim |  |  |  |
| 9 | `rg_orgao_emissor` | `text` | sim |  |  |  |
| 10 | `rg_uf` | `text` | sim |  |  |  |
| 11 | `rg_data_emissao` | `date` | sim |  |  |  |
| 12 | `data_nascimento` | `date` | sim |  |  |  |
| 13 | `sexo` | `sexo` | sim |  |  |  |
| 14 | `estado_civil` | `estado_civil` | sim | `'solteiro'::estado_civil` |  |  |
| 15 | `nacionalidade` | `text` | sim | `'Brasileira'::text` |  |  |
| 16 | `naturalidade_cidade` | `text` | sim |  |  |  |
| 17 | `naturalidade_uf` | `text` | sim |  |  |  |
| 18 | `nome_mae` | `text` | não |  |  |  |
| 19 | `nome_pai` | `text` | sim |  |  |  |
| 20 | `pis_pasep` | `text` | sim |  |  |  |
| 21 | `ctps_numero` | `text` | sim |  |  |  |
| 22 | `ctps_serie` | `text` | sim |  |  |  |
| 23 | `ctps_uf` | `text` | sim |  |  |  |
| 24 | `ctps_data_emissao` | `date` | sim |  |  |  |
| 25 | `titulo_eleitor` | `text` | sim |  |  |  |
| 26 | `titulo_zona` | `text` | sim |  |  |  |
| 27 | `titulo_secao` | `text` | sim |  |  |  |
| 28 | `certificado_reservista` | `text` | sim |  |  |  |
| 29 | `cnh_numero` | `text` | sim |  |  |  |
| 30 | `cnh_categoria` | `text` | sim |  |  |  |
| 31 | `cnh_validade` | `date` | sim |  |  |  |
| 32 | `email` | `text` | sim |  |  |  |
| 33 | `telefone` | `text` | sim |  |  |  |
| 34 | `celular` | `text` | sim |  |  |  |
| 35 | `cep` | `text` | sim |  |  |  |
| 36 | `logradouro` | `text` | sim |  |  |  |
| 37 | `numero` | `text` | sim |  |  |  |
| 38 | `complemento` | `text` | sim |  |  |  |
| 39 | `bairro` | `text` | sim |  |  |  |
| 40 | `cidade` | `text` | sim |  |  |  |
| 41 | `uf` | `text` | sim |  |  |  |
| 42 | `banco_codigo` | `text` | sim |  |  |  |
| 43 | `banco_nome` | `text` | sim |  |  |  |
| 44 | `agencia` | `text` | sim |  |  |  |
| 45 | `conta` | `text` | sim |  |  |  |
| 46 | `tipo_conta` | `tipo_conta` | sim | `'corrente'::tipo_conta` |  |  |
| 47 | `pix_tipo` | `text` | sim |  |  |  |
| 48 | `pix_chave` | `text` | sim |  |  |  |
| 49 | `matricula` | `text` | sim |  |  |  |
| 50 | `data_admissao` | `date` | não |  |  |  |
| 51 | `data_desligamento` | `date` | sim |  |  |  |
| 52 | `tipo_contrato` | `tipo_contrato` | não | `'clt'::tipo_contrato` |  |  |
| 53 | `cargo` | `text` | não |  |  |  |
| 54 | `departamento` | `text` | não |  |  |  |
| 55 | `centro_custo` | `text` | sim |  |  |  |
| 56 | `local_trabalho` | `text` | sim |  |  |  |
| 57 | `cbo` | `text` | sim |  |  |  |
| 58 | `salario_base` | `numeric(12,2)` | não |  |  |  |
| 59 | `tipo_salario` | `text` | sim | `'mensal'::text` |  |  |
| 60 | `jornada_semanal` | `integer` | sim | `44` |  |  |
| 61 | `horario_entrada` | `time without time zone` | sim |  |  |  |
| 62 | `horario_saida` | `time without time zone` | sim |  |  |  |
| 63 | `intervalo_minutos` | `integer` | sim | `60` |  |  |
| 64 | `escolaridade` | `escolaridade` | sim |  |  |  |
| 65 | `formacao` | `text` | sim |  |  |  |
| 66 | `cursos_certificacoes` | `text` | sim |  |  |  |
| 67 | `status` | `status_colaborador` | não | `'ativo'::status_colaborador` |  |  |
| 68 | `observacoes` | `text` | sim |  |  |  |
| 69 | `foto_url` | `text` | sim |  |  |  |
| 70 | `empresa_id` | `uuid` | sim |  |  |  |
| 71 | `bitrix_id` | `character varying(50)` | sim |  |  |  |
| 72 | `bitrix_sync_status` | `character varying(50)` | sim |  |  |  |
| 73 | `bitrix_ultima_sync` | `timestamp with time zone` | sim |  |  |  |
| 74 | `supervisor_id` | `uuid` | sim |  |  |  |
| 75 | `time_id` | `uuid` | sim |  |  |  |
| 76 | `etnia` | `text` | sim |  |  |  |
| 77 | `identidade_genero` | `text` | sim |  |  |  |
| 78 | `tipo_admissao` | `text` | sim |  |  |  |
| 79 | `tipo_estabilidade` | `text` | sim |  |  |  |
| 80 | `primeiro_emprego` | `boolean` | sim | `false` |  |  |
| 81 | `cargo_confianca` | `boolean` | sim | `false` |  |  |
| 82 | `aposentado` | `boolean` | sim | `false` |  |  |
| 83 | `cipa` | `boolean` | sim | `false` |  |  |
| 84 | `email_corporativo` | `text` | sim |  |  |  |
| 85 | `inscricao_orgao_classe` | `text` | sim |  |  |  |
| 86 | `conselho_profissional` | `text` | sim |  |  |  |
| 87 | `seguro_desemprego` | `boolean` | sim | `false` |  |  |
| 88 | `data_exame_admissional` | `date` | sim |  |  |  |
| 89 | `tipo_pagamento` | `text` | sim |  |  |  |
| 90 | `categoria_trabalhador` | `text` | sim |  |  |  |
| 91 | `nacionalidade_id` | `integer` | sim |  |  |  |
| 92 | `centro_custo_id` | `uuid` | sim |  |  |  |
| 93 | `tipo_pagamento_id` | `integer` | sim |  |  |  |
| 94 | `tipo_salario_id` | `integer` | sim |  |  |  |
| 95 | `categoria_trabalhador_id` | `integer` | sim |  |  |  |
| 96 | `genero_documento_id` | `integer` | sim |  |  |  |
| 97 | `pronomes` | `text` | sim |  |  |  |
| 98 | `pais_nascimento` | `text` | sim | `'BR'::text` |  |  |
| 99 | `data_senioridade` | `date` | sim |  |  |  |
| 100 | `gestor_ferias_id` | `uuid` | sim |  |  |  |
| 101 | `local_trabalho_id` | `uuid` | sim |  |  |  |
| 102 | `nome_nascimento` | `text` | sim |  |  |  |
| 103 | `rg_data_validade` | `date` | sim |  |  |  |
| 104 | `identificador_tipo` | `text` | sim |  |  |  |
| 105 | `identificador_validade` | `date` | sim |  |  |  |
| 106 | `tipo_sanguineo` | `text` | sim |  |  |  |
| 107 | `email_pessoal` | `text` | sim |  |  |  |
| 108 | `telefone_residencial` | `text` | sim |  |  |  |
| 109 | `whatsapp` | `text` | sim |  |  |  |
| 110 | `instagram` | `text` | sim |  |  |  |
| 111 | `facebook` | `text` | sim |  |  |  |
| 112 | `linkedin` | `text` | sim |  |  |  |
| 113 | `tiktok` | `text` | sim |  |  |  |
| 114 | `conjuge_nome` | `text` | sim |  |  |  |
| 115 | `conjuge_cpf` | `text` | sim |  |  |  |
| 116 | `conjuge_data_nascimento` | `date` | sim |  |  |  |
| 117 | `conjuge_telefone` | `text` | sim |  |  |  |
| 118 | `uniforme_camiseta` | `text` | sim |  |  |  |
| 119 | `uniforme_calca` | `text` | sim |  |  |  |
| 120 | `uniforme_calcado` | `text` | sim |  |  |  |
| 121 | `tipo_salario_descricao` | `text` | sim |  |  |  |
| 122 | `jornada_horas_mensais` | `text` | sim |  |  |  |
| 123 | `experiencia_tipo` | `text` | sim |  |  |  |
| 124 | `experiencia_fim_1` | `date` | sim |  |  |  |
| 125 | `experiencia_fim_2` | `date` | sim |  |  |  |
| 126 | `cnh_data_emissao` | `date` | sim |  |  |  |
| 127 | `titulo_eleitor_uf` | `text` | sim |  |  |  |
| 128 | `reservista` | `text` | sim |  |  |  |
| 129 | `reservista_ra` | `text` | sim |  |  |  |
| 130 | `reservista_serie` | `text` | sim |  |  |  |
| 131 | `codigo_firebird` | `integer` | sim |  |  |  |
| 132 | `unidade` | `character varying` | sim |  |  |  |
| 133 | `timeman_ultimo_status` | `text` | sim |  |  |  |
| 134 | `timeman_ultima_sync` | `timestamp with time zone` | sim |  |  |  |
| 135 | `expatriado` | `boolean` | sim | `false` |  |  |
| 136 | `moeda_base` | `text` | sim | `'BRL'::text` |  |  |
| 137 | `pais_origem` | `text` | sim |  |  |  |
| 138 | `moeda` | `text` | sim | `'BRL'::text` |  |  |
| 139 | `pais_residencia_fiscal` | `text` | sim | `'Brasil'::text` |  |  |
| 140 | `data_chegada_pais` | `date` | sim |  |  |  |
| 141 | `data_saida_pais` | `date` | sim |  |  |  |
| 142 | `regime_fiscal_especial` | `boolean` | sim | `false` |  |  |
| 143 | `version` | `integer` | sim | `1` |  |  |
| 144 | `foto_referencia_url` | `text` | sim |  |  |  |
| 145 | `face_id` | `text` | sim |  |  |  |
| 146 | `cpf_hash` | `text` | sim |  |  |  |
| 147 | `cpf_last4` | `text` | sim |  |  |  |
| 148 | `cargo_id` | `uuid` | sim |  |  |  |
| 149 | `user_id` | `uuid` | sim |  |  | Conta de login vinculada. NULL = colaborador cadastrado pelo RH sem acesso ao portal. |
| 150 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_colaboradores_cpf_formato | CHECK | `CHECK (cpf IS NULL OR length(regexp_replace(cpf, '\D'::text, ''::text, 'g'::text)) = 11) NOT VALID` |  |  | não |
| chk_colaboradores_email_corp_formato | CHECK | `CHECK (email_corporativo IS NULL OR email_corporativo ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text) NOT VALID` |  |  | não |
| chk_colaboradores_email_formato | CHECK | `CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text) NOT VALID` |  |  | não |
| chk_colaboradores_email_pes_formato | CHECK | `CHECK (email_pessoal IS NULL OR email_pessoal ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text) NOT VALID` |  |  | não |
| colaboradores_cargo_id_fkey | FOREIGN KEY | `FOREIGN KEY (cargo_id) REFERENCES cargos(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| colaboradores_categoria_trabalhador_id_fkey | FOREIGN KEY | `FOREIGN KEY (categoria_trabalhador_id) REFERENCES categorias_trabalhador(id)` | NO ACTION | NO ACTION | sim |
| colaboradores_centro_custo_id_fkey | FOREIGN KEY | `FOREIGN KEY (centro_custo_id) REFERENCES centros_custo(id)` | NO ACTION | NO ACTION | sim |
| colaboradores_cpf_key | UNIQUE | `UNIQUE (cpf)` |  |  | sim |
| colaboradores_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| colaboradores_desligamento_coerente | CHECK | `CHECK (data_desligamento IS NULL OR data_desligamento >= data_admissao)` |  |  | sim |
| colaboradores_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| colaboradores_genero_documento_id_fkey | FOREIGN KEY | `FOREIGN KEY (genero_documento_id) REFERENCES generos_documento(id)` | NO ACTION | NO ACTION | sim |
| colaboradores_gestor_ferias_id_fkey | FOREIGN KEY | `FOREIGN KEY (gestor_ferias_id) REFERENCES colaboradores(id)` | NO ACTION | NO ACTION | sim |
| colaboradores_intervalo_positivo | CHECK | `CHECK (intervalo_minutos IS NULL OR intervalo_minutos >= 0)` |  |  | sim |
| colaboradores_matricula_key | UNIQUE | `UNIQUE (matricula)` |  |  | sim |
| colaboradores_nacionalidade_id_fkey | FOREIGN KEY | `FOREIGN KEY (nacionalidade_id) REFERENCES nacionalidades(id)` | NO ACTION | NO ACTION | sim |
| colaboradores_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| colaboradores_salario_nao_negativo | CHECK | `CHECK (salario_base >= 0::numeric)` |  |  | sim |
| colaboradores_supervisor_id_fkey | FOREIGN KEY | `FOREIGN KEY (supervisor_id) REFERENCES colaboradores(id)` | NO ACTION | NO ACTION | sim |
| colaboradores_tipo_pagamento_id_fkey | FOREIGN KEY | `FOREIGN KEY (tipo_pagamento_id) REFERENCES tipos_pagamento(id)` | NO ACTION | NO ACTION | sim |
| colaboradores_tipo_salario_id_fkey | FOREIGN KEY | `FOREIGN KEY (tipo_salario_id) REFERENCES tipos_salario(id)` | NO ACTION | NO ACTION | sim |
| colaboradores_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.adiantamentos_salariais | adiantamentos_salariais_colaborador_id_fkey | colaborador_id | CASCADE |
| public.afastamentos | afastamentos_colaborador_id_fkey | colaborador_id | CASCADE |
| public.ajustes_ponto | ajustes_ponto_colaborador_id_fkey | colaborador_id | CASCADE |
| public.anotacoes_colaborador | anotacoes_colaborador_colaborador_id_fkey | colaborador_id | CASCADE |
| public.asos | asos_colaborador_id_fkey | colaborador_id | CASCADE |
| public.auditoria_contratual | auditoria_contratual_colaborador_id_fkey | colaborador_id | NO ACTION |
| public.banco_horas | banco_horas_colaborador_id_fkey | colaborador_id | CASCADE |
| public.batidas_ponto | batidas_ponto_colaborador_id_fkey | colaborador_id | RESTRICT |
| public.beneficiarios_plano | beneficiarios_plano_colaborador_id_fkey | colaborador_id | CASCADE |
| public.beneficiarios_seguro | beneficiarios_seguro_colaborador_id_fkey | colaborador_id | CASCADE |
| public.beneficio_movimentacoes | beneficio_movimentacoes_colaborador_id_fkey | colaborador_id | CASCADE |
| public.beneficios | beneficios_colaborador_id_fkey | colaborador_id | CASCADE |
| public.beneficios_colaborador | beneficios_colaborador_colaborador_id_fkey | colaborador_id | CASCADE |
| public.beneficios_colaboradores | beneficios_colaboradores_colaborador_id_fkey | colaborador_id | CASCADE |
| public.cnab_itens | cnab_itens_colaborador_id_fkey | colaborador_id | SET NULL |
| public.colaborador_beneficios | colaborador_beneficios_colaborador_id_fkey | colaborador_id | CASCADE |
| public.colaboradores | colaboradores_gestor_ferias_id_fkey | gestor_ferias_id | NO ACTION |
| public.colaboradores | colaboradores_supervisor_id_fkey | supervisor_id | NO ACTION |
| public.colaboradores_pin | colaboradores_pin_colaborador_id_fkey | colaborador_id | CASCADE |
| public.contas_bancarias | contas_bancarias_colaborador_id_fkey | colaborador_id | CASCADE |
| public.contatos_emergencia | contatos_emergencia_colaborador_id_fkey | colaborador_id | CASCADE |
| public.contratos | contratos_colaborador_id_fkey | colaborador_id | CASCADE |
| public.contratos_gerados | contratos_gerados_colaborador_id_fkey | colaborador_id | CASCADE |
| public.controle_acesso | controle_acesso_colaborador_id_fkey | colaborador_id | NO ACTION |
| public.convenios_colaboradores | convenios_colaboradores_colaborador_id_fkey | colaborador_id | CASCADE |
| public.dados_estagiario | dados_estagiario_colaborador_id_fkey | colaborador_id | CASCADE |
| public.dados_estagiario | dados_estagiario_supervisor_id_fkey | supervisor_id | NO ACTION |
| public.dados_estrangeiro | dados_estrangeiro_colaborador_id_fkey | colaborador_id | CASCADE |
| public.deficiencias | deficiencias_colaborador_id_fkey | colaborador_id | CASCADE |
| public.departamentos | departamentos_responsavel_id_fkey | responsavel_id | NO ACTION |
| public.dependentes | dependentes_colaborador_id_fkey | colaborador_id | CASCADE |
| public.desligamentos | desligamentos_colaborador_id_fkey | colaborador_id | CASCADE |
| public.despesas | despesas_colaborador_id_fkey | colaborador_id | NO ACTION |
| public.documentos | documentos_colaborador_id_fkey | colaborador_id | CASCADE |
| public.documentos_assinatura | documentos_assinatura_colaborador_id_fkey | colaborador_id | CASCADE |
| public.documentos_colaborador | documentos_colaborador_colaborador_id_fkey | colaborador_id | CASCADE |
| public.documentos_pessoais_arquivos | documentos_pessoais_arquivos_colaborador_id_fkey | colaborador_id | CASCADE |
| public.emprestimos_consignados | emprestimos_consignados_colaborador_id_fkey | colaborador_id | CASCADE |
| public.epis_entregas | epis_entregas_colaborador_id_fkey | colaborador_id | RESTRICT |
| public.epis_fichas | epis_fichas_colaborador_id_fkey | colaborador_id | CASCADE |
| public.escalas_trabalho | escalas_trabalho_colaborador_id_fkey | colaborador_id | CASCADE |
| public.eventos_variaveis | eventos_variaveis_colaborador_id_fkey | colaborador_id | CASCADE |
| public.exames | exames_colaborador_id_fkey | colaborador_id | CASCADE |
| public.faltas | faltas_colaborador_id_fkey | colaborador_id | RESTRICT |
| public.feedbacks_360 | feedbacks_360_avaliado_id_fkey | avaliado_id | NO ACTION |
| public.feedbacks_360 | feedbacks_360_avaliador_id_fkey | avaliador_id | NO ACTION |
| public.ferias | ferias_colaborador_id_fkey | colaborador_id | CASCADE |
| public.ferias_programacao | ferias_programacao_colaborador_id_fkey | colaborador_id | CASCADE |
| public.ferias_solicitacoes | ferias_solicitacoes_colaborador_id_fkey | colaborador_id | CASCADE |
| public.folha_auditoria | folha_auditoria_colaborador_id_fkey | colaborador_id | CASCADE |
| public.folha_itens | folha_itens_colaborador_id_fkey | colaborador_id | NO ACTION |
| public.formacoes_academicas | formacoes_academicas_colaborador_id_fkey | colaborador_id | CASCADE |
| public.historico_cargo | historico_cargo_colaborador_id_fkey | colaborador_id | CASCADE |
| public.historico_contratos | historico_contratos_colaborador_id_fkey | colaborador_id | CASCADE |
| public.historico_salarial | historico_salarial_colaborador_id_fkey | colaborador_id | CASCADE |
| public.holerites | holerites_colaborador_id_fkey | colaborador_id | CASCADE |
| public.inscricoes_cursos | inscricoes_cursos_colaborador_id_fkey | colaborador_id | NO ACTION |
| public.itens_folha | itens_folha_colaborador_id_fkey | colaborador_id | CASCADE |
| public.lgpd_consentimentos | lgpd_consentimentos_colaborador_id_fkey | colaborador_id | NO ACTION |
| public.lgpd_solicitacoes | lgpd_solicitacoes_colaborador_id_fkey | colaborador_id | NO ACTION |
| public.lotacoes | lotacoes_colaborador_id_fkey | colaborador_id | CASCADE |
| public.medidas_disciplinares | medidas_disciplinares_colaborador_id_fkey | colaborador_id | RESTRICT |
| public.medidas_disciplinares_integracao | medidas_disciplinares_integracao_colaborador_id_fkey | colaborador_id | CASCADE |
| public.metas_okrs | metas_okrs_colaborador_id_fkey | colaborador_id | NO ACTION |
| public.onboarding_colaborador | onboarding_colaborador_colaborador_id_fkey | colaborador_id | CASCADE |
| public.pdi_plano_desenvolvimento | pdi_plano_desenvolvimento_colaborador_id_fkey | colaborador_id | CASCADE |
| public.pdis | pdis_colaborador_id_fkey | colaborador_id | NO ACTION |
| public.pensoes | pensoes_colaborador_id_fkey | colaborador_id | CASCADE |
| public.periodos_aquisitivos | periodos_aquisitivos_colaborador_id_fkey | colaborador_id | CASCADE |
| public.periodos_experiencia | periodos_experiencia_colaborador_id_fkey | colaborador_id | CASCADE |
| public.pesquisas_respostas | pesquisas_respostas_colaborador_id_fkey | colaborador_id | NO ACTION |
| public.pix_itens | pix_itens_colaborador_id_fkey | colaborador_id | SET NULL |
| public.planos_saude | planos_saude_colaborador_id_fkey | colaborador_id | CASCADE |
| public.ponto_espelhos_assinados | ponto_espelhos_assinados_colaborador_id_fkey | colaborador_id | NO ACTION |
| public.ponto_seguranca_blacklist | ponto_seguranca_blacklist_colaborador_id_fkey | colaborador_id | NO ACTION |
| public.premiacoes_pagamentos | premiacoes_pagamentos_colaborador_id_fkey | colaborador_id | CASCADE |
| public.promocoes | promocoes_colaborador_id_fkey | colaborador_id | CASCADE |
| public.provisoes_folha | provisoes_folha_colaborador_id_fkey | colaborador_id | CASCADE |
| public.provisoes_mensais | provisoes_mensais_colaborador_id_fkey | colaborador_id | CASCADE |
| public.recargas_vale | recargas_vale_colaborador_id_fkey | colaborador_id | CASCADE |
| public.registros_ponto | registros_ponto_colaborador_id_fkey | colaborador_id | CASCADE |
| public.seguros_colaboradores | seguros_colaboradores_colaborador_id_fkey | colaborador_id | CASCADE |
| public.seguros_vida | seguros_vida_colaborador_id_fkey | colaborador_id | CASCADE |
| public.sinistros_seguro | sinistros_seguro_colaborador_id_fkey | colaborador_id | CASCADE |
| public.solicitacoes_ajuste_ponto | solicitacoes_ajuste_ponto_colaborador_id_fkey | colaborador_id | CASCADE |
| public.solicitacoes_hora_extra | solicitacoes_hora_extra_colaborador_id_fkey | colaborador_id | CASCADE |
| public.sst_cat | sst_cat_colaborador_id_fkey | colaborador_id | CASCADE |
| public.sst_exposicao_riscos | sst_exposicao_riscos_colaborador_id_fkey | colaborador_id | CASCADE |
| public.sst_incidentes | sst_incidentes_colaborador_id_fkey | colaborador_id | SET NULL |
| public.sst_ordens_servico | sst_ordens_servico_colaborador_id_fkey | colaborador_id | SET NULL |
| public.sst_regimento_assinaturas | sst_regimento_assinaturas_colaborador_id_fkey | colaborador_id | CASCADE |
| public.times | times_lider_id_fkey | lider_id | NO ACTION |
| public.transferencias | transferencias_colaborador_id_fkey | colaborador_id | CASCADE |
| public.treinamento_certificados | treinamento_certificados_colaborador_id_fkey | colaborador_id | CASCADE |
| public.treinamento_instancias | treinamento_instancias_instrutor_id_fkey | instrutor_id | NO ACTION |
| public.treinamento_participantes | treinamento_participantes_colaborador_id_fkey | colaborador_id | CASCADE |
| public.vales_alimentacao | vales_alimentacao_colaborador_id_fkey | colaborador_id | CASCADE |
| public.vales_transporte | vales_transporte_colaborador_id_fkey | colaborador_id | CASCADE |
| public.valores_campos_customizados | valores_campos_customizados_colaborador_id_fkey | colaborador_id | CASCADE |
| public.vinculos | vinculos_colaborador_id_fkey | colaborador_id | CASCADE |
| public.whatsapp_mensagens_logs | whatsapp_mensagens_logs_colaborador_id_fkey | colaborador_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| colaboradores_cpf_key | btree | cpf | sim | sim |  | `CREATE UNIQUE INDEX colaboradores_cpf_key ON public.colaboradores USING btree (cpf)` |
| colaboradores_empresa_cpf_key | btree | empresa_id, cpf | sim | sim |  | `CREATE UNIQUE INDEX colaboradores_empresa_cpf_key ON public.colaboradores USING btree (empresa_id, cpf)` |
| colaboradores_empresa_email_key | btree | empresa_id, email | sim | sim |  | `CREATE UNIQUE INDEX colaboradores_empresa_email_key ON public.colaboradores USING btree (empresa_id, email)` |
| colaboradores_empresa_matricula_key | btree | empresa_id, matricula | sim | sim |  | `CREATE UNIQUE INDEX colaboradores_empresa_matricula_key ON public.colaboradores USING btree (empresa_id, matricula)` |
| colaboradores_matricula_key | btree | matricula | sim | sim |  | `CREATE UNIQUE INDEX colaboradores_matricula_key ON public.colaboradores USING btree (matricula)` |
| colaboradores_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX colaboradores_pkey ON public.colaboradores USING btree (id)` |
| colaboradores_user_id_empresa_uniq | btree | user_id, empresa_id | sim | sim | `(user_id IS NOT NULL)` | `CREATE UNIQUE INDEX colaboradores_user_id_empresa_uniq ON public.colaboradores USING btree (user_id, empresa_id) WHERE (user_id IS NOT NULL)` |
| colaboradores_user_id_idx | btree | user_id | não | sim | `(user_id IS NOT NULL)` | `CREATE INDEX colaboradores_user_id_idx ON public.colaboradores USING btree (user_id) WHERE (user_id IS NOT NULL)` |
| idx_colab_supervisor | btree | supervisor_id | não | sim |  | `CREATE INDEX idx_colab_supervisor ON public.colaboradores USING btree (supervisor_id)` |
| idx_colaboradores_cargo_id | btree | cargo_id | não | sim | `(cargo_id IS NOT NULL)` | `CREATE INDEX idx_colaboradores_cargo_id ON public.colaboradores USING btree (cargo_id) WHERE (cargo_id IS NOT NULL)` |
| idx_colaboradores_categoria_trabalhador_id | btree | categoria_trabalhador_id | não | sim |  | `CREATE INDEX idx_colaboradores_categoria_trabalhador_id ON public.colaboradores USING btree (categoria_trabalhador_id)` |
| idx_colaboradores_centro_custo_id | btree | centro_custo_id | não | sim |  | `CREATE INDEX idx_colaboradores_centro_custo_id ON public.colaboradores USING btree (centro_custo_id)` |
| idx_colaboradores_cpf | btree | cpf | não | sim | `(cpf IS NOT NULL)` | `CREATE INDEX idx_colaboradores_cpf ON public.colaboradores USING btree (cpf) WHERE (cpf IS NOT NULL)` |
| idx_colaboradores_cpf_last4 | btree | cpf_last4 | não | sim | `(cpf_last4 IS NOT NULL)` | `CREATE INDEX idx_colaboradores_cpf_last4 ON public.colaboradores USING btree (cpf_last4) WHERE (cpf_last4 IS NOT NULL)` |
| idx_colaboradores_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_colaboradores_created_by ON public.colaboradores USING btree (created_by)` |
| idx_colaboradores_empresa | btree | empresa_id | não | sim |  | `CREATE INDEX idx_colaboradores_empresa ON public.colaboradores USING btree (empresa_id)` |
| idx_colaboradores_empresa_ativos | btree | empresa_id, created_at | não | sim | `(status = 'ativo'::status_colaborador)` | `CREATE INDEX idx_colaboradores_empresa_ativos ON public.colaboradores USING btree (empresa_id, created_at DESC) WHERE (status = 'ativo'::status_colaborador)` |
| idx_colaboradores_empresa_created | btree | empresa_id, created_at | não | sim |  | `CREATE INDEX idx_colaboradores_empresa_created ON public.colaboradores USING btree (empresa_id, created_at DESC)` |
| idx_colaboradores_empresa_status | btree | empresa_id, status | não | sim |  | `CREATE INDEX idx_colaboradores_empresa_status ON public.colaboradores USING btree (empresa_id, status)` |
| idx_colaboradores_genero_documento_id | btree | genero_documento_id | não | sim |  | `CREATE INDEX idx_colaboradores_genero_documento_id ON public.colaboradores USING btree (genero_documento_id)` |
| idx_colaboradores_gestor_ferias_id | btree | gestor_ferias_id | não | sim |  | `CREATE INDEX idx_colaboradores_gestor_ferias_id ON public.colaboradores USING btree (gestor_ferias_id)` |
| idx_colaboradores_local_trabalho_id | btree | local_trabalho_id | não | sim |  | `CREATE INDEX idx_colaboradores_local_trabalho_id ON public.colaboradores USING btree (local_trabalho_id)` |
| idx_colaboradores_nacionalidade_id | btree | nacionalidade_id | não | sim |  | `CREATE INDEX idx_colaboradores_nacionalidade_id ON public.colaboradores USING btree (nacionalidade_id)` |
| idx_colaboradores_tipo_pagamento_id | btree | tipo_pagamento_id | não | sim |  | `CREATE INDEX idx_colaboradores_tipo_pagamento_id ON public.colaboradores USING btree (tipo_pagamento_id)` |
| idx_colaboradores_tipo_salario_id | btree | tipo_salario_id | não | sim |  | `CREATE INDEX idx_colaboradores_tipo_salario_id ON public.colaboradores USING btree (tipo_salario_id)` |
| ux_colaboradores_cpf_hash | btree | cpf_hash | sim | sim | `(cpf_hash IS NOT NULL)` | `CREATE UNIQUE INDEX ux_colaboradores_cpf_hash ON public.colaboradores USING btree (cpf_hash) WHERE (cpf_hash IS NOT NULL)` |


## Policies (RLS)

### `Colaborador vê o próprio cadastro`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_id = auth.uid())` |
| WITH CHECK |  |

### `colaboradores_rh_manage`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pode_gerir_rh(empresa_id)` |
| WITH CHECK | `pode_gerir_rh(empresa_id)` |

### `colaboradores_tenant_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pertence_a_empresa(empresa_id)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| audit_colaboradores | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.log_audit_change |
| tr_audit_colaboradores | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.process_audit_log |
| tr_auto_start_workflow_on_hiring | AFTER | INSERT | ROW | enabled | public.fn_start_workflow_on_colaborador_create |
| tr_increment_version_colab | BEFORE | UPDATE | ROW | enabled | public.increment_version |
| tr_whatsapp_on_new_hiring | AFTER | INSERT | ROW | enabled | public.fn_trigger_whatsapp_on_event |
| trg_audit_colaboradores | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.process_audit_log |
| trg_colab_cpf_hash | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_colab_cpf_hash |
| trigger_lgpd_limpeza_desligamento | AFTER | UPDATE | ROW | enabled | public.agendar_limpeza_pos_desligamento |
| update_colaboradores_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
