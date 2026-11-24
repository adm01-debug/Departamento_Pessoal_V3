// V15-234: src/vite-env.d.ts
/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  /** Chave pública canônica do projeto (única suportada). */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_PROJECT_ID?: string;
  readonly VITE_API_URL?: string;
  /** 'true' somente se o provider Google estiver habilitado no Supabase Auth. */
  readonly VITE_AUTH_GOOGLE_ENABLED?: string;
  /**
   * Chave PÚBLICA VAPID (base64url) do Web Push. A privada é segredo de
   * servidor (`VAPID_PRIVATE_KEY` nas Edge Functions), nunca aqui.
   */
  readonly VITE_VAPID_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
