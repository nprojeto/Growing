<script setup lang="ts">
const store = useStore()
const { farms, farm, paddocks, sensors, grassTypes, readings, alerts, profile, loaded } = store
const { ok, err, info } = useToast()

const paddockSel = useState<string | null>('paddockSel', () => null)
const selected = ref<string[]>([])           // sensores filtrados
const period = ref<number>(30)               // dias (0 = tudo)
const seeding = ref(false)

// aplica cadastro pendente (primeiro acesso)
onMounted(async () => {
  try {
    await store.waitLoaded()
    const res = await store.applyPending()
    if (res?.paddockId && !res.demo) { info('Fazenda criada! Agora desenhe o piquete no mapa.'); return navigateTo(`/piquete/${res.paddockId}`) }
    if (res?.demo) ok('Fazenda de demonstração carregada 🌿')
  } catch (e) { err(e) }
})

const paddock = computed(() => paddocks.value.find((p) => p.id === paddockSel.value) || paddocks.value[0] || null)
watch(paddocks, (ps) => { if (!ps.find((p) => p.id === paddockSel.value)) paddockSel.value = ps[0]?.id || null }, { immediate: true })

const canopy = computed(() =>
  sensors.value.filter((s) => s.paddock_id === paddock.value?.id && s.role === 'canopy')
    .map((s, i) => ({ ...s, _color: colorFor(i) })),
)
watch(() => paddock.value?.id, () => { selected.value = canopy.value.map((s) => s.id) }, { immediate: true })
watch(canopy, (c) => { selected.value = selected.value.filter((id) => c.find((s) => s.id === id)); if (!selected.value.length) selected.value = c.map((s) => s.id) })

const target = computed(() => targetOf(paddock.value, grassTypes.value))
const current = computed(() => currentAvg(readings.value, selected.value))
const status = computed(() => statusOf(current.value.value, target.value.min, target.value.max))
const latestMap = computed(() => latestValid(readings.value, canopy.value.map((s) => s.id)))
const lastAny = (id: string) => {
  let best: any = null
  for (const r of readings.value) if (r.sensor_id === id && (!best || r.measured_at > best.measured_at)) best = r
  return best
}

const mapSensors = computed(() => {
  const ref = sensors.value.filter((s) => s.role === 'reference' && (s.paddock_id === paddock.value?.id || !s.paddock_id))
  return [
    ...ref.map((s) => ({ ...s, color: '#f2b632' })),
    ...canopy.value.map((s) => {
      const v = latestMap.value.get(s.id)?.interception_pct
      const st = statusOf(v == null ? null : Number(v), target.value.min, target.value.max)
      return { ...s, value: v == null ? null : Number(v), color: st.color, faded: !selected.value.includes(s.id) }
    }),
  ]
})

const lastValidMs = computed(() => {
  let m = 0
  for (const r of readings.value) if (r.quality === 'valida' && selected.value.includes(r.sensor_id)) m = Math.max(m, +new Date(r.measured_at))
  return m || Date.now()
})
const chart = computed(() => {
  const sel = canopy.value.filter((s) => selected.value.includes(s.id))
  const from = period.value ? lastValidMs.value - period.value * 864e5 : 0
  const d = dailySeries(readings.value, sel, from)
  return sel.length > 1 ? [...d.series, d.avg] : d.series
})

const farmOverview = computed(() => paddocks.value.map((p) => {
  const ids = sensors.value.filter((s) => s.paddock_id === p.id && s.role === 'canopy').map((s) => s.id)
  const t = targetOf(p, grassTypes.value)
  const c = currentAvg(readings.value, ids)
  return { p, t, c, st: statusOf(c.value, t.min, t.max), n: ids.length }
}))
const otherBoundaries = computed(() => paddocks.value.filter((p) => p.id !== paddock.value?.id && p.boundary?.length >= 3)
  .map((p) => ({ name: p.name, boundary: p.boundary, color: '#ffffff' })))

const paddockAlerts = computed(() => alerts.value.filter((a) => !a.paddock_id || a.paddock_id === paddock.value?.id).slice(0, 5))
const hello = computed(() => {
  const h = new Date().getHours()
  const nome = (profile.value?.full_name || '').split(' ')[0]
  return `${h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'}${nome ? ', ' + nome : ''}!`
})

function toggle(id: string) {
  selected.value = selected.value.includes(id) ? selected.value.filter((x) => x !== id) : [...selected.value, id]
}
function selectAll() { selected.value = canopy.value.map((s) => s.id) }

