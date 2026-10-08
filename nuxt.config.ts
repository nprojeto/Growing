// Pasto Vivo — configuração do Nuxt (site estático para GitHub Pages)
export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  css: ['leaflet/dist/leaflet.css', '~/assets/main.css'],
  router: { options: { hashMode: true } },
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
    head: {
      title: 'Pasto Vivo',
      htmlAttrs: { lang: 'pt-BR' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#2f6b34' },
        { name: 'description', content: 'Monitoramento de pastagem por interceptação luminosa' },
      ],
      link: [
        { rel: 'icon', href: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><path d='M32 58C14 50 8 30 18 10c10 14 22 18 30 34-2 8-8 12-16 14z' fill='%232f7d32'/><path d='M32 58c-2-14 0-28 8-40' stroke='%23dcedc8' stroke-width='3' fill='none'/></svg>" },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,800&family=Nunito:wght@400;600;700;800&display=swap' },
      ],
    },
  },
  runtimeConfig: {
    public: {
      supabaseUrl: 'https://ibnqqvhsmktvvsdumseq.supabase.co',
      supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlibnFxdmhzbWt0dnZzZHVtc2VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0ODU3MTYsImV4cCI6MjEwNzA2MTcxNn0._FVjQ4bOud0gjc5NodwOyWzG9e6cQyj6KS3V-iyfCDQ',
    },
  },
})
