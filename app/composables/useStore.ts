// Estado global do app (fazendas, piquetes, sensores, leituras, alertas)

async function fetchAll(build: () => any, max = 50000) {
  const page = 1000
  const out: any[] = []
  for (let from = 0; from < max; from += page) {
    const { data, error } = await build().range(from, from + page - 1)
    if (error) throw error
    out.push(...(data || []))
    if (!data || data.length < page) break
  }
  return out
}

export function useStore() {
  const farms = useState<any[]>('farms', () => [])
  const farmId = useState<string | null>('farmId', () => null)
  const paddocks = useState<any[]>('paddocks', () => [])
  const sensors = useState<any[]>('sensors', () => [])
  const grassTypes = useState<any[]>('grassTypes', () => [])
  const readings = useState<any[]>('readings', () => [])
  const alerts = useState<any[]>('alerts', () => [])
  const gateways = useState<any[]>('gateways', () => [])
  const profile = useState<any>('profile', () => null)
  const loaded = useState('storeLoaded', () => false)
  const busy = useState('storeBusy', () => false)

  const farm = computed(() => farms.value.find((f) => f.id === farmId.value) || null)

  async function loadProfile() {
    const { data: u } = await sb().auth.getUser()
    if (!u.user) return
    const { data } = await sb().from('profiles').select('*').eq('id', u.user.id).maybeSingle()
    profile.value = data || { id: u.user.id, full_name: u.user.user_metadata?.full_name || '' }
  }

  async function loadGrass() {
    const { data, error } = await sb().from('grass_types').select('*').order('name')
    if (error) throw error
    grassTypes.value = data || []
  }

  async function loadFarms() {
    const { data, error } = await sb().from('farms').select('*').order('created_at')
    if (error) throw error
    farms.value = data || []
    if (!farms.value.find((f) => f.id === farmId.value)) {
      const saved = lsGet('pv_farm')
      farmId.value = farms.value.find((f) => f.id === saved)?.id || farms.value[0]?.id || null
    }
  }

  async function loadFarmData() {
    const id = farmId.value
    if (!id) {
      paddocks.value = []; sensors.value = []; readings.value = []; alerts.value = []; gateways.value = []
      return
    }
    const since = new Date(Date.now() - 365 * 864e5).toISOString()
    const [p, s, a, g] = await Promise.all([
      sb().from('paddocks').select('*').eq('farm_id', id).order('created_at'),
      sb().from('sensors').select('*').eq('farm_id', id).order('device_id'),
      sb().from('alerts').select('*').eq('farm_id', id).is('resolved_at', null).order('created_at', { ascending: false }),
      sb().from('gateways').select('*').eq('farm_id', id).order('created_at'),
    ])
    for (const r of [p, s, a, g]) if (r.error) throw r.error
    const rows = await fetchAll(() =>
      sb().from('v_interception').select('*').eq('farm_id', id).gte('measured_at', since).order('measured_at'),
    )
    if (farmId.value !== id) return // trocou de fazenda no meio
    paddocks.value = p.data || []
    sensors.value = s.data || []
    alerts.value = a.data || []
    gateways.value = g.data || []
    readings.value = rows
  }

  async function refresh() {
    busy.value = true
    try {
      await Promise.all([loadProfile(), loadGrass(), loadFarms()])
      await loadFarmData()
      loaded.value = true
    } finally {
      busy.value = false
    }
  }

  async function setFarm(id: string) {
    farmId.value = id
    lsSet('pv_farm', id)
    busy.value = true
    try { await loadFarmData() } finally { busy.value = false }
  }

  async function reloadAlerts() {
    if (!farmId.value) return
    const { data } = await sb().from('alerts').select('*').eq('farm_id', farmId.value).is('resolved_at', null).order('created_at', { ascending: false })
    alerts.value = data || []
  }

  async function evaluateAlerts() {
    if (!farmId.value) return
    await callApi('alerts/evaluate', { farm_id: farmId.value })
    await reloadAlerts()
  }

  async function createFarm(input: { name: string; farmer_name?: string; city?: string; state?: string }) {
    const { data: u } = await sb().auth.getUser()
    const { data, error } = await sb().from('farms').insert({ ...input, owner_id: u.user!.id }).select().single()
    if (error) throw error
    await loadFarms()
    return data
  }

  async function createPaddock(input: { farm_id: string; name: string; kind?: string; grass_type_id?: string | null }) {
    const { data, error } = await sb().from('paddocks').insert(input).select().single()
    if (error) throw error
    return data
  }

  async function seedDemo(simulate = true) {
    const res = await callApi<{ farm_id: string; paddock_id: string }>('seed-demo', { simulate, include_log: true })
    await loadFarms()
    await setFarm(res.farm_id)
    return res
  }

  /** Cadastro feito antes da confirmação de e-mail: cria fazenda/piquete no 1º acesso. */
  async function applyPending(): Promise<{ paddockId?: string; demo?: boolean } | null> {
    const raw = lsGet('pv_pending')
    if (!raw) return null
    lsSet('pv_pending', null)
    let p: any
    try { p = JSON.parse(raw) } catch { return null }
    const out: { paddockId?: string; demo?: boolean } = {}
    if (p.farmName) {
      const f = await createFarm({ name: p.farmName, farmer_name: p.farmerName })
      const pad = await createPaddock({ farm_id: f.id, name: p.paddockName || 'Piquete 1', kind: p.kind || 'piquete' })
      out.paddockId = pad.id
      await setFarm(f.id)
    }
    if (p.demo) { await seedDemo(true); out.demo = true }
    return out
  }

  function waitLoaded() {
    return new Promise<void>((res) => {
      if (loaded.value) return res()
      const stop = watch(loaded, (v) => { if (v) { stop(); res() } })
    })
  }

  function reset() {
    farms.value = []; farmId.value = null; paddocks.value = []; sensors.value = []
    readings.value = []; alerts.value = []; gateways.value = []; profile.value = null; loaded.value = false
  }

  return {
    farms, farmId, farm, paddocks, sensors, grassTypes, readings, alerts, gateways, profile, loaded, busy,
    refresh, setFarm, loadFarmData, loadFarms, loadGrass, reloadAlerts, evaluateAlerts,
    createFarm, createPaddock, seedDemo, applyPending, reset, waitLoaded,
  }
}
