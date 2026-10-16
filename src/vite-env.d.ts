/// <reference types="vite/client" />

// Variables de entorno públicas de la app (van al bundle: nunca secretos)
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
  // Email interno del único usuario de acceso; el padre nunca lo ve
  readonly VITE_ACCESS_EMAIL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
