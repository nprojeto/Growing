<script setup lang="ts">
import L from 'leaflet'

type Pt = [number, number]
const props = withDefaults(defineProps<{
  boundary?: Pt[]
  draft?: Pt[] | null
  sensors?: any[]          // {id, device_id, name, role, lat, lng, color, value, faded}
  mode?: 'view' | 'draw' | 'sensors'
  tall?: boolean
  others?: { name: string; boundary: Pt[]; color: string }[]
}>(), { boundary: () => [], draft: null, sensors: () => [], mode: 'view', tall: false, others: () => [] })

const emit = defineEmits<{
  click: [Pt]
  move: [string, Pt]
  select: [string]
}>()

const el = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null
let layer: L.LayerGroup | null = null
let fitted = false
const DEFAULT: Pt = [-23.3687, -45.3097]

onMounted(() => {
  map = L.map(el.value!, { zoomControl: true, attributionControl: true }).setView(DEFAULT, 16)
  const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 20, maxNativeZoom: 19, attribution: 'Imagens © Esri',
  })
  const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20, maxNativeZoom: 19, attribution: '© OpenStreetMap',
  })
  sat.addTo(map)
  L.control.layers({ 'Satélite': sat, 'Mapa': street }, {}, { position: 'topright' }).addTo(map)
  layer = L.layerGroup().addTo(map)
  map.on('click', (e: L.LeafletMouseEvent) => emit('click', [e.latlng.lat, e.latlng.lng]))
  draw()
  setTimeout(() => map?.invalidateSize(), 250)
})
onBeforeUnmount(() => { map?.remove(); map = null })

function pin(s: any) {
  const label = s.role === 'reference' ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/></svg>' : String(s.device_id)
  return L.divIcon({
    className: '',
    html: `<div class="sensor-pin ${s.role === 'reference' ? 'ref' : ''} ${s.faded ? 'faded' : ''}" style="background:${s.color || '#2f7d32'}">${label}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

function draw() {
  if (!map || !layer) return
  layer.clearLayers()
  const bounds: L.LatLngExpression[] = []

  for (const o of props.others) {
    if (o.boundary?.length >= 3) {
      L.polygon(o.boundary, { color: o.color, weight: 2, fillOpacity: .12, dashArray: '4 4' }).bindTooltip(o.name).addTo(layer)
    }
  }
  if (props.boundary?.length >= 3 && !(props.mode === 'draw' && props.draft)) {
    L.polygon(props.boundary, { color: '#f2b632', weight: 3, fillColor: '#57a85a', fillOpacity: .18 }).addTo(layer)
    bounds.push(...props.boundary)
  }
  if (props.mode === 'draw' && props.draft) {
    if (props.draft.length >= 2) {
      L.polyline([...props.draft, ...(props.draft.length >= 3 ? [props.draft[0]!] : [])], { color: '#f2b632', weight: 3, dashArray: '6 6' }).addTo(layer)
    }
    props.draft.forEach((p, i) => {
      L.circleMarker(p, { radius: 6, color: '#fff', weight: 2, fillColor: i === 0 ? '#c0392b' : '#f2b632', fillOpacity: 1 }).addTo(layer!)
    })
    bounds.push(...props.draft)
  }
  for (const s of props.sensors) {
    if (s.lat == null || s.lng == null) continue
    const m = L.marker([s.lat, s.lng], { icon: pin(s), draggable: props.mode === 'sensors' })
    const val = s.value != null ? `<br><b>${fmtPct(s.value)}</b> de interceptação` : ''
    m.bindTooltip(`<b>${s.name || 'Sensor ' + s.device_id}</b> (ID ${s.device_id})${s.role === 'reference' ? '<br>Referência a pleno sol' : val}`, { direction: 'top', offset: [0, -14] })
    m.on('click', () => emit('select', s.id))
    m.on('dragend', () => { const ll = m.getLatLng(); emit('move', s.id, [ll.lat, ll.lng]) })
    m.addTo(layer)
    bounds.push([s.lat, s.lng])
  }
  if (!fitted && bounds.length) {
    map.fitBounds(L.latLngBounds(bounds as any), { padding: [30, 30], maxZoom: 18 })
    fitted = true
  }
  map.getContainer().style.cursor = props.mode === 'view' ? '' : 'crosshair'
}

watch(() => [props.boundary, props.draft, props.sensors, props.mode, props.others], draw, { deep: true })

function fit() {
  fitted = false
  draw()
}
defineExpose({ fit })
</script>

<template>
  <div ref="el" class="map" :class="{ tall }" />
</template>
