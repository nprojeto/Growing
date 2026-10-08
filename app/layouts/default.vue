<script setup lang="ts">
const { session } = useSupa()
const { farms, farmId, farm, alerts, loaded, busy, refresh, setFarm } = useStore()
const { toasts, err } = useToast()
const route = useRoute()

const nav = [
  { to: '/painel', label: 'Painel', icon: 'dashboard' },
  { to: '/fazendas', label: 'Fazendas', icon: 'farm' },
  { to: '/sensores', label: 'Sensores', icon: 'sensor' },
  { to: '/capins', label: 'Capins', icon: 'sprout' },
  { to: '/alertas', label: 'Alertas', icon: 'bell' },
]
const unread = computed(() => alerts.value.filter((a) => !a.read_at).length)
const showHeader = computed(() => !!session.value && route.path !== '/')

watch(session, async (s) => {
  if (s && !loaded.value) {
    try { await refresh() } catch (e) { err(e) }
  }
}, { immediate: true })

async function changeFarm(e: Event) {
  try { await setFarm((e.target as HTMLSelectElement).value) } catch (x) { err(x) }
}
async function logout() { await sb().auth.signOut() }
</script>

<template>
  <div>
    <header v-if="showHeader" class="top">
      <div class="top-in">
        <NuxtLink to="/painel" class="brand">
          <LogoLeaf :size="34" />
          <span>Pasto <b>Vivo</b></span>
        </NuxtLink>

        <select v-if="farms.length" class="farm-sel" :value="farmId || ''" @change="changeFarm" title="Fazenda ativa">
          <option v-for="f in farms" :key="f.id" :value="f.id">{{ f.name }}</option>
        </select>

        <nav class="nav">
          <NuxtLink v-for="n in nav" :key="n.to" :to="n.to" class="nav-a" :class="{ on: route.path.startsWith(n.to) }">
            <Icon :name="n.icon" :size="17" />{{ n.label }}
            <span v-if="n.to === '/alertas' && unread" class="badge">{{ unread }}</span>
          </NuxtLink>
        </nav>
        <button class="btn ghost sm" title="Sair" @click="logout"><Icon name="logout" :size="16" /> Sair</button>
      </div>
      <div v-if="busy" class="loadbar" />
    </header>


    <main>
      <slot />
    </main>

    <div class="toasts">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="t.kind">{{ t.text }}</div>
    </div>
  </div>
</template>

<style scoped>
.top { position: sticky; top: 0; z-index: 50; background: rgba(255, 253, 245, .88); backdrop-filter: blur(10px); border-bottom: 1px solid var(--line); }
.top-in { max-width: 1240px; margin: 0 auto; padding: 10px 16px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.brand { display: flex; align-items: center; gap: 8px; text-decoration: none; color: var(--leaf-dark); font-family: 'Fraunces', serif; font-size: 1.3rem; }
.brand b { color: var(--leaf-2); }
.farm-sel { width: auto; max-width: 240px; padding: 7px 10px; border-radius: 999px; font-weight: 700; background: var(--surface-2); }
.nav { display: flex; gap: 4px; flex: 1; overflow-x: auto; }
.nav-a { position: relative; text-decoration: none; color: var(--ink-2); font-weight: 700; padding: 7px 12px; border-radius: 999px; white-space: nowrap; display: flex; gap: 6px; align-items: center; transition: .15s; }
.nav-a:hover { background: var(--surface-2); }
.nav-a.on { background: var(--leaf-soft); color: var(--leaf-dark); }

.badge { background: var(--danger); color: #fff; border-radius: 999px; font-size: .7rem; padding: 1px 6px; }
.loadbar { height: 3px; background: linear-gradient(90deg, var(--leaf-2), var(--sun), var(--leaf-2)); background-size: 200% 100%; animation: shimmer 1s linear infinite; }
.demo-strip { background: var(--sun-soft); color: #6b4b00; text-align: center; font-weight: 700; font-size: .85rem; padding: 6px 12px; }
@media (max-width: 700px) {
  .nav { order: 3; flex-basis: 100%; }
  .farm-sel { flex: 1; max-width: none; }
}
</style>
