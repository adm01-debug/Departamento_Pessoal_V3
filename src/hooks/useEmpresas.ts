/**
 * @fileoverview Hook para gerenciamento de empresas
 * @module hooks/useEmpresas
 */
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, supabaseBase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { safeErrorMessage } from "@/utils/safeError";
import { mockOr, getMockUserEmpresas } from "@/mocks/colaboradoresMock";

import type { RegimeTributario } from "@/constants/regimes";

export interface Empresa {
  id: string;
  cnpj: string | null;
  razao_social: string;
  nome_fantasia: string | null;
  inscricao_estadual: string | null;
  inscricao_municipal: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  telefone: string | null;
  email: string | null;
  logo_url: string | null;
  ativa: boolean;
  // Arquitetura de grupo (Onda 1)
  regime_tributario: RegimeTributario;
  aliquota_simples: number | null;
  fap: number | null;
  rat: number | null;
  terceiros: number | null;
  cor_identificacao: string | null;
  ordem_exibicao: number | null;
  created_at: string;
  updated_at: string;
}

/** Modo de visualização dos dados de empresa. */
export type EmpresaModo = "consolidado" | "empresa_unica";

export interface UserEmpresa {
  id: string;
  user_id: string;
  empresa_id: string;
  is_default: boolean;
  created_at: string;
  empresa?: Empresa;
}

interface EmpresaStore {
  empresaAtualId: string | null;
  modo: EmpresaModo;
  setEmpresaAtual: (id: string | null) => void;
  setModo: (modo: EmpresaModo) => void;
}

// Store para empresa selecionada (persiste no localStorage).
// `modo`: 'consolidado' = todas as empresas do grupo (default);
//         'empresa_unica' = filtra por `empresaAtualId`.
export const useEmpresaStore = create<EmpresaStore>()(
  persist(
    (set) => ({
      empresaAtualId: null,
      modo: "consolidado",
      setEmpresaAtual: (id) => set({ empresaAtualId: id }),
      setModo: (modo) => set({ modo }),
    }),
    {
      name: "empresa-storage",
      version: 2,
    }
  )
);

/**
 * Chaves de cache NÃO vinculadas à empresa ativa (sessão, usuário, tabelas
 * de domínio nacionais). Só estas sobrevivem à troca de tenant.
 */
export const GLOBAL_QUERY_KEYS: readonly string[] = [
  'user-empresas',
  'todas-empresas',
  'auth-user',
  'user-roles',
  'user-permissions',
  'profile',
  'perfil',
  'feature-flags',
  'cid10',
  'nacionalidades',
  'etnias',
  'municipios',
  'tabelas-referencia-nacionais',
];

export function isGlobalQueryKey(key: unknown): boolean {
  return typeof key === 'string' && GLOBAL_QUERY_KEYS.includes(key);
}

interface UseEmpresasReturn {
  userEmpresas: UserEmpresa[] | undefined;
  todasEmpresas: Empresa[] | undefined;
  empresaAtual: Empresa | null;
  empresaAtualId: string | null;
  modo: EmpresaModo;
  isConsolidado: boolean;
  setModo: (modo: EmpresaModo) => void;
  loadingEmpresas: boolean;
  loadingTodas: boolean;
  criarEmpresa: any;
  atualizarEmpresa: any;
  associarUsuario: any;
  definirEmpresaPadrao: any;
  trocarEmpresa: (empresaId: string) => void;
  temMultiplasEmpresas: boolean;
}

const ensureSingleResult = <T>(data: T | null, entity: string): T => {
  if (!data) {
    throw new Error(`Nenhum registro de ${entity} foi retornado pela operação.`);
  }
  return data;
};

