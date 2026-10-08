<script setup lang="ts">
const props = defineProps<{ status: { key: string; label: string; color: string } }>()
const icon = computed(() => ({ ideal: '🐄', passou: '⚠️', quase: '⏳', crescendo: '🌱', sem: '…' } as Record<string, string>)[props.status.key] || '')
</script>
<template>
  <span class="pill" :class="{ pulse: status.key === 'ideal' }" :style="{ background: status.color + '22', color: status.color }">
    {{ icon }} {{ status.label }}
  </span>
</template>
