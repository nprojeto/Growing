export function useToast() {
  const toasts = useState<{ id: number; text: string; kind: string }[]>('toasts', () => [])
  function show(text: string, kind: 'ok' | 'err' | 'info' = 'info', ms = 3800) {
    const id = Date.now() + Math.random()
    toasts.value.push({ id, text, kind })
    setTimeout(() => { toasts.value = toasts.value.filter((t) => t.id !== id) }, ms)
  }
  return { toasts, ok: (t: string) => show(t, 'ok'), err: (e: any) => show(e?.message || String(e), 'err', 6000), info: (t: string) => show(t) }
}