export function useEmpresas(): UseEmpresasReturn {
  const queryClient = useQueryClient();
  const { empresaAtualId, modo, setEmpresaAtual, setModo } = useEmpresaStore();
  const { user, isAdmin } = useAuth();

  // Buscar empresas do usuário
  const { data: userEmpresas, isLoading: loadingEmpresas } = useQuery({
    queryKey: ["user-empresas"],
    enabled: true,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data: { user: authUser } } = await supabaseBase.auth.getUser();
      if (!authUser?.id) return [];
      const { data, error } = await supabaseBase
        .from("user_empresas")
        .select(`*`)
        .eq("user_id", authUser.id);

      if (error) throw error;
      const real = (data || []) as (UserEmpresa & { empresa: Empresa })[];
      // Fallback só quando o usuário não tem NENHUM vínculo real — nunca
      // esconde empresas de verdade. Sem isso, VITE_COLABORADORES_MOCK fica
      // inalcançável: toda a área de Colaboradores exige empresa_id.
      if (real.length === 0) {
        const mock = mockOr(getMockUserEmpresas());
        if (mock) return mock as unknown as (UserEmpresa & { empresa: Empresa })[];
      }
      return real;
    },
  });

  // Listar todas as empresas (apenas para admin — evita chamadas desnecessárias)
  const { data: todasEmpresas, isLoading: loadingTodas } = useQuery({
    queryKey: ["todas-empresas"],
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabaseBase.from("empresas").select("*").order("razao_social");

      if (error) {
        if (error.code === "42501") return [];
        throw error;
      }

      return data as Empresa[];
    },
  });

  // Empresa atual - fallback chain (do mais específico ao mais geral):
  // 1) empresa selecionada manualmente + vínculo + dados completos
  // 2) empresa padrão (is_default=true) do usuário
  // 3) PRIMEIRA empresa vinculada do usuário (sem precisar de todasEmpresas)
  // 4) primeira empresa global (só para admins que viram todasEmpresas)
  const empresaVinculo = userEmpresas?.find((ue) => ue.empresa_id === empresaAtualId);
  const empresaAtualData = todasEmpresas?.find(e => e.id === (empresaVinculo?.empresa_id || empresaAtualId));
  const empresaDefaultVinculo = userEmpresas?.find((ue) => ue.is_default);
  const empresaDefault = todasEmpresas?.find(e => e.id === empresaDefaultVinculo?.empresa_id);
  // P0-FIX: quando o usuário NÃO é admin, todasEmpresas é undefined. Sem o
  // fallback abaixo, empresaAtual ficava null mesmo com vínculo válido.
  const empresaPrimeiraVinculadaId = userEmpresas?.[0]?.empresa_id;
  const empresaPrimeiraVinculada = todasEmpresas?.find(e => e.id === empresaPrimeiraVinculadaId);
  const empresaPrimeiraGlobal = todasEmpresas?.[0];
  const empresaEfetiva =
    empresaAtualData ||
    empresaDefault ||
    // `ue.empresa` só vem populado quando o join foi de fato embutido na
    // query (não é o caso do `select('*')` real acima — este ramo é um
    // no-op para dados reais, mas resolve o objeto completo no fallback de
    // VITE_COLABORADORES_MOCK, que injeta `empresa` já aninhado).
    empresaVinculo?.empresa ||
    empresaDefaultVinculo?.empresa ||
    (empresaPrimeiraVinculadaId ? { id: empresaPrimeiraVinculadaId } as Empresa : undefined) ||
    empresaPrimeiraGlobal;


  const primeiraEmpresaId = userEmpresas?.[0]?.empresa_id ?? null;
  useEffect(() => {
    // Sincroniza o ID no store apenas se houver uma empresa disponível e NENHUMA seleção ativa
    if (primeiraEmpresaId && !empresaAtualId) {
      const targetId = empresaDefault?.id ?? primeiraEmpresaId;
      const timer = setTimeout(() => setEmpresaAtual(targetId), 0);
      return () => clearTimeout(timer);
    }
  }, [primeiraEmpresaId, empresaAtualId, empresaDefault?.id, setEmpresaAtual]);


  // Criar empresa
  const criarEmpresa = useMutation({
    mutationFn: async (empresa: Partial<Empresa>) => {
      const insertData = {
        razao_social: empresa.razao_social || "",
        nome_fantasia: empresa.nome_fantasia,
        cnpj: empresa.cnpj,
        inscricao_estadual: empresa.inscricao_estadual,
        inscricao_municipal: empresa.inscricao_municipal,
        cep: empresa.cep,
        logradouro: empresa.logradouro,
        numero: empresa.numero,
        complemento: empresa.complemento,
        bairro: empresa.bairro,
        cidade: empresa.cidade,
        uf: empresa.uf,
        telefone: empresa.telefone,
        email: empresa.email,
        logo_url: empresa.logo_url,
        ativa: empresa.ativa ?? true,
      };

      const { data, error } = await supabaseBase.from("empresas").insert(insertData).select().maybeSingle();

      if (error) throw error;
      return ensureSingleResult(data, "empresa");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todas-empresas"] });
      queryClient.invalidateQueries({ queryKey: ["user-empresas"] });
      toast.success("Empresa criada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(safeErrorMessage(error, 'Erro ao criar empresa.'));
    },
  });

  // Atualizar empresa
  const atualizarEmpresa = useMutation({
    mutationFn: async ({ id, ...dados }: Partial<Empresa> & { id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão expirada. Faça login novamente.');
      const { data: membership } = await supabaseBase.from("user_empresas").select("id").eq("user_id", user.id).eq("empresa_id", id).maybeSingle();
      if (!membership) throw new Error('Sem permissão para atualizar esta empresa.');
      const { data, error } = await supabaseBase.from("empresas").update(dados).eq("id", id).select().maybeSingle();

      if (error) throw error;
      return ensureSingleResult(data, "empresa");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todas-empresas"] });
      queryClient.invalidateQueries({ queryKey: ["user-empresas"] });
      toast.success("Empresa atualizada!");
    },
    onError: (error: Error) => {
      toast.error(safeErrorMessage(error, 'Erro ao atualizar empresa.'));
    },
  });

  // Associar usuário a empresa
  const associarUsuario = useMutation({
    mutationFn: async ({
      userId,
      empresaId,
      isDefault = false,
    }: {
      userId: string;
      empresaId: string;
      isDefault?: boolean;
    }) => {
      const { data, error } = await supabaseBase
        .from("user_empresas")
        .insert({
          user_id: userId,
          empresa_id: empresaId,
          is_default: isDefault,
        })
        .select()
        .maybeSingle();

      if (error) throw error;
      return ensureSingleResult(data, "vínculo de usuário/empresa");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-empresas"] });
      toast.success("Usuário associado à empresa!");
    },
    onError: (error: Error) => {
      toast.error(safeErrorMessage(error, 'Erro ao associar usuário.'));
    },
  });

  // Definir empresa padrão
  const definirEmpresaPadrao = useMutation({
    mutationFn: async (empresaId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      // Remover padrão de todas
      const { error: clearError } = await supabaseBase
        .from("user_empresas")
        .update({ is_default: false })
        .eq("user_id", userData.user.id);

      if (clearError) throw clearError;

      // Definir nova padrão
      const { error } = await supabaseBase
        .from("user_empresas")
        .update({ is_default: true })
        .eq("user_id", userData.user.id)
        .eq("empresa_id", empresaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-empresas"] });
      toast.success("Empresa padrão atualizada!");
    },
  });

  const trocarEmpresa = (empresaId: string) => {
    if (empresaId === empresaAtualId) return;
    
    setEmpresaAtual(empresaId);
    
    // Invalidação por DENYLIST (fail-safe): tudo é considerado tenant-scoped,
    // exceto chaves globais/sessão explicitamente listadas. Uma allowlist deixava
    // qualquer chave nova (ex.: 'sst-extintores') servindo cache da empresa anterior.
    queryClient.invalidateQueries({
      predicate: (query) => !isGlobalQueryKey(query.queryKey[0]),
    });

    toast.success("Contexto de empresa alterado");
  };

  return {
    userEmpresas,
    todasEmpresas,
    empresaAtual: empresaEfetiva ?? null,
    empresaAtualId: empresaEfetiva?.id || null,
    modo,
    isConsolidado: modo === "consolidado",
    setModo,
    loadingEmpresas,
    loadingTodas,
    criarEmpresa,
    atualizarEmpresa,
    associarUsuario,
    definirEmpresaPadrao,
    trocarEmpresa,
    temMultiplasEmpresas: (userEmpresas?.length ?? 0) > 1,
  };
}
