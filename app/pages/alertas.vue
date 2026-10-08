<script setup lang="ts">
const store = useStore()
const { farmId, alerts, paddocks } = store
const { ok, err } = useToast()

const showResolved = ref(false)
const resolved = ref<any[]>([])
const sev = ref('todas')
const running = ref(false)

const list = computed(() => {
  const base = showResolved.value ? resolved.value : alerts.value
  return sev.value === 'todas' ? base : base.filter((a) => a.severity === sev.value)
})
const padName = (id: string | null) => paddocks.value.find((p) => p.id === id)?.name

async function loadResolved() {
  const { data } = await sb().from('alerts').select('*').eq('farm_id', farmId.value).not('resolved_at', 'is', null).order('resolved_at', { ascending: false }).limit(100)
  resolved.value = data || []
}
watch(showResolved, (v) => { if (v) loadResolved() })

async function markRead(id: string) {
  await sb().from('alerts').update({ read_at: new Date().toISOString() }).eq('id', id)
  await store.reloadAlerts()
}
async function resolve(id: string) {
  await sb().from('alerts').update({ resolved_at: new Date().toISOString() }).eq('id', id)
  await store.reloadAlerts()
}
async function readAll() {
  const ids = alerts.value.filter((a) => !a.read_at).map((a) => a.id)
  if (!ids.length) return
  await sb().from('alerts').update({ read_at: new Date().toISOString() }).in('id', ids)
  await store.reloadAlerts()
}
async function evaluate() {
  running.value = true
  try { await store.evaluateAlerts(); ok('Alertas atualizados') } catch (e) { err(e) } finally { running.value = false }
}
</script>

<template>
  <div class="wrap">
    <div class="row between mb">
      <h1>Alertas</h1>
      <div class="row">
        <button class="btn sm" @click="readAll">Marcar todos como lidos</button>
        <button class="btn sm primary" :disabled="running" @click="evaluate">🔄 Reavaliar agora</button>
      </div>
    </div>

    <div class="row mb">
      <button v-for="s in [['todas','Todos'],['success','🐄 Ponto ideal'],['danger','🚨 Passou'],['warning','⚠️ Atenção'],['info','💡 Info']]" :key="s[0]"
        class="chip" :class="{ on: sev === s[0] }" @click="sev = s[0]!">{{ s[1] }}</button>
      <label class="row small" style="margin:0 0 0 auto"><input v-model="showResolved" type="checkbox"> Mostrar resolvidos</label>
    </div>

    <div class="stack">
      <div v-for="a in list" :key="a.id">
        <div v-if="padName(a.paddock_id)" class="tiny muted">{{ padName(a.paddock_id) }}</div>
        <AlertItem :alert="a" @read="markRead" @resolve="resolve" />
      </div>
      <div v-if="!list.length" class="card center muted">Nenhum alerta aqui 🌤️</div>
    </div>

    <div class="card mt small">
      <h3>Quando o sistema avisa</h3>
      <ul class="muted">
        <li><b>🐄 Ponto de entrada:</b> média dos sensores dentro da faixa ideal do piquete.</li>
        <li><b>⏳ Quase no ponto:</b> até 5 pontos abaixo da faixa.</li>
        <li><b>🚨 Passou do ponto:</b> acima do limite máximo; perda de qualidade.</li>
        <li><b>⚠️ Sem comunicação:</b> sensor sem enviar há mais horas que o configurado na fazenda.</li>
        <li><b>💡 Sinal fraco:</b> RSSI igual ou abaixo de −110 dBm.</li>
        <li><b>⚠️ Leitura inconsistente:</b> sensor do pasto mediu mais luz que a referência.</li>
        <li><b>💡 Novo sensor:</b> chegou leitura de um ID ainda sem piquete.</li>
      </ul>
      <p class="tiny muted">Só contam leituras válidas: dentro do horário configurado (padrão 10h–14h) e com luz suficiente na referência.</p>
    </div>
  </div>
</template>
