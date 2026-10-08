<script setup lang="ts">
type P = { t: Date; v: number }
const props = defineProps<{
  series: { name: string; color: string; points: P[]; bold?: boolean }[]
  min: number
  max: number
}>()

const W = 640, H = 240, L = 38, R = 12, T = 12, B = 28
const all = computed(() => props.series.flatMap((s) => s.points))
const tMin = computed(() => Math.min(...all.value.map((p) => +p.t)))
const tMax = computed(() => Math.max(...all.value.map((p) => +p.t)))
const yMin = computed(() => {
  const lo = Math.min(props.min, ...all.value.map((p) => p.v))
  return Math.max(0, Math.floor((lo - 5) / 10) * 10)
})
const x = (t: Date) => {
  const span = tMax.value - tMin.value || 1
  return L + ((+t - tMin.value) / span) * (W - L - R)
}
const y = (v: number) => T + (1 - (v - yMin.value) / (100 - yMin.value)) * (H - T - B)
const path = (pts: P[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')
const yTicks = computed(() => { const out = []; for (let v = yMin.value; v <= 100; v += 10) out.push(v); return out })
const xTicks = computed(() => {
  const n = 5, out: Date[] = []
  if (!all.value.length) return out
  for (let i = 0; i < n; i++) out.push(new Date(tMin.value + ((tMax.value - tMin.value) * i) / (n - 1)))
  return out
})
const fmtD = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
</script>

<template>
  <div>
    <div v-if="!all.length" class="empty muted small">Sem leituras válidas no período. As leituras válidas são as feitas perto do meio-dia, com sol.</div>
    <svg v-else :viewBox="`0 0 ${W} ${H}`" class="chart">
      <rect :x="L" :y="y(max)" :width="W - L - R" :height="y(min) - y(max)" fill="#2f9e44" opacity=".12" />
      <g v-for="v in yTicks" :key="v">
        <line :x1="L" :x2="W - R" :y1="y(v)" :y2="y(v)" stroke="#e2ddcb" stroke-dasharray="3 4" />
        <text :x="L - 6" :y="y(v) + 4" text-anchor="end" class="ax">{{ v }}%</text>
      </g>
      <text v-for="(d, i) in xTicks" :key="i" :x="x(d)" :y="H - 8" text-anchor="middle" class="ax">{{ fmtD(d) }}</text>
      <g v-for="s in series" :key="s.name">
        <path v-if="s.points.length > 1" :d="path(s.points)" fill="none" :stroke="s.color" :stroke-width="s.bold ? 3.5 : 2" :stroke-dasharray="s.bold ? '' : ''" stroke-linejoin="round" stroke-linecap="round" class="ln" :opacity="s.bold ? 1 : .75" />
        <circle v-for="(p, i) in s.points" :key="i" :cx="x(p.t)" :cy="y(p.v)" :r="s.bold ? 4 : 3" :fill="s.color" stroke="#fff" stroke-width="1.5">
          <title>{{ s.name }} · {{ fmtD(p.t) }} · {{ fmtPct(p.v) }}</title>
        </circle>
      </g>
    </svg>
    <div class="legend">
      <span v-for="s in series" :key="s.name" class="lg"><i :style="{ background: s.color }" />{{ s.name }}</span>
      <span class="lg"><i class="band" />Faixa ideal {{ min }}–{{ max }}%</span>
    </div>
  </div>
</template>

<style scoped>
.chart { width: 100%; height: auto; display: block; }
.ax { font: 600 10.5px Nunito, sans-serif; fill: #7d8975; }
.ln { stroke-dasharray: 2000; stroke-dashoffset: 2000; animation: draw 1.6s ease forwards; }
@keyframes draw { to { stroke-dashoffset: 0; } }
.legend { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 6px; font-size: .8rem; color: var(--ink-2); font-weight: 700; }
.lg { display: inline-flex; align-items: center; gap: 5px; }
.lg i { width: 12px; height: 4px; border-radius: 2px; display: inline-block; }
.lg i.band { height: 10px; background: #2f9e4433; }
.empty { padding: 30px 10px; text-align: center; }
</style>
