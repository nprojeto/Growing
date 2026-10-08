<script setup lang="ts">
const props = defineProps<{ alert: any; compact?: boolean }>()
const emit = defineEmits<{ read: [string]; resolve: [string] }>()
const meta = computed(() => ({
  success: { icon: 'check', color: '#2f9e44', bg: '#e3f4e6' },
  info: { icon: 'info', color: '#3f7fbf', bg: '#e6f0f9' },
  warning: { icon: 'warning', color: '#b7791f', bg: '#fdf3d8' },
  danger: { icon: 'danger', color: '#c0392b', bg: '#fbe6e2' },
} as Record<string, any>)[props.alert.severity] || { icon: 'info', color: '#555', bg: '#eee' })
</script>
<template>
  <div class="al" :class="{ unread: !alert.read_at && !alert.resolved_at }" :style="{ background: meta.bg, borderColor: meta.color + '55' }">
    <div class="ic" :style="{ color: meta.color }"><Icon :name="meta.icon" :size="22" /></div>
    <div class="grow">
      <div class="t" :style="{ color: meta.color }">{{ alert.title }}</div>
      <div class="m small">{{ alert.message }}</div>
      <div class="tiny muted">{{ fmtDateTime(alert.updated_at || alert.created_at) }}<span v-if="alert.resolved_at"> · resolvido</span></div>
    </div>
    <div v-if="!compact && !alert.resolved_at" class="acts">
      <button v-if="!alert.read_at" class="btn sm ghost" @click="emit('read', alert.id)">Lido</button>
      <button class="btn sm ghost" @click="emit('resolve', alert.id)">Resolver</button>
    </div>
  </div>
</template>
<style scoped>
.al { display: flex; gap: 10px; align-items: flex-start; border: 1px solid; border-radius: 14px; padding: 10px 12px; animation: fadeUp .35s both; }
.al.unread { box-shadow: inset 4px 0 0 currentColor; }
.ic { line-height: 0; padding-top: 1px; }
.t { font-weight: 800; }
.m { color: var(--ink-2); }
.acts { display: flex; flex-direction: column; gap: 4px; }
</style>
