<script setup lang="ts">
type Pt = [number, number]
const route = useRoute()
const store = useStore()
const { farmId, paddocks, sensors, grassTypes, readings, loaded } = store
const { ok, err, info } = useToast()

const id = computed(() => String(route.params.id))
const paddock = computed(() => paddocks.value.find((p) => p.id === id.value) || null)
const form = reactive<any>({ name: '', kind: 'piquete', grass_type_id: '', target_min: 90, target_max: 95, notes: '', boundary: [] as Pt[] })
const mode = ref<'view' | 'draw' | 'sensors'>('view')
const draft = ref<Pt[] | null>(null)
const saving = ref(false)
const place = reactive({ sensorId: '', deviceId: null as number | null, role: 'canopy', name: '' })
const mapRef = ref<any>(null)

onMounted(async () => {
  await store.waitLoaded()
  if (!paddock.value) {
    const { data } = await sb().from('paddocks').select('farm_id').eq('id', id.value).maybeSingle()
    if (data && data.farm_id !== farmId.value) await store.setFarm(data.farm_id)
  }
})

let initFor = ''
watch([paddock, grassTypes], ([p]) => {
  if (!p || initFor === p.id) return
  if (p.grass_type_id && !grassTypes.value.length) return
  initFor = p.id
  const t = targetOf(p, grassTypes.value)
  Object.assign(form, {
    name: p.name, kind: p.kind, grass_type_id: p.grass_type_id || '', notes: p.notes || '',
    target_min: t.min, target_max: t.max, boundary: (p.boundary || []).map((x: Pt) => [x[0], x[1]]),
  })
  if (!form.boundary.length) { mode.value = 'draw'; draft.value = [] }
}, { immediate: true })

const grass = computed(() => grassTypes.value.find((g) => g.id === form.grass_type_id) || null)
const here = computed(() => sensors.value.filter((s) => s.paddock_id === id.value))
const available = computed(() => sensors.value.filter((s) => !s.paddock_id || s.paddock_id === id.value))
const canopyIds = computed(() => here.value.filter((s) => s.role === 'canopy').map((s) => s.id))
const current = computed(() => currentAvg(readings.value, canopyIds.value))
const area = computed(() => polygonAreaHa((draft.value && mode.value === 'draw' ? draft.value : form.boundary) as Pt[]))

const mapSensors = computed(() => {
  const canopy = here.value.filter((s) => s.role === 'canopy')
  return here.value.map((s) => ({ ...s, color: s.role === 'reference' ? '#f2b632' : colorFor(canopy.indexOf(s)) }))
})
const outside = computed(() => here.value.filter((s) => s.lat != null && form.boundary.length >= 3 && !pointInPolygon(s.lat, s.lng, form.boundary)))

function startDraw() { mode.value = 'draw'; draft.value = [] }
function undo() { draft.value?.pop() }
function finishDraw() {
  if (!draft.value || draft.value.length < 3) return err(new Error('Marque pelo menos 3 pontos.'))
  form.boundary = draft.value.slice()
  draft.value = null
  mode.value = 'sensors'
  info('Contorno pronto. Agora toque no mapa para posicionar os sensores e depois clique em Salvar.')
}
function cancelDraw() { draft.value = null; mode.value = 'view' }

async function onMapClick(p: Pt) {
  if (mode.value === 'draw' && draft.value) { draft.value.push(p); return }
  if (mode.value !== 'sensors') return
  try {
    if (place.sensorId) {
      const { error } = await sb().from('sensors').update({ lat: p[0], lng: p[1], paddock_id: id.value }).eq('id', place.sensorId)
      if (error) throw error
      place.sensorId = ''
    } else {
      if (place.deviceId == null || Number.isNaN(place.deviceId)) return err(new Error('Escolha um sensor existente ou digite o ID do novo sensor.'))
      const { error } = await sb().from('sensors').insert({
        farm_id: farmId.value, paddock_id: id.value, device_id: place.deviceId, role: place.role,
        name: place.name || (place.role === 'reference' ? 'Referência' : `Sensor ${place.deviceId}`), lat: p[0], lng: p[1],
      })
      if (error) throw new Error(error.code === '23505' ? 'Já existe um sensor com esse ID nesta fazenda. Selecione-o na lista.' : error.message)
      place.deviceId = null; place.name = ''
    }
    await store.loadFarmData()
    ok('Sensor posicionado')
  } catch (e) { err(e) }
}

