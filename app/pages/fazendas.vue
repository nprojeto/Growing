<script setup lang="ts">
const store = useStore()
const { farms, farmId, paddocks, sensors, grassTypes, profile } = store
const { ok, err } = useToast()

const nf = reactive({ name: '', farmer_name: '', city: '', state: '' })
const np = reactive({ name: '', kind: 'piquete', grass_type_id: '' })
const showFarmForm = ref(false)
const saving = ref(false)

watch(profile, (p) => { if (p && !nf.farmer_name) nf.farmer_name = p.full_name || '' }, { immediate: true })
onMounted(() => { if (!farms.value.length) showFarmForm.value = true })

async function addFarm() {
  saving.value = true
  try {
    const f = await store.createFarm({ ...nf })
    await store.setFarm(f.id)
    Object.assign(nf, { name: '', city: '', state: '' })
    showFarmForm.value = false
    ok('Fazenda criada')
  } catch (e) { err(e) } finally { saving.value = false }
}

async function addPaddock() {
  if (!farmId.value || !np.name) return
  saving.value = true
  try {
    const p = await store.createPaddock({ farm_id: farmId.value, name: np.name, kind: np.kind, grass_type_id: np.grass_type_id || null })
    np.name = ''
    await store.loadFarmData()
    await navigateTo(`/piquete/${p.id}`)
  } catch (e) { err(e) } finally { saving.value = false }
}

async function removePaddock(p: any) {
  if (!confirm(`Excluir "${p.name}"? Os sensores ficam sem piquete e as leituras são mantidas.`)) return
  const { error } = await sb().from('paddocks').delete().eq('id', p.id)
  if (error) return err(error)
  await store.loadFarmData(); ok('Excluído')
}

async function removeFarm(f: any) {
  if (!confirm(`Excluir a fazenda "${f.name}" com TODOS os piquetes, sensores e leituras? Não dá para desfazer.`)) return
  const { error } = await sb().from('farms').delete().eq('id', f.id)
  if (error) return err(error)
  farmId.value = null
  await store.loadFarms(); await store.loadFarmData(); ok('Fazenda excluída')
}

async function saveFarm(f: any) {
  const { error } = await sb().from('farms').update({
    name: f.name, farmer_name: f.farmer_name, city: f.city, state: f.state,
    valid_hour_start: f.valid_hour_start, valid_hour_end: f.valid_hour_end, min_ref_lux: f.min_ref_lux, offline_hours: f.offline_hours,
  }).eq('id', f.id)
  if (error) return err(error)
  await store.loadFarmData(); ok('Salvo')
}

const grassName = (id: string) => grassTypes.value.find((g) => g.id === id)?.name || '—'
const sensorCount = (pid: string) => sensors.value.filter((s) => s.paddock_id === pid && s.role === 'canopy').length
const editing = ref<string | null>(null)
</script>

