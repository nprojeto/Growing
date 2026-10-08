<script setup lang="ts">
const store = useStore()
const { farmId, paddocks, sensors, gateways } = store
const { ok, err } = useToast()

const logText = ref('')
const importing = ref(false)
const gwName = ref('Central')
const filter = ref<'todos' | 'sem' | string>('todos')

const list = computed(() => {
  if (filter.value === 'todos') return sensors.value
  if (filter.value === 'sem') return sensors.value.filter((s) => !s.paddock_id)
  return sensors.value.filter((s) => s.paddock_id === filter.value)
})
const padName = (id: string | null) => paddocks.value.find((p) => p.id === id)?.name || '—'
const unassigned = computed(() => sensors.value.filter((s) => !s.paddock_id).length)

async function update(s: any, patch: any) {
  const { error } = await sb().from('sensors').update(patch).eq('id', s.id)
  if (error) return err(error)
  Object.assign(s, patch)
  if ('paddock_id' in patch) await store.loadFarmData()
}
async function remove(s: any) {
  if (!confirm(`Excluir o sensor ID ${s.device_id} e todas as leituras dele?`)) return
  const { error } = await sb().from('sensors').delete().eq('id', s.id)
  if (error) return err(error)
  await store.loadFarmData(); ok('Sensor excluído')
}

async function importLog() {
  if (!logText.value.trim()) return
  importing.value = true
  try {
    const r = await callApi('import-log', { farm_id: farmId.value, text: logText.value })
    ok(`${r.received} leituras importadas${r.sensors_created ? ` · ${r.sensors_created} sensor(es) novo(s)` : ''}`)
    logText.value = ''
    await store.loadFarmData()
  } catch (e) { err(e) } finally { importing.value = false }
}
async function pickFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) logText.value = await f.text()
}

async function addGateway() {
  const { error } = await sb().from('gateways').insert({ farm_id: farmId.value, name: gwName.value || 'Central' })
  if (error) return err(error)
  await store.loadFarmData(); ok('Central criada')
}
async function removeGateway(g: any) {
  if (!confirm('Excluir esta central? Ela deixará de enviar leituras.')) return
  const { error } = await sb().from('gateways').delete().eq('id', g.id)
  if (error) return err(error)
  await store.loadFarmData()
}
async function copy(t: string) {
  try { await navigator.clipboard.writeText(t); ok('Copiado') } catch { err(new Error('Não foi possível copiar')) }
}
const ingestUrl = computed(() => apiUrl('/ingest'))
const example = `{
  "readings": [
    { "device_id": 0, "lux": 45210, "rssi": 0,    "measured_at": "2026-10-08T12:30:00-03:00" },
    { "device_id": 5, "lux": 2650,  "rssi": -103, "measured_at": "2026-10-08T12:34:00-03:00" }
  ]
}`
</script>

