<script setup lang="ts">
defineProps<{ size?: number }>()
</script>
<template>
  <svg :width="size || 32" :height="size || 32" viewBox="0 0 64 64" aria-hidden="true" class="logo">
    <circle cx="46" cy="16" r="9" fill="#f2b632" class="sun" />
    <path d="M30 58C12 50 6 30 16 10c10 14 22 18 30 34-2 8-8 12-16 14z" fill="#2f7d32" />
    <path d="M30 58c-2-14 0-28 8-40" stroke="#dcedc8" stroke-width="3" fill="none" stroke-linecap="round" />
  </svg>
</template>
<style scoped>
.logo .sun { animation: float 4s ease-in-out infinite; transform-box: fill-box; }
</style>
