import { BaseService, ListOptions, ListResponse } from './baseService';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, Insertable, Updatable } from '@/integrations/supabase/database.types';
import { admissaoSchema } from '@/schemas/admissao';
import { validateInput } from '@/schemas/validate';
import { todayLocalISO } from '@/utils/dateLocal';

class AdmissaoService extends BaseService<Tables<'admissoes'>, Insertable<'admissoes'>, Updatable<'admissoes'>> {
  constructor() {
    super('admissoes', {
      defaultOrderBy: 'data_prevista',
    });
  }

  async criar(d: Insertable<'admissoes'>): Promise<Tables<'admissoes'>> {
    validateInput(admissaoSchema, d as Record<string, unknown>, 'admissaoService.criar');
    return super.criar(d);
  }

  async atualizar(id: string, d: Updatable<'admissoes'>, empresaId: string): Promise<Tables<'admissoes'>> {
    validateInput(admissaoSchema, d as Record<string, unknown>, 'admissaoService.atualizar');
    return super.atualizar(id, d, empresaId);
  }

  async listar(options: ListOptions = {}): Promise<ListResponse<Tables<'admissoes'>>> {
    const { filters } = options;
    const empresaId = filters?.empresa_id as string | undefined;
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const data = await this.listarAdmissoes(empresaId);
    return { data, total: data.length };
  }

  async listarAdmissoes(empresaId: string): Promise<Tables<'admissoes'>[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let query = this.getQuery().select('*').order('data_prevista', { ascending: false });
    query = query.eq('empresa_id', empresaId);
    const { data, error } = await query;
    if (error) throw error;
    return (data as Tables<'admissoes'>[]) || [];
  }

  // Aliases
  async getAll(empresaId: string) {
    return this.listarAdmissoes(empresaId);
  }

  async getById(id: string, empresaId: string) {
    return this.buscarPorId(id, empresaId);
  }
  async create(d: Insertable<'admissoes'>) {
    return this.criar(d);
  }
  async update(id: string, d: Updatable<'admissoes'>, empresaId: string) {
    return this.atualizar(id, d, empresaId);
  }
  // Concluir a admissão fecha o funil: cria o colaborador a partir dos dados
  // da admissão (idempotente via metadata.colaborador_id) e marca a etapa.
  // O insert exige os NOT NULL do schema (cpf, data_nascimento, nome_mae, sexo)
  // — sem eles a conclusão é BLOQUEADA com erro acionável (o card permanece
  // arrastável e os dados podem ser completados na tela de detalhes).
  async concluir(id: string, empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const adm = await this.buscarPorId(id, empresaId);
    if (!adm) throw new Error('Admissão não encontrada');
    // Etapa terminal é fim de linha: cancelada não pode ser reaberta/concluída.
    if (adm.etapa === 'cancelada') throw new Error('Admissão cancelada não pode ser concluída.');
    const meta = { ...((adm.metadata ?? {}) as Record<string, unknown>) };
    const sexoValido = adm.sexo === 'masculino' || adm.sexo === 'feminino';
    const faltantes: string[] = [];
    if (!adm.cpf) faltantes.push('CPF');
    if (!adm.data_nascimento) faltantes.push('data de nascimento');
    if (!adm.nome_mae) faltantes.push('nome da mãe');
    if (!sexoValido) faltantes.push('sexo');
    if (!meta.colaborador_id && faltantes.length > 0) {
      throw new Error(
        `Admissão sem dados obrigatórios do colaborador: ${faltantes.join(', ')}. ` +
          'Complete os dados no detalhe da admissão antes de concluir.'
      );
    }
    if (!meta.colaborador_id) {
      const { data: colab, error } = await supabase
        .from('colaboradores')
        .insert({
          empresa_id: empresaId,
          nome_completo: adm.nome,
          cpf: adm.cpf as string,
          email: adm.email ?? null,
          cargo: adm.cargo ?? 'A definir',
          departamento: adm.departamento ?? 'A definir',
          data_admissao: adm.data_prevista ?? todayLocalISO(),
          data_nascimento: adm.data_nascimento as string,
          nome_mae: adm.nome_mae as string,
          sexo: adm.sexo as 'masculino' | 'feminino',
          salario_base: adm.salario_proposto ?? 0,
          status: 'ativo',
          observacoes: `Origem: admissão ${adm.id}`,
        } as never)
        .select('id')
        .single();
      if (error) {
        // Falha parcial de uma conclusão anterior (colaborador inserido, etapa
        // não gravada): o CPF único rejeita o novo insert. Só reconcilia quando
        // o colaborador encontrado foi criado POR ESTA admissão (marca em
        // observacoes) — um colaborador pré-existente com o mesmo CPF não é
        // vínculo válido e o erro original é propagado.
        const { data: existente } = await supabase
          .from('colaboradores')
          .select('id')
          .eq('empresa_id', empresaId)
          .eq('cpf', adm.cpf as string)
          .eq('observacoes', `Origem: admissão ${adm.id}`)
          .maybeSingle();
        if (existente?.id) {
          meta.colaborador_id = existente.id;
        } else {
          throw error;
        }
      } else {
        meta.colaborador_id = colab.id;
      }
    }
    const admissao = await this.atualizar(id, { etapa: 'concluida', metadata: meta as never }, empresaId);
    return { admissao, colaboradorId: (meta.colaborador_id as string | undefined) ?? null };
  }
  async cancelar(id: string, empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    // Concluída já gerou colaborador ativo — cancelar pela etapa deixaria o
    // vínculo vivo. Reversão de colaborador é processo próprio (desligamento).
    const adm = await this.buscarPorId(id, empresaId);
    if (adm?.etapa === 'concluida') {
      throw new Error(
        'Admissão já concluída — o colaborador criado permanece ativo; use desligamento para revertê-lo.'
      );
    }
    return this.atualizar(id, { etapa: 'cancelada' }, empresaId);
  }
}

export const admissaoService = new AdmissaoService();
