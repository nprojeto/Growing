# Pasto Vivo

Monitoramento de pastagem por **interceptação luminosa**. Sensores no pasto comparam a luz com um sensor de referência a pleno sol e o app avisa quando cada piquete chega ao ponto ideal de entrada do gado.

- Frontend: Nuxt (Vue.js), publicado no GitHub Pages pelo workflow `.github/workflows/deploy.yml`
- Backend: Supabase (banco Postgres + Edge Function `api`)

## Configuração
URL e chave pública do Supabase ficam em `nuxt.config.ts`. Publicação: Settings → Pages → Source = GitHub Actions.

Interceptação (%) = 100 − (lux do sensor ÷ lux da referência × 100)
