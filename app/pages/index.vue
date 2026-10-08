<script setup lang="ts">
const { configured } = useSupa()
const { err } = useToast()
const tab = ref<'entrar' | 'cadastrar'>('cadastrar')
const loading = ref(false)
const msg = ref('')
const f = reactive({ name: '', email: '', password: '', farm: '', paddock: '', kind: 'piquete', demo: false })

async function entrar() {
  loading.value = true
  try {
    const { error } = await sb().auth.signInWithPassword({ email: f.email.trim(), password: f.password })
    if (error) throw new Error(traduz(error.message))
    await navigateTo('/painel')
  } catch (e) { err(e) } finally { loading.value = false }
}

async function cadastrar() {
  if (!f.name || !f.farm || !f.paddock) return err(new Error('Preencha seu nome, a fazenda e o piquete.'))
  loading.value = true
  try {
    lsSet('pv_pending', JSON.stringify({ farmName: f.farm, farmerName: f.name, paddockName: f.paddock, kind: f.kind, demo: f.demo }))
    const { data, error } = await sb().auth.signUp({
      email: f.email.trim(), password: f.password,
      options: { data: { full_name: f.name } },
    })
    if (error) throw new Error(traduz(error.message))
    if (data.session) await navigateTo('/painel')
    else msg.value = 'Enviamos um e-mail de confirmação. Clique no link e depois entre aqui com seu e-mail e senha.'
  } catch (e) { err(e) } finally { loading.value = false }
}

async function recuperar() {
  if (!f.email) return err(new Error('Digite seu e-mail.'))
  const { error } = await sb().auth.resetPasswordForEmail(f.email.trim())
  if (error) return err(new Error(traduz(error.message)))
  msg.value = 'Enviamos um link para redefinir sua senha.'
}

function traduz(m: string) {
  if (/Invalid login/i.test(m)) return 'E-mail ou senha incorretos.'
  if (/already registered/i.test(m)) return 'Este e-mail já tem cadastro. Use "Entrar".'
  if (/Password should be/i.test(m)) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (/Email not confirmed/i.test(m)) return 'Confirme seu e-mail antes de entrar.'
  return m
}
</script>

<template>
  <div class="hero">
    <div class="hero-art" aria-hidden="true">
      <GrassMeter :value="92" :min="90" :max="95" compact />
    </div>

    <div class="wrap inner">
      <div class="intro">
        <div class="row"><LogoLeaf :size="54" /><h1>Pasto <span class="g">Vivo</span></h1></div>
        <p class="lead">Saiba o momento certo de colocar o gado em cada piquete. Sensores medem quanta luz o pasto segura e o app avisa quando ele chega no <b>auge de nutrientes</b>.</p>
        <ul class="feats">
          <li><Icon name="map" /> Desenhe seus piquetes no mapa e posicione os sensores</li>
          <li><Icon name="sprout" /> Faixa ideal por tipo de capim</li>
          <li><Icon name="bell" /> Alertas de ponto de entrada, sensor sem sinal e mais</li>
        </ul>
      </div>

      <div class="card auth">
        <div v-if="!configured" class="banner warn">
          <Icon name="settings" :size="20" />
          <div><b>Falta configurar o Supabase.</b><br><span class="small">Cadastre SUPABASE_URL e SUPABASE_ANON_KEY nas variáveis do GitHub e publique de novo.</span></div>
        </div>
        <template v-else>
          <div class="tabs mb">
            <button class="chip tab" :class="{ on: tab === 'cadastrar' }" @click="tab = 'cadastrar'; msg = ''">Criar conta</button>
            <button class="chip tab" :class="{ on: tab === 'entrar' }" @click="tab = 'entrar'; msg = ''">Entrar</button>
          </div>

          <div v-if="msg" class="banner ok mb"><Icon name="mail" :size="20" /><div>{{ msg }}</div></div>

          <form v-if="tab === 'cadastrar'" @submit.prevent="cadastrar">
            <div class="field"><label>Seu nome (fazendeiro)</label><input v-model="f.name" class="input" required placeholder="Ex.: João da Silva"></div>
            <div class="grid g2">
              <div class="field"><label>Nome da fazenda</label><input v-model="f.farm" class="input" required placeholder="Ex.: Fazenda Boa Vista"></div>
              <div class="field">
                <label>Tipo de área</label>
                <select v-model="f.kind"><option value="piquete">Piquete</option><option value="talhao">Talhão</option><option value="pasto">Pasto</option></select>
              </div>
            </div>
            <div class="field"><label>Nome do {{ KIND_LABEL[f.kind]?.toLowerCase() }}</label><input v-model="f.paddock" class="input" required placeholder="Ex.: Piquete 1"></div>
            <div class="grid g2">
              <div class="field"><label>E-mail</label><input v-model="f.email" type="email" class="input" required autocomplete="email"></div>
              <div class="field"><label>Senha</label><input v-model="f.password" type="password" class="input" required minlength="6" autocomplete="new-password"></div>
            </div>
            <button class="btn primary full mt" :disabled="loading">{{ loading ? 'Criando…' : 'Criar conta' }}</button>
          </form>

          <form v-else @submit.prevent="entrar">
            <div class="field"><label>E-mail</label><input v-model="f.email" type="email" class="input" required autocomplete="email"></div>
            <div class="field"><label>Senha</label><input v-model="f.password" type="password" class="input" required autocomplete="current-password"></div>
            <button class="btn primary full" :disabled="loading">{{ loading ? 'Entrando…' : 'Entrar' }}</button>
            <button type="button" class="btn ghost sm mt" @click="recuperar">Esqueci a senha</button>
          </form>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero { min-height: 100vh; position: relative; overflow: hidden; }
.hero-art { position: absolute; inset: auto -40px -60px auto; width: min(560px, 90vw); opacity: .55; pointer-events: none; transform: rotate(-3deg); }
.inner { position: relative; display: grid; grid-template-columns: 1.1fr 1fr; gap: 32px; align-items: center; min-height: 100vh; }
@media (max-width: 900px) { .inner { grid-template-columns: 1fr; padding-top: 30px; } .hero-art { opacity: .25; } }
.g { color: var(--leaf-2); }
.lead { font-size: 1.12rem; color: var(--ink-2); max-width: 520px; }
.feats { list-style: none; padding: 0; margin: 16px 0 0; display: grid; gap: 8px; font-weight: 700; color: var(--ink-2); }
.feats li { display: flex; align-items: center; gap: 10px; color: var(--leaf-dark); background: rgba(255, 253, 245, .7); border: 1px solid var(--line); border-radius: 12px; padding: 8px 12px; width: fit-content; animation: fadeUp .5s both; }
.feats li:nth-child(2) { animation-delay: .1s; } .feats li:nth-child(3) { animation-delay: .2s; }
.auth { max-width: 480px; width: 100%; justify-self: end; }
.full { width: 100%; justify-content: center; padding: 12px; }
.check { display: flex; gap: 8px; align-items: center; font-weight: 600; }
</style>
