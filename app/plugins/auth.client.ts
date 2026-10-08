export default defineNuxtPlugin(() => {
  const { supa, configured, session } = useSupa()
  if (!configured) return
  const router = useRouter()
  const store = useStore()
  supa.auth.onAuthStateChange((event, s) => {
    session.value = s
    if (event === 'SIGNED_OUT') { store.reset(); router.push('/') }
  })
})