async function demo() {
  seeding.value = true
  try { await store.seedDemo(true); ok('Fazenda de demonstração carregada 🌿') } catch (e) { err(e) } finally { seeding.value = false }
}
async function reavaliar() {
  try { await store.evaluateAlerts(); ok('Alertas atualizados') } catch (e) { err(e) }
}
</script>

<template>
  <div class="wrap">
    <!-- sem fazenda -->
    <div v-if="loaded && !farms.length" class="card empty-state">
      <GrassMeter :value="null" :min="90" :max="95" compact />
      <h2 class="mt">Vamos começar!</h2>
      <p class="muted">Cadastre sua fazenda ou veja o app funcionando com dados de demonstração.</p>
      <div class="row" style="justify-content:center">
        <NuxtLink to="/fazendas" class="btn primary">🏡 Cadastrar fazenda</NuxtLink>
        <button class="btn sun" :disabled="seeding" @click="demo">{{ seeding ? 'Carregando…' : '🧪 Carregar demonstração' }}</button>
      </div>
    </div>

    <div v-else-if="!loaded" class="grid g2">
      <div class="skeleton" style="height:380px" /><div class="skeleton" style="height:380px" />
    </div>

    <template v-else>
      <div class="row between mb">
        <div>
          <h1>{{ hello }}</h1>
          <div class="muted">{{ farm?.name }} · {{ farm?.farmer_name }}</div>
        </div>
        <div class="row">
          <button v-if="!farms.some(f => f.is_demo)" class="btn sm sun" :disabled="seeding" @click="demo">🧪 Demonstração</button>
          <button class="btn sm" @click="reavaliar">🔄 Reavaliar alertas</button>
        </div>
      </div>

      <div v-if="!paddocks.length" class="card">
        <h2>Nenhum piquete ainda</h2>
        <p class="muted">Crie um piquete na tela de fazendas para desenhar o contorno e posicionar os sensores.</p>
        <NuxtLink to="/fazendas" class="btn primary">Criar piquete</NuxtLink>
      </div>

      <template v-else>
        <!-- seletor de piquete -->
        <div class="tabs mb">
          <button v-for="o in farmOverview" :key="o.p.id" class="chip tab" :class="{ on: o.p.id === paddock?.id }" @click="paddockSel = o.p.id">
            <span class="dot" :style="{ background: o.st.color }" />{{ o.p.name }}
            <span class="tiny muted">{{ fmtPct(o.c.value, 0) }}</span>
          </button>
        </div>

        <div v-if="paddock && (!paddock.boundary || paddock.boundary.length < 3)" class="banner warn mb">
          <div>✏️</div>
          <div class="grow"><b>Desenhe o contorno de {{ paddock.name }}</b> e posicione os sensores.</div>
          <NuxtLink :to="`/piquete/${paddock.id}`" class="btn sm primary">Abrir no mapa</NuxtLink>
        </div>

        <!-- filtro de sensores -->
        <div class="card flat filt mb">
          <div class="row between">
            <div class="row">
              <b class="small">Sensores:</b>
              <button v-for="s in canopy" :key="s.id" class="chip" :class="{ on: selected.includes(s.id) }" @click="toggle(s.id)">
                <span class="dot" :style="{ background: s._color }" />{{ s.name || 'Sensor ' + s.device_id }}
              </button>
              <button v-if="selected.length < canopy.length" class="btn sm ghost" @click="selectAll">Todos</button>
              <span v-if="!canopy.length" class="small muted">Nenhum sensor neste piquete.</span>
            </div>
            <span class="tiny muted">{{ selected.length }} de {{ canopy.length }} no cálculo</span>
          </div>
        </div>

        <div class="grid g2">
          <!-- ilustração -->
          <div class="card">
            <div class="row between">
              <div>
                <div class="tiny muted">{{ KIND_LABEL[paddock?.kind] }} · {{ paddock?.area_ha ? fmtNum(paddock.area_ha, 2) + ' ha' : 'área não definida' }}</div>
                <h2>{{ paddock?.name }}</h2>
              </div>
              <NuxtLink :to="`/piquete/${paddock?.id}`" class="btn sm">⚙️ Configurar</NuxtLink>
            </div>
            <GrassMeter :value="current.value" :min="target.min" :max="target.max"
              :grass-name="target.grass?.name" :entry-height="target.grass?.entry_height_cm" :exit-height="target.grass?.exit_height_cm" />
            <div class="row between small muted">
              <span>Média de {{ current.count }} sensor(es)</span>
              <span>Última leitura válida: {{ fmtDateTime(current.at) }}</span>
            </div>
          </div>

          <!-- mapa -->
          <div class="card">
            <div class="row between mb"><h3>Mapa</h3><span class="tiny muted">☀ referência · cores = situação</span></div>
            <ClientOnly>
              <MapView :key="paddock?.id" :boundary="paddock?.boundary || []" :sensors="mapSensors" :others="otherBoundaries" tall @select="toggle" />
            </ClientOnly>
            <div class="tiny muted mt">Toque num sensor para incluir/excluir do cálculo.</div>
          </div>
        </div>

        <!-- cartões de sensores -->
        <div class="grid auto mt">
          <div v-for="s in canopy" :key="s.id" class="card sensor" :class="{ off: !selected.includes(s.id) }" @click="toggle(s.id)">
            <div class="row between">
              <b><span class="dot" :style="{ background: s._color }" /> {{ s.name || 'Sensor ' + s.device_id }}</b>
              <span class="tiny muted">ID {{ s.device_id }}</span>
            </div>
            <template v-if="latestMap.get(s.id)">
              <div class="big" :style="{ color: statusOf(Number(latestMap.get(s.id).interception_pct), target.min, target.max).color }">
                {{ fmtPct(Number(latestMap.get(s.id).interception_pct)) }}
              </div>
              <StatusBadge :status="statusOf(Number(latestMap.get(s.id).interception_pct), target.min, target.max)" />
              <div class="tiny muted mt">Válida em {{ fmtDateTime(latestMap.get(s.id).measured_at) }}</div>
            </template>
            <div v-else class="muted small mt">Sem leitura válida ainda.</div>
            <hr>
            <div class="row between tiny">
              <span>📶 <b :style="{ color: rssiLabel(s.last_rssi).color }">{{ rssiLabel(s.last_rssi).label }}</b> {{ s.last_rssi ?? '' }} dBm</span>
              <span class="muted">{{ fmtAgo(s.last_seen_at) }}</span>
            </div>
            <div v-if="lastAny(s.id) && lastAny(s.id).quality !== 'valida'" class="tiny mt" :style="{ color: QUALITY[lastAny(s.id).quality]?.color }">
              Última: {{ QUALITY[lastAny(s.id).quality]?.label }}
            </div>
          </div>
        </div>

        <!-- gráfico + alertas -->
        <div class="grid g2 mt">
          <div class="card">
            <div class="row between mb">
              <h3>Evolução da interceptação</h3>
              <div class="row">
                <button v-for="p in [7, 30, 90, 0]" :key="p" class="chip" :class="{ on: period === p }" @click="period = p">{{ p ? p + 'd' : 'Tudo' }}</button>
              </div>
            </div>
            <LineChart :series="chart" :min="target.min" :max="target.max" />
          </div>
          <div class="card">
            <div class="row between mb"><h3>Alertas</h3><NuxtLink to="/alertas" class="small">ver todos</NuxtLink></div>
            <div class="stack">
              <AlertItem v-for="a in paddockAlerts" :key="a.id" :alert="a" compact />
              <div v-if="!paddockAlerts.length" class="muted small">Nenhum alerta aberto. Tudo tranquilo no pasto 🌤️</div>
            </div>
          </div>
        </div>

        <!-- visão da fazenda -->
        <h2 class="mt">Visão da fazenda</h2>
        <div class="grid auto">
          <div v-for="o in farmOverview" :key="o.p.id" class="card ov" :class="{ on: o.p.id === paddock?.id }" @click="paddockSel = o.p.id">
            <GrassMeter :value="o.c.value" :min="o.t.min" :max="o.t.max" compact />
            <div class="row between mt">
              <b>{{ o.p.name }}</b><span class="tiny muted">{{ o.n }} sensores</span>
            </div>
            <div class="row between">
              <StatusBadge :status="o.st" />
              <span class="tiny muted">{{ o.t.grass?.name || '—' }}</span>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.empty-state { max-width: 560px; margin: 40px auto; text-align: center; }
.filt { padding: 10px 14px; }
.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.sensor { cursor: pointer; transition: .2s; }
.sensor.off { opacity: .45; filter: grayscale(.6); }
.sensor:hover { transform: translateY(-2px); }
.ov { cursor: pointer; transition: .2s; }
.ov.on { border-color: var(--leaf-2); box-shadow: 0 0 0 3px var(--leaf-soft); }
.ov:hover { transform: translateY(-2px); }
</style>
