import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js'

let client: SupabaseClient | null = null
let baseUrl = ''

/** Inicializa o Supabase (chamar dentro de componentes / middleware). */
export function useSupa() {
  const cfg = useRuntimeConfig().public
  const url = String(cfg.supabaseUrl || '').trim()
  const key = String(cfg.supabaseAnonKey || '').trim()
  const configured = !!(url && key)
  if (!client && configured) {
    baseUrl = url
    client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
  }
  const session = useState<Session | null>('session', () => null)
  return { supa: client as SupabaseClient, configured, session, url }
}

/** Cliente Supabase (pode ser usado em qualquer lugar depois de inicializado). */
export function sb(): SupabaseClient {
  if (!client) throw new Error('Supabase não configurado')
  return client
}

export function apiUrl(path = '') {
  return `${baseUrl}/functions/v1/api${path}`
}

/** Chama a Edge Function "api". */
export async function callApi<T = any>(path: string, body: Record<string, any> = {}): Promise<T> {
  const { data, error } = await sb().functions.invoke(`api/${path}`, { body })
  if (error) {
    let msg = error.message
    try {
      const ctx: any = (error as any).context
      if (ctx && typeof ctx.json === 'function') {
        const j = await ctx.json()
        if (j?.error) msg = j.error
      }
    } catch { /* ignora */ }
    throw new Error(msg)
  }
  return data as T
}
