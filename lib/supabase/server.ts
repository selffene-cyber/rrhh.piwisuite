// Re-exportar desde archivos separados para evitar problemas con next/headers
// Server Components deben importar desde server-component.ts
// API Routes deben importar desde server-api.ts

export { createServerClient } from './server-component'
export { createServerClientForAPI } from './server-api'


