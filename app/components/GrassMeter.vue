<script setup lang="ts">
// Ilustração animada do pasto: altura das folhas = interceptação luminosa
const props = withDefaults(defineProps<{
  value: number | null
  min: number
  max: number
  editable?: boolean
  grassName?: string
  entryHeight?: number | null
  exitHeight?: number | null
  compact?: boolean
}>(), { editable: false, compact: false })
const emit = defineEmits<{ 'update:min': [number]; 'update:max': [number] }>()

const W = 320, GROUND = 262, TOP = 42
const H = GROUND - TOP
const y = (pct: number) => GROUND - (Math.max(0, Math.min(100, pct)) / 100) * H

const status = computed(() => statusOf(props.value, props.min, props.max))

// folhas com variação natural (determinística)
const blades = Array.from({ length: 34 }, (_, i) => {
  const r1 = Math.sin(i * 12.9898) * 43758.5453
  const r2 = Math.sin(i * 78.233) * 12345.6789
  const f1 = r1 - Math.floor(r1), f2 = r2 - Math.floor(r2)
  return {
    x: 30 + (i / 33) * 225 + (f1 - .5) * 8,
    var: .88 + f2 * .14,
    lean: (f1 - .5) * 26,
    w: 5 + f2 * 4,
    delay: -(f1 * 3).toFixed(2) + 's',
    dur: (2.6 + f2 * 1.8).toFixed(2) + 's',
    shade: i % 3,
  }
})
const level = computed(() => (props.value == null ? 30 : Math.max(4, Math.min(100, props.value))) / 100)
const bladeColor = computed(() => {
  if (props.value == null) return ['#b9c4ae', '#a6b39a', '#c7d1bd']
  if (status.value.key === 'passou') return ['#8c9a3a', '#7b8a2f', '#a1ab4a']
  if (status.value.key === 'crescendo') return ['#7cc46f', '#6bb85f', '#92d184']
  return ['#3f9a44', '#2f7d32', '#58ad55']
})
const path = (b: any) => {
  const top = GROUND - H * b.var
  return `M${b.x - b.w / 2},${GROUND} Q${b.x + b.lean * .3},${(GROUND + top) / 2} ${b.x + b.lean},${top} Q${b.x + b.lean * .3 + 2},${(GROUND + top) / 2} ${b.x + b.w / 2},${GROUND} Z`
}

const minModel = computed({ get: () => props.min, set: (v) => emit('update:min', Math.min(Number(v), props.max - 1)) })
const maxModel = computed({ get: () => props.max, set: (v) => emit('update:max', Math.max(Number(v), props.min + 1)) })
</script>

