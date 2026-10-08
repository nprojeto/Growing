<script setup lang="ts">
const { profile } = useStore()
const { ok, err } = useToast()

const email = ref('')
const form = reactive({ full_name: '', phone: '' })
const pw = reactive({ nova: '', confirma: '' })
const newEmail = ref('')
const saving = ref(false)
const savingPw = ref(false)
const savingEmail = ref(false)

onMounted(async () => {
  const { data } = await sb().auth.getUser()
  email.value = data.user?.email || ''
})
watch(profile, (p) => { if (p) { form.full_name = p.full_name || ''; form.phone = p.phone || '' } }, { immediate: true })

const initials = computed(() => (form.full_name || email.value || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join(''))

async function saveProfile() {
  saving.value = true
  try {
    const { data: u } = await sb().auth.getUser()
    const id = u.user!.id
    const { error } = await sb().from('profiles').upsert({ id, full_name: form.full_name.trim(), phone: form.phone.trim() })
    if (error) throw error
    await sb().auth.updateUser({ data: { full_name: form.full_name.trim() } })
    profile.value = { ...(profile.value || {}), id, full_name: form.full_name.trim(), phone: form.phone.trim() }
    ok('Perfil atualizado')
  } catch (e) { err(e) } finally { saving.value = false }
}

async function savePassword() {
  if (pw.nova.length < 6) return err(new Error('A senha precisa ter pelo menos 6 caracteres.'))
  if (pw.nova !== pw.confirma) return err(new Error('As senhas não conferem.'))
  savingPw.value = true
  try {
    const { error } = await sb().auth.updateUser({ password: pw.nova })
    if (error) throw error
    pw.nova = ''; pw.confirma = ''
    ok('Senha alterada')
  } catch (e) { err(e) } finally { savingPw.value = false }
}

async function saveEmail() {
  if (!newEmail.value.includes('@')) return err(new Error('Digite um e-mail válido.'))
  savingEmail.value = true
  try {
    const { error } = await sb().auth.updateUser({ email: newEmail.value.trim() })
    if (error) throw error
    ok('Enviamos um link de confirmação para o novo e-mail.')
    newEmail.value = ''
  } catch (e) { err(e) } finally { savingEmail.value = false }
}
</script>

<template>
  <div class="wrap narrow">
    <div class="row mb">
      <div class="avatar">{{ initials }}</div>
      <div>
        <h1>Meu perfil</h1>
        <div class="muted">{{ email }}</div>
      </div>
    </div>

    <form class="card mb" @submit.prevent="saveProfile">
      <h3 class="row" style="gap:8px"><Icon name="user" /> Dados pessoais</h3>
      <div class="grid g2">
        <div class="field"><label>Nome completo</label><input v-model="form.full_name" class="input" required></div>
        <div class="field"><label>Telefone / WhatsApp</label><input v-model="form.phone" class="input" placeholder="(12) 99999-9999"></div>
      </div>
      <button class="btn primary" :disabled="saving"><Icon name="save" :size="16" /> {{ saving ? 'Salvando…' : 'Salvar dados' }}</button>
    </form>

    <div class="grid g2">
      <form class="card" @submit.prevent="savePassword">
        <h3 class="row" style="gap:8px"><Icon name="lock" /> Alterar senha</h3>
        <div class="field"><label>Nova senha</label><input v-model="pw.nova" type="password" class="input" autocomplete="new-password"></div>
        <div class="field"><label>Confirmar nova senha</label><input v-model="pw.confirma" type="password" class="input" autocomplete="new-password"></div>
        <button class="btn" :disabled="savingPw">{{ savingPw ? 'Alterando…' : 'Alterar senha' }}</button>
      </form>

      <form class="card" @submit.prevent="saveEmail">
        <h3 class="row" style="gap:8px"><Icon name="mail" /> Alterar e-mail</h3>
        <div class="field"><label>E-mail atual</label><input :value="email" class="input" disabled></div>
        <div class="field"><label>Novo e-mail</label><input v-model="newEmail" type="email" class="input"></div>
        <button class="btn" :disabled="savingEmail">{{ savingEmail ? 'Enviando…' : 'Alterar e-mail' }}</button>
        <p class="tiny muted mt">A troca só vale depois de confirmar pelo link enviado ao novo e-mail.</p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.narrow { max-width: 860px; }
.avatar { width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center; font: 800 1.4rem 'Fraunces', serif; color: #fff; background: linear-gradient(135deg, var(--leaf-2), var(--leaf-dark)); box-shadow: var(--shadow); }
</style>