async function onMove(sid: string, p: Pt) {
  const { error } = await sb().from('sensors').update({ lat: p[0], lng: p[1] }).eq('id', sid)
  if (error) return err(error)
  const s = sensors.value.find((x) => x.id === sid); if (s) { s.lat = p[0]; s.lng = p[1] }
}

async function updateSensor(s: any, patch: any) {
  const { error } = await sb().from('sensors').update(patch).eq('id', s.id)
  if (error) return err(error)
  Object.assign(s, patch)
  if ('paddock_id' in patch) await store.loadFarmData()
}

function useGrassDefault() {
  if (!grass.value) return
  form.target_min = Number(grass.value.target_min); form.target_max = Number(grass.value.target_max)
}

async function save() {
  saving.value = true
  try {
    const { error } = await sb().from('paddocks').update({
      name: form.name, kind: form.kind, grass_type_id: form.grass_type_id || null, notes: form.notes,
      target_min: form.target_min, target_max: form.target_max,
      boundary: form.boundary, area_ha: polygonAreaHa(form.boundary),
    }).eq('id', id.value)
    if (error) throw error
    await store.loadFarmData()
    mode.value = 'view'
    ok('Piquete salvo')
    store.evaluateAlerts().catch(() => {})
  } catch (e) { err(e) } finally { saving.value = false }
}
</script>