<template>
  <div class="gm" :class="{ compact }">
    <svg :viewBox="`0 0 ${W} 300`" class="svg" role="img" :aria-label="`Interceptação ${fmtPct(value)}`">
      <defs>
        <linearGradient id="gm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#cfe6f4" />
          <stop offset="1" stop-color="#f4f9ec" />
        </linearGradient>
        <linearGradient id="gm-soil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#9b6b47" />
          <stop offset="1" stop-color="#6d4529" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" :width="W" height="300" rx="18" fill="url(#gm-sky)" />

      <!-- sol -->
      <g class="sun">
        <g class="rays">
          <line v-for="k in 8" :key="k" x1="276" y1="40" :x2="276 + Math.cos(k * Math.PI / 4) * 30" :y2="40 + Math.sin(k * Math.PI / 4) * 30" stroke="#f2b632" stroke-width="3" stroke-linecap="round" />
        </g>
        <circle cx="276" cy="40" r="16" fill="#f7c948" />
      </g>
      <!-- nuvem -->
      <g class="cloud" opacity=".9">
        <ellipse cx="70" cy="34" rx="22" ry="10" fill="#fff" />
        <ellipse cx="88" cy="30" rx="16" ry="11" fill="#fff" />
      </g>

      <!-- faixa ideal -->
      <rect x="22" :y="y(max)" width="240" :height="Math.max(2, y(min) - y(max))" fill="#2f9e44" opacity=".14" rx="6" />
      <line x1="22" x2="262" :y1="y(max)" :y2="y(max)" stroke="#2f9e44" stroke-dasharray="5 4" stroke-width="1.5" />
      <line x1="22" x2="262" :y1="y(min)" :y2="y(min)" stroke="#2f9e44" stroke-dasharray="5 4" stroke-width="1.5" />
      <text x="266" :y="y(max) + 4" class="lbl" fill="#2f7d32">{{ max }}%</text>
      <text x="266" :y="y(min) + 4" class="lbl" fill="#2f7d32">{{ min }}%</text>

      <!-- régua -->
      <g class="ruler">
        <line x1="14" x2="14" :y1="TOP" :y2="GROUND" stroke="#8a9683" stroke-width="1" />
        <g v-for="t in [0, 25, 50, 75, 100]" :key="t">
          <line x1="10" x2="18" :y1="y(t)" :y2="y(t)" stroke="#8a9683" />
        </g>
      </g>

      <!-- capim -->
      <g class="grass" :style="{ transform: `scaleY(${level})` }">
        <path v-for="(b, i) in blades" :key="i" :d="path(b)" :fill="bladeColor[b.shade]" class="blade" :style="{ animationDelay: b.delay, animationDuration: b.dur }" />
      </g>

      <!-- nível atual -->
      <g v-if="value != null" class="now" :style="{ transform: `translateY(${y(value) - y(0)}px)` }">
        <line x1="22" x2="262" :y1="y(0)" :y2="y(0)" :stroke="status.color" stroke-width="2.5" />
        <rect x="96" :y="y(0) - 26" width="92" height="22" rx="11" :fill="status.color" />
        <text x="142" :y="y(0) - 11" text-anchor="middle" class="val">{{ fmtPct(value) }}</text>
      </g>

      <!-- solo -->
      <rect x="0" :y="GROUND" :width="W" :height="300 - GROUND" fill="url(#gm-soil)" />
      <text x="16" :y="GROUND + 24" class="soil">interceptação de luz</text>

      <!-- vaca quando no ponto -->
      <g v-if="status.key === 'ideal'" :transform="`translate(214 ${GROUND - 40})`"><g class="cow">
        <rect x="0" y="0" width="44" height="30" rx="15" fill="#fff" opacity=".95" />
        <circle cx="15" cy="15" r="9" fill="#2f9e44" />
        <path d="m11 15 3 3 5-6" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round" />
        <text x="27" y="19.5" class="ok">OK</text>
      </g></g>
    </svg>

    <div v-if="!compact" class="info">
      <div class="row between">
        <div>
          <div class="tiny muted">{{ grassName || 'Capim não definido' }}</div>
          <StatusBadge :status="status" />
        </div>
        <div v-if="entryHeight" class="tiny muted right">
          Altura de entrada ≈ <b>{{ entryHeight }} cm</b><br>
          <span v-if="exitHeight">Saída ≈ <b>{{ exitHeight }} cm</b></span>
        </div>
      </div>
      <p class="small muted mt0">{{ status.hint }}</p>
    </div>

    <div v-if="editable" class="edit">
      <div class="field">
        <label>Avisar a partir de <b>{{ min }}%</b> de interceptação</label>
        <input v-model.number="minModel" type="range" min="50" max="99" step="1">
      </div>
      <div class="field">
        <label>Limite máximo (passou do ponto) <b>{{ max }}%</b></label>
        <input v-model.number="maxModel" type="range" min="51" max="100" step="1">
      </div>
    </div>
  </div>
</template>

<style scoped>
.gm { width: 100%; }
.svg { width: 100%; height: auto; display: block; border-radius: 18px; }
.compact .svg { max-height: 150px; }
.blade { transform-box: fill-box; transform-origin: 50% 100%; animation: sway 3s ease-in-out infinite; }
.grass { transform-box: fill-box; transform-origin: 50% 100%; transition: transform 1.1s cubic-bezier(.2, .8, .2, 1); }
.now { transition: transform 1.1s cubic-bezier(.2, .8, .2, 1); }
.sun { animation: float 5s ease-in-out infinite; }
.rays { transform-origin: 276px 40px; animation: spin 24s linear infinite; }
.cloud { animation: float 7s ease-in-out infinite; }
.cow { animation: bounce 1.6s ease-in-out infinite; }
.ok { font: 800 11px Nunito, sans-serif; fill: #2f9e44; }
.lbl { font: 700 11px Nunito, sans-serif; }
.val { font: 800 13px Nunito, sans-serif; fill: #fff; }
.soil { font: 700 11px Nunito, sans-serif; fill: #f3e3d2; letter-spacing: .05em; text-transform: uppercase; }
.info { margin-top: 10px; }
.right { text-align: right; }
.mt0 { margin-top: 6px; }
.edit { margin-top: 12px; background: var(--surface-2); border-radius: 14px; padding: 12px; }
</style>
