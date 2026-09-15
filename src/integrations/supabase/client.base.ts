// Cliente Supabase "cru" (sem o Proxy que roteia tudo via external-db-bridge).
// Usar SOMENTE em casos especiais: auth, Storage, Realtime ou quando o RLS
// direto do PostgREST é suficiente. Tabelas de auditoria não são uma exceção:
// sua leitura deve passar pelas RPCs tenant-scoped. Para o CRUD normal, usar `supabase` de
// '@/integrations/supabase/client' — esse roteia pelo bridge com tenant scope.
//
// ATENÇÃO: reexporta o supabaseBase de client.ts para evitar múltiplas
// instâncias de GoTrueClient no mesmo browser context.
export { supabaseBase as supabase } from './client';