<template>
  <div class="wrap">
    <h1>Sensores</h1>

    <div v-if="unassigned" class="banner info mb">
      <div>🆕</div><div><b>{{ unassigned }} sensor(es) sem piquete.</b> Escolha o piquete na tabela e depois posicione no mapa.</div>
    </div>

    <div class="card mb">
      <div class="row between mb">
        <h3>Lista</h3>
        <select v-model="filter" style="width:auto">
          <option value="todos">Todos</option>
          <option value="sem">Sem piquete</option>
          <option v-for="p in paddocks" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>
      <div class="scroll-x">
        <table class="table">
          <thead><tr><th>ID</th><th>Nome</th><th>Papel</th><th>Piquete</th><th>Sinal</th><th>Último lux</th><th>Visto</th><th>Ativo</th><th /></tr></thead>
          <tbody>
            <tr v-for="s in list" :key="s.id">
              <td><b>{{ s.device_id }}</b></td>
              <td><input :value="s.name" class="input" style="min-width:130px" @change="update(s, { name: ($event.target as HTMLInputElement).value })"></td>
              <td>
                <select :value="s.role" @change="update(s, { role: ($event.target as HTMLSelectElement).value })">
                  <option value="canopy">No pasto</option><option value="reference">☀ Referência</option>
                </select>
              </td>
              <td>
                <select :value="s.paddock_id || ''" @change="update(s, { paddock_id: ($event.target as HTMLSelectElement).value || null })">
                  <option value="">— sem piquete —</option>
                  <option v-for="p in paddocks" :key="p.id" :value="p.id">{{ p.name }}</option>
                </select>
              </td>
              <td><span :style="{ color: rssiLabel(s.last_rssi).color }">{{ rssiLabel(s.last_rssi).label }}</span> <span class="tiny muted">{{ s.last_rssi }}</span></td>
              <td>{{ fmtNum(s.last_lux) }}</td>
              <td class="tiny">{{ fmtAgo(s.last_seen_at) }}</td>
              <td><input type="checkbox" :checked="s.active" @change="update(s, { active: ($event.target as HTMLInputElement).checked })"></td>
              <td class="row">
                <NuxtLink v-if="s.paddock_id" :to="`/piquete/${s.paddock_id}`" class="btn sm ghost">📍</NuxtLink>
                <button class="btn sm ghost danger" @click="remove(s)">✕</button>
              </td>
            </tr>
            <tr v-if="!list.length"><td colspan="9" class="muted">Nenhum sensor. Eles aparecem aqui sozinhos quando a central envia a primeira leitura, ou quando você posiciona um no mapa do piquete.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="grid g2">
      <div class="card">
        <h3>📥 Importar log</h3>
        <p class="small muted">Cole o texto do log da central (formato <code>[16/07/2026 15:30] ID:0 | Lux:60 | RSSI:0 dBm</code>) ou escolha o arquivo .txt. Sensores novos são criados automaticamente (ID 0 = referência).</p>
        <input type="file" accept=".txt,.log,text/plain" class="mb" @change="pickFile">
        <textarea v-model="logText" placeholder="[16/07/2026 15:30] ID:0 | Lux:60 | RSSI:0 dBm" />
        <button class="btn primary mt" :disabled="importing || !logText" @click="importLog">{{ importing ? 'Importando…' : 'Importar' }}</button>
      </div>

      <div class="card">
        <h3>📡 Centrais (envio automático)</h3>
        <p class="small muted">Cada central usa um código secreto para enviar as leituras direto para o sistema.</p>
        <div v-for="g in gateways" :key="g.id" class="gw">
          <div class="row between"><b>{{ g.name }}</b><span class="tiny muted">visto {{ fmtAgo(g.last_seen_at) }}</span></div>
          <div class="row mt">
            <code class="code grow">{{ g.token }}</code>
            <button class="btn sm" @click="copy(g.token)">Copiar</button>
            <button class="btn sm ghost danger" @click="removeGateway(g)">✕</button>
          </div>
        </div>
        <div class="row mt">
          <input v-model="gwName" class="input grow" placeholder="Nome da central">
          <button class="btn" @click="addGateway">+ Nova central</button>
        </div>
        <details class="mt">
          <summary class="small"><b>Instruções para quem programa a central</b></summary>
          <div class="small mt">POST para:</div>
          <div class="row"><code class="code grow">{{ ingestUrl }}</code><button class="btn sm" @click="copy(ingestUrl)">Copiar</button></div>
          <div class="small mt">Cabeçalho <code>x-gateway-token: CODIGO</code> e corpo JSON (ou o texto do log puro):</div>
          <pre class="code">{{ example }}</pre>
        </details>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gw { background: var(--surface-2); border-radius: 12px; padding: 10px; margin-top: 8px; }
.code { display: block; background: #1f321d; color: #dcedc8; border-radius: 10px; padding: 8px 10px; font-size: .78rem; overflow-x: auto; word-break: break-all; white-space: pre-wrap; }
</style>