<template>
  <div class="wrap">
    <div class="row between mb">
      <h1>Fazendas</h1>
      <button class="btn primary" @click="showFarmForm = !showFarmForm"><Icon name="plus" :size="16" /> Nova fazenda</button>
    </div>

    <form v-if="showFarmForm" class="card mb" @submit.prevent="addFarm">
      <h3>Nova fazenda</h3>
      <div class="grid g4">
        <div class="field"><label>Nome da fazenda</label><input v-model="nf.name" class="input" required></div>
        <div class="field"><label>Fazendeiro</label><input v-model="nf.farmer_name" class="input"></div>
        <div class="field"><label>Cidade</label><input v-model="nf.city" class="input"></div>
        <div class="field"><label>UF</label><input v-model="nf.state" class="input" maxlength="2"></div>
      </div>
      <button class="btn primary" :disabled="saving">Criar fazenda</button>
    </form>

    <div class="grid auto mb">
      <div v-for="f in farms" :key="f.id" class="card farm" :class="{ on: f.id === farmId }" @click="f.id !== farmId && store.setFarm(f.id)">
        <div class="row between">
          <div class="emoji"><Icon name="farm" :size="22" /></div>
          <span v-if="f.id === farmId" class="pill" style="background:var(--leaf-soft);color:var(--leaf-dark)">ativa</span>
        </div>
        <h3>{{ f.name }}</h3>
        <div class="small muted">{{ f.farmer_name || '—' }}<span v-if="f.city"> · {{ f.city }}/{{ f.state }}</span></div>
      </div>
    </div>

    <template v-if="farmId">
      <div class="card mb">
        <div class="row between">
          <h2>Piquetes de {{ farms.find(f => f.id === farmId)?.name }}</h2>
          <button class="btn sm ghost" @click="editing = editing === farmId ? null : farmId"><Icon name="settings" :size="15" /> Dados da fazenda</button>
        </div>

        <div v-if="editing === farmId" class="banner info mb" style="display:block">
          <template v-for="f in farms.filter(x => x.id === farmId)" :key="f.id">
            <div class="grid g4">
              <div class="field"><label>Nome</label><input v-model="f.name" class="input"></div>
              <div class="field"><label>Fazendeiro</label><input v-model="f.farmer_name" class="input"></div>
              <div class="field"><label>Cidade</label><input v-model="f.city" class="input"></div>
              <div class="field"><label>UF</label><input v-model="f.state" class="input" maxlength="2"></div>
            </div>
            <div class="grid g4">
              <div class="field"><label>Leitura válida a partir de (h)</label><input v-model.number="f.valid_hour_start" type="number" min="0" max="23" class="input"></div>
              <div class="field"><label>Leitura válida até (h)</label><input v-model.number="f.valid_hour_end" type="number" min="1" max="24" class="input"></div>
              <div class="field"><label>Luz mínima na referência (lux)</label><input v-model.number="f.min_ref_lux" type="number" min="0" class="input"></div>
              <div class="field"><label>Sensor offline após (h)</label><input v-model.number="f.offline_hours" type="number" min="1" class="input"></div>
            </div>
            <div class="row between">
              <button class="btn primary sm" @click="saveFarm(f)">Salvar</button>
              <button class="btn danger sm" @click="removeFarm(f)">Excluir fazenda</button>
            </div>
          </template>
        </div>

        <div class="scroll-x">
          <table class="table">
            <thead><tr><th>Nome</th><th>Tipo</th><th>Capim</th><th>Área</th><th>Sensores</th><th /></tr></thead>
            <tbody>
              <tr v-for="p in paddocks" :key="p.id">
                <td><b>{{ p.name }}</b><span v-if="!p.boundary?.length" class="tiny" style="color:var(--quase)"> · sem contorno</span></td>
                <td>{{ KIND_LABEL[p.kind] }}</td>
                <td>{{ grassName(p.grass_type_id) }}</td>
                <td>{{ p.area_ha ? fmtNum(p.area_ha, 2) + ' ha' : '—' }}</td>
                <td>{{ sensorCount(p.id) }}</td>
                <td class="row" style="justify-content:flex-end">
                  <NuxtLink :to="`/piquete/${p.id}`" class="btn sm"><Icon name="map" :size="15" /> Mapa e ajustes</NuxtLink>
                  <button class="btn sm ghost danger" title="Excluir" @click="removePaddock(p)"><Icon name="trash" :size="15" /></button>
                </td>
              </tr>
              <tr v-if="!paddocks.length"><td colspan="6" class="muted">Nenhum piquete ainda.</td></tr>
            </tbody>
          </table>
        </div>

        <hr>
        <form class="grid g4" @submit.prevent="addPaddock">
          <div class="field"><label>Novo piquete / talhão / pasto</label><input v-model="np.name" class="input" required placeholder="Ex.: Piquete 2"></div>
          <div class="field"><label>Tipo</label>
            <select v-model="np.kind"><option value="piquete">Piquete</option><option value="talhao">Talhão</option><option value="pasto">Pasto</option></select>
          </div>
          <div class="field"><label>Capim</label>
            <select v-model="np.grass_type_id">
              <option value="">— escolher depois —</option>
              <option v-for="g in grassTypes" :key="g.id" :value="g.id">{{ g.name }} ({{ CATEGORY_LABEL[g.category] }})</option>
            </select>
          </div>
          <div class="field" style="align-self:end"><button class="btn primary" :disabled="saving"><Icon name="plus" :size="16" /> Criar e desenhar</button></div>
        </form>
      </div>
    </template>
  </div>
</template>

<style scoped>
.farm { cursor: pointer; transition: .2s; }
.farm:hover { transform: translateY(-2px); }
.farm.on { border-color: var(--leaf-2); box-shadow: 0 0 0 3px var(--leaf-soft); }
.emoji { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; background: var(--leaf-soft); color: var(--leaf-dark); }
</style>
