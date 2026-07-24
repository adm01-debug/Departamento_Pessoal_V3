export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      adiantamentos_salariais: {
        Row: {
          aprovado_por: string | null
          colaborador_id: string
          competencia_desconto: string
          created_at: string
          data_pagamento: string | null
          data_solicitacao: string
          empresa_id: string
          id: string
          motivo: string | null
          status: string | null
          updated_at: string
          valor_solicitado: number
        }
        Insert: {
          aprovado_por?: string | null
          colaborador_id: string
          competencia_desconto: string
          created_at?: string
          data_pagamento?: string | null
          data_solicitacao?: string
          empresa_id: string
          id?: string
          motivo?: string | null
          status?: string | null
          updated_at?: string
          valor_solicitado: number
        }
        Update: {
          aprovado_por?: string | null
          colaborador_id?: string
          competencia_desconto?: string
          created_at?: string
          data_pagamento?: string | null
          data_solicitacao?: string
          empresa_id?: string
          id?: string
          motivo?: string | null
          status?: string | null
          updated_at?: string
          valor_solicitado?: number
        }
        Relationships: [
          {
            foreignKeyName: "adiantamentos_salariais_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adiantamentos_salariais_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adiantamentos_salariais_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adiantamentos_salariais_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "adiantamentos_salariais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      admissao_tokens: {
        Row: {
          admissao_id: string
          assinado_em: string | null
          assinatura_base64: string | null
          assinatura_url: string | null
          contrato_assinado: boolean | null
          contrato_gerado: boolean | null
          created_at: string
          dados_preenchidos: boolean | null
          data_expiracao: string
          documentos_enviados: boolean | null
          email_candidato: string | null
          id: string
          ip_assinatura: string | null
          telefone_candidato: string | null
          token: string
          updated_at: string
        }
        Insert: {
          admissao_id: string
          assinado_em?: string | null
          assinatura_base64?: string | null
          assinatura_url?: string | null
          contrato_assinado?: boolean | null
          contrato_gerado?: boolean | null
          created_at?: string
          dados_preenchidos?: boolean | null
          data_expiracao?: string
          documentos_enviados?: boolean | null
          email_candidato?: string | null
          id?: string
          ip_assinatura?: string | null
          telefone_candidato?: string | null
          token?: string
          updated_at?: string
        }
        Update: {
          admissao_id?: string
          assinado_em?: string | null
          assinatura_base64?: string | null
          assinatura_url?: string | null
          contrato_assinado?: boolean | null
          contrato_gerado?: boolean | null
          created_at?: string
          dados_preenchidos?: boolean | null
          data_expiracao?: string
          documentos_enviados?: boolean | null
          email_candidato?: string | null
          id?: string
          ip_assinatura?: string | null
          telefone_candidato?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admissao_tokens_admissao_id_fkey"
            columns: ["admissao_id"]
            isOneToOne: false
            referencedRelation: "admissoes"
            referencedColumns: ["id"]
          },
        ]
      }
      admissoes: {
        Row: {
          cargo: string
          checklist_comprovante_endereco: boolean | null
          checklist_contrato_assinado: boolean | null
          checklist_ctps: boolean | null
          checklist_documentos_pessoais: boolean | null
          checklist_esocial_enviado: boolean | null
          checklist_exame_admissional: boolean | null
          checklist_foto: boolean | null
          cpf: string | null
          created_at: string
          created_by: string | null
          data_nascimento: string | null
          data_prevista: string
          data_transmissao_esocial: string | null
          departamento: string
          email: string | null
          empresa_id: string | null
          estado_civil: string | null
          etapa: Database["public"]["Enums"]["etapa_admissao"]
          id: string
          metadata: Json | null
          nome: string
          nome_mae: string | null
          observacoes: string | null
          protocolo_esocial: string | null
          salario_proposto: number
          sexo: string | null
          status_esocial: string | null
          telefone: string | null
          template_contrato_id: string | null
          updated_at: string
        }
        Insert: {
          cargo: string
          checklist_comprovante_endereco?: boolean | null
          checklist_contrato_assinado?: boolean | null
          checklist_ctps?: boolean | null
          checklist_documentos_pessoais?: boolean | null
          checklist_esocial_enviado?: boolean | null
          checklist_exame_admissional?: boolean | null
          checklist_foto?: boolean | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          data_prevista: string
          data_transmissao_esocial?: string | null
          departamento: string
          email?: string | null
          empresa_id?: string | null
          estado_civil?: string | null
          etapa?: Database["public"]["Enums"]["etapa_admissao"]
          id?: string
          metadata?: Json | null
          nome: string
          nome_mae?: string | null
          observacoes?: string | null
          protocolo_esocial?: string | null
          salario_proposto: number
          sexo?: string | null
          status_esocial?: string | null
          telefone?: string | null
          template_contrato_id?: string | null
          updated_at?: string
        }
        Update: {
          cargo?: string
          checklist_comprovante_endereco?: boolean | null
          checklist_contrato_assinado?: boolean | null
          checklist_ctps?: boolean | null
          checklist_documentos_pessoais?: boolean | null
          checklist_esocial_enviado?: boolean | null
          checklist_exame_admissional?: boolean | null
          checklist_foto?: boolean | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          data_prevista?: string
          data_transmissao_esocial?: string | null
          departamento?: string
          email?: string | null
          empresa_id?: string | null
          estado_civil?: string | null
          etapa?: Database["public"]["Enums"]["etapa_admissao"]
          id?: string
          metadata?: Json | null
          nome?: string
          nome_mae?: string | null
          observacoes?: string | null
          protocolo_esocial?: string | null
          salario_proposto?: number
          sexo?: string | null
          status_esocial?: string | null
          telefone?: string | null
          template_contrato_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admissoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_admissoes_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      aej_geracoes: {
        Row: {
          colaboradores_sem_pis: number
          created_at: string
          empresa_id: string
          erro: string | null
          gerado_por: string | null
          hash_sha256: string
          id: string
          periodo_fim: string
          periodo_inicio: string
          status: string
          tamanho_bytes: number
          total_colaboradores: number
          total_marcacoes: number
        }
        Insert: {
          colaboradores_sem_pis?: number
          created_at?: string
          empresa_id: string
          erro?: string | null
          gerado_por?: string | null
          hash_sha256: string
          id?: string
          periodo_fim: string
          periodo_inicio: string
          status?: string
          tamanho_bytes?: number
          total_colaboradores?: number
          total_marcacoes?: number
        }
        Update: {
          colaboradores_sem_pis?: number
          created_at?: string
          empresa_id?: string
          erro?: string | null
          gerado_por?: string | null
          hash_sha256?: string
          id?: string
          periodo_fim?: string
          periodo_inicio?: string
          status?: string
          tamanho_bytes?: number
          total_colaboradores?: number
          total_marcacoes?: number
        }
        Relationships: [
          {
            foreignKeyName: "aej_geracoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      afastamentos: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          atestado_numero: string | null
          cid: string | null
          cid_descricao: string | null
          cid_id: string | null
          colaborador_id: string
          created_at: string
          created_by: string | null
          crm_medico: string | null
          data_fim_prevista: string
          data_fim_real: string | null
          data_inicio: string
          data_pericia: string | null
          dias_empresa: number | null
          dias_inss: number | null
          dias_total: number | null
          empresa_id: string | null
          hash_integridade: string | null
          id: string
          local_pericia: string | null
          medico_crm: string | null
          medico_nome: string | null
          motivo_rejeicao: string | null
          nome_medico: string | null
          numero_beneficio: string | null
          observacoes: string | null
          rejeitado_em: string | null
          rejeitado_por: string | null
          status: Database["public"]["Enums"]["status_afastamento"] | null
          tipo: Database["public"]["Enums"]["tipo_afastamento"]
          updated_at: string
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          atestado_numero?: string | null
          cid?: string | null
          cid_descricao?: string | null
          cid_id?: string | null
          colaborador_id: string
          created_at?: string
          created_by?: string | null
          crm_medico?: string | null
          data_fim_prevista: string
          data_fim_real?: string | null
          data_inicio: string
          data_pericia?: string | null
          dias_empresa?: number | null
          dias_inss?: number | null
          dias_total?: number | null
          empresa_id?: string | null
          hash_integridade?: string | null
          id?: string
          local_pericia?: string | null
          medico_crm?: string | null
          medico_nome?: string | null
          motivo_rejeicao?: string | null
          nome_medico?: string | null
          numero_beneficio?: string | null
          observacoes?: string | null
          rejeitado_em?: string | null
          rejeitado_por?: string | null
          status?: Database["public"]["Enums"]["status_afastamento"] | null
          tipo: Database["public"]["Enums"]["tipo_afastamento"]
          updated_at?: string
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          atestado_numero?: string | null
          cid?: string | null
          cid_descricao?: string | null
          cid_id?: string | null
          colaborador_id?: string
          created_at?: string
          created_by?: string | null
          crm_medico?: string | null
          data_fim_prevista?: string
          data_fim_real?: string | null
          data_inicio?: string
          data_pericia?: string | null
          dias_empresa?: number | null
          dias_inss?: number | null
          dias_total?: number | null
          empresa_id?: string | null
          hash_integridade?: string | null
          id?: string
          local_pericia?: string | null
          medico_crm?: string | null
          medico_nome?: string | null
          motivo_rejeicao?: string | null
          nome_medico?: string | null
          numero_beneficio?: string | null
          observacoes?: string | null
          rejeitado_em?: string | null
          rejeitado_por?: string | null
          status?: Database["public"]["Enums"]["status_afastamento"] | null
          tipo?: Database["public"]["Enums"]["tipo_afastamento"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "afastamentos_cid_id_fkey"
            columns: ["cid_id"]
            isOneToOne: false
            referencedRelation: "cid10"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "afastamentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "afastamentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "afastamentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "afastamentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "afastamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afastamentos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afastamentos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afastamentos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_afastamentos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_afastamentos_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      afdt_divergencias: {
        Row: {
          batida_id: string | null
          colaborador_id: string | null
          created_at: string
          data_hora_afdt: string | null
          delta_segundos: number | null
          empresa_id: string
          id: string
          importacao_id: string
          observacao: string | null
          pis: string | null
          registro_raw_id: string | null
          resolvido: boolean
          tipo: string
        }
        Insert: {
          batida_id?: string | null
          colaborador_id?: string | null
          created_at?: string
          data_hora_afdt?: string | null
          delta_segundos?: number | null
          empresa_id: string
          id?: string
          importacao_id: string
          observacao?: string | null
          pis?: string | null
          registro_raw_id?: string | null
          resolvido?: boolean
          tipo: string
        }
        Update: {
          batida_id?: string | null
          colaborador_id?: string | null
          created_at?: string
          data_hora_afdt?: string | null
          delta_segundos?: number | null
          empresa_id?: string
          id?: string
          importacao_id?: string
          observacao?: string | null
          pis?: string | null
          registro_raw_id?: string | null
          resolvido?: boolean
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "afdt_divergencias_importacao_id_fkey"
            columns: ["importacao_id"]
            isOneToOne: false
            referencedRelation: "afdt_importacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "afdt_divergencias_registro_raw_id_fkey"
            columns: ["registro_raw_id"]
            isOneToOne: false
            referencedRelation: "afdt_registros_raw"
            referencedColumns: ["id"]
          },
        ]
      }
      afdt_importacoes: {
        Row: {
          cnpj_empregador: string | null
          created_at: string
          data_final: string | null
          data_inicial: string | null
          empresa_id: string
          hash_sha256: string | null
          id: string
          importado_por: string | null
          mensagem_erro: string | null
          metadata: Json | null
          nome_arquivo: string
          status: string
          tamanho_bytes: number | null
          tipo: string
          total_erros: number | null
          total_linhas: number | null
          total_registros: number | null
          updated_at: string
        }
        Insert: {
          cnpj_empregador?: string | null
          created_at?: string
          data_final?: string | null
          data_inicial?: string | null
          empresa_id: string
          hash_sha256?: string | null
          id?: string
          importado_por?: string | null
          mensagem_erro?: string | null
          metadata?: Json | null
          nome_arquivo: string
          status?: string
          tamanho_bytes?: number | null
          tipo: string
          total_erros?: number | null
          total_linhas?: number | null
          total_registros?: number | null
          updated_at?: string
        }
        Update: {
          cnpj_empregador?: string | null
          created_at?: string
          data_final?: string | null
          data_inicial?: string | null
          empresa_id?: string
          hash_sha256?: string | null
          id?: string
          importado_por?: string | null
          mensagem_erro?: string | null
          metadata?: Json | null
          nome_arquivo?: string
          status?: string
          tamanho_bytes?: number | null
          tipo?: string
          total_erros?: number | null
          total_linhas?: number | null
          total_registros?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      afdt_registros_raw: {
        Row: {
          colaborador_id: string | null
          conteudo_original: string | null
          cpf: string | null
          created_at: string
          data_hora_marcacao: string | null
          empresa_id: string
          erro: string | null
          id: string
          importacao_id: string
          linha_numero: number | null
          nsr: number | null
          pis: string | null
          tipo_registro: string | null
        }
        Insert: {
          colaborador_id?: string | null
          conteudo_original?: string | null
          cpf?: string | null
          created_at?: string
          data_hora_marcacao?: string | null
          empresa_id: string
          erro?: string | null
          id?: string
          importacao_id: string
          linha_numero?: number | null
          nsr?: number | null
          pis?: string | null
          tipo_registro?: string | null
        }
        Update: {
          colaborador_id?: string | null
          conteudo_original?: string | null
          cpf?: string | null
          created_at?: string
          data_hora_marcacao?: string | null
          empresa_id?: string
          erro?: string | null
          id?: string
          importacao_id?: string
          linha_numero?: number | null
          nsr?: number | null
          pis?: string | null
          tipo_registro?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "afdt_registros_raw_importacao_id_fkey"
            columns: ["importacao_id"]
            isOneToOne: false
            referencedRelation: "afdt_importacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      ajustes_ponto: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          campo_alterado: string
          colaborador_id: string
          created_at: string
          created_by: string | null
          id: string
          motivo: string
          registro_ponto_id: string
          status: string | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          campo_alterado: string
          colaborador_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          motivo: string
          registro_ponto_id: string
          status?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          campo_alterado?: string
          colaborador_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          motivo?: string
          registro_ponto_id?: string
          status?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ajustes_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajustes_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajustes_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajustes_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "ajustes_ponto_registro_ponto_id_fkey"
            columns: ["registro_ponto_id"]
            isOneToOne: false
            referencedRelation: "pontos_abertos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajustes_ponto_registro_ponto_id_fkey"
            columns: ["registro_ponto_id"]
            isOneToOne: false
            referencedRelation: "registros_ponto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ajustes_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ajustes_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ajustes_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ajustes_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      anotacoes_colaborador: {
        Row: {
          colaborador_id: string
          conteudo: string | null
          created_at: string
          created_by: string | null
          data: string | null
          id: string
          tipo: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          colaborador_id: string
          conteudo?: string | null
          created_at?: string
          created_by?: string | null
          data?: string | null
          id?: string
          tipo?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          colaborador_id?: string
          conteudo?: string | null
          created_at?: string
          created_by?: string | null
          data?: string | null
          id?: string
          tipo?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anotacoes_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anotacoes_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anotacoes_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anotacoes_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_anotacoes_colaborador_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_anotacoes_colaborador_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_anotacoes_colaborador_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_anotacoes_colaborador_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      asos: {
        Row: {
          agendamento_id: string | null
          arquivo_url: string | null
          assinado_em: string | null
          assinatura_medico_hash: string | null
          clinica: string | null
          clinica_partner_id: string | null
          colaborador_id: string
          created_at: string
          data_exame: string
          data_validade: string | null
          emitido_por_partner_user: string | null
          empresa_id: string | null
          hash_integridade: string | null
          id: string
          medico_crm: string | null
          medico_nome: string | null
          motivo_cancelamento: string | null
          observacoes: string | null
          recebido_rh_em: string | null
          recebido_rh_por: string | null
          restricao_data_fim: string | null
          restricoes: Json
          restricoes_descricao: string | null
          resultado: string | null
          status: string
          tipo: string
          updated_at: string
          validado_em: string | null
          validado_por: string | null
        }
        Insert: {
          agendamento_id?: string | null
          arquivo_url?: string | null
          assinado_em?: string | null
          assinatura_medico_hash?: string | null
          clinica?: string | null
          clinica_partner_id?: string | null
          colaborador_id: string
          created_at?: string
          data_exame: string
          data_validade?: string | null
          emitido_por_partner_user?: string | null
          empresa_id?: string | null
          hash_integridade?: string | null
          id?: string
          medico_crm?: string | null
          medico_nome?: string | null
          motivo_cancelamento?: string | null
          observacoes?: string | null
          recebido_rh_em?: string | null
          recebido_rh_por?: string | null
          restricao_data_fim?: string | null
          restricoes?: Json
          restricoes_descricao?: string | null
          resultado?: string | null
          status?: string
          tipo: string
          updated_at?: string
          validado_em?: string | null
          validado_por?: string | null
        }
        Update: {
          agendamento_id?: string | null
          arquivo_url?: string | null
          assinado_em?: string | null
          assinatura_medico_hash?: string | null
          clinica?: string | null
          clinica_partner_id?: string | null
          colaborador_id?: string
          created_at?: string
          data_exame?: string
          data_validade?: string | null
          emitido_por_partner_user?: string | null
          empresa_id?: string | null
          hash_integridade?: string | null
          id?: string
          medico_crm?: string | null
          medico_nome?: string | null
          motivo_cancelamento?: string | null
          observacoes?: string | null
          recebido_rh_em?: string | null
          recebido_rh_por?: string | null
          restricao_data_fim?: string | null
          restricoes?: Json
          restricoes_descricao?: string | null
          resultado?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          validado_em?: string | null
          validado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asos_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "exames_agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asos_clinica_partner_id_fkey"
            columns: ["clinica_partner_id"]
            isOneToOne: false
            referencedRelation: "clinicas_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "asos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_asos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_asos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_asos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_asos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_asos_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          acao: string
          campos_alterados: string[] | null
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          id: string
          ip_address: string | null
          registro_id: string
          tabela: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          acao: string
          campos_alterados?: string[] | null
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          ip_address?: string | null
          registro_id: string
          tabela: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          campos_alterados?: string[] | null
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          ip_address?: string | null
          registro_id?: string
          tabela?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_log_unified: {
        Row: {
          action: string | null
          empresa_id: string | null
          entity: string | null
          entity_id: string | null
          id: string
          ingested_at: string
          ip_address: unknown
          occurred_at: string
          payload: Json | null
          source_id: string | null
          source_table: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          empresa_id?: string | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          ingested_at?: string
          ip_address?: unknown
          occurred_at?: string
          payload?: Json | null
          source_id?: string | null
          source_table: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          empresa_id?: string | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          ingested_at?: string
          ip_address?: unknown
          occurred_at?: string
          payload?: Json | null
          source_id?: string | null
          source_table?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_log_unified_archive: {
        Row: {
          action: string | null
          empresa_id: string | null
          entity: string | null
          entity_id: string | null
          id: string
          ingested_at: string
          ip_address: unknown
          occurred_at: string
          payload: Json | null
          source_id: string | null
          source_table: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          empresa_id?: string | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          ingested_at?: string
          ip_address?: unknown
          occurred_at?: string
          payload?: Json | null
          source_id?: string | null
          source_table: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          empresa_id?: string | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          ingested_at?: string
          ip_address?: unknown
          occurred_at?: string
          payload?: Json | null
          source_id?: string | null
          source_table?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          empresa_id: string | null
          entity: string
          entity_id: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          empresa_id?: string | null
          entity: string
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          empresa_id?: string | null
          entity?: string
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria: {
        Row: {
          acao: string
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          descricao: string | null
          empresa_id: string | null
          entidade: string | null
          entidade_id: string | null
          id: string
          ip_address: string | null
          usuario_id: string | null
          usuario_nome: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          descricao?: string | null
          empresa_id?: string | null
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          ip_address?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          descricao?: string | null
          empresa_id?: string | null
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          ip_address?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Relationships: []
      }
      auditoria_contratual: {
        Row: {
          alterado_por: string | null
          campo_alterado: string | null
          colaborador_id: string | null
          created_at: string | null
          id: string
          valor_antigo: string | null
          valor_novo: string | null
        }
        Insert: {
          alterado_por?: string | null
          campo_alterado?: string | null
          colaborador_id?: string | null
          created_at?: string | null
          id?: string
          valor_antigo?: string | null
          valor_novo?: string | null
        }
        Update: {
          alterado_por?: string | null
          campo_alterado?: string | null
          colaborador_id?: string | null
          created_at?: string | null
          id?: string
          valor_antigo?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_contratual_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_contratual_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_contratual_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_contratual_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      auditoria_logs: {
        Row: {
          acao: string
          created_at: string | null
          dados_anteriores: Json | null
          dados_novos: Json | null
          descricao: string | null
          empresa_id: string | null
          entidade: string
          entidade_id: string | null
          id: string
          ip_address: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          descricao?: string | null
          empresa_id?: string | null
          entidade: string
          entidade_id?: string | null
          id?: string
          ip_address?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          descricao?: string | null
          empresa_id?: string | null
          entidade?: string
          entidade_id?: string | null
          id?: string
          ip_address?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_gov_br_sessions: {
        Row: {
          access_token: string
          cpf: string | null
          created_at: string | null
          id: string
          id_token: string | null
          metadata: Json | null
          nivel_autenticacao: string | null
          user_id: string | null
        }
        Insert: {
          access_token: string
          cpf?: string | null
          created_at?: string | null
          id?: string
          id_token?: string | null
          metadata?: Json | null
          nivel_autenticacao?: string | null
          user_id?: string | null
        }
        Update: {
          access_token?: string
          cpf?: string | null
          created_at?: string | null
          id?: string
          id_token?: string | null
          metadata?: Json | null
          nivel_autenticacao?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      automacao_logs: {
        Row: {
          created_at: string | null
          detalhes: Json | null
          entidade_id: string | null
          id: string
          status: string | null
          tipo_evento: string | null
          workflow_id: string | null
        }
        Insert: {
          created_at?: string | null
          detalhes?: Json | null
          entidade_id?: string | null
          id?: string
          status?: string | null
          tipo_evento?: string | null
          workflow_id?: string | null
        }
        Update: {
          created_at?: string | null
          detalhes?: Json | null
          entidade_id?: string | null
          id?: string
          status?: string | null
          tipo_evento?: string | null
          workflow_id?: string | null
        }
        Relationships: []
      }
      banco_horas: {
        Row: {
          colaborador_id: string
          created_at: string
          created_by: string | null
          data: string
          empresa_id: string | null
          horas: string
          id: string
          motivo: string | null
          registro_ponto_id: string | null
          saldo_anterior: string | null
          saldo_atual: string | null
          tipo: string
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          created_by?: string | null
          data: string
          empresa_id?: string | null
          horas: string
          id?: string
          motivo?: string | null
          registro_ponto_id?: string | null
          saldo_anterior?: string | null
          saldo_atual?: string | null
          tipo: string
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          created_by?: string | null
          data?: string
          empresa_id?: string | null
          horas?: string
          id?: string
          motivo?: string | null
          registro_ponto_id?: string | null
          saldo_anterior?: string | null
          saldo_atual?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "banco_horas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banco_horas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banco_horas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banco_horas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "banco_horas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banco_horas_registro_ponto_id_fkey"
            columns: ["registro_ponto_id"]
            isOneToOne: false
            referencedRelation: "pontos_abertos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banco_horas_registro_ponto_id_fkey"
            columns: ["registro_ponto_id"]
            isOneToOne: false
            referencedRelation: "registros_ponto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_banco_horas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_banco_horas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_banco_horas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_banco_horas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_banco_horas_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      banco_horas_config: {
        Row: {
          acordo_tipo: string | null
          alerta_saldo_negativo_horas: number | null
          compensacao_automatica: boolean | null
          created_at: string | null
          empresa_id: string | null
          id: string
          prazo_meses: number | null
          saldo_maximo_horas: number | null
          updated_at: string | null
        }
        Insert: {
          acordo_tipo?: string | null
          alerta_saldo_negativo_horas?: number | null
          compensacao_automatica?: boolean | null
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          prazo_meses?: number | null
          saldo_maximo_horas?: number | null
          updated_at?: string | null
        }
        Update: {
          acordo_tipo?: string | null
          alerta_saldo_negativo_horas?: number | null
          compensacao_automatica?: boolean | null
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          prazo_meses?: number | null
          saldo_maximo_horas?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banco_horas_config_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_banco_horas_config_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      batidas_ponto: {
        Row: {
          ajustado: boolean | null
          ajustado_por: string | null
          anomalia_detectada: boolean | null
          biometria_score: number | null
          biometria_status: string | null
          colaborador_id: string
          created_at: string | null
          data: string
          dentro_raio: boolean | null
          device_metadata: Json | null
          dispositivo_id: string | null
          distancia_local_metros: number | null
          empresa_id: string | null
          foto_biometria_url: string | null
          hash_biometrico: string | null
          hash_comprovante: string | null
          hash_digital: string | null
          hash_integridade: string | null
          hora: string
          id: string
          id_fiscal_ponto: string | null
          ip_address: string | null
          is_offline: boolean | null
          justificativa_anomalia: string | null
          latitude: number | null
          longitude: number | null
          motivo_ajuste: string | null
          offline: boolean | null
          offset_timezone: number | null
          ordem: number
          origem: string | null
          precisao_metros: number | null
          sync_at: string | null
          timestamp_dispositivo: string | null
          timezone: string | null
          tipo: string
          updated_at: string | null
          versao_app: string | null
        }
        Insert: {
          ajustado?: boolean | null
          ajustado_por?: string | null
          anomalia_detectada?: boolean | null
          biometria_score?: number | null
          biometria_status?: string | null
          colaborador_id: string
          created_at?: string | null
          data: string
          dentro_raio?: boolean | null
          device_metadata?: Json | null
          dispositivo_id?: string | null
          distancia_local_metros?: number | null
          empresa_id?: string | null
          foto_biometria_url?: string | null
          hash_biometrico?: string | null
          hash_comprovante?: string | null
          hash_digital?: string | null
          hash_integridade?: string | null
          hora: string
          id?: string
          id_fiscal_ponto?: string | null
          ip_address?: string | null
          is_offline?: boolean | null
          justificativa_anomalia?: string | null
          latitude?: number | null
          longitude?: number | null
          motivo_ajuste?: string | null
          offline?: boolean | null
          offset_timezone?: number | null
          ordem: number
          origem?: string | null
          precisao_metros?: number | null
          sync_at?: string | null
          timestamp_dispositivo?: string | null
          timezone?: string | null
          tipo?: string
          updated_at?: string | null
          versao_app?: string | null
        }
        Update: {
          ajustado?: boolean | null
          ajustado_por?: string | null
          anomalia_detectada?: boolean | null
          biometria_score?: number | null
          biometria_status?: string | null
          colaborador_id?: string
          created_at?: string | null
          data?: string
          dentro_raio?: boolean | null
          device_metadata?: Json | null
          dispositivo_id?: string | null
          distancia_local_metros?: number | null
          empresa_id?: string | null
          foto_biometria_url?: string | null
          hash_biometrico?: string | null
          hash_comprovante?: string | null
          hash_digital?: string | null
          hash_integridade?: string | null
          hora?: string
          id?: string
          id_fiscal_ponto?: string | null
          ip_address?: string | null
          is_offline?: boolean | null
          justificativa_anomalia?: string | null
          latitude?: number | null
          longitude?: number | null
          motivo_ajuste?: string | null
          offline?: boolean | null
          offset_timezone?: number | null
          ordem?: number
          origem?: string | null
          precisao_metros?: number | null
          sync_at?: string | null
          timestamp_dispositivo?: string | null
          timezone?: string | null
          tipo?: string
          updated_at?: string | null
          versao_app?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batidas_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batidas_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batidas_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batidas_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "batidas_ponto_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_batidas_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_batidas_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_batidas_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_batidas_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_batidas_ponto_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiarios_plano: {
        Row: {
          colaborador_id: string | null
          cpf: string | null
          created_at: string
          data_carencia: string | null
          data_exclusao: string | null
          data_inclusao: string | null
          id: string
          nome: string | null
          parentesco: string | null
          plano_saude_id: string | null
          status: string | null
          tipo: string | null
        }
        Insert: {
          colaborador_id?: string | null
          cpf?: string | null
          created_at?: string
          data_carencia?: string | null
          data_exclusao?: string | null
          data_inclusao?: string | null
          id?: string
          nome?: string | null
          parentesco?: string | null
          plano_saude_id?: string | null
          status?: string | null
          tipo?: string | null
        }
        Update: {
          colaborador_id?: string | null
          cpf?: string | null
          created_at?: string
          data_carencia?: string | null
          data_exclusao?: string | null
          data_inclusao?: string | null
          id?: string
          nome?: string | null
          parentesco?: string | null
          plano_saude_id?: string | null
          status?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beneficiarios_plano_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiarios_plano_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiarios_plano_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiarios_plano_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "beneficiarios_plano_plano_saude_id_fkey"
            columns: ["plano_saude_id"]
            isOneToOne: false
            referencedRelation: "planos_saude"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_beneficiarios_plano_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_beneficiarios_plano_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_beneficiarios_plano_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_beneficiarios_plano_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      beneficiarios_seguro: {
        Row: {
          colaborador_id: string | null
          cpf: string | null
          created_at: string
          id: string
          nome: string
          parentesco: string | null
          percentual: number | null
          seguro_vida_id: string | null
          status: string | null
        }
        Insert: {
          colaborador_id?: string | null
          cpf?: string | null
          created_at?: string
          id?: string
          nome: string
          parentesco?: string | null
          percentual?: number | null
          seguro_vida_id?: string | null
          status?: string | null
        }
        Update: {
          colaborador_id?: string | null
          cpf?: string | null
          created_at?: string
          id?: string
          nome?: string
          parentesco?: string | null
          percentual?: number | null
          seguro_vida_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beneficiarios_seguro_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiarios_seguro_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiarios_seguro_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiarios_seguro_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "beneficiarios_seguro_seguro_vida_id_fkey"
            columns: ["seguro_vida_id"]
            isOneToOne: false
            referencedRelation: "seguros_vida"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_beneficiarios_seguro_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_beneficiarios_seguro_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_beneficiarios_seguro_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_beneficiarios_seguro_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      beneficio_arquivos: {
        Row: {
          beneficio_id: string | null
          created_at: string
          empresa_id: string | null
          id: string
          nome: string
          periodo_referencia: string | null
          tipo_arquivo: string | null
          url: string
        }
        Insert: {
          beneficio_id?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          nome: string
          periodo_referencia?: string | null
          tipo_arquivo?: string | null
          url: string
        }
        Update: {
          beneficio_id?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          nome?: string
          periodo_referencia?: string | null
          tipo_arquivo?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficio_arquivos_beneficio_id_fkey"
            columns: ["beneficio_id"]
            isOneToOne: false
            referencedRelation: "beneficios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficio_arquivos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficio_movimentacoes: {
        Row: {
          beneficio_id: string | null
          colaborador_id: string | null
          created_at: string
          data_movimentacao: string | null
          id: string
          motivo: string | null
          tipo_movimentacao: string
          usuario_id: string | null
        }
        Insert: {
          beneficio_id?: string | null
          colaborador_id?: string | null
          created_at?: string
          data_movimentacao?: string | null
          id?: string
          motivo?: string | null
          tipo_movimentacao: string
          usuario_id?: string | null
        }
        Update: {
          beneficio_id?: string | null
          colaborador_id?: string | null
          created_at?: string
          data_movimentacao?: string | null
          id?: string
          motivo?: string | null
          tipo_movimentacao?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beneficio_movimentacoes_beneficio_id_fkey"
            columns: ["beneficio_id"]
            isOneToOne: false
            referencedRelation: "beneficios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficio_movimentacoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficio_movimentacoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficio_movimentacoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficio_movimentacoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      beneficio_regras_elegibilidade: {
        Row: {
          automatico: boolean | null
          beneficio_id: string | null
          cargo_id: string | null
          created_at: string
          departamento_id: string | null
          empresa_id: string | null
          id: string
          tempo_casa_minimo: number | null
          updated_at: string
        }
        Insert: {
          automatico?: boolean | null
          beneficio_id?: string | null
          cargo_id?: string | null
          created_at?: string
          departamento_id?: string | null
          empresa_id?: string | null
          id?: string
          tempo_casa_minimo?: number | null
          updated_at?: string
        }
        Update: {
          automatico?: boolean | null
          beneficio_id?: string | null
          cargo_id?: string | null
          created_at?: string
          departamento_id?: string | null
          empresa_id?: string | null
          id?: string
          tempo_casa_minimo?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficio_regras_elegibilidade_beneficio_id_fkey"
            columns: ["beneficio_id"]
            isOneToOne: false
            referencedRelation: "beneficios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficio_regras_elegibilidade_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficio_regras_elegibilidade_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficio_regras_elegibilidade_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficio_utilizacao: {
        Row: {
          beneficio_colaborador_id: string | null
          created_at: string | null
          data_uso: string | null
          estabelecimento: string | null
          id: string
          protocolo_autorizacao: string | null
          valor_desconto_folha: number | null
          valor_total: number
        }
        Insert: {
          beneficio_colaborador_id?: string | null
          created_at?: string | null
          data_uso?: string | null
          estabelecimento?: string | null
          id?: string
          protocolo_autorizacao?: string | null
          valor_desconto_folha?: number | null
          valor_total: number
        }
        Update: {
          beneficio_colaborador_id?: string | null
          created_at?: string | null
          data_uso?: string | null
          estabelecimento?: string | null
          id?: string
          protocolo_autorizacao?: string | null
          valor_desconto_folha?: number | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "beneficio_utilizacao_beneficio_colaborador_id_fkey"
            columns: ["beneficio_colaborador_id"]
            isOneToOne: false
            referencedRelation: "beneficios_colaborador"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficios: {
        Row: {
          ativo: boolean | null
          carencia_dias: number | null
          categoria: string | null
          codigo_esocial: string | null
          colaborador_id: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          empresa_id: string | null
          exige_anexo_comprovante: boolean | null
          id: string
          metodo_pagamento: string | null
          nome: string
          obrigatorio_por_lei: boolean | null
          observacoes: string | null
          operadora: string | null
          percentual_subsidio_empresa: number | null
          status: string | null
          teto_coparticipacao: number | null
          tipo: string | null
          updated_at: string
          valor: number | null
          valor_colaborador: number | null
          valor_empresa: number | null
        }
        Insert: {
          ativo?: boolean | null
          carencia_dias?: number | null
          categoria?: string | null
          codigo_esocial?: string | null
          colaborador_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          empresa_id?: string | null
          exige_anexo_comprovante?: boolean | null
          id?: string
          metodo_pagamento?: string | null
          nome: string
          obrigatorio_por_lei?: boolean | null
          observacoes?: string | null
          operadora?: string | null
          percentual_subsidio_empresa?: number | null
          status?: string | null
          teto_coparticipacao?: number | null
          tipo?: string | null
          updated_at?: string
          valor?: number | null
          valor_colaborador?: number | null
          valor_empresa?: number | null
        }
        Update: {
          ativo?: boolean | null
          carencia_dias?: number | null
          categoria?: string | null
          codigo_esocial?: string | null
          colaborador_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          empresa_id?: string | null
          exige_anexo_comprovante?: boolean | null
          id?: string
          metodo_pagamento?: string | null
          nome?: string
          obrigatorio_por_lei?: boolean | null
          observacoes?: string | null
          operadora?: string | null
          percentual_subsidio_empresa?: number | null
          status?: string | null
          teto_coparticipacao?: number | null
          tipo?: string | null
          updated_at?: string
          valor?: number | null
          valor_colaborador?: number | null
          valor_empresa?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "beneficios_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficios_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficios_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficios_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "beneficios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_beneficios_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_beneficios_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_beneficios_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_beneficios_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_beneficios_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficios_colaborador: {
        Row: {
          ativo: boolean | null
          colaborador_id: string
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_inicio: string
          data_validacao_rh: string | null
          desconto: number | null
          hash_autorizacao: string | null
          id: string
          ip_adesao: string | null
          motivo_suspensao: string | null
          observacoes: string | null
          status_vinculo: string | null
          tipo_beneficio_id: string
          updated_at: string
          valor: number
        }
        Insert: {
          ativo?: boolean | null
          colaborador_id: string
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string
          data_validacao_rh?: string | null
          desconto?: number | null
          hash_autorizacao?: string | null
          id?: string
          ip_adesao?: string | null
          motivo_suspensao?: string | null
          observacoes?: string | null
          status_vinculo?: string | null
          tipo_beneficio_id: string
          updated_at?: string
          valor?: number
        }
        Update: {
          ativo?: boolean | null
          colaborador_id?: string
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string
          data_validacao_rh?: string | null
          desconto?: number | null
          hash_autorizacao?: string | null
          id?: string
          ip_adesao?: string | null
          motivo_suspensao?: string | null
          observacoes?: string | null
          status_vinculo?: string | null
          tipo_beneficio_id?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "beneficios_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficios_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficios_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficios_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "beneficios_colaborador_tipo_beneficio_id_fkey"
            columns: ["tipo_beneficio_id"]
            isOneToOne: false
            referencedRelation: "tipos_beneficio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_beneficios_colaborador_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_beneficios_colaborador_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_beneficios_colaborador_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_beneficios_colaborador_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      beneficios_colaboradores: {
        Row: {
          ativo: boolean | null
          beneficio_id: string
          colaborador_id: string
          created_at: string | null
          data_fim: string | null
          data_inicio: string
          id: string
          valor_customizado: number | null
        }
        Insert: {
          ativo?: boolean | null
          beneficio_id: string
          colaborador_id: string
          created_at?: string | null
          data_fim?: string | null
          data_inicio: string
          id?: string
          valor_customizado?: number | null
        }
        Update: {
          ativo?: boolean | null
          beneficio_id?: string
          colaborador_id?: string
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string
          id?: string
          valor_customizado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "beneficios_colaboradores_beneficio_id_fkey"
            columns: ["beneficio_id"]
            isOneToOne: false
            referencedRelation: "beneficios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficios_colaboradores_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficios_colaboradores_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficios_colaboradores_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficios_colaboradores_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      bitrix24_config: {
        Row: {
          created_at: string | null
          dias_semana: number[] | null
          habilitado: boolean | null
          horario_fim: string | null
          horario_inicio: string | null
          id: number
          intervalo_minutos: number | null
          max_tentativas: number | null
          notificar_erros: boolean | null
          notificar_sucesso: boolean | null
          proxima_execucao: string | null
          sync_cargos: boolean | null
          sync_colaboradores: boolean | null
          sync_departamentos: boolean | null
          ultima_execucao: string | null
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string | null
          dias_semana?: number[] | null
          habilitado?: boolean | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: number
          intervalo_minutos?: number | null
          max_tentativas?: number | null
          notificar_erros?: boolean | null
          notificar_sucesso?: boolean | null
          proxima_execucao?: string | null
          sync_cargos?: boolean | null
          sync_colaboradores?: boolean | null
          sync_departamentos?: boolean | null
          ultima_execucao?: string | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          created_at?: string | null
          dias_semana?: number[] | null
          habilitado?: boolean | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: number
          intervalo_minutos?: number | null
          max_tentativas?: number | null
          notificar_erros?: boolean | null
          notificar_sucesso?: boolean | null
          proxima_execucao?: string | null
          sync_cargos?: boolean | null
          sync_colaboradores?: boolean | null
          sync_departamentos?: boolean | null
          ultima_execucao?: string | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      bitrix24_sync_logs: {
        Row: {
          conflitos: number | null
          created_at: string | null
          detalhes: Json | null
          direcao: string
          erros: number | null
          id: string
          registros_erro: number | null
          registros_processados: number | null
          registros_sucesso: number | null
          sucesso: number | null
          tipo: string
        }
        Insert: {
          conflitos?: number | null
          created_at?: string | null
          detalhes?: Json | null
          direcao: string
          erros?: number | null
          id?: string
          registros_erro?: number | null
          registros_processados?: number | null
          registros_sucesso?: number | null
          sucesso?: number | null
          tipo: string
        }
        Update: {
          conflitos?: number | null
          created_at?: string | null
          detalhes?: Json | null
          direcao?: string
          erros?: number | null
          id?: string
          registros_erro?: number | null
          registros_processados?: number | null
          registros_sucesso?: number | null
          sucesso?: number | null
          tipo?: string
        }
        Relationships: []
      }
      blocked_ips: {
        Row: {
          blocked_at: string | null
          blocked_by: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          ip_address: string
          permanent: boolean | null
          reason: string | null
        }
        Insert: {
          blocked_at?: string | null
          blocked_by?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address: string
          permanent?: boolean | null
          reason?: string | null
        }
        Update: {
          blocked_at?: string | null
          blocked_by?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string
          permanent?: boolean | null
          reason?: string | null
        }
        Relationships: []
      }
      campos_customizados: {
        Row: {
          ativo: boolean | null
          created_at: string
          empresa_id: string | null
          id: string
          nome: string
          obrigatorio: boolean | null
          opcoes: Json | null
          ordem: number | null
          secao: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          nome: string
          obrigatorio?: boolean | null
          opcoes?: Json | null
          ordem?: number | null
          secao?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          nome?: string
          obrigatorio?: boolean | null
          opcoes?: Json | null
          ordem?: number | null
          secao?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campos_customizados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_campos_customizados_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      canal_etica: {
        Row: {
          anonimo: boolean | null
          categoria: string
          created_at: string | null
          descricao: string
          empresa_id: string | null
          id: string
          prioridade: string | null
          protocolo: string
          resposta: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          anonimo?: boolean | null
          categoria: string
          created_at?: string | null
          descricao: string
          empresa_id?: string | null
          id?: string
          prioridade?: string | null
          protocolo?: string
          resposta?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          anonimo?: boolean | null
          categoria?: string
          created_at?: string | null
          descricao?: string
          empresa_id?: string | null
          id?: string
          prioridade?: string | null
          protocolo?: string
          resposta?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "canal_etica_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_canal_etica_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      candidatos: {
        Row: {
          cpf: string | null
          created_at: string
          curriculo_url: string | null
          email: string | null
          empresa_id: string | null
          experiencia_anos: number | null
          formacao: string | null
          id: string
          linkedin: string | null
          nome: string
          observacoes: string | null
          origem: string | null
          pretensao_salarial: number | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          curriculo_url?: string | null
          email?: string | null
          empresa_id?: string | null
          experiencia_anos?: number | null
          formacao?: string | null
          id?: string
          linkedin?: string | null
          nome: string
          observacoes?: string | null
          origem?: string | null
          pretensao_salarial?: number | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          curriculo_url?: string | null
          email?: string | null
          empresa_id?: string | null
          experiencia_anos?: number | null
          formacao?: string | null
          id?: string
          linkedin?: string | null
          nome?: string
          observacoes?: string | null
          origem?: string | null
          pretensao_salarial?: number | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidatos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      candidaturas: {
        Row: {
          candidato_id: string
          created_at: string
          data_entrevista: string | null
          data_proxima_etapa: string | null
          empresa_id: string | null
          entrevistador: string | null
          etapa: string | null
          feedback: string | null
          feedback_ia: string | null
          historico_etapas: Json | null
          id: string
          motivo_rejeicao: string | null
          nota_geral: number | null
          status: string | null
          updated_at: string
          vaga_id: string
        }
        Insert: {
          candidato_id: string
          created_at?: string
          data_entrevista?: string | null
          data_proxima_etapa?: string | null
          empresa_id?: string | null
          entrevistador?: string | null
          etapa?: string | null
          feedback?: string | null
          feedback_ia?: string | null
          historico_etapas?: Json | null
          id?: string
          motivo_rejeicao?: string | null
          nota_geral?: number | null
          status?: string | null
          updated_at?: string
          vaga_id: string
        }
        Update: {
          candidato_id?: string
          created_at?: string
          data_entrevista?: string | null
          data_proxima_etapa?: string | null
          empresa_id?: string | null
          entrevistador?: string | null
          etapa?: string | null
          feedback?: string | null
          feedback_ia?: string | null
          historico_etapas?: Json | null
          id?: string
          motivo_rejeicao?: string | null
          nota_geral?: number | null
          status?: string | null
          updated_at?: string
          vaga_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidaturas_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidaturas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidaturas_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      cargo_faixas_salariais: {
        Row: {
          cargo_id: string | null
          created_at: string
          id: string
          nivel: string
          updated_at: string
          valor_maximo: number
          valor_minimo: number
        }
        Insert: {
          cargo_id?: string | null
          created_at?: string
          id?: string
          nivel: string
          updated_at?: string
          valor_maximo: number
          valor_minimo: number
        }
        Update: {
          cargo_id?: string | null
          created_at?: string
          id?: string
          nivel?: string
          updated_at?: string
          valor_maximo?: number
          valor_minimo?: number
        }
        Relationships: [
          {
            foreignKeyName: "cargo_faixas_salariais_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
        ]
      }
      cargos: {
        Row: {
          ativo: boolean | null
          cbo: string | null
          created_at: string
          departamento_id: string | null
          descricao: string | null
          empresa_id: string | null
          id: string
          nivel_hierarquico: number | null
          nome: string
          requisitos: string | null
          salario_base: number | null
          updated_at: string
          version: number | null
        }
        Insert: {
          ativo?: boolean | null
          cbo?: string | null
          created_at?: string
          departamento_id?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          nivel_hierarquico?: number | null
          nome: string
          requisitos?: string | null
          salario_base?: number | null
          updated_at?: string
          version?: number | null
        }
        Update: {
          ativo?: boolean | null
          cbo?: string | null
          created_at?: string
          departamento_id?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          nivel_hierarquico?: number | null
          nome?: string
          requisitos?: string | null
          salario_base?: number | null
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cargos_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cargos_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_cursos: {
        Row: {
          ativo: boolean | null
          carga_horaria: number | null
          categoria: string | null
          created_at: string | null
          descricao: string | null
          empresa_id: string | null
          id: string
          modalidade: string | null
          nome: string
          nr_relacionada: string | null
          obrigatorio: boolean | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          carga_horaria?: number | null
          categoria?: string | null
          created_at?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          modalidade?: string | null
          nome: string
          nr_relacionada?: string | null
          obrigatorio?: boolean | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          carga_horaria?: number | null
          categoria?: string | null
          created_at?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          modalidade?: string | null
          nome?: string
          nr_relacionada?: string | null
          obrigatorio?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_cursos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_catalogo_cursos_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_infracoes: {
        Row: {
          artigo_clt_sugerido: string | null
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string
          dias_suspensao_sugerido: number | null
          empresa_id: string
          gravidade: string
          id: string
          tipo_sugerido: string
          updated_at: string
        }
        Insert: {
          artigo_clt_sugerido?: string | null
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao: string
          dias_suspensao_sugerido?: number | null
          empresa_id: string
          gravidade: string
          id?: string
          tipo_sugerido: string
          updated_at?: string
        }
        Update: {
          artigo_clt_sugerido?: string | null
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string
          dias_suspensao_sugerido?: number | null
          empresa_id?: string
          gravidade?: string
          id?: string
          tipo_sugerido?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_infracoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_trabalhador: {
        Row: {
          codigo_esocial: string | null
          created_at: string | null
          id: number
          nome: string
        }
        Insert: {
          codigo_esocial?: string | null
          created_at?: string | null
          id?: number
          nome: string
        }
        Update: {
          codigo_esocial?: string | null
          created_at?: string | null
          id?: number
          nome?: string
        }
        Relationships: []
      }
      centros_custo: {
        Row: {
          ativo: boolean | null
          codigo: string | null
          created_at: string | null
          descricao: string | null
          empresa_id: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo?: string | null
          created_at?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string | null
          created_at?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "centros_custo_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_centros_custo_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      certificados_digitais: {
        Row: {
          arquivo_base64: string | null
          ativo: boolean | null
          cnpj_cpf: string | null
          created_at: string | null
          empresa_id: string | null
          id: string
          issuer: string | null
          senha_encriptada: string | null
          subject: string | null
          thumbprint: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          arquivo_base64?: string | null
          ativo?: boolean | null
          cnpj_cpf?: string | null
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          issuer?: string | null
          senha_encriptada?: string | null
          subject?: string | null
          thumbprint?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          arquivo_base64?: string | null
          ativo?: boolean | null
          cnpj_cpf?: string | null
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          issuer?: string | null
          senha_encriptada?: string | null
          subject?: string | null
          thumbprint?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificados_digitais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ciclos_avaliacao: {
        Row: {
          created_at: string
          data_fim: string
          data_inicio: string
          descricao: string | null
          empresa_id: string | null
          id: string
          nome: string
          status: string
          tipo: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_fim: string
          data_inicio: string
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          nome: string
          status?: string
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_fim?: string
          data_inicio?: string
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          nome?: string
          status?: string
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ciclos_avaliacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ciclos_avaliacao_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      cid10: {
        Row: {
          codigo: string
          created_at: string | null
          descricao: string
          id: string
        }
        Insert: {
          codigo: string
          created_at?: string | null
          descricao: string
          id?: string
        }
        Update: {
          codigo?: string
          created_at?: string | null
          descricao?: string
          id?: string
        }
        Relationships: []
      }
      ciencia_rate_limits: {
        Row: {
          created_at: string
          id: string
          identifier: string | null
          ip_address: unknown
          rpc_name: string
          success: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          identifier?: string | null
          ip_address: unknown
          rpc_name: string
          success?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          identifier?: string | null
          ip_address?: unknown
          rpc_name?: string
          success?: boolean
        }
        Relationships: []
      }
      clinicas_partners: {
        Row: {
          aceita_convenio: boolean
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string
          complemento: string | null
          created_at: string
          created_by: string | null
          crm_responsavel: string | null
          email: string | null
          empresa_id: string
          especialidades: string[]
          geo_lat: number | null
          geo_lng: number | null
          id: string
          logradouro: string | null
          nome_fantasia: string | null
          numero: string | null
          observacoes: string | null
          rating: number | null
          razao_social: string
          responsavel_tecnico: string | null
          sla_medio_min: number | null
          status: string
          telefone: string | null
          tipos_exame: string[]
          uf: string | null
          updated_at: string
        }
        Insert: {
          aceita_convenio?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj: string
          complemento?: string | null
          created_at?: string
          created_by?: string | null
          crm_responsavel?: string | null
          email?: string | null
          empresa_id: string
          especialidades?: string[]
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          rating?: number | null
          razao_social: string
          responsavel_tecnico?: string | null
          sla_medio_min?: number | null
          status?: string
          telefone?: string | null
          tipos_exame?: string[]
          uf?: string | null
          updated_at?: string
        }
        Update: {
          aceita_convenio?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          complemento?: string | null
          created_at?: string
          created_by?: string | null
          crm_responsavel?: string | null
          email?: string | null
          empresa_id?: string
          especialidades?: string[]
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          rating?: number | null
          razao_social?: string
          responsavel_tecnico?: string | null
          sla_medio_min?: number | null
          status?: string
          telefone?: string | null
          tipos_exame?: string[]
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      clinicas_partners_horarios: {
        Row: {
          ativo: boolean
          capacidade_por_slot: number
          clinica_id: string
          created_at: string
          dia_semana: number
          hora_abertura: string
          hora_fechamento: string
          id: string
          intervalo_slot_min: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          capacidade_por_slot?: number
          clinica_id: string
          created_at?: string
          dia_semana: number
          hora_abertura: string
          hora_fechamento: string
          id?: string
          intervalo_slot_min?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          capacidade_por_slot?: number
          clinica_id?: string
          created_at?: string
          dia_semana?: number
          hora_abertura?: string
          hora_fechamento?: string
          id?: string
          intervalo_slot_min?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinicas_partners_horarios_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      clinicas_partners_servicos: {
        Row: {
          ativo: boolean
          clinica_id: string
          created_at: string
          id: string
          prazo_resultado_dias: number | null
          preco: number | null
          tipo_exame: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          clinica_id: string
          created_at?: string
          id?: string
          prazo_resultado_dias?: number | null
          preco?: number | null
          tipo_exame: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          clinica_id?: string
          created_at?: string
          id?: string
          prazo_resultado_dias?: number | null
          preco?: number | null
          tipo_exame?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinicas_partners_servicos_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      cnab_configuracoes: {
        Row: {
          agencia: string
          agencia_digito: string | null
          banco_codigo: string
          codigo_empresa: string | null
          conta: string
          conta_digito: string
          convenio: string
          created_at: string | null
          empresa_id: string | null
          id: string
          nome_empresa: string | null
          updated_at: string | null
        }
        Insert: {
          agencia: string
          agencia_digito?: string | null
          banco_codigo: string
          codigo_empresa?: string | null
          conta: string
          conta_digito: string
          convenio: string
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          nome_empresa?: string | null
          updated_at?: string | null
        }
        Update: {
          agencia?: string
          agencia_digito?: string | null
          banco_codigo?: string
          codigo_empresa?: string | null
          conta?: string
          conta_digito?: string
          convenio?: string
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          nome_empresa?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cnab_configuracoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      cnab_itens: {
        Row: {
          agencia_favorecido: string | null
          banco_favorecido: string | null
          codigo_ocorrencia: string | null
          colaborador_id: string | null
          conta_favorecido: string | null
          cpf_cnpj_favorecido: string
          created_at: string | null
          data_pagamento: string
          folha_item_id: string | null
          id: string
          mensagem_ocorrencia: string | null
          nome_favorecido: string
          remessa_id: string
          seu_numero: string | null
          status: string | null
          tipo_pagamento: string | null
          valor_pagamento: number
        }
        Insert: {
          agencia_favorecido?: string | null
          banco_favorecido?: string | null
          codigo_ocorrencia?: string | null
          colaborador_id?: string | null
          conta_favorecido?: string | null
          cpf_cnpj_favorecido: string
          created_at?: string | null
          data_pagamento: string
          folha_item_id?: string | null
          id?: string
          mensagem_ocorrencia?: string | null
          nome_favorecido: string
          remessa_id: string
          seu_numero?: string | null
          status?: string | null
          tipo_pagamento?: string | null
          valor_pagamento: number
        }
        Update: {
          agencia_favorecido?: string | null
          banco_favorecido?: string | null
          codigo_ocorrencia?: string | null
          colaborador_id?: string | null
          conta_favorecido?: string | null
          cpf_cnpj_favorecido?: string
          created_at?: string | null
          data_pagamento?: string
          folha_item_id?: string | null
          id?: string
          mensagem_ocorrencia?: string | null
          nome_favorecido?: string
          remessa_id?: string
          seu_numero?: string | null
          status?: string | null
          tipo_pagamento?: string | null
          valor_pagamento?: number
        }
        Relationships: [
          {
            foreignKeyName: "cnab_itens_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cnab_itens_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cnab_itens_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cnab_itens_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "cnab_itens_folha_item_id_fkey"
            columns: ["folha_item_id"]
            isOneToOne: false
            referencedRelation: "folha_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cnab_itens_remessa_id_fkey"
            columns: ["remessa_id"]
            isOneToOne: false
            referencedRelation: "cnab_remessas"
            referencedColumns: ["id"]
          },
        ]
      }
      cnab_remessas: {
        Row: {
          arquivo_url: string | null
          banco_codigo: string
          created_at: string | null
          data_geracao: string | null
          empresa_id: string
          hash_integridade: string | null
          id: string
          sequencial_arquivo: number
          status: string
          total_pagamentos: number | null
          updated_at: string | null
          valor_total: number | null
        }
        Insert: {
          arquivo_url?: string | null
          banco_codigo: string
          created_at?: string | null
          data_geracao?: string | null
          empresa_id: string
          hash_integridade?: string | null
          id?: string
          sequencial_arquivo: number
          status?: string
          total_pagamentos?: number | null
          updated_at?: string | null
          valor_total?: number | null
        }
        Update: {
          arquivo_url?: string | null
          banco_codigo?: string
          created_at?: string | null
          data_geracao?: string | null
          empresa_id?: string
          hash_integridade?: string | null
          id?: string
          sequencial_arquivo?: number
          status?: string
          total_pagamentos?: number | null
          updated_at?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cnab_remessas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      colaborador_beneficios: {
        Row: {
          beneficio_id: string
          colaborador_id: string
          created_at: string
          id: string
        }
        Insert: {
          beneficio_id: string
          colaborador_id: string
          created_at?: string
          id?: string
        }
        Update: {
          beneficio_id?: string
          colaborador_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_beneficios_beneficio_id_fkey"
            columns: ["beneficio_id"]
            isOneToOne: false
            referencedRelation: "beneficios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaborador_beneficios_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaborador_beneficios_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaborador_beneficios_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaborador_beneficios_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_colaborador_beneficios_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_colaborador_beneficios_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_colaborador_beneficios_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_colaborador_beneficios_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      colaboradores: {
        Row: {
          agencia: string | null
          aposentado: boolean | null
          bairro: string | null
          banco_codigo: string | null
          banco_nome: string | null
          bitrix_id: string | null
          bitrix_sync_status: string | null
          bitrix_ultima_sync: string | null
          cargo: string
          cargo_confianca: boolean | null
          categoria_trabalhador: string | null
          categoria_trabalhador_id: number | null
          cbo: string | null
          celular: string | null
          centro_custo: string | null
          centro_custo_id: string | null
          cep: string | null
          certificado_reservista: string | null
          cidade: string | null
          cipa: boolean | null
          cnh_categoria: string | null
          cnh_data_emissao: string | null
          cnh_numero: string | null
          cnh_validade: string | null
          codigo_firebird: number | null
          complemento: string | null
          conjuge_cpf: string | null
          conjuge_data_nascimento: string | null
          conjuge_nome: string | null
          conjuge_telefone: string | null
          conselho_profissional: string | null
          conta: string | null
          cpf: string
          cpf_hash: string | null
          cpf_last4: string | null
          created_at: string
          created_by: string | null
          ctps_data_emissao: string | null
          ctps_numero: string | null
          ctps_serie: string | null
          ctps_uf: string | null
          cursos_certificacoes: string | null
          data_admissao: string
          data_chegada_pais: string | null
          data_desligamento: string | null
          data_exame_admissional: string | null
          data_nascimento: string
          data_saida_pais: string | null
          data_senioridade: string | null
          departamento: string
          email: string | null
          email_corporativo: string | null
          email_pessoal: string | null
          empresa_id: string | null
          escolaridade: Database["public"]["Enums"]["escolaridade"] | null
          estado_civil: Database["public"]["Enums"]["estado_civil"]
          etnia: string | null
          expatriado: boolean | null
          experiencia_fim_1: string | null
          experiencia_fim_2: string | null
          experiencia_tipo: string | null
          face_id: string | null
          facebook: string | null
          formacao: string | null
          foto_referencia_url: string | null
          foto_url: string | null
          genero_documento_id: number | null
          gestor_ferias_id: string | null
          horario_entrada: string | null
          horario_saida: string | null
          id: string
          identidade_genero: string | null
          identificador_tipo: string | null
          identificador_validade: string | null
          inscricao_orgao_classe: string | null
          instagram: string | null
          intervalo_minutos: number | null
          jornada_horas_mensais: string | null
          jornada_semanal: number | null
          linkedin: string | null
          local_trabalho: string | null
          local_trabalho_id: string | null
          logradouro: string | null
          matricula: string | null
          moeda: string | null
          moeda_base: string | null
          nacionalidade: string | null
          nacionalidade_id: number | null
          naturalidade_cidade: string | null
          naturalidade_uf: string | null
          nome_completo: string
          nome_mae: string
          nome_nascimento: string | null
          nome_pai: string | null
          nome_social: string | null
          numero: string | null
          observacoes: string | null
          pais_nascimento: string | null
          pais_origem: string | null
          pais_residencia_fiscal: string | null
          pis_pasep: string | null
          pix_chave: string | null
          pix_tipo: string | null
          primeiro_emprego: boolean | null
          pronomes: string | null
          regime_fiscal_especial: boolean | null
          reservista: string | null
          reservista_ra: string | null
          reservista_serie: string | null
          rg: string | null
          rg_data_emissao: string | null
          rg_data_validade: string | null
          rg_orgao_emissor: string | null
          rg_uf: string | null
          salario_base: number
          seguro_desemprego: boolean | null
          sexo: Database["public"]["Enums"]["sexo"]
          status: Database["public"]["Enums"]["status_colaborador"]
          supervisor_id: string | null
          telefone: string | null
          telefone_residencial: string | null
          tiktok: string | null
          time_id: string | null
          timeman_ultima_sync: string | null
          timeman_ultimo_status: string | null
          tipo_admissao: string | null
          tipo_conta: Database["public"]["Enums"]["tipo_conta"] | null
          tipo_contrato: Database["public"]["Enums"]["tipo_contrato"]
          tipo_estabilidade: string | null
          tipo_pagamento: string | null
          tipo_pagamento_id: number | null
          tipo_salario: string | null
          tipo_salario_descricao: string | null
          tipo_salario_id: number | null
          tipo_sanguineo: string | null
          titulo_eleitor: string | null
          titulo_eleitor_uf: string | null
          titulo_secao: string | null
          titulo_zona: string | null
          uf: string | null
          unidade: string | null
          uniforme_calca: string | null
          uniforme_calcado: string | null
          uniforme_camiseta: string | null
          updated_at: string
          version: number | null
          whatsapp: string | null
        }
        Insert: {
          agencia?: string | null
          aposentado?: boolean | null
          bairro?: string | null
          banco_codigo?: string | null
          banco_nome?: string | null
          bitrix_id?: string | null
          bitrix_sync_status?: string | null
          bitrix_ultima_sync?: string | null
          cargo: string
          cargo_confianca?: boolean | null
          categoria_trabalhador?: string | null
          categoria_trabalhador_id?: number | null
          cbo?: string | null
          celular?: string | null
          centro_custo?: string | null
          centro_custo_id?: string | null
          cep?: string | null
          certificado_reservista?: string | null
          cidade?: string | null
          cipa?: boolean | null
          cnh_categoria?: string | null
          cnh_data_emissao?: string | null
          cnh_numero?: string | null
          cnh_validade?: string | null
          codigo_firebird?: number | null
          complemento?: string | null
          conjuge_cpf?: string | null
          conjuge_data_nascimento?: string | null
          conjuge_nome?: string | null
          conjuge_telefone?: string | null
          conselho_profissional?: string | null
          conta?: string | null
          cpf: string
          cpf_hash?: string | null
          cpf_last4?: string | null
          created_at?: string
          created_by?: string | null
          ctps_data_emissao?: string | null
          ctps_numero?: string | null
          ctps_serie?: string | null
          ctps_uf?: string | null
          cursos_certificacoes?: string | null
          data_admissao: string
          data_chegada_pais?: string | null
          data_desligamento?: string | null
          data_exame_admissional?: string | null
          data_nascimento: string
          data_saida_pais?: string | null
          data_senioridade?: string | null
          departamento: string
          email?: string | null
          email_corporativo?: string | null
          email_pessoal?: string | null
          empresa_id?: string | null
          escolaridade?: Database["public"]["Enums"]["escolaridade"] | null
          estado_civil?: Database["public"]["Enums"]["estado_civil"]
          etnia?: string | null
          expatriado?: boolean | null
          experiencia_fim_1?: string | null
          experiencia_fim_2?: string | null
          experiencia_tipo?: string | null
          face_id?: string | null
          facebook?: string | null
          formacao?: string | null
          foto_referencia_url?: string | null
          foto_url?: string | null
          genero_documento_id?: number | null
          gestor_ferias_id?: string | null
          horario_entrada?: string | null
          horario_saida?: string | null
          id?: string
          identidade_genero?: string | null
          identificador_tipo?: string | null
          identificador_validade?: string | null
          inscricao_orgao_classe?: string | null
          instagram?: string | null
          intervalo_minutos?: number | null
          jornada_horas_mensais?: string | null
          jornada_semanal?: number | null
          linkedin?: string | null
          local_trabalho?: string | null
          local_trabalho_id?: string | null
          logradouro?: string | null
          matricula?: string | null
          moeda?: string | null
          moeda_base?: string | null
          nacionalidade?: string | null
          nacionalidade_id?: number | null
          naturalidade_cidade?: string | null
          naturalidade_uf?: string | null
          nome_completo: string
          nome_mae: string
          nome_nascimento?: string | null
          nome_pai?: string | null
          nome_social?: string | null
          numero?: string | null
          observacoes?: string | null
          pais_nascimento?: string | null
          pais_origem?: string | null
          pais_residencia_fiscal?: string | null
          pis_pasep?: string | null
          pix_chave?: string | null
          pix_tipo?: string | null
          primeiro_emprego?: boolean | null
          pronomes?: string | null
          regime_fiscal_especial?: boolean | null
          reservista?: string | null
          reservista_ra?: string | null
          reservista_serie?: string | null
          rg?: string | null
          rg_data_emissao?: string | null
          rg_data_validade?: string | null
          rg_orgao_emissor?: string | null
          rg_uf?: string | null
          salario_base: number
          seguro_desemprego?: boolean | null
          sexo: Database["public"]["Enums"]["sexo"]
          status?: Database["public"]["Enums"]["status_colaborador"]
          supervisor_id?: string | null
          telefone?: string | null
          telefone_residencial?: string | null
          tiktok?: string | null
          time_id?: string | null
          timeman_ultima_sync?: string | null
          timeman_ultimo_status?: string | null
          tipo_admissao?: string | null
          tipo_conta?: Database["public"]["Enums"]["tipo_conta"] | null
          tipo_contrato?: Database["public"]["Enums"]["tipo_contrato"]
          tipo_estabilidade?: string | null
          tipo_pagamento?: string | null
          tipo_pagamento_id?: number | null
          tipo_salario?: string | null
          tipo_salario_descricao?: string | null
          tipo_salario_id?: number | null
          tipo_sanguineo?: string | null
          titulo_eleitor?: string | null
          titulo_eleitor_uf?: string | null
          titulo_secao?: string | null
          titulo_zona?: string | null
          uf?: string | null
          unidade?: string | null
          uniforme_calca?: string | null
          uniforme_calcado?: string | null
          uniforme_camiseta?: string | null
          updated_at?: string
          version?: number | null
          whatsapp?: string | null
        }
        Update: {
          agencia?: string | null
          aposentado?: boolean | null
          bairro?: string | null
          banco_codigo?: string | null
          banco_nome?: string | null
          bitrix_id?: string | null
          bitrix_sync_status?: string | null
          bitrix_ultima_sync?: string | null
          cargo?: string
          cargo_confianca?: boolean | null
          categoria_trabalhador?: string | null
          categoria_trabalhador_id?: number | null
          cbo?: string | null
          celular?: string | null
          centro_custo?: string | null
          centro_custo_id?: string | null
          cep?: string | null
          certificado_reservista?: string | null
          cidade?: string | null
          cipa?: boolean | null
          cnh_categoria?: string | null
          cnh_data_emissao?: string | null
          cnh_numero?: string | null
          cnh_validade?: string | null
          codigo_firebird?: number | null
          complemento?: string | null
          conjuge_cpf?: string | null
          conjuge_data_nascimento?: string | null
          conjuge_nome?: string | null
          conjuge_telefone?: string | null
          conselho_profissional?: string | null
          conta?: string | null
          cpf?: string
          cpf_hash?: string | null
          cpf_last4?: string | null
          created_at?: string
          created_by?: string | null
          ctps_data_emissao?: string | null
          ctps_numero?: string | null
          ctps_serie?: string | null
          ctps_uf?: string | null
          cursos_certificacoes?: string | null
          data_admissao?: string
          data_chegada_pais?: string | null
          data_desligamento?: string | null
          data_exame_admissional?: string | null
          data_nascimento?: string
          data_saida_pais?: string | null
          data_senioridade?: string | null
          departamento?: string
          email?: string | null
          email_corporativo?: string | null
          email_pessoal?: string | null
          empresa_id?: string | null
          escolaridade?: Database["public"]["Enums"]["escolaridade"] | null
          estado_civil?: Database["public"]["Enums"]["estado_civil"]
          etnia?: string | null
          expatriado?: boolean | null
          experiencia_fim_1?: string | null
          experiencia_fim_2?: string | null
          experiencia_tipo?: string | null
          face_id?: string | null
          facebook?: string | null
          formacao?: string | null
          foto_referencia_url?: string | null
          foto_url?: string | null
          genero_documento_id?: number | null
          gestor_ferias_id?: string | null
          horario_entrada?: string | null
          horario_saida?: string | null
          id?: string
          identidade_genero?: string | null
          identificador_tipo?: string | null
          identificador_validade?: string | null
          inscricao_orgao_classe?: string | null
          instagram?: string | null
          intervalo_minutos?: number | null
          jornada_horas_mensais?: string | null
          jornada_semanal?: number | null
          linkedin?: string | null
          local_trabalho?: string | null
          local_trabalho_id?: string | null
          logradouro?: string | null
          matricula?: string | null
          moeda?: string | null
          moeda_base?: string | null
          nacionalidade?: string | null
          nacionalidade_id?: number | null
          naturalidade_cidade?: string | null
          naturalidade_uf?: string | null
          nome_completo?: string
          nome_mae?: string
          nome_nascimento?: string | null
          nome_pai?: string | null
          nome_social?: string | null
          numero?: string | null
          observacoes?: string | null
          pais_nascimento?: string | null
          pais_origem?: string | null
          pais_residencia_fiscal?: string | null
          pis_pasep?: string | null
          pix_chave?: string | null
          pix_tipo?: string | null
          primeiro_emprego?: boolean | null
          pronomes?: string | null
          regime_fiscal_especial?: boolean | null
          reservista?: string | null
          reservista_ra?: string | null
          reservista_serie?: string | null
          rg?: string | null
          rg_data_emissao?: string | null
          rg_data_validade?: string | null
          rg_orgao_emissor?: string | null
          rg_uf?: string | null
          salario_base?: number
          seguro_desemprego?: boolean | null
          sexo?: Database["public"]["Enums"]["sexo"]
          status?: Database["public"]["Enums"]["status_colaborador"]
          supervisor_id?: string | null
          telefone?: string | null
          telefone_residencial?: string | null
          tiktok?: string | null
          time_id?: string | null
          timeman_ultima_sync?: string | null
          timeman_ultimo_status?: string | null
          tipo_admissao?: string | null
          tipo_conta?: Database["public"]["Enums"]["tipo_conta"] | null
          tipo_contrato?: Database["public"]["Enums"]["tipo_contrato"]
          tipo_estabilidade?: string | null
          tipo_pagamento?: string | null
          tipo_pagamento_id?: number | null
          tipo_salario?: string | null
          tipo_salario_descricao?: string | null
          tipo_salario_id?: number | null
          tipo_sanguineo?: string | null
          titulo_eleitor?: string | null
          titulo_eleitor_uf?: string | null
          titulo_secao?: string | null
          titulo_zona?: string | null
          uf?: string | null
          unidade?: string | null
          uniforme_calca?: string | null
          uniforme_calcado?: string | null
          uniforme_camiseta?: string | null
          updated_at?: string
          version?: number | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_categoria_trabalhador_id_fkey"
            columns: ["categoria_trabalhador_id"]
            isOneToOne: false
            referencedRelation: "categorias_trabalhador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_genero_documento_id_fkey"
            columns: ["genero_documento_id"]
            isOneToOne: false
            referencedRelation: "generos_documento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_gestor_ferias_id_fkey"
            columns: ["gestor_ferias_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_gestor_ferias_id_fkey"
            columns: ["gestor_ferias_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_gestor_ferias_id_fkey"
            columns: ["gestor_ferias_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_gestor_ferias_id_fkey"
            columns: ["gestor_ferias_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "colaboradores_nacionalidade_id_fkey"
            columns: ["nacionalidade_id"]
            isOneToOne: false
            referencedRelation: "nacionalidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "colaboradores_tipo_pagamento_id_fkey"
            columns: ["tipo_pagamento_id"]
            isOneToOne: false
            referencedRelation: "tipos_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_tipo_salario_id_fkey"
            columns: ["tipo_salario_id"]
            isOneToOne: false
            referencedRelation: "tipos_salario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_colaboradores_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_colaboradores_local_trabalho"
            columns: ["local_trabalho_id"]
            isOneToOne: false
            referencedRelation: "locais_trabalho"
            referencedColumns: ["id"]
          },
        ]
      }
      competencias_config: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          created_at: string
          descricao: string | null
          empresa_id: string | null
          id: string
          nivel_esperado: number | null
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          nivel_esperado?: number | null
          nome: string
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          nivel_esperado?: number | null
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "competencias_config_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      competencias_matriz: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          created_at: string
          descricao: string | null
          empresa_id: string | null
          id: string
          nivel_esperado: number | null
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          nivel_esperado?: number | null
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          nivel_esperado?: number | null
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competencias_matriz_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_competencias_matriz_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      comunicados: {
        Row: {
          ativo: boolean | null
          conteudo: string | null
          created_at: string
          created_by: string | null
          data_expiracao: string | null
          data_publicacao: string | null
          empresa_id: string | null
          id: string
          prioridade: number | null
          tipo: string | null
          titulo: string
        }
        Insert: {
          ativo?: boolean | null
          conteudo?: string | null
          created_at?: string
          created_by?: string | null
          data_expiracao?: string | null
          data_publicacao?: string | null
          empresa_id?: string | null
          id?: string
          prioridade?: number | null
          tipo?: string | null
          titulo: string
        }
        Update: {
          ativo?: boolean | null
          conteudo?: string | null
          created_at?: string
          created_by?: string | null
          data_expiracao?: string | null
          data_publicacao?: string | null
          empresa_id?: string | null
          id?: string
          prioridade?: number | null
          tipo?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "comunicados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_comunicados_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      comunicados_leituras: {
        Row: {
          comunicado_id: string
          id: string
          lido_em: string | null
          usuario_id: string
        }
        Insert: {
          comunicado_id: string
          id?: string
          lido_em?: string | null
          usuario_id: string
        }
        Update: {
          comunicado_id?: string
          id?: string
          lido_em?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comunicados_leituras_comunicado_id_fkey"
            columns: ["comunicado_id"]
            isOneToOne: false
            referencedRelation: "comunicados"
            referencedColumns: ["id"]
          },
        ]
      }
      condicoes_ingresso: {
        Row: {
          created_at: string | null
          id: number
          nome: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          nome: string
        }
        Update: {
          created_at?: string | null
          id?: number
          nome?: string
        }
        Relationships: []
      }
      config_afastamentos: {
        Row: {
          created_at: string
          descricao: string | null
          dias_empresa_maximo: number | null
          dias_maximos: number | null
          dias_minimos: number | null
          exige_cid: boolean | null
          id: string
          pago_empresa: boolean | null
          pago_inss: boolean | null
          tipo: Database["public"]["Enums"]["tipo_afastamento"]
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          dias_empresa_maximo?: number | null
          dias_maximos?: number | null
          dias_minimos?: number | null
          exige_cid?: boolean | null
          id?: string
          pago_empresa?: boolean | null
          pago_inss?: boolean | null
          tipo: Database["public"]["Enums"]["tipo_afastamento"]
        }
        Update: {
          created_at?: string
          descricao?: string | null
          dias_empresa_maximo?: number | null
          dias_maximos?: number | null
          dias_minimos?: number | null
          exige_cid?: boolean | null
          id?: string
          pago_empresa?: boolean | null
          pago_inss?: boolean | null
          tipo?: Database["public"]["Enums"]["tipo_afastamento"]
        }
        Relationships: []
      }
      config_alertas_indicadores: {
        Row: {
          created_at: string
          id: string
          limite_atencao: number
          limite_critico: number
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          limite_atencao: number
          limite_critico: number
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          limite_atencao?: number
          limite_critico?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      configuracoes: {
        Row: {
          chave: string
          created_at: string | null
          id: string
          updated_at: string | null
          valor: Json | null
          vapid_private_key: string | null
          vapid_public_key: string | null
        }
        Insert: {
          chave: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          valor?: Json | null
          vapid_private_key?: string | null
          vapid_public_key?: string | null
        }
        Update: {
          chave?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          valor?: Json | null
          vapid_private_key?: string | null
          vapid_public_key?: string | null
        }
        Relationships: []
      }
      configuracoes_alertas: {
        Row: {
          ativa: boolean | null
          email_notificacao: string | null
          id: string
          metrica: string
          threshold: number
        }
        Insert: {
          ativa?: boolean | null
          email_notificacao?: string | null
          id?: string
          metrica: string
          threshold: number
        }
        Update: {
          ativa?: boolean | null
          email_notificacao?: string | null
          id?: string
          metrica?: string
          threshold?: number
        }
        Relationships: []
      }
      configuracoes_esocial: {
        Row: {
          ambiente: string | null
          certificado_id: string | null
          created_at: string
          empresa_id: string
          id: string
          updated_at: string
        }
        Insert: {
          ambiente?: string | null
          certificado_id?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          ambiente?: string | null
          certificado_id?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_esocial_certificado_id_fkey"
            columns: ["certificado_id"]
            isOneToOne: false
            referencedRelation: "certificados_digitais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuracoes_esocial_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_intervalo: {
        Row: {
          ativo: boolean | null
          created_at: string
          duracao_minutos: number
          empresa_id: string | null
          horario_fim_permitido: string | null
          horario_inicio_permitido: string | null
          id: string
          nome: string
          obrigatorio: boolean | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          duracao_minutos?: number
          empresa_id?: string | null
          horario_fim_permitido?: string | null
          horario_inicio_permitido?: string | null
          id?: string
          nome: string
          obrigatorio?: boolean | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          duracao_minutos?: number
          empresa_id?: string | null
          horario_fim_permitido?: string | null
          horario_inicio_permitido?: string | null
          id?: string
          nome?: string
          obrigatorio?: boolean | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_intervalo_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_configuracoes_intervalo_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_ponto: {
        Row: {
          created_at: string | null
          empresa_id: string
          exige_geolocalizacao: boolean | null
          exige_reconhecimento_facial: boolean | null
          id: string
          intervalo_minimo_minutos: number | null
          permite_ponto_offline: boolean | null
          raio_maximo_metros: number | null
          tolerancia_minutos: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          empresa_id: string
          exige_geolocalizacao?: boolean | null
          exige_reconhecimento_facial?: boolean | null
          id?: string
          intervalo_minimo_minutos?: number | null
          permite_ponto_offline?: boolean | null
          raio_maximo_metros?: number | null
          tolerancia_minutos?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          empresa_id?: string
          exige_geolocalizacao?: boolean | null
          exige_reconhecimento_facial?: boolean | null
          id?: string
          intervalo_minimo_minutos?: number | null
          permite_ponto_offline?: boolean | null
          raio_maximo_metros?: number | null
          tolerancia_minutos?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_ponto_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      conformidade_ponto_logs: {
        Row: {
          batida_id: string | null
          descricao: string | null
          empresa_id: string | null
          id: string
          resolvido: boolean | null
          severidade: string | null
          timestamp: string | null
          tipo_alerta: string
        }
        Insert: {
          batida_id?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          resolvido?: boolean | null
          severidade?: string | null
          timestamp?: string | null
          tipo_alerta: string
        }
        Update: {
          batida_id?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          resolvido?: boolean | null
          severidade?: string | null
          timestamp?: string | null
          tipo_alerta?: string
        }
        Relationships: [
          {
            foreignKeyName: "conformidade_ponto_logs_batida_id_fkey"
            columns: ["batida_id"]
            isOneToOne: false
            referencedRelation: "batidas_ponto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conformidade_ponto_logs_batida_id_fkey"
            columns: ["batida_id"]
            isOneToOne: false
            referencedRelation: "vw_batidas_dia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conformidade_ponto_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      contabilidade_contatos: {
        Row: {
          ativo: boolean
          created_at: string
          email: string
          empresa_id: string
          escritorio: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email: string
          empresa_id: string
          escritorio?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string
          empresa_id?: string
          escritorio?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contabilidade_contatos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      contabilidade_mensagens: {
        Row: {
          anexos: Json
          autor_id: string | null
          autor_nome: string | null
          autor_tipo: string
          corpo: string
          created_at: string
          empresa_id: string
          id: string
          lida_em: string | null
          thread_id: string
        }
        Insert: {
          anexos?: Json
          autor_id?: string | null
          autor_nome?: string | null
          autor_tipo: string
          corpo: string
          created_at?: string
          empresa_id: string
          id?: string
          lida_em?: string | null
          thread_id: string
        }
        Update: {
          anexos?: Json
          autor_id?: string | null
          autor_nome?: string | null
          autor_tipo?: string
          corpo?: string
          created_at?: string
          empresa_id?: string
          id?: string
          lida_em?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contabilidade_mensagens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contabilidade_mensagens_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "contabilidade_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      contabilidade_threads: {
        Row: {
          aberto_por: string | null
          assunto: string
          categoria: string
          contato_id: string | null
          created_at: string
          empresa_id: string
          id: string
          prioridade: string
          resolvido_em: string | null
          status: string
          ultima_atividade_em: string
          updated_at: string
        }
        Insert: {
          aberto_por?: string | null
          assunto: string
          categoria?: string
          contato_id?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          prioridade?: string
          resolvido_em?: string | null
          status?: string
          ultima_atividade_em?: string
          updated_at?: string
        }
        Update: {
          aberto_por?: string | null
          assunto?: string
          categoria?: string
          contato_id?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          prioridade?: string
          resolvido_em?: string | null
          status?: string
          ultima_atividade_em?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contabilidade_threads_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contabilidade_contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contabilidade_threads_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_bancarias: {
        Row: {
          agencia: string | null
          agencia_digito: string | null
          ativo: boolean | null
          banco_codigo: string | null
          banco_nome: string | null
          colaborador_id: string
          conta: string | null
          created_at: string | null
          digito: string | null
          empresa_id: string | null
          id: string
          modalidade: string | null
          pix_chave: string | null
          pix_tipo: string | null
          principal: boolean | null
          tipo_conta: string | null
          updated_at: string | null
        }
        Insert: {
          agencia?: string | null
          agencia_digito?: string | null
          ativo?: boolean | null
          banco_codigo?: string | null
          banco_nome?: string | null
          colaborador_id: string
          conta?: string | null
          created_at?: string | null
          digito?: string | null
          empresa_id?: string | null
          id?: string
          modalidade?: string | null
          pix_chave?: string | null
          pix_tipo?: string | null
          principal?: boolean | null
          tipo_conta?: string | null
          updated_at?: string | null
        }
        Update: {
          agencia?: string | null
          agencia_digito?: string | null
          ativo?: boolean | null
          banco_codigo?: string | null
          banco_nome?: string | null
          colaborador_id?: string
          conta?: string | null
          created_at?: string | null
          digito?: string | null
          empresa_id?: string | null
          id?: string
          modalidade?: string | null
          pix_chave?: string | null
          pix_tipo?: string | null
          principal?: boolean | null
          tipo_conta?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_bancarias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_bancarias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_bancarias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_bancarias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "contas_bancarias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contas_bancarias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contas_bancarias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contas_bancarias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contas_bancarias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_contas_bancarias_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      contatos_emergencia: {
        Row: {
          celular: string | null
          colaborador_id: string
          created_at: string
          email: string | null
          id: string
          nome: string
          parentesco: string | null
          relacionamento_id: number | null
          telefone: string | null
          telefone_trabalho: string | null
          updated_at: string
        }
        Insert: {
          celular?: string | null
          colaborador_id: string
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          parentesco?: string | null
          relacionamento_id?: number | null
          telefone?: string | null
          telefone_trabalho?: string | null
          updated_at?: string
        }
        Update: {
          celular?: string | null
          colaborador_id?: string
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          parentesco?: string | null
          relacionamento_id?: number | null
          telefone?: string | null
          telefone_trabalho?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contatos_emergencia_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contatos_emergencia_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contatos_emergencia_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contatos_emergencia_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "contatos_emergencia_relacionamento_id_fkey"
            columns: ["relacionamento_id"]
            isOneToOne: false
            referencedRelation: "relacionamentos_contato_emergencia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contatos_emergencia_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contatos_emergencia_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contatos_emergencia_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contatos_emergencia_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      contrato_assinatura_tokens: {
        Row: {
          assinado_ip: unknown
          assinado_ua: string | null
          assinatura_hash: string | null
          contrato_id: string
          cpf_esperado: string | null
          created_at: string
          created_by: string | null
          email_destinatario: string | null
          empresa_id: string
          expira_em: string
          id: string
          reminders_enviados: number
          revogacao_motivo: string | null
          revogado_em: string | null
          revogado_por: string | null
          tentativas: number
          token_hash: string
          ultimo_reminder_at: string | null
          usado_em: string | null
        }
        Insert: {
          assinado_ip?: unknown
          assinado_ua?: string | null
          assinatura_hash?: string | null
          contrato_id: string
          cpf_esperado?: string | null
          created_at?: string
          created_by?: string | null
          email_destinatario?: string | null
          empresa_id: string
          expira_em: string
          id?: string
          reminders_enviados?: number
          revogacao_motivo?: string | null
          revogado_em?: string | null
          revogado_por?: string | null
          tentativas?: number
          token_hash: string
          ultimo_reminder_at?: string | null
          usado_em?: string | null
        }
        Update: {
          assinado_ip?: unknown
          assinado_ua?: string | null
          assinatura_hash?: string | null
          contrato_id?: string
          cpf_esperado?: string | null
          created_at?: string
          created_by?: string | null
          email_destinatario?: string | null
          empresa_id?: string
          expira_em?: string
          id?: string
          reminders_enviados?: number
          revogacao_motivo?: string | null
          revogado_em?: string | null
          revogado_por?: string | null
          tentativas?: number
          token_hash?: string
          ultimo_reminder_at?: string | null
          usado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contrato_assinatura_tokens_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_gerados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_assinatura_tokens_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "v_contratos_vencendo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_assinatura_tokens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_templates: {
        Row: {
          ativo: boolean
          cargo_id: string | null
          clausulas_condicionais: Json
          corpo_html: string
          created_at: string
          created_by: string | null
          departamento_id: string | null
          descricao: string | null
          empresa_id: string
          id: string
          nome: string
          tipo_contrato: string
          updated_at: string
          variaveis_schema: Json
          versao: number
        }
        Insert: {
          ativo?: boolean
          cargo_id?: string | null
          clausulas_condicionais?: Json
          corpo_html: string
          created_at?: string
          created_by?: string | null
          departamento_id?: string | null
          descricao?: string | null
          empresa_id: string
          id?: string
          nome: string
          tipo_contrato: string
          updated_at?: string
          variaveis_schema?: Json
          versao?: number
        }
        Update: {
          ativo?: boolean
          cargo_id?: string | null
          clausulas_condicionais?: Json
          corpo_html?: string
          created_at?: string
          created_by?: string | null
          departamento_id?: string | null
          descricao?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          tipo_contrato?: string
          updated_at?: string
          variaveis_schema?: Json
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "contrato_templates_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_templates_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_templates_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_token_eventos: {
        Row: {
          ator_id: string | null
          contrato_id: string
          created_at: string
          detalhes: Json
          empresa_id: string
          evento: string
          id: string
          ip: unknown
          token_id: string
          user_agent: string | null
        }
        Insert: {
          ator_id?: string | null
          contrato_id: string
          created_at?: string
          detalhes?: Json
          empresa_id: string
          evento: string
          id?: string
          ip?: unknown
          token_id: string
          user_agent?: string | null
        }
        Update: {
          ator_id?: string | null
          contrato_id?: string
          created_at?: string
          detalhes?: Json
          empresa_id?: string
          evento?: string
          id?: string
          ip?: unknown
          token_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contrato_token_eventos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_gerados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_token_eventos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "v_contratos_vencendo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_token_eventos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_token_eventos_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "contrato_assinatura_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_token_eventos_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "v_contratos_tokens_pendentes"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          colaborador_id: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string
          empresa_id: string | null
          id: string
          observacoes: string | null
          status: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          colaborador_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          empresa_id?: string | null
          id?: string
          observacoes?: string | null
          status?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          colaborador_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          empresa_id?: string | null
          id?: string
          observacoes?: string | null
          status?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contratos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contratos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contratos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contratos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contratos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_contratos_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_gerados: {
        Row: {
          admissao_id: string | null
          alerta_vencimento_enviado_em: string | null
          assinado_em: string | null
          assinatura_metadata: Json | null
          colaborador_id: string | null
          contrato_anterior_id: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          empresa_id: string
          gerado_por: string | null
          html_final: string | null
          id: string
          prorrogado: boolean
          sha256: string | null
          status: string
          storage_path: string | null
          template_id: string
          template_versao: number
          updated_at: string
          variaveis_snapshot: Json
        }
        Insert: {
          admissao_id?: string | null
          alerta_vencimento_enviado_em?: string | null
          assinado_em?: string | null
          assinatura_metadata?: Json | null
          colaborador_id?: string | null
          contrato_anterior_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          empresa_id: string
          gerado_por?: string | null
          html_final?: string | null
          id?: string
          prorrogado?: boolean
          sha256?: string | null
          status?: string
          storage_path?: string | null
          template_id: string
          template_versao: number
          updated_at?: string
          variaveis_snapshot?: Json
        }
        Update: {
          admissao_id?: string | null
          alerta_vencimento_enviado_em?: string | null
          assinado_em?: string | null
          assinatura_metadata?: Json | null
          colaborador_id?: string | null
          contrato_anterior_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          empresa_id?: string
          gerado_por?: string | null
          html_final?: string | null
          id?: string
          prorrogado?: boolean
          sha256?: string | null
          status?: string
          storage_path?: string | null
          template_id?: string
          template_versao?: number
          updated_at?: string
          variaveis_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "contratos_gerados_admissao_id_fkey"
            columns: ["admissao_id"]
            isOneToOne: false
            referencedRelation: "admissoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_gerados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_gerados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_gerados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_gerados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "contratos_gerados_contrato_anterior_id_fkey"
            columns: ["contrato_anterior_id"]
            isOneToOne: false
            referencedRelation: "contratos_gerados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_gerados_contrato_anterior_id_fkey"
            columns: ["contrato_anterior_id"]
            isOneToOne: false
            referencedRelation: "v_contratos_vencendo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_gerados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_gerados_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contrato_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      controle_acesso: {
        Row: {
          area: string | null
          colaborador_id: string
          created_at: string | null
          dispositivo: string | null
          empresa_id: string | null
          id: string
          ip_address: string | null
          latitude: number | null
          local: string | null
          longitude: number | null
          metodo: string | null
          tipo: string
        }
        Insert: {
          area?: string | null
          colaborador_id: string
          created_at?: string | null
          dispositivo?: string | null
          empresa_id?: string | null
          id?: string
          ip_address?: string | null
          latitude?: number | null
          local?: string | null
          longitude?: number | null
          metodo?: string | null
          tipo: string
        }
        Update: {
          area?: string | null
          colaborador_id?: string
          created_at?: string | null
          dispositivo?: string | null
          empresa_id?: string | null
          id?: string
          ip_address?: string | null
          latitude?: number | null
          local?: string | null
          longitude?: number | null
          metodo?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "controle_acesso_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "controle_acesso_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "controle_acesso_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "controle_acesso_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "controle_acesso_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_controle_acesso_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_controle_acesso_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_controle_acesso_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_controle_acesso_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_controle_acesso_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      convenios: {
        Row: {
          ativo: boolean | null
          created_at: string
          empresa_id: string | null
          id: string
          limite_global: number | null
          nome: string
          tipo: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          limite_global?: number | null
          nome: string
          tipo?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          limite_global?: number | null
          nome?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "convenios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_convenios_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      convenios_colaboradores: {
        Row: {
          ativo: boolean | null
          colaborador_id: string
          convenio_id: string
          created_at: string
          id: string
          limite_individual: number | null
          saldo_utilizado: number | null
        }
        Insert: {
          ativo?: boolean | null
          colaborador_id: string
          convenio_id: string
          created_at?: string
          id?: string
          limite_individual?: number | null
          saldo_utilizado?: number | null
        }
        Update: {
          ativo?: boolean | null
          colaborador_id?: string
          convenio_id?: string
          created_at?: string
          id?: string
          limite_individual?: number | null
          saldo_utilizado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "convenios_colaboradores_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convenios_colaboradores_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convenios_colaboradores_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convenios_colaboradores_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "convenios_colaboradores_convenio_id_fkey"
            columns: ["convenio_id"]
            isOneToOne: false
            referencedRelation: "convenios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_convenios_colaboradores_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_convenios_colaboradores_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_convenios_colaboradores_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_convenios_colaboradores_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      curriculos_arquivos: {
        Row: {
          candidato_id: string
          created_at: string | null
          empresa_id: string
          file_path: string
          id: string
        }
        Insert: {
          candidato_id: string
          created_at?: string | null
          empresa_id: string
          file_path: string
          id?: string
        }
        Update: {
          candidato_id?: string
          created_at?: string | null
          empresa_id?: string
          file_path?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculos_arquivos_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculos_arquivos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      dados_estagiario: {
        Row: {
          area_atuacao: string | null
          carga_horaria_semanal: number | null
          categoria_estagio: string | null
          colaborador_id: string
          created_at: string | null
          curso: string | null
          data_fim: string | null
          data_inicio: string | null
          empresa_id: string | null
          id: string
          instituicao_bairro: string | null
          instituicao_cep: string | null
          instituicao_cidade: string | null
          instituicao_cnpj: string | null
          instituicao_complemento: string | null
          instituicao_endereco: string | null
          instituicao_nome: string | null
          instituicao_numero: string | null
          instituicao_uf: string | null
          nivel: string | null
          numero_apolice: string | null
          obrigatorio: boolean | null
          supervisor_cargo: string | null
          supervisor_id: string | null
          supervisor_nome: string | null
          updated_at: string | null
          valor_bolsa: number | null
        }
        Insert: {
          area_atuacao?: string | null
          carga_horaria_semanal?: number | null
          categoria_estagio?: string | null
          colaborador_id: string
          created_at?: string | null
          curso?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          empresa_id?: string | null
          id?: string
          instituicao_bairro?: string | null
          instituicao_cep?: string | null
          instituicao_cidade?: string | null
          instituicao_cnpj?: string | null
          instituicao_complemento?: string | null
          instituicao_endereco?: string | null
          instituicao_nome?: string | null
          instituicao_numero?: string | null
          instituicao_uf?: string | null
          nivel?: string | null
          numero_apolice?: string | null
          obrigatorio?: boolean | null
          supervisor_cargo?: string | null
          supervisor_id?: string | null
          supervisor_nome?: string | null
          updated_at?: string | null
          valor_bolsa?: number | null
        }
        Update: {
          area_atuacao?: string | null
          carga_horaria_semanal?: number | null
          categoria_estagio?: string | null
          colaborador_id?: string
          created_at?: string | null
          curso?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          empresa_id?: string | null
          id?: string
          instituicao_bairro?: string | null
          instituicao_cep?: string | null
          instituicao_cidade?: string | null
          instituicao_cnpj?: string | null
          instituicao_complemento?: string | null
          instituicao_endereco?: string | null
          instituicao_nome?: string | null
          instituicao_numero?: string | null
          instituicao_uf?: string | null
          nivel?: string | null
          numero_apolice?: string | null
          obrigatorio?: boolean | null
          supervisor_cargo?: string | null
          supervisor_id?: string | null
          supervisor_nome?: string | null
          updated_at?: string | null
          valor_bolsa?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dados_estagiario_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dados_estagiario_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dados_estagiario_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dados_estagiario_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "dados_estagiario_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dados_estagiario_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dados_estagiario_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dados_estagiario_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dados_estagiario_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_dados_estagiario_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dados_estagiario_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dados_estagiario_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dados_estagiario_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_dados_estagiario_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      dados_estrangeiro: {
        Row: {
          casado_brasileiro: boolean | null
          colaborador_id: string
          condicao_ingresso: string | null
          condicao_ingresso_id: number | null
          created_at: string
          data_chegada: string | null
          data_naturalizacao: string | null
          descricao_logradouro_id: number | null
          endereco_exterior: string | null
          filho_brasileiro: boolean | null
          id: string
          pais_id: number | null
          pais_origem: string | null
          reside_brasil: boolean | null
          tempo_residencia: string | null
          tempo_residencia_id: number | null
          tipo_visto: string | null
          tipo_visto_id: number | null
          updated_at: string
        }
        Insert: {
          casado_brasileiro?: boolean | null
          colaborador_id: string
          condicao_ingresso?: string | null
          condicao_ingresso_id?: number | null
          created_at?: string
          data_chegada?: string | null
          data_naturalizacao?: string | null
          descricao_logradouro_id?: number | null
          endereco_exterior?: string | null
          filho_brasileiro?: boolean | null
          id?: string
          pais_id?: number | null
          pais_origem?: string | null
          reside_brasil?: boolean | null
          tempo_residencia?: string | null
          tempo_residencia_id?: number | null
          tipo_visto?: string | null
          tipo_visto_id?: number | null
          updated_at?: string
        }
        Update: {
          casado_brasileiro?: boolean | null
          colaborador_id?: string
          condicao_ingresso?: string | null
          condicao_ingresso_id?: number | null
          created_at?: string
          data_chegada?: string | null
          data_naturalizacao?: string | null
          descricao_logradouro_id?: number | null
          endereco_exterior?: string | null
          filho_brasileiro?: boolean | null
          id?: string
          pais_id?: number | null
          pais_origem?: string | null
          reside_brasil?: boolean | null
          tempo_residencia?: string | null
          tempo_residencia_id?: number | null
          tipo_visto?: string | null
          tipo_visto_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dados_estrangeiro_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: true
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dados_estrangeiro_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: true
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dados_estrangeiro_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: true
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dados_estrangeiro_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: true
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "dados_estrangeiro_condicao_ingresso_id_fkey"
            columns: ["condicao_ingresso_id"]
            isOneToOne: false
            referencedRelation: "condicoes_ingresso"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dados_estrangeiro_descricao_logradouro_id_fkey"
            columns: ["descricao_logradouro_id"]
            isOneToOne: false
            referencedRelation: "descricoes_logradouro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dados_estrangeiro_pais_id_fkey"
            columns: ["pais_id"]
            isOneToOne: false
            referencedRelation: "paises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dados_estrangeiro_tempo_residencia_id_fkey"
            columns: ["tempo_residencia_id"]
            isOneToOne: false
            referencedRelation: "tempos_residencia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dados_estrangeiro_tipo_visto_id_fkey"
            columns: ["tipo_visto_id"]
            isOneToOne: false
            referencedRelation: "tipos_visto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dados_estrangeiro_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: true
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dados_estrangeiro_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: true
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dados_estrangeiro_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: true
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dados_estrangeiro_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: true
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      dctfweb_declaracoes: {
        Row: {
          competencia: string
          created_at: string
          data_geracao: string | null
          data_transmissao: string | null
          debitos: Json | null
          empresa_id: string | null
          id: string
          status: string | null
          total_debitos: number | null
          total_fgts: number | null
          total_remuneracao: number | null
        }
        Insert: {
          competencia: string
          created_at?: string
          data_geracao?: string | null
          data_transmissao?: string | null
          debitos?: Json | null
          empresa_id?: string | null
          id?: string
          status?: string | null
          total_debitos?: number | null
          total_fgts?: number | null
          total_remuneracao?: number | null
        }
        Update: {
          competencia?: string
          created_at?: string
          data_geracao?: string | null
          data_transmissao?: string | null
          debitos?: Json | null
          empresa_id?: string | null
          id?: string
          status?: string | null
          total_debitos?: number | null
          total_fgts?: number | null
          total_remuneracao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dctfweb_declaracoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dctfweb_declaracoes_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      deficiencias: {
        Row: {
          cid: string | null
          colaborador_id: string
          cota_pcd: boolean | null
          created_at: string
          descricao: string | null
          id: string
          laudo_url: string | null
          observacoes: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          cid?: string | null
          colaborador_id: string
          cota_pcd?: boolean | null
          created_at?: string
          descricao?: string | null
          id?: string
          laudo_url?: string | null
          observacoes?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          cid?: string | null
          colaborador_id?: string
          cota_pcd?: boolean | null
          created_at?: string
          descricao?: string | null
          id?: string
          laudo_url?: string | null
          observacoes?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deficiencias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: true
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deficiencias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: true
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deficiencias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: true
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deficiencias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: true
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_deficiencias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: true
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_deficiencias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: true
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_deficiencias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: true
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_deficiencias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: true
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      departamentos: {
        Row: {
          ativo: boolean | null
          codigo_centro_custo: string | null
          created_at: string
          departamento_pai_id: string | null
          empresa_id: string | null
          gestor_id: string | null
          id: string
          nome: string
          responsavel_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          codigo_centro_custo?: string | null
          created_at?: string
          departamento_pai_id?: string | null
          empresa_id?: string | null
          gestor_id?: string | null
          id?: string
          nome: string
          responsavel_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          codigo_centro_custo?: string | null
          created_at?: string
          departamento_pai_id?: string | null
          empresa_id?: string | null
          gestor_id?: string | null
          id?: string
          nome?: string
          responsavel_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departamentos_departamento_pai_id_fkey"
            columns: ["departamento_pai_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departamentos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departamentos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departamentos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departamentos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_departamentos_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      dependentes: {
        Row: {
          colaborador_id: string
          cpf: string | null
          created_at: string
          data_inicio_vigencia: string | null
          data_nascimento: string
          deficiente: boolean | null
          escolaridade: string | null
          estrangeiro: boolean | null
          genero_documento_id: number | null
          grau_parentesco: string | null
          id: string
          incapacidade_fisica_mental: boolean | null
          ir: boolean | null
          nome: string
          para_irrf: boolean | null
          para_plano_saude: boolean | null
          para_salario_familia: boolean | null
          parentesco: string
          relacionamento_id: number | null
          salario_familia: boolean | null
        }
        Insert: {
          colaborador_id: string
          cpf?: string | null
          created_at?: string
          data_inicio_vigencia?: string | null
          data_nascimento: string
          deficiente?: boolean | null
          escolaridade?: string | null
          estrangeiro?: boolean | null
          genero_documento_id?: number | null
          grau_parentesco?: string | null
          id?: string
          incapacidade_fisica_mental?: boolean | null
          ir?: boolean | null
          nome: string
          para_irrf?: boolean | null
          para_plano_saude?: boolean | null
          para_salario_familia?: boolean | null
          parentesco: string
          relacionamento_id?: number | null
          salario_familia?: boolean | null
        }
        Update: {
          colaborador_id?: string
          cpf?: string | null
          created_at?: string
          data_inicio_vigencia?: string | null
          data_nascimento?: string
          deficiente?: boolean | null
          escolaridade?: string | null
          estrangeiro?: boolean | null
          genero_documento_id?: number | null
          grau_parentesco?: string | null
          id?: string
          incapacidade_fisica_mental?: boolean | null
          ir?: boolean | null
          nome?: string
          para_irrf?: boolean | null
          para_plano_saude?: boolean | null
          para_salario_familia?: boolean | null
          parentesco?: string
          relacionamento_id?: number | null
          salario_familia?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "dependentes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dependentes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dependentes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dependentes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "dependentes_genero_documento_id_fkey"
            columns: ["genero_documento_id"]
            isOneToOne: false
            referencedRelation: "generos_documento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dependentes_relacionamento_id_fkey"
            columns: ["relacionamento_id"]
            isOneToOne: false
            referencedRelation: "relacionamentos_dependentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dependentes_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dependentes_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dependentes_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dependentes_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      dependentes_beneficios: {
        Row: {
          ativo: boolean | null
          beneficio_id: string
          created_at: string | null
          dependente_id: string
          id: string
          valor_dependente: number | null
          valor_empresa: number | null
        }
        Insert: {
          ativo?: boolean | null
          beneficio_id: string
          created_at?: string | null
          dependente_id: string
          id?: string
          valor_dependente?: number | null
          valor_empresa?: number | null
        }
        Update: {
          ativo?: boolean | null
          beneficio_id?: string
          created_at?: string | null
          dependente_id?: string
          id?: string
          valor_dependente?: number | null
          valor_empresa?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dependentes_beneficios_beneficio_id_fkey"
            columns: ["beneficio_id"]
            isOneToOne: false
            referencedRelation: "beneficios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dependentes_beneficios_dependente_id_fkey"
            columns: ["dependente_id"]
            isOneToOne: false
            referencedRelation: "dependentes"
            referencedColumns: ["id"]
          },
        ]
      }
      descricoes_logradouro: {
        Row: {
          created_at: string | null
          id: number
          nome: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          nome: string
        }
        Update: {
          created_at?: string | null
          id?: number
          nome?: string
        }
        Relationships: []
      }
      desligamentos: {
        Row: {
          assinado_colaborador: boolean | null
          assinado_empresa: boolean | null
          aviso_previo: number | null
          checklist_calculo_rescisao: boolean | null
          checklist_comunicacao: boolean | null
          checklist_devolucao_equipamentos: boolean | null
          checklist_documentacao: boolean | null
          checklist_esocial: boolean | null
          checklist_homologacao: boolean | null
          checklist_pagamento: boolean | null
          checklist_revogacao_acessos: boolean | null
          colaborador_id: string
          comprovante_pagamento_url: string | null
          created_at: string
          created_by: string | null
          data_assinatura_colaborador: string | null
          data_assinatura_empresa: string | null
          data_aviso: string | null
          data_aviso_previo: string | null
          data_contabilidade: string | null
          data_desligamento: string
          data_pagamento: string | null
          data_remocao_acesso: string | null
          decimo_terceiro: number | null
          empresa_id: string | null
          etapa: string | null
          ferias_proporcionais: number | null
          ferias_vencidas: number | null
          hash_assinatura_colaborador: string | null
          hash_assinatura_empresa: string | null
          hash_integridade: string | null
          id: string
          motivo: string | null
          multa_fgts: number | null
          novo_supervisor_id: string | null
          quebra_contrato: boolean | null
          remover_beneficios: boolean | null
          salario_base: number
          saldo_salario: number | null
          status: string
          terco_constitucional: number | null
          tipo: Database["public"]["Enums"]["tipo_desligamento"]
          tipo_aviso_previo_id: number | null
          tipo_desligamento_id: number | null
          total_descontos: number | null
          total_proventos: number | null
          updated_at: string
          valor_liquido: number | null
        }
        Insert: {
          assinado_colaborador?: boolean | null
          assinado_empresa?: boolean | null
          aviso_previo?: number | null
          checklist_calculo_rescisao?: boolean | null
          checklist_comunicacao?: boolean | null
          checklist_devolucao_equipamentos?: boolean | null
          checklist_documentacao?: boolean | null
          checklist_esocial?: boolean | null
          checklist_homologacao?: boolean | null
          checklist_pagamento?: boolean | null
          checklist_revogacao_acessos?: boolean | null
          colaborador_id: string
          comprovante_pagamento_url?: string | null
          created_at?: string
          created_by?: string | null
          data_assinatura_colaborador?: string | null
          data_assinatura_empresa?: string | null
          data_aviso?: string | null
          data_aviso_previo?: string | null
          data_contabilidade?: string | null
          data_desligamento: string
          data_pagamento?: string | null
          data_remocao_acesso?: string | null
          decimo_terceiro?: number | null
          empresa_id?: string | null
          etapa?: string | null
          ferias_proporcionais?: number | null
          ferias_vencidas?: number | null
          hash_assinatura_colaborador?: string | null
          hash_assinatura_empresa?: string | null
          hash_integridade?: string | null
          id?: string
          motivo?: string | null
          multa_fgts?: number | null
          novo_supervisor_id?: string | null
          quebra_contrato?: boolean | null
          remover_beneficios?: boolean | null
          salario_base?: number
          saldo_salario?: number | null
          status?: string
          terco_constitucional?: number | null
          tipo: Database["public"]["Enums"]["tipo_desligamento"]
          tipo_aviso_previo_id?: number | null
          tipo_desligamento_id?: number | null
          total_descontos?: number | null
          total_proventos?: number | null
          updated_at?: string
          valor_liquido?: number | null
        }
        Update: {
          assinado_colaborador?: boolean | null
          assinado_empresa?: boolean | null
          aviso_previo?: number | null
          checklist_calculo_rescisao?: boolean | null
          checklist_comunicacao?: boolean | null
          checklist_devolucao_equipamentos?: boolean | null
          checklist_documentacao?: boolean | null
          checklist_esocial?: boolean | null
          checklist_homologacao?: boolean | null
          checklist_pagamento?: boolean | null
          checklist_revogacao_acessos?: boolean | null
          colaborador_id?: string
          comprovante_pagamento_url?: string | null
          created_at?: string
          created_by?: string | null
          data_assinatura_colaborador?: string | null
          data_assinatura_empresa?: string | null
          data_aviso?: string | null
          data_aviso_previo?: string | null
          data_contabilidade?: string | null
          data_desligamento?: string
          data_pagamento?: string | null
          data_remocao_acesso?: string | null
          decimo_terceiro?: number | null
          empresa_id?: string | null
          etapa?: string | null
          ferias_proporcionais?: number | null
          ferias_vencidas?: number | null
          hash_assinatura_colaborador?: string | null
          hash_assinatura_empresa?: string | null
          hash_integridade?: string | null
          id?: string
          motivo?: string | null
          multa_fgts?: number | null
          novo_supervisor_id?: string | null
          quebra_contrato?: boolean | null
          remover_beneficios?: boolean | null
          salario_base?: number
          saldo_salario?: number | null
          status?: string
          terco_constitucional?: number | null
          tipo?: Database["public"]["Enums"]["tipo_desligamento"]
          tipo_aviso_previo_id?: number | null
          tipo_desligamento_id?: number | null
          total_descontos?: number | null
          total_proventos?: number | null
          updated_at?: string
          valor_liquido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "desligamentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desligamentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desligamentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desligamentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "desligamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desligamentos_tipo_aviso_previo_id_fkey"
            columns: ["tipo_aviso_previo_id"]
            isOneToOne: false
            referencedRelation: "tipos_aviso_previo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desligamentos_tipo_desligamento_id_fkey"
            columns: ["tipo_desligamento_id"]
            isOneToOne: false
            referencedRelation: "tipos_desligamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_desligamentos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_desligamentos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_desligamentos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_desligamentos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_desligamentos_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          categoria: string
          colaborador_id: string
          comprovante_url: string | null
          created_at: string | null
          data_despesa: string
          descricao: string
          empresa_id: string | null
          folha_id: string | null
          id: string
          integrado_folha_em: string | null
          observacoes: string | null
          observacoes_aprovador: string | null
          rejeitado_motivo: string | null
          status: string | null
          tipo: string
          updated_at: string | null
          valor: number
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          categoria: string
          colaborador_id: string
          comprovante_url?: string | null
          created_at?: string | null
          data_despesa: string
          descricao: string
          empresa_id?: string | null
          folha_id?: string | null
          id?: string
          integrado_folha_em?: string | null
          observacoes?: string | null
          observacoes_aprovador?: string | null
          rejeitado_motivo?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string | null
          valor: number
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          categoria?: string
          colaborador_id?: string
          comprovante_url?: string | null
          created_at?: string | null
          data_despesa?: string
          descricao?: string
          empresa_id?: string | null
          folha_id?: string | null
          id?: string
          integrado_folha_em?: string | null
          observacoes?: string | null
          observacoes_aprovador?: string | null
          rejeitado_motivo?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "despesas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "despesas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_folha_id_fkey"
            columns: ["folha_id"]
            isOneToOne: false
            referencedRelation: "folhas_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_despesas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_despesas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_despesas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_despesas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_despesas_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas_aprovacoes_log: {
        Row: {
          acao: string
          created_at: string
          despesa_id: string
          empresa_id: string | null
          id: string
          motivo: string | null
          status_anterior: string | null
          status_novo: string
          usuario_id: string
        }
        Insert: {
          acao: string
          created_at?: string
          despesa_id: string
          empresa_id?: string | null
          id?: string
          motivo?: string | null
          status_anterior?: string | null
          status_novo: string
          usuario_id: string
        }
        Update: {
          acao?: string
          created_at?: string
          despesa_id?: string
          empresa_id?: string | null
          id?: string
          motivo?: string | null
          status_anterior?: string | null
          status_novo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "despesas_aprovacoes_log_despesa_id_fkey"
            columns: ["despesa_id"]
            isOneToOne: false
            referencedRelation: "despesas"
            referencedColumns: ["id"]
          },
        ]
      }
      documento_templates: {
        Row: {
          ativo: boolean | null
          categoria: string
          conteudo_html: string
          created_at: string
          created_by: string | null
          empresa_id: string | null
          id: string
          nome: string
          tipo: string
          updated_at: string
          variaveis: Json | null
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string
          conteudo_html: string
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: string
          nome: string
          tipo: string
          updated_at?: string
          variaveis?: Json | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string
          conteudo_html?: string
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
          variaveis?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "documento_templates_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documento_templates_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          colaborador_id: string | null
          created_at: string
          data_validade: string | null
          id: string
          nome: string
          observacoes: string | null
          tipo: string
          updated_at: string
          url: string | null
          validado: boolean | null
          validado_por: string | null
        }
        Insert: {
          colaborador_id?: string | null
          created_at?: string
          data_validade?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          tipo: string
          updated_at?: string
          url?: string | null
          validado?: boolean | null
          validado_por?: string | null
        }
        Update: {
          colaborador_id?: string | null
          created_at?: string
          data_validade?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          tipo?: string
          updated_at?: string
          url?: string | null
          validado?: boolean | null
          validado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_documentos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documentos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documentos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documentos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      documentos_admissao: {
        Row: {
          admissao_id: string
          created_at: string
          id: string
          nome_arquivo: string
          observacoes: string | null
          tamanho_bytes: number | null
          tipo: string
          url: string
          validado: boolean | null
          validado_em: string | null
          validado_por: string | null
        }
        Insert: {
          admissao_id: string
          created_at?: string
          id?: string
          nome_arquivo: string
          observacoes?: string | null
          tamanho_bytes?: number | null
          tipo: string
          url: string
          validado?: boolean | null
          validado_em?: string | null
          validado_por?: string | null
        }
        Update: {
          admissao_id?: string
          created_at?: string
          id?: string
          nome_arquivo?: string
          observacoes?: string | null
          tamanho_bytes?: number | null
          tipo?: string
          url?: string
          validado?: boolean | null
          validado_em?: string | null
          validado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_admissao_admissao_id_fkey"
            columns: ["admissao_id"]
            isOneToOne: false
            referencedRelation: "admissoes"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_afastamento: {
        Row: {
          afastamento_id: string
          created_at: string
          created_by: string | null
          id: string
          nome_arquivo: string
          tipo: string
          url: string
        }
        Insert: {
          afastamento_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome_arquivo: string
          tipo: string
          url: string
        }
        Update: {
          afastamento_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome_arquivo?: string
          tipo?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_afastamento_afastamento_id_fkey"
            columns: ["afastamento_id"]
            isOneToOne: false
            referencedRelation: "afastamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_assinatura: {
        Row: {
          assinado_em: string | null
          assinado_por: string | null
          assinatura_base64: string | null
          colaborador_id: string
          conteudo_url: string | null
          created_at: string
          created_by: string | null
          empresa_id: string | null
          hash_documento: string | null
          id: string
          ip_assinatura: string | null
          status: string
          tipo_documento: string
          titulo: string
          validade_assinatura: string | null
        }
        Insert: {
          assinado_em?: string | null
          assinado_por?: string | null
          assinatura_base64?: string | null
          colaborador_id: string
          conteudo_url?: string | null
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          hash_documento?: string | null
          id?: string
          ip_assinatura?: string | null
          status?: string
          tipo_documento: string
          titulo: string
          validade_assinatura?: string | null
        }
        Update: {
          assinado_em?: string | null
          assinado_por?: string | null
          assinatura_base64?: string | null
          colaborador_id?: string
          conteudo_url?: string | null
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          hash_documento?: string | null
          id?: string
          ip_assinatura?: string | null
          status?: string
          tipo_documento?: string
          titulo?: string
          validade_assinatura?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_assinatura_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_assinatura_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_assinatura_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_assinatura_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "documentos_assinatura_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documentos_assinatura_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_colaborador: {
        Row: {
          colaborador_id: string
          created_at: string
          created_by: string | null
          hash_validacao: string | null
          id: string
          nome_arquivo: string
          tamanho_bytes: number | null
          tipo: string
          url: string
          verificado_ia: boolean | null
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          created_by?: string | null
          hash_validacao?: string | null
          id?: string
          nome_arquivo: string
          tamanho_bytes?: number | null
          tipo: string
          url: string
          verificado_ia?: boolean | null
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          created_by?: string | null
          hash_validacao?: string | null
          id?: string
          nome_arquivo?: string
          tamanho_bytes?: number | null
          tipo?: string
          url?: string
          verificado_ia?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_documentos_colaborador_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documentos_colaborador_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documentos_colaborador_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documentos_colaborador_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      documentos_historico: {
        Row: {
          alteracoes: string | null
          created_at: string
          documento_id: string | null
          id: string
          tamanho: number | null
          url_arquivo: string
          usuario_id: string | null
          versao: string
        }
        Insert: {
          alteracoes?: string | null
          created_at?: string
          documento_id?: string | null
          id?: string
          tamanho?: number | null
          url_arquivo: string
          usuario_id?: string | null
          versao: string
        }
        Update: {
          alteracoes?: string | null
          created_at?: string
          documento_id?: string | null
          id?: string
          tamanho?: number | null
          url_arquivo?: string
          usuario_id?: string | null
          versao?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_historico_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_pessoais_arquivos: {
        Row: {
          arquivo_nome: string | null
          arquivo_tamanho: number | null
          arquivo_url: string | null
          colaborador_id: string
          created_at: string | null
          created_by: string | null
          data_emissao: string | null
          data_validade: string | null
          id: string
          numero: string | null
          orgao_emissor: string | null
          tipo_documento: string
          updated_at: string | null
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_tamanho?: number | null
          arquivo_url?: string | null
          colaborador_id: string
          created_at?: string | null
          created_by?: string | null
          data_emissao?: string | null
          data_validade?: string | null
          id?: string
          numero?: string | null
          orgao_emissor?: string | null
          tipo_documento: string
          updated_at?: string | null
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_tamanho?: number | null
          arquivo_url?: string | null
          colaborador_id?: string
          created_at?: string | null
          created_by?: string | null
          data_emissao?: string | null
          data_validade?: string | null
          id?: string
          numero?: string | null
          orgao_emissor?: string | null
          tipo_documento?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_pessoais_arquivos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_pessoais_arquivos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_pessoais_arquivos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_pessoais_arquivos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_documentos_pessoais_arquivos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documentos_pessoais_arquivos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documentos_pessoais_arquivos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documentos_pessoais_arquivos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      empresas: {
        Row: {
          aliquota_simples: number | null
          ativa: boolean | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          cor_identificacao: string | null
          created_at: string
          email: string | null
          fap: number | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          logo_url: string | null
          logradouro: string | null
          nome_fantasia: string | null
          numero: string | null
          ordem_exibicao: number | null
          rat: number | null
          razao_social: string
          regime_tributario: Database["public"]["Enums"]["regime_tributario"]
          telefone: string | null
          terceiros: number | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          aliquota_simples?: number | null
          ativa?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          cor_identificacao?: string | null
          created_at?: string
          email?: string | null
          fap?: number | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          logo_url?: string | null
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          ordem_exibicao?: number | null
          rat?: number | null
          razao_social: string
          regime_tributario?: Database["public"]["Enums"]["regime_tributario"]
          telefone?: string | null
          terceiros?: number | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          aliquota_simples?: number | null
          ativa?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          cor_identificacao?: string | null
          created_at?: string
          email?: string | null
          fap?: number | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          logo_url?: string | null
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          ordem_exibicao?: number | null
          rat?: number | null
          razao_social?: string
          regime_tributario?: Database["public"]["Enums"]["regime_tributario"]
          telefone?: string | null
          terceiros?: number | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      emprestimos_consignados: {
        Row: {
          colaborador_id: string
          created_at: string
          data_inicio: string
          empresa_id: string
          id: string
          instituicao_financeira: string | null
          numero_parcelas: number
          observacoes: string | null
          parcelas_pagas: number | null
          status: string | null
          taxa_juros: number | null
          updated_at: string
          valor_parcela: number
          valor_total: number
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          data_inicio: string
          empresa_id: string
          id?: string
          instituicao_financeira?: string | null
          numero_parcelas: number
          observacoes?: string | null
          parcelas_pagas?: number | null
          status?: string | null
          taxa_juros?: number | null
          updated_at?: string
          valor_parcela: number
          valor_total: number
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          data_inicio?: string
          empresa_id?: string
          id?: string
          instituicao_financeira?: string | null
          numero_parcelas?: number
          observacoes?: string | null
          parcelas_pagas?: number | null
          status?: string | null
          taxa_juros?: number | null
          updated_at?: string
          valor_parcela?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "emprestimos_consignados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emprestimos_consignados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emprestimos_consignados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emprestimos_consignados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "emprestimos_consignados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      epis: {
        Row: {
          ativo: boolean | null
          ca: string | null
          ca_validade: string | null
          categoria: string | null
          created_at: string | null
          descricao: string | null
          empresa_id: string | null
          estoque_atual: number | null
          estoque_minimo: number | null
          fabricante: string | null
          id: string
          nome: string
          unidade_medida: string | null
          updated_at: string | null
          validade_ca: string | null
        }
        Insert: {
          ativo?: boolean | null
          ca?: string | null
          ca_validade?: string | null
          categoria?: string | null
          created_at?: string | null
          descricao?: string | null
          empresa_id?: string | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          fabricante?: string | null
          id?: string
          nome: string
          unidade_medida?: string | null
          updated_at?: string | null
          validade_ca?: string | null
        }
        Update: {
          ativo?: boolean | null
          ca?: string | null
          ca_validade?: string | null
          categoria?: string | null
          created_at?: string | null
          descricao?: string | null
          empresa_id?: string | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          fabricante?: string | null
          id?: string
          nome?: string
          unidade_medida?: string | null
          updated_at?: string | null
          validade_ca?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "epis_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_epis_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      epis_entregas: {
        Row: {
          assinatura_url: string | null
          colaborador_id: string
          created_at: string | null
          data_devolucao: string | null
          data_entrega: string
          empresa_id: string | null
          entregue_por: string | null
          epi_id: string
          hash_integridade: string | null
          id: string
          motivo: string | null
          observacoes: string | null
          quantidade: number | null
        }
        Insert: {
          assinatura_url?: string | null
          colaborador_id: string
          created_at?: string | null
          data_devolucao?: string | null
          data_entrega: string
          empresa_id?: string | null
          entregue_por?: string | null
          epi_id: string
          hash_integridade?: string | null
          id?: string
          motivo?: string | null
          observacoes?: string | null
          quantidade?: number | null
        }
        Update: {
          assinatura_url?: string | null
          colaborador_id?: string
          created_at?: string | null
          data_devolucao?: string | null
          data_entrega?: string
          empresa_id?: string | null
          entregue_por?: string | null
          epi_id?: string
          hash_integridade?: string | null
          id?: string
          motivo?: string | null
          observacoes?: string | null
          quantidade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "epis_entregas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epis_entregas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epis_entregas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epis_entregas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "epis_entregas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epis_entregas_epi_id_fkey"
            columns: ["epi_id"]
            isOneToOne: false
            referencedRelation: "epis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_epis_entregas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_epis_entregas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_epis_entregas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_epis_entregas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_epis_entregas_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      epis_fichas: {
        Row: {
          assinada_em: string | null
          colaborador_id: string
          created_at: string
          empresa_id: string
          evidencia_foto_path: string | null
          hash_sha256: string | null
          id: string
          metadata: Json
          motivo: string | null
          observacoes: string | null
          responsavel_id: string | null
          responsavel_nome: string
          status: string
          tipo_movimento: string
          updated_at: string
        }
        Insert: {
          assinada_em?: string | null
          colaborador_id: string
          created_at?: string
          empresa_id: string
          evidencia_foto_path?: string | null
          hash_sha256?: string | null
          id?: string
          metadata?: Json
          motivo?: string | null
          observacoes?: string | null
          responsavel_id?: string | null
          responsavel_nome: string
          status?: string
          tipo_movimento?: string
          updated_at?: string
        }
        Update: {
          assinada_em?: string | null
          colaborador_id?: string
          created_at?: string
          empresa_id?: string
          evidencia_foto_path?: string | null
          hash_sha256?: string | null
          id?: string
          metadata?: Json
          motivo?: string | null
          observacoes?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string
          status?: string
          tipo_movimento?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "epis_fichas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epis_fichas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epis_fichas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epis_fichas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      epis_fichas_assinaturas: {
        Row: {
          assinado_em: string
          assinatura_dados: string
          assinatura_tipo: string
          ficha_id: string
          hash_sha256: string
          id: string
          ip_address: unknown
          user_agent: string | null
        }
        Insert: {
          assinado_em?: string
          assinatura_dados: string
          assinatura_tipo: string
          ficha_id: string
          hash_sha256: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Update: {
          assinado_em?: string
          assinatura_dados?: string
          assinatura_tipo?: string
          ficha_id?: string
          hash_sha256?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "epis_fichas_assinaturas_ficha_id_fkey"
            columns: ["ficha_id"]
            isOneToOne: true
            referencedRelation: "epis_fichas"
            referencedColumns: ["id"]
          },
        ]
      }
      epis_fichas_itens: {
        Row: {
          ca: string | null
          ca_validade: string | null
          created_at: string
          data_devolucao: string | null
          data_entrega: string
          descricao: string
          epi_id: string | null
          ficha_id: string
          id: string
          quantidade: number
          status_item: string
        }
        Insert: {
          ca?: string | null
          ca_validade?: string | null
          created_at?: string
          data_devolucao?: string | null
          data_entrega?: string
          descricao: string
          epi_id?: string | null
          ficha_id: string
          id?: string
          quantidade?: number
          status_item?: string
        }
        Update: {
          ca?: string | null
          ca_validade?: string | null
          created_at?: string
          data_devolucao?: string | null
          data_entrega?: string
          descricao?: string
          epi_id?: string | null
          ficha_id?: string
          id?: string
          quantidade?: number
          status_item?: string
        }
        Relationships: [
          {
            foreignKeyName: "epis_fichas_itens_epi_id_fkey"
            columns: ["epi_id"]
            isOneToOne: false
            referencedRelation: "epis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epis_fichas_itens_ficha_id_fkey"
            columns: ["ficha_id"]
            isOneToOne: false
            referencedRelation: "epis_fichas"
            referencedColumns: ["id"]
          },
        ]
      }
      escalas: {
        Row: {
          ativo: boolean | null
          created_at: string
          dias_folga: number | null
          dias_trabalho: number | null
          empresa_id: string | null
          horario_entrada: string | null
          horario_saida: string | null
          id: string
          intervalo_minutos: number | null
          nome: string
          tipo: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          dias_folga?: number | null
          dias_trabalho?: number | null
          empresa_id?: string | null
          horario_entrada?: string | null
          horario_saida?: string | null
          id?: string
          intervalo_minutos?: number | null
          nome: string
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          dias_folga?: number | null
          dias_trabalho?: number | null
          empresa_id?: string | null
          horario_entrada?: string | null
          horario_saida?: string | null
          id?: string
          intervalo_minutos?: number | null
          nome?: string
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_escalas_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      escalas_trabalho: {
        Row: {
          colaborador_id: string
          created_at: string | null
          created_by: string | null
          data: string
          empresa_id: string | null
          id: string
          observacoes: string | null
          status: string | null
          turno_id: string
        }
        Insert: {
          colaborador_id: string
          created_at?: string | null
          created_by?: string | null
          data: string
          empresa_id?: string | null
          id?: string
          observacoes?: string | null
          status?: string | null
          turno_id: string
        }
        Update: {
          colaborador_id?: string
          created_at?: string | null
          created_by?: string | null
          data?: string
          empresa_id?: string | null
          id?: string
          observacoes?: string | null
          status?: string | null
          turno_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalas_trabalho_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalas_trabalho_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalas_trabalho_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalas_trabalho_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "escalas_trabalho_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalas_trabalho_turno_id_fkey"
            columns: ["turno_id"]
            isOneToOne: false
            referencedRelation: "turnos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_escalas_trabalho_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_escalas_trabalho_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_escalas_trabalho_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_escalas_trabalho_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_escalas_trabalho_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      esocial_eventos: {
        Row: {
          assinatura_xml: string | null
          competencia: string | null
          created_at: string
          dados: Json | null
          data_envio: string | null
          data_processamento: string | null
          empresa_id: string | null
          erros: Json | null
          hash_arquivo: string | null
          hash_seguranca: string | null
          id: string
          id_recibo: string | null
          protocolo: string | null
          proxima_tentativa: string | null
          recibo: string | null
          status: string | null
          tentativas_envio: number | null
          tipo_evento: string
          updated_at: string
          xml: string | null
          xml_envio: string | null
          xml_retorno: string | null
        }
        Insert: {
          assinatura_xml?: string | null
          competencia?: string | null
          created_at?: string
          dados?: Json | null
          data_envio?: string | null
          data_processamento?: string | null
          empresa_id?: string | null
          erros?: Json | null
          hash_arquivo?: string | null
          hash_seguranca?: string | null
          id?: string
          id_recibo?: string | null
          protocolo?: string | null
          proxima_tentativa?: string | null
          recibo?: string | null
          status?: string | null
          tentativas_envio?: number | null
          tipo_evento: string
          updated_at?: string
          xml?: string | null
          xml_envio?: string | null
          xml_retorno?: string | null
        }
        Update: {
          assinatura_xml?: string | null
          competencia?: string | null
          created_at?: string
          dados?: Json | null
          data_envio?: string | null
          data_processamento?: string | null
          empresa_id?: string | null
          erros?: Json | null
          hash_arquivo?: string | null
          hash_seguranca?: string | null
          id?: string
          id_recibo?: string | null
          protocolo?: string | null
          proxima_tentativa?: string | null
          recibo?: string | null
          status?: string | null
          tentativas_envio?: number | null
          tipo_evento?: string
          updated_at?: string
          xml?: string | null
          xml_envio?: string | null
          xml_retorno?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "esocial_eventos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_esocial_eventos_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      esocial_lotes: {
        Row: {
          ambiente: string | null
          created_at: string
          empresa_id: string | null
          eventos: Json | null
          id: string
          progresso: number | null
          protocolo: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          ambiente?: string | null
          created_at?: string
          empresa_id?: string | null
          eventos?: Json | null
          id?: string
          progresso?: number | null
          protocolo?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          ambiente?: string | null
          created_at?: string
          empresa_id?: string | null
          eventos?: Json | null
          id?: string
          progresso?: number | null
          protocolo?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "esocial_lotes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_esocial_lotes_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      esocial_transmissao_logs: {
        Row: {
          created_at: string | null
          duracao_ms: number | null
          empresa_id: string
          error_details: Json | null
          evento_id: string | null
          id: string
          request_xml: string | null
          response_xml: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          duracao_ms?: number | null
          empresa_id: string
          error_details?: Json | null
          evento_id?: string | null
          id?: string
          request_xml?: string | null
          response_xml?: string | null
          status: string
        }
        Update: {
          created_at?: string | null
          duracao_ms?: number | null
          empresa_id?: string
          error_details?: Json | null
          evento_id?: string | null
          id?: string
          request_xml?: string | null
          response_xml?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "esocial_transmissao_logs_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "esocial_eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      etnias: {
        Row: {
          codigo_esocial: number | null
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          codigo_esocial?: number | null
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          codigo_esocial?: number | null
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      eventos_variaveis: {
        Row: {
          colaborador_id: string
          competencia: string
          created_at: string
          created_by: string | null
          empresa_id: string | null
          id: string
          observacao: string | null
          origem_ferias_id: string | null
          referencia: number | null
          rubrica_id: string
          valor: number
        }
        Insert: {
          colaborador_id: string
          competencia: string
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: string
          observacao?: string | null
          origem_ferias_id?: string | null
          referencia?: number | null
          rubrica_id: string
          valor: number
        }
        Update: {
          colaborador_id?: string
          competencia?: string
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: string
          observacao?: string | null
          origem_ferias_id?: string | null
          referencia?: number | null
          rubrica_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "eventos_variaveis_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_variaveis_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_variaveis_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_variaveis_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "eventos_variaveis_origem_ferias_id_fkey"
            columns: ["origem_ferias_id"]
            isOneToOne: false
            referencedRelation: "ferias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_variaveis_origem_ferias_id_fkey"
            columns: ["origem_ferias_id"]
            isOneToOne: false
            referencedRelation: "v_ferias_adiant13_elegibilidade"
            referencedColumns: ["ferias_id"]
          },
          {
            foreignKeyName: "eventos_variaveis_origem_ferias_id_fkey"
            columns: ["origem_ferias_id"]
            isOneToOne: false
            referencedRelation: "v_ferias_alerta_pagamento_d2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_variaveis_origem_ferias_id_fkey"
            columns: ["origem_ferias_id"]
            isOneToOne: false
            referencedRelation: "v_ferias_folha_reconciliacao"
            referencedColumns: ["ferias_id"]
          },
          {
            foreignKeyName: "eventos_variaveis_origem_ferias_id_fkey"
            columns: ["origem_ferias_id"]
            isOneToOne: false
            referencedRelation: "vw_ferias_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_variaveis_rubrica_id_fkey"
            columns: ["rubrica_id"]
            isOneToOne: false
            referencedRelation: "rubricas_folha"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_eventos_variaveis_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_eventos_variaveis_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_eventos_variaveis_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_eventos_variaveis_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      exames: {
        Row: {
          colaborador_id: string | null
          created_at: string
          crm: string | null
          data_exame: string | null
          data_validade: string | null
          id: string
          medico: string | null
          observacoes: string | null
          resultado: string | null
          tipo: string
        }
        Insert: {
          colaborador_id?: string | null
          created_at?: string
          crm?: string | null
          data_exame?: string | null
          data_validade?: string | null
          id?: string
          medico?: string | null
          observacoes?: string | null
          resultado?: string | null
          tipo: string
        }
        Update: {
          colaborador_id?: string | null
          created_at?: string
          crm?: string | null
          data_exame?: string | null
          data_validade?: string | null
          id?: string
          medico?: string | null
          observacoes?: string | null
          resultado?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "exames_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exames_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exames_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exames_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_exames_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_exames_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_exames_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_exames_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      exames_agendamentos: {
        Row: {
          aso_id: string | null
          clinica_id: string
          colaborador_id: string
          colaborador_lat: number | null
          colaborador_lng: number | null
          created_at: string
          criado_por: string | null
          data_agendada: string
          distancia_km: number | null
          empresa_id: string
          id: string
          observacoes: string | null
          status: string
          tipo_exame: string
          updated_at: string
        }
        Insert: {
          aso_id?: string | null
          clinica_id: string
          colaborador_id: string
          colaborador_lat?: number | null
          colaborador_lng?: number | null
          created_at?: string
          criado_por?: string | null
          data_agendada: string
          distancia_km?: number | null
          empresa_id: string
          id?: string
          observacoes?: string | null
          status?: string
          tipo_exame: string
          updated_at?: string
        }
        Update: {
          aso_id?: string | null
          clinica_id?: string
          colaborador_id?: string
          colaborador_lat?: number | null
          colaborador_lng?: number | null
          created_at?: string
          criado_por?: string | null
          data_agendada?: string
          distancia_km?: number | null
          empresa_id?: string
          id?: string
          observacoes?: string | null
          status?: string
          tipo_exame?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exames_agendamentos_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      faltas: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          cid: string | null
          colaborador_id: string
          created_at: string | null
          created_by: string | null
          data: string
          data_fim: string | null
          desconto_aplicado: boolean | null
          dias_total: number | null
          documento_anexo: string | null
          documento_url: string | null
          empresa_id: string | null
          horas_falta: string | null
          id: string
          justificada: boolean | null
          medico_crm: string | null
          medico_nome: string | null
          motivo: string | null
          motivo_afastamento_id: number | null
          motivo_rejeicao: string | null
          rejeitado_em: string | null
          rejeitado_por: string | null
          status: string | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          cid?: string | null
          colaborador_id: string
          created_at?: string | null
          created_by?: string | null
          data: string
          data_fim?: string | null
          desconto_aplicado?: boolean | null
          dias_total?: number | null
          documento_anexo?: string | null
          documento_url?: string | null
          empresa_id?: string | null
          horas_falta?: string | null
          id?: string
          justificada?: boolean | null
          medico_crm?: string | null
          medico_nome?: string | null
          motivo?: string | null
          motivo_afastamento_id?: number | null
          motivo_rejeicao?: string | null
          rejeitado_em?: string | null
          rejeitado_por?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string | null
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          cid?: string | null
          colaborador_id?: string
          created_at?: string | null
          created_by?: string | null
          data?: string
          data_fim?: string | null
          desconto_aplicado?: boolean | null
          dias_total?: number | null
          documento_anexo?: string | null
          documento_url?: string | null
          empresa_id?: string | null
          horas_falta?: string | null
          id?: string
          justificada?: boolean | null
          medico_crm?: string | null
          medico_nome?: string | null
          motivo?: string | null
          motivo_afastamento_id?: number | null
          motivo_rejeicao?: string | null
          rejeitado_em?: string | null
          rejeitado_por?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faltas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faltas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faltas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faltas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "faltas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faltas_motivo_afastamento_id_fkey"
            columns: ["motivo_afastamento_id"]
            isOneToOne: false
            referencedRelation: "motivos_afastamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_faltas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_faltas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_faltas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_faltas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_faltas_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      feedbacks_360: {
        Row: {
          avaliado_id: string | null
          avaliador_id: string | null
          ciclo_id: string | null
          comentarios: string | null
          created_at: string
          empresa_id: string | null
          id: string
          nota_geral: number | null
          performance: number | null
          pontos_fortes: string | null
          pontos_melhoria: string | null
          potencial: number | null
          status: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          avaliado_id?: string | null
          avaliador_id?: string | null
          ciclo_id?: string | null
          comentarios?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          nota_geral?: number | null
          performance?: number | null
          pontos_fortes?: string | null
          pontos_melhoria?: string | null
          potencial?: number | null
          status?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          avaliado_id?: string | null
          avaliador_id?: string | null
          ciclo_id?: string | null
          comentarios?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          nota_geral?: number | null
          performance?: number | null
          pontos_fortes?: string | null
          pontos_melhoria?: string | null
          potencial?: number | null
          status?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_360_avaliado_id_fkey"
            columns: ["avaliado_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_360_avaliado_id_fkey"
            columns: ["avaliado_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_360_avaliado_id_fkey"
            columns: ["avaliado_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_360_avaliado_id_fkey"
            columns: ["avaliado_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "feedbacks_360_avaliador_id_fkey"
            columns: ["avaliador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_360_avaliador_id_fkey"
            columns: ["avaliador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_360_avaliador_id_fkey"
            columns: ["avaliador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_360_avaliador_id_fkey"
            columns: ["avaliador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "feedbacks_360_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_avaliacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_360_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_feedbacks_360_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      feriados: {
        Row: {
          cidade: string | null
          created_at: string
          data: string
          descricao: string
          empresa_id: string | null
          id: string
          tipo: string | null
          uf: string | null
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          data: string
          descricao: string
          empresa_id?: string | null
          id?: string
          tipo?: string | null
          uf?: string | null
        }
        Update: {
          cidade?: string | null
          created_at?: string
          data?: string
          descricao?: string
          empresa_id?: string | null
          id?: string
          tipo?: string | null
          uf?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feriados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_feriados_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ferias: {
        Row: {
          abono_pecuniario: boolean | null
          adiantamento_13: boolean | null
          adiantamento_13_ano_exercicio: number | null
          adiantamento_13_solicitado_em: string | null
          adiantamento_13_solicitado_por: string | null
          adiantamento_13o: boolean | null
          aprovado_em: string | null
          aprovado_gestor: boolean | null
          aprovado_gestor_em: string | null
          aprovado_gestor_por: string | null
          aprovado_por: string | null
          aprovado_rh: boolean | null
          aprovado_rh_em: string | null
          aprovado_rh_por: string | null
          aviso_assinatura_em: string | null
          aviso_assinatura_hash: string | null
          aviso_assinatura_ip: unknown
          aviso_assinatura_por: string | null
          aviso_assinatura_user_agent: string | null
          aviso_gerado_em: string | null
          aviso_pdf_url: string | null
          cancelado: boolean | null
          cancelado_em: string | null
          cancelado_por: string | null
          colaborador_id: string
          created_at: string
          created_by: string | null
          data_fim: string
          data_inicio: string
          data_pagamento: string | null
          descontos_inss: number | null
          descontos_irrf: number | null
          dias_abono: number | null
          dias_gozo: number
          documento_url: string | null
          empresa_id: string | null
          enviado_contabilidade: boolean | null
          enviado_contabilidade_em: string | null
          enviado_contabilidade_por: string | null
          ferias_coletiva_id: string | null
          hash_integridade: string | null
          id: string
          justificativa: string | null
          motivo_cancelamento: string | null
          observacoes: string | null
          pagamento_comprovante_path: string | null
          pagamento_confirmado_em: string | null
          pagamento_confirmado_por: string | null
          pagamento_valor: number | null
          periodo_aquisitivo_fim: string | null
          periodo_aquisitivo_id: string
          periodo_aquisitivo_inicio: string | null
          salario_base: number
          saldo_gasto: number | null
          status: string | null
          status_aprovacao_contabilidade: string | null
          status_aprovacao_gestor: string | null
          status_aprovacao_rh: string | null
          updated_at: string
          valor_abono: number | null
          valor_abono_pecuniario: number | null
          valor_adiantamento_13: number | null
          valor_ferias: number
          valor_liquido: number
          valor_terco: number
          valor_terco_abono: number | null
          valor_total: number
          vender_abono: boolean | null
        }
        Insert: {
          abono_pecuniario?: boolean | null
          adiantamento_13?: boolean | null
          adiantamento_13_ano_exercicio?: number | null
          adiantamento_13_solicitado_em?: string | null
          adiantamento_13_solicitado_por?: string | null
          adiantamento_13o?: boolean | null
          aprovado_em?: string | null
          aprovado_gestor?: boolean | null
          aprovado_gestor_em?: string | null
          aprovado_gestor_por?: string | null
          aprovado_por?: string | null
          aprovado_rh?: boolean | null
          aprovado_rh_em?: string | null
          aprovado_rh_por?: string | null
          aviso_assinatura_em?: string | null
          aviso_assinatura_hash?: string | null
          aviso_assinatura_ip?: unknown
          aviso_assinatura_por?: string | null
          aviso_assinatura_user_agent?: string | null
          aviso_gerado_em?: string | null
          aviso_pdf_url?: string | null
          cancelado?: boolean | null
          cancelado_em?: string | null
          cancelado_por?: string | null
          colaborador_id: string
          created_at?: string
          created_by?: string | null
          data_fim: string
          data_inicio: string
          data_pagamento?: string | null
          descontos_inss?: number | null
          descontos_irrf?: number | null
          dias_abono?: number | null
          dias_gozo: number
          documento_url?: string | null
          empresa_id?: string | null
          enviado_contabilidade?: boolean | null
          enviado_contabilidade_em?: string | null
          enviado_contabilidade_por?: string | null
          ferias_coletiva_id?: string | null
          hash_integridade?: string | null
          id?: string
          justificativa?: string | null
          motivo_cancelamento?: string | null
          observacoes?: string | null
          pagamento_comprovante_path?: string | null
          pagamento_confirmado_em?: string | null
          pagamento_confirmado_por?: string | null
          pagamento_valor?: number | null
          periodo_aquisitivo_fim?: string | null
          periodo_aquisitivo_id: string
          periodo_aquisitivo_inicio?: string | null
          salario_base: number
          saldo_gasto?: number | null
          status?: string | null
          status_aprovacao_contabilidade?: string | null
          status_aprovacao_gestor?: string | null
          status_aprovacao_rh?: string | null
          updated_at?: string
          valor_abono?: number | null
          valor_abono_pecuniario?: number | null
          valor_adiantamento_13?: number | null
          valor_ferias: number
          valor_liquido: number
          valor_terco: number
          valor_terco_abono?: number | null
          valor_total: number
          vender_abono?: boolean | null
        }
        Update: {
          abono_pecuniario?: boolean | null
          adiantamento_13?: boolean | null
          adiantamento_13_ano_exercicio?: number | null
          adiantamento_13_solicitado_em?: string | null
          adiantamento_13_solicitado_por?: string | null
          adiantamento_13o?: boolean | null
          aprovado_em?: string | null
          aprovado_gestor?: boolean | null
          aprovado_gestor_em?: string | null
          aprovado_gestor_por?: string | null
          aprovado_por?: string | null
          aprovado_rh?: boolean | null
          aprovado_rh_em?: string | null
          aprovado_rh_por?: string | null
          aviso_assinatura_em?: string | null
          aviso_assinatura_hash?: string | null
          aviso_assinatura_ip?: unknown
          aviso_assinatura_por?: string | null
          aviso_assinatura_user_agent?: string | null
          aviso_gerado_em?: string | null
          aviso_pdf_url?: string | null
          cancelado?: boolean | null
          cancelado_em?: string | null
          cancelado_por?: string | null
          colaborador_id?: string
          created_at?: string
          created_by?: string | null
          data_fim?: string
          data_inicio?: string
          data_pagamento?: string | null
          descontos_inss?: number | null
          descontos_irrf?: number | null
          dias_abono?: number | null
          dias_gozo?: number
          documento_url?: string | null
          empresa_id?: string | null
          enviado_contabilidade?: boolean | null
          enviado_contabilidade_em?: string | null
          enviado_contabilidade_por?: string | null
          ferias_coletiva_id?: string | null
          hash_integridade?: string | null
          id?: string
          justificativa?: string | null
          motivo_cancelamento?: string | null
          observacoes?: string | null
          pagamento_comprovante_path?: string | null
          pagamento_confirmado_em?: string | null
          pagamento_confirmado_por?: string | null
          pagamento_valor?: number | null
          periodo_aquisitivo_fim?: string | null
          periodo_aquisitivo_id?: string
          periodo_aquisitivo_inicio?: string | null
          salario_base?: number
          saldo_gasto?: number | null
          status?: string | null
          status_aprovacao_contabilidade?: string | null
          status_aprovacao_gestor?: string | null
          status_aprovacao_rh?: string | null
          updated_at?: string
          valor_abono?: number | null
          valor_abono_pecuniario?: number | null
          valor_adiantamento_13?: number | null
          valor_ferias?: number
          valor_liquido?: number
          valor_terco?: number
          valor_terco_abono?: number | null
          valor_total?: number
          vender_abono?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ferias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "ferias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_periodo_aquisitivo_id_fkey"
            columns: ["periodo_aquisitivo_id"]
            isOneToOne: false
            referencedRelation: "periodos_aquisitivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ferias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ferias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ferias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ferias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_ferias_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ferias_aprovacoes: {
        Row: {
          aprovador_id: string | null
          created_at: string | null
          data_acao: string | null
          ferias_id: string
          id: string
          observacoes: string | null
          status: string | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          aprovador_id?: string | null
          created_at?: string | null
          data_acao?: string | null
          ferias_id: string
          id?: string
          observacoes?: string | null
          status?: string | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          aprovador_id?: string | null
          created_at?: string | null
          data_acao?: string | null
          ferias_id?: string
          id?: string
          observacoes?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ferias_aprovacoes_ferias_id_fkey"
            columns: ["ferias_id"]
            isOneToOne: false
            referencedRelation: "ferias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_aprovacoes_ferias_id_fkey"
            columns: ["ferias_id"]
            isOneToOne: false
            referencedRelation: "v_ferias_adiant13_elegibilidade"
            referencedColumns: ["ferias_id"]
          },
          {
            foreignKeyName: "ferias_aprovacoes_ferias_id_fkey"
            columns: ["ferias_id"]
            isOneToOne: false
            referencedRelation: "v_ferias_alerta_pagamento_d2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_aprovacoes_ferias_id_fkey"
            columns: ["ferias_id"]
            isOneToOne: false
            referencedRelation: "v_ferias_folha_reconciliacao"
            referencedColumns: ["ferias_id"]
          },
          {
            foreignKeyName: "ferias_aprovacoes_ferias_id_fkey"
            columns: ["ferias_id"]
            isOneToOne: false
            referencedRelation: "vw_ferias_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      ferias_aprovacoes_log: {
        Row: {
          aprovador_id: string | null
          created_at: string | null
          ferias_id: string | null
          id: string
          nivel: string
          observacao: string | null
          status: string
        }
        Insert: {
          aprovador_id?: string | null
          created_at?: string | null
          ferias_id?: string | null
          id?: string
          nivel: string
          observacao?: string | null
          status: string
        }
        Update: {
          aprovador_id?: string | null
          created_at?: string | null
          ferias_id?: string | null
          id?: string
          nivel?: string
          observacao?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ferias_aprovacoes_log_ferias_id_fkey"
            columns: ["ferias_id"]
            isOneToOne: false
            referencedRelation: "ferias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_aprovacoes_log_ferias_id_fkey"
            columns: ["ferias_id"]
            isOneToOne: false
            referencedRelation: "v_ferias_adiant13_elegibilidade"
            referencedColumns: ["ferias_id"]
          },
          {
            foreignKeyName: "ferias_aprovacoes_log_ferias_id_fkey"
            columns: ["ferias_id"]
            isOneToOne: false
            referencedRelation: "v_ferias_alerta_pagamento_d2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_aprovacoes_log_ferias_id_fkey"
            columns: ["ferias_id"]
            isOneToOne: false
            referencedRelation: "v_ferias_folha_reconciliacao"
            referencedColumns: ["ferias_id"]
          },
          {
            foreignKeyName: "ferias_aprovacoes_log_ferias_id_fkey"
            columns: ["ferias_id"]
            isOneToOne: false
            referencedRelation: "vw_ferias_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      ferias_arquivos: {
        Row: {
          arquivo_url: string | null
          assinavel: boolean | null
          created_at: string | null
          ferias_id: string
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          arquivo_url?: string | null
          assinavel?: boolean | null
          created_at?: string | null
          ferias_id: string
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          arquivo_url?: string | null
          assinavel?: boolean | null
          created_at?: string | null
          ferias_id?: string
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ferias_arquivos_ferias_id_fkey"
            columns: ["ferias_id"]
            isOneToOne: false
            referencedRelation: "ferias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_arquivos_ferias_id_fkey"
            columns: ["ferias_id"]
            isOneToOne: false
            referencedRelation: "v_ferias_adiant13_elegibilidade"
            referencedColumns: ["ferias_id"]
          },
          {
            foreignKeyName: "ferias_arquivos_ferias_id_fkey"
            columns: ["ferias_id"]
            isOneToOne: false
            referencedRelation: "v_ferias_alerta_pagamento_d2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_arquivos_ferias_id_fkey"
            columns: ["ferias_id"]
            isOneToOne: false
            referencedRelation: "v_ferias_folha_reconciliacao"
            referencedColumns: ["ferias_id"]
          },
          {
            foreignKeyName: "ferias_arquivos_ferias_id_fkey"
            columns: ["ferias_id"]
            isOneToOne: false
            referencedRelation: "vw_ferias_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      ferias_audit_log: {
        Row: {
          acao: string
          created_at: string | null
          dados_anteriores: Json | null
          dados_novos: Json | null
          empresa_id: string | null
          entidade_id: string
          entidade_tipo: string
          id: string
          metadata: Json | null
          usuario_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          empresa_id?: string | null
          entidade_id: string
          entidade_tipo: string
          id?: string
          metadata?: Json | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          empresa_id?: string | null
          entidade_id?: string
          entidade_tipo?: string
          id?: string
          metadata?: Json | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ferias_audit_log_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ferias_coletivas: {
        Row: {
          aprovado_por: string | null
          comunicado_gerado_em: string | null
          comunicado_gerado_por: string | null
          comunicado_mte_hash: string | null
          comunicado_mte_path: string | null
          comunicado_sindicato_hash: string | null
          comunicado_sindicato_nome: string | null
          comunicado_sindicato_path: string | null
          created_at: string
          created_by: string | null
          data_fim: string
          data_inicio: string
          departamentos: string[] | null
          dias: number
          empresa_id: string
          id: string
          justificativa: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          aprovado_por?: string | null
          comunicado_gerado_em?: string | null
          comunicado_gerado_por?: string | null
          comunicado_mte_hash?: string | null
          comunicado_mte_path?: string | null
          comunicado_sindicato_hash?: string | null
          comunicado_sindicato_nome?: string | null
          comunicado_sindicato_path?: string | null
          created_at?: string
          created_by?: string | null
          data_fim: string
          data_inicio: string
          departamentos?: string[] | null
          dias: number
          empresa_id: string
          id?: string
          justificativa?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          aprovado_por?: string | null
          comunicado_gerado_em?: string | null
          comunicado_gerado_por?: string | null
          comunicado_mte_hash?: string | null
          comunicado_mte_path?: string | null
          comunicado_sindicato_hash?: string | null
          comunicado_sindicato_nome?: string | null
          comunicado_sindicato_path?: string | null
          created_at?: string
          created_by?: string | null
          data_fim?: string
          data_inicio?: string
          departamentos?: string[] | null
          dias?: number
          empresa_id?: string
          id?: string
          justificativa?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ferias_coletivas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ferias_coletivas_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ferias_programacao: {
        Row: {
          ano: number
          aprovado_gestor_em: string | null
          aprovado_gestor_por: string | null
          aprovado_rh_em: string | null
          aprovado_rh_por: string | null
          colaborador_id: string
          created_at: string
          criado_por: string | null
          data_fim_prevista: string | null
          data_inicio_prevista: string | null
          dias_previstos: number
          empresa_id: string
          ferias_id: string | null
          id: string
          mes_previsto: number
          observacoes: string | null
          periodo_aquisitivo_id: string | null
          rejeitado_em: string | null
          rejeitado_motivo: string | null
          rejeitado_por: string | null
          status: Database["public"]["Enums"]["programacao_ferias_status"]
          updated_at: string
        }
        Insert: {
          ano: number
          aprovado_gestor_em?: string | null
          aprovado_gestor_por?: string | null
          aprovado_rh_em?: string | null
          aprovado_rh_por?: string | null
          colaborador_id: string
          created_at?: string
          criado_por?: string | null
          data_fim_prevista?: string | null
          data_inicio_prevista?: string | null
          dias_previstos?: number
          empresa_id: string
          ferias_id?: string | null
          id?: string
          mes_previsto: number
          observacoes?: string | null
          periodo_aquisitivo_id?: string | null
          rejeitado_em?: string | null
          rejeitado_motivo?: string | null
          rejeitado_por?: string | null
          status?: Database["public"]["Enums"]["programacao_ferias_status"]
          updated_at?: string
        }
        Update: {
          ano?: number
          aprovado_gestor_em?: string | null
          aprovado_gestor_por?: string | null
          aprovado_rh_em?: string | null
          aprovado_rh_por?: string | null
          colaborador_id?: string
          created_at?: string
          criado_por?: string | null
          data_fim_prevista?: string | null
          data_inicio_prevista?: string | null
          dias_previstos?: number
          empresa_id?: string
          ferias_id?: string | null
          id?: string
          mes_previsto?: number
          observacoes?: string | null
          periodo_aquisitivo_id?: string | null
          rejeitado_em?: string | null
          rejeitado_motivo?: string | null
          rejeitado_por?: string | null
          status?: Database["public"]["Enums"]["programacao_ferias_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ferias_programacao_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_programacao_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_programacao_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_programacao_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "ferias_programacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_programacao_ferias_id_fkey"
            columns: ["ferias_id"]
            isOneToOne: false
            referencedRelation: "ferias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_programacao_ferias_id_fkey"
            columns: ["ferias_id"]
            isOneToOne: false
            referencedRelation: "v_ferias_adiant13_elegibilidade"
            referencedColumns: ["ferias_id"]
          },
          {
            foreignKeyName: "ferias_programacao_ferias_id_fkey"
            columns: ["ferias_id"]
            isOneToOne: false
            referencedRelation: "v_ferias_alerta_pagamento_d2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_programacao_ferias_id_fkey"
            columns: ["ferias_id"]
            isOneToOne: false
            referencedRelation: "v_ferias_folha_reconciliacao"
            referencedColumns: ["ferias_id"]
          },
          {
            foreignKeyName: "ferias_programacao_ferias_id_fkey"
            columns: ["ferias_id"]
            isOneToOne: false
            referencedRelation: "vw_ferias_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_programacao_periodo_aquisitivo_id_fkey"
            columns: ["periodo_aquisitivo_id"]
            isOneToOne: false
            referencedRelation: "periodos_aquisitivos"
            referencedColumns: ["id"]
          },
        ]
      }
      ferias_reconciliacao_logs: {
        Row: {
          corrigidas: number
          detalhes: Json
          duracao_ms: number
          empresa_id: string | null
          executado_em: string
          id: string
          restantes: number
          verificadas: number
        }
        Insert: {
          corrigidas?: number
          detalhes?: Json
          duracao_ms?: number
          empresa_id?: string | null
          executado_em?: string
          id?: string
          restantes?: number
          verificadas?: number
        }
        Update: {
          corrigidas?: number
          detalhes?: Json
          duracao_ms?: number
          empresa_id?: string | null
          executado_em?: string
          id?: string
          restantes?: number
          verificadas?: number
        }
        Relationships: [
          {
            foreignKeyName: "ferias_reconciliacao_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ferias_solicitacoes: {
        Row: {
          abono_pecuniario: boolean | null
          aprovado_em: string | null
          aprovado_por: string | null
          colaborador_id: string | null
          created_at: string
          data_fim: string
          data_inicio: string
          dias: number | null
          empresa_id: string | null
          id: string
          observacoes: string | null
          status: string | null
        }
        Insert: {
          abono_pecuniario?: boolean | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          colaborador_id?: string | null
          created_at?: string
          data_fim: string
          data_inicio: string
          dias?: number | null
          empresa_id?: string | null
          id?: string
          observacoes?: string | null
          status?: string | null
        }
        Update: {
          abono_pecuniario?: boolean | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          colaborador_id?: string | null
          created_at?: string
          data_fim?: string
          data_inicio?: string
          dias?: number | null
          empresa_id?: string | null
          id?: string
          observacoes?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ferias_solicitacoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_solicitacoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_solicitacoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_solicitacoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "ferias_solicitacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ferias_solicitacoes_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ferias_solicitacoes_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ferias_solicitacoes_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ferias_solicitacoes_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_ferias_solicitacoes_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      fgts_digital_logs: {
        Row: {
          acao: string
          created_at: string | null
          empresa_id: string
          guia_id: string | null
          id: string
          request_payload: Json | null
          response_payload: Json | null
        }
        Insert: {
          acao: string
          created_at?: string | null
          empresa_id: string
          guia_id?: string | null
          id?: string
          request_payload?: Json | null
          response_payload?: Json | null
        }
        Update: {
          acao?: string
          created_at?: string | null
          empresa_id?: string
          guia_id?: string | null
          id?: string
          request_payload?: Json | null
          response_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fgts_digital_logs_guia_id_fkey"
            columns: ["guia_id"]
            isOneToOne: false
            referencedRelation: "guias_fgts_digital"
            referencedColumns: ["id"]
          },
        ]
      }
      fila_notificacoes: {
        Row: {
          conteudo: string
          created_at: string | null
          erro_ultimo: string | null
          id: string
          metadados: Json | null
          scheduled_for: string | null
          status: string | null
          tentativas: number | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          conteudo: string
          created_at?: string | null
          erro_ultimo?: string | null
          id?: string
          metadados?: Json | null
          scheduled_for?: string | null
          status?: string | null
          tentativas?: number | null
          tipo: string
          titulo: string
          user_id: string
        }
        Update: {
          conteudo?: string
          created_at?: string | null
          erro_ultimo?: string | null
          id?: string
          metadados?: Json | null
          scheduled_for?: string | null
          status?: string | null
          tentativas?: number | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      fila_processamento: {
        Row: {
          created_at: string | null
          dlq: boolean
          dlq_movido_em: string | null
          empresa_id: string | null
          erro_log: string | null
          id: string
          max_tentativas: number
          payload: Json | null
          progresso: number | null
          proxima_tentativa_em: string | null
          resultado: Json | null
          status: string
          tentativas: number
          tipo_tarefa: string
          ultimo_erro: string | null
          updated_at: string | null
          usuario_id: string | null
        }
        Insert: {
          created_at?: string | null
          dlq?: boolean
          dlq_movido_em?: string | null
          empresa_id?: string | null
          erro_log?: string | null
          id?: string
          max_tentativas?: number
          payload?: Json | null
          progresso?: number | null
          proxima_tentativa_em?: string | null
          resultado?: Json | null
          status?: string
          tentativas?: number
          tipo_tarefa: string
          ultimo_erro?: string | null
          updated_at?: string | null
          usuario_id?: string | null
        }
        Update: {
          created_at?: string | null
          dlq?: boolean
          dlq_movido_em?: string | null
          empresa_id?: string | null
          erro_log?: string | null
          id?: string
          max_tentativas?: number
          payload?: Json | null
          progresso?: number | null
          proxima_tentativa_em?: string | null
          resultado?: Json | null
          status?: string
          tentativas?: number
          tipo_tarefa?: string
          ultimo_erro?: string | null
          updated_at?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      folha_assinaturas: {
        Row: {
          assinante_id: string | null
          cargo_assinante: string | null
          created_at: string | null
          data_assinatura: string | null
          folha_id: string | null
          hash_documento: string | null
          id: string
          ip_assinatura: string | null
          status: string | null
        }
        Insert: {
          assinante_id?: string | null
          cargo_assinante?: string | null
          created_at?: string | null
          data_assinatura?: string | null
          folha_id?: string | null
          hash_documento?: string | null
          id?: string
          ip_assinatura?: string | null
          status?: string | null
        }
        Update: {
          assinante_id?: string | null
          cargo_assinante?: string | null
          created_at?: string | null
          data_assinatura?: string | null
          folha_id?: string | null
          hash_documento?: string | null
          id?: string
          ip_assinatura?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folha_assinaturas_folha_id_fkey"
            columns: ["folha_id"]
            isOneToOne: false
            referencedRelation: "folhas_pagamento"
            referencedColumns: ["id"]
          },
        ]
      }
      folha_auditoria: {
        Row: {
          colaborador_id: string | null
          created_at: string
          criado_por: string | null
          detalhes: Json | null
          folha_id: string | null
          id: string
          mensagem: string
          severidade: string
          tipo_evento: string
        }
        Insert: {
          colaborador_id?: string | null
          created_at?: string
          criado_por?: string | null
          detalhes?: Json | null
          folha_id?: string | null
          id?: string
          mensagem: string
          severidade?: string
          tipo_evento: string
        }
        Update: {
          colaborador_id?: string | null
          created_at?: string
          criado_por?: string | null
          detalhes?: Json | null
          folha_id?: string | null
          id?: string
          mensagem?: string
          severidade?: string
          tipo_evento?: string
        }
        Relationships: [
          {
            foreignKeyName: "folha_auditoria_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folha_auditoria_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folha_auditoria_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folha_auditoria_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "folha_auditoria_folha_id_fkey"
            columns: ["folha_id"]
            isOneToOne: false
            referencedRelation: "folhas_pagamento"
            referencedColumns: ["id"]
          },
        ]
      }
      folha_eventos_auditoria: {
        Row: {
          created_at: string | null
          detalhes: Json | null
          folha_id: string | null
          id: string
          tipo_evento: string | null
          usuario_id: string | null
        }
        Insert: {
          created_at?: string | null
          detalhes?: Json | null
          folha_id?: string | null
          id?: string
          tipo_evento?: string | null
          usuario_id?: string | null
        }
        Update: {
          created_at?: string | null
          detalhes?: Json | null
          folha_id?: string | null
          id?: string
          tipo_evento?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folha_eventos_auditoria_folha_id_fkey"
            columns: ["folha_id"]
            isOneToOne: false
            referencedRelation: "folhas_pagamento"
            referencedColumns: ["id"]
          },
        ]
      }
      folha_itens: {
        Row: {
          colaborador_id: string
          created_at: string | null
          detalhes: Json | null
          fgts_mes: number | null
          folha_id: string
          id: string
          inss_mes: number | null
          irrf_mes: number | null
          salario_base: number | null
          status_pagamento: string | null
          total_descontos: number | null
          total_liquido: number | null
          total_proventos: number | null
        }
        Insert: {
          colaborador_id: string
          created_at?: string | null
          detalhes?: Json | null
          fgts_mes?: number | null
          folha_id: string
          id?: string
          inss_mes?: number | null
          irrf_mes?: number | null
          salario_base?: number | null
          status_pagamento?: string | null
          total_descontos?: number | null
          total_liquido?: number | null
          total_proventos?: number | null
        }
        Update: {
          colaborador_id?: string
          created_at?: string | null
          detalhes?: Json | null
          fgts_mes?: number | null
          folha_id?: string
          id?: string
          inss_mes?: number | null
          irrf_mes?: number | null
          salario_base?: number | null
          status_pagamento?: string | null
          total_descontos?: number | null
          total_liquido?: number | null
          total_proventos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "folha_itens_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folha_itens_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folha_itens_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folha_itens_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "folha_itens_folha_id_fkey"
            columns: ["folha_id"]
            isOneToOne: false
            referencedRelation: "folhas_pagamento"
            referencedColumns: ["id"]
          },
        ]
      }
      folha_lock_conflicts: {
        Row: {
          competencia: string | null
          created_at: string
          empresa_id: string | null
          folha_id: string
          id: string
          user_id: string | null
          version_atual: number
          version_esperada: number
        }
        Insert: {
          competencia?: string | null
          created_at?: string
          empresa_id?: string | null
          folha_id: string
          id?: string
          user_id?: string | null
          version_atual: number
          version_esperada: number
        }
        Update: {
          competencia?: string | null
          created_at?: string
          empresa_id?: string | null
          folha_id?: string
          id?: string
          user_id?: string | null
          version_atual?: number
          version_esperada?: number
        }
        Relationships: []
      }
      folhas_pagamento: {
        Row: {
          alerta_calculo: Json | null
          competencia: string
          created_at: string
          created_by: string | null
          data_calculo: string | null
          data_fechamento: string | null
          data_pagamento: string | null
          empresa_id: string | null
          esocial_status: string
          fechada_por: string | null
          hash_integridade: string | null
          id: string
          motivo_reabertura: string | null
          observacoes: string | null
          reaberta_em: string | null
          reaberta_por: string | null
          status: Database["public"]["Enums"]["status_folha"]
          tipo: string
          total_colaboradores: number | null
          total_descontos: number | null
          total_fgts: number | null
          total_inss_patronal: number | null
          total_liquido: number | null
          total_proventos: number | null
          updated_at: string
          version: number
        }
        Insert: {
          alerta_calculo?: Json | null
          competencia: string
          created_at?: string
          created_by?: string | null
          data_calculo?: string | null
          data_fechamento?: string | null
          data_pagamento?: string | null
          empresa_id?: string | null
          esocial_status?: string
          fechada_por?: string | null
          hash_integridade?: string | null
          id?: string
          motivo_reabertura?: string | null
          observacoes?: string | null
          reaberta_em?: string | null
          reaberta_por?: string | null
          status?: Database["public"]["Enums"]["status_folha"]
          tipo?: string
          total_colaboradores?: number | null
          total_descontos?: number | null
          total_fgts?: number | null
          total_inss_patronal?: number | null
          total_liquido?: number | null
          total_proventos?: number | null
          updated_at?: string
          version?: number
        }
        Update: {
          alerta_calculo?: Json | null
          competencia?: string
          created_at?: string
          created_by?: string | null
          data_calculo?: string | null
          data_fechamento?: string | null
          data_pagamento?: string | null
          empresa_id?: string | null
          esocial_status?: string
          fechada_por?: string | null
          hash_integridade?: string | null
          id?: string
          motivo_reabertura?: string | null
          observacoes?: string | null
          reaberta_em?: string | null
          reaberta_por?: string | null
          status?: Database["public"]["Enums"]["status_folha"]
          tipo?: string
          total_colaboradores?: number | null
          total_descontos?: number | null
          total_fgts?: number | null
          total_inss_patronal?: number | null
          total_liquido?: number | null
          total_proventos?: number | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_folhas_pagamento_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folhas_pagamento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      formacoes_academicas: {
        Row: {
          ano_conclusao: number | null
          colaborador_id: string
          created_at: string
          curso: string | null
          id: string
          instituicao: string | null
          situacao: string | null
          tipo_escolaridade: string | null
          updated_at: string
        }
        Insert: {
          ano_conclusao?: number | null
          colaborador_id: string
          created_at?: string
          curso?: string | null
          id?: string
          instituicao?: string | null
          situacao?: string | null
          tipo_escolaridade?: string | null
          updated_at?: string
        }
        Update: {
          ano_conclusao?: number | null
          colaborador_id?: string
          created_at?: string
          curso?: string | null
          id?: string
          instituicao?: string | null
          situacao?: string | null
          tipo_escolaridade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_formacoes_academicas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_formacoes_academicas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_formacoes_academicas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_formacoes_academicas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "formacoes_academicas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formacoes_academicas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formacoes_academicas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formacoes_academicas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      generos_documento: {
        Row: {
          codigo_esocial: string | null
          created_at: string | null
          id: number
          nome: string
        }
        Insert: {
          codigo_esocial?: string | null
          created_at?: string | null
          id?: number
          nome: string
        }
        Update: {
          codigo_esocial?: string | null
          created_at?: string | null
          id?: number
          nome?: string
        }
        Relationships: []
      }
      geo_allowed_countries: {
        Row: {
          added_by: string | null
          country_code: string
          country_name: string
          created_at: string | null
          id: string
        }
        Insert: {
          added_by?: string | null
          country_code: string
          country_name: string
          created_at?: string | null
          id?: string
        }
        Update: {
          added_by?: string | null
          country_code?: string
          country_name?: string
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      geo_blocked_attempts: {
        Row: {
          country_code: string | null
          country_name: string | null
          created_at: string | null
          id: string
          ip_address: string
          user_agent: string | null
        }
        Insert: {
          country_code?: string | null
          country_name?: string | null
          created_at?: string | null
          id?: string
          ip_address: string
          user_agent?: string | null
        }
        Update: {
          country_code?: string | null
          country_name?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      geo_blocking_config: {
        Row: {
          block_unknown_countries: boolean | null
          enabled: boolean | null
          id: string
          log_blocked_attempts: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          block_unknown_countries?: boolean | null
          enabled?: boolean | null
          id?: string
          log_blocked_attempts?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          block_unknown_countries?: boolean | null
          enabled?: boolean | null
          id?: string
          log_blocked_attempts?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      govbr_auth_state: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          nonce: string
          redirect_uri: string | null
          state: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          nonce: string
          redirect_uri?: string | null
          state: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          nonce?: string
          redirect_uri?: string | null
          state?: string
        }
        Relationships: []
      }
      guias_fgts: {
        Row: {
          codigo_barras: string | null
          competencia: string
          created_at: string
          data_pagamento: string | null
          data_vencimento: string | null
          empresa_id: string | null
          id: string
          status: string | null
          tipo: string | null
          valor_multa: number | null
          valor_total: number | null
          valor_total_recolher: number | null
        }
        Insert: {
          codigo_barras?: string | null
          competencia: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          empresa_id?: string | null
          id?: string
          status?: string | null
          tipo?: string | null
          valor_multa?: number | null
          valor_total?: number | null
          valor_total_recolher?: number | null
        }
        Update: {
          codigo_barras?: string | null
          competencia?: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          empresa_id?: string | null
          id?: string
          status?: string | null
          tipo?: string | null
          valor_multa?: number | null
          valor_total?: number | null
          valor_total_recolher?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_guias_fgts_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guias_fgts_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      guias_fgts_digital: {
        Row: {
          competencia: string
          created_at: string | null
          empresa_id: string
          gfd_data_geracao: string | null
          gfd_protocolo: string | null
          id: string
          pdf_url: string | null
          qr_code_pix: string | null
          status: string | null
          tipo: string
          updated_at: string | null
          valor_total: number
          vencimento: string
        }
        Insert: {
          competencia: string
          created_at?: string | null
          empresa_id: string
          gfd_data_geracao?: string | null
          gfd_protocolo?: string | null
          id?: string
          pdf_url?: string | null
          qr_code_pix?: string | null
          status?: string | null
          tipo: string
          updated_at?: string | null
          valor_total: number
          vencimento: string
        }
        Update: {
          competencia?: string
          created_at?: string | null
          empresa_id?: string
          gfd_data_geracao?: string | null
          gfd_protocolo?: string | null
          id?: string
          pdf_url?: string | null
          qr_code_pix?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string | null
          valor_total?: number
          vencimento?: string
        }
        Relationships: []
      }
      guias_inss: {
        Row: {
          codigo_barras: string | null
          competencia: string
          created_at: string
          data_pagamento: string | null
          data_vencimento: string | null
          empresa_id: string | null
          id: string
          status: string | null
          tipo: string | null
          valor_empresa: number | null
          valor_segurados: number | null
          valor_total: number | null
        }
        Insert: {
          codigo_barras?: string | null
          competencia: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          empresa_id?: string | null
          id?: string
          status?: string | null
          tipo?: string | null
          valor_empresa?: number | null
          valor_segurados?: number | null
          valor_total?: number | null
        }
        Update: {
          codigo_barras?: string | null
          competencia?: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          empresa_id?: string | null
          id?: string
          status?: string | null
          tipo?: string | null
          valor_empresa?: number | null
          valor_segurados?: number | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_guias_inss_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guias_inss_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_alertas: {
        Row: {
          created_at: string
          id: string
          limite: number
          mensagem: string
          nivel: string
          tipo: string
          valor: number
        }
        Insert: {
          created_at?: string
          id?: string
          limite: number
          mensagem: string
          nivel: string
          tipo: string
          valor: number
        }
        Update: {
          created_at?: string
          id?: string
          limite?: number
          mensagem?: string
          nivel?: string
          tipo?: string
          valor?: number
        }
        Relationships: []
      }
      historico_calculos_folha: {
        Row: {
          created_at: string | null
          criado_por: string | null
          empresa_id: string | null
          folha_id: string | null
          id: string
          snapshot: Json
        }
        Insert: {
          created_at?: string | null
          criado_por?: string | null
          empresa_id?: string | null
          folha_id?: string | null
          id?: string
          snapshot: Json
        }
        Update: {
          created_at?: string | null
          criado_por?: string | null
          empresa_id?: string | null
          folha_id?: string | null
          id?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "historico_calculos_folha_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_calculos_folha_folha_id_fkey"
            columns: ["folha_id"]
            isOneToOne: false
            referencedRelation: "folhas_pagamento"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_cargo: {
        Row: {
          cargo_anterior: string | null
          cargo_novo: string
          colaborador_id: string
          created_at: string
          created_by: string | null
          data_alteracao: string
          id: string
          motivo: string | null
          observacao: string | null
          salario_anterior: number | null
          salario_novo: number
        }
        Insert: {
          cargo_anterior?: string | null
          cargo_novo: string
          colaborador_id: string
          created_at?: string
          created_by?: string | null
          data_alteracao: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          salario_anterior?: number | null
          salario_novo: number
        }
        Update: {
          cargo_anterior?: string | null
          cargo_novo?: string
          colaborador_id?: string
          created_at?: string
          created_by?: string | null
          data_alteracao?: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          salario_anterior?: number | null
          salario_novo?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_historico_cargo_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_historico_cargo_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_historico_cargo_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_historico_cargo_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "historico_cargo_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_cargo_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_cargo_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_cargo_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      historico_contratos: {
        Row: {
          carga_horaria_semanal: number | null
          cargo: string | null
          colaborador_id: string
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_inicio: string
          departamento: string | null
          empresa_id: string | null
          id: string
          motivo_alteracao: string | null
          observacoes: string | null
          salario: number | null
          tipo_contrato: string | null
          updated_at: string
        }
        Insert: {
          carga_horaria_semanal?: number | null
          cargo?: string | null
          colaborador_id: string
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio: string
          departamento?: string | null
          empresa_id?: string | null
          id?: string
          motivo_alteracao?: string | null
          observacoes?: string | null
          salario?: number | null
          tipo_contrato?: string | null
          updated_at?: string
        }
        Update: {
          carga_horaria_semanal?: number | null
          cargo?: string | null
          colaborador_id?: string
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string
          departamento?: string | null
          empresa_id?: string | null
          id?: string
          motivo_alteracao?: string | null
          observacoes?: string | null
          salario?: number | null
          tipo_contrato?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_historico_contratos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_historico_contratos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_historico_contratos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_historico_contratos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_historico_contratos_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_contratos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_contratos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_contratos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_contratos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "historico_contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_ferias: {
        Row: {
          created_at: string
          created_by: string | null
          ferias_id: string
          id: string
          observacao: string | null
          status_anterior: string | null
          status_novo: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ferias_id: string
          id?: string
          observacao?: string | null
          status_anterior?: string | null
          status_novo: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ferias_id?: string
          id?: string
          observacao?: string | null
          status_anterior?: string | null
          status_novo?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_ferias_ferias_id_fkey"
            columns: ["ferias_id"]
            isOneToOne: false
            referencedRelation: "ferias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_ferias_ferias_id_fkey"
            columns: ["ferias_id"]
            isOneToOne: false
            referencedRelation: "v_ferias_adiant13_elegibilidade"
            referencedColumns: ["ferias_id"]
          },
          {
            foreignKeyName: "historico_ferias_ferias_id_fkey"
            columns: ["ferias_id"]
            isOneToOne: false
            referencedRelation: "v_ferias_alerta_pagamento_d2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_ferias_ferias_id_fkey"
            columns: ["ferias_id"]
            isOneToOne: false
            referencedRelation: "v_ferias_folha_reconciliacao"
            referencedColumns: ["ferias_id"]
          },
          {
            foreignKeyName: "historico_ferias_ferias_id_fkey"
            columns: ["ferias_id"]
            isOneToOne: false
            referencedRelation: "vw_ferias_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_rescisoes: {
        Row: {
          aviso_trabalhado: boolean | null
          cargo: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          data_admissao: string
          data_desligamento: string
          empresa_id: string | null
          ferias_vencidas: boolean | null
          id: string
          nome_colaborador: string | null
          resultado: Json | null
          salario: number
          saldo_fgts: number | null
          tipo_rescisao: string
          total_descontos: number | null
          total_liquido: number | null
          total_proventos: number | null
        }
        Insert: {
          aviso_trabalhado?: boolean | null
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_admissao: string
          data_desligamento: string
          empresa_id?: string | null
          ferias_vencidas?: boolean | null
          id?: string
          nome_colaborador?: string | null
          resultado?: Json | null
          salario: number
          saldo_fgts?: number | null
          tipo_rescisao: string
          total_descontos?: number | null
          total_liquido?: number | null
          total_proventos?: number | null
        }
        Update: {
          aviso_trabalhado?: boolean | null
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_admissao?: string
          data_desligamento?: string
          empresa_id?: string | null
          ferias_vencidas?: boolean | null
          id?: string
          nome_colaborador?: string | null
          resultado?: Json | null
          salario?: number
          saldo_fgts?: number | null
          tipo_rescisao?: string
          total_descontos?: number | null
          total_liquido?: number | null
          total_proventos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_rescisoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_salarial: {
        Row: {
          ativo: boolean | null
          cargo_anterior: string | null
          cargo_novo: string | null
          colaborador_id: string
          created_at: string
          created_by: string | null
          data_vigencia: string
          departamento_anterior: string | null
          departamento_novo: string | null
          descricao: string | null
          empresa_id: string | null
          id: string
          motivo: string
          salario_anterior: number | null
          salario_novo: number
          updated_at: string
          vinculo_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          cargo_anterior?: string | null
          cargo_novo?: string | null
          colaborador_id: string
          created_at?: string
          created_by?: string | null
          data_vigencia: string
          departamento_anterior?: string | null
          departamento_novo?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          motivo: string
          salario_anterior?: number | null
          salario_novo: number
          updated_at?: string
          vinculo_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          cargo_anterior?: string | null
          cargo_novo?: string | null
          colaborador_id?: string
          created_at?: string
          created_by?: string | null
          data_vigencia?: string
          departamento_anterior?: string | null
          departamento_novo?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          motivo?: string
          salario_anterior?: number | null
          salario_novo?: number
          updated_at?: string
          vinculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_historico_salarial_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_historico_salarial_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_historico_salarial_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_historico_salarial_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_historico_salarial_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_salarial_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_salarial_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_salarial_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_salarial_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "historico_salarial_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      holerite_distribuicoes: {
        Row: {
          canal: string
          colaborador_id: string
          created_at: string
          distribuido_por: string | null
          erro: string | null
          folha_id: string
          holerite_id: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          canal: string
          colaborador_id: string
          created_at?: string
          distribuido_por?: string | null
          erro?: string | null
          folha_id: string
          holerite_id: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          canal?: string
          colaborador_id?: string
          created_at?: string
          distribuido_por?: string | null
          erro?: string | null
          folha_id?: string
          holerite_id?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "holerite_distribuicoes_folha_id_fkey"
            columns: ["folha_id"]
            isOneToOne: false
            referencedRelation: "folhas_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holerite_distribuicoes_holerite_id_fkey"
            columns: ["holerite_id"]
            isOneToOne: false
            referencedRelation: "holerites"
            referencedColumns: ["id"]
          },
        ]
      }
      holerites: {
        Row: {
          assinado: boolean | null
          base_fgts: number | null
          base_inss: number | null
          base_irrf: number | null
          colaborador_cargo: string
          colaborador_cpf: string
          colaborador_departamento: string
          colaborador_id: string
          colaborador_matricula: string | null
          colaborador_nome: string
          created_at: string
          data_assinatura: string | null
          data_visualizacao: string | null
          dependentes_irrf: number | null
          faltas_dias: number | null
          folha_id: string
          hash_assinatura: string | null
          hash_validacao: string | null
          horas_extras_100: number | null
          horas_extras_50: number | null
          id: string
          ip_visualizacao: string | null
          liquido: number
          salario_base: number
          total_descontos: number
          total_proventos: number
          valor_fgts: number | null
          valor_inss: number | null
          valor_irrf: number | null
        }
        Insert: {
          assinado?: boolean | null
          base_fgts?: number | null
          base_inss?: number | null
          base_irrf?: number | null
          colaborador_cargo: string
          colaborador_cpf: string
          colaborador_departamento: string
          colaborador_id: string
          colaborador_matricula?: string | null
          colaborador_nome: string
          created_at?: string
          data_assinatura?: string | null
          data_visualizacao?: string | null
          dependentes_irrf?: number | null
          faltas_dias?: number | null
          folha_id: string
          hash_assinatura?: string | null
          hash_validacao?: string | null
          horas_extras_100?: number | null
          horas_extras_50?: number | null
          id?: string
          ip_visualizacao?: string | null
          liquido?: number
          salario_base: number
          total_descontos?: number
          total_proventos?: number
          valor_fgts?: number | null
          valor_inss?: number | null
          valor_irrf?: number | null
        }
        Update: {
          assinado?: boolean | null
          base_fgts?: number | null
          base_inss?: number | null
          base_irrf?: number | null
          colaborador_cargo?: string
          colaborador_cpf?: string
          colaborador_departamento?: string
          colaborador_id?: string
          colaborador_matricula?: string | null
          colaborador_nome?: string
          created_at?: string
          data_assinatura?: string | null
          data_visualizacao?: string | null
          dependentes_irrf?: number | null
          faltas_dias?: number | null
          folha_id?: string
          hash_assinatura?: string | null
          hash_validacao?: string | null
          horas_extras_100?: number | null
          horas_extras_50?: number | null
          id?: string
          ip_visualizacao?: string | null
          liquido?: number
          salario_base?: number
          total_descontos?: number
          total_proventos?: number
          valor_fgts?: number | null
          valor_inss?: number | null
          valor_irrf?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_holerites_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_holerites_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_holerites_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_holerites_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "holerites_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holerites_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holerites_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holerites_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "holerites_folha_id_fkey"
            columns: ["folha_id"]
            isOneToOne: false
            referencedRelation: "folhas_pagamento"
            referencedColumns: ["id"]
          },
        ]
      }
      homologacoes_rescisao: {
        Row: {
          created_at: string | null
          data_decisao: string | null
          desligamento_id: string
          etapa: string
          id: string
          parecer: string | null
          status: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string | null
          data_decisao?: string | null
          desligamento_id: string
          etapa: string
          id?: string
          parecer?: string | null
          status?: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string | null
          data_decisao?: string | null
          desligamento_id?: string
          etapa?: string
          id?: string
          parecer?: string | null
          status?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homologacoes_rescisao_desligamento_id_fkey"
            columns: ["desligamento_id"]
            isOneToOne: false
            referencedRelation: "desligamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_provisoes_alertas: {
        Row: {
          created_at: string | null
          descricao: string | null
          empresa_id: string | null
          id: string
          impacto_financeiro_estimado: number | null
          sugestao_acao: string | null
          tipo_alerta: string | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          impacto_financeiro_estimado?: number | null
          sugestao_acao?: string | null
          tipo_alerta?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          impacto_financeiro_estimado?: number | null
          sugestao_acao?: string | null
          tipo_alerta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_provisoes_alertas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      idempotency_keys: {
        Row: {
          completed_at: string | null
          created_at: string
          empresa_id: string | null
          endpoint: string
          expires_at: string
          id: string
          key_hash: string
          request_hash: string
          response_body: Json | null
          response_status: number | null
          status: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          empresa_id?: string | null
          endpoint: string
          expires_at?: string
          id?: string
          key_hash: string
          request_hash: string
          response_body?: Json | null
          response_status?: number | null
          status?: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          empresa_id?: string | null
          endpoint?: string
          expires_at?: string
          id?: string
          key_hash?: string
          request_hash?: string
          response_body?: Json | null
          response_status?: number | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      identidades_genero: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      inscricoes_cursos: {
        Row: {
          certificado_url: string | null
          colaborador_id: string
          created_at: string | null
          curso_id: string
          data_conclusao: string | null
          data_inicio: string | null
          empresa_id: string | null
          id: string
          nota: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          certificado_url?: string | null
          colaborador_id: string
          created_at?: string | null
          curso_id: string
          data_conclusao?: string | null
          data_inicio?: string | null
          empresa_id?: string | null
          id?: string
          nota?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          certificado_url?: string | null
          colaborador_id?: string
          created_at?: string | null
          curso_id?: string
          data_conclusao?: string | null
          data_inicio?: string | null
          empresa_id?: string | null
          id?: string
          nota?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_inscricoes_cursos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_inscricoes_cursos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_inscricoes_cursos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_inscricoes_cursos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_inscricoes_cursos_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricoes_cursos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricoes_cursos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricoes_cursos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricoes_cursos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "inscricoes_cursos_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "catalogo_cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricoes_cursos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      integracao_logs: {
        Row: {
          created_at: string | null
          duracao_ms: number | null
          erro: string | null
          id: string
          operacao: string
          payload_envio: Json | null
          payload_retorno: Json | null
          servico: string
          status_code: number | null
        }
        Insert: {
          created_at?: string | null
          duracao_ms?: number | null
          erro?: string | null
          id?: string
          operacao: string
          payload_envio?: Json | null
          payload_retorno?: Json | null
          servico: string
          status_code?: number | null
        }
        Update: {
          created_at?: string | null
          duracao_ms?: number | null
          erro?: string | null
          id?: string
          operacao?: string
          payload_envio?: Json | null
          payload_retorno?: Json | null
          servico?: string
          status_code?: number | null
        }
        Relationships: []
      }
      integracoes: {
        Row: {
          ativa: boolean | null
          configuracao: Json | null
          created_at: string
          id: string
          nome: string
          status: string | null
          tipo: string
          ultima_sincronizacao: string | null
          updated_at: string
        }
        Insert: {
          ativa?: boolean | null
          configuracao?: Json | null
          created_at?: string
          id?: string
          nome: string
          status?: string | null
          tipo: string
          ultima_sincronizacao?: string | null
          updated_at?: string
        }
        Update: {
          ativa?: boolean | null
          configuracao?: Json | null
          created_at?: string
          id?: string
          nome?: string
          status?: string | null
          tipo?: string
          ultima_sincronizacao?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ip_whitelist: {
        Row: {
          added_by: string | null
          created_at: string | null
          description: string | null
          id: string
          ip_address: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address: string
        }
        Update: {
          added_by?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: string
        }
        Relationships: []
      }
      itens_folha: {
        Row: {
          colaborador_id: string
          created_at: string | null
          folha_id: string
          id: string
          quantidade: number | null
          referencia: string | null
          rubrica_id: string
          valor: number
        }
        Insert: {
          colaborador_id: string
          created_at?: string | null
          folha_id: string
          id?: string
          quantidade?: number | null
          referencia?: string | null
          rubrica_id: string
          valor: number
        }
        Update: {
          colaborador_id?: string
          created_at?: string | null
          folha_id?: string
          id?: string
          quantidade?: number | null
          referencia?: string | null
          rubrica_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_folha_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_folha_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_folha_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_folha_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "itens_folha_folha_id_fkey"
            columns: ["folha_id"]
            isOneToOne: false
            referencedRelation: "folhas_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_folha_rubrica_id_fkey"
            columns: ["rubrica_id"]
            isOneToOne: false
            referencedRelation: "rubricas_folha"
            referencedColumns: ["id"]
          },
        ]
      }
      jornadas: {
        Row: {
          ativa: boolean | null
          carga_horaria_semanal: number | null
          created_at: string
          empresa_id: string | null
          horario_entrada: string | null
          horario_saida: string | null
          id: string
          intervalo_minutos: number | null
          nome: string
          tipo: string | null
          updated_at: string
        }
        Insert: {
          ativa?: boolean | null
          carga_horaria_semanal?: number | null
          created_at?: string
          empresa_id?: string | null
          horario_entrada?: string | null
          horario_saida?: string | null
          id?: string
          intervalo_minutos?: number | null
          nome: string
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          ativa?: boolean | null
          carga_horaria_semanal?: number | null
          created_at?: string
          empresa_id?: string | null
          horario_entrada?: string | null
          horario_saida?: string | null
          id?: string
          intervalo_minutos?: number | null
          nome?: string
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_jornadas_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jornadas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      jornadas_horarios: {
        Row: {
          created_at: string | null
          dia_semana: number
          dia_util: boolean | null
          entrada: string | null
          id: string
          intervalo_fim: string | null
          intervalo_inicio: string | null
          jornada_id: string
          saida: string | null
        }
        Insert: {
          created_at?: string | null
          dia_semana: number
          dia_util?: boolean | null
          entrada?: string | null
          id?: string
          intervalo_fim?: string | null
          intervalo_inicio?: string | null
          jornada_id: string
          saida?: string | null
        }
        Update: {
          created_at?: string | null
          dia_semana?: number
          dia_util?: boolean | null
          entrada?: string | null
          id?: string
          intervalo_fim?: string | null
          intervalo_inicio?: string | null
          jornada_id?: string
          saida?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jornadas_horarios_jornada_id_fkey"
            columns: ["jornada_id"]
            isOneToOne: false
            referencedRelation: "jornadas"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos_contabeis: {
        Row: {
          conta_credito_id: string | null
          conta_debito_id: string | null
          created_at: string | null
          data_lancamento: string
          descricao: string
          empresa_id: string
          folha_id: string | null
          id: string
          origem: string
          status: string
          updated_at: string | null
          valor: number
        }
        Insert: {
          conta_credito_id?: string | null
          conta_debito_id?: string | null
          created_at?: string | null
          data_lancamento: string
          descricao: string
          empresa_id: string
          folha_id?: string | null
          id?: string
          origem?: string
          status?: string
          updated_at?: string | null
          valor: number
        }
        Update: {
          conta_credito_id?: string | null
          conta_debito_id?: string | null
          created_at?: string | null
          data_lancamento?: string
          descricao?: string
          empresa_id?: string
          folha_id?: string | null
          id?: string
          origem?: string
          status?: string
          updated_at?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_contabeis_conta_credito_id_fkey"
            columns: ["conta_credito_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_contabeis_conta_debito_id_fkey"
            columns: ["conta_debito_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_contabeis_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_contabeis_folha_id_fkey"
            columns: ["folha_id"]
            isOneToOne: false
            referencedRelation: "folhas_pagamento"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos_folha: {
        Row: {
          automatico: boolean | null
          created_at: string
          holerite_id: string
          id: string
          referencia: number | null
          rubrica_codigo: string
          rubrica_descricao: string
          rubrica_id: string
          tipo: Database["public"]["Enums"]["tipo_evento_folha"]
          valor: number
        }
        Insert: {
          automatico?: boolean | null
          created_at?: string
          holerite_id: string
          id?: string
          referencia?: number | null
          rubrica_codigo: string
          rubrica_descricao: string
          rubrica_id: string
          tipo: Database["public"]["Enums"]["tipo_evento_folha"]
          valor: number
        }
        Update: {
          automatico?: boolean | null
          created_at?: string
          holerite_id?: string
          id?: string
          referencia?: number | null
          rubrica_codigo?: string
          rubrica_descricao?: string
          rubrica_id?: string
          tipo?: Database["public"]["Enums"]["tipo_evento_folha"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_folha_holerite_id_fkey"
            columns: ["holerite_id"]
            isOneToOne: false
            referencedRelation: "holerites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_folha_rubrica_id_fkey"
            columns: ["rubrica_id"]
            isOneToOne: false
            referencedRelation: "rubricas_folha"
            referencedColumns: ["id"]
          },
        ]
      }
      lgpd_consentimentos: {
        Row: {
          aceito: boolean | null
          aceito_em: string | null
          colaborador_id: string
          created_at: string | null
          empresa_id: string | null
          id: string
          ip_address: string | null
          revogado_em: string | null
          tipo: string
          updated_at: string | null
          versao: string | null
        }
        Insert: {
          aceito?: boolean | null
          aceito_em?: string | null
          colaborador_id: string
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          ip_address?: string | null
          revogado_em?: string | null
          tipo: string
          updated_at?: string | null
          versao?: string | null
        }
        Update: {
          aceito?: boolean | null
          aceito_em?: string | null
          colaborador_id?: string
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          ip_address?: string | null
          revogado_em?: string | null
          tipo?: string
          updated_at?: string | null
          versao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_lgpd_consentimentos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_lgpd_consentimentos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_lgpd_consentimentos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_lgpd_consentimentos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_lgpd_consentimentos_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lgpd_consentimentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lgpd_consentimentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lgpd_consentimentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lgpd_consentimentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "lgpd_consentimentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      lgpd_fila_limpeza: {
        Row: {
          created_at: string | null
          data_programada: string
          dry_run: boolean
          executado: boolean | null
          id: string
          processed_at: string | null
          registro_id: string
          tabela: string
        }
        Insert: {
          created_at?: string | null
          data_programada: string
          dry_run?: boolean
          executado?: boolean | null
          id?: string
          processed_at?: string | null
          registro_id: string
          tabela: string
        }
        Update: {
          created_at?: string | null
          data_programada?: string
          dry_run?: boolean
          executado?: boolean | null
          id?: string
          processed_at?: string | null
          registro_id?: string
          tabela?: string
        }
        Relationships: []
      }
      lgpd_politicas_retencao: {
        Row: {
          acao_final: string | null
          base_legal: string | null
          categoria_dado: string
          id: string
          prazo_meses: number
          updated_at: string | null
        }
        Insert: {
          acao_final?: string | null
          base_legal?: string | null
          categoria_dado: string
          id?: string
          prazo_meses: number
          updated_at?: string | null
        }
        Update: {
          acao_final?: string | null
          base_legal?: string | null
          categoria_dado?: string
          id?: string
          prazo_meses?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      lgpd_solicitacoes: {
        Row: {
          colaborador_id: string | null
          concluida_em: string | null
          created_at: string | null
          descricao: string | null
          empresa_id: string | null
          id: string
          prazo_legal: string | null
          responsavel_id: string | null
          resposta: string | null
          status: string | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          colaborador_id?: string | null
          concluida_em?: string | null
          created_at?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          prazo_legal?: string | null
          responsavel_id?: string | null
          resposta?: string | null
          status?: string | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          colaborador_id?: string | null
          concluida_em?: string | null
          created_at?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          prazo_legal?: string | null
          responsavel_id?: string | null
          resposta?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_lgpd_solicitacoes_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_lgpd_solicitacoes_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_lgpd_solicitacoes_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_lgpd_solicitacoes_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_lgpd_solicitacoes_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lgpd_solicitacoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lgpd_solicitacoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lgpd_solicitacoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lgpd_solicitacoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "lgpd_solicitacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      linhas_transporte: {
        Row: {
          created_at: string
          id: string
          ida_volta: boolean | null
          nome: string
          tipo: string | null
          vale_transporte_id: string | null
          valor: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          ida_volta?: boolean | null
          nome: string
          tipo?: string | null
          vale_transporte_id?: string | null
          valor?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          ida_volta?: boolean | null
          nome?: string
          tipo?: string | null
          vale_transporte_id?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "linhas_transporte_vale_transporte_id_fkey"
            columns: ["vale_transporte_id"]
            isOneToOne: false
            referencedRelation: "vales_transporte"
            referencedColumns: ["id"]
          },
        ]
      }
      locais_trabalho: {
        Row: {
          ativo: boolean | null
          cep: string | null
          cidade: string | null
          created_at: string
          empresa_id: string | null
          endereco: string | null
          id: string
          latitude: number | null
          longitude: number | null
          nome: string
          pais: string | null
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          cep?: string | null
          cidade?: string | null
          created_at?: string
          empresa_id?: string | null
          endereco?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome: string
          pais?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          cep?: string | null
          cidade?: string | null
          created_at?: string
          empresa_id?: string | null
          endereco?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome?: string
          pais?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_locais_trabalho_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locais_trabalho_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      log_envio_relatorios: {
        Row: {
          agendamento_id: string | null
          created_at: string
          id: string
          mensagem: string | null
          status: string
        }
        Insert: {
          agendamento_id?: string | null
          created_at?: string
          id?: string
          mensagem?: string | null
          status: string
        }
        Update: {
          agendamento_id?: string | null
          created_at?: string
          id?: string
          mensagem?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "log_envio_relatorios_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "relatorios_agendados"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string | null
          email: string
          failure_reason: string | null
          id: string
          ip_address: string
          mfa_passed: boolean | null
          mfa_required: boolean | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          failure_reason?: string | null
          id?: string
          ip_address: string
          mfa_passed?: boolean | null
          mfa_required?: boolean | null
          success: boolean
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string
          mfa_passed?: boolean | null
          mfa_required?: boolean | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      login_lockouts: {
        Row: {
          attempts: number
          created_at: string
          id: string
          identifier: string
          identifier_type: string
          is_locked: boolean
          last_attempt: string
          lockout_until: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          identifier: string
          identifier_type?: string
          is_locked?: boolean
          last_attempt?: string
          lockout_until?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          identifier?: string
          identifier_type?: string
          is_locked?: boolean
          last_attempt?: string
          lockout_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      login_rate_limits: {
        Row: {
          created_at: string
          failed_attempts: number
          id: string
          identifier: string
          identifier_type: string
          last_attempt_at: string
          locked_until: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          failed_attempts?: number
          id?: string
          identifier: string
          identifier_type?: string
          last_attempt_at?: string
          locked_until?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          failed_attempts?: number
          id?: string
          identifier?: string
          identifier_type?: string
          last_attempt_at?: string
          locked_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      logs_integracoes: {
        Row: {
          created_at: string
          detalhes: Json | null
          id: string
          integracao_id: string | null
          mensagem: string | null
          status: string | null
          tipo: string | null
        }
        Insert: {
          created_at?: string
          detalhes?: Json | null
          id?: string
          integracao_id?: string | null
          mensagem?: string | null
          status?: string | null
          tipo?: string | null
        }
        Update: {
          created_at?: string
          detalhes?: Json | null
          id?: string
          integracao_id?: string | null
          mensagem?: string | null
          status?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_integracoes_integracao_id_fkey"
            columns: ["integracao_id"]
            isOneToOne: false
            referencedRelation: "integracoes"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_sincronizacao: {
        Row: {
          created_at: string | null
          empresa_id: string
          id: string
          mensagem: string | null
          payload_enviado: Json | null
          resposta_recebida: Json | null
          sistema_externo: string
          status: string
          tipo_entidade: string
        }
        Insert: {
          created_at?: string | null
          empresa_id: string
          id?: string
          mensagem?: string | null
          payload_enviado?: Json | null
          resposta_recebida?: Json | null
          sistema_externo: string
          status: string
          tipo_entidade: string
        }
        Update: {
          created_at?: string | null
          empresa_id?: string
          id?: string
          mensagem?: string | null
          payload_enviado?: Json | null
          resposta_recebida?: Json | null
          sistema_externo?: string
          status?: string
          tipo_entidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "logs_sincronizacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_sistema: {
        Row: {
          contexto: Json | null
          created_at: string | null
          id: string
          mensagem: string
          nivel: string
          stack_trace: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          contexto?: Json | null
          created_at?: string | null
          id?: string
          mensagem: string
          nivel: string
          stack_trace?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          contexto?: Json | null
          created_at?: string | null
          id?: string
          mensagem?: string
          nivel?: string
          stack_trace?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      lotacoes: {
        Row: {
          ativa: boolean | null
          codigo: string | null
          colaborador_id: string | null
          created_at: string
          empresa_id: string | null
          endereco: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean | null
          codigo?: string | null
          colaborador_id?: string | null
          created_at?: string
          empresa_id?: string | null
          endereco?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean | null
          codigo?: string | null
          colaborador_id?: string | null
          created_at?: string
          empresa_id?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_lotacoes_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_lotacoes_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_lotacoes_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_lotacoes_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_lotacoes_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotacoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotacoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotacoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotacoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "lotacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      medidas_ciencia_tokens: {
        Row: {
          acao: string | null
          assinatura_hash: string | null
          colaborador_id: string
          created_at: string
          created_by: string | null
          empresa_id: string
          expires_at: string
          geolocation: Json | null
          id: string
          ip_address: string | null
          medida_id: string
          motivo_recusa: string | null
          token: string
          used_at: string | null
          user_agent: string | null
        }
        Insert: {
          acao?: string | null
          assinatura_hash?: string | null
          colaborador_id: string
          created_at?: string
          created_by?: string | null
          empresa_id: string
          expires_at?: string
          geolocation?: Json | null
          id?: string
          ip_address?: string | null
          medida_id: string
          motivo_recusa?: string | null
          token: string
          used_at?: string | null
          user_agent?: string | null
        }
        Update: {
          acao?: string | null
          assinatura_hash?: string | null
          colaborador_id?: string
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          expires_at?: string
          geolocation?: Json | null
          id?: string
          ip_address?: string | null
          medida_id?: string
          motivo_recusa?: string | null
          token?: string
          used_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medidas_ciencia_tokens_medida_id_fkey"
            columns: ["medida_id"]
            isOneToOne: false
            referencedRelation: "medidas_disciplinares"
            referencedColumns: ["id"]
          },
        ]
      }
      medidas_disciplinares: {
        Row: {
          aplicado_por: string | null
          aprovado_gestor_em: string | null
          aprovado_gestor_por: string | null
          aprovado_juridico_em: string | null
          aprovado_juridico_por: string | null
          aprovado_rh_em: string | null
          aprovado_rh_por: string | null
          aprovador_id: string | null
          arquivado_em: string | null
          arquivado_por: string | null
          artigo_clt: string | null
          assinado_em: string | null
          colaborador_ciente: boolean | null
          colaborador_id: string
          contestacao_aceita: boolean | null
          contestacao_data: string | null
          contestacao_prazo_ate: string | null
          contestacao_prazo_horas: number
          contestacao_respondida_em: string | null
          contestacao_respondida_por: string | null
          contestacao_resposta: string | null
          contestacao_texto: string | null
          created_at: string | null
          data_aprovacao: string | null
          data_ciencia: string | null
          data_conhecimento_fato: string | null
          data_inicio_efeito: string | null
          data_ocorrencia: string
          descricao: string
          dias_suspensao: number | null
          documento_url: string | null
          empresa_id: string | null
          evidenciado_por: Json | null
          gravidade: string | null
          hash_integridade: string | null
          id: string
          id_registro_anterior: string | null
          motivo_recusa: string | null
          motivo_rejeicao: string | null
          numero_sequencial: number | null
          pdf_gerado_em: string | null
          pdf_hash_sha256: string | null
          pdf_url: string | null
          prazo_ciencia_dias: number | null
          recorrencia_infrafacao: boolean | null
          recusa_assinatura: boolean | null
          rejeitado_em: string | null
          rejeitado_por: string | null
          status: string | null
          status_workflow: string | null
          testemunha_1: string | null
          testemunha_1_cpf: string | null
          testemunha_1_nome: string | null
          testemunha_2: string | null
          testemunha_2_cpf: string | null
          testemunha_2_nome: string | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          aplicado_por?: string | null
          aprovado_gestor_em?: string | null
          aprovado_gestor_por?: string | null
          aprovado_juridico_em?: string | null
          aprovado_juridico_por?: string | null
          aprovado_rh_em?: string | null
          aprovado_rh_por?: string | null
          aprovador_id?: string | null
          arquivado_em?: string | null
          arquivado_por?: string | null
          artigo_clt?: string | null
          assinado_em?: string | null
          colaborador_ciente?: boolean | null
          colaborador_id: string
          contestacao_aceita?: boolean | null
          contestacao_data?: string | null
          contestacao_prazo_ate?: string | null
          contestacao_prazo_horas?: number
          contestacao_respondida_em?: string | null
          contestacao_respondida_por?: string | null
          contestacao_resposta?: string | null
          contestacao_texto?: string | null
          created_at?: string | null
          data_aprovacao?: string | null
          data_ciencia?: string | null
          data_conhecimento_fato?: string | null
          data_inicio_efeito?: string | null
          data_ocorrencia: string
          descricao: string
          dias_suspensao?: number | null
          documento_url?: string | null
          empresa_id?: string | null
          evidenciado_por?: Json | null
          gravidade?: string | null
          hash_integridade?: string | null
          id?: string
          id_registro_anterior?: string | null
          motivo_recusa?: string | null
          motivo_rejeicao?: string | null
          numero_sequencial?: number | null
          pdf_gerado_em?: string | null
          pdf_hash_sha256?: string | null
          pdf_url?: string | null
          prazo_ciencia_dias?: number | null
          recorrencia_infrafacao?: boolean | null
          recusa_assinatura?: boolean | null
          rejeitado_em?: string | null
          rejeitado_por?: string | null
          status?: string | null
          status_workflow?: string | null
          testemunha_1?: string | null
          testemunha_1_cpf?: string | null
          testemunha_1_nome?: string | null
          testemunha_2?: string | null
          testemunha_2_cpf?: string | null
          testemunha_2_nome?: string | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          aplicado_por?: string | null
          aprovado_gestor_em?: string | null
          aprovado_gestor_por?: string | null
          aprovado_juridico_em?: string | null
          aprovado_juridico_por?: string | null
          aprovado_rh_em?: string | null
          aprovado_rh_por?: string | null
          aprovador_id?: string | null
          arquivado_em?: string | null
          arquivado_por?: string | null
          artigo_clt?: string | null
          assinado_em?: string | null
          colaborador_ciente?: boolean | null
          colaborador_id?: string
          contestacao_aceita?: boolean | null
          contestacao_data?: string | null
          contestacao_prazo_ate?: string | null
          contestacao_prazo_horas?: number
          contestacao_respondida_em?: string | null
          contestacao_respondida_por?: string | null
          contestacao_resposta?: string | null
          contestacao_texto?: string | null
          created_at?: string | null
          data_aprovacao?: string | null
          data_ciencia?: string | null
          data_conhecimento_fato?: string | null
          data_inicio_efeito?: string | null
          data_ocorrencia?: string
          descricao?: string
          dias_suspensao?: number | null
          documento_url?: string | null
          empresa_id?: string | null
          evidenciado_por?: Json | null
          gravidade?: string | null
          hash_integridade?: string | null
          id?: string
          id_registro_anterior?: string | null
          motivo_recusa?: string | null
          motivo_rejeicao?: string | null
          numero_sequencial?: number | null
          pdf_gerado_em?: string | null
          pdf_hash_sha256?: string | null
          pdf_url?: string | null
          prazo_ciencia_dias?: number | null
          recorrencia_infrafacao?: boolean | null
          recusa_assinatura?: boolean | null
          rejeitado_em?: string | null
          rejeitado_por?: string | null
          status?: string | null
          status_workflow?: string | null
          testemunha_1?: string | null
          testemunha_1_cpf?: string | null
          testemunha_1_nome?: string | null
          testemunha_2?: string | null
          testemunha_2_cpf?: string | null
          testemunha_2_nome?: string | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_medidas_disciplinares_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_medidas_disciplinares_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_medidas_disciplinares_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_medidas_disciplinares_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_medidas_disciplinares_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medidas_disciplinares_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medidas_disciplinares_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medidas_disciplinares_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medidas_disciplinares_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "medidas_disciplinares_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      medidas_disciplinares_anexos: {
        Row: {
          created_at: string | null
          id: string
          medida_id: string | null
          mime_type: string | null
          nome_arquivo: string
          storage_path: string
          tamanho_bytes: number | null
          tipo: string | null
          tipo_arquivo: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          medida_id?: string | null
          mime_type?: string | null
          nome_arquivo: string
          storage_path: string
          tamanho_bytes?: number | null
          tipo?: string | null
          tipo_arquivo?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          medida_id?: string | null
          mime_type?: string | null
          nome_arquivo?: string
          storage_path?: string
          tamanho_bytes?: number | null
          tipo?: string | null
          tipo_arquivo?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medidas_disciplinares_anexos_medida_id_fkey"
            columns: ["medida_id"]
            isOneToOne: false
            referencedRelation: "medidas_disciplinares"
            referencedColumns: ["id"]
          },
        ]
      }
      medidas_disciplinares_contestacao_anexos: {
        Row: {
          created_at: string
          empresa_id: string
          hash_sha256: string | null
          id: string
          medida_id: string
          mime_type: string | null
          nome_arquivo: string
          storage_path: string
          tamanho_bytes: number | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          empresa_id: string
          hash_sha256?: string | null
          id?: string
          medida_id: string
          mime_type?: string | null
          nome_arquivo: string
          storage_path: string
          tamanho_bytes?: number | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          empresa_id?: string
          hash_sha256?: string | null
          id?: string
          medida_id?: string
          mime_type?: string | null
          nome_arquivo?: string
          storage_path?: string
          tamanho_bytes?: number | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medidas_disciplinares_contestacao_anexos_medida_id_fkey"
            columns: ["medida_id"]
            isOneToOne: false
            referencedRelation: "medidas_disciplinares"
            referencedColumns: ["id"]
          },
        ]
      }
      medidas_disciplinares_integracao: {
        Row: {
          colaborador_id: string
          competencia: string | null
          created_at: string
          detalhes: Json | null
          dias: number | null
          empresa_id: string
          id: string
          medida_id: string
          ref_id: string | null
          status: string
          tipo_integracao: string
          updated_at: string
          valor: number | null
        }
        Insert: {
          colaborador_id: string
          competencia?: string | null
          created_at?: string
          detalhes?: Json | null
          dias?: number | null
          empresa_id: string
          id?: string
          medida_id: string
          ref_id?: string | null
          status?: string
          tipo_integracao: string
          updated_at?: string
          valor?: number | null
        }
        Update: {
          colaborador_id?: string
          competencia?: string | null
          created_at?: string
          detalhes?: Json | null
          dias?: number | null
          empresa_id?: string
          id?: string
          medida_id?: string
          ref_id?: string | null
          status?: string
          tipo_integracao?: string
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "medidas_disciplinares_integracao_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medidas_disciplinares_integracao_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medidas_disciplinares_integracao_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medidas_disciplinares_integracao_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "medidas_disciplinares_integracao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medidas_disciplinares_integracao_medida_id_fkey"
            columns: ["medida_id"]
            isOneToOne: false
            referencedRelation: "medidas_disciplinares"
            referencedColumns: ["id"]
          },
        ]
      }
      medidas_disciplinares_workflow_log: {
        Row: {
          acao: string
          ator_id: string | null
          created_at: string
          de_status: string | null
          empresa_id: string
          id: string
          medida_id: string
          observacao: string | null
          para_status: string
        }
        Insert: {
          acao: string
          ator_id?: string | null
          created_at?: string
          de_status?: string | null
          empresa_id: string
          id?: string
          medida_id: string
          observacao?: string | null
          para_status: string
        }
        Update: {
          acao?: string
          ator_id?: string | null
          created_at?: string
          de_status?: string | null
          empresa_id?: string
          id?: string
          medida_id?: string
          observacao?: string | null
          para_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "medidas_disciplinares_workflow_log_medida_id_fkey"
            columns: ["medida_id"]
            isOneToOne: false
            referencedRelation: "medidas_disciplinares"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_okrs: {
        Row: {
          ciclo_id: string | null
          colaborador_id: string | null
          created_at: string
          data_limite: string | null
          descricao: string | null
          empresa_id: string | null
          id: string
          meta_valor: number | null
          progresso: number | null
          status: string | null
          tipo: string | null
          titulo: string
          updated_at: string
          valor_atual: number | null
        }
        Insert: {
          ciclo_id?: string | null
          colaborador_id?: string | null
          created_at?: string
          data_limite?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          meta_valor?: number | null
          progresso?: number | null
          status?: string | null
          tipo?: string | null
          titulo: string
          updated_at?: string
          valor_atual?: number | null
        }
        Update: {
          ciclo_id?: string | null
          colaborador_id?: string | null
          created_at?: string
          data_limite?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          meta_valor?: number | null
          progresso?: number | null
          status?: string | null
          tipo?: string | null
          titulo?: string
          updated_at?: string
          valor_atual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_metas_okrs_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_metas_okrs_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_metas_okrs_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_metas_okrs_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_metas_okrs_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_okrs_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_avaliacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_okrs_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_okrs_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_okrs_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_okrs_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "metas_okrs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      metricas_processamento: {
        Row: {
          funcao_nome: string
          id: string
          status: string
          tempo_execucao_ms: number | null
          timestamp: string | null
        }
        Insert: {
          funcao_nome: string
          id?: string
          status: string
          tempo_execucao_ms?: number | null
          timestamp?: string | null
        }
        Update: {
          funcao_nome?: string
          id?: string
          status?: string
          tempo_execucao_ms?: number | null
          timestamp?: string | null
        }
        Relationships: []
      }
      motivos_afastamento: {
        Row: {
          created_at: string | null
          id: number
          nome: string
          tipo: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          nome: string
          tipo?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          nome?: string
          tipo?: string | null
        }
        Relationships: []
      }
      nacionalidades: {
        Row: {
          codigo_esocial: string | null
          created_at: string | null
          id: number
          nome: string
        }
        Insert: {
          codigo_esocial?: string | null
          created_at?: string | null
          id?: number
          nome: string
        }
        Update: {
          codigo_esocial?: string | null
          created_at?: string | null
          id?: number
          nome?: string
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          created_at: string
          data_referencia: string | null
          empresa_id: string | null
          entidade_id: string | null
          entidade_tipo: string | null
          id: string
          lida: boolean | null
          mensagem: string
          tipo: string
          titulo: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data_referencia?: string | null
          empresa_id?: string | null
          entidade_id?: string | null
          entidade_tipo?: string | null
          id?: string
          lida?: boolean | null
          mensagem: string
          tipo: string
          titulo: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data_referencia?: string | null
          empresa_id?: string | null
          entidade_id?: string | null
          entidade_tipo?: string | null
          id?: string
          lida?: boolean | null
          mensagem?: string
          tipo?: string
          titulo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_notificacoes_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes_admissao: {
        Row: {
          admissao_id: string
          assunto: string | null
          canal: string
          created_at: string
          erro: string | null
          id: string
          mensagem: string | null
          status: string | null
          tipo: string
        }
        Insert: {
          admissao_id: string
          assunto?: string | null
          canal: string
          created_at?: string
          erro?: string | null
          id?: string
          mensagem?: string | null
          status?: string | null
          tipo: string
        }
        Update: {
          admissao_id?: string
          assunto?: string | null
          canal?: string
          created_at?: string
          erro?: string | null
          id?: string
          mensagem?: string | null
          status?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_admissao_admissao_id_fkey"
            columns: ["admissao_id"]
            isOneToOne: false
            referencedRelation: "admissoes"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_colaborador: {
        Row: {
          colaborador_id: string
          created_at: string
          created_by: string | null
          data_conclusao: string | null
          data_inicio: string
          empresa_id: string | null
          id: string
          progresso: number | null
          status: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          created_by?: string | null
          data_conclusao?: string | null
          data_inicio?: string
          empresa_id?: string | null
          id?: string
          progresso?: number | null
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          created_by?: string | null
          data_conclusao?: string | null
          data_inicio?: string
          empresa_id?: string | null
          id?: string
          progresso?: number | null
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_onboarding_colaborador_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_onboarding_colaborador_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_onboarding_colaborador_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_onboarding_colaborador_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "onboarding_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "onboarding_colaborador_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_colaborador_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "onboarding_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_documentos_obrigatorios: {
        Row: {
          created_at: string | null
          empresa_id: string
          entregue: boolean | null
          id: string
          nome_documento: string
          onboarding_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          empresa_id: string
          entregue?: boolean | null
          id?: string
          nome_documento: string
          onboarding_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          empresa_id?: string
          entregue?: boolean | null
          id?: string
          nome_documento?: string
          onboarding_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_documentos_obrigatorios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_documentos_obrigatorios_onboarding_id_fkey"
            columns: ["onboarding_id"]
            isOneToOne: false
            referencedRelation: "onboarding_colaborador"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_kits: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          empresa_id: string
          id: string
          itens: Json
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          empresa_id: string
          id?: string
          itens?: Json
          nome: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          empresa_id?: string
          id?: string
          itens?: Json
          nome?: string
        }
        Relationships: []
      }
      onboarding_tarefas: {
        Row: {
          categoria: string
          concluida: boolean | null
          concluida_por: string | null
          created_at: string
          data_conclusao: string | null
          data_prazo: string | null
          descricao: string | null
          empresa_id: string | null
          id: string
          observacoes: string | null
          onboarding_id: string
          ordem: number
          template_tarefa_id: string | null
          titulo: string
        }
        Insert: {
          categoria?: string
          concluida?: boolean | null
          concluida_por?: string | null
          created_at?: string
          data_conclusao?: string | null
          data_prazo?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          observacoes?: string | null
          onboarding_id: string
          ordem?: number
          template_tarefa_id?: string | null
          titulo: string
        }
        Update: {
          categoria?: string
          concluida?: boolean | null
          concluida_por?: string | null
          created_at?: string
          data_conclusao?: string | null
          data_prazo?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          observacoes?: string | null
          onboarding_id?: string
          ordem?: number
          template_tarefa_id?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_tarefas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_tarefas_onboarding_id_fkey"
            columns: ["onboarding_id"]
            isOneToOne: false
            referencedRelation: "onboarding_colaborador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_tarefas_template_tarefa_id_fkey"
            columns: ["template_tarefa_id"]
            isOneToOne: false
            referencedRelation: "onboarding_template_tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_template_tarefas: {
        Row: {
          categoria: string
          created_at: string
          descricao: string | null
          dias_prazo: number | null
          id: string
          obrigatoria: boolean | null
          ordem: number
          responsavel_tipo: string | null
          template_id: string
          titulo: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          descricao?: string | null
          dias_prazo?: number | null
          id?: string
          obrigatoria?: boolean | null
          ordem?: number
          responsavel_tipo?: string | null
          template_id: string
          titulo: string
        }
        Update: {
          categoria?: string
          created_at?: string
          descricao?: string | null
          dias_prazo?: number | null
          id?: string
          obrigatoria?: boolean | null
          ordem?: number
          responsavel_tipo?: string | null
          template_id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_template_tarefas_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "onboarding_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_templates: {
        Row: {
          ativo: boolean | null
          created_at: string
          created_by: string | null
          descricao: string | null
          empresa_id: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_onboarding_templates_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_templates_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      paises: {
        Row: {
          codigo_iso: string | null
          created_at: string | null
          id: number
          nome: string
        }
        Insert: {
          codigo_iso?: string | null
          created_at?: string | null
          id?: number
          nome: string
        }
        Update: {
          codigo_iso?: string | null
          created_at?: string | null
          id?: number
          nome?: string
        }
        Relationships: []
      }
      parametros_fiscais: {
        Row: {
          aliquota: number | null
          ativo: boolean | null
          created_at: string
          deducao: number | null
          faixa: number | null
          id: string
          tipo: string
          valor_final: number | null
          valor_fixo: number | null
          valor_inicial: number | null
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          aliquota?: number | null
          ativo?: boolean | null
          created_at?: string
          deducao?: number | null
          faixa?: number | null
          id?: string
          tipo: string
          valor_final?: number | null
          valor_fixo?: number | null
          valor_inicial?: number | null
          vigencia_fim?: string | null
          vigencia_inicio: string
        }
        Update: {
          aliquota?: number | null
          ativo?: boolean | null
          created_at?: string
          deducao?: number | null
          faixa?: number | null
          id?: string
          tipo?: string
          valor_final?: number | null
          valor_fixo?: number | null
          valor_inicial?: number | null
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: []
      }
      parametros_sistema: {
        Row: {
          created_at: string | null
          empresa_id: string
          id: string
          nome: string
          tipo_dado: string | null
          updated_at: string | null
          valor: string | null
        }
        Insert: {
          created_at?: string | null
          empresa_id: string
          id?: string
          nome: string
          tipo_dado?: string | null
          updated_at?: string | null
          valor?: string | null
        }
        Update: {
          created_at?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          tipo_dado?: string | null
          updated_at?: string | null
          valor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parametros_sistema_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      password_history: {
        Row: {
          created_at: string | null
          id: string
          password_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          password_hash: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          password_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      password_policies: {
        Row: {
          created_at: string | null
          id: string
          lockout_attempts: number | null
          lockout_duration_minutes: number | null
          max_age_days: number | null
          min_length: number | null
          prevent_reuse_count: number | null
          require_lowercase: boolean | null
          require_numbers: boolean | null
          require_special_chars: boolean | null
          require_uppercase: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lockout_attempts?: number | null
          lockout_duration_minutes?: number | null
          max_age_days?: number | null
          min_length?: number | null
          prevent_reuse_count?: number | null
          require_lowercase?: boolean | null
          require_numbers?: boolean | null
          require_special_chars?: boolean | null
          require_uppercase?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lockout_attempts?: number | null
          lockout_duration_minutes?: number | null
          max_age_days?: number | null
          min_length?: number | null
          prevent_reuse_count?: number | null
          require_lowercase?: boolean | null
          require_numbers?: boolean | null
          require_special_chars?: boolean | null
          require_uppercase?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      password_reset_config: {
        Row: {
          auto_expire_hours: number | null
          id: string
          notify_admins: boolean | null
          notify_user_on_approval: boolean | null
          notify_user_on_rejection: boolean | null
          require_approval: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          auto_expire_hours?: number | null
          id?: string
          notify_admins?: boolean | null
          notify_user_on_approval?: boolean | null
          notify_user_on_rejection?: boolean | null
          require_approval?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          auto_expire_hours?: number | null
          id?: string
          notify_admins?: boolean | null
          notify_user_on_approval?: boolean | null
          notify_user_on_rejection?: boolean | null
          require_approval?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      password_reset_requests: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          ip_address: string | null
          reason: string | null
          requested_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: string
          user_agent: string | null
          user_email: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          reason?: string | null
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          user_agent?: string | null
          user_email: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          reason?: string | null
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          user_agent?: string | null
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      pdi_plano_desenvolvimento: {
        Row: {
          acao_desenvolvimento: string | null
          colaborador_id: string | null
          comentarios: string | null
          competencia_foco: string | null
          created_at: string
          empresa_id: string | null
          id: string
          prazo: string | null
          status: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          acao_desenvolvimento?: string | null
          colaborador_id?: string | null
          comentarios?: string | null
          competencia_foco?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          prazo?: string | null
          status?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          acao_desenvolvimento?: string | null
          colaborador_id?: string | null
          comentarios?: string | null
          competencia_foco?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          prazo?: string | null
          status?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdi_plano_desenvolvimento_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdi_plano_desenvolvimento_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdi_plano_desenvolvimento_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdi_plano_desenvolvimento_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "pdi_plano_desenvolvimento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      pdis: {
        Row: {
          acao: string | null
          colaborador_id: string | null
          competencia: string | null
          created_at: string
          descricao: string | null
          empresa_id: string | null
          id: string
          prazo: string | null
          progresso: number | null
          status: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          acao?: string | null
          colaborador_id?: string | null
          competencia?: string | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          prazo?: string | null
          progresso?: number | null
          status?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          acao?: string | null
          colaborador_id?: string | null
          competencia?: string | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          prazo?: string | null
          progresso?: number | null
          status?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pdis_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pdis_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pdis_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pdis_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_pdis_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdis_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdis_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdis_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdis_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "pdis_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      pendencias: {
        Row: {
          atualizado_at: string | null
          criado_at: string | null
          descricao: string | null
          empresa_id: string | null
          id: string
          metadata: Json | null
          prioridade: string | null
          referencia_id: string | null
          status: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          atualizado_at?: string | null
          criado_at?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          metadata?: Json | null
          prioridade?: string | null
          referencia_id?: string | null
          status?: string | null
          tipo: string
          titulo: string
        }
        Update: {
          atualizado_at?: string | null
          criado_at?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          metadata?: Json | null
          prioridade?: string | null
          referencia_id?: string | null
          status?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "pendencias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      pensoes: {
        Row: {
          agencia: string | null
          ativo: boolean | null
          banco: string | null
          beneficiario: string
          colaborador_id: string | null
          conta: string | null
          cpf_beneficiario: string | null
          created_at: string
          id: string
          percentual: number | null
          tipo: string | null
          valor_fixo: number | null
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean | null
          banco?: string | null
          beneficiario: string
          colaborador_id?: string | null
          conta?: string | null
          cpf_beneficiario?: string | null
          created_at?: string
          id?: string
          percentual?: number | null
          tipo?: string | null
          valor_fixo?: number | null
        }
        Update: {
          agencia?: string | null
          ativo?: boolean | null
          banco?: string | null
          beneficiario?: string
          colaborador_id?: string | null
          conta?: string | null
          cpf_beneficiario?: string | null
          created_at?: string
          id?: string
          percentual?: number | null
          tipo?: string | null
          valor_fixo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_pensoes_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pensoes_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pensoes_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pensoes_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "pensoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pensoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pensoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pensoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      periodos_aquisitivos: {
        Row: {
          colaborador_id: string
          created_at: string
          data_fim: string
          data_inicio: string
          data_limite_concessao: string | null
          dias_descontados: number | null
          dias_direito: number
          em_dobra: boolean
          faltas_periodo: number | null
          id: string
          motivo_perda: string | null
          numero_periodo: number
          perdeu_direito: boolean
          status: string | null
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          data_fim: string
          data_inicio: string
          data_limite_concessao?: string | null
          dias_descontados?: number | null
          dias_direito?: number
          em_dobra?: boolean
          faltas_periodo?: number | null
          id?: string
          motivo_perda?: string | null
          numero_periodo?: number
          perdeu_direito?: boolean
          status?: string | null
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          data_fim?: string
          data_inicio?: string
          data_limite_concessao?: string | null
          dias_descontados?: number | null
          dias_direito?: number
          em_dobra?: boolean
          faltas_periodo?: number | null
          id?: string
          motivo_perda?: string | null
          numero_periodo?: number
          perdeu_direito?: boolean
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_periodos_aquisitivos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_periodos_aquisitivos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_periodos_aquisitivos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_periodos_aquisitivos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "periodos_aquisitivos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodos_aquisitivos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodos_aquisitivos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodos_aquisitivos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      periodos_experiencia: {
        Row: {
          colaborador_id: string
          created_at: string
          data_inicio: string
          dias_total: number | null
          id: string
          observacoes: string | null
          primeira_etapa_fim: string | null
          segunda_etapa_fim: string | null
          status: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          data_inicio: string
          dias_total?: number | null
          id?: string
          observacoes?: string | null
          primeira_etapa_fim?: string | null
          segunda_etapa_fim?: string | null
          status?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          data_inicio?: string
          dias_total?: number | null
          id?: string
          observacoes?: string | null
          primeira_etapa_fim?: string | null
          segunda_etapa_fim?: string | null
          status?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_periodos_experiencia_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_periodos_experiencia_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_periodos_experiencia_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_periodos_experiencia_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "periodos_experiencia_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodos_experiencia_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodos_experiencia_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodos_experiencia_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      periodos_ponto: {
        Row: {
          competencia: string
          created_at: string
          data_fim: string
          data_inicio: string
          fechado_em: string | null
          fechado_por: string | null
          id: string
          status: string | null
        }
        Insert: {
          competencia: string
          created_at?: string
          data_fim: string
          data_inicio: string
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          status?: string | null
        }
        Update: {
          competencia?: string
          created_at?: string
          data_fim?: string
          data_inicio?: string
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          status?: string | null
        }
        Relationships: []
      }
      permissao_perfis: {
        Row: {
          created_at: string | null
          descricao: string | null
          empresa_id: string
          id: string
          is_admin: boolean | null
          nome: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          empresa_id: string
          id?: string
          is_admin?: boolean | null
          nome: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          empresa_id?: string
          id?: string
          is_admin?: boolean | null
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permissao_perfis_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      permissao_recursos: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string
          modulo: string | null
          nome: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          modulo?: string | null
          nome: string
          slug: string
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          modulo?: string | null
          nome?: string
          slug?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          allowed: boolean
          created_at: string
          id: string
          resource: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          action: string
          allowed?: boolean
          created_at?: string
          id?: string
          resource: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          action?: string
          allowed?: boolean
          created_at?: string
          id?: string
          resource?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      personnel_budget: {
        Row: {
          ano: number
          created_at: string | null
          departamento: string
          descricao: string | null
          empresa_id: string
          id: string
          mes: number
          updated_at: string | null
          valor_orcado: number
        }
        Insert: {
          ano: number
          created_at?: string | null
          departamento: string
          descricao?: string | null
          empresa_id: string
          id?: string
          mes: number
          updated_at?: string | null
          valor_orcado?: number
        }
        Update: {
          ano?: number
          created_at?: string | null
          departamento?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          mes?: number
          updated_at?: string | null
          valor_orcado?: number
        }
        Relationships: [
          {
            foreignKeyName: "personnel_budget_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      pesquisas: {
        Row: {
          anonima: boolean | null
          created_at: string | null
          created_by: string | null
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          empresa_id: string | null
          id: string
          status: string | null
          tipo: string | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          anonima?: boolean | null
          created_at?: string | null
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          status?: string | null
          tipo?: string | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          anonima?: boolean | null
          created_at?: string | null
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          status?: string | null
          tipo?: string | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_pesquisas_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesquisas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      pesquisas_perguntas: {
        Row: {
          created_at: string | null
          id: string
          obrigatoria: boolean | null
          opcoes: Json | null
          ordem: number | null
          pesquisa_id: string
          texto: string
          tipo: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          obrigatoria?: boolean | null
          opcoes?: Json | null
          ordem?: number | null
          pesquisa_id: string
          texto: string
          tipo?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          obrigatoria?: boolean | null
          opcoes?: Json | null
          ordem?: number | null
          pesquisa_id?: string
          texto?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pesquisas_perguntas_pesquisa_id_fkey"
            columns: ["pesquisa_id"]
            isOneToOne: false
            referencedRelation: "pesquisas"
            referencedColumns: ["id"]
          },
        ]
      }
      pesquisas_respostas: {
        Row: {
          colaborador_id: string | null
          created_at: string | null
          id: string
          pergunta_id: string
          pesquisa_id: string
          valor_numerico: number | null
          valor_texto: string | null
        }
        Insert: {
          colaborador_id?: string | null
          created_at?: string | null
          id?: string
          pergunta_id: string
          pesquisa_id: string
          valor_numerico?: number | null
          valor_texto?: string | null
        }
        Update: {
          colaborador_id?: string | null
          created_at?: string | null
          id?: string
          pergunta_id?: string
          pesquisa_id?: string
          valor_numerico?: number | null
          valor_texto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_pesquisas_respostas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pesquisas_respostas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pesquisas_respostas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pesquisas_respostas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "pesquisas_respostas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesquisas_respostas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesquisas_respostas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesquisas_respostas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "pesquisas_respostas_pergunta_id_fkey"
            columns: ["pergunta_id"]
            isOneToOne: false
            referencedRelation: "pesquisas_perguntas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesquisas_respostas_pesquisa_id_fkey"
            columns: ["pesquisa_id"]
            isOneToOne: false
            referencedRelation: "pesquisas"
            referencedColumns: ["id"]
          },
        ]
      }
      pix_itens: {
        Row: {
          chave_pix: string
          colaborador_id: string | null
          created_at: string | null
          descricao: string | null
          end_to_end_id: string | null
          id: string
          lote_id: string
          status: string | null
          tipo_chave: string
          valor: number
        }
        Insert: {
          chave_pix: string
          colaborador_id?: string | null
          created_at?: string | null
          descricao?: string | null
          end_to_end_id?: string | null
          id?: string
          lote_id: string
          status?: string | null
          tipo_chave: string
          valor: number
        }
        Update: {
          chave_pix?: string
          colaborador_id?: string | null
          created_at?: string | null
          descricao?: string | null
          end_to_end_id?: string | null
          id?: string
          lote_id?: string
          status?: string | null
          tipo_chave?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pix_itens_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pix_itens_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pix_itens_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pix_itens_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "pix_itens_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "pix_lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      pix_lotes: {
        Row: {
          created_at: string | null
          data_criacao: string | null
          empresa_id: string
          id: string
          quantidade_pagamentos: number | null
          status: string
          updated_at: string | null
          valor_total: number | null
        }
        Insert: {
          created_at?: string | null
          data_criacao?: string | null
          empresa_id: string
          id?: string
          quantidade_pagamentos?: number | null
          status?: string
          updated_at?: string | null
          valor_total?: number | null
        }
        Update: {
          created_at?: string | null
          data_criacao?: string | null
          empresa_id?: string
          id?: string
          quantidade_pagamentos?: number | null
          status?: string
          updated_at?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pix_lotes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_contas: {
        Row: {
          codigo: string
          created_at: string | null
          empresa_id: string
          id: string
          natureza: string
          nome: string
          tipo: string
          updated_at: string | null
        }
        Insert: {
          codigo: string
          created_at?: string | null
          empresa_id: string
          id?: string
          natureza: string
          nome: string
          tipo: string
          updated_at?: string | null
        }
        Update: {
          codigo?: string
          created_at?: string | null
          empresa_id?: string
          id?: string
          natureza?: string
          nome?: string
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plano_contas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_saude: {
        Row: {
          abrangencia: string | null
          ans_registro: string | null
          ativo: boolean | null
          colaborador_id: string | null
          coparticipacao_teto: number | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          empresa_id: string | null
          id: string
          numero_carteirinha: string | null
          operadora: string | null
          percentual_colaborador: number | null
          percentual_empresa: number | null
          tipo_plano: string | null
          valor_mensal: number | null
        }
        Insert: {
          abrangencia?: string | null
          ans_registro?: string | null
          ativo?: boolean | null
          colaborador_id?: string | null
          coparticipacao_teto?: number | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          empresa_id?: string | null
          id?: string
          numero_carteirinha?: string | null
          operadora?: string | null
          percentual_colaborador?: number | null
          percentual_empresa?: number | null
          tipo_plano?: string | null
          valor_mensal?: number | null
        }
        Update: {
          abrangencia?: string | null
          ans_registro?: string | null
          ativo?: boolean | null
          colaborador_id?: string | null
          coparticipacao_teto?: number | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          empresa_id?: string | null
          id?: string
          numero_carteirinha?: string | null
          operadora?: string | null
          percentual_colaborador?: number | null
          percentual_empresa?: number | null
          tipo_plano?: string | null
          valor_mensal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_planos_saude_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_planos_saude_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_planos_saude_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_planos_saude_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_planos_saude_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_saude_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_saude_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_saude_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_saude_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "planos_saude_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_ajustes: {
        Row: {
          anexo_url: string | null
          colaborador_id: string
          created_at: string | null
          data_decisao: string | null
          data_referencia: string
          gestor_id: string | null
          historico_aprovacao: Json | null
          hora_original: string | null
          hora_sugerida: string | null
          id: string
          justificativa: string
          nivel_aprovacao_atual: number | null
          observacoes_gestor: string | null
          sla_vencimento: string | null
          status: string | null
          tipo_ajuste: string
          updated_at: string | null
        }
        Insert: {
          anexo_url?: string | null
          colaborador_id: string
          created_at?: string | null
          data_decisao?: string | null
          data_referencia: string
          gestor_id?: string | null
          historico_aprovacao?: Json | null
          hora_original?: string | null
          hora_sugerida?: string | null
          id?: string
          justificativa: string
          nivel_aprovacao_atual?: number | null
          observacoes_gestor?: string | null
          sla_vencimento?: string | null
          status?: string | null
          tipo_ajuste: string
          updated_at?: string | null
        }
        Update: {
          anexo_url?: string | null
          colaborador_id?: string
          created_at?: string | null
          data_decisao?: string | null
          data_referencia?: string
          gestor_id?: string | null
          historico_aprovacao?: Json | null
          hora_original?: string | null
          hora_sugerida?: string | null
          id?: string
          justificativa?: string
          nivel_aprovacao_atual?: number | null
          observacoes_gestor?: string | null
          sla_vencimento?: string | null
          status?: string | null
          tipo_ajuste?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ponto_auditoria: {
        Row: {
          acao: string
          created_at: string | null
          dados_anteriores: Json | null
          dados_novos: Json | null
          id: string
          ip_address: string | null
          justificativa: string | null
          registro_id: string
          tabela_nome: string
          user_agent: string | null
          usuario_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          ip_address?: string | null
          justificativa?: string | null
          registro_id: string
          tabela_nome: string
          user_agent?: string | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          ip_address?: string | null
          justificativa?: string | null
          registro_id?: string
          tabela_nome?: string
          user_agent?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      ponto_auditoria_fraude: {
        Row: {
          batida_id: string | null
          created_at: string | null
          detalhes: Json | null
          id: string
          score_confianca: number | null
          tipo_alerta: string | null
        }
        Insert: {
          batida_id?: string | null
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          score_confianca?: number | null
          tipo_alerta?: string | null
        }
        Update: {
          batida_id?: string | null
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          score_confianca?: number | null
          tipo_alerta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ponto_auditoria_fraude_batida_id_fkey"
            columns: ["batida_id"]
            isOneToOne: false
            referencedRelation: "batidas_ponto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_auditoria_fraude_batida_id_fkey"
            columns: ["batida_id"]
            isOneToOne: false
            referencedRelation: "vw_batidas_dia"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_espelhos_assinados: {
        Row: {
          arquivo_espelho_url: string | null
          assinado_em: string | null
          assinado_ip: unknown
          assinado_por_user_id: string | null
          assinado_user_agent: string | null
          canonical_json: Json | null
          colaborador_id: string | null
          competencia: string | null
          created_at: string | null
          data_assinatura_colaborador: string | null
          data_assinatura_rh: string | null
          empresa_id: string | null
          hash_assinatura_colaborador: string | null
          hash_assinatura_rh: string | null
          hash_sha256: string | null
          id: string
          periodo_fim: string
          periodo_inicio: string
          saldo_banco_horas_periodo: string | null
          status_assinatura: string | null
          total_batidas: number | null
          total_horas_trabalhadas: string | null
        }
        Insert: {
          arquivo_espelho_url?: string | null
          assinado_em?: string | null
          assinado_ip?: unknown
          assinado_por_user_id?: string | null
          assinado_user_agent?: string | null
          canonical_json?: Json | null
          colaborador_id?: string | null
          competencia?: string | null
          created_at?: string | null
          data_assinatura_colaborador?: string | null
          data_assinatura_rh?: string | null
          empresa_id?: string | null
          hash_assinatura_colaborador?: string | null
          hash_assinatura_rh?: string | null
          hash_sha256?: string | null
          id?: string
          periodo_fim: string
          periodo_inicio: string
          saldo_banco_horas_periodo?: string | null
          status_assinatura?: string | null
          total_batidas?: number | null
          total_horas_trabalhadas?: string | null
        }
        Update: {
          arquivo_espelho_url?: string | null
          assinado_em?: string | null
          assinado_ip?: unknown
          assinado_por_user_id?: string | null
          assinado_user_agent?: string | null
          canonical_json?: Json | null
          colaborador_id?: string | null
          competencia?: string | null
          created_at?: string | null
          data_assinatura_colaborador?: string | null
          data_assinatura_rh?: string | null
          empresa_id?: string | null
          hash_assinatura_colaborador?: string | null
          hash_assinatura_rh?: string | null
          hash_sha256?: string | null
          id?: string
          periodo_fim?: string
          periodo_inicio?: string
          saldo_banco_horas_periodo?: string | null
          status_assinatura?: string | null
          total_batidas?: number | null
          total_horas_trabalhadas?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ponto_espelhos_assinados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_espelhos_assinados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_espelhos_assinados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_espelhos_assinados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      ponto_espelhos_revogacoes: {
        Row: {
          espelho_id: string
          id: string
          ip: unknown
          motivo: string
          revogado_em: string
          revogado_por_user_id: string
          user_agent: string | null
        }
        Insert: {
          espelho_id: string
          id?: string
          ip?: unknown
          motivo: string
          revogado_em?: string
          revogado_por_user_id: string
          user_agent?: string | null
        }
        Update: {
          espelho_id?: string
          id?: string
          ip?: unknown
          motivo?: string
          revogado_em?: string
          revogado_por_user_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ponto_espelhos_revogacoes_espelho_id_fkey"
            columns: ["espelho_id"]
            isOneToOne: false
            referencedRelation: "ponto_espelhos_assinados"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_regras_aprovacao: {
        Row: {
          created_at: string | null
          empresa_id: string
          exige_anexo: boolean | null
          id: string
          limite_mensal_solicitacoes: number | null
          niveis_aprovacao: number | null
          sla_horas: number | null
          tipo_solicitacao: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          empresa_id: string
          exige_anexo?: boolean | null
          id?: string
          limite_mensal_solicitacoes?: number | null
          niveis_aprovacao?: number | null
          sla_horas?: number | null
          tipo_solicitacao: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          empresa_id?: string
          exige_anexo?: boolean | null
          id?: string
          limite_mensal_solicitacoes?: number | null
          niveis_aprovacao?: number | null
          sla_horas?: number | null
          tipo_solicitacao?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ponto_seguranca_blacklist: {
        Row: {
          bloqueado_ate: string | null
          bloqueado_em: string | null
          colaborador_id: string | null
          dispositivo_id: string
          id: string
          motivo: string | null
        }
        Insert: {
          bloqueado_ate?: string | null
          bloqueado_em?: string | null
          colaborador_id?: string | null
          dispositivo_id: string
          id?: string
          motivo?: string | null
        }
        Update: {
          bloqueado_ate?: string | null
          bloqueado_em?: string | null
          colaborador_id?: string | null
          dispositivo_id?: string
          id?: string
          motivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ponto_seguranca_blacklist_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_seguranca_blacklist_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_seguranca_blacklist_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_seguranca_blacklist_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      portal_notificacoes_settings: {
        Row: {
          alertar_ferias: boolean | null
          alertar_holerite: boolean | null
          created_at: string | null
          email_alertas: boolean | null
          id: string
          push_alertas: boolean | null
          user_id: string
        }
        Insert: {
          alertar_ferias?: boolean | null
          alertar_holerite?: boolean | null
          created_at?: string | null
          email_alertas?: boolean | null
          id?: string
          push_alertas?: boolean | null
          user_id: string
        }
        Update: {
          alertar_ferias?: boolean | null
          alertar_holerite?: boolean | null
          created_at?: string | null
          email_alertas?: boolean | null
          id?: string
          push_alertas?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      premiacoes_alertas: {
        Row: {
          created_at: string | null
          id: string
          lido: boolean | null
          mensagem: string
          metadata: Json | null
          tipo: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lido?: boolean | null
          mensagem: string
          metadata?: Json | null
          tipo: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lido?: boolean | null
          mensagem?: string
          metadata?: Json | null
          tipo?: string
          user_id?: string | null
        }
        Relationships: []
      }
      premiacoes_auditoria: {
        Row: {
          acao: string
          created_at: string | null
          dados_anteriores: Json | null
          dados_novos: Json | null
          entidade_id: string
          entidade_tipo: string
          id: string
          motivo: string | null
          usuario_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          entidade_id: string
          entidade_tipo: string
          id?: string
          motivo?: string | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          entidade_id?: string
          entidade_tipo?: string
          id?: string
          motivo?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      premiacoes_campanhas: {
        Row: {
          comentarios_aprovacao: Json | null
          created_at: string
          data_fim: string
          data_inicio: string
          descricao: string | null
          empresa_id: string
          id: string
          meta_dados: Json | null
          nome: string
          orcamento_estimado: number | null
          status: string
          status_aprovacao: string | null
          updated_at: string
        }
        Insert: {
          comentarios_aprovacao?: Json | null
          created_at?: string
          data_fim: string
          data_inicio: string
          descricao?: string | null
          empresa_id: string
          id?: string
          meta_dados?: Json | null
          nome: string
          orcamento_estimado?: number | null
          status?: string
          status_aprovacao?: string | null
          updated_at?: string
        }
        Update: {
          comentarios_aprovacao?: Json | null
          created_at?: string
          data_fim?: string
          data_inicio?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          meta_dados?: Json | null
          nome?: string
          orcamento_estimado?: number | null
          status?: string
          status_aprovacao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "premiacoes_campanhas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      premiacoes_cenarios_simulacao: {
        Row: {
          configuracoes: Json
          created_at: string | null
          criado_por: string | null
          empresa_id: string | null
          id: string
          nome: string
        }
        Insert: {
          configuracoes: Json
          created_at?: string | null
          criado_por?: string | null
          empresa_id?: string | null
          id?: string
          nome: string
        }
        Update: {
          configuracoes?: Json
          created_at?: string | null
          criado_por?: string | null
          empresa_id?: string | null
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "premiacoes_cenarios_simulacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      premiacoes_pagamentos: {
        Row: {
          campanha_id: string
          colaborador_id: string
          created_at: string
          data_integracao: string | null
          data_pagamento: string | null
          historico_mudancas: Json | null
          id: string
          integrado_folha: boolean | null
          justificativa_divergencia: string | null
          logs_calculo: Json | null
          observacoes: string | null
          referencia_folha: string | null
          regra_id: string
          status: string
          status_conciliacao: string | null
          updated_at: string
          valor_aprovado: number | null
          valor_calculado: number
          valor_folha_real: number | null
        }
        Insert: {
          campanha_id: string
          colaborador_id: string
          created_at?: string
          data_integracao?: string | null
          data_pagamento?: string | null
          historico_mudancas?: Json | null
          id?: string
          integrado_folha?: boolean | null
          justificativa_divergencia?: string | null
          logs_calculo?: Json | null
          observacoes?: string | null
          referencia_folha?: string | null
          regra_id: string
          status?: string
          status_conciliacao?: string | null
          updated_at?: string
          valor_aprovado?: number | null
          valor_calculado: number
          valor_folha_real?: number | null
        }
        Update: {
          campanha_id?: string
          colaborador_id?: string
          created_at?: string
          data_integracao?: string | null
          data_pagamento?: string | null
          historico_mudancas?: Json | null
          id?: string
          integrado_folha?: boolean | null
          justificativa_divergencia?: string | null
          logs_calculo?: Json | null
          observacoes?: string | null
          referencia_folha?: string | null
          regra_id?: string
          status?: string
          status_conciliacao?: string | null
          updated_at?: string
          valor_aprovado?: number | null
          valor_calculado?: number
          valor_folha_real?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "premiacoes_pagamentos_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "premiacoes_campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premiacoes_pagamentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premiacoes_pagamentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premiacoes_pagamentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premiacoes_pagamentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "premiacoes_pagamentos_regra_id_fkey"
            columns: ["regra_id"]
            isOneToOne: false
            referencedRelation: "premiacoes_regras"
            referencedColumns: ["id"]
          },
        ]
      }
      premiacoes_regras: {
        Row: {
          campanha_id: string
          configuracao: Json | null
          created_at: string
          id: string
          meta_id: string | null
          tipo_calculo: string
          titulo: string
          valor_base: number | null
        }
        Insert: {
          campanha_id: string
          configuracao?: Json | null
          created_at?: string
          id?: string
          meta_id?: string | null
          tipo_calculo: string
          titulo: string
          valor_base?: number | null
        }
        Update: {
          campanha_id?: string
          configuracao?: Json | null
          created_at?: string
          id?: string
          meta_id?: string | null
          tipo_calculo?: string
          titulo?: string
          valor_base?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "premiacoes_regras_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "premiacoes_campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premiacoes_regras_meta_id_fkey"
            columns: ["meta_id"]
            isOneToOne: false
            referencedRelation: "metas_okrs"
            referencedColumns: ["id"]
          },
        ]
      }
      premiacoes_roi_cenarios: {
        Row: {
          configuracoes: Json
          created_at: string | null
          id: string
          nome: string
          resultados: Json
          snapshot_logs: Json | null
          user_id: string | null
        }
        Insert: {
          configuracoes: Json
          created_at?: string | null
          id?: string
          nome: string
          resultados: Json
          snapshot_logs?: Json | null
          user_id?: string | null
        }
        Update: {
          configuracoes?: Json
          created_at?: string | null
          id?: string
          nome?: string
          resultados?: Json
          snapshot_logs?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cargo: string | null
          config_notificacoes: Json | null
          cpf_validado_govbr: boolean | null
          created_at: string
          departamento: string | null
          gov_br_nivel: string | null
          gov_br_vinculado: boolean | null
          govbr_nivel_autenticacao: string | null
          govbr_uid: string | null
          id: string
          nome: string
          notificacoes_email: boolean | null
          notificacoes_push: boolean | null
          role_display: string | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          cargo?: string | null
          config_notificacoes?: Json | null
          cpf_validado_govbr?: boolean | null
          created_at?: string
          departamento?: string | null
          gov_br_nivel?: string | null
          gov_br_vinculado?: boolean | null
          govbr_nivel_autenticacao?: string | null
          govbr_uid?: string | null
          id?: string
          nome?: string
          notificacoes_email?: boolean | null
          notificacoes_push?: boolean | null
          role_display?: string | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          cargo?: string | null
          config_notificacoes?: Json | null
          cpf_validado_govbr?: boolean | null
          created_at?: string
          departamento?: string | null
          gov_br_nivel?: string | null
          gov_br_vinculado?: boolean | null
          govbr_nivel_autenticacao?: string | null
          govbr_uid?: string | null
          id?: string
          nome?: string
          notificacoes_email?: boolean | null
          notificacoes_push?: boolean | null
          role_display?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promo_brindes: {
        Row: {
          categoria: string | null
          created_at: string
          descricao: string | null
          estoque: number | null
          id: string
          nome: string
          preco: number | null
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          estoque?: number | null
          id?: string
          nome: string
          preco?: number | null
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          estoque?: number | null
          id?: string
          nome?: string
          preco?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      promocoes: {
        Row: {
          cargo_anterior_id: string | null
          cargo_novo_id: string | null
          colaborador_id: string | null
          created_at: string
          data_vigencia: string
          id: string
          motivo: string | null
          salario_anterior: number | null
          salario_novo: number | null
        }
        Insert: {
          cargo_anterior_id?: string | null
          cargo_novo_id?: string | null
          colaborador_id?: string | null
          created_at?: string
          data_vigencia: string
          id?: string
          motivo?: string | null
          salario_anterior?: number | null
          salario_novo?: number | null
        }
        Update: {
          cargo_anterior_id?: string | null
          cargo_novo_id?: string | null
          colaborador_id?: string | null
          created_at?: string
          data_vigencia?: string
          id?: string
          motivo?: string | null
          salario_anterior?: number | null
          salario_novo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_promocoes_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_promocoes_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_promocoes_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_promocoes_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "promocoes_cargo_anterior_id_fkey"
            columns: ["cargo_anterior_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promocoes_cargo_novo_id_fkey"
            columns: ["cargo_novo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promocoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promocoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promocoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promocoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      prorrogacoes_afastamento: {
        Row: {
          afastamento_id: string
          created_at: string
          created_by: string | null
          data_fim_anterior: string
          data_fim_nova: string
          data_pericia: string | null
          dias_adicionais: number
          id: string
          motivo: string | null
          numero_beneficio_novo: string | null
        }
        Insert: {
          afastamento_id: string
          created_at?: string
          created_by?: string | null
          data_fim_anterior: string
          data_fim_nova: string
          data_pericia?: string | null
          dias_adicionais: number
          id?: string
          motivo?: string | null
          numero_beneficio_novo?: string | null
        }
        Update: {
          afastamento_id?: string
          created_at?: string
          created_by?: string | null
          data_fim_anterior?: string
          data_fim_nova?: string
          data_pericia?: string | null
          dias_adicionais?: number
          id?: string
          motivo?: string | null
          numero_beneficio_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prorrogacoes_afastamento_afastamento_id_fkey"
            columns: ["afastamento_id"]
            isOneToOne: false
            referencedRelation: "afastamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      provisao_auditoria: {
        Row: {
          created_at: string | null
          id: string
          motivo: string | null
          provisao_id: string
          usuario_id: string | null
          valor_anterior: number | null
          valor_novo: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          motivo?: string | null
          provisao_id: string
          usuario_id?: string | null
          valor_anterior?: number | null
          valor_novo?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          motivo?: string | null
          provisao_id?: string
          usuario_id?: string | null
          valor_anterior?: number | null
          valor_novo?: number | null
        }
        Relationships: []
      }
      provisao_logs: {
        Row: {
          competencia: string
          created_at: string | null
          duracao_ms: number | null
          empresa_id: string
          erro_mensagem: string | null
          id: string
          metadados: Json | null
          status: string
          tipo_calculo: string | null
          total_colaboradores: number | null
          usuario_id: string | null
          valor_total_provisionado: number | null
        }
        Insert: {
          competencia: string
          created_at?: string | null
          duracao_ms?: number | null
          empresa_id: string
          erro_mensagem?: string | null
          id?: string
          metadados?: Json | null
          status: string
          tipo_calculo?: string | null
          total_colaboradores?: number | null
          usuario_id?: string | null
          valor_total_provisionado?: number | null
        }
        Update: {
          competencia?: string
          created_at?: string | null
          duracao_ms?: number | null
          empresa_id?: string
          erro_mensagem?: string | null
          id?: string
          metadados?: Json | null
          status?: string
          tipo_calculo?: string | null
          total_colaboradores?: number | null
          usuario_id?: string | null
          valor_total_provisionado?: number | null
        }
        Relationships: []
      }
      provisoes_folha: {
        Row: {
          colaborador_id: string
          competencia: string
          created_at: string | null
          empresa_id: string
          encargos_provisao: number | null
          id: string
          valor_13_salario: number | null
          valor_ferias: number | null
        }
        Insert: {
          colaborador_id: string
          competencia: string
          created_at?: string | null
          empresa_id: string
          encargos_provisao?: number | null
          id?: string
          valor_13_salario?: number | null
          valor_ferias?: number | null
        }
        Update: {
          colaborador_id?: string
          competencia?: string
          created_at?: string | null
          empresa_id?: string
          encargos_provisao?: number | null
          id?: string
          valor_13_salario?: number | null
          valor_ferias?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "provisoes_folha_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provisoes_folha_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provisoes_folha_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provisoes_folha_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "provisoes_folha_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      provisoes_mensais: {
        Row: {
          colaborador_id: string
          competencia: string
          created_at: string
          empresa_id: string
          encargos_fgts: number
          encargos_inss: number
          id: string
          log_id: string | null
          tipo: string
          total: number | null
          updated_at: string
          valor_principal: number
        }
        Insert: {
          colaborador_id: string
          competencia: string
          created_at?: string
          empresa_id: string
          encargos_fgts?: number
          encargos_inss?: number
          id?: string
          log_id?: string | null
          tipo: string
          total?: number | null
          updated_at?: string
          valor_principal?: number
        }
        Update: {
          colaborador_id?: string
          competencia?: string
          created_at?: string
          empresa_id?: string
          encargos_fgts?: number
          encargos_inss?: number
          id?: string
          log_id?: string | null
          tipo?: string
          total?: number | null
          updated_at?: string
          valor_principal?: number
        }
        Relationships: [
          {
            foreignKeyName: "provisoes_mensais_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provisoes_mensais_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provisoes_mensais_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provisoes_mensais_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "provisoes_mensais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provisoes_mensais_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "provisao_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          active: boolean | null
          created_at: string | null
          device_info: string | null
          id: string
          subscription: Json
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          device_info?: string | null
          id?: string
          subscription: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          device_info?: string | null
          id?: string
          subscription?: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      query_telemetry: {
        Row: {
          count_mode: string | null
          created_at: string
          duration_ms: number
          error_message: string | null
          id: string
          operation: string
          query_limit: number | null
          query_offset: number | null
          record_count: number | null
          rpc_name: string | null
          severity: string
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          count_mode?: string | null
          created_at?: string
          duration_ms?: number
          error_message?: string | null
          id?: string
          operation: string
          query_limit?: number | null
          query_offset?: number | null
          record_count?: number | null
          rpc_name?: string | null
          severity?: string
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          count_mode?: string | null
          created_at?: string
          duration_ms?: number
          error_message?: string | null
          id?: string
          operation?: string
          query_limit?: number | null
          query_offset?: number | null
          record_count?: number | null
          rpc_name?: string | null
          severity?: string
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      rate_limit_config: {
        Row: {
          block_duration_seconds: number
          created_at: string | null
          enabled: boolean | null
          endpoint: string
          id: string
          max_requests: number
          updated_at: string | null
          window_seconds: number
        }
        Insert: {
          block_duration_seconds?: number
          created_at?: string | null
          enabled?: boolean | null
          endpoint: string
          id?: string
          max_requests?: number
          updated_at?: string | null
          window_seconds?: number
        }
        Update: {
          block_duration_seconds?: number
          created_at?: string | null
          enabled?: boolean | null
          endpoint?: string
          id?: string
          max_requests?: number
          updated_at?: string | null
          window_seconds?: number
        }
        Relationships: []
      }
      rate_limit_logs: {
        Row: {
          blocked: boolean | null
          created_at: string | null
          endpoint: string
          id: string
          ip_address: string
          request_count: number | null
          user_id: string | null
          window_start: string | null
        }
        Insert: {
          blocked?: boolean | null
          created_at?: string | null
          endpoint: string
          id?: string
          ip_address: string
          request_count?: number | null
          user_id?: string | null
          window_start?: string | null
        }
        Update: {
          blocked?: boolean | null
          created_at?: string | null
          endpoint?: string
          id?: string
          ip_address?: string
          request_count?: number | null
          user_id?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string | null
          id: string
          key: string
          timestamp: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          timestamp: number
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          timestamp?: number
        }
        Relationships: []
      }
      recargas_vale: {
        Row: {
          colaborador_id: string | null
          created_at: string
          data_recarga: string | null
          id: string
          mes_referencia: string | null
          origem_recurso: string | null
          status: string | null
          vale_id: string | null
          valor: number
        }
        Insert: {
          colaborador_id?: string | null
          created_at?: string
          data_recarga?: string | null
          id?: string
          mes_referencia?: string | null
          origem_recurso?: string | null
          status?: string | null
          vale_id?: string | null
          valor: number
        }
        Update: {
          colaborador_id?: string | null
          created_at?: string
          data_recarga?: string | null
          id?: string
          mes_referencia?: string | null
          origem_recurso?: string | null
          status?: string | null
          vale_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_recargas_vale_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_recargas_vale_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_recargas_vale_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_recargas_vale_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "recargas_vale_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recargas_vale_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recargas_vale_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recargas_vale_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "recargas_vale_vale_id_fkey"
            columns: ["vale_id"]
            isOneToOne: false
            referencedRelation: "vales_alimentacao"
            referencedColumns: ["id"]
          },
        ]
      }
      recrutamento_agendamentos: {
        Row: {
          candidatura_id: string | null
          created_at: string | null
          data_hora: string
          duracao_minutos: number | null
          empresa_id: string
          feedback_entrevistador: string | null
          id: string
          local_link: string | null
          responsavel_id: string | null
          status: string | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          candidatura_id?: string | null
          created_at?: string | null
          data_hora: string
          duracao_minutos?: number | null
          empresa_id: string
          feedback_entrevistador?: string | null
          id?: string
          local_link?: string | null
          responsavel_id?: string | null
          status?: string | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          candidatura_id?: string | null
          created_at?: string | null
          data_hora?: string
          duracao_minutos?: number | null
          empresa_id?: string
          feedback_entrevistador?: string | null
          id?: string
          local_link?: string | null
          responsavel_id?: string | null
          status?: string | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recrutamento_agendamentos_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
        ]
      }
      recrutamento_anotacoes: {
        Row: {
          anotacao: string
          candidatura_id: string | null
          created_at: string
          id: string
          privada: boolean | null
          usuario_id: string | null
        }
        Insert: {
          anotacao: string
          candidatura_id?: string | null
          created_at?: string
          id?: string
          privada?: boolean | null
          usuario_id?: string | null
        }
        Update: {
          anotacao?: string
          candidatura_id?: string | null
          created_at?: string
          id?: string
          privada?: boolean | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recrutamento_anotacoes_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
        ]
      }
      recrutamento_entrevistas: {
        Row: {
          candidatura_id: string | null
          created_at: string
          data_hora: string
          entrevistador_id: string | null
          feedback: string | null
          id: string
          local_link: string | null
          nota: number | null
          status: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          candidatura_id?: string | null
          created_at?: string
          data_hora: string
          entrevistador_id?: string | null
          feedback?: string | null
          id?: string
          local_link?: string | null
          nota?: number | null
          status?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          candidatura_id?: string | null
          created_at?: string
          data_hora?: string
          entrevistador_id?: string | null
          feedback?: string | null
          id?: string
          local_link?: string | null
          nota?: number | null
          status?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recrutamento_entrevistas_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
        ]
      }
      recrutamento_testes: {
        Row: {
          candidatura_id: string | null
          comentarios: string | null
          created_at: string
          data_entrega: string | null
          data_envio: string | null
          id: string
          nome_teste: string
          nota: number | null
          status: string | null
          updated_at: string
          url_teste: string | null
        }
        Insert: {
          candidatura_id?: string | null
          comentarios?: string | null
          created_at?: string
          data_entrega?: string | null
          data_envio?: string | null
          id?: string
          nome_teste: string
          nota?: number | null
          status?: string | null
          updated_at?: string
          url_teste?: string | null
        }
        Update: {
          candidatura_id?: string | null
          comentarios?: string | null
          created_at?: string
          data_entrega?: string | null
          data_envio?: string | null
          id?: string
          nome_teste?: string
          nota?: number | null
          status?: string | null
          updated_at?: string
          url_teste?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recrutamento_testes_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_ponto: {
        Row: {
          aprovado: boolean | null
          aprovado_em: string | null
          aprovado_por: string | null
          atraso_minutos: number | null
          colaborador_id: string
          created_at: string
          created_by: string | null
          data: string
          dispositivo_id: string | null
          empresa_id: string | null
          entrada_1: string | null
          entrada_2: string | null
          entrada_3: string | null
          entrada_4: string | null
          entrada_5: string | null
          entrada_6: string | null
          entrada_esperada: string | null
          hash_digital: string | null
          hash_integridade: string | null
          horas_extras: string | null
          horas_falta: string | null
          horas_trabalhadas: string | null
          id: string
          is_offline: boolean | null
          justificativa: string | null
          observacoes: string | null
          retorno_intervalo: string | null
          saida_1: string | null
          saida_2: string | null
          saida_3: string | null
          saida_4: string | null
          saida_5: string | null
          saida_6: string | null
          saida_antecipada_minutos: number | null
          saida_esperada: string | null
          saida_intervalo: string | null
          sync_at: string | null
          timezone: string | null
          tipo_dia: string | null
          total_batidas: number | null
          updated_at: string
          versao_app: string | null
          version: number | null
        }
        Insert: {
          aprovado?: boolean | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          atraso_minutos?: number | null
          colaborador_id: string
          created_at?: string
          created_by?: string | null
          data: string
          dispositivo_id?: string | null
          empresa_id?: string | null
          entrada_1?: string | null
          entrada_2?: string | null
          entrada_3?: string | null
          entrada_4?: string | null
          entrada_5?: string | null
          entrada_6?: string | null
          entrada_esperada?: string | null
          hash_digital?: string | null
          hash_integridade?: string | null
          horas_extras?: string | null
          horas_falta?: string | null
          horas_trabalhadas?: string | null
          id?: string
          is_offline?: boolean | null
          justificativa?: string | null
          observacoes?: string | null
          retorno_intervalo?: string | null
          saida_1?: string | null
          saida_2?: string | null
          saida_3?: string | null
          saida_4?: string | null
          saida_5?: string | null
          saida_6?: string | null
          saida_antecipada_minutos?: number | null
          saida_esperada?: string | null
          saida_intervalo?: string | null
          sync_at?: string | null
          timezone?: string | null
          tipo_dia?: string | null
          total_batidas?: number | null
          updated_at?: string
          versao_app?: string | null
          version?: number | null
        }
        Update: {
          aprovado?: boolean | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          atraso_minutos?: number | null
          colaborador_id?: string
          created_at?: string
          created_by?: string | null
          data?: string
          dispositivo_id?: string | null
          empresa_id?: string | null
          entrada_1?: string | null
          entrada_2?: string | null
          entrada_3?: string | null
          entrada_4?: string | null
          entrada_5?: string | null
          entrada_6?: string | null
          entrada_esperada?: string | null
          hash_digital?: string | null
          hash_integridade?: string | null
          horas_extras?: string | null
          horas_falta?: string | null
          horas_trabalhadas?: string | null
          id?: string
          is_offline?: boolean | null
          justificativa?: string | null
          observacoes?: string | null
          retorno_intervalo?: string | null
          saida_1?: string | null
          saida_2?: string | null
          saida_3?: string | null
          saida_4?: string | null
          saida_5?: string | null
          saida_6?: string | null
          saida_antecipada_minutos?: number | null
          saida_esperada?: string | null
          saida_intervalo?: string | null
          sync_at?: string | null
          timezone?: string | null
          tipo_dia?: string | null
          total_batidas?: number | null
          updated_at?: string
          versao_app?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_registros_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_registros_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_registros_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_registros_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_registros_ponto_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "registros_ponto_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      relacionamentos_contato_emergencia: {
        Row: {
          created_at: string | null
          id: number
          nome: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          nome: string
        }
        Update: {
          created_at?: string | null
          id?: number
          nome?: string
        }
        Relationships: []
      }
      relacionamentos_dependentes: {
        Row: {
          codigo_esocial: string | null
          created_at: string | null
          descricao: string | null
          id: number
          nome: string
        }
        Insert: {
          codigo_esocial?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: number
          nome: string
        }
        Update: {
          codigo_esocial?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: number
          nome?: string
        }
        Relationships: []
      }
      relatorios_agendados: {
        Row: {
          ativo: boolean | null
          created_at: string
          created_by: string | null
          dia_mes: number | null
          dia_semana: number | null
          email_destinatario: string
          empresa_id: string | null
          formato: string
          frequencia: string
          hora_envio: string
          id: string
          nome: string
          parametros: Json | null
          proximo_envio: string | null
          tipo_relatorio: string
          ultimo_envio: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          created_by?: string | null
          dia_mes?: number | null
          dia_semana?: number | null
          email_destinatario: string
          empresa_id?: string | null
          formato?: string
          frequencia: string
          hora_envio?: string
          id?: string
          nome: string
          parametros?: Json | null
          proximo_envio?: string | null
          tipo_relatorio: string
          ultimo_envio?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          created_by?: string | null
          dia_mes?: number | null
          dia_semana?: number | null
          email_destinatario?: string
          empresa_id?: string | null
          formato?: string
          frequencia?: string
          hora_envio?: string
          id?: string
          nome?: string
          parametros?: Json | null
          proximo_envio?: string | null
          tipo_relatorio?: string
          ultimo_envio?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_relatorios_agendados_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_agendados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          permission_code: string
          role: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          permission_code: string
          role: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          permission_code?: string
          role?: string
        }
        Relationships: []
      }
      rubricas_folha: {
        Row: {
          ativo: boolean | null
          automatico: boolean | null
          codigo: string
          codigo_esocial: string | null
          created_at: string
          descricao: string
          empresa_id: string | null
          formula: string | null
          id: string
          incide_fgts: boolean | null
          incide_inss: boolean | null
          incide_irrf: boolean | null
          natureza_rubrica: string | null
          tipo: Database["public"]["Enums"]["tipo_evento_folha"]
        }
        Insert: {
          ativo?: boolean | null
          automatico?: boolean | null
          codigo: string
          codigo_esocial?: string | null
          created_at?: string
          descricao: string
          empresa_id?: string | null
          formula?: string | null
          id?: string
          incide_fgts?: boolean | null
          incide_inss?: boolean | null
          incide_irrf?: boolean | null
          natureza_rubrica?: string | null
          tipo: Database["public"]["Enums"]["tipo_evento_folha"]
        }
        Update: {
          ativo?: boolean | null
          automatico?: boolean | null
          codigo?: string
          codigo_esocial?: string | null
          created_at?: string
          descricao?: string
          empresa_id?: string | null
          formula?: string | null
          id?: string
          incide_fgts?: boolean | null
          incide_inss?: boolean | null
          incide_irrf?: boolean | null
          natureza_rubrica?: string | null
          tipo?: Database["public"]["Enums"]["tipo_evento_folha"]
        }
        Relationships: [
          {
            foreignKeyName: "rubricas_folha_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_filters: {
        Row: {
          created_at: string
          entity_type: string
          filters: Json | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_type: string
          filters?: Json | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          filters?: Json | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_alerts: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sefip_arquivos: {
        Row: {
          competencia: string
          conteudo: string | null
          created_at: string
          empresa_id: string | null
          id: string
          modalidade: number | null
          status: string | null
          total_colaboradores: number | null
          total_fgts: number | null
          total_remuneracao: number | null
          updated_at: string
        }
        Insert: {
          competencia: string
          conteudo?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          modalidade?: number | null
          status?: string | null
          total_colaboradores?: number | null
          total_fgts?: number | null
          total_remuneracao?: number | null
          updated_at?: string
        }
        Update: {
          competencia?: string
          conteudo?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          modalidade?: number | null
          status?: string | null
          total_colaboradores?: number | null
          total_fgts?: number | null
          total_remuneracao?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sefip_arquivos_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sefip_arquivos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      seguros_colaboradores: {
        Row: {
          colaborador_id: string | null
          created_at: string
          data_adesao: string | null
          id: string
          seguro_vida_id: string | null
          status: string | null
        }
        Insert: {
          colaborador_id?: string | null
          created_at?: string
          data_adesao?: string | null
          id?: string
          seguro_vida_id?: string | null
          status?: string | null
        }
        Update: {
          colaborador_id?: string | null
          created_at?: string
          data_adesao?: string | null
          id?: string
          seguro_vida_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_seguros_colaboradores_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_seguros_colaboradores_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_seguros_colaboradores_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_seguros_colaboradores_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "seguros_colaboradores_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seguros_colaboradores_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seguros_colaboradores_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seguros_colaboradores_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "seguros_colaboradores_seguro_vida_id_fkey"
            columns: ["seguro_vida_id"]
            isOneToOne: false
            referencedRelation: "seguros_vida"
            referencedColumns: ["id"]
          },
        ]
      }
      seguros_vida: {
        Row: {
          apolice_numero: string | null
          ativo: boolean | null
          capital_segurado: number | null
          colaborador_id: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          data_vencimento_apolice: string | null
          empresa_id: string | null
          id: string
          numero_apolice: string | null
          possui_assistencia_funeral: boolean | null
          premio_mensal: number | null
          seguradora: string | null
        }
        Insert: {
          apolice_numero?: string | null
          ativo?: boolean | null
          capital_segurado?: number | null
          colaborador_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          data_vencimento_apolice?: string | null
          empresa_id?: string | null
          id?: string
          numero_apolice?: string | null
          possui_assistencia_funeral?: boolean | null
          premio_mensal?: number | null
          seguradora?: string | null
        }
        Update: {
          apolice_numero?: string | null
          ativo?: boolean | null
          capital_segurado?: number | null
          colaborador_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          data_vencimento_apolice?: string | null
          empresa_id?: string | null
          id?: string
          numero_apolice?: string | null
          possui_assistencia_funeral?: boolean | null
          premio_mensal?: number | null
          seguradora?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_seguros_vida_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_seguros_vida_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_seguros_vida_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_seguros_vida_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_seguros_vida_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seguros_vida_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seguros_vida_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seguros_vida_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seguros_vida_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "seguros_vida_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      simulacoes_fiscais: {
        Row: {
          configuracao: Json
          created_at: string | null
          descricao: string | null
          empresa_id: string | null
          id: string
          resultado: Json
          titulo: string
          usuario_id: string | null
        }
        Insert: {
          configuracao: Json
          created_at?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          resultado: Json
          titulo: string
          usuario_id?: string | null
        }
        Update: {
          configuracao?: Json
          created_at?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          resultado?: Json
          titulo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "simulacoes_fiscais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      sindicatos: {
        Row: {
          cnpj: string | null
          contribuicao_mensal: number | null
          created_at: string
          data_base: string | null
          email: string | null
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          cnpj?: string | null
          contribuicao_mensal?: number | null
          created_at?: string
          data_base?: string | null
          email?: string | null
          id?: string
          nome: string
          telefone?: string | null
        }
        Update: {
          cnpj?: string | null
          contribuicao_mensal?: number | null
          created_at?: string
          data_base?: string | null
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      sinistros_seguro: {
        Row: {
          colaborador_id: string | null
          created_at: string
          data_sinistro: string | null
          descricao: string | null
          id: string
          seguro_vida_id: string | null
          status: string | null
          tipo: string | null
        }
        Insert: {
          colaborador_id?: string | null
          created_at?: string
          data_sinistro?: string | null
          descricao?: string | null
          id?: string
          seguro_vida_id?: string | null
          status?: string | null
          tipo?: string | null
        }
        Update: {
          colaborador_id?: string | null
          created_at?: string
          data_sinistro?: string | null
          descricao?: string | null
          id?: string
          seguro_vida_id?: string | null
          status?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sinistros_seguro_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sinistros_seguro_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sinistros_seguro_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sinistros_seguro_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "sinistros_seguro_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinistros_seguro_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinistros_seguro_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinistros_seguro_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "sinistros_seguro_seguro_vida_id_fkey"
            columns: ["seguro_vida_id"]
            isOneToOne: false
            referencedRelation: "seguros_vida"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_ajuste_ponto: {
        Row: {
          analisado_por: string | null
          aprovado_por: string | null
          colaborador_id: string
          created_at: string | null
          data_analise: string | null
          data_ponto: string
          empresa_id: string
          hora_original: string | null
          hora_sugerida: string
          id: string
          motivo: string
          observacoes_gestor: string | null
          rascunho: boolean | null
          relatorio_conformidade: Json | null
          status: string | null
          tipo_ponto: string
          updated_at: string | null
        }
        Insert: {
          analisado_por?: string | null
          aprovado_por?: string | null
          colaborador_id: string
          created_at?: string | null
          data_analise?: string | null
          data_ponto: string
          empresa_id: string
          hora_original?: string | null
          hora_sugerida: string
          id?: string
          motivo: string
          observacoes_gestor?: string | null
          rascunho?: boolean | null
          relatorio_conformidade?: Json | null
          status?: string | null
          tipo_ponto: string
          updated_at?: string | null
        }
        Update: {
          analisado_por?: string | null
          aprovado_por?: string | null
          colaborador_id?: string
          created_at?: string | null
          data_analise?: string | null
          data_ponto?: string
          empresa_id?: string
          hora_original?: string | null
          hora_sugerida?: string
          id?: string
          motivo?: string
          observacoes_gestor?: string | null
          rascunho?: boolean | null
          relatorio_conformidade?: Json | null
          status?: string | null
          tipo_ponto?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_ajuste_ponto_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_ajuste_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_ajuste_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_ajuste_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_ajuste_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "solicitacoes_ajuste_ponto_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_hora_extra: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          colaborador_id: string
          created_at: string
          created_by: string | null
          data: string
          empresa_id: string | null
          horas_solicitadas: number
          id: string
          motivo: string
          observacoes_aprovador: string | null
          status: string
          updated_at: string
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          colaborador_id: string
          created_at?: string
          created_by?: string | null
          data: string
          empresa_id?: string | null
          horas_solicitadas: number
          id?: string
          motivo: string
          observacoes_aprovador?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          colaborador_id?: string
          created_at?: string
          created_by?: string | null
          data?: string
          empresa_id?: string | null
          horas_solicitadas?: number
          id?: string
          motivo?: string
          observacoes_aprovador?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_solicitacoes_hora_extra_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_solicitacoes_hora_extra_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_solicitacoes_hora_extra_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_solicitacoes_hora_extra_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_solicitacoes_hora_extra_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_hora_extra_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_hora_extra_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_hora_extra_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_hora_extra_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "solicitacoes_hora_extra_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      sst_cat: {
        Row: {
          agente_causador: string | null
          agente_causador_codigo: string | null
          atestado_medico_url: string | null
          boletim_ocorrencia_url: string | null
          cat_origem_id: string | null
          cid_principal: string | null
          cid_secundarios: string[] | null
          colaborador_id: string | null
          created_at: string | null
          created_by: string | null
          data_acidente: string
          data_envio_esocial: string | null
          dias_afastamento_estimado: number | null
          empresa_id: string | null
          especificacao_local: string | null
          evento_esocial_id: string | null
          hash_integridade: string | null
          hora_acidente: string | null
          houve_afastamento: boolean | null
          houve_internacao: boolean | null
          houve_obito: boolean | null
          id: string
          iniciativa_cat: string | null
          local_acidente: string | null
          minutos_trabalhados_antes: number | null
          numero_cat: string | null
          observacoes: string | null
          parte_corpo_atingida: string | null
          parte_corpo_codigo: string | null
          prazo_limite_envio: string | null
          protocolo_esocial: string | null
          retifica_cat_id: string | null
          situacao_geradora: string | null
          status_esocial: string | null
          tipo_acidente: string
          tipo_cat: string
          tipo_local: string | null
          ultimo_dia_trabalhado: string | null
          updated_at: string | null
        }
        Insert: {
          agente_causador?: string | null
          agente_causador_codigo?: string | null
          atestado_medico_url?: string | null
          boletim_ocorrencia_url?: string | null
          cat_origem_id?: string | null
          cid_principal?: string | null
          cid_secundarios?: string[] | null
          colaborador_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data_acidente: string
          data_envio_esocial?: string | null
          dias_afastamento_estimado?: number | null
          empresa_id?: string | null
          especificacao_local?: string | null
          evento_esocial_id?: string | null
          hash_integridade?: string | null
          hora_acidente?: string | null
          houve_afastamento?: boolean | null
          houve_internacao?: boolean | null
          houve_obito?: boolean | null
          id?: string
          iniciativa_cat?: string | null
          local_acidente?: string | null
          minutos_trabalhados_antes?: number | null
          numero_cat?: string | null
          observacoes?: string | null
          parte_corpo_atingida?: string | null
          parte_corpo_codigo?: string | null
          prazo_limite_envio?: string | null
          protocolo_esocial?: string | null
          retifica_cat_id?: string | null
          situacao_geradora?: string | null
          status_esocial?: string | null
          tipo_acidente: string
          tipo_cat?: string
          tipo_local?: string | null
          ultimo_dia_trabalhado?: string | null
          updated_at?: string | null
        }
        Update: {
          agente_causador?: string | null
          agente_causador_codigo?: string | null
          atestado_medico_url?: string | null
          boletim_ocorrencia_url?: string | null
          cat_origem_id?: string | null
          cid_principal?: string | null
          cid_secundarios?: string[] | null
          colaborador_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data_acidente?: string
          data_envio_esocial?: string | null
          dias_afastamento_estimado?: number | null
          empresa_id?: string | null
          especificacao_local?: string | null
          evento_esocial_id?: string | null
          hash_integridade?: string | null
          hora_acidente?: string | null
          houve_afastamento?: boolean | null
          houve_internacao?: boolean | null
          houve_obito?: boolean | null
          id?: string
          iniciativa_cat?: string | null
          local_acidente?: string | null
          minutos_trabalhados_antes?: number | null
          numero_cat?: string | null
          observacoes?: string | null
          parte_corpo_atingida?: string | null
          parte_corpo_codigo?: string | null
          prazo_limite_envio?: string | null
          protocolo_esocial?: string | null
          retifica_cat_id?: string | null
          situacao_geradora?: string | null
          status_esocial?: string | null
          tipo_acidente?: string
          tipo_cat?: string
          tipo_local?: string | null
          ultimo_dia_trabalhado?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sst_cat_cat_origem_id_fkey"
            columns: ["cat_origem_id"]
            isOneToOne: false
            referencedRelation: "sst_cat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sst_cat_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sst_cat_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sst_cat_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sst_cat_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "sst_cat_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sst_cat_retifica_cat_id_fkey"
            columns: ["retifica_cat_id"]
            isOneToOne: false
            referencedRelation: "sst_cat"
            referencedColumns: ["id"]
          },
        ]
      }
      sst_cat_anexos: {
        Row: {
          cat_id: string
          created_at: string
          file_name: string
          file_size_bytes: number | null
          file_url: string
          id: string
          tipo: string
          uploaded_by: string | null
        }
        Insert: {
          cat_id: string
          created_at?: string
          file_name: string
          file_size_bytes?: number | null
          file_url: string
          id?: string
          tipo: string
          uploaded_by?: string | null
        }
        Update: {
          cat_id?: string
          created_at?: string
          file_name?: string
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          tipo?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sst_cat_anexos_cat_id_fkey"
            columns: ["cat_id"]
            isOneToOne: false
            referencedRelation: "sst_cat"
            referencedColumns: ["id"]
          },
        ]
      }
      sst_cat_testemunhas: {
        Row: {
          cat_id: string
          cpf: string | null
          created_at: string
          depoimento: string | null
          endereco: string | null
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          cat_id: string
          cpf?: string | null
          created_at?: string
          depoimento?: string | null
          endereco?: string | null
          id?: string
          nome: string
          telefone?: string | null
        }
        Update: {
          cat_id?: string
          cpf?: string | null
          created_at?: string
          depoimento?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sst_cat_testemunhas_cat_id_fkey"
            columns: ["cat_id"]
            isOneToOne: false
            referencedRelation: "sst_cat"
            referencedColumns: ["id"]
          },
        ]
      }
      sst_exposicao_riscos: {
        Row: {
          agente_nocivo_codigo: string | null
          ambiente_id: string | null
          colaborador_id: string | null
          created_at: string | null
          data_fim_exposicao: string | null
          data_inicio_exposicao: string
          epi_eficaz: boolean | null
          id: string
          intensidade_concentracao: string | null
          status_esocial: string | null
          tecnica_utilizada: string | null
        }
        Insert: {
          agente_nocivo_codigo?: string | null
          ambiente_id?: string | null
          colaborador_id?: string | null
          created_at?: string | null
          data_fim_exposicao?: string | null
          data_inicio_exposicao: string
          epi_eficaz?: boolean | null
          id?: string
          intensidade_concentracao?: string | null
          status_esocial?: string | null
          tecnica_utilizada?: string | null
        }
        Update: {
          agente_nocivo_codigo?: string | null
          ambiente_id?: string | null
          colaborador_id?: string | null
          created_at?: string | null
          data_fim_exposicao?: string | null
          data_inicio_exposicao?: string
          epi_eficaz?: boolean | null
          id?: string
          intensidade_concentracao?: string | null
          status_esocial?: string | null
          tecnica_utilizada?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sst_exposicao_riscos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sst_exposicao_riscos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sst_exposicao_riscos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sst_exposicao_riscos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      sst_extintores: {
        Row: {
          capacidade_kg: number
          codigo_patrimonio: string
          created_at: string
          created_by: string | null
          data_fabricacao: string | null
          data_proxima_recarga: string
          data_proximo_teste_hidrostatico: string
          data_ultima_recarga: string | null
          data_ultimo_teste_hidrostatico: string | null
          deleted_at: string | null
          empresa_id: string
          fabricante: string | null
          id: string
          latitude: number | null
          local_trabalho_id: string | null
          localizacao: string
          longitude: number | null
          numero_serie: string | null
          observacoes: string | null
          qr_code: string | null
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          capacidade_kg: number
          codigo_patrimonio: string
          created_at?: string
          created_by?: string | null
          data_fabricacao?: string | null
          data_proxima_recarga: string
          data_proximo_teste_hidrostatico: string
          data_ultima_recarga?: string | null
          data_ultimo_teste_hidrostatico?: string | null
          deleted_at?: string | null
          empresa_id: string
          fabricante?: string | null
          id?: string
          latitude?: number | null
          local_trabalho_id?: string | null
          localizacao: string
          longitude?: number | null
          numero_serie?: string | null
          observacoes?: string | null
          qr_code?: string | null
          status?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          capacidade_kg?: number
          codigo_patrimonio?: string
          created_at?: string
          created_by?: string | null
          data_fabricacao?: string | null
          data_proxima_recarga?: string
          data_proximo_teste_hidrostatico?: string
          data_ultima_recarga?: string | null
          data_ultimo_teste_hidrostatico?: string | null
          deleted_at?: string | null
          empresa_id?: string
          fabricante?: string | null
          id?: string
          latitude?: number | null
          local_trabalho_id?: string | null
          localizacao?: string
          longitude?: number | null
          numero_serie?: string | null
          observacoes?: string | null
          qr_code?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sst_extintores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sst_extintores_local_trabalho_id_fkey"
            columns: ["local_trabalho_id"]
            isOneToOne: false
            referencedRelation: "locais_trabalho"
            referencedColumns: ["id"]
          },
        ]
      }
      sst_extintores_inspecoes: {
        Row: {
          acesso_desobstruido: boolean
          altura_correta: boolean
          corpo_integro: boolean
          created_at: string
          data_inspecao: string
          empresa_id: string
          extintor_id: string
          foto_url: string | null
          id: string
          inspetor_id: string | null
          inspetor_nome: string
          ip_address: unknown
          lacre_ok: boolean
          latitude: number | null
          longitude: number | null
          mangueira_ok: boolean
          observacoes: string | null
          pressao_ok: boolean
          resultado: string
          sinalizacao_ok: boolean
        }
        Insert: {
          acesso_desobstruido?: boolean
          altura_correta?: boolean
          corpo_integro?: boolean
          created_at?: string
          data_inspecao?: string
          empresa_id: string
          extintor_id: string
          foto_url?: string | null
          id?: string
          inspetor_id?: string | null
          inspetor_nome: string
          ip_address?: unknown
          lacre_ok?: boolean
          latitude?: number | null
          longitude?: number | null
          mangueira_ok?: boolean
          observacoes?: string | null
          pressao_ok?: boolean
          resultado: string
          sinalizacao_ok?: boolean
        }
        Update: {
          acesso_desobstruido?: boolean
          altura_correta?: boolean
          corpo_integro?: boolean
          created_at?: string
          data_inspecao?: string
          empresa_id?: string
          extintor_id?: string
          foto_url?: string | null
          id?: string
          inspetor_id?: string | null
          inspetor_nome?: string
          ip_address?: unknown
          lacre_ok?: boolean
          latitude?: number | null
          longitude?: number | null
          mangueira_ok?: boolean
          observacoes?: string | null
          pressao_ok?: boolean
          resultado?: string
          sinalizacao_ok?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "sst_extintores_inspecoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sst_extintores_inspecoes_extintor_id_fkey"
            columns: ["extintor_id"]
            isOneToOne: false
            referencedRelation: "sst_extintores"
            referencedColumns: ["id"]
          },
        ]
      }
      sst_incidentes: {
        Row: {
          colaborador_id: string | null
          created_at: string | null
          data_hora: string
          descricao: string
          empresa_id: string
          gravidade: number | null
          id: string
          local: string
          medidas_tomadas: string | null
          status: string | null
          testemunhas: Json | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          colaborador_id?: string | null
          created_at?: string | null
          data_hora?: string
          descricao: string
          empresa_id: string
          gravidade?: number | null
          id?: string
          local: string
          medidas_tomadas?: string | null
          status?: string | null
          testemunhas?: Json | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          colaborador_id?: string | null
          created_at?: string | null
          data_hora?: string
          descricao?: string
          empresa_id?: string
          gravidade?: number | null
          id?: string
          local?: string
          medidas_tomadas?: string | null
          status?: string | null
          testemunhas?: Json | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sst_incidentes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sst_incidentes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sst_incidentes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sst_incidentes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      sst_ltcat_laudos: {
        Row: {
          agentes_nocivos: Json
          aposentadoria_especial: Json
          arquivo_path: string | null
          conclusao: string | null
          created_at: string
          data_emissao: string
          data_validade: string | null
          empresa_id: string
          gerado_por: string | null
          ghes_avaliados: Json
          hash_sha256: string | null
          id: string
          medicoes: Json
          metadata: Json
          responsavel_tecnico_nome: string
          responsavel_tecnico_registro: string
          responsavel_tecnico_tipo: string | null
          status: string
          titulo: string
          updated_at: string
          versao: number
        }
        Insert: {
          agentes_nocivos?: Json
          aposentadoria_especial?: Json
          arquivo_path?: string | null
          conclusao?: string | null
          created_at?: string
          data_emissao?: string
          data_validade?: string | null
          empresa_id: string
          gerado_por?: string | null
          ghes_avaliados?: Json
          hash_sha256?: string | null
          id?: string
          medicoes?: Json
          metadata?: Json
          responsavel_tecnico_nome: string
          responsavel_tecnico_registro: string
          responsavel_tecnico_tipo?: string | null
          status?: string
          titulo: string
          updated_at?: string
          versao?: number
        }
        Update: {
          agentes_nocivos?: Json
          aposentadoria_especial?: Json
          arquivo_path?: string | null
          conclusao?: string | null
          created_at?: string
          data_emissao?: string
          data_validade?: string | null
          empresa_id?: string
          gerado_por?: string | null
          ghes_avaliados?: Json
          hash_sha256?: string | null
          id?: string
          medicoes?: Json
          metadata?: Json
          responsavel_tecnico_nome?: string
          responsavel_tecnico_registro?: string
          responsavel_tecnico_tipo?: string | null
          status?: string
          titulo?: string
          updated_at?: string
          versao?: number
        }
        Relationships: []
      }
      sst_ordens_servico: {
        Row: {
          arquivo_path: string | null
          cargo_id: string | null
          colaborador_id: string | null
          created_at: string
          descricao_atividades: string | null
          empresa_id: string
          epis_obrigatorios: Json
          escopo: string
          gerado_por: string | null
          hash_sha256: string | null
          id: string
          medidas_controle: Json
          metadata: Json
          penalidades_descumprimento: string | null
          procedimentos_emergencia: string | null
          responsavel_cargo: string | null
          responsavel_nome: string | null
          responsavel_registro: string | null
          riscos: Json
          status: string
          titulo: string
          updated_at: string
          versao: number
        }
        Insert: {
          arquivo_path?: string | null
          cargo_id?: string | null
          colaborador_id?: string | null
          created_at?: string
          descricao_atividades?: string | null
          empresa_id: string
          epis_obrigatorios?: Json
          escopo: string
          gerado_por?: string | null
          hash_sha256?: string | null
          id?: string
          medidas_controle?: Json
          metadata?: Json
          penalidades_descumprimento?: string | null
          procedimentos_emergencia?: string | null
          responsavel_cargo?: string | null
          responsavel_nome?: string | null
          responsavel_registro?: string | null
          riscos?: Json
          status?: string
          titulo: string
          updated_at?: string
          versao?: number
        }
        Update: {
          arquivo_path?: string | null
          cargo_id?: string | null
          colaborador_id?: string | null
          created_at?: string
          descricao_atividades?: string | null
          empresa_id?: string
          epis_obrigatorios?: Json
          escopo?: string
          gerado_por?: string | null
          hash_sha256?: string | null
          id?: string
          medidas_controle?: Json
          metadata?: Json
          penalidades_descumprimento?: string | null
          procedimentos_emergencia?: string | null
          responsavel_cargo?: string | null
          responsavel_nome?: string | null
          responsavel_registro?: string | null
          riscos?: Json
          status?: string
          titulo?: string
          updated_at?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "sst_ordens_servico_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sst_ordens_servico_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sst_ordens_servico_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sst_ordens_servico_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sst_ordens_servico_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      sst_programas: {
        Row: {
          arquivo_url: string | null
          created_at: string | null
          data_emissao: string
          data_validade: string
          empresa_id: string
          gerado_por: string | null
          hash_sha256: string | null
          id: string
          metadata: Json
          registro_profissional: string | null
          responsavel_tecnico: string | null
          status: string | null
          tipo: string
          titulo: string
          updated_at: string | null
          versao: number
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string | null
          data_emissao: string
          data_validade: string
          empresa_id: string
          gerado_por?: string | null
          hash_sha256?: string | null
          id?: string
          metadata?: Json
          registro_profissional?: string | null
          responsavel_tecnico?: string | null
          status?: string | null
          tipo: string
          titulo: string
          updated_at?: string | null
          versao?: number
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string | null
          data_emissao?: string
          data_validade?: string
          empresa_id?: string
          gerado_por?: string | null
          hash_sha256?: string | null
          id?: string
          metadata?: Json
          registro_profissional?: string | null
          responsavel_tecnico?: string | null
          status?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string | null
          versao?: number
        }
        Relationships: []
      }
      sst_regimento_assinaturas: {
        Row: {
          assinado_em: string
          colaborador_id: string
          created_at: string
          documento_id: string
          empresa_id: string
          hash_assinatura: string
          hash_documento: string
          id: string
          ip_origem: string | null
          user_agent: string | null
        }
        Insert: {
          assinado_em?: string
          colaborador_id: string
          created_at?: string
          documento_id: string
          empresa_id: string
          hash_assinatura: string
          hash_documento: string
          id?: string
          ip_origem?: string | null
          user_agent?: string | null
        }
        Update: {
          assinado_em?: string
          colaborador_id?: string
          created_at?: string
          documento_id?: string
          empresa_id?: string
          hash_assinatura?: string
          hash_documento?: string
          id?: string
          ip_origem?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sst_regimento_assinaturas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sst_regimento_assinaturas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sst_regimento_assinaturas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sst_regimento_assinaturas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "sst_regimento_assinaturas_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "sst_regimento_documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sst_regimento_assinaturas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      sst_regimento_documentos: {
        Row: {
          conteudo_html: string
          created_at: string
          created_by: string | null
          empresa_id: string
          hash_sha256: string | null
          id: string
          observacoes: string | null
          publicado_em: string | null
          publicado_por: string | null
          status: string
          titulo: string
          updated_at: string
          versao: number
        }
        Insert: {
          conteudo_html: string
          created_at?: string
          created_by?: string | null
          empresa_id: string
          hash_sha256?: string | null
          id?: string
          observacoes?: string | null
          publicado_em?: string | null
          publicado_por?: string | null
          status?: string
          titulo: string
          updated_at?: string
          versao?: number
        }
        Update: {
          conteudo_html?: string
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          hash_sha256?: string | null
          id?: string
          observacoes?: string | null
          publicado_em?: string | null
          publicado_por?: string | null
          status?: string
          titulo?: string
          updated_at?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "sst_regimento_documentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      sst_regimento_interno: {
        Row: {
          artigo_clt_base: string | null
          created_at: string | null
          empresa_id: string
          id: string
          infracao_tipo: string
          pontos_gravidade: number | null
          puniciao_sugerida: string
        }
        Insert: {
          artigo_clt_base?: string | null
          created_at?: string | null
          empresa_id: string
          id?: string
          infracao_tipo: string
          pontos_gravidade?: number | null
          puniciao_sugerida: string
        }
        Update: {
          artigo_clt_base?: string | null
          created_at?: string | null
          empresa_id?: string
          id?: string
          infracao_tipo?: string
          pontos_gravidade?: number | null
          puniciao_sugerida?: string
        }
        Relationships: []
      }
      sst_riscos_ambientais: {
        Row: {
          agente: string
          categoria: string
          created_at: string | null
          empresa_id: string
          id: string
          intensidade_concentracao: string | null
          limite_tolerancia: string | null
          local_id: string | null
          tecnica_utilizada: string | null
        }
        Insert: {
          agente: string
          categoria: string
          created_at?: string | null
          empresa_id: string
          id?: string
          intensidade_concentracao?: string | null
          limite_tolerancia?: string | null
          local_id?: string | null
          tecnica_utilizada?: string | null
        }
        Update: {
          agente?: string
          categoria?: string
          created_at?: string | null
          empresa_id?: string
          id?: string
          intensidade_concentracao?: string | null
          limite_tolerancia?: string | null
          local_id?: string | null
          tecnica_utilizada?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sst_riscos_ambientais_local_id_fkey"
            columns: ["local_id"]
            isOneToOne: false
            referencedRelation: "locais_trabalho"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas_onboarding: {
        Row: {
          admissao_id: string | null
          concluida: boolean | null
          concluida_em: string | null
          created_at: string | null
          descricao: string | null
          id: string
          prazo_dias: number | null
          responsavel_id: string | null
          titulo: string
        }
        Insert: {
          admissao_id?: string | null
          concluida?: boolean | null
          concluida_em?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          prazo_dias?: number | null
          responsavel_id?: string | null
          titulo: string
        }
        Update: {
          admissao_id?: string | null
          concluida?: boolean | null
          concluida_em?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          prazo_dias?: number | null
          responsavel_id?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_onboarding_admissao_id_fkey"
            columns: ["admissao_id"]
            isOneToOne: false
            referencedRelation: "admissoes"
            referencedColumns: ["id"]
          },
        ]
      }
      taxas_cambio: {
        Row: {
          created_at: string | null
          data_referencia: string
          id: string
          moeda_destino: string
          moeda_origem: string
          taxa: number
        }
        Insert: {
          created_at?: string | null
          data_referencia: string
          id?: string
          moeda_destino?: string
          moeda_origem: string
          taxa: number
        }
        Update: {
          created_at?: string | null
          data_referencia?: string
          id?: string
          moeda_destino?: string
          moeda_origem?: string
          taxa?: number
        }
        Relationships: []
      }
      tempos_residencia: {
        Row: {
          created_at: string | null
          id: number
          nome: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          nome: string
        }
        Update: {
          created_at?: string | null
          id?: number
          nome?: string
        }
        Relationships: []
      }
      times: {
        Row: {
          ativo: boolean | null
          created_at: string
          departamento_id: string | null
          descricao: string | null
          empresa_id: string | null
          id: string
          lider_id: string | null
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          departamento_id?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          lider_id?: string | null
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          departamento_id?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          lider_id?: string | null
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_times_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "times_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "times_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "times_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "times_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "times_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "times_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      times_brindes: {
        Row: {
          brinde_id: string
          created_at: string
          id: string
          quantidade_alocada: number | null
          time_id: string
        }
        Insert: {
          brinde_id: string
          created_at?: string
          id?: string
          quantidade_alocada?: number | null
          time_id: string
        }
        Update: {
          brinde_id?: string
          created_at?: string
          id?: string
          quantidade_alocada?: number | null
          time_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "times_brindes_brinde_id_fkey"
            columns: ["brinde_id"]
            isOneToOne: false
            referencedRelation: "promo_brindes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "times_brindes_time_id_fkey"
            columns: ["time_id"]
            isOneToOne: false
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_admissao: {
        Row: {
          codigo_esocial: number | null
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          codigo_esocial?: number | null
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          codigo_esocial?: number | null
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      tipos_aviso_previo: {
        Row: {
          created_at: string | null
          id: number
          nome: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          nome: string
        }
        Update: {
          created_at?: string | null
          id?: number
          nome?: string
        }
        Relationships: []
      }
      tipos_beneficio: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string
          desconto_colaborador: number | null
          descricao: string | null
          icone: string | null
          id: string
          nome: string
          operadora: string | null
          valor_padrao: number | null
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string
          desconto_colaborador?: number | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome: string
          operadora?: string | null
          valor_padrao?: number | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string
          desconto_colaborador?: number | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome?: string
          operadora?: string | null
          valor_padrao?: number | null
        }
        Relationships: []
      }
      tipos_deficiencia: {
        Row: {
          created_at: string | null
          id: number
          nome: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          nome: string
        }
        Update: {
          created_at?: string | null
          id?: number
          nome?: string
        }
        Relationships: []
      }
      tipos_desligamento: {
        Row: {
          codigo_esocial: string | null
          created_at: string | null
          id: number
          nome: string
        }
        Insert: {
          codigo_esocial?: string | null
          created_at?: string | null
          id?: number
          nome: string
        }
        Update: {
          codigo_esocial?: string | null
          created_at?: string | null
          id?: number
          nome?: string
        }
        Relationships: []
      }
      tipos_estabilidade: {
        Row: {
          created_at: string
          descricao: string | null
          duracao_meses: number | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          duracao_meses?: number | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          duracao_meses?: number | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      tipos_pagamento: {
        Row: {
          created_at: string | null
          id: number
          nome: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          nome: string
        }
        Update: {
          created_at?: string | null
          id?: number
          nome?: string
        }
        Relationships: []
      }
      tipos_salario: {
        Row: {
          codigo_esocial: string | null
          created_at: string | null
          id: number
          nome: string
        }
        Insert: {
          codigo_esocial?: string | null
          created_at?: string | null
          id?: number
          nome: string
        }
        Update: {
          codigo_esocial?: string | null
          created_at?: string | null
          id?: number
          nome?: string
        }
        Relationships: []
      }
      tipos_visto: {
        Row: {
          created_at: string | null
          id: number
          nome: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          nome: string
        }
        Update: {
          created_at?: string | null
          id?: number
          nome?: string
        }
        Relationships: []
      }
      transferencias: {
        Row: {
          colaborador_id: string
          created_at: string
          data_vigencia: string
          departamento_anterior_id: string | null
          departamento_novo_id: string | null
          id: string
          motivo: string | null
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          data_vigencia: string
          departamento_anterior_id?: string | null
          departamento_novo_id?: string | null
          id?: string
          motivo?: string | null
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          data_vigencia?: string
          departamento_anterior_id?: string | null
          departamento_novo_id?: string | null
          id?: string
          motivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_transferencias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_transferencias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_transferencias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_transferencias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "transferencias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "transferencias_departamento_anterior_id_fkey"
            columns: ["departamento_anterior_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_departamento_novo_id_fkey"
            columns: ["departamento_novo_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      treinamento_certificados: {
        Row: {
          arquivo_url: string | null
          codigo_autenticacao: string | null
          colaborador_id: string | null
          created_at: string | null
          curso_id: string | null
          data_emissao: string
          data_validade: string | null
          id: string
          inscricao_id: string | null
        }
        Insert: {
          arquivo_url?: string | null
          codigo_autenticacao?: string | null
          colaborador_id?: string | null
          created_at?: string | null
          curso_id?: string | null
          data_emissao?: string
          data_validade?: string | null
          id?: string
          inscricao_id?: string | null
        }
        Update: {
          arquivo_url?: string | null
          codigo_autenticacao?: string | null
          colaborador_id?: string | null
          created_at?: string | null
          curso_id?: string | null
          data_emissao?: string
          data_validade?: string | null
          id?: string
          inscricao_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treinamento_certificados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinamento_certificados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinamento_certificados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinamento_certificados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "treinamento_certificados_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "catalogo_cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinamento_certificados_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "inscricoes_cursos"
            referencedColumns: ["id"]
          },
        ]
      }
      treinamento_feedback: {
        Row: {
          aplicabilidade_nota: number | null
          comentario: string | null
          created_at: string
          id: string
          inscricao_id: string | null
          nota_satisfacao: number | null
        }
        Insert: {
          aplicabilidade_nota?: number | null
          comentario?: string | null
          created_at?: string
          id?: string
          inscricao_id?: string | null
          nota_satisfacao?: number | null
        }
        Update: {
          aplicabilidade_nota?: number | null
          comentario?: string | null
          created_at?: string
          id?: string
          inscricao_id?: string | null
          nota_satisfacao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "treinamento_feedback_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "inscricoes_cursos"
            referencedColumns: ["id"]
          },
        ]
      }
      treinamento_feedbacks: {
        Row: {
          comentario: string | null
          created_at: string | null
          id: string
          inscricao_id: string | null
          nota_conteudo: number | null
          nota_instrutor: number | null
          sugestoes: string | null
        }
        Insert: {
          comentario?: string | null
          created_at?: string | null
          id?: string
          inscricao_id?: string | null
          nota_conteudo?: number | null
          nota_instrutor?: number | null
          sugestoes?: string | null
        }
        Update: {
          comentario?: string | null
          created_at?: string | null
          id?: string
          inscricao_id?: string | null
          nota_conteudo?: number | null
          nota_instrutor?: number | null
          sugestoes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treinamento_feedbacks_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: true
            referencedRelation: "inscricoes_cursos"
            referencedColumns: ["id"]
          },
        ]
      }
      treinamento_instancias: {
        Row: {
          capacidade_maxima: number | null
          created_at: string
          curso_id: string | null
          data_fim: string | null
          data_inicio: string
          id: string
          instrutor_id: string | null
          local_link: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          capacidade_maxima?: number | null
          created_at?: string
          curso_id?: string | null
          data_fim?: string | null
          data_inicio: string
          id?: string
          instrutor_id?: string | null
          local_link?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          capacidade_maxima?: number | null
          created_at?: string
          curso_id?: string | null
          data_fim?: string | null
          data_inicio?: string
          id?: string
          instrutor_id?: string | null
          local_link?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treinamento_instancias_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "catalogo_cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinamento_instancias_instrutor_id_fkey"
            columns: ["instrutor_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinamento_instancias_instrutor_id_fkey"
            columns: ["instrutor_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinamento_instancias_instrutor_id_fkey"
            columns: ["instrutor_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinamento_instancias_instrutor_id_fkey"
            columns: ["instrutor_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      treinamento_participantes: {
        Row: {
          colaborador_id: string
          created_at: string
          id: string
          presente: boolean | null
          treinamento_id: string
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          id?: string
          presente?: boolean | null
          treinamento_id: string
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          id?: string
          presente?: boolean | null
          treinamento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_treinamento_participantes_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_treinamento_participantes_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_treinamento_participantes_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_treinamento_participantes_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "treinamento_participantes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinamento_participantes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinamento_participantes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinamento_participantes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "treinamento_participantes_treinamento_id_fkey"
            columns: ["treinamento_id"]
            isOneToOne: false
            referencedRelation: "treinamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      treinamentos: {
        Row: {
          carga_horaria: number | null
          created_at: string
          data: string | null
          descricao: string | null
          empresa_id: string | null
          id: string
          nome: string
        }
        Insert: {
          carga_horaria?: number | null
          created_at?: string
          data?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          nome: string
        }
        Update: {
          carga_horaria?: number | null
          created_at?: string
          data?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_treinamentos_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      triagem_notas: {
        Row: {
          candidatura_id: string
          comentario: string | null
          created_at: string | null
          empresa_id: string
          id: string
          nota: number | null
        }
        Insert: {
          candidatura_id: string
          comentario?: string | null
          created_at?: string | null
          empresa_id: string
          id?: string
          nota?: number | null
        }
        Update: {
          candidatura_id?: string
          comentario?: string | null
          created_at?: string | null
          empresa_id?: string
          id?: string
          nota?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "triagem_notas_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "triagem_notas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      trilha_auditoria_ponto: {
        Row: {
          acao: string
          created_at: string | null
          dados_anteriores: Json | null
          dados_novos: Json | null
          id: string
          ip_address: string | null
          justificativa: string | null
          ponto_id: string | null
          user_agent: string | null
          usuario_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          ip_address?: string | null
          justificativa?: string | null
          ponto_id?: string | null
          user_agent?: string | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          ip_address?: string | null
          justificativa?: string | null
          ponto_id?: string | null
          user_agent?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trilha_auditoria_ponto_ponto_id_fkey"
            columns: ["ponto_id"]
            isOneToOne: false
            referencedRelation: "batidas_ponto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trilha_auditoria_ponto_ponto_id_fkey"
            columns: ["ponto_id"]
            isOneToOne: false
            referencedRelation: "vw_batidas_dia"
            referencedColumns: ["id"]
          },
        ]
      }
      trilhas_aprendizado: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          empresa_id: string | null
          id: string
          nivel: string | null
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          nivel?: string | null
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          nivel?: string | null
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_trilhas_aprendizado_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trilhas_aprendizado_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      trilhas_cursos: {
        Row: {
          curso_id: string
          id: string
          obrigatorio: boolean | null
          ordem: number | null
          trilha_id: string
        }
        Insert: {
          curso_id: string
          id?: string
          obrigatorio?: boolean | null
          ordem?: number | null
          trilha_id: string
        }
        Update: {
          curso_id?: string
          id?: string
          obrigatorio?: boolean | null
          ordem?: number | null
          trilha_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trilhas_cursos_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "catalogo_cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trilhas_cursos_trilha_id_fkey"
            columns: ["trilha_id"]
            isOneToOne: false
            referencedRelation: "trilhas_aprendizado"
            referencedColumns: ["id"]
          },
        ]
      }
      turnos: {
        Row: {
          ativo: boolean | null
          cor: string | null
          created_at: string | null
          empresa_id: string | null
          horario_fim: string
          horario_inicio: string
          id: string
          intervalo_minutos: number | null
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          empresa_id?: string | null
          horario_fim: string
          horario_inicio: string
          id?: string
          intervalo_minutos?: number | null
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          empresa_id?: string | null
          horario_fim?: string
          horario_inicio?: string
          id?: string
          intervalo_minutos?: number | null
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_turnos_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_empresas: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          is_default: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          is_default?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          is_default?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_mfa: {
        Row: {
          backup_codes: string[] | null
          created_at: string | null
          id: string
          mfa_enabled: boolean | null
          mfa_secret: string | null
          mfa_type: string | null
          phone_number: string | null
          recovery_email: string | null
          updated_at: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string | null
          id?: string
          mfa_enabled?: boolean | null
          mfa_secret?: string | null
          mfa_type?: string | null
          phone_number?: string | null
          recovery_email?: string | null
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string | null
          id?: string
          mfa_enabled?: boolean | null
          mfa_secret?: string | null
          mfa_type?: string | null
          phone_number?: string | null
          recovery_email?: string | null
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          device_info: Json | null
          expires_at: string
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_activity: string | null
          location: Json | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          expires_at: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity?: string | null
          location?: Json | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity?: string | null
          location?: Json | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vaga_entrevistas: {
        Row: {
          candidatura_id: string
          created_at: string | null
          data_hora: string
          empresa_id: string
          etapa_id: string
          feedback: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          candidatura_id: string
          created_at?: string | null
          data_hora: string
          empresa_id: string
          etapa_id: string
          feedback?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          candidatura_id?: string
          created_at?: string | null
          data_hora?: string
          empresa_id?: string
          etapa_id?: string
          feedback?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vaga_entrevistas_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaga_entrevistas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaga_entrevistas_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "vaga_etapas"
            referencedColumns: ["id"]
          },
        ]
      }
      vaga_etapas: {
        Row: {
          created_at: string | null
          empresa_id: string
          id: string
          nome: string
          ordem: number
          updated_at: string | null
          vaga_id: string
        }
        Insert: {
          created_at?: string | null
          empresa_id: string
          id?: string
          nome: string
          ordem: number
          updated_at?: string | null
          vaga_id: string
        }
        Update: {
          created_at?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string | null
          vaga_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaga_etapas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaga_etapas_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      vagas: {
        Row: {
          beneficios_oferecidos: string | null
          cargo: string | null
          created_at: string
          data_abertura: string | null
          data_encerramento: string | null
          departamento: string | null
          descricao: string | null
          empresa_id: string | null
          faixa_salarial_max: number | null
          faixa_salarial_min: number | null
          id: string
          modalidade: string | null
          quantidade: number | null
          requisitos: string | null
          responsavel_id: string | null
          status: string | null
          tipo_contrato: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          beneficios_oferecidos?: string | null
          cargo?: string | null
          created_at?: string
          data_abertura?: string | null
          data_encerramento?: string | null
          departamento?: string | null
          descricao?: string | null
          empresa_id?: string | null
          faixa_salarial_max?: number | null
          faixa_salarial_min?: number | null
          id?: string
          modalidade?: string | null
          quantidade?: number | null
          requisitos?: string | null
          responsavel_id?: string | null
          status?: string | null
          tipo_contrato?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          beneficios_oferecidos?: string | null
          cargo?: string | null
          created_at?: string
          data_abertura?: string | null
          data_encerramento?: string | null
          departamento?: string | null
          descricao?: string | null
          empresa_id?: string | null
          faixa_salarial_max?: number | null
          faixa_salarial_min?: number | null
          id?: string
          modalidade?: string | null
          quantidade?: number | null
          requisitos?: string | null
          responsavel_id?: string | null
          status?: string | null
          tipo_contrato?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vagas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vales_alimentacao: {
        Row: {
          ativo: boolean | null
          colaborador_id: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          dias_uteis: number | null
          empresa_id: string | null
          id: string
          tipo: string | null
          updated_at: string
          valor_mensal: number | null
          valor_por_dia: number | null
        }
        Insert: {
          ativo?: boolean | null
          colaborador_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          dias_uteis?: number | null
          empresa_id?: string | null
          id?: string
          tipo?: string | null
          updated_at?: string
          valor_mensal?: number | null
          valor_por_dia?: number | null
        }
        Update: {
          ativo?: boolean | null
          colaborador_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          dias_uteis?: number | null
          empresa_id?: string | null
          id?: string
          tipo?: string | null
          updated_at?: string
          valor_mensal?: number | null
          valor_por_dia?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_vales_alimentacao_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vales_alimentacao_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vales_alimentacao_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vales_alimentacao_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_vales_alimentacao_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vales_alimentacao_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vales_alimentacao_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vales_alimentacao_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vales_alimentacao_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "vales_alimentacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vales_transporte: {
        Row: {
          colaborador_id: string | null
          created_at: string
          desconto: number | null
          dias_uteis: number | null
          id: string
          optante: boolean | null
          percentual_desconto: number | null
          updated_at: string
          valor_diario: number | null
          valor_liquido: number | null
          valor_mensal: number | null
        }
        Insert: {
          colaborador_id?: string | null
          created_at?: string
          desconto?: number | null
          dias_uteis?: number | null
          id?: string
          optante?: boolean | null
          percentual_desconto?: number | null
          updated_at?: string
          valor_diario?: number | null
          valor_liquido?: number | null
          valor_mensal?: number | null
        }
        Update: {
          colaborador_id?: string | null
          created_at?: string
          desconto?: number | null
          dias_uteis?: number | null
          id?: string
          optante?: boolean | null
          percentual_desconto?: number | null
          updated_at?: string
          valor_diario?: number | null
          valor_liquido?: number | null
          valor_mensal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_vales_transporte_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vales_transporte_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vales_transporte_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vales_transporte_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "vales_transporte_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vales_transporte_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vales_transporte_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vales_transporte_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      valores_campos_customizados: {
        Row: {
          campo_customizado_id: string
          colaborador_id: string
          created_at: string
          id: string
          updated_at: string
          valor: string | null
        }
        Insert: {
          campo_customizado_id: string
          colaborador_id: string
          created_at?: string
          id?: string
          updated_at?: string
          valor?: string | null
        }
        Update: {
          campo_customizado_id?: string
          colaborador_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          valor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_valores_campos_customizados_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_valores_campos_customizados_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_valores_campos_customizados_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_valores_campos_customizados_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "valores_campos_customizados_campo_customizado_id_fkey"
            columns: ["campo_customizado_id"]
            isOneToOne: false
            referencedRelation: "campos_customizados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "valores_campos_customizados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "valores_campos_customizados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "valores_campos_customizados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "valores_campos_customizados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      verbas_rescisorias: {
        Row: {
          codigo: string | null
          created_at: string | null
          descricao: string
          desligamento_id: string
          id: string
          incide_fgts: boolean | null
          incide_inss: boolean | null
          incide_irrf: boolean | null
          rubrica_id: string | null
          tipo: string
          valor: number
        }
        Insert: {
          codigo?: string | null
          created_at?: string | null
          descricao: string
          desligamento_id: string
          id?: string
          incide_fgts?: boolean | null
          incide_inss?: boolean | null
          incide_irrf?: boolean | null
          rubrica_id?: string | null
          tipo: string
          valor: number
        }
        Update: {
          codigo?: string | null
          created_at?: string | null
          descricao?: string
          desligamento_id?: string
          id?: string
          incide_fgts?: boolean | null
          incide_inss?: boolean | null
          incide_irrf?: boolean | null
          rubrica_id?: string | null
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "verbas_rescisorias_desligamento_id_fkey"
            columns: ["desligamento_id"]
            isOneToOne: false
            referencedRelation: "desligamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verbas_rescisorias_rubrica_id_fkey"
            columns: ["rubrica_id"]
            isOneToOne: false
            referencedRelation: "rubricas_folha"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token: string
          type: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          type: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          type?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      versao_banco: {
        Row: {
          descricao: string | null
          executado_em: string | null
          id: string
          versao: string
        }
        Insert: {
          descricao?: string | null
          executado_em?: string | null
          id?: string
          versao: string
        }
        Update: {
          descricao?: string | null
          executado_em?: string | null
          id?: string
          versao?: string
        }
        Relationships: []
      }
      vinculos: {
        Row: {
          categoria: string | null
          colaborador_id: string
          created_at: string
          data_fim: string | null
          data_inicio: string
          id: string
          matricula: string | null
          status: string | null
          tipo: string
        }
        Insert: {
          categoria?: string | null
          colaborador_id: string
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          id?: string
          matricula?: string | null
          status?: string | null
          tipo: string
        }
        Update: {
          categoria?: string | null
          colaborador_id?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          matricula?: string | null
          status?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_vinculos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vinculos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vinculos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vinculos_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "vinculos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vinculos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vinculos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vinculos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      webauthn_challenges: {
        Row: {
          challenge: string
          created_at: string
          expires_at: string
          id: string
          type: string
          user_id: string | null
        }
        Insert: {
          challenge: string
          created_at?: string
          expires_at?: string
          id?: string
          type: string
          user_id?: string | null
        }
        Update: {
          challenge?: string
          created_at?: string
          expires_at?: string
          id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      webauthn_credentials: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          device_type: string | null
          friendly_name: string | null
          id: string
          last_used_at: string | null
          public_key: string
          transports: string[] | null
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          device_type?: string | null
          friendly_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          transports?: string[] | null
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          device_type?: string | null
          friendly_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          transports?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string
          duracao_ms: number | null
          erro: string | null
          event_id: string | null
          evento: string
          headers: Json | null
          id: string
          payload: Json | null
          resposta: string | null
          status: string | null
          status_code: number | null
          tentativa: number | null
          version: string | null
          webhook_id: string
        }
        Insert: {
          created_at?: string
          duracao_ms?: number | null
          erro?: string | null
          event_id?: string | null
          evento: string
          headers?: Json | null
          id?: string
          payload?: Json | null
          resposta?: string | null
          status?: string | null
          status_code?: number | null
          tentativa?: number | null
          version?: string | null
          webhook_id: string
        }
        Update: {
          created_at?: string
          duracao_ms?: number | null
          erro?: string | null
          event_id?: string | null
          evento?: string
          headers?: Json | null
          id?: string
          payload?: Json | null
          resposta?: string | null
          status?: string | null
          status_code?: number | null
          tentativa?: number | null
          version?: string | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          ativo: boolean | null
          created_at: string
          empresa_id: string | null
          eventos: string[] | null
          id: string
          max_tentativas: number | null
          nome: string
          retry_intervalo_segundos: number | null
          secret: string | null
          timeout_segundos: number | null
          total_falha: number | null
          total_sucesso: number | null
          ultima_execucao: string | null
          ultimo_erro: string | null
          ultimo_status: number | null
          updated_at: string
          url: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          empresa_id?: string | null
          eventos?: string[] | null
          id?: string
          max_tentativas?: number | null
          nome: string
          retry_intervalo_segundos?: number | null
          secret?: string | null
          timeout_segundos?: number | null
          total_falha?: number | null
          total_sucesso?: number | null
          ultima_execucao?: string | null
          ultimo_erro?: string | null
          ultimo_status?: number | null
          updated_at?: string
          url: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          empresa_id?: string | null
          eventos?: string[] | null
          id?: string
          max_tentativas?: number | null
          nome?: string
          retry_intervalo_segundos?: number | null
          secret?: string | null
          timeout_segundos?: number | null
          total_falha?: number | null
          total_sucesso?: number | null
          ultima_execucao?: string | null
          ultimo_erro?: string | null
          ultimo_status?: number | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_webhooks_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhooks_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks_config: {
        Row: {
          ativo: boolean | null
          created_at: string
          empresa_id: string | null
          eventos: string[]
          id: string
          secret: string | null
          ultimo_envio: string | null
          ultimo_status: number | null
          updated_at: string
          url: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          empresa_id?: string | null
          eventos?: string[]
          id?: string
          secret?: string | null
          ultimo_envio?: string | null
          ultimo_status?: number | null
          updated_at?: string
          url: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          empresa_id?: string | null
          eventos?: string[]
          id?: string
          secret?: string | null
          ultimo_envio?: string | null
          ultimo_status?: number | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_webhooks_config_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhooks_config_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks_logs: {
        Row: {
          created_at: string
          evento: string
          id: string
          payload: Json | null
          resposta: string | null
          status_code: number | null
          webhook_id: string | null
        }
        Insert: {
          created_at?: string
          evento: string
          id?: string
          payload?: Json | null
          resposta?: string | null
          status_code?: number | null
          webhook_id?: string | null
        }
        Update: {
          created_at?: string
          evento?: string
          id?: string
          payload?: Json | null
          resposta?: string | null
          status_code?: number | null
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks_config"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_config: {
        Row: {
          api_key: string | null
          created_at: string
          empresa_id: string
          id: string
          instancia_nome: string | null
          instancia_url: string | null
          notificar_ferias: boolean | null
          notificar_holerite: boolean | null
          notificar_ponto: boolean | null
          status: string | null
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          instancia_nome?: string | null
          instancia_url?: string | null
          notificar_ferias?: boolean | null
          notificar_holerite?: boolean | null
          notificar_ponto?: boolean | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          instancia_nome?: string | null
          instancia_url?: string | null
          notificar_ferias?: boolean | null
          notificar_holerite?: boolean | null
          notificar_ponto?: boolean | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_config_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_mensagens_logs: {
        Row: {
          colaborador_id: string | null
          created_at: string | null
          empresa_id: string
          error_message: string | null
          id: string
          mensagem_id_externo: string | null
          status: string | null
          telefone: string
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          colaborador_id?: string | null
          created_at?: string | null
          empresa_id: string
          error_message?: string | null
          id?: string
          mensagem_id_externo?: string | null
          status?: string | null
          telefone: string
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          colaborador_id?: string | null
          created_at?: string | null
          empresa_id?: string
          error_message?: string | null
          id?: string
          mensagem_id_externo?: string | null
          status?: string | null
          telefone?: string
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_mensagens_logs_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_mensagens_logs_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_mensagens_logs_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_mensagens_logs_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "whatsapp_mensagens_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          categoria: string | null
          conteudo: string
          created_at: string | null
          empresa_id: string
          id: string
          nome: string
          status: string | null
        }
        Insert: {
          categoria?: string | null
          conteudo: string
          created_at?: string | null
          empresa_id: string
          id?: string
          nome: string
          status?: string | null
        }
        Update: {
          categoria?: string | null
          conteudo?: string
          created_at?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          status?: string | null
        }
        Relationships: []
      }
      workflows_config: {
        Row: {
          acao_tipo: string
          ativo: boolean | null
          configuracao: Json | null
          created_at: string | null
          empresa_id: string | null
          evento_tipo: string
          id: string
          updated_at: string | null
        }
        Insert: {
          acao_tipo: string
          ativo?: boolean | null
          configuracao?: Json | null
          created_at?: string | null
          empresa_id?: string | null
          evento_tipo: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          acao_tipo?: string
          ativo?: boolean | null
          configuracao?: Json | null
          created_at?: string | null
          empresa_id?: string | null
          evento_tipo?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflows_config_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows_definicoes: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          empresa_id: string | null
          id: string
          nome: string
          tipo: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          nome: string
          tipo: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_workflows_definicoes_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_definicoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows_etapas: {
        Row: {
          aprovador_id: string | null
          aprovador_tipo: string | null
          config: Json | null
          created_at: string | null
          id: string
          nome: string
          ordem: number
          tipo: string | null
          workflow_id: string
        }
        Insert: {
          aprovador_id?: string | null
          aprovador_tipo?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          nome: string
          ordem: number
          tipo?: string | null
          workflow_id: string
        }
        Update: {
          aprovador_id?: string | null
          aprovador_tipo?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          nome?: string
          ordem?: number
          tipo?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_etapas_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows_definicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows_execucoes: {
        Row: {
          created_at: string | null
          dados: Json | null
          empresa_id: string | null
          entidade_id: string
          entidade_tipo: string
          etapa_atual_id: string | null
          id: string
          log_execucao: Json | null
          metadata: Json | null
          metadata_automacao: Json | null
          solicitante_id: string | null
          status: string | null
          updated_at: string | null
          workflow_id: string
        }
        Insert: {
          created_at?: string | null
          dados?: Json | null
          empresa_id?: string | null
          entidade_id: string
          entidade_tipo: string
          etapa_atual_id?: string | null
          id?: string
          log_execucao?: Json | null
          metadata?: Json | null
          metadata_automacao?: Json | null
          solicitante_id?: string | null
          status?: string | null
          updated_at?: string | null
          workflow_id: string
        }
        Update: {
          created_at?: string | null
          dados?: Json | null
          empresa_id?: string | null
          entidade_id?: string
          entidade_tipo?: string
          etapa_atual_id?: string | null
          id?: string
          log_execucao?: Json | null
          metadata?: Json | null
          metadata_automacao?: Json | null
          solicitante_id?: string | null
          status?: string | null
          updated_at?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_workflows_execucoes_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_execucoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_execucoes_etapa_atual_id_fkey"
            columns: ["etapa_atual_id"]
            isOneToOne: false
            referencedRelation: "workflows_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_execucoes_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows_definicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows_historico: {
        Row: {
          acao: string
          created_at: string | null
          etapa_id: string | null
          execucao_id: string
          id: string
          observacoes: string | null
          usuario_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string | null
          etapa_id?: string | null
          execucao_id: string
          id?: string
          observacoes?: string | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string | null
          etapa_id?: string | null
          execucao_id?: string
          id?: string
          observacoes?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflows_historico_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "workflows_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_historico_execucao_id_fkey"
            columns: ["execucao_id"]
            isOneToOne: false
            referencedRelation: "workflows_execucoes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      excecoes_ponto: {
        Row: {
          colaborador_id: string | null
          colaborador_nome: string | null
          data: string | null
          status_alerta: string | null
          total_batidas: number | null
        }
        Relationships: [
          {
            foreignKeyName: "batidas_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batidas_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batidas_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batidas_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_batidas_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_batidas_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_batidas_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_batidas_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      pontos_abertos: {
        Row: {
          colaborador_id: string | null
          data: string | null
          empresa_id: string | null
          entrada_1: string | null
          entrada_2: string | null
          id: string | null
          nome_completo: string | null
          saida_1: string | null
          saida_2: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_registros_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_registros_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_registros_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_registros_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_registros_ponto_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "registros_ponto_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_alertas_timeout: {
        Row: {
          funcao_nome: string | null
          media_ms: number | null
          ocorrencias: number | null
          ultima_ocorrencia: string | null
        }
        Relationships: []
      }
      v_audit_events_unified: {
        Row: {
          acao: string | null
          created_at: string | null
          dados_anteriores: Json | null
          dados_novos: Json | null
          entidade: string | null
          entidade_id: string | null
          source_table: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_audit_legacy: {
        Row: {
          action: string | null
          empresa_id: string | null
          entity: string | null
          entity_id: string | null
          id: string | null
          ingested_at: string | null
          ip_address: unknown
          occurred_at: string | null
          payload: Json | null
          source_id: string | null
          source_table: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          empresa_id?: string | null
          entity?: string | null
          entity_id?: string | null
          id?: string | null
          ingested_at?: string | null
          ip_address?: unknown
          occurred_at?: string | null
          payload?: Json | null
          source_id?: string | null
          source_table?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          empresa_id?: string | null
          entity?: string | null
          entity_id?: string | null
          id?: string | null
          ingested_at?: string | null
          ip_address?: unknown
          occurred_at?: string | null
          payload?: Json | null
          source_id?: string | null
          source_table?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      v_audit_trail: {
        Row: {
          acao: string | null
          created_at: string | null
          dados_anteriores: Json | null
          dados_novos: Json | null
          empresa_id: string | null
          id: string | null
          registro_id: string | null
          status_anterior: string | null
          status_novo: string | null
          tabela: string | null
          user_email: string | null
          user_id: string | null
          user_nome: string | null
        }
        Relationships: []
      }
      v_contrato_token_timeline: {
        Row: {
          ator_id: string | null
          ator_nome: string | null
          contrato_id: string | null
          created_at: string | null
          detalhes: Json | null
          empresa_id: string | null
          evento: string | null
          id: string | null
          ip: unknown
          token_id: string | null
          user_agent: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contrato_token_eventos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_gerados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_token_eventos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "v_contratos_vencendo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_token_eventos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_token_eventos_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "contrato_assinatura_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_token_eventos_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "v_contratos_tokens_pendentes"
            referencedColumns: ["id"]
          },
        ]
      }
      v_contratos_assinatura_kpi: {
        Row: {
          empresa_id: string | null
          taxa_conversao_pct: number | null
          tempo_medio_assinatura_h: number | null
          tokens_assinados: number | null
          tokens_expirados: number | null
          tokens_gerados: number | null
          tokens_pendentes: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contrato_assinatura_tokens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_contratos_tokens_pendentes: {
        Row: {
          colaborador_id: string | null
          colaborador_nome: string | null
          contrato_id: string | null
          contrato_status: string | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          dias_desde_geracao: number | null
          dias_para_expirar: number | null
          email_destinatario: string | null
          empresa_id: string | null
          expira_em: string | null
          id: string | null
          reminders_enviados: number | null
          tipo_contrato: string | null
          ultimo_reminder_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contrato_assinatura_tokens_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_gerados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_assinatura_tokens_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "v_contratos_vencendo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_assinatura_tokens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_gerados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_gerados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_gerados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_gerados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      v_contratos_vencendo: {
        Row: {
          admissao_id: string | null
          colaborador_id: string | null
          data_fim: string | null
          data_inicio: string | null
          dias_para_vencer: number | null
          empresa_id: string | null
          id: string | null
          prorrogado: boolean | null
          severidade: string | null
          status: string | null
          template_nome: string | null
          tipo_contrato: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_gerados_admissao_id_fkey"
            columns: ["admissao_id"]
            isOneToOne: false
            referencedRelation: "admissoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_gerados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_gerados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_gerados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_gerados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "contratos_gerados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_ferias_adiant13_elegibilidade: {
        Row: {
          ano_exercicio: number | null
          colaborador_id: string | null
          data_inicio: string | null
          dentro_do_prazo: boolean | null
          empresa_id: string | null
          ferias_id: string | null
          ja_solicitado: boolean | null
          sem_duplicidade: boolean | null
        }
        Insert: {
          ano_exercicio?: never
          colaborador_id?: string | null
          data_inicio?: string | null
          dentro_do_prazo?: never
          empresa_id?: string | null
          ferias_id?: string | null
          ja_solicitado?: boolean | null
          sem_duplicidade?: never
        }
        Update: {
          ano_exercicio?: never
          colaborador_id?: string | null
          data_inicio?: string | null
          dentro_do_prazo?: never
          empresa_id?: string | null
          ferias_id?: string | null
          ja_solicitado?: boolean | null
          sem_duplicidade?: never
        }
        Relationships: [
          {
            foreignKeyName: "ferias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "ferias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ferias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ferias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ferias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ferias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_ferias_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_ferias_alerta_pagamento_d2: {
        Row: {
          colaborador_id: string | null
          data_inicio: string | null
          data_pagamento: string | null
          dias_ate_inicio: number | null
          empresa_id: string | null
          id: string | null
          pagamento_confirmado_em: string | null
          severidade: string | null
          status: string | null
        }
        Insert: {
          colaborador_id?: string | null
          data_inicio?: string | null
          data_pagamento?: string | null
          dias_ate_inicio?: never
          empresa_id?: string | null
          id?: string | null
          pagamento_confirmado_em?: string | null
          severidade?: never
          status?: string | null
        }
        Update: {
          colaborador_id?: string | null
          data_inicio?: string | null
          data_pagamento?: string | null
          dias_ate_inicio?: never
          empresa_id?: string | null
          id?: string | null
          pagamento_confirmado_em?: string | null
          severidade?: never
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ferias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "ferias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ferias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ferias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ferias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ferias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_ferias_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_ferias_alertas_criticos: {
        Row: {
          aquisitivo_fim: string | null
          aquisitivo_inicio: string | null
          colaborador: string | null
          colaborador_id: string | null
          data_limite_concessao: string | null
          dias_direito: number | null
          dias_para_limite: number | null
          em_dobra: boolean | null
          empresa_id: string | null
          perdeu_direito: boolean | null
          periodo_aquisitivo_id: string | null
          severidade: string | null
        }
        Relationships: []
      }
      v_ferias_folha_reconciliacao: {
        Row: {
          colaborador_id: string | null
          colaborador_nome: string | null
          competencia: string | null
          data_fim: string | null
          data_inicio: string | null
          empresa_id: string | null
          enviado_contabilidade: boolean | null
          ferias_id: string | null
          rubricas_esperadas: number | null
          rubricas_geradas: number | null
          situacao: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ferias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "ferias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ferias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ferias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ferias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ferias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_ferias_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_idempotency_metrics: {
        Row: {
          completed_24h: number | null
          conflict_24h: number | null
          endpoint: string | null
          failed_24h: number | null
          failure_rate_pct_24h: number | null
          last_seen_at: string | null
          pending_24h: number | null
          total_24h: number | null
          total_7d: number | null
        }
        Relationships: []
      }
      v_slow_queries_top50: {
        Row: {
          cache_hit_pct: number | null
          calls: number | null
          max_ms: number | null
          mean_ms: number | null
          query_sample: string | null
          rows: number | null
          stddev_ms: number | null
          total_ms: number | null
        }
        Relationships: []
      }
      v_system_health: {
        Row: {
          audit_events_total: number | null
          audit_last_event_at: string | null
          fks_without_index: number | null
          security_alerts_open: number | null
          snapshot_at: string | null
          tables_total: number | null
          tables_with_rls: number | null
        }
        Relationships: []
      }
      vw_alertas_compensacao: {
        Row: {
          colaborador_id: string | null
          empresa_id: string | null
          nivel_alerta: string | null
          nome_completo: string | null
          saldo_minutos: number | null
        }
        Relationships: [
          {
            foreignKeyName: "banco_horas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banco_horas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banco_horas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banco_horas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "banco_horas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_banco_horas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_banco_horas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_banco_horas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_banco_horas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_banco_horas_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_alertas_rh: {
        Row: {
          created_at: string | null
          data_referencia: string | null
          empresa_id: string | null
          entidade_id: string | null
          entidade_tipo: string | null
          id: string | null
          lida: boolean | null
          mensagem: string | null
          tipo: string | null
          titulo: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data_referencia?: string | null
          empresa_id?: string | null
          entidade_id?: string | null
          entidade_tipo?: string | null
          id?: string | null
          lida?: boolean | null
          mensagem?: string | null
          tipo?: string | null
          titulo?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data_referencia?: string | null
          empresa_id?: string | null
          entidade_id?: string | null
          entidade_tipo?: string | null
          id?: string | null
          lida?: boolean | null
          mensagem?: string | null
          tipo?: string | null
          titulo?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_notificacoes_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_banco_horas_saldo: {
        Row: {
          colaborador_id: string | null
          empresa_id: string | null
          nome_completo: string | null
          saldo_horas: number | null
          ultima_movimentacao: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banco_horas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banco_horas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banco_horas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banco_horas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "colaboradores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_banco_horas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_banco_horas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_banco_horas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_banco_horas_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_colaboradores_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_batidas_dia: {
        Row: {
          ajustado: boolean | null
          colaborador_id: string | null
          data: string | null
          dentro_raio: boolean | null
          departamento: string | null
          empresa_id: string | null
          foto_url: string | null
          hora: string | null
          id: string | null
          latitude: number | null
          longitude: number | null
          nome_completo: string | null
          ordem: number | null
          origem: string | null
          tipo: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batidas_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batidas_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batidas_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batidas_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "batidas_ponto_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_batidas_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_batidas_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_batidas_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_batidas_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_batidas_ponto_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_batidas_resumo: {
        Row: {
          batidas: Json | null
          colaborador_id: string | null
          data: string | null
          empresa_id: string | null
          nome_completo: string | null
          primeira_entrada: string | null
          total_batidas: number | null
          ultima_saida: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batidas_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batidas_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batidas_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batidas_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "batidas_ponto_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_batidas_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_batidas_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_batidas_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_batidas_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_batidas_ponto_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_cadastro_incompleto: {
        Row: {
          campos_faltantes: string[] | null
          empresa_id: string | null
          id: string | null
          nome_completo: string | null
          status: Database["public"]["Enums"]["status_colaborador"] | null
          total_faltantes: number | null
        }
        Insert: {
          campos_faltantes?: never
          empresa_id?: string | null
          id?: string | null
          nome_completo?: string | null
          status?: Database["public"]["Enums"]["status_colaborador"] | null
          total_faltantes?: never
        }
        Update: {
          campos_faltantes?: never
          empresa_id?: string | null
          id?: string | null
          nome_completo?: string | null
          status?: Database["public"]["Enums"]["status_colaborador"] | null
          total_faltantes?: never
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_colaboradores_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_colaboradores_completo: {
        Row: {
          cargo_nome: string | null
          cpf: string | null
          data_admissao: string | null
          departamento_nome: string | null
          email_corporativo: string | null
          empresa_id: string | null
          empresa_nome: string | null
          id: string | null
          nome_completo: string | null
          status: Database["public"]["Enums"]["status_colaborador"] | null
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_colaboradores_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_dashboard_time: {
        Row: {
          afastados: number | null
          ativos: number | null
          empresa_id: string | null
          total_colaboradores: number | null
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_colaboradores_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_espelho_ponto_mensal: {
        Row: {
          colaborador_id: string | null
          data: string | null
          empresa_id: string | null
          entrada_1: string | null
          saida_1: string | null
          total_batidas: number | null
        }
        Relationships: [
          {
            foreignKeyName: "batidas_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batidas_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batidas_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batidas_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "colaboradores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_batidas_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_batidas_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_batidas_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_batidas_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_colaboradores_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_faltas_mensal: {
        Row: {
          dias_total: number | null
          empresa_id: string | null
          injustificadas: number | null
          justificadas: number | null
          mes: string | null
          tipo: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "faltas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_faltas_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_ferias_resumo: {
        Row: {
          cargo: string | null
          colaborador_id: string | null
          data_admissao: string | null
          data_fim: string | null
          data_inicio: string | null
          departamento: string | null
          dias_abono: number | null
          dias_gozo: number | null
          empresa_id: string | null
          id: string | null
          nome_completo: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ferias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "ferias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ferias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ferias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ferias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ferias_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_ferias_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_folha_compliance: {
        Row: {
          acao: string | null
          audit_id: string | null
          competencia: string | null
          dados_novos: Json | null
          empresa_id: string | null
          event_at: string | null
          folha_id: string | null
          holerites_count: number | null
          integrity_hash: string | null
          ip_address: string | null
          itens_count: number | null
          motivo: string | null
          override_esocial: boolean | null
          total_descontos: number | null
          total_fgts: number | null
          total_liquido: number | null
          total_proventos: number | null
          user_email: string | null
          user_id: string | null
          version_anterior: number | null
          version_nova: number | null
        }
        Insert: {
          acao?: string | null
          audit_id?: string | null
          competencia?: never
          dados_novos?: Json | null
          empresa_id?: never
          event_at?: string | null
          folha_id?: string | null
          holerites_count?: never
          integrity_hash?: never
          ip_address?: string | null
          itens_count?: never
          motivo?: never
          override_esocial?: never
          total_descontos?: never
          total_fgts?: never
          total_liquido?: never
          total_proventos?: never
          user_email?: string | null
          user_id?: string | null
          version_anterior?: never
          version_nova?: never
        }
        Update: {
          acao?: string | null
          audit_id?: string | null
          competencia?: never
          dados_novos?: Json | null
          empresa_id?: never
          event_at?: string | null
          folha_id?: string | null
          holerites_count?: never
          integrity_hash?: never
          ip_address?: string | null
          itens_count?: never
          motivo?: never
          override_esocial?: never
          total_descontos?: never
          total_fgts?: never
          total_liquido?: never
          total_proventos?: never
          user_email?: string | null
          user_id?: string | null
          version_anterior?: never
          version_nova?: never
        }
        Relationships: []
      }
      vw_folha_ponto_mensal: {
        Row: {
          colaborador_id: string | null
          departamento: string | null
          dias_completos: number | null
          dias_trabalhados: number | null
          empresa_id: string | null
          mes_referencia: string | null
          nome_completo: string | null
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_colaboradores_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_registros_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_registros_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_registros_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_registros_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "registros_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      vw_kpi_absenteismo: {
        Row: {
          dias_faltados: number | null
          empresa_id: string | null
          mes: string | null
          total_faltas: number | null
        }
        Relationships: [
          {
            foreignKeyName: "faltas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_faltas_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_kpi_beneficios_custo: {
        Row: {
          colaboradores_vinculados: number | null
          custo_colaborador: number | null
          custo_empresa: number | null
          empresa_id: string | null
          tipo: string | null
          total_beneficios: number | null
          valor_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "beneficios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_beneficios_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_kpi_ponto_resumo: {
        Row: {
          colaborador_id: string | null
          dias_com_entrada: number | null
          dias_com_saida: number | null
          dias_registrados: number | null
          empresa_id: string | null
          mes: string | null
          nome_completo: string | null
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_colaboradores_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_registros_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_registros_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_registros_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_registros_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "registros_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      vw_kpi_turnover: {
        Row: {
          ativos_atual: number | null
          desligamentos_mes: number | null
          mes: string | null
          taxa_turnover: number | null
        }
        Relationships: []
      }
      vw_matriz_nine_box: {
        Row: {
          avaliado_id: string | null
          empresa_id: string | null
          media_performance: number | null
          media_potencial: number | null
          nome_completo: string | null
          total_avaliacoes: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_360_avaliado_id_fkey"
            columns: ["avaliado_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_360_avaliado_id_fkey"
            columns: ["avaliado_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_360_avaliado_id_fkey"
            columns: ["avaliado_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_360_avaliado_id_fkey"
            columns: ["avaliado_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "feedbacks_360_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_feedbacks_360_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_metricas_fila: {
        Row: {
          falhas: number | null
          sucessos: number | null
          tempo_medio_segundos: number | null
          tipo_tarefa: string | null
        }
        Relationships: []
      }
      vw_passivo_trabalhista_consolidado: {
        Row: {
          colaborador_id: string | null
          data_admissao: string | null
          dias_direito: number | null
          nome_completo: string | null
          periodo_aquisitivo_fim: string | null
          periodo_aquisitivo_inicio: string | null
          salario_base: number | null
          status_risco_ferias: string | null
          valor_ferias_projetado: number | null
        }
        Relationships: []
      }
      vw_saldo_compensacao_mensal: {
        Row: {
          colaborador_id: string | null
          competencia: string | null
          dias_trabalhados: number | null
          empresa_id: string | null
          minutos_extras: number | null
          minutos_falta: number | null
          nome_completo: string | null
          total_atrasos_minutos: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_registros_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_registros_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_registros_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_registros_ponto_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "fk_registros_ponto_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_cadastro_incompleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_colaboradores_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_passivo_trabalhista_consolidado"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "registros_ponto_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _is_admin_bypass: { Args: never; Returns: boolean }
      _purge_audit_log_internal: { Args: { _dias?: number }; Returns: number }
      _scan_status_anomalies_global: { Args: never; Returns: number }
      admin_list_security_definer_rpcs: {
        Args: never
        Returns: {
          arguments: string
          executable_by_anon: boolean
          executable_by_authenticated: boolean
          function_name: string
          return_type: string
        }[]
      }
      admin_list_user_roles: {
        Args: never
        Returns: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      admin_set_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: boolean
      }
      anonimizar_dados_pessoais: {
        Args: { target_id: string }
        Returns: undefined
      }
      aplicar_medida_folha_ponto: {
        Args: { p_medida_id: string }
        Returns: Json
      }
      aprovar_despesa: {
        Args: { _despesa_id: string; _observacoes?: string }
        Returns: {
          aprovado_em: string | null
          aprovado_por: string | null
          categoria: string
          colaborador_id: string
          comprovante_url: string | null
          created_at: string | null
          data_despesa: string
          descricao: string
          empresa_id: string | null
          folha_id: string | null
          id: string
          integrado_folha_em: string | null
          observacoes: string | null
          observacoes_aprovador: string | null
          rejeitado_motivo: string | null
          status: string | null
          tipo: string
          updated_at: string | null
          valor: number
        }
        SetofOptions: {
          from: "*"
          to: "despesas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assinar_aviso_ferias: {
        Args: {
          p_ferias_id: string
          p_hash: string
          p_ip?: unknown
          p_pdf_url: string
          p_ua?: string
        }
        Returns: Json
      }
      assinar_desligamento: {
        Args: { _desligamento_id: string; _parte: string }
        Returns: boolean
      }
      assinar_espelho_ponto: {
        Args: {
          _colaborador_id: string
          _competencia: string
          _ip?: unknown
          _user_agent?: string
        }
        Returns: Json
      }
      associar_pis_colaborador_afdt: {
        Args: { _colaborador_id: string; _divergencia_id: string }
        Returns: undefined
      }
      calcular_dias_direito_ferias: {
        Args: { p_faltas: number }
        Returns: number
      }
      calcular_dias_ferias: { Args: { faltas: number }; Returns: number }
      calculate_lockout_duration: {
        Args: { attempts: number }
        Returns: string
      }
      check_brute_force: {
        Args: { check_email: string; check_ip: string }
        Returns: Json
      }
      check_ciencia_rate_limit: {
        Args: {
          p_identifier?: string
          p_max_requests?: number
          p_rpc_name: string
          p_window_minutes?: number
        }
        Returns: boolean
      }
      check_idempotency_anomalies: {
        Args: never
        Returns: {
          endpoint: string
          reason: string
          severity: string
        }[]
      }
      check_login_lock: {
        Args: { p_identifier: string; p_identifier_type?: string }
        Returns: {
          is_locked: boolean
          remaining_seconds: number
        }[]
      }
      check_rate_limit: {
        Args: {
          check_endpoint: string
          check_ip: string
          check_user_id?: string
        }
        Returns: Json
      }
      cleanup_ciencia_rate_limits: { Args: never; Returns: undefined }
      cleanup_security_logs: { Args: never; Returns: undefined }
      clinicas_proximas: {
        Args: {
          p_empresa_id: string
          p_lat: number
          p_limit?: number
          p_lng: number
          p_raio_km?: number
          p_tipo_exame?: string
        }
        Returns: {
          cidade: string
          distancia_km: number
          id: string
          nome_fantasia: string
          razao_social: string
          sla_medio_min: number
          telefone: string
          tipos_exame: string[]
          uf: string
        }[]
      }
      consumir_pendencias_medida_no_holerite: {
        Args: {
          p_colaborador_id: string
          p_competencia: string
          p_holerite_id: string
        }
        Returns: number
      }
      contrato_assinar_por_token: {
        Args: {
          p_cpf: string
          p_ip?: unknown
          p_nome_completo: string
          p_token: string
          p_user_agent?: string
        }
        Returns: Json
      }
      contrato_consultar_por_token: { Args: { p_token: string }; Returns: Json }
      contrato_estender_expiracao: {
        Args: { p_dias?: number; p_token_id: string }
        Returns: {
          expira_em: string
          id: string
        }[]
      }
      contrato_gerar_token_assinatura: {
        Args: {
          p_contrato_id: string
          p_cpf?: string
          p_email?: string
          p_validade_dias?: number
        }
        Returns: {
          expira_em: string
          token: string
        }[]
      }
      contrato_lembretes_pendentes: {
        Args: never
        Returns: {
          notificados: number
          processados: number
        }[]
      }
      contrato_montar_variaveis: {
        Args: { p_admissao_id: string }
        Returns: Json
      }
      contrato_preview_url_por_token: {
        Args: { p_token: string }
        Returns: Json
      }
      contrato_resolver_template: {
        Args: { p_admissao_id: string }
        Returns: string
      }
      contrato_revogar_token: {
        Args: { p_motivo?: string; p_token_id: string }
        Returns: undefined
      }
      contrato_token_evento_registrar: {
        Args: {
          p_detalhes?: Json
          p_evento: string
          p_ip?: unknown
          p_token_id: string
          p_ua?: string
        }
        Returns: string
      }
      contrato_verificar_autenticidade: {
        Args: { p_hash: string }
        Returns: Json
      }
      contrato_verificar_autenticidade_v2: {
        Args: { p_hash: string; p_ip?: string }
        Returns: Json
      }
      contratos_alertar_vencimentos: { Args: never; Returns: number }
      contratos_enviar_lembretes_assinatura: { Args: never; Returns: number }
      criar_batida_da_divergencia_afdt: {
        Args: { _divergencia_id: string; _tipo?: string }
        Returns: string
      }
      detectar_fraude_ponto: {
        Args: {
          _batida_id: string
          _colaborador_id: string
          _lat_nova: number
          _lng_nova: number
          _time_nova: string
        }
        Returns: undefined
      }
      distancia_haversine: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      eh_dia_valido_inicio_ferias: {
        Args: { p_data: string; p_empresa_id: string }
        Returns: {
          motivo: string
          ok: boolean
        }[]
      }
      enfileirar_esocial_medida_disciplinar: {
        Args: { p_medida_id: string }
        Returns: Json
      }
      enforce_log_retention: { Args: never; Returns: Json }
      fn_calculate_periodo_aquisitivo: {
        Args: { _colaborador_id: string }
        Returns: {
          fim: string
          inicio: string
        }[]
      }
      fn_cleanup_old_logs: { Args: never; Returns: undefined }
      fn_link_gov_br_account: {
        Args: { _cpf: string; _nivel: string; _user_id: string }
        Returns: undefined
      }
      fn_recalcular_dobra_e_alertas: { Args: never; Returns: number }
      folha_conflict_stats: {
        Args: { _days?: number }
        Returns: {
          competencia: string
          conflitos: number
          ultimo_em: string
        }[]
      }
      garantir_rubrica_suspensao: {
        Args: { p_empresa_id: string }
        Returns: string
      }
      gerar_alertas_preditivos_ia: { Args: never; Returns: undefined }
      gerar_canonical_espelho_ponto: {
        Args: { _colaborador_id: string; _competencia: string }
        Returns: Json
      }
      gerar_rubricas_ferias: { Args: { p_ferias_id: string }; Returns: number }
      get_admissao_por_token: {
        Args: { _token: string }
        Returns: {
          admissao: Json
          token_row: Database["public"]["Tables"]["admissao_tokens"]["Row"]
        }[]
      }
      get_audit_trail_by_entity: {
        Args: { _entidade: string; _entidade_id: string; _limit?: number }
        Returns: {
          acao: string
          created_at: string
          dados_anteriores: Json
          dados_novos: Json
          source_table: string
          user_id: string
        }[]
      }
      get_audit_trail_by_user: {
        Args: { _limit?: number; _user_id: string }
        Returns: {
          acao: string
          created_at: string
          dados_anteriores: Json
          dados_novos: Json
          entidade: string
          entidade_id: string
          source_table: string
        }[]
      }
      get_auth_empresa_id: { Args: never; Returns: string }
      get_colaborador_banco_horas: {
        Args: { p_colaborador_id: string }
        Returns: number
      }
      get_cron_jobs_health: {
        Args: never
        Returns: {
          active: boolean
          failures_24h: number
          jobname: string
          last_duration_ms: number
          last_error: string
          last_run: string
          last_status: string
          runs_24h: number
          schedule: string
        }[]
      }
      get_dlq_stats: {
        Args: never
        Returns: {
          mais_recente: string
          tipo_tarefa: string
          total_dlq: number
          ultimo_erro_sample: string
        }[]
      }
      get_idempotency_health: {
        Args: never
        Returns: {
          completed_24h: number
          conflict_24h: number
          endpoint: string
          failed_24h: number
          failure_rate_pct: number
          last_seen_at: string
          pending_24h: number
          total_24h: number
        }[]
      }
      get_personnel_cost_projection: {
        Args: { p_empresa_id: string; p_months: number }
        Returns: {
          mes_ref: string
          total_estimado: number
        }[]
      }
      get_query_telemetry: {
        Args: { _limit?: number }
        Returns: {
          cache_hit_pct: number
          calls: number
          max_ms: number
          mean_ms: number
          query_sample: string
          total_ms: number
        }[]
      }
      get_security_alerts_summary: {
        Args: { _limit?: number }
        Returns: {
          age_minutes: number
          created_at: string
          details: Json
          id: string
          ip_address: string
          severity: string
          type: string
          user_id: string
        }[]
      }
      get_user_default_empresa: { Args: { _user_id: string }; Returns: string }
      get_user_empresas: { Args: { _user_id: string }; Returns: string[] }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      get_user_scope_empresas: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_country_allowed: {
        Args: { check_country_code: string }
        Returns: boolean
      }
      is_ip_blocked: { Args: { check_ip: string }; Returns: boolean }
      is_ip_whitelisted: { Args: { check_ip: string }; Returns: boolean }
      limpar_govbr_states_expirados: { Args: never; Returns: undefined }
      log_frontend_error: {
        Args: { p_contexto?: Json; p_mensagem: string; p_nivel: string }
        Returns: undefined
      }
      maintenance_archive_old_audit: {
        Args: { _batch?: number; _days?: number }
        Returns: {
          archived: number
          purged: number
        }[]
      }
      maintenance_weekly_analyze: { Args: never; Returns: undefined }
      medida_aprovar: {
        Args: { _medida_id: string; _observacao?: string }
        Returns: Json
      }
      medida_arquivar: {
        Args: { _medida_id: string; _observacao?: string }
        Returns: Json
      }
      medida_consultar_por_token: { Args: { p_token: string }; Returns: Json }
      medida_contestar: {
        Args: { _medida_id: string; _texto: string }
        Returns: {
          aplicado_por: string | null
          aprovado_gestor_em: string | null
          aprovado_gestor_por: string | null
          aprovado_juridico_em: string | null
          aprovado_juridico_por: string | null
          aprovado_rh_em: string | null
          aprovado_rh_por: string | null
          aprovador_id: string | null
          arquivado_em: string | null
          arquivado_por: string | null
          artigo_clt: string | null
          assinado_em: string | null
          colaborador_ciente: boolean | null
          colaborador_id: string
          contestacao_aceita: boolean | null
          contestacao_data: string | null
          contestacao_prazo_ate: string | null
          contestacao_prazo_horas: number
          contestacao_respondida_em: string | null
          contestacao_respondida_por: string | null
          contestacao_resposta: string | null
          contestacao_texto: string | null
          created_at: string | null
          data_aprovacao: string | null
          data_ciencia: string | null
          data_conhecimento_fato: string | null
          data_inicio_efeito: string | null
          data_ocorrencia: string
          descricao: string
          dias_suspensao: number | null
          documento_url: string | null
          empresa_id: string | null
          evidenciado_por: Json | null
          gravidade: string | null
          hash_integridade: string | null
          id: string
          id_registro_anterior: string | null
          motivo_recusa: string | null
          motivo_rejeicao: string | null
          numero_sequencial: number | null
          pdf_gerado_em: string | null
          pdf_hash_sha256: string | null
          pdf_url: string | null
          prazo_ciencia_dias: number | null
          recorrencia_infrafacao: boolean | null
          recusa_assinatura: boolean | null
          rejeitado_em: string | null
          rejeitado_por: string | null
          status: string | null
          status_workflow: string | null
          testemunha_1: string | null
          testemunha_1_cpf: string | null
          testemunha_1_nome: string | null
          testemunha_2: string | null
          testemunha_2_cpf: string | null
          testemunha_2_nome: string | null
          tipo: string
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "medidas_disciplinares"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      medida_enviar_aprovacao: { Args: { _medida_id: string }; Returns: Json }
      medida_gerar_link_ciencia: {
        Args: { p_medida_id: string }
        Returns: Json
      }
      medida_registrar_ciencia_publica: {
        Args: {
          p_acao: string
          p_geo?: Json
          p_ip?: string
          p_motivo_recusa?: string
          p_token: string
          p_user_agent?: string
        }
        Returns: Json
      }
      medida_rejeitar: {
        Args: { _medida_id: string; _motivo: string }
        Returns: Json
      }
      medida_responder_contestacao: {
        Args: { _aceita: boolean; _medida_id: string; _resposta: string }
        Returns: {
          aplicado_por: string | null
          aprovado_gestor_em: string | null
          aprovado_gestor_por: string | null
          aprovado_juridico_em: string | null
          aprovado_juridico_por: string | null
          aprovado_rh_em: string | null
          aprovado_rh_por: string | null
          aprovador_id: string | null
          arquivado_em: string | null
          arquivado_por: string | null
          artigo_clt: string | null
          assinado_em: string | null
          colaborador_ciente: boolean | null
          colaborador_id: string
          contestacao_aceita: boolean | null
          contestacao_data: string | null
          contestacao_prazo_ate: string | null
          contestacao_prazo_horas: number
          contestacao_respondida_em: string | null
          contestacao_respondida_por: string | null
          contestacao_resposta: string | null
          contestacao_texto: string | null
          created_at: string | null
          data_aprovacao: string | null
          data_ciencia: string | null
          data_conhecimento_fato: string | null
          data_inicio_efeito: string | null
          data_ocorrencia: string
          descricao: string
          dias_suspensao: number | null
          documento_url: string | null
          empresa_id: string | null
          evidenciado_por: Json | null
          gravidade: string | null
          hash_integridade: string | null
          id: string
          id_registro_anterior: string | null
          motivo_recusa: string | null
          motivo_rejeicao: string | null
          numero_sequencial: number | null
          pdf_gerado_em: string | null
          pdf_hash_sha256: string | null
          pdf_url: string | null
          prazo_ciencia_dias: number | null
          recorrencia_infrafacao: boolean | null
          recusa_assinatura: boolean | null
          rejeitado_em: string | null
          rejeitado_por: string | null
          status: string | null
          status_workflow: string | null
          testemunha_1: string | null
          testemunha_1_cpf: string | null
          testemunha_1_nome: string | null
          testemunha_2: string | null
          testemunha_2_cpf: string | null
          testemunha_2_nome: string | null
          tipo: string
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "medidas_disciplinares"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      medida_verificar_ciencia_hash: { Args: { p_hash: string }; Returns: Json }
      medidas_analytics_reincidencia: {
        Args: {
          p_data_fim: string
          p_data_inicio: string
          p_empresa_id: string
        }
        Returns: Json
      }
      next_cnab_sequencial: {
        Args: { p_banco_codigo: string; p_empresa_id: string }
        Returns: number
      }
      notificar_divergencias_afdt: {
        Args: { _importacao_id: string }
        Returns: {
          avisos: number
          criticas: number
          notificacoes_criadas: number
        }[]
      }
      notificar_ferias_pagamento_d5: { Args: never; Returns: number }
      notificar_ferias_reconciliacao_sla_baixo: { Args: never; Returns: Json }
      pagar_desligamento: {
        Args: { _comprovante_url?: string; _desligamento_id: string }
        Returns: {
          assinado_colaborador: boolean | null
          assinado_empresa: boolean | null
          aviso_previo: number | null
          checklist_calculo_rescisao: boolean | null
          checklist_comunicacao: boolean | null
          checklist_devolucao_equipamentos: boolean | null
          checklist_documentacao: boolean | null
          checklist_esocial: boolean | null
          checklist_homologacao: boolean | null
          checklist_pagamento: boolean | null
          checklist_revogacao_acessos: boolean | null
          colaborador_id: string
          comprovante_pagamento_url: string | null
          created_at: string
          created_by: string | null
          data_assinatura_colaborador: string | null
          data_assinatura_empresa: string | null
          data_aviso: string | null
          data_aviso_previo: string | null
          data_contabilidade: string | null
          data_desligamento: string
          data_pagamento: string | null
          data_remocao_acesso: string | null
          decimo_terceiro: number | null
          empresa_id: string | null
          etapa: string | null
          ferias_proporcionais: number | null
          ferias_vencidas: number | null
          hash_assinatura_colaborador: string | null
          hash_assinatura_empresa: string | null
          hash_integridade: string | null
          id: string
          motivo: string | null
          multa_fgts: number | null
          novo_supervisor_id: string | null
          quebra_contrato: boolean | null
          remover_beneficios: boolean | null
          salario_base: number
          saldo_salario: number | null
          status: string
          terco_constitucional: number | null
          tipo: Database["public"]["Enums"]["tipo_desligamento"]
          tipo_aviso_previo_id: number | null
          tipo_desligamento_id: number | null
          total_descontos: number | null
          total_proventos: number | null
          updated_at: string
          valor_liquido: number | null
        }
        SetofOptions: {
          from: "*"
          to: "desligamentos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      process_lgpd_cleanup_queue: { Args: never; Returns: number }
      processar_ajuste_aprovado: {
        Args: { p_solicitacao_id: string }
        Returns: undefined
      }
      programacao_ferias_aprovar_gestor: {
        Args: { _id: string }
        Returns: {
          ano: number
          aprovado_gestor_em: string | null
          aprovado_gestor_por: string | null
          aprovado_rh_em: string | null
          aprovado_rh_por: string | null
          colaborador_id: string
          created_at: string
          criado_por: string | null
          data_fim_prevista: string | null
          data_inicio_prevista: string | null
          dias_previstos: number
          empresa_id: string
          ferias_id: string | null
          id: string
          mes_previsto: number
          observacoes: string | null
          periodo_aquisitivo_id: string | null
          rejeitado_em: string | null
          rejeitado_motivo: string | null
          rejeitado_por: string | null
          status: Database["public"]["Enums"]["programacao_ferias_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "ferias_programacao"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      programacao_ferias_aprovar_rh: {
        Args: { _id: string }
        Returns: {
          ano: number
          aprovado_gestor_em: string | null
          aprovado_gestor_por: string | null
          aprovado_rh_em: string | null
          aprovado_rh_por: string | null
          colaborador_id: string
          created_at: string
          criado_por: string | null
          data_fim_prevista: string | null
          data_inicio_prevista: string | null
          dias_previstos: number
          empresa_id: string
          ferias_id: string | null
          id: string
          mes_previsto: number
          observacoes: string | null
          periodo_aquisitivo_id: string | null
          rejeitado_em: string | null
          rejeitado_motivo: string | null
          rejeitado_por: string | null
          status: Database["public"]["Enums"]["programacao_ferias_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "ferias_programacao"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      programacao_ferias_converter: {
        Args: { _id: string }
        Returns: {
          abono_pecuniario: boolean | null
          adiantamento_13: boolean | null
          adiantamento_13_ano_exercicio: number | null
          adiantamento_13_solicitado_em: string | null
          adiantamento_13_solicitado_por: string | null
          adiantamento_13o: boolean | null
          aprovado_em: string | null
          aprovado_gestor: boolean | null
          aprovado_gestor_em: string | null
          aprovado_gestor_por: string | null
          aprovado_por: string | null
          aprovado_rh: boolean | null
          aprovado_rh_em: string | null
          aprovado_rh_por: string | null
          aviso_assinatura_em: string | null
          aviso_assinatura_hash: string | null
          aviso_assinatura_ip: unknown
          aviso_assinatura_por: string | null
          aviso_assinatura_user_agent: string | null
          aviso_gerado_em: string | null
          aviso_pdf_url: string | null
          cancelado: boolean | null
          cancelado_em: string | null
          cancelado_por: string | null
          colaborador_id: string
          created_at: string
          created_by: string | null
          data_fim: string
          data_inicio: string
          data_pagamento: string | null
          descontos_inss: number | null
          descontos_irrf: number | null
          dias_abono: number | null
          dias_gozo: number
          documento_url: string | null
          empresa_id: string | null
          enviado_contabilidade: boolean | null
          enviado_contabilidade_em: string | null
          enviado_contabilidade_por: string | null
          ferias_coletiva_id: string | null
          hash_integridade: string | null
          id: string
          justificativa: string | null
          motivo_cancelamento: string | null
          observacoes: string | null
          pagamento_comprovante_path: string | null
          pagamento_confirmado_em: string | null
          pagamento_confirmado_por: string | null
          pagamento_valor: number | null
          periodo_aquisitivo_fim: string | null
          periodo_aquisitivo_id: string
          periodo_aquisitivo_inicio: string | null
          salario_base: number
          saldo_gasto: number | null
          status: string | null
          status_aprovacao_contabilidade: string | null
          status_aprovacao_gestor: string | null
          status_aprovacao_rh: string | null
          updated_at: string
          valor_abono: number | null
          valor_abono_pecuniario: number | null
          valor_adiantamento_13: number | null
          valor_ferias: number
          valor_liquido: number
          valor_terco: number
          valor_terco_abono: number | null
          valor_total: number
          vender_abono: boolean | null
        }
        SetofOptions: {
          from: "*"
          to: "ferias"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      programacao_ferias_mover: {
        Args: { _id: string; _nova_data_inicio?: string; _novo_mes: number }
        Returns: {
          aviso: string
          programacao: Database["public"]["Tables"]["ferias_programacao"]["Row"]
        }[]
      }
      programacao_ferias_rejeitar: {
        Args: { _id: string; _motivo: string }
        Returns: {
          ano: number
          aprovado_gestor_em: string | null
          aprovado_gestor_por: string | null
          aprovado_rh_em: string | null
          aprovado_rh_por: string | null
          colaborador_id: string
          created_at: string
          criado_por: string | null
          data_fim_prevista: string | null
          data_inicio_prevista: string | null
          dias_previstos: number
          empresa_id: string
          ferias_id: string | null
          id: string
          mes_previsto: number
          observacoes: string | null
          periodo_aquisitivo_id: string | null
          rejeitado_em: string | null
          rejeitado_motivo: string | null
          rejeitado_por: string | null
          status: Database["public"]["Enums"]["programacao_ferias_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "ferias_programacao"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      purgar_ferias_reconciliacao_logs_antigos: { Args: never; Returns: number }
      purge_audit_log_old: { Args: { _dias?: number }; Returns: number }
      purge_expired_idempotency_keys: { Args: never; Returns: number }
      purge_expired_security_data: { Args: never; Returns: Json }
      purge_old_lock_conflicts: { Args: never; Returns: number }
      reconciliar_afdt: {
        Args: { _importacao_id: string; _janela_seg?: number }
        Returns: {
          ok: number
          sem_batida: number
          sem_colaborador: number
          total: number
        }[]
      }
      reconciliar_ferias_folha_batch: {
        Args: never
        Returns: {
          corrigidas: number
          detalhes: Json
          duracao_ms: number
          empresa_id: string | null
          executado_em: string
          id: string
          restantes: number
          verificadas: number
        }[]
        SetofOptions: {
          from: "*"
          to: "ferias_reconciliacao_logs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      record_failed_login: {
        Args: { p_identifier: string; p_identifier_type?: string }
        Returns: {
          attempts: number
          is_locked: boolean
          lockout_minutes: number
        }[]
      }
      refresh_dashboard_mvs: { Args: never; Returns: Json }
      registrar_batida_ponto: {
        Args: {
          p_colaborador_id: string
          p_data: string
          p_dentro_raio?: boolean
          p_dispositivo_id?: string
          p_empresa_id: string
          p_foto_biometria_url?: string
          p_hash_integridade?: string
          p_hora: string
          p_latitude?: number
          p_longitude?: number
          p_metadata?: Json
          p_origem?: string
          p_precisao_metros?: number
          p_timezone?: string
          p_tipo: string
        }
        Returns: {
          ajustado: boolean | null
          ajustado_por: string | null
          anomalia_detectada: boolean | null
          biometria_score: number | null
          biometria_status: string | null
          colaborador_id: string
          created_at: string | null
          data: string
          dentro_raio: boolean | null
          device_metadata: Json | null
          dispositivo_id: string | null
          distancia_local_metros: number | null
          empresa_id: string | null
          foto_biometria_url: string | null
          hash_biometrico: string | null
          hash_comprovante: string | null
          hash_digital: string | null
          hash_integridade: string | null
          hora: string
          id: string
          id_fiscal_ponto: string | null
          ip_address: string | null
          is_offline: boolean | null
          justificativa_anomalia: string | null
          latitude: number | null
          longitude: number | null
          motivo_ajuste: string | null
          offline: boolean | null
          offset_timezone: number | null
          ordem: number
          origem: string | null
          precisao_metros: number | null
          sync_at: string | null
          timestamp_dispositivo: string | null
          timezone: string | null
          tipo: string
          updated_at: string | null
          versao_app: string | null
        }
        SetofOptions: {
          from: "*"
          to: "batidas_ponto"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      registrar_comunicado_ferias_coletivas: {
        Args: {
          _coletiva_id: string
          _mte_hash: string
          _mte_path: string
          _sindicato_hash: string
          _sindicato_nome: string
          _sindicato_path: string
        }
        Returns: {
          aprovado_por: string | null
          comunicado_gerado_em: string | null
          comunicado_gerado_por: string | null
          comunicado_mte_hash: string | null
          comunicado_mte_path: string | null
          comunicado_sindicato_hash: string | null
          comunicado_sindicato_nome: string | null
          comunicado_sindicato_path: string | null
          created_at: string
          created_by: string | null
          data_fim: string
          data_inicio: string
          departamentos: string[] | null
          dias: number
          empresa_id: string
          id: string
          justificativa: string | null
          status: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "ferias_coletivas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      registrar_pagamento_ferias: {
        Args: {
          p_comprovante_path?: string
          p_ferias_id: string
          p_valor: number
        }
        Returns: {
          abono_pecuniario: boolean | null
          adiantamento_13: boolean | null
          adiantamento_13_ano_exercicio: number | null
          adiantamento_13_solicitado_em: string | null
          adiantamento_13_solicitado_por: string | null
          adiantamento_13o: boolean | null
          aprovado_em: string | null
          aprovado_gestor: boolean | null
          aprovado_gestor_em: string | null
          aprovado_gestor_por: string | null
          aprovado_por: string | null
          aprovado_rh: boolean | null
          aprovado_rh_em: string | null
          aprovado_rh_por: string | null
          aviso_assinatura_em: string | null
          aviso_assinatura_hash: string | null
          aviso_assinatura_ip: unknown
          aviso_assinatura_por: string | null
          aviso_assinatura_user_agent: string | null
          aviso_gerado_em: string | null
          aviso_pdf_url: string | null
          cancelado: boolean | null
          cancelado_em: string | null
          cancelado_por: string | null
          colaborador_id: string
          created_at: string
          created_by: string | null
          data_fim: string
          data_inicio: string
          data_pagamento: string | null
          descontos_inss: number | null
          descontos_irrf: number | null
          dias_abono: number | null
          dias_gozo: number
          documento_url: string | null
          empresa_id: string | null
          enviado_contabilidade: boolean | null
          enviado_contabilidade_em: string | null
          enviado_contabilidade_por: string | null
          ferias_coletiva_id: string | null
          hash_integridade: string | null
          id: string
          justificativa: string | null
          motivo_cancelamento: string | null
          observacoes: string | null
          pagamento_comprovante_path: string | null
          pagamento_confirmado_em: string | null
          pagamento_confirmado_por: string | null
          pagamento_valor: number | null
          periodo_aquisitivo_fim: string | null
          periodo_aquisitivo_id: string
          periodo_aquisitivo_inicio: string | null
          salario_base: number
          saldo_gasto: number | null
          status: string | null
          status_aprovacao_contabilidade: string | null
          status_aprovacao_gestor: string | null
          status_aprovacao_rh: string | null
          updated_at: string
          valor_abono: number | null
          valor_abono_pecuniario: number | null
          valor_adiantamento_13: number | null
          valor_ferias: number
          valor_liquido: number
          valor_terco: number
          valor_terco_abono: number | null
          valor_total: number
          vender_abono: boolean | null
        }
        SetofOptions: {
          from: "*"
          to: "ferias"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rejeitar_despesa: {
        Args: { _despesa_id: string; _motivo: string }
        Returns: {
          aprovado_em: string | null
          aprovado_por: string | null
          categoria: string
          colaborador_id: string
          comprovante_url: string | null
          created_at: string | null
          data_despesa: string
          descricao: string
          empresa_id: string | null
          folha_id: string | null
          id: string
          integrado_folha_em: string | null
          observacoes: string | null
          observacoes_aprovador: string | null
          rejeitado_motivo: string | null
          status: string | null
          tipo: string
          updated_at: string | null
          valor: number
        }
        SetofOptions: {
          from: "*"
          to: "despesas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reset_login_attempts: {
        Args: { p_identifier: string; p_identifier_type?: string }
        Returns: undefined
      }
      resolve_security_alert:
        | {
            Args: { _alert_id: string; _note?: string }
            Returns: {
              created_at: string | null
              details: Json | null
              id: string
              ip_address: string | null
              resolved: boolean | null
              resolved_at: string | null
              resolved_by: string | null
              severity: string
              type: string
              user_id: string | null
            }
            SetofOptions: {
              from: "*"
              to: "security_alerts"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | { Args: { _id: string }; Returns: boolean }
      resolver_divergencia_afdt: {
        Args: { _divergencia_id: string; _observacao?: string }
        Returns: undefined
      }
      revogar_espelho_ponto: {
        Args: {
          _espelho_id: string
          _ip?: unknown
          _motivo: string
          _user_agent?: string
        }
        Returns: Json
      }
      run_rls_tests: { Args: never; Returns: string[] }
      search_audit_unified: {
        Args: {
          _empresa_id?: string
          _from?: string
          _limit?: number
          _source_table?: string
          _to?: string
          _user_id?: string
        }
        Returns: {
          action: string
          empresa_id: string
          entity: string
          entity_id: string
          id: string
          ip_address: unknown
          occurred_at: string
          payload: Json
          source_id: string
          source_table: string
          user_id: string
        }[]
      }
      solicitar_adiantamento_13_ferias: {
        Args: { p_ferias_id: string }
        Returns: Json
      }
      sst_cat_dashboard: { Args: { p_empresa_id: string }; Returns: Json }
      sst_dashboard_sla: { Args: { p_empresa_id: string }; Returns: Json }
      sst_extintores_dashboard: {
        Args: { p_empresa_id: string }
        Returns: Json
      }
      sst_regimento_assinar: {
        Args: {
          p_colaborador_id: string
          p_documento_id: string
          p_ip?: string
          p_user_agent?: string
        }
        Returns: Json
      }
      sst_regimento_dashboard: { Args: { p_empresa_id: string }; Returns: Json }
      sst_regimento_notificar_pendentes: {
        Args: { p_empresa_id: string }
        Returns: {
          ja_assinados: number
          notificados: number
          sem_user: number
        }[]
      }
      sst_regimento_pendentes_lista: {
        Args: { p_empresa_id: string }
        Returns: {
          cargo: string
          colaborador_id: string
          departamento: string
          email: string
          nome: string
          tem_usuario: boolean
          ultima_notificacao: string
        }[]
      }
      sst_regimento_publicar: {
        Args: { p_documento_id: string }
        Returns: Json
      }
      sugerir_proxima_medida: {
        Args: { p_colaborador_id: string; p_empresa_id: string }
        Returns: {
          historico_12m: Json
          justificativa: string
          tipo_sugerido: string
        }[]
      }
      user_belongs_to_empresa: {
        Args: { _empresa_id: string; _user_id: string }
        Returns: boolean
      }
      validar_split_ferias: {
        Args: {
          p_colaborador_id: string
          p_dias_novo: number
          p_ferias_id?: string
          p_periodo_aquisitivo_id: string
        }
        Returns: {
          motivo: string
          ok: boolean
        }[]
      }
      validate_status_transition: {
        Args: { _allowed: Json; _new: string; _old: string; _table: string }
        Returns: undefined
      }
      verificar_espelho_ponto: { Args: { _espelho_id: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "gestor" | "rh" | "user"
      escolaridade:
        | "fundamental_incompleto"
        | "fundamental_completo"
        | "medio_incompleto"
        | "medio_completo"
        | "superior_incompleto"
        | "superior_completo"
        | "pos_graduacao"
        | "mestrado"
        | "doutorado"
      estado_civil:
        | "solteiro"
        | "casado"
        | "divorciado"
        | "viuvo"
        | "separado"
        | "uniao_estavel"
      etapa_admissao:
        | "solicitacao"
        | "documentos"
        | "validacao"
        | "pendente"
        | "exame"
        | "contrato"
        | "assinatura"
        | "esocial"
      programacao_ferias_status:
        | "rascunho"
        | "sugerido_gestor"
        | "aprovado_gestor"
        | "aprovado_rh"
        | "convertido"
        | "rejeitado"
        | "cancelado"
      regime_tributario:
        | "simples_nacional"
        | "lucro_presumido"
        | "lucro_real"
        | "mei"
      sexo: "masculino" | "feminino"
      status_afastamento: "ativo" | "encerrado" | "cancelado" | "prorrogado"
      status_colaborador:
        | "ativo"
        | "ferias"
        | "afastado"
        | "desligado"
        | "pendente"
      status_folha: "aberta" | "calculada" | "fechada" | "paga"
      tipo_afastamento:
        | "doenca"
        | "acidente_trabalho"
        | "acidente_trajeto"
        | "licenca_maternidade"
        | "licenca_paternidade"
        | "licenca_casamento"
        | "licenca_obito"
        | "licenca_nao_remunerada"
        | "servico_militar"
        | "mandato_sindical"
        | "suspensao_disciplinar"
        | "outros"
      tipo_conta: "corrente" | "poupanca" | "salario"
      tipo_contrato:
        | "clt"
        | "pj"
        | "estagiario"
        | "temporario"
        | "intermitente"
        | "aprendiz"
      tipo_desligamento:
        | "sem_justa_causa"
        | "justa_causa"
        | "pedido_demissao"
        | "acordo"
        | "fim_contrato"
        | "falecimento"
      tipo_evento_folha: "provento" | "desconto" | "informativo"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "gestor", "rh", "user"],
      escolaridade: [
        "fundamental_incompleto",
        "fundamental_completo",
        "medio_incompleto",
        "medio_completo",
        "superior_incompleto",
        "superior_completo",
        "pos_graduacao",
        "mestrado",
        "doutorado",
      ],
      estado_civil: [
        "solteiro",
        "casado",
        "divorciado",
        "viuvo",
        "separado",
        "uniao_estavel",
      ],
      etapa_admissao: [
        "solicitacao",
        "documentos",
        "validacao",
        "pendente",
        "exame",
        "contrato",
        "assinatura",
        "esocial",
      ],
      programacao_ferias_status: [
        "rascunho",
        "sugerido_gestor",
        "aprovado_gestor",
        "aprovado_rh",
        "convertido",
        "rejeitado",
        "cancelado",
      ],
      regime_tributario: [
        "simples_nacional",
        "lucro_presumido",
        "lucro_real",
        "mei",
      ],
      sexo: ["masculino", "feminino"],
      status_afastamento: ["ativo", "encerrado", "cancelado", "prorrogado"],
      status_colaborador: [
        "ativo",
        "ferias",
        "afastado",
        "desligado",
        "pendente",
      ],
      status_folha: ["aberta", "calculada", "fechada", "paga"],
      tipo_afastamento: [
        "doenca",
        "acidente_trabalho",
        "acidente_trajeto",
        "licenca_maternidade",
        "licenca_paternidade",
        "licenca_casamento",
        "licenca_obito",
        "licenca_nao_remunerada",
        "servico_militar",
        "mandato_sindical",
        "suspensao_disciplinar",
        "outros",
      ],
      tipo_conta: ["corrente", "poupanca", "salario"],
      tipo_contrato: [
        "clt",
        "pj",
        "estagiario",
        "temporario",
        "intermitente",
        "aprendiz",
      ],
      tipo_desligamento: [
        "sem_justa_causa",
        "justa_causa",
        "pedido_demissao",
        "acordo",
        "fim_contrato",
        "falecimento",
      ],
      tipo_evento_folha: ["provento", "desconto", "informativo"],
    },
  },
} as const
