<script setup lang="ts">
const props = defineProps<{ status: { key: string; label: string; color: string } }>()
const icon = computed(() => ({ ideal: 'check', passou: 'warning', quase: 'clock', crescendo: 'sprout', sem: 'minus' } as Record<string, string>)[props.status.key] || 'minus')
</script>
<template>
  <span class="pill" :class="{ pulse: status.key === 'ideal' }" :style="{ background: status.color + '22', color: status.color }">
    <Icon :name="icon" :size="14" :stroke="2.4" /> {{ status.label }}
  </span>
</template>
