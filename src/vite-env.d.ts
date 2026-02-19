/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
    readonly VITE_ENABLE_DEMO?: string
    readonly VITE_COMMIT_SHA?: string
    readonly VITE_BUILD_TIME?: string

    // Feature Flags
    readonly VITE_ENABLE_ANALYTICS?: string
    readonly VITE_ENABLE_CRM?: string
    readonly VITE_ENABLE_ACCOUNTS?: string
    readonly VITE_ENABLE_MAINTENANCE?: string
    readonly VITE_ENABLE_CALENDAR?: string
    readonly VITE_ENABLE_MARKETPLACE?: string
    readonly VITE_ENABLE_SCAN?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
