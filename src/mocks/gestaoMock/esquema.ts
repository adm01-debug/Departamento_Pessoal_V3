/**
 * ESQUEMA GERADO — NÃO EDITAR À MÃO.
 *
 * Extraído de `src/integrations/supabase/types.ts` (tipos gerados pelo
 * Supabase) por `scripts/gerar-esquema-mock.mjs`. Serve só ao gerador de
 * fixtures do mock de demonstração: dá o nome e o tipo "grosseiro" de cada
 * coluna (id | numero | booleano | data | competencia | json | lista | texto)
 * para que as linhas fictícias tenham o formato que as telas esperam.
 *
 * Regenerar: node scripts/gerar-esquema-mock.mjs
 */

export type TipoColuna = 'id' | 'numero' | 'booleano' | 'data' | 'competencia' | 'json' | 'lista' | 'texto';

/** tabela → "coluna:tipo,coluna:tipo,..." (compacto de propósito: são ~350 tabelas). */
export const ESQUEMA_TABELAS: Record<string, string> = {
  adiantamentos_salariais:
    'aprovado_por:texto,colaborador_id:id,competencia_desconto:competencia,created_at:data,data_pagamento:data,data_solicitacao:data,empresa_id:id,id:id,motivo:texto,status:texto,updated_at:data,valor_solicitado:numero',
  admissao_tokens:
    'admissao_id:id,assinado_em:data,assinatura_base64:texto,assinatura_url:texto,contrato_assinado:booleano,contrato_gerado:booleano,created_at:data,dados_preenchidos:booleano,data_expiracao:data,documentos_enviados:booleano,email_candidato:texto,id:id,ip_assinatura:texto,telefone_candidato:texto,token:texto,updated_at:data',
  admissoes:
    'cargo:texto,checklist_comprovante_endereco:booleano,checklist_contrato_assinado:booleano,checklist_ctps:booleano,checklist_documentos_pessoais:booleano,checklist_esocial_enviado:booleano,checklist_exame_admissional:booleano,checklist_foto:booleano,cpf:texto,created_at:data,created_by:texto,data_nascimento:data,data_prevista:data,data_transmissao_esocial:data,departamento:texto,email:texto,empresa_id:id,estado_civil:texto,etapa:texto,id:id,metadata:json,nome:texto,nome_mae:texto,observacoes:texto,protocolo_esocial:texto,salario_proposto:numero,sexo:texto,status_esocial:texto,telefone:texto,template_contrato_id:id,updated_at:data',
  aej_geracoes:
    'colaboradores_sem_pis:numero,created_at:data,empresa_id:id,erro:texto,gerado_por:texto,hash_sha256:texto,id:id,periodo_fim:texto,periodo_inicio:texto,status:texto,tamanho_bytes:numero,total_colaboradores:numero,total_marcacoes:numero',
  afastamentos:
    'aprovado_em:data,aprovado_por:texto,atestado_numero:texto,cid:texto,cid_descricao:texto,cid_id:id,colaborador_id:id,created_at:data,created_by:texto,crm_medico:texto,data_fim_prevista:data,data_fim_real:data,data_inicio:data,data_pericia:data,dias_empresa:numero,dias_inss:numero,dias_total:numero,empresa_id:id,hash_integridade:texto,id:id,local_pericia:texto,medico_crm:texto,medico_nome:texto,motivo_rejeicao:texto,nome_medico:texto,numero_beneficio:texto,observacoes:texto,rejeitado_em:data,rejeitado_por:texto,status:texto,tipo:texto,updated_at:data',
  afdt_divergencias:
    'batida_id:id,colaborador_id:id,created_at:data,data_hora_afdt:data,delta_segundos:numero,empresa_id:id,id:id,importacao_id:id,observacao:texto,pis:texto,registro_raw_id:id,resolvido:booleano,tipo:texto',
  afdt_importacoes:
    'cnpj_empregador:texto,created_at:data,data_final:data,data_inicial:data,empresa_id:id,hash_sha256:texto,id:id,importado_por:texto,mensagem_erro:texto,metadata:json,nome_arquivo:texto,status:texto,tamanho_bytes:numero,tipo:texto,total_erros:numero,total_linhas:numero,total_registros:numero,updated_at:data',
  afdt_registros_raw:
    'colaborador_id:id,conteudo_original:texto,cpf:texto,created_at:data,data_hora_marcacao:data,empresa_id:id,erro:texto,id:id,importacao_id:id,linha_numero:numero,nsr:numero,pis:texto,tipo_registro:texto',
  ajustes_ponto:
    'aprovado_em:data,aprovado_por:texto,campo_alterado:texto,colaborador_id:id,created_at:data,created_by:texto,id:id,motivo:texto,registro_ponto_id:id,status:texto,valor_anterior:texto,valor_novo:texto',
  anotacoes_colaborador:
    'colaborador_id:id,conteudo:texto,created_at:data,created_by:texto,data:texto,id:id,tipo:texto,titulo:texto,updated_at:data',
  asos: 'agendamento_id:id,arquivo_url:texto,assinado_em:data,assinatura_medico_hash:texto,clinica:texto,clinica_partner_id:id,colaborador_id:id,created_at:data,data_exame:data,data_validade:data,emitido_por_partner_user:texto,empresa_id:id,hash_integridade:texto,id:id,medico_crm:texto,medico_nome:texto,motivo_cancelamento:texto,observacoes:texto,recebido_rh_em:data,recebido_rh_por:texto,restricao_data_fim:texto,restricoes:json,restricoes_descricao:texto,resultado:texto,status:texto,tipo:texto,updated_at:data,validado_em:data,validado_por:texto',
  audit_log:
    'acao:texto,campos_alterados:lista,created_at:data,dados_anteriores:json,dados_novos:json,id:id,ip_address:texto,registro_id:id,tabela:texto,user_agent:texto,user_email:texto,user_id:id',
  audit_log_unified:
    'action:texto,empresa_id:id,entity:texto,entity_id:id,id:id,ingested_at:data,ip_address:texto,occurred_at:data,payload:json,source_id:id,source_table:texto,user_agent:texto,user_id:id',
  audit_log_unified_archive:
    'action:texto,empresa_id:id,entity:texto,entity_id:id,id:id,ingested_at:data,ip_address:texto,occurred_at:data,payload:json,source_id:id,source_table:texto,user_agent:texto,user_id:id',
  audit_logs:
    'action:texto,created_at:data,empresa_id:id,entity:texto,entity_id:id,id:id,ip_address:texto,new_values:json,old_values:json,user_agent:texto,user_email:texto,user_id:id',
  auditoria:
    'acao:texto,created_at:data,dados_anteriores:json,dados_novos:json,descricao:texto,empresa_id:id,entidade:texto,entidade_id:id,id:id,ip_address:texto,usuario_id:id,usuario_nome:texto',
  auditoria_contratual:
    'alterado_por:texto,campo_alterado:texto,colaborador_id:id,created_at:data,id:id,valor_antigo:texto,valor_novo:texto',
  auditoria_logs:
    'acao:texto,created_at:data,dados_anteriores:json,dados_novos:json,descricao:texto,empresa_id:id,entidade:texto,entidade_id:id,id:id,ip_address:texto,user_email:texto,user_id:id',
  auth_gov_br_sessions:
    'access_token:texto,cpf:texto,created_at:data,id:id,id_token:texto,metadata:json,nivel_autenticacao:texto,updated_at:data,user_id:id',
  automacao_logs: 'created_at:data,detalhes:json,entidade_id:id,id:id,status:texto,tipo_evento:texto,workflow_id:id',
  banco_horas:
    'colaborador_id:id,created_at:data,created_by:texto,data:texto,empresa_id:id,horas:texto,id:id,motivo:texto,registro_ponto_id:id,saldo_anterior:texto,saldo_atual:texto,tipo:texto',
  banco_horas_config:
    'acordo_tipo:texto,alerta_saldo_negativo_horas:numero,compensacao_automatica:booleano,created_at:data,empresa_id:id,id:id,prazo_meses:numero,saldo_maximo_horas:numero,updated_at:data',
  batidas_ponto:
    'ajustado:booleano,ajustado_por:texto,anomalia_detectada:booleano,biometria_score:numero,biometria_status:texto,colaborador_id:id,created_at:data,data:texto,dentro_raio:booleano,device_metadata:json,dispositivo_id:id,distancia_local_metros:numero,empresa_id:id,foto_biometria_url:texto,hash_biometrico:texto,hash_comprovante:texto,hash_digital:texto,hash_integridade:texto,hora:texto,id:id,id_fiscal_ponto:texto,ip_address:texto,is_offline:booleano,justificativa_anomalia:texto,latitude:numero,longitude:numero,motivo_ajuste:texto,offline:booleano,offset_timezone:numero,ordem:numero,origem:texto,precisao_metros:numero,sync_at:data,timestamp_dispositivo:texto,timezone:texto,tipo:texto,updated_at:data,versao_app:texto',
  beneficiarios_plano:
    'colaborador_id:id,cpf:texto,created_at:data,data_carencia:data,data_exclusao:data,data_inclusao:data,id:id,nome:texto,parentesco:texto,plano_saude_id:id,status:texto,tipo:texto',
  beneficiarios_seguro:
    'colaborador_id:id,cpf:texto,created_at:data,id:id,nome:texto,parentesco:texto,percentual:numero,seguro_vida_id:id,status:texto',
  beneficio_arquivos:
    'beneficio_id:id,created_at:data,empresa_id:id,id:id,nome:texto,periodo_referencia:texto,tipo_arquivo:texto,url:texto',
  beneficio_movimentacoes:
    'beneficio_id:id,colaborador_id:id,created_at:data,data_movimentacao:data,id:id,motivo:texto,tipo_movimentacao:texto,usuario_id:id',
  beneficio_regras_elegibilidade:
    'automatico:booleano,beneficio_id:id,cargo_id:id,created_at:data,departamento_id:id,empresa_id:id,id:id,tempo_casa_minimo:numero,updated_at:data',
  beneficio_utilizacao:
    'beneficio_colaborador_id:id,created_at:data,data_uso:data,estabelecimento:texto,id:id,protocolo_autorizacao:texto,valor_desconto_folha:numero,valor_total:numero',
  beneficios:
    'ativo:booleano,carencia_dias:numero,categoria:texto,codigo_esocial:texto,colaborador_id:id,created_at:data,data_fim:data,data_inicio:data,descricao:texto,empresa_id:id,exige_anexo_comprovante:booleano,id:id,metodo_pagamento:texto,nome:texto,obrigatorio_por_lei:booleano,observacoes:texto,operadora:texto,percentual_subsidio_empresa:numero,status:texto,teto_coparticipacao:numero,tipo:texto,updated_at:data,valor:numero,valor_colaborador:numero,valor_empresa:numero',
  beneficios_colaborador:
    'ativo:booleano,colaborador_id:id,created_at:data,created_by:texto,data_fim:data,data_inicio:data,data_validacao_rh:data,desconto:numero,hash_autorizacao:texto,id:id,ip_adesao:texto,motivo_suspensao:texto,observacoes:texto,status_vinculo:texto,tipo_beneficio_id:id,updated_at:data,valor:numero',
  beneficios_colaboradores:
    'ativo:booleano,beneficio_id:id,colaborador_id:id,created_at:data,data_fim:data,data_inicio:data,id:id,valor_customizado:numero',
  bitrix24_config:
    'created_at:data,dias_semana:lista,habilitado:booleano,horario_fim:texto,horario_inicio:texto,id:numero,intervalo_minutos:numero,max_tentativas:numero,notificar_erros:booleano,notificar_sucesso:booleano,proxima_execucao:texto,sync_cargos:booleano,sync_colaboradores:booleano,sync_departamentos:booleano,ultima_execucao:texto,updated_at:data,webhook_url:texto',
  bitrix24_sync_logs:
    'conflitos:numero,created_at:data,detalhes:json,direcao:texto,erros:numero,id:id,registros_erro:numero,registros_processados:numero,registros_sucesso:numero,sucesso:numero,tipo:texto',
  blocked_ips:
    'blocked_at:data,blocked_by:texto,created_at:data,expires_at:data,id:id,ip_address:texto,permanent:booleano,reason:texto,updated_at:data',
  campos_customizados:
    'ativo:booleano,created_at:data,empresa_id:id,id:id,nome:texto,obrigatorio:booleano,opcoes:json,ordem:numero,secao:texto,tipo:texto,updated_at:data',
  canal_etica:
    'anonimo:booleano,categoria:texto,created_at:data,descricao:texto,empresa_id:id,id:id,prioridade:texto,protocolo:texto,resposta:texto,status:texto,updated_at:data',
  candidatos:
    'cpf:texto,created_at:data,curriculo_url:texto,email:texto,empresa_id:id,experiencia_anos:numero,formacao:texto,id:id,linkedin:texto,nome:texto,observacoes:texto,origem:texto,pretensao_salarial:numero,telefone:texto,updated_at:data',
  candidaturas:
    'candidato_id:id,created_at:data,data_entrevista:data,data_proxima_etapa:data,empresa_id:id,entrevistador:texto,etapa:texto,feedback:texto,feedback_ia:texto,historico_etapas:json,id:id,motivo_rejeicao:texto,nota_geral:numero,status:texto,updated_at:data,vaga_id:id',
  cargo_faixas_salariais:
    'cargo_id:id,created_at:data,id:id,nivel:texto,updated_at:data,valor_maximo:numero,valor_minimo:numero',
  cargos:
    'ativo:booleano,cbo:texto,created_at:data,departamento_id:id,descricao:texto,empresa_id:id,id:id,nivel_hierarquico:numero,nome:texto,requisitos:texto,salario_base:numero,updated_at:data,version:numero',
  catalogo_cursos:
    'ativo:booleano,carga_horaria:numero,categoria:texto,created_at:data,descricao:texto,empresa_id:id,id:id,modalidade:texto,nome:texto,nr_relacionada:texto,obrigatorio:booleano,updated_at:data',
  catalogo_infracoes:
    'artigo_clt_sugerido:texto,ativo:booleano,codigo:texto,created_at:data,descricao:texto,dias_suspensao_sugerido:numero,empresa_id:id,gravidade:texto,id:id,tipo_sugerido:texto,updated_at:data',
  categorias_trabalhador: 'codigo_esocial:texto,created_at:data,id:numero,nome:texto',
  centros_custo:
    'ativo:booleano,codigo:texto,created_at:data,descricao:texto,empresa_id:id,id:id,nome:texto,updated_at:data',
  certificados_digitais:
    'arquivo_base64:texto,ativo:booleano,cnpj_cpf:texto,created_at:data,empresa_id:id,id:id,issuer:texto,senha_encriptada:texto,subject:texto,thumbprint:texto,valid_from:texto,valid_to:texto',
  ciclos_avaliacao:
    'created_at:data,data_fim:data,data_inicio:data,descricao:texto,empresa_id:id,id:id,nome:texto,status:texto,tipo:texto,updated_at:data',
  cid10: 'codigo:texto,created_at:data,descricao:texto,id:id',
  ciencia_rate_limits: 'created_at:data,id:id,identifier:texto,ip_address:texto,rpc_name:texto,success:booleano',
  clinicas_partners:
    'aceita_convenio:booleano,bairro:texto,cep:texto,cidade:texto,cnpj:texto,complemento:texto,created_at:data,created_by:texto,crm_responsavel:texto,email:texto,empresa_id:id,especialidades:lista,geo_lat:numero,geo_lng:numero,id:id,logradouro:texto,nome_fantasia:texto,numero:texto,observacoes:texto,rating:numero,razao_social:texto,responsavel_tecnico:texto,sla_medio_min:numero,status:texto,telefone:texto,tipos_exame:lista,uf:texto,updated_at:data',
  clinicas_partners_horarios:
    'ativo:booleano,capacidade_por_slot:numero,clinica_id:id,created_at:data,dia_semana:numero,hora_abertura:texto,hora_fechamento:texto,id:id,intervalo_slot_min:numero,updated_at:data',
  clinicas_partners_servicos:
    'ativo:booleano,clinica_id:id,created_at:data,id:id,prazo_resultado_dias:numero,preco:numero,tipo_exame:texto,updated_at:data',
  cnab_configuracoes:
    'agencia:texto,agencia_digito:texto,banco_codigo:texto,codigo_empresa:texto,conta:texto,conta_digito:texto,convenio:texto,created_at:data,empresa_id:id,id:id,nome_empresa:texto,updated_at:data',
  cnab_itens:
    'agencia_favorecido:texto,banco_favorecido:texto,codigo_ocorrencia:texto,colaborador_id:id,conta_favorecido:texto,cpf_cnpj_favorecido:texto,created_at:data,data_pagamento:data,folha_item_id:id,id:id,mensagem_ocorrencia:texto,nome_favorecido:texto,remessa_id:id,seu_numero:texto,status:texto,tipo_pagamento:texto,valor_pagamento:numero',
  cnab_remessas:
    'arquivo_url:texto,banco_codigo:texto,created_at:data,data_geracao:data,empresa_id:id,hash_integridade:texto,id:id,sequencial_arquivo:numero,status:texto,total_pagamentos:numero,updated_at:data,valor_total:numero',
  colaborador_beneficios: 'beneficio_id:id,colaborador_id:id,created_at:data,id:id',
  colaboradores:
    'agencia:texto,aposentado:booleano,bairro:texto,banco_codigo:texto,banco_nome:texto,bitrix_id:id,bitrix_sync_status:texto,bitrix_ultima_sync:texto,cargo:texto,cargo_confianca:booleano,cargo_id:id,categoria_trabalhador:texto,categoria_trabalhador_id:numero,cbo:texto,celular:texto,centro_custo:texto,centro_custo_id:id,cep:texto,certificado_reservista:texto,cidade:texto,cipa:booleano,cnh_categoria:texto,cnh_data_emissao:texto,cnh_numero:texto,cnh_validade:texto,codigo_firebird:numero,complemento:texto,conjuge_cpf:texto,conjuge_data_nascimento:texto,conjuge_nome:texto,conjuge_telefone:texto,conselho_profissional:texto,conta:texto,cpf:texto,cpf_hash:texto,cpf_last4:texto,created_at:data,created_by:texto,ctps_data_emissao:texto,ctps_numero:texto,ctps_serie:texto,ctps_uf:texto,cursos_certificacoes:texto,data_admissao:data,data_chegada_pais:data,data_desligamento:data,data_exame_admissional:data,data_nascimento:data,data_saida_pais:data,data_senioridade:data,departamento:texto,email:texto,email_corporativo:texto,email_pessoal:texto,empresa_id:id,escolaridade:texto,estado_civil:texto,etnia:texto,expatriado:booleano,experiencia_fim_1:texto,experiencia_fim_2:texto,experiencia_tipo:texto,face_id:id,facebook:texto,formacao:texto,foto_referencia_url:texto,foto_url:texto,genero_documento_id:numero,gestor_ferias_id:id,horario_entrada:texto,horario_saida:texto,id:id,identidade_genero:texto,identificador_tipo:texto,identificador_validade:texto,inscricao_orgao_classe:texto,instagram:texto,intervalo_minutos:numero,jornada_horas_mensais:texto,jornada_semanal:numero,linkedin:texto,local_trabalho:texto,local_trabalho_id:id,logradouro:texto,matricula:texto,moeda:texto,moeda_base:texto,nacionalidade:texto,nacionalidade_id:numero,naturalidade_cidade:texto,naturalidade_uf:texto,nome_completo:texto,nome_mae:texto,nome_nascimento:texto,nome_pai:texto,nome_social:texto,numero:texto,observacoes:texto,pais_nascimento:texto,pais_origem:texto,pais_residencia_fiscal:texto,pis_pasep:texto,pix_chave:texto,pix_tipo:texto,primeiro_emprego:booleano,pronomes:texto,regime_fiscal_especial:booleano,reservista:texto,reservista_ra:texto,reservista_serie:texto,rg:texto,rg_data_emissao:texto,rg_data_validade:texto,rg_orgao_emissor:texto,rg_uf:texto,salario_base:numero,seguro_desemprego:booleano,sexo:texto,status:texto,supervisor_id:id,telefone:texto,telefone_residencial:texto,tiktok:texto,time_id:id,timeman_ultima_sync:texto,timeman_ultimo_status:texto,tipo_admissao:texto,tipo_conta:texto,tipo_contrato:texto,tipo_estabilidade:texto,tipo_pagamento:texto,tipo_pagamento_id:numero,tipo_salario:texto,tipo_salario_descricao:texto,tipo_salario_id:numero,tipo_sanguineo:texto,titulo_eleitor:texto,titulo_eleitor_uf:texto,titulo_secao:texto,titulo_zona:texto,uf:texto,unidade:texto,uniforme_calca:texto,uniforme_calcado:texto,uniforme_camiseta:texto,updated_at:data,user_id:id,version:numero,whatsapp:texto',
  competencias_config:
    'ativo:booleano,categoria:texto,created_at:data,descricao:texto,empresa_id:id,id:id,nivel_esperado:numero,nome:texto',
  competencias_matriz:
    'ativo:booleano,categoria:texto,created_at:data,descricao:texto,empresa_id:id,id:id,nivel_esperado:numero,nome:texto,updated_at:data',
  comunicados:
    'ativo:booleano,conteudo:texto,created_at:data,created_by:texto,data_expiracao:data,data_publicacao:data,empresa_id:id,id:id,prioridade:numero,tipo:texto,titulo:texto',
  comunicados_leituras: 'comunicado_id:id,id:id,lido_em:data,usuario_id:id',
  condicoes_ingresso: 'created_at:data,id:numero,nome:texto',
  config_afastamentos:
    'created_at:data,descricao:texto,dias_empresa_maximo:numero,dias_maximos:numero,dias_minimos:numero,exige_cid:booleano,id:id,pago_empresa:booleano,pago_inss:booleano,tipo:texto',
  config_alertas_indicadores:
    'created_at:data,id:id,limite_atencao:numero,limite_critico:numero,tipo:texto,updated_at:data',
  configuracoes:
    'chave:texto,created_at:data,id:id,updated_at:data,valor:json,vapid_private_key:texto,vapid_public_key:texto',
  configuracoes_alertas: 'ativa:booleano,email_notificacao:texto,id:id,metrica:texto,threshold:numero',
  configuracoes_esocial: 'ambiente:texto,certificado_id:id,created_at:data,empresa_id:id,id:id,updated_at:data',
  configuracoes_intervalo:
    'ativo:booleano,created_at:data,duracao_minutos:numero,empresa_id:id,horario_fim_permitido:texto,horario_inicio_permitido:texto,id:id,nome:texto,obrigatorio:booleano,tipo:texto,updated_at:data',
  configuracoes_ponto:
    'created_at:data,empresa_id:id,exige_geolocalizacao:booleano,exige_reconhecimento_facial:booleano,id:id,intervalo_minimo_minutos:numero,permite_ponto_offline:booleano,raio_maximo_metros:numero,tolerancia_minutos:numero,updated_at:data',
  conformidade_ponto_logs:
    'batida_id:id,descricao:texto,empresa_id:id,id:id,resolvido:booleano,severidade:texto,timestamp:texto,tipo_alerta:texto',
  contabilidade_contatos:
    'ativo:booleano,created_at:data,email:texto,empresa_id:id,escritorio:texto,id:id,nome:texto,telefone:texto,updated_at:data',
  contabilidade_mensagens:
    'anexos:json,autor_id:id,autor_nome:texto,autor_tipo:texto,corpo:texto,created_at:data,empresa_id:id,id:id,lida_em:data,thread_id:id',
  contabilidade_threads:
    'aberto_por:texto,assunto:texto,categoria:texto,contato_id:id,created_at:data,empresa_id:id,id:id,prioridade:texto,resolvido_em:data,status:texto,ultima_atividade_em:data,updated_at:data',
  contas_bancarias:
    'agencia:texto,agencia_digito:texto,ativo:booleano,banco_codigo:texto,banco_nome:texto,colaborador_id:id,conta:texto,created_at:data,digito:texto,empresa_id:id,id:id,modalidade:texto,pix_chave:texto,pix_tipo:texto,principal:booleano,tipo_conta:texto,updated_at:data',
  contatos_emergencia:
    'celular:texto,colaborador_id:id,created_at:data,email:texto,id:id,nome:texto,parentesco:texto,relacionamento_id:numero,telefone:texto,telefone_trabalho:texto,updated_at:data',
  contrato_assinatura_tokens:
    'assinado_ip:texto,assinado_ua:texto,assinatura_hash:texto,contrato_id:id,cpf_esperado:texto,created_at:data,created_by:texto,email_destinatario:texto,empresa_id:id,expira_em:data,id:id,reminders_enviados:numero,revogacao_motivo:texto,revogado_em:data,revogado_por:texto,tentativas:numero,token_hash:texto,ultimo_reminder_at:data,usado_em:data',
  contrato_templates:
    'ativo:booleano,cargo_id:id,clausulas_condicionais:json,corpo_html:texto,created_at:data,created_by:texto,departamento_id:id,descricao:texto,empresa_id:id,id:id,nome:texto,tipo_contrato:texto,updated_at:data,variaveis_schema:json,versao:numero',
  contrato_token_eventos:
    'ator_id:id,contrato_id:id,created_at:data,detalhes:json,empresa_id:id,evento:texto,id:id,ip:texto,token_id:id,user_agent:texto',
  contratos:
    'colaborador_id:id,created_at:data,data_fim:data,data_inicio:data,empresa_id:id,id:id,observacoes:texto,status:texto,tipo:texto,updated_at:data',
  contratos_gerados:
    'admissao_id:id,alerta_vencimento_enviado_em:data,assinado_em:data,assinatura_metadata:json,colaborador_id:id,contrato_anterior_id:id,created_at:data,data_fim:data,data_inicio:data,empresa_id:id,gerado_por:texto,html_final:texto,id:id,prorrogado:booleano,sha256:texto,status:texto,storage_path:texto,template_id:id,template_versao:numero,updated_at:data,variaveis_snapshot:json',
  controle_acesso:
    'area:texto,colaborador_id:id,created_at:data,dispositivo:texto,empresa_id:id,id:id,ip_address:texto,latitude:numero,local:texto,longitude:numero,metodo:texto,tipo:texto,updated_at:data',
  convenios: 'ativo:booleano,created_at:data,empresa_id:id,id:id,limite_global:numero,nome:texto,tipo:texto',
  convenios_colaboradores:
    'ativo:booleano,colaborador_id:id,convenio_id:id,created_at:data,id:id,limite_individual:numero,saldo_utilizado:numero',
  curriculos_arquivos: 'candidato_id:id,created_at:data,empresa_id:id,file_path:texto,id:id',
  dados_estagiario:
    'area_atuacao:texto,carga_horaria_semanal:numero,categoria_estagio:texto,colaborador_id:id,created_at:data,curso:texto,data_fim:data,data_inicio:data,empresa_id:id,id:id,instituicao_bairro:texto,instituicao_cep:texto,instituicao_cidade:texto,instituicao_cnpj:texto,instituicao_complemento:texto,instituicao_endereco:texto,instituicao_nome:texto,instituicao_numero:texto,instituicao_uf:texto,nivel:texto,numero_apolice:texto,obrigatorio:booleano,supervisor_cargo:texto,supervisor_id:id,supervisor_nome:texto,updated_at:data,valor_bolsa:numero',
  dados_estrangeiro:
    'casado_brasileiro:booleano,colaborador_id:id,condicao_ingresso:texto,condicao_ingresso_id:numero,created_at:data,data_chegada:data,data_naturalizacao:data,descricao_logradouro_id:numero,endereco_exterior:texto,filho_brasileiro:booleano,id:id,pais_id:numero,pais_origem:texto,reside_brasil:booleano,tempo_residencia:texto,tempo_residencia_id:numero,tipo_visto:texto,tipo_visto_id:numero,updated_at:data',
  dctfweb_declaracoes:
    'competencia:competencia,created_at:data,data_geracao:data,data_transmissao:data,debitos:json,empresa_id:id,id:id,status:texto,total_debitos:numero,total_fgts:numero,total_remuneracao:numero',
  deficiencias:
    'cid:texto,colaborador_id:id,cota_pcd:booleano,created_at:data,descricao:texto,id:id,laudo_url:texto,observacoes:texto,tipo:texto,updated_at:data',
  departamentos:
    'ativo:booleano,codigo_centro_custo:texto,created_at:data,departamento_pai_id:id,empresa_id:id,gestor_id:id,id:id,nome:texto,responsavel_id:id,updated_at:data',
  dependentes:
    'colaborador_id:id,cpf:texto,created_at:data,data_inicio_vigencia:data,data_nascimento:data,deficiente:booleano,escolaridade:texto,estrangeiro:booleano,genero_documento_id:numero,grau_parentesco:texto,id:id,incapacidade_fisica_mental:booleano,ir:booleano,nome:texto,para_irrf:booleano,para_plano_saude:booleano,para_salario_familia:booleano,parentesco:texto,relacionamento_id:numero,salario_familia:booleano',
  dependentes_beneficios:
    'ativo:booleano,beneficio_id:id,created_at:data,dependente_id:id,id:id,valor_dependente:numero,valor_empresa:numero',
  descricoes_logradouro: 'created_at:data,id:numero,nome:texto',
  desligamentos:
    'assinado_colaborador:booleano,assinado_empresa:booleano,aviso_previo:numero,checklist_calculo_rescisao:booleano,checklist_comunicacao:booleano,checklist_devolucao_equipamentos:booleano,checklist_documentacao:booleano,checklist_esocial:booleano,checklist_homologacao:booleano,checklist_pagamento:booleano,checklist_revogacao_acessos:booleano,colaborador_id:id,comprovante_pagamento_url:texto,created_at:data,created_by:texto,data_assinatura_colaborador:data,data_assinatura_empresa:data,data_aviso:data,data_aviso_previo:data,data_contabilidade:data,data_desligamento:data,data_pagamento:data,data_remocao_acesso:data,decimo_terceiro:numero,empresa_id:id,etapa:texto,ferias_proporcionais:numero,ferias_vencidas:numero,hash_assinatura_colaborador:texto,hash_assinatura_empresa:texto,hash_integridade:texto,id:id,motivo:texto,multa_fgts:numero,novo_supervisor_id:id,quebra_contrato:booleano,remover_beneficios:booleano,salario_base:numero,saldo_salario:numero,status:texto,terco_constitucional:numero,tipo:texto,tipo_aviso_previo_id:numero,tipo_desligamento_id:numero,total_descontos:numero,total_proventos:numero,updated_at:data,valor_liquido:numero',
  despesas:
    'aprovado_em:data,aprovado_por:texto,categoria:texto,colaborador_id:id,comprovante_url:texto,created_at:data,data_despesa:data,descricao:texto,empresa_id:id,folha_id:id,id:id,integrado_folha_em:data,observacoes:texto,observacoes_aprovador:texto,rejeitado_motivo:texto,status:texto,tipo:texto,updated_at:data,valor:numero',
  despesas_aprovacoes_log:
    'acao:texto,created_at:data,despesa_id:id,empresa_id:id,id:id,motivo:texto,status_anterior:texto,status_novo:texto,usuario_id:id',
  documento_templates:
    'ativo:booleano,categoria:texto,conteudo_html:texto,created_at:data,created_by:texto,empresa_id:id,id:id,nome:texto,tipo:texto,updated_at:data,variaveis:json',
  documentos:
    'colaborador_id:id,created_at:data,data_validade:data,id:id,nome:texto,observacoes:texto,tipo:texto,updated_at:data,url:texto,validado:booleano,validado_por:texto',
  documentos_admissao:
    'admissao_id:id,created_at:data,id:id,nome_arquivo:texto,observacoes:texto,tamanho_bytes:numero,tipo:texto,updated_at:data,url:texto,validado:booleano,validado_em:data,validado_por:texto',
  documentos_afastamento:
    'afastamento_id:id,created_at:data,created_by:texto,id:id,metadados:json,nome_arquivo:texto,tipo:texto,url:texto,validado:booleano,validado_em:data,validado_por:texto',
  documentos_assinatura:
    'assinado_em:data,assinado_por:texto,assinatura_base64:texto,colaborador_id:id,conteudo_url:texto,created_at:data,created_by:texto,empresa_id:id,hash_documento:texto,id:id,ip_assinatura:texto,status:texto,tipo_documento:texto,titulo:texto,updated_at:data,validade_assinatura:texto',
  documentos_colaborador:
    'colaborador_id:id,created_at:data,created_by:texto,hash_validacao:texto,id:id,nome_arquivo:texto,tamanho_bytes:numero,tipo:texto,updated_at:data,url:texto,verificado_ia:booleano',
  documentos_historico:
    'alteracoes:texto,created_at:data,documento_id:id,id:id,tamanho:numero,url_arquivo:texto,usuario_id:id,versao:texto',
  documentos_pessoais_arquivos:
    'arquivo_nome:texto,arquivo_tamanho:numero,arquivo_url:texto,colaborador_id:id,created_at:data,created_by:texto,data_emissao:data,data_validade:data,id:id,numero:texto,orgao_emissor:texto,tipo_documento:texto,updated_at:data',
  empresas:
    'aliquota_simples:numero,ativa:booleano,bairro:texto,cep:texto,cidade:texto,cnpj:texto,complemento:texto,cor_identificacao:texto,created_at:data,email:texto,fap:numero,id:id,inscricao_estadual:texto,inscricao_municipal:texto,logo_url:texto,logradouro:texto,nome_fantasia:texto,numero:texto,ordem_exibicao:numero,rat:numero,razao_social:texto,regime_tributario:texto,telefone:texto,terceiros:numero,uf:texto,updated_at:data',
  emprestimos_consignados:
    'colaborador_id:id,created_at:data,data_inicio:data,empresa_id:id,id:id,instituicao_financeira:texto,numero_parcelas:numero,observacoes:texto,parcelas_pagas:numero,status:texto,taxa_juros:numero,updated_at:data,valor_parcela:numero,valor_total:numero',
  epis: 'ativo:booleano,ca:texto,ca_validade:texto,categoria:texto,created_at:data,descricao:texto,empresa_id:id,estoque_atual:numero,estoque_minimo:numero,fabricante:texto,id:id,nome:texto,unidade_medida:texto,updated_at:data,validade_ca:texto',
  epis_entregas:
    'assinatura_url:texto,colaborador_id:id,created_at:data,data_devolucao:data,data_entrega:data,empresa_id:id,entregue_por:texto,epi_id:id,hash_integridade:texto,id:id,motivo:texto,observacoes:texto,quantidade:numero',
  epis_fichas:
    'assinada_em:data,colaborador_id:id,created_at:data,empresa_id:id,evidencia_foto_path:texto,hash_sha256:texto,id:id,metadata:json,motivo:texto,observacoes:texto,responsavel_id:id,responsavel_nome:texto,status:texto,tipo_movimento:texto,updated_at:data',
  epis_fichas_assinaturas:
    'assinado_em:data,assinatura_dados:texto,assinatura_tipo:texto,ficha_id:id,hash_sha256:texto,id:id,ip_address:texto,user_agent:texto',
  epis_fichas_itens:
    'ca:texto,ca_validade:texto,created_at:data,data_devolucao:data,data_entrega:data,descricao:texto,epi_id:id,ficha_id:id,id:id,quantidade:numero,status_item:texto',
  escalas:
    'ativo:booleano,created_at:data,dias_folga:numero,dias_trabalho:numero,empresa_id:id,horario_entrada:texto,horario_saida:texto,id:id,intervalo_minutos:numero,nome:texto,tipo:texto,updated_at:data',
  escalas_trabalho:
    'colaborador_id:id,created_at:data,created_by:texto,data:texto,empresa_id:id,id:id,observacoes:texto,status:texto,turno_id:id,updated_at:data',
  esocial_eventos:
    'assinatura_xml:texto,competencia:competencia,created_at:data,dados:json,data_envio:data,data_processamento:data,empresa_id:id,erros:json,hash_arquivo:texto,hash_seguranca:texto,id:id,id_recibo:texto,protocolo:texto,proxima_tentativa:texto,recibo:texto,status:texto,tentativas_envio:numero,tipo_evento:texto,updated_at:data,xml:texto,xml_envio:texto,xml_retorno:texto',
  esocial_lotes:
    'ambiente:texto,created_at:data,empresa_id:id,eventos:json,id:id,progresso:numero,protocolo:texto,status:texto,updated_at:data',
  esocial_transmissao_logs:
    'created_at:data,duracao_ms:numero,empresa_id:id,error_details:json,evento_id:id,id:id,request_xml:texto,response_xml:texto,status:texto',
  etnias: 'codigo_esocial:numero,created_at:data,id:id,nome:texto',
  eventos_variaveis:
    'colaborador_id:id,competencia:competencia,created_at:data,created_by:texto,empresa_id:id,id:id,observacao:texto,origem_ferias_id:id,referencia:numero,rubrica_id:id,valor:numero',
  exames:
    'colaborador_id:id,created_at:data,crm:texto,data_exame:data,data_validade:data,id:id,medico:texto,observacoes:texto,resultado:texto,tipo:texto',
  exames_agendamentos:
    'aso_id:id,clinica_id:id,colaborador_id:id,colaborador_lat:numero,colaborador_lng:numero,created_at:data,criado_por:texto,data_agendada:data,distancia_km:numero,empresa_id:id,id:id,observacoes:texto,status:texto,tipo_exame:texto,updated_at:data',
  faltas:
    'aprovado_em:data,aprovado_por:texto,cid:texto,colaborador_id:id,created_at:data,created_by:texto,data:texto,data_fim:data,desconto_aplicado:booleano,dias_total:numero,documento_anexo:texto,documento_url:texto,empresa_id:id,horas_falta:texto,id:id,justificada:booleano,medico_crm:texto,medico_nome:texto,motivo:texto,motivo_afastamento_id:numero,motivo_rejeicao:texto,rejeitado_em:data,rejeitado_por:texto,status:texto,tipo:texto,updated_at:data',
  feedbacks_360:
    'avaliado_id:id,avaliador_id:id,ciclo_id:id,comentarios:texto,created_at:data,empresa_id:id,id:id,nota_geral:numero,performance:numero,pontos_fortes:texto,pontos_melhoria:texto,potencial:numero,status:texto,tipo:texto,updated_at:data',
  feriados: 'cidade:texto,created_at:data,data:texto,descricao:texto,empresa_id:id,id:id,tipo:texto,uf:texto',
  ferias:
    'abono_pecuniario:booleano,adiantamento_13:booleano,adiantamento_13_ano_exercicio:numero,adiantamento_13_solicitado_em:data,adiantamento_13_solicitado_por:texto,adiantamento_13o:booleano,aprovado_em:data,aprovado_gestor:booleano,aprovado_gestor_em:data,aprovado_gestor_por:texto,aprovado_por:texto,aprovado_rh:booleano,aprovado_rh_em:data,aprovado_rh_por:texto,aviso_assinatura_em:data,aviso_assinatura_hash:texto,aviso_assinatura_ip:texto,aviso_assinatura_por:texto,aviso_assinatura_user_agent:texto,aviso_gerado_em:data,aviso_pdf_url:texto,cancelado:booleano,cancelado_em:data,cancelado_por:texto,colaborador_id:id,created_at:data,created_by:texto,data_fim:data,data_inicio:data,data_pagamento:data,descontos_inss:numero,descontos_irrf:numero,dias_abono:numero,dias_gozo:numero,documento_url:texto,empresa_id:id,enviado_contabilidade:booleano,enviado_contabilidade_em:data,enviado_contabilidade_por:texto,ferias_coletiva_id:id,hash_integridade:texto,id:id,justificativa:texto,motivo_cancelamento:texto,observacoes:texto,pagamento_comprovante_path:texto,pagamento_confirmado_em:data,pagamento_confirmado_por:texto,pagamento_valor:numero,periodo_aquisitivo_fim:texto,periodo_aquisitivo_id:id,periodo_aquisitivo_inicio:texto,salario_base:numero,saldo_gasto:numero,status:texto,status_aprovacao_contabilidade:texto,status_aprovacao_gestor:texto,status_aprovacao_rh:texto,updated_at:data,valor_abono:numero,valor_abono_pecuniario:numero,valor_adiantamento_13:numero,valor_ferias:numero,valor_liquido:numero,valor_terco:numero,valor_terco_abono:numero,valor_total:numero,vender_abono:booleano',
  ferias_aprovacoes:
    'aprovador_id:id,created_at:data,data_acao:data,ferias_id:id,id:id,observacoes:texto,status:texto,tipo:texto,updated_at:data',
  ferias_aprovacoes_log: 'aprovador_id:id,created_at:data,ferias_id:id,id:id,nivel:texto,observacao:texto,status:texto',
  ferias_arquivos: 'arquivo_url:texto,assinavel:booleano,created_at:data,ferias_id:id,id:id,nome:texto,updated_at:data',
  ferias_audit_log:
    'acao:texto,created_at:data,dados_anteriores:json,dados_novos:json,empresa_id:id,entidade_id:id,entidade_tipo:texto,id:id,metadata:json,usuario_id:id',
  ferias_coletivas:
    'aprovado_por:texto,comunicado_gerado_em:data,comunicado_gerado_por:texto,comunicado_mte_hash:texto,comunicado_mte_path:texto,comunicado_sindicato_hash:texto,comunicado_sindicato_nome:texto,comunicado_sindicato_path:texto,created_at:data,created_by:texto,data_fim:data,data_inicio:data,departamentos:lista,dias:numero,empresa_id:id,id:id,justificativa:texto,status:texto,updated_at:data',
  ferias_programacao:
    'ano:numero,aprovado_gestor_em:data,aprovado_gestor_por:texto,aprovado_rh_em:data,aprovado_rh_por:texto,colaborador_id:id,created_at:data,criado_por:texto,data_fim_prevista:data,data_inicio_prevista:data,dias_previstos:numero,empresa_id:id,ferias_id:id,id:id,mes_previsto:numero,observacoes:texto,periodo_aquisitivo_id:id,rejeitado_em:data,rejeitado_motivo:texto,rejeitado_por:texto,status:texto,updated_at:data',
  ferias_reconciliacao_logs:
    'corrigidas:numero,detalhes:json,duracao_ms:numero,empresa_id:id,executado_em:data,id:id,restantes:numero,verificadas:numero',
  ferias_solicitacoes:
    'abono_pecuniario:booleano,aprovado_em:data,aprovado_por:texto,colaborador_id:id,created_at:data,data_fim:data,data_inicio:data,dias:numero,empresa_id:id,id:id,observacoes:texto,status:texto,updated_at:data',
  fgts_digital_logs:
    'acao:texto,created_at:data,empresa_id:id,guia_id:id,id:id,request_payload:json,response_payload:json',
  fila_notificacoes:
    'conteudo:texto,created_at:data,erro_ultimo:texto,id:id,metadados:json,scheduled_for:texto,status:texto,tentativas:numero,tipo:texto,titulo:texto,user_id:id',
  fila_processamento:
    'created_at:data,dlq:booleano,dlq_movido_em:data,empresa_id:id,erro_log:texto,id:id,max_tentativas:numero,payload:json,progresso:numero,proxima_tentativa_em:data,resultado:json,status:texto,tentativas:numero,tipo_tarefa:texto,ultimo_erro:texto,updated_at:data,usuario_id:id',
  folha_assinaturas:
    'assinante_id:id,cargo_assinante:texto,created_at:data,data_assinatura:data,folha_id:id,hash_documento:texto,id:id,ip_assinatura:texto,status:texto',
  folha_auditoria:
    'colaborador_id:id,created_at:data,criado_por:texto,detalhes:json,folha_id:id,id:id,mensagem:texto,severidade:texto,tipo_evento:texto',
  folha_eventos_auditoria: 'created_at:data,detalhes:json,folha_id:id,id:id,tipo_evento:texto,usuario_id:id',
  folha_itens:
    'colaborador_id:id,created_at:data,detalhes:json,fgts_mes:numero,folha_id:id,id:id,inss_mes:numero,irrf_mes:numero,salario_base:numero,status_pagamento:texto,total_descontos:numero,total_liquido:numero,total_proventos:numero',
  folha_lock_conflicts:
    'competencia:competencia,created_at:data,empresa_id:id,folha_id:id,id:id,user_id:id,version_atual:numero,version_esperada:numero',
  folhas_pagamento:
    'alerta_calculo:json,competencia:competencia,created_at:data,created_by:texto,data_calculo:data,data_fechamento:data,data_pagamento:data,empresa_id:id,esocial_status:texto,fechada_por:texto,hash_integridade:texto,id:id,motivo_reabertura:texto,observacoes:texto,reaberta_em:data,reaberta_por:texto,status:texto,tipo:texto,total_colaboradores:numero,total_descontos:numero,total_fgts:numero,total_inss_patronal:numero,total_liquido:numero,total_proventos:numero,updated_at:data,version:numero',
  formacoes_academicas:
    'ano_conclusao:numero,colaborador_id:id,created_at:data,curso:texto,id:id,instituicao:texto,situacao:texto,tipo_escolaridade:texto,updated_at:data',
  generos_documento: 'codigo_esocial:texto,created_at:data,id:numero,nome:texto',
  geo_allowed_countries: 'added_by:texto,country_code:texto,country_name:texto,created_at:data,id:id',
  geo_blocked_attempts: 'country_code:texto,country_name:texto,created_at:data,id:id,ip_address:texto,user_agent:texto',
  geo_blocking_config:
    'block_unknown_countries:booleano,enabled:booleano,id:id,log_blocked_attempts:booleano,updated_at:data,updated_by:texto',
  govbr_auth_state: 'created_at:data,expires_at:data,id:id,nonce:texto,redirect_uri:texto,state:texto',
  guias_fgts:
    'codigo_barras:texto,competencia:competencia,created_at:data,data_pagamento:data,data_vencimento:data,empresa_id:id,id:id,status:texto,tipo:texto,valor_multa:numero,valor_total:numero,valor_total_recolher:numero',
  guias_fgts_digital:
    'competencia:competencia,created_at:data,empresa_id:id,gfd_data_geracao:texto,gfd_protocolo:texto,id:id,pdf_url:texto,qr_code_pix:texto,status:texto,tipo:texto,updated_at:data,valor_total:numero,vencimento:texto',
  guias_inss:
    'codigo_barras:texto,competencia:competencia,created_at:data,data_pagamento:data,data_vencimento:data,empresa_id:id,id:id,status:texto,tipo:texto,valor_empresa:numero,valor_segurados:numero,valor_total:numero',
  historico_alertas: 'created_at:data,id:id,limite:numero,mensagem:texto,nivel:texto,tipo:texto,valor:numero',
  historico_calculos_folha: 'created_at:data,criado_por:texto,empresa_id:id,folha_id:id,id:id,snapshot:json',
  historico_cargo:
    'cargo_anterior:texto,cargo_novo:texto,colaborador_id:id,created_at:data,created_by:texto,data_alteracao:data,id:id,motivo:texto,observacao:texto,salario_anterior:numero,salario_novo:numero',
  historico_contratos:
    'carga_horaria_semanal:numero,cargo:texto,colaborador_id:id,created_at:data,created_by:texto,data_fim:data,data_inicio:data,departamento:texto,empresa_id:id,id:id,motivo_alteracao:texto,observacoes:texto,salario:numero,tipo_contrato:texto,updated_at:data',
  historico_ferias:
    'created_at:data,created_by:texto,ferias_id:id,id:id,observacao:texto,status_anterior:texto,status_novo:texto',
  historico_rescisoes:
    'aviso_trabalhado:booleano,cargo:texto,cpf:texto,created_at:data,created_by:texto,data_admissao:data,data_desligamento:data,empresa_id:id,ferias_vencidas:booleano,id:id,nome_colaborador:texto,resultado:json,salario:numero,saldo_fgts:numero,tipo_rescisao:texto,total_descontos:numero,total_liquido:numero,total_proventos:numero',
  historico_salarial:
    'ativo:booleano,cargo_anterior:texto,cargo_novo:texto,colaborador_id:id,created_at:data,created_by:texto,data_vigencia:data,departamento_anterior:texto,departamento_novo:texto,descricao:texto,empresa_id:id,id:id,motivo:texto,salario_anterior:numero,salario_novo:numero,updated_at:data,vinculo_id:id',
  holerite_distribuicoes:
    'canal:texto,colaborador_id:id,created_at:data,distribuido_por:texto,erro:texto,folha_id:id,holerite_id:id,id:id,status:texto,updated_at:data',
  holerites:
    'assinado:booleano,base_fgts:numero,base_inss:numero,base_irrf:numero,colaborador_cargo:texto,colaborador_cpf:texto,colaborador_departamento:texto,colaborador_id:id,colaborador_matricula:texto,colaborador_nome:texto,created_at:data,data_assinatura:data,data_visualizacao:data,dependentes_irrf:numero,faltas_dias:numero,folha_id:id,hash_assinatura:texto,hash_validacao:texto,horas_extras_100:numero,horas_extras_50:numero,id:id,ip_visualizacao:texto,liquido:numero,salario_base:numero,total_descontos:numero,total_proventos:numero,valor_fgts:numero,valor_inss:numero,valor_irrf:numero',
  homologacoes_rescisao:
    'created_at:data,data_decisao:data,desligamento_id:id,etapa:texto,id:id,parecer:texto,status:texto,usuario_id:id',
  ia_provisoes_alertas:
    'created_at:data,descricao:texto,empresa_id:id,id:id,impacto_financeiro_estimado:numero,sugestao_acao:texto,tipo_alerta:texto',
  idempotency_keys:
    'completed_at:data,created_at:data,empresa_id:id,endpoint:texto,expires_at:data,id:id,key_hash:texto,request_hash:texto,response_body:json,response_status:numero,status:texto,user_id:id',
  identidades_genero: 'created_at:data,id:id,nome:texto',
  inscricoes_cursos:
    'certificado_url:texto,colaborador_id:id,created_at:data,curso_id:id,data_conclusao:data,data_inicio:data,empresa_id:id,id:id,nota:numero,status:texto,updated_at:data',
  integracao_logs:
    'created_at:data,duracao_ms:numero,erro:texto,id:id,operacao:texto,payload_envio:json,payload_retorno:json,servico:texto,status_code:numero',
  integracoes:
    'ativa:booleano,configuracao:json,created_at:data,id:id,nome:texto,status:texto,tipo:texto,ultima_sincronizacao:texto,updated_at:data',
  ip_whitelist: 'added_by:texto,created_at:data,description:texto,id:id,ip_address:texto',
  itens_folha:
    'colaborador_id:id,created_at:data,folha_id:id,id:id,quantidade:numero,referencia:texto,rubrica_id:id,valor:numero',
  jornadas:
    'ativa:booleano,carga_horaria_semanal:numero,created_at:data,empresa_id:id,horario_entrada:texto,horario_saida:texto,id:id,intervalo_minutos:numero,nome:texto,tipo:texto,updated_at:data',
  jornadas_horarios:
    'created_at:data,dia_semana:numero,dia_util:booleano,entrada:texto,id:id,intervalo_fim:texto,intervalo_inicio:texto,jornada_id:id,saida:texto',
  lancamentos_contabeis:
    'conta_credito_id:id,conta_debito_id:id,created_at:data,data_lancamento:data,descricao:texto,empresa_id:id,folha_id:id,id:id,origem:texto,status:texto,updated_at:data,valor:numero',
  lancamentos_folha:
    'automatico:booleano,created_at:data,holerite_id:id,id:id,referencia:numero,rubrica_codigo:texto,rubrica_descricao:texto,rubrica_id:id,tipo:texto,valor:numero',
  lgpd_consentimentos:
    'aceito:booleano,aceito_em:data,colaborador_id:id,created_at:data,empresa_id:id,id:id,ip_address:texto,revogado_em:data,tipo:texto,updated_at:data,versao:texto',
  lgpd_fila_limpeza:
    'created_at:data,data_programada:data,dry_run:booleano,executado:booleano,id:id,processed_at:data,registro_id:id,tabela:texto',
  lgpd_politicas_retencao:
    'acao_final:texto,base_legal:texto,categoria_dado:texto,id:id,prazo_meses:numero,updated_at:data',
  lgpd_retencao_logs:
    'ativo:booleano,coluna_data:texto,created_at:data,dias:numero,id:id,observacao:texto,tabela:texto,updated_at:data',
  lgpd_solicitacoes:
    'colaborador_id:id,concluida_em:data,created_at:data,descricao:texto,empresa_id:id,id:id,prazo_legal:texto,responsavel_id:id,resposta:texto,status:texto,tipo:texto,updated_at:data',
  linhas_transporte:
    'created_at:data,id:id,ida_volta:booleano,nome:texto,tipo:texto,vale_transporte_id:id,valor:numero',
  locais_trabalho:
    'ativo:booleano,cep:texto,cidade:texto,created_at:data,empresa_id:id,endereco:texto,id:id,latitude:numero,longitude:numero,nome:texto,pais:texto,telefone:texto,uf:texto,updated_at:data',
  log_envio_relatorios: 'agendamento_id:id,created_at:data,id:id,mensagem:texto,status:texto',
  login_attempts:
    'created_at:data,email:texto,failure_reason:texto,id:id,ip_address:texto,mfa_passed:booleano,mfa_required:booleano,success:booleano,user_agent:texto',
  login_lockouts:
    'attempts:numero,created_at:data,id:id,identifier:texto,identifier_type:texto,is_locked:booleano,last_attempt:texto,lockout_until:texto,updated_at:data',
  login_rate_limits:
    'created_at:data,failed_attempts:numero,id:id,identifier:texto,identifier_type:texto,last_attempt_at:data,locked_until:texto,updated_at:data',
  logs_integracoes: 'created_at:data,detalhes:json,id:id,integracao_id:id,mensagem:texto,status:texto,tipo:texto',
  logs_sincronizacao:
    'created_at:data,empresa_id:id,id:id,mensagem:texto,payload_enviado:json,resposta_recebida:json,sistema_externo:texto,status:texto,tipo_entidade:texto',
  logs_sistema:
    'contexto:json,created_at:data,id:id,mensagem:texto,nivel:texto,stack_trace:texto,url:texto,user_agent:texto,user_id:id',
  lotacoes:
    'ativa:booleano,codigo:texto,colaborador_id:id,created_at:data,empresa_id:id,endereco:texto,id:id,nome:texto,updated_at:data',
  colaborador_lotacoes:
    'colaborador_id:id,created_at:data,empresa_id:id,id:id,lotacao_id:id,principal:booleano,updated_at:data',
  medidas_ciencia_tokens:
    'acao:texto,assinatura_hash:texto,colaborador_id:id,created_at:data,created_by:texto,empresa_id:id,expires_at:data,geolocation:json,id:id,ip_address:texto,medida_id:id,motivo_recusa:texto,token_hash:texto,used_at:data,user_agent:texto',
  medidas_disciplinares:
    'aplicado_por:texto,aprovado_gestor_em:data,aprovado_gestor_por:texto,aprovado_juridico_em:data,aprovado_juridico_por:texto,aprovado_rh_em:data,aprovado_rh_por:texto,aprovador_id:id,arquivado_em:data,arquivado_por:texto,artigo_clt:texto,assinado_em:data,colaborador_ciente:booleano,colaborador_id:id,contestacao_aceita:booleano,contestacao_data:texto,contestacao_prazo_ate:texto,contestacao_prazo_horas:numero,contestacao_respondida_em:data,contestacao_respondida_por:texto,contestacao_resposta:texto,contestacao_texto:texto,created_at:data,data_aprovacao:data,data_ciencia:data,data_conhecimento_fato:data,data_inicio_efeito:data,data_ocorrencia:data,descricao:texto,dias_suspensao:numero,documento_url:texto,empresa_id:id,evidenciado_por:json,gravidade:texto,hash_integridade:texto,id:id,id_registro_anterior:texto,motivo_recusa:texto,motivo_rejeicao:texto,numero_sequencial:numero,pdf_gerado_em:data,pdf_hash_sha256:texto,pdf_url:texto,prazo_ciencia_dias:numero,recorrencia_infrafacao:booleano,recusa_assinatura:booleano,rejeitado_em:data,rejeitado_por:texto,status:texto,status_workflow:texto,testemunha_1:texto,testemunha_1_cpf:texto,testemunha_1_nome:texto,testemunha_2:texto,testemunha_2_cpf:texto,testemunha_2_nome:texto,tipo:texto,updated_at:data',
  medidas_disciplinares_anexos:
    'created_at:data,id:id,medida_id:id,mime_type:texto,nome_arquivo:texto,storage_path:texto,tamanho_bytes:numero,tipo:texto,tipo_arquivo:texto,uploaded_by:texto',
  medidas_disciplinares_contestacao_anexos:
    'created_at:data,empresa_id:id,hash_sha256:texto,id:id,medida_id:id,mime_type:texto,nome_arquivo:texto,storage_path:texto,tamanho_bytes:numero,uploaded_by:texto',
  medidas_disciplinares_integracao:
    'colaborador_id:id,competencia:competencia,created_at:data,detalhes:json,dias:numero,empresa_id:id,id:id,medida_id:id,ref_id:id,status:texto,tipo_integracao:texto,updated_at:data,valor:numero',
  medidas_disciplinares_workflow_log:
    'acao:texto,ator_id:id,created_at:data,de_status:texto,empresa_id:id,id:id,medida_id:id,observacao:texto,para_status:texto',
  metas_okrs:
    'ciclo_id:id,colaborador_id:id,created_at:data,data_limite:data,descricao:texto,empresa_id:id,id:id,meta_valor:numero,progresso:numero,status:texto,tipo:texto,titulo:texto,updated_at:data,valor_atual:numero',
  metricas_processamento: 'funcao_nome:texto,id:id,status:texto,tempo_execucao_ms:numero,timestamp:texto',
  motivos_afastamento: 'created_at:data,id:numero,nome:texto,tipo:texto',
  nacionalidades: 'codigo_esocial:texto,created_at:data,id:numero,nome:texto',
  notificacoes:
    'created_at:data,data_referencia:data,empresa_id:id,entidade_id:id,entidade_tipo:texto,id:id,lida:booleano,mensagem:texto,tipo:texto,titulo:texto,updated_at:data,user_id:id',
  notificacoes_admissao:
    'admissao_id:id,assunto:texto,canal:texto,created_at:data,erro:texto,id:id,mensagem:texto,status:texto,tipo:texto',
  onboarding_colaborador:
    'colaborador_id:id,created_at:data,created_by:texto,data_conclusao:data,data_inicio:data,empresa_id:id,id:id,progresso:numero,status:texto,template_id:id,updated_at:data',
  onboarding_documentos_obrigatorios:
    'created_at:data,empresa_id:id,entregue:booleano,id:id,nome_documento:texto,onboarding_id:id,updated_at:data',
  onboarding_kits: 'ativo:booleano,created_at:data,empresa_id:id,id:id,itens:json,nome:texto',
  onboarding_tarefas:
    'categoria:texto,concluida:booleano,concluida_por:texto,created_at:data,data_conclusao:data,data_prazo:data,descricao:texto,empresa_id:id,id:id,observacoes:texto,onboarding_id:id,ordem:numero,template_tarefa_id:id,titulo:texto,updated_at:data',
  onboarding_template_tarefas:
    'categoria:texto,created_at:data,descricao:texto,dias_prazo:numero,id:id,obrigatoria:booleano,ordem:numero,responsavel_tipo:texto,template_id:id,titulo:texto',
  onboarding_templates:
    'ativo:booleano,created_at:data,created_by:texto,descricao:texto,empresa_id:id,id:id,nome:texto,updated_at:data',
  paises: 'codigo_iso:texto,created_at:data,id:numero,nome:texto',
  parametros_fiscais:
    'aliquota:numero,ativo:booleano,created_at:data,deducao:numero,faixa:numero,id:id,tipo:texto,valor_final:numero,valor_fixo:numero,valor_inicial:numero,vigencia_fim:texto,vigencia_inicio:texto',
  parametros_sistema: 'created_at:data,empresa_id:id,id:id,nome:texto,tipo_dado:texto,updated_at:data,valor:texto',
  password_history: 'created_at:data,id:id,password_hash:texto,user_id:id',
  password_policies:
    'created_at:data,id:id,lockout_attempts:numero,lockout_duration_minutes:numero,max_age_days:numero,min_length:numero,prevent_reuse_count:numero,require_lowercase:booleano,require_numbers:booleano,require_special_chars:booleano,require_uppercase:booleano,updated_at:data',
  password_reset_config:
    'auto_expire_hours:numero,id:id,notify_admins:booleano,notify_user_on_approval:booleano,notify_user_on_rejection:booleano,require_approval:booleano,updated_at:data,updated_by:texto',
  password_reset_requests:
    'created_at:data,expires_at:data,id:id,ip_address:texto,reason:texto,requested_at:data,reviewed_at:data,reviewed_by:texto,reviewer_notes:texto,status:texto,user_agent:texto,user_email:texto,user_id:id',
  pcs_avaliacoes_cargo:
    'avaliado_em:data,avaliado_por:texto,cargo_id:id,created_at:data,id:id,justificativa:texto,plano_id:id,pontos_total:numero,pontuacoes:json,updated_at:data',
  pcs_fatores:
    'created_at:data,descricao:texto,graus:json,id:id,nome:texto,ordem:numero,peso:numero,plano_id:id,updated_at:data',
  pcs_grades:
    'created_at:data,id:id,nome:texto,ordem:numero,plano_id:id,pontos_max:numero,pontos_min:numero,salario_max:numero,salario_medio:numero,salario_min:numero,updated_at:data',
  pcs_pesquisa_salarial:
    'amostra:numero,cargo_id:id,cargo_referencia:texto,created_at:data,data_referencia:data,empresa_id:id,fonte:texto,id:id,p25:numero,p50:numero,p75:numero,p90:numero,regiao:texto,updated_at:data',
  pcs_planos:
    'amplitude_pct:numero,created_at:data,created_by:texto,deleted_at:data,empresa_id:id,id:id,nome:texto,num_steps:numero,observacoes:texto,overlap_pct:numero,status:texto,updated_at:data,versao:numero,vigencia_fim:texto,vigencia_inicio:texto',
  pdi_plano_desenvolvimento:
    'acao_desenvolvimento:texto,colaborador_id:id,comentarios:texto,competencia_foco:texto,created_at:data,empresa_id:id,id:id,prazo:texto,status:texto,titulo:texto,updated_at:data',
  pdis: 'acao:texto,colaborador_id:id,competencia:competencia,created_at:data,descricao:texto,empresa_id:id,id:id,prazo:texto,progresso:numero,status:texto,titulo:texto,updated_at:data',
  pendencias:
    'atualizado_at:data,criado_at:data,descricao:texto,empresa_id:id,id:id,metadata:json,prioridade:texto,referencia_id:id,status:texto,tipo:texto,titulo:texto',
  pensoes:
    'agencia:texto,ativo:booleano,banco:texto,beneficiario:texto,colaborador_id:id,conta:texto,cpf_beneficiario:texto,created_at:data,empresa_id:id,id:id,percentual:numero,tipo:texto,valor_fixo:numero',
  periodos_aquisitivos:
    'colaborador_id:id,created_at:data,data_fim:data,data_inicio:data,data_limite_concessao:data,dias_descontados:numero,dias_direito:numero,em_dobra:booleano,faltas_periodo:numero,id:id,motivo_perda:texto,numero_periodo:numero,perdeu_direito:booleano,status:texto',
  periodos_experiencia:
    'colaborador_id:id,created_at:data,data_inicio:data,dias_total:numero,id:id,observacoes:texto,primeira_etapa_fim:texto,segunda_etapa_fim:texto,status:texto,tipo:texto,updated_at:data',
  periodos_ponto:
    'competencia:competencia,created_at:data,data_fim:data,data_inicio:data,fechado_em:data,fechado_por:texto,id:id,status:texto,updated_at:data',
  permissao_perfis: 'created_at:data,descricao:texto,empresa_id:id,id:id,is_admin:booleano,nome:texto,updated_at:data',
  permissao_recursos: 'created_at:data,descricao:texto,id:id,modulo:texto,nome:texto,slug:texto',
  permissions: 'action:texto,allowed:booleano,created_at:data,id:id,resource:texto,role:texto',
  personnel_budget:
    'ano:numero,created_at:data,departamento:texto,descricao:texto,empresa_id:id,id:id,mes:numero,updated_at:data,valor_orcado:numero',
  pesquisas:
    'anonima:booleano,created_at:data,created_by:texto,data_fim:data,data_inicio:data,descricao:texto,empresa_id:id,id:id,status:texto,tipo:texto,titulo:texto,updated_at:data',
  pesquisas_perguntas:
    'created_at:data,id:id,obrigatoria:booleano,opcoes:json,ordem:numero,pesquisa_id:id,texto:texto,tipo:texto',
  pesquisas_respostas:
    'colaborador_id:id,created_at:data,id:id,pergunta_id:id,pesquisa_id:id,valor_numerico:numero,valor_texto:texto',
  pix_itens:
    'chave_pix:texto,colaborador_id:id,created_at:data,descricao:texto,end_to_end_id:id,id:id,lote_id:id,status:texto,tipo_chave:texto,valor:numero',
  pix_lotes:
    'created_at:data,data_criacao:data,empresa_id:id,id:id,quantidade_pagamentos:numero,status:texto,updated_at:data,valor_total:numero',
  plano_contas: 'codigo:texto,created_at:data,empresa_id:id,id:id,natureza:texto,nome:texto,tipo:texto,updated_at:data',
  planos_saude:
    'abrangencia:texto,ans_registro:texto,ativo:booleano,colaborador_id:id,coparticipacao_teto:numero,created_at:data,data_fim:data,data_inicio:data,empresa_id:id,id:id,numero_carteirinha:texto,operadora:texto,percentual_colaborador:numero,percentual_empresa:numero,tipo_plano:texto,updated_at:data,valor_mensal:numero',
  ponto_ajustes:
    'anexo_url:texto,colaborador_id:id,created_at:data,data_decisao:data,data_referencia:data,gestor_id:id,historico_aprovacao:json,hora_original:texto,hora_sugerida:texto,id:id,justificativa:texto,nivel_aprovacao_atual:numero,observacoes_gestor:texto,sla_vencimento:texto,status:texto,tipo_ajuste:texto,updated_at:data',
  ponto_auditoria:
    'acao:texto,created_at:data,dados_anteriores:json,dados_novos:json,id:id,ip_address:texto,justificativa:texto,registro_id:id,tabela_nome:texto,user_agent:texto,usuario_id:id',
  ponto_auditoria_fraude: 'batida_id:id,created_at:data,detalhes:json,id:id,score_confianca:numero,tipo_alerta:texto',
  ponto_espelhos_assinados:
    'arquivo_espelho_url:texto,assinado_em:data,assinado_ip:texto,assinado_por_user_id:id,assinado_user_agent:texto,canonical_json:json,colaborador_id:id,competencia:competencia,created_at:data,data_assinatura_colaborador:data,data_assinatura_rh:data,empresa_id:id,hash_assinatura_colaborador:texto,hash_assinatura_rh:texto,hash_sha256:texto,id:id,periodo_fim:texto,periodo_inicio:texto,saldo_banco_horas_periodo:texto,status_assinatura:texto,total_batidas:numero,total_horas_trabalhadas:texto',
  ponto_espelhos_revogacoes:
    'espelho_id:id,id:id,ip:texto,motivo:texto,revogado_em:data,revogado_por_user_id:id,user_agent:texto',
  ponto_regras_aprovacao:
    'created_at:data,empresa_id:id,exige_anexo:booleano,id:id,limite_mensal_solicitacoes:numero,niveis_aprovacao:numero,sla_horas:numero,tipo_solicitacao:texto,updated_at:data',
  ponto_seguranca_blacklist:
    'bloqueado_ate:texto,bloqueado_em:data,colaborador_id:id,dispositivo_id:id,id:id,motivo:texto',
  portal_notificacoes_settings:
    'alertar_ferias:booleano,alertar_holerite:booleano,created_at:data,email_alertas:booleano,id:id,push_alertas:booleano,user_id:id',
  premiacoes_alertas: 'created_at:data,id:id,lido:booleano,mensagem:texto,metadata:json,tipo:texto,user_id:id',
  premiacoes_auditoria:
    'acao:texto,created_at:data,dados_anteriores:json,dados_novos:json,entidade_id:id,entidade_tipo:texto,id:id,motivo:texto,usuario_id:id',
  premiacoes_campanhas:
    'comentarios_aprovacao:json,created_at:data,data_fim:data,data_inicio:data,descricao:texto,empresa_id:id,id:id,meta_dados:json,nome:texto,orcamento_estimado:numero,status:texto,status_aprovacao:texto,updated_at:data',
  premiacoes_cenarios_simulacao: 'configuracoes:json,created_at:data,criado_por:texto,empresa_id:id,id:id,nome:texto',
  premiacoes_pagamentos:
    'campanha_id:id,colaborador_id:id,created_at:data,data_integracao:data,data_pagamento:data,historico_mudancas:json,id:id,integrado_folha:booleano,justificativa_divergencia:texto,logs_calculo:json,observacoes:texto,referencia_folha:texto,regra_id:id,status:texto,status_conciliacao:texto,updated_at:data,valor_aprovado:numero,valor_calculado:numero,valor_folha_real:numero',
  premiacoes_regras:
    'campanha_id:id,configuracao:json,created_at:data,id:id,meta_id:id,tipo_calculo:texto,titulo:texto,valor_base:numero',
  premiacoes_roi_cenarios:
    'configuracoes:json,created_at:data,id:id,nome:texto,resultados:json,snapshot_logs:json,user_id:id',
  profiles:
    'avatar_url:texto,cargo:texto,config_notificacoes:json,cpf_validado_govbr:booleano,created_at:data,departamento:texto,gov_br_nivel:texto,gov_br_vinculado:booleano,govbr_nivel_autenticacao:texto,govbr_uid:texto,id:id,nome:texto,notificacoes_email:booleano,notificacoes_push:booleano,role_display:texto,telefone:texto,updated_at:data,user_id:id',
  promo_brindes:
    'categoria:texto,created_at:data,descricao:texto,estoque:numero,id:id,nome:texto,preco:numero,updated_at:data',
  promocoes:
    'cargo_anterior_id:id,cargo_novo_id:id,colaborador_id:id,created_at:data,data_vigencia:data,id:id,motivo:texto,salario_anterior:numero,salario_novo:numero',
  prorrogacoes_afastamento:
    'afastamento_id:id,created_at:data,created_by:texto,data_fim_anterior:data,data_fim_nova:data,data_pericia:data,dias_adicionais:numero,id:id,motivo:texto,numero_beneficio_novo:texto',
  provisao_auditoria:
    'created_at:data,id:id,motivo:texto,provisao_id:id,usuario_id:id,valor_anterior:numero,valor_novo:numero',
  provisao_logs:
    'competencia:competencia,created_at:data,duracao_ms:numero,empresa_id:id,erro_mensagem:texto,id:id,metadados:json,status:texto,tipo_calculo:texto,total_colaboradores:numero,usuario_id:id,valor_total_provisionado:numero',
  provisoes_folha:
    'colaborador_id:id,competencia:competencia,created_at:data,empresa_id:id,encargos_provisao:numero,id:id,valor_13_salario:numero,valor_ferias:numero',
  provisoes_mensais:
    'colaborador_id:id,competencia:competencia,created_at:data,empresa_id:id,encargos_fgts:numero,encargos_inss:numero,id:id,log_id:id,tipo:texto,total:numero,updated_at:data,valor_principal:numero',
  push_subscriptions:
    'active:booleano,created_at:data,device_info:texto,id:id,subscription:json,updated_at:data,user_id:id',
  query_telemetry:
    'count_mode:texto,created_at:data,duration_ms:numero,error_message:texto,id:id,operation:texto,query_limit:numero,query_offset:numero,record_count:numero,rpc_name:texto,severity:texto,table_name:texto,user_id:id',
  rate_limit_config:
    'block_duration_seconds:numero,created_at:data,enabled:booleano,endpoint:texto,id:id,max_requests:numero,updated_at:data,window_seconds:numero',
  rate_limit_logs:
    'blocked:booleano,created_at:data,endpoint:texto,id:id,ip_address:texto,request_count:numero,user_id:id,window_start:texto',
  rate_limits: 'created_at:data,id:id,key:texto,timestamp:numero',
  recargas_vale:
    'colaborador_id:id,created_at:data,data_recarga:data,id:id,mes_referencia:competencia,origem_recurso:texto,status:texto,vale_id:id,valor:numero',
  recrutamento_agendamentos:
    'candidatura_id:id,created_at:data,data_hora:data,duracao_minutos:numero,empresa_id:id,feedback_entrevistador:texto,id:id,local_link:texto,responsavel_id:id,status:texto,titulo:texto,updated_at:data',
  recrutamento_anotacoes: 'anotacao:texto,candidatura_id:id,created_at:data,id:id,privada:booleano,usuario_id:id',
  recrutamento_entrevistas:
    'candidatura_id:id,created_at:data,data_hora:data,entrevistador_id:id,feedback:texto,id:id,local_link:texto,nota:numero,status:texto,tipo:texto,updated_at:data',
  recrutamento_testes:
    'candidatura_id:id,comentarios:texto,created_at:data,data_entrega:data,data_envio:data,id:id,nome_teste:texto,nota:numero,status:texto,updated_at:data,url_teste:texto',
  registros_ponto:
    'aprovado:booleano,aprovado_em:data,aprovado_por:texto,atraso_minutos:numero,colaborador_id:id,created_at:data,created_by:texto,data:texto,dispositivo_id:id,empresa_id:id,entrada_1:texto,entrada_2:texto,entrada_3:texto,entrada_4:texto,entrada_5:texto,entrada_6:texto,entrada_esperada:texto,hash_digital:texto,hash_integridade:texto,horas_extras:texto,horas_falta:texto,horas_trabalhadas:texto,id:id,is_offline:booleano,justificativa:texto,observacoes:texto,retorno_intervalo:texto,saida_1:texto,saida_2:texto,saida_3:texto,saida_4:texto,saida_5:texto,saida_6:texto,saida_antecipada_minutos:numero,saida_esperada:texto,saida_intervalo:texto,sync_at:data,timezone:texto,tipo_dia:texto,total_batidas:numero,updated_at:data,versao_app:texto,version:numero',
  relacionamentos_contato_emergencia: 'created_at:data,id:numero,nome:texto',
  relacionamentos_dependentes: 'codigo_esocial:texto,created_at:data,descricao:texto,id:numero,nome:texto',
  relatorios_agendados:
    'ativo:booleano,created_at:data,created_by:texto,dia_mes:numero,dia_semana:numero,email_destinatario:texto,empresa_id:id,formato:texto,frequencia:texto,hora_envio:texto,id:id,nome:texto,parametros:json,proximo_envio:texto,tipo_relatorio:texto,ultimo_envio:texto,updated_at:data',
  role_permissions: 'created_at:data,created_by:texto,id:id,permission_code:texto,role:texto',
  rubricas_folha:
    'ativo:booleano,automatico:booleano,codigo:texto,codigo_esocial:texto,created_at:data,descricao:texto,empresa_id:id,formula:texto,id:id,incide_fgts:booleano,incide_inss:booleano,incide_irrf:booleano,natureza_rubrica:texto,tipo:texto,updated_at:data',
  saved_filters:
    'created_at:data,entity_type:texto,filters:json,id:id,is_default:booleano,name:texto,updated_at:data,user_id:id',
  sec_policy_regressions: 'cmd:texto,created_at:data,id:id,motivo:texto,policy_name:texto,scan_at:data,tabela:texto',
  sec_seal_events: 'ator:texto,created_at:data,detalhe:texto,evento:texto,id:id,registro_id:id,tabela:texto',
  security_alerts:
    'created_at:data,details:json,id:id,ip_address:texto,resolved:booleano,resolved_at:data,resolved_by:texto,severity:texto,type:texto,user_id:id',
  sefip_arquivos:
    'competencia:competencia,conteudo:texto,created_at:data,empresa_id:id,id:id,modalidade:numero,status:texto,total_colaboradores:numero,total_fgts:numero,total_remuneracao:numero,updated_at:data',
  seguros_colaboradores: 'colaborador_id:id,created_at:data,data_adesao:data,id:id,seguro_vida_id:id,status:texto',
  seguros_vida:
    'apolice_numero:texto,ativo:booleano,capital_segurado:numero,colaborador_id:id,created_at:data,data_fim:data,data_inicio:data,data_vencimento_apolice:data,empresa_id:id,id:id,numero_apolice:texto,possui_assistencia_funeral:booleano,premio_mensal:numero,seguradora:texto,updated_at:data',
  simulacoes_fiscais:
    'configuracao:json,created_at:data,descricao:texto,empresa_id:id,id:id,resultado:json,titulo:texto,usuario_id:id',
  sindicatos:
    'cnpj:texto,contribuicao_mensal:numero,created_at:data,data_base:data,email:texto,id:id,nome:texto,telefone:texto',
  sinistros_seguro:
    'colaborador_id:id,created_at:data,data_sinistro:data,descricao:texto,id:id,seguro_vida_id:id,status:texto,tipo:texto',
  solicitacoes_ajuste_ponto:
    'analisado_por:texto,aprovado_por:texto,colaborador_id:id,created_at:data,data_analise:data,data_ponto:data,empresa_id:id,hora_original:texto,hora_sugerida:texto,id:id,motivo:texto,observacoes_gestor:texto,rascunho:booleano,relatorio_conformidade:json,status:texto,tipo_ponto:texto,updated_at:data',
  solicitacoes_hora_extra:
    'aprovado_em:data,aprovado_por:texto,colaborador_id:id,created_at:data,created_by:texto,data:texto,empresa_id:id,horas_solicitadas:numero,id:id,motivo:texto,observacoes_aprovador:texto,status:texto,updated_at:data',
  sst_cat:
    'agente_causador:texto,agente_causador_codigo:texto,atestado_medico_url:texto,boletim_ocorrencia_url:texto,cat_origem_id:id,cid_principal:texto,cid_secundarios:lista,colaborador_id:id,created_at:data,created_by:texto,data_acidente:data,data_envio_esocial:data,dias_afastamento_estimado:numero,empresa_id:id,especificacao_local:texto,evento_esocial_id:id,hash_integridade:texto,hora_acidente:texto,houve_afastamento:booleano,houve_internacao:booleano,houve_obito:booleano,id:id,iniciativa_cat:texto,local_acidente:texto,minutos_trabalhados_antes:numero,numero_cat:texto,observacoes:texto,parte_corpo_atingida:texto,parte_corpo_codigo:texto,prazo_limite_envio:texto,protocolo_esocial:texto,retifica_cat_id:id,situacao_geradora:texto,status_esocial:texto,tipo_acidente:texto,tipo_cat:texto,tipo_local:texto,ultimo_dia_trabalhado:texto,updated_at:data',
  sst_cat_anexos:
    'cat_id:id,created_at:data,file_name:texto,file_size_bytes:numero,file_url:texto,id:id,tipo:texto,uploaded_by:texto',
  sst_cat_testemunhas:
    'cat_id:id,cpf:texto,created_at:data,depoimento:texto,endereco:texto,id:id,nome:texto,telefone:texto',
  sst_exposicao_riscos:
    'agente_nocivo_codigo:texto,ambiente_id:id,colaborador_id:id,created_at:data,data_fim_exposicao:data,data_inicio_exposicao:data,epi_eficaz:booleano,id:id,intensidade_concentracao:texto,status_esocial:texto,tecnica_utilizada:texto',
  sst_extintores:
    'capacidade_kg:numero,codigo_patrimonio:texto,created_at:data,created_by:texto,data_fabricacao:data,data_proxima_recarga:data,data_proximo_teste_hidrostatico:data,data_ultima_recarga:data,data_ultimo_teste_hidrostatico:data,deleted_at:data,empresa_id:id,fabricante:texto,id:id,latitude:numero,local_trabalho_id:id,localizacao:texto,longitude:numero,numero_serie:texto,observacoes:texto,qr_code:texto,status:texto,tipo:texto,updated_at:data',
  sst_extintores_inspecoes:
    'acesso_desobstruido:booleano,altura_correta:booleano,corpo_integro:booleano,created_at:data,data_inspecao:data,empresa_id:id,extintor_id:id,foto_url:texto,id:id,inspetor_id:id,inspetor_nome:texto,ip_address:texto,lacre_ok:booleano,latitude:numero,longitude:numero,mangueira_ok:booleano,observacoes:texto,pressao_ok:booleano,resultado:texto,sinalizacao_ok:booleano',
  sst_incidentes:
    'colaborador_id:id,created_at:data,data_hora:data,descricao:texto,empresa_id:id,gravidade:numero,id:id,local:texto,medidas_tomadas:texto,status:texto,testemunhas:json,tipo:texto,updated_at:data',
  sst_ltcat_laudos:
    'agentes_nocivos:json,aposentadoria_especial:json,arquivo_path:texto,conclusao:texto,created_at:data,data_emissao:data,data_validade:data,empresa_id:id,gerado_por:texto,ghes_avaliados:json,hash_sha256:texto,id:id,medicoes:json,metadata:json,responsavel_tecnico_nome:texto,responsavel_tecnico_registro:texto,responsavel_tecnico_tipo:texto,status:texto,titulo:texto,updated_at:data,versao:numero',
  sst_ordens_servico:
    'arquivo_path:texto,cargo_id:id,colaborador_id:id,created_at:data,descricao_atividades:texto,empresa_id:id,epis_obrigatorios:json,escopo:texto,gerado_por:texto,hash_sha256:texto,id:id,medidas_controle:json,metadata:json,penalidades_descumprimento:texto,procedimentos_emergencia:texto,responsavel_cargo:texto,responsavel_nome:texto,responsavel_registro:texto,riscos:json,status:texto,titulo:texto,updated_at:data,versao:numero',
  sst_programas:
    'arquivo_url:texto,created_at:data,data_emissao:data,data_validade:data,empresa_id:id,gerado_por:texto,hash_sha256:texto,id:id,metadata:json,registro_profissional:texto,responsavel_tecnico:texto,status:texto,tipo:texto,titulo:texto,updated_at:data,versao:numero',
  sst_regimento_assinaturas:
    'assinado_em:data,colaborador_id:id,created_at:data,documento_id:id,empresa_id:id,hash_assinatura:texto,hash_documento:texto,id:id,ip_origem:texto,user_agent:texto',
  sst_regimento_documentos:
    'conteudo_html:texto,created_at:data,created_by:texto,empresa_id:id,hash_sha256:texto,id:id,observacoes:texto,publicado_em:data,publicado_por:texto,status:texto,titulo:texto,updated_at:data,versao:numero',
  sst_regimento_interno:
    'artigo_clt_base:texto,created_at:data,empresa_id:id,id:id,infracao_tipo:texto,pontos_gravidade:numero,puniciao_sugerida:texto',
  sst_riscos_ambientais:
    'agente:texto,categoria:texto,created_at:data,empresa_id:id,id:id,intensidade_concentracao:texto,limite_tolerancia:texto,local_id:id,tecnica_utilizada:texto',
  tarefas_onboarding:
    'admissao_id:id,concluida:booleano,concluida_em:data,created_at:data,descricao:texto,id:id,prazo_dias:numero,responsavel_id:id,titulo:texto',
  taxas_cambio: 'created_at:data,data_referencia:data,id:id,moeda_destino:texto,moeda_origem:texto,taxa:numero',
  tempos_residencia: 'created_at:data,id:numero,nome:texto',
  times:
    'ativo:booleano,created_at:data,departamento_id:id,descricao:texto,empresa_id:id,id:id,lider_id:id,nome:texto,updated_at:data',
  times_brindes: 'brinde_id:id,created_at:data,id:id,quantidade_alocada:numero,time_id:id',
  tipos_admissao: 'codigo_esocial:numero,created_at:data,id:id,nome:texto',
  tipos_aviso_previo: 'created_at:data,id:numero,nome:texto',
  tipos_beneficio:
    'ativo:booleano,codigo:texto,created_at:data,desconto_colaborador:numero,descricao:texto,icone:texto,id:id,nome:texto,operadora:texto,valor_padrao:numero',
  tipos_deficiencia: 'created_at:data,id:numero,nome:texto',
  tipos_desligamento: 'codigo_esocial:texto,created_at:data,id:numero,nome:texto',
  tipos_estabilidade: 'created_at:data,descricao:texto,duracao_meses:numero,id:id,nome:texto',
  tipos_pagamento: 'created_at:data,id:numero,nome:texto',
  tipos_salario: 'codigo_esocial:texto,created_at:data,id:numero,nome:texto',
  tipos_visto: 'created_at:data,id:numero,nome:texto',
  transferencias:
    'colaborador_id:id,created_at:data,data_vigencia:data,departamento_anterior_id:id,departamento_novo_id:id,id:id,motivo:texto',
  treinamento_certificados:
    'arquivo_url:texto,codigo_autenticacao:texto,colaborador_id:id,created_at:data,curso_id:id,data_emissao:data,data_validade:data,id:id,inscricao_id:id',
  treinamento_feedback:
    'aplicabilidade_nota:numero,comentario:texto,created_at:data,id:id,inscricao_id:id,nota_satisfacao:numero',
  treinamento_feedbacks:
    'comentario:texto,created_at:data,id:id,inscricao_id:id,nota_conteudo:numero,nota_instrutor:numero,sugestoes:texto',
  treinamento_instancias:
    'capacidade_maxima:numero,created_at:data,curso_id:id,data_fim:data,data_inicio:data,id:id,instrutor_id:id,local_link:texto,status:texto,updated_at:data',
  treinamento_participantes: 'colaborador_id:id,created_at:data,id:id,presente:booleano,treinamento_id:id',
  treinamentos:
    'carga_horaria:numero,created_at:data,data:texto,descricao:texto,empresa_id:id,id:id,nome:texto,updated_at:data',
  triagem_notas: 'candidatura_id:id,comentario:texto,created_at:data,empresa_id:id,id:id,nota:numero',
  trilha_auditoria_ponto:
    'acao:texto,created_at:data,dados_anteriores:json,dados_novos:json,id:id,ip_address:texto,justificativa:texto,ponto_id:id,user_agent:texto,usuario_id:id',
  trilhas_aprendizado:
    'ativo:booleano,created_at:data,descricao:texto,empresa_id:id,id:id,nivel:texto,nome:texto,updated_at:data',
  trilhas_cursos: 'curso_id:id,id:id,obrigatorio:booleano,ordem:numero,trilha_id:id',
  turnos:
    'ativo:booleano,cor:texto,created_at:data,empresa_id:id,horario_fim:texto,horario_inicio:texto,id:id,intervalo_minutos:numero,nome:texto,updated_at:data',
  user_empresas: 'created_at:data,empresa_id:id,id:id,is_default:booleano,user_id:id',
  user_mfa:
    'backup_codes:lista,created_at:data,id:id,mfa_enabled:booleano,mfa_secret:texto,mfa_type:texto,phone_number:texto,recovery_email:texto,updated_at:data,user_id:id,verified_at:data',
  user_roles: 'created_at:data,created_by:texto,id:id,role:texto,user_id:id',
  user_sessions:
    'created_at:data,device_info:json,expires_at:data,id:id,ip_address:texto,is_active:booleano,last_activity:texto,location:json,session_token:texto,user_agent:texto,user_id:id',
  vaga_entrevistas:
    'candidatura_id:id,created_at:data,data_hora:data,empresa_id:id,etapa_id:id,feedback:texto,id:id,updated_at:data',
  vaga_etapas: 'created_at:data,empresa_id:id,id:id,nome:texto,ordem:numero,updated_at:data,vaga_id:id',
  vagas:
    'beneficios_oferecidos:texto,cargo:texto,created_at:data,data_abertura:data,data_encerramento:data,departamento:texto,descricao:texto,empresa_id:id,faixa_salarial_max:numero,faixa_salarial_min:numero,id:id,modalidade:texto,quantidade:numero,requisitos:texto,responsavel_id:id,status:texto,tipo_contrato:texto,titulo:texto,updated_at:data',
  vales_alimentacao:
    'ativo:booleano,colaborador_id:id,created_at:data,data_fim:data,data_inicio:data,dias_uteis:numero,empresa_id:id,id:id,tipo:texto,updated_at:data,valor_mensal:numero,valor_por_dia:numero',
  vales_transporte:
    'colaborador_id:id,created_at:data,desconto:numero,dias_uteis:numero,id:id,optante:booleano,percentual_desconto:numero,updated_at:data,valor_diario:numero,valor_liquido:numero,valor_mensal:numero',
  valores_campos_customizados:
    'campo_customizado_id:id,colaborador_id:id,created_at:data,id:id,updated_at:data,valor:texto',
  verbas_rescisorias:
    'codigo:texto,created_at:data,descricao:texto,desligamento_id:id,id:id,incide_fgts:booleano,incide_inss:booleano,incide_irrf:booleano,rubrica_id:id,tipo:texto,valor:numero',
  verification_tokens: 'created_at:data,expires_at:data,id:id,token:texto,type:texto,used_at:data,user_id:id',
  versao_banco: 'descricao:texto,executado_em:data,id:id,versao:texto',
  vinculos:
    'categoria:texto,colaborador_id:id,created_at:data,data_fim:data,data_inicio:data,id:id,matricula:texto,status:texto,tipo:texto',
  webauthn_challenges: 'challenge:texto,created_at:data,expires_at:data,id:id,type:texto,user_id:id',
  webauthn_credentials:
    'counter:numero,created_at:data,credential_id:id,device_type:texto,friendly_name:texto,id:id,last_used_at:data,public_key:texto,transports:lista,user_id:id',
  webhook_logs:
    'created_at:data,duracao_ms:numero,erro:texto,event_id:id,evento:texto,headers:json,id:id,payload:json,resposta:texto,status:texto,status_code:numero,tentativa:numero,version:texto,webhook_id:id',
  webhooks:
    'ativo:booleano,created_at:data,empresa_id:id,eventos:lista,id:id,max_tentativas:numero,nome:texto,retry_intervalo_segundos:numero,secret:texto,timeout_segundos:numero,total_falha:numero,total_sucesso:numero,ultima_execucao:texto,ultimo_erro:texto,ultimo_status:numero,updated_at:data,url:texto',
  webhooks_config:
    'ativo:booleano,created_at:data,empresa_id:id,eventos:lista,id:id,secret:texto,ultimo_envio:texto,ultimo_status:numero,updated_at:data,url:texto',
  webhooks_logs: 'created_at:data,evento:texto,id:id,payload:json,resposta:texto,status_code:numero,webhook_id:id',
  whatsapp_config:
    'api_key:texto,created_at:data,empresa_id:id,id:id,instancia_nome:texto,instancia_url:texto,notificar_ferias:booleano,notificar_holerite:booleano,notificar_ponto:booleano,status:texto,updated_at:data',
  whatsapp_mensagens_logs:
    'colaborador_id:id,created_at:data,empresa_id:id,error_message:texto,id:id,mensagem_id_externo:texto,status:texto,telefone:texto,template_id:id,updated_at:data',
  whatsapp_templates: 'categoria:texto,conteudo:texto,created_at:data,empresa_id:id,id:id,nome:texto,status:texto',
  workflows_config:
    'acao_tipo:texto,ativo:booleano,configuracao:json,created_at:data,empresa_id:id,evento_tipo:texto,id:id,updated_at:data',
  workflows_definicoes:
    'ativo:booleano,created_at:data,created_by:texto,descricao:texto,empresa_id:id,id:id,nome:texto,tipo:texto,updated_at:data',
  workflows_etapas:
    'aprovador_id:id,aprovador_tipo:texto,config:json,created_at:data,id:id,nome:texto,ordem:numero,tipo:texto,workflow_id:id',
  workflows_execucoes:
    'created_at:data,dados:json,empresa_id:id,entidade_id:id,entidade_tipo:texto,etapa_atual_id:id,id:id,log_execucao:json,metadata:json,metadata_automacao:json,solicitante_id:id,status:texto,updated_at:data,workflow_id:id',
  workflows_historico: 'acao:texto,created_at:data,etapa_id:id,execucao_id:id,id:id,observacoes:texto,usuario_id:id',
};

function analisar(linha: string): Record<string, TipoColuna> {
  const colunas: Record<string, TipoColuna> = {};
  for (const par of linha.split(',')) {
    const [nome, tipo] = par.split(':');
    if (nome) colunas[nome] = (tipo as TipoColuna) ?? 'texto';
  }
  return colunas;
}

/** Colunas (nome → tipo) de uma tabela do schema público; `undefined` se não existir. */
export function colunasDaTabela(tabela: string): Record<string, TipoColuna> | undefined {
  const bruto = ESQUEMA_TABELAS[tabela];
  return bruto ? analisar(bruto) : undefined;
}