<template>
  <div class="wrap">
    <div v-if="!paddock" class="card">
      <div v-if="!loaded" class="skeleton" style="height:200px" />
      <p v-else>Piquete não encontrado. <NuxtLink to="/fazendas">Voltar</NuxtLink></p>
    </div>

    <template v-else>
      <div class="row between mb">
        <div>
          <NuxtLink to="/painel" class="small row" style="gap:4px;text-decoration:none"><Icon name="back" :size="14" /> Painel</NuxtLink>
          <h1>{{ form.name || 'Piquete' }}</h1>
        </div>
        <button class="btn primary" :disabled="saving" @click="save"><Icon name="save" :size="16" /> {{ saving ? 'Salvando…' : 'Salvar' }}</button>
      </div>

      <div class="grid g2">
        <!-- MAPA -->
        <div class="card">
          <div class="row between mb">
            <h3>Mapa</h3>
            <div class="row">
              <button class="chip" :class="{ on: mode === 'view' }" @click="cancelDraw"><Icon name="eye" :size="15" /> Ver</button>
              <button class="chip" :class="{ on: mode === 'draw' }" @click="startDraw"><Icon name="pencil" :size="15" /> Desenhar contorno</button>
              <button class="chip" :class="{ on: mode === 'sensors' }" @click="mode = 'sensors'; draft = null"><Icon name="pin" :size="15" /> Sensores</button>
            </div>
          </div>

          <div v-if="mode === 'draw'" class="banner warn mb">
            <Icon name="pencil" :size="20" />
            <div class="grow small">Toque no mapa nos cantos da área, em ordem. <b>{{ draft?.length || 0 }}</b> ponto(s).</div>
            <button class="btn sm" @click="undo">Desfazer</button>
            <button class="btn sm primary" @click="finishDraw">Concluir</button>
          </div>

          <div v-if="mode === 'sensors'" class="banner info mb" style="display:block">
            <div class="small mb"><b>Toque no mapa</b> para posicionar. Arraste os pinos para ajustar.</div>
            <div class="grid g2">
              <div class="field">
                <label>Sensor</label>
                <select v-model="place.sensorId">
                  <option value="">+ Novo sensor</option>
                  <option v-for="s in available" :key="s.id" :value="s.id">
                    ID {{ s.device_id }} · {{ s.name }}{{ s.paddock_id ? ' (mover)' : ' (sem piquete)' }}
                  </option>
                </select>
              </div>
              <template v-if="!place.sensorId">
                <div class="field"><label>ID do hardware</label><input v-model.number="place.deviceId" type="number" min="0" class="input" placeholder="Ex.: 12"></div>
                <div class="field"><label>Papel</label>
                  <select v-model="place.role"><option value="canopy">No pasto (mede sob o capim)</option><option value="reference">Referência (sol pleno)</option></select>
                </div>
                <div class="field"><label>Nome (opcional)</label><input v-model="place.name" class="input"></div>
              </template>
            </div>
          </div>

          <ClientOnly>
            <MapView ref="mapRef" :boundary="form.boundary" :draft="draft" :sensors="mapSensors" :mode="mode" tall
              @click="onMapClick" @move="onMove" />
          </ClientOnly>
          <div class="row between small muted mt">
            <span>Área: <b>{{ area ? fmtNum(area, 2) + ' ha' : '—' }}</b></span>
            <span>{{ form.boundary.length }} vértices · {{ here.length }} sensores</span>
          </div>
          <div v-if="outside.length" class="banner warn mt small"><Icon name="warning" :size="18" /><div>Fora do contorno: {{ outside.map(s => 'ID ' + s.device_id).join(', ') }}.</div></div>
        </div>

        <!-- DADOS + FAIXA -->
        <div class="stack">
          <div class="card">
            <h3>Dados</h3>
            <div class="grid g2">
              <div class="field"><label>Nome</label><input v-model="form.name" class="input"></div>
              <div class="field"><label>Tipo</label>
                <select v-model="form.kind"><option value="piquete">Piquete</option><option value="talhao">Talhão</option><option value="pasto">Pasto</option></select>
              </div>
            </div>
            <div class="field"><label>Tipo de capim</label>
              <select v-model="form.grass_type_id" @change="useGrassDefault">
                <option value="">— selecione —</option>
                <optgroup v-for="(lbl, cat) in CATEGORY_LABEL" :key="cat" :label="lbl">
                  <option v-for="g in grassTypes.filter(x => x.category === cat)" :key="g.id" :value="g.id">{{ g.name }}{{ g.owner_id ? ' (meu)' : '' }}</option>
                </optgroup>
              </select>
              <div v-if="grass" class="tiny muted mt">{{ grass.scientific_name }} · entrada ≈ {{ grass.entry_height_cm }} cm · saída ≈ {{ grass.exit_height_cm }} cm</div>
            </div>
            <div class="field"><label>Observações</label><input v-model="form.notes" class="input"></div>
          </div>

          <div class="card">
            <div class="row between">
              <h3>Ponto ideal para o gado</h3>
              <button v-if="grass" class="btn sm ghost" @click="useGrassDefault">Usar padrão do capim</button>
            </div>
            <p class="small muted">Arraste para definir a faixa. Você recebe um alerta quando a média dos sensores entrar nela.</p>
            <GrassMeter v-model:min="form.target_min" v-model:max="form.target_max" :value="current.value" editable
              :grass-name="grass?.name" :entry-height="grass?.entry_height_cm" :exit-height="grass?.exit_height_cm" />
          </div>
        </div>
      </div>

      <!-- SENSORES DESTE PIQUETE -->
      <div class="card mt">
        <h3>Sensores neste {{ KIND_LABEL[form.kind]?.toLowerCase() }}</h3>
        <div class="scroll-x">
          <table class="table">
            <thead><tr><th>ID</th><th>Nome</th><th>Papel</th><th>Posição</th><th>Sinal</th><th>Última leitura</th><th /></tr></thead>
            <tbody>
              <tr v-for="s in here" :key="s.id">
                <td><b>{{ s.device_id }}</b></td>
                <td><input :value="s.name" class="input" style="min-width:140px" @change="updateSensor(s, { name: ($event.target as HTMLInputElement).value })"></td>
                <td>
                  <select :value="s.role" @change="updateSensor(s, { role: ($event.target as HTMLSelectElement).value })">
                    <option value="canopy">No pasto</option><option value="reference">Referência</option>
                  </select>
                </td>
                <td class="tiny">{{ s.lat != null ? `${s.lat.toFixed(6)}, ${s.lng.toFixed(6)}` : 'não posicionado' }}</td>
                <td><span :style="{ color: rssiLabel(s.last_rssi).color }">{{ rssiLabel(s.last_rssi).label }}</span> <span class="tiny muted">{{ s.last_rssi }}</span></td>
                <td class="tiny">{{ fmtDateTime(s.last_seen_at) }}</td>
                <td><button class="btn sm ghost danger" title="Remover do piquete" @click="updateSensor(s, { paddock_id: null })"><Icon name="x" :size="15" /></button></td>
              </tr>
              <tr v-if="!here.length"><td colspan="7" class="muted">Nenhum sensor. Use o modo Sensores no mapa.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
