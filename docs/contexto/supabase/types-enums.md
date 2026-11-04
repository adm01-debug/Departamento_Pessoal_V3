# Tipos customizados (enums, domains, composites)

| tipo | kind | valores / definição | usado em |
|---|---|---|---|
| public.dp_timestamp | domain | timestamp with time zone NOT NULL |  |
| public.dp_uuid | domain | uuid |  |
| public.app_role | enum | admin, gestor, rh, user | public.permissions.role, public.user_roles.role |
| public.dp_pii_sensitivity | enum | publico, interno, confidencial, sensivel, critico | public.dp_data_catalog.sensitivity |
| public.dp_user_role | enum | colaborador, gestor, rh, auditoria, admin, dpo | public.dp_user_roles.role |
| public.escolaridade | enum | fundamental_incompleto, fundamental_completo, medio_incompleto, medio_completo, superior_incompleto, superior_completo, pos_graduacao, mestrado, doutorado | public.colaboradores.escolaridade |
| public.estado_civil | enum | solteiro, casado, divorciado, viuvo, separado, uniao_estavel | public.colaboradores.estado_civil |
| public.etapa_admissao | enum | solicitacao, documentos, validacao, pendente, exame, contrato, assinatura, esocial, concluida, cancelada | public.admissoes.etapa |
| public.programacao_ferias_status | enum | rascunho, sugerido_gestor, aprovado_gestor, aprovado_rh, convertido, rejeitado, cancelado | public.ferias_programacao.status |
| public.regime_tributario | enum | simples_nacional, lucro_presumido, lucro_real, mei | public.empresas.regime_tributario |
| public.sexo | enum | masculino, feminino | public.colaboradores.sexo |
| public.status_afastamento | enum | ativo, encerrado, cancelado, prorrogado | public.afastamentos.status |
| public.status_colaborador | enum | ativo, ferias, afastado, desligado, pendente | public.colaboradores.status, public.vw_cadastro_incompleto.status, public.vw_colaboradores_completo.status |
| public.status_folha | enum | aberta, calculada, fechada, paga | public.folhas_pagamento.status |
| public.tipo_afastamento | enum | doenca, acidente_trabalho, acidente_trajeto, licenca_maternidade, licenca_paternidade, licenca_casamento, licenca_obito, licenca_nao_remunerada, servico_militar, mandato_sindical, suspensao_disciplinar, outros | public.afastamentos.tipo, public.config_afastamentos.tipo |
| public.tipo_conta | enum | corrente, poupanca, salario | public.colaboradores.tipo_conta |
| public.tipo_contrato | enum | clt, pj, estagiario, temporario, intermitente, aprendiz | public.colaboradores.tipo_contrato |
| public.tipo_desligamento | enum | sem_justa_causa, justa_causa, pedido_demissao, acordo, fim_contrato, falecimento | public.desligamentos.tipo |
| public.tipo_evento_folha | enum | provento, desconto, informativo | public.lancamentos_folha.tipo, public.rubricas_folha.tipo |
