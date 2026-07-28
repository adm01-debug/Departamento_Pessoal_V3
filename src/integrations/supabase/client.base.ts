// Cliente Supabase "cru" (sem o Proxy que roteia tudo via external-db-bridge).
// Usar SOMENTE em casos especiais: auth, leitura de tabelas negadas pelo bridge
// (ex.: audit_log, tabelas de sistema) ou quando o RLS direto do PostgREST
// é suficiente. Para o CRUD normal de negócio, usar `supabase` de
// '@/integrations/supabase/client' — esse roteia pelo bridge com tenant scope.
//
// ATENÇÃO: reexporta o supabaseBase de client.ts para evitar múltiplas
// instâncias de GoTrueClient no mesmo browser context.
export { supabaseBase as supabase } from './client';
