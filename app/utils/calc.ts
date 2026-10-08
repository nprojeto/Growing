// Cálculos de interceptação luminosa e utilidades gerais

export type Status = { key: string; label: string; color: string; hint: string }

export function statusOf(v: number | null | undefined, min: number, max: number): Status {
  if (v == null || Number.isNaN(v)) return { key: 'sem', label: 'Sem leitura válida', color: '#9aa49a', hint: 'Aguardando leituras ao meio-dia com sol.' }
  if (v > max) return { key: 'passou', label: 'Passou do ponto', color: '#c2683a', hint: 'Pasto fechado demais: colocar o gado o quanto antes.' }
  if (v >= min) return { key: 'ideal', label: 'Ponto de entrada!', color: '#2f9e44', hint: 'Auge de nutrientes: hora de colocar o gado.' }
  if (v >= min - 5) return { key: 'quase', label: 'Quase no ponto', color: '#d4a017', hint: 'Faltam poucos dias para o ponto ideal.' }
  return { key: 'crescendo', label: 'Em crescimento', color: '#4f93bf', hint: 'Pasto em recuperação. Aguarde.' }
}

export const QUALITY: Record<string, { label: string; color: string }> = {
  valida: { label: 'Válida', color: '#2f9e44' },
  fora_horario: { label: 'Fora do horário', color: '#9aa49a' },
  pouca_luz: { label: 'Pouca luz na referência', color: '#9aa49a' },
  invalida: { label: 'Inconsistente (mais luz que a referência)', color: '#c0392b' },
  sem_referencia: { label: 'Sem referência no horário', color: '#9aa49a' },
}

export const SENSOR_COLORS = ['#2f7d32', '#e08a1e', '#3f7fbf', '#a0522d', '#8e44ad', '#16a085', '#c0392b', '#7f8c2d', '#d35400', '#2c3e50']
export function colorFor(i: number) { return SENSOR_COLORS[i % SENSOR_COLORS.length] }

export function targetOf(p: any, grassTypes: any[]) {
  const g = grassTypes.find((x) => x.id === p?.grass_type_id) || null
  return {
    min: Number(p?.target_min ?? g?.target_min ?? 90),
    max: Number(p?.target_max ?? g?.target_max ?? 95),
    grass: g,
  }
}

/** Última leitura válida de cada sensor. */
export function latestValid(readings: any[], sensorIds: string[]) {
  const map = new Map<string, any>()
  const set = new Set(sensorIds)
  for (const r of readings) {
    if (!set.has(r.sensor_id) || r.quality !== 'valida') continue
    const cur = map.get(r.sensor_id)
    if (!cur || r.measured_at > cur.measured_at) map.set(r.sensor_id, r)
  }
  return map
}

/** Média atual (só leituras dos últimos 3 dias em relação à mais recente). */
export function currentAvg(readings: any[], sensorIds: string[]) {
  const latest = [...latestValid(readings, sensorIds).values()]
  if (!latest.length) return { value: null as number | null, at: null as string | null, count: 0 }
  const newest = Math.max(...latest.map((r) => +new Date(r.measured_at)))
  const fresh = latest.filter((r) => newest - +new Date(r.measured_at) <= 3 * 864e5)
  const value = fresh.reduce((a, r) => a + Number(r.interception_pct), 0) / fresh.length
  return { value: Math.round(value * 10) / 10, at: new Date(newest).toISOString(), count: fresh.length }
}

/** Série diária (média do dia por sensor + média geral). */
export function dailySeries(readings: any[], sensors: any[], fromMs: number) {
  const ids = new Set(sensors.map((s) => s.id))
  const byDay = new Map<string, Map<string, number[]>>()
  for (const r of readings) {
    if (!ids.has(r.sensor_id) || r.quality !== 'valida') continue
    if (+new Date(r.measured_at) < fromMs) continue
    const day = dayKey(r.measured_at)
    if (!byDay.has(day)) byDay.set(day, new Map())
    const m = byDay.get(day)!
    if (!m.has(r.sensor_id)) m.set(r.sensor_id, [])
    m.get(r.sensor_id)!.push(Number(r.interception_pct))
  }
  const days = [...byDay.keys()].sort()
  const series = sensors.map((s, i) => ({
    name: s.name || `Sensor ${s.device_id}`,
    color: s._color || colorFor(i),
    points: days.filter((d) => byDay.get(d)!.has(s.id)).map((d) => ({ t: dayDate(d), v: mean(byDay.get(d)!.get(s.id)!) })),
  }))
  const avgPoints = days.map((d) => {
    const vals = [...byDay.get(d)!.values()].map(mean)
    return { t: dayDate(d), v: mean(vals) }
  })
  return { series, avg: { name: 'Média', color: '#1f321d', points: avgPoints, bold: true } }
}

export function mean(a: number[]) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN }
function dayKey(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }) // AAAA-MM-DD
}
function dayDate(k: string) { return new Date(`${k}T12:00:00-03:00`) }

export function fmtPct(v: number | null | undefined, digits = 1) {
  if (v == null || Number.isNaN(v)) return '—'
  return v.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits }) + '%'
}
export function fmtNum(v: number | null | undefined, digits = 0) {
  if (v == null || Number.isNaN(Number(v))) return '—'
  return Number(v).toLocaleString('pt-BR', { maximumFractionDigits: digits })
}
export function fmtDateTime(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}
export function fmtAgo(iso?: string | null) {
  if (!iso) return 'nunca'
  const s = (Date.now() - +new Date(iso)) / 1000
  if (s < 90) return 'agora'
  if (s < 3600) return `há ${Math.round(s / 60)} min`
  if (s < 86400) return `há ${Math.round(s / 3600)} h`
  const d = Math.round(s / 86400)
  return `há ${d} dia${d > 1 ? 's' : ''}`
}

/** Área de polígono em hectares ([[lat,lng],...]). */
export function polygonAreaHa(pts: [number, number][]) {
  if (!pts || pts.length < 3) return null
  const R = 6378137, rad = Math.PI / 180
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const [la1, lo1] = pts[i]!, [la2, lo2] = pts[(i + 1) % pts.length]!
    a += (lo2 - lo1) * rad * (2 + Math.sin(la1 * rad) + Math.sin(la2 * rad))
  }
  return Math.round(Math.abs((a * R * R) / 2) / 100) / 100
}

export function pointInPolygon(lat: number, lng: number, poly: [number, number][]) {
  if (!poly || poly.length < 3) return true
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i]!, [yj, xj] = poly[j]!
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function rssiLabel(r?: number | null) {
  if (r == null) return { label: '—', color: '#9aa49a' }
  if (r === 0) return { label: 'Local', color: '#9aa49a' }
  if (r > -90) return { label: 'Ótimo', color: '#2f9e44' }
  if (r > -105) return { label: 'Bom', color: '#7fae3e' }
  if (r > -112) return { label: 'Fraco', color: '#d4a017' }
  return { label: 'Crítico', color: '#c0392b' }
}

export const KIND_LABEL: Record<string, string> = { talhao: 'Talhão', piquete: 'Piquete', pasto: 'Pasto' }
export const CATEGORY_LABEL: Record<string, string> = { braquiaria: 'Braquiária', panicum: 'Panicum', cynodon: 'Cynodon', outro: 'Outro' }

export function lsGet(k: string) { try { return localStorage.getItem(k) } catch { return null } }
export function lsSet(k: string, v: string | null) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch { /* ignora */ } }
