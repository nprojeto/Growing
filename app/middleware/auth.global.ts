export default defineNuxtRouteMiddleware(async (to) => {
  const { supa, configured, session } = useSupa()
  if (!configured) return to.path === '/' ? undefined : navigateTo('/')
  const { data } = await supa.auth.getSession()
  session.value = data.session
  if (!data.session && to.path !== '/') return navigateTo('/')
  if (data.session && to.path === '/') return navigateTo('/painel')
})
