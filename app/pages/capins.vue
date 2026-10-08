<script setup lang="ts">
const store = useStore()
const { grassTypes } = store
const { ok, err } = useToast()

const cat = ref<string>('todas')
const blank = () => ({ id: '', name: '', scientific_name: '', category: 'braquiaria', entry_height_cm: 25, exit_height_cm: 15, target_min: 90, target_max: 95, notes: '' })
const form = reactive<any>(blank())
const open = ref(false)

const list = computed(() => grassTypes.value.filter((g) => cat.value === 'todas' || g.category === cat.value))

function edit(g: any) { Object.assign(form, { ...blank(), ...g }); open.value = true; window.scrollTo({ top: 0, behavior: 'smooth' }) }
function duplicate(g: any) { Object.assign(form, { ...blank(), ...g, id: '', name: g.name + ' (meu)' }); open.value = true; window.scrollTo({ top: 0, behavior: 'smooth' }) }
function novo() { Object.assign(form, blank()); open.value = true }

async function save() {
  try {
    const { data: u } = await sb().auth.getUser()
    const row = {
      name: form.name, scientific_name: form.scientific_name, category: form.category,
      entry_height_cm: form.entry_height_cm, exit_height_cm: form.exit_height_cm,
      target_min: form.target_min, target_max: form.target_max, notes: form.notes,
    }
    const q = form.id
      ? sb().from('grass_types').update(row).eq('id', form.id)
      : sb().from('grass_types').insert({ ...row, owner_id: u.user!.id })
    const { error } = await q
    if (error) throw error
    await store.loadGrass(); open.value = false; ok('Capim salvo')
  } catch (e) { err(e) }
}
async function remove(g: any) {
  if (!confirm(`Excluir "${g.name}"?`)) return
  const { error } = await sb().from('grass_types').delete().eq('id', g.id)
  if (error) return err(error)
  await store.loadGrass()
}
</script>

<template>
  <div class="wrap">
    <div class="row between mb">
      <h1>Tipos de capim</h1>
      <button class="btn primary" @click="novo"><Icon name="plus" :size="16" /> Cadastrar capim</button>
    </div>

    <form v-if="open" class="card mb" @submit.prevent="save">
      <div class="grid g2">
        <div>
          <h3>{{ form.id ? 'Editar' : 'Novo' }} capim</h3>
          <div class="grid g2">
            <div class="field"><label>Nome</label><input v-model="form.name" class="input" required></div>
            <div class="field"><label>Grupo</label>
              <select v-model="form.category"><option v-for="(l, k) in CATEGORY_LABEL" :key="k" :value="k">{{ l }}</option></select>
            </div>
          </div>
          <div class="field"><label>Nome científico</label><input v-model="form.scientific_name" class="input"></div>
          <div class="grid g2">
            <div class="field"><label>Altura de entrada (cm)</label><input v-model.number="form.entry_height_cm" type="number" class="input"></div>
            <div class="field"><label>Altura de saída (cm)</label><input v-model.number="form.exit_height_cm" type="number" class="input"></div>
          </div>
          <div class="field"><label>Observações</label><input v-model="form.notes" class="input"></div>
          <div class="row">
            <button class="btn primary">Salvar</button>
            <button type="button" class="btn ghost" @click="open = false">Cancelar</button>
          </div>
        </div>
        <GrassMeter v-model:min="form.target_min" v-model:max="form.target_max" :value="null" editable
          :grass-name="form.name" :entry-height="form.entry_height_cm" :exit-height="form.exit_height_cm" />
      </div>
    </form>

    <div class="tabs mb">
      <button class="chip" :class="{ on: cat === 'todas' }" @click="cat = 'todas'">Todas</button>
      <button v-for="(l, k) in CATEGORY_LABEL" :key="k" class="chip" :class="{ on: cat === k }" @click="cat = k">{{ l }}</button>
    </div>

    <div class="grid auto">
      <div v-for="g in list" :key="g.id" class="card gcard">
        <div class="ill">
          <svg viewBox="0 0 120 70" class="mini">
            <path v-for="i in 9" :key="i" :d="`M${8 + i * 11},70 Q${10 + i * 11},${40 - (i % 3) * 6} ${12 + i * 11 + (i % 2 ? 6 : -6)},${8 + (i % 3) * 8} Q${12 + i * 11},40 ${14 + i * 11},70Z`"
              :fill="g.color || '#4f9d4a'" class="blade" :style="{ animationDelay: `-${i * .3}s` }" />
          </svg>
        </div>
        <div class="row between">
          <h3>{{ g.name }}</h3>
          <span class="pill" style="background:var(--leaf-soft);color:var(--leaf-dark)">{{ CATEGORY_LABEL[g.category] }}</span>
        </div>
        <div class="tiny muted"><i>{{ g.scientific_name }}</i></div>
        <div class="row between small mt">
          <span class="row" style="gap:4px"><Icon name="ruler" :size="14" /> {{ g.entry_height_cm ?? '—' }} → {{ g.exit_height_cm ?? '—' }} cm</span>
          <span class="row" style="gap:4px"><Icon name="target" :size="14" /> {{ g.target_min }}–{{ g.target_max }}%</span>
        </div>
        <div class="row mt">
          <template v-if="g.owner_id">
            <button class="btn sm" @click="edit(g)">Editar</button>
            <button class="btn sm ghost danger" @click="remove(g)">Excluir</button>
          </template>
          <button v-else class="btn sm ghost" @click="duplicate(g)">Personalizar</button>
        </div>
      </div>
    </div>
    <p class="tiny muted mt">Valores padrão são referências gerais de manejo. Ajuste com a orientação do seu técnico.</p>
  </div>
</template>

<style scoped>
.ill { background: linear-gradient(#e3f0f8, #f4f9ec); border-radius: 12px; margin-bottom: 10px; overflow: hidden; }
.mini { width: 100%; height: 70px; display: block; }
.blade { transform-box: fill-box; transform-origin: 50% 100%; animation: sway 3s ease-in-out infinite; }
.gcard:hover .blade { animation-duration: 1.2s; }
</style>
