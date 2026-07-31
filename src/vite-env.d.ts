// V15-234: src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  /** Chave pública canônica do projeto (única suportada). */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_PROJECT_ID?: string;
  /** @deprecated legado — mantida apenas para compatibilidade do client gerado. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
