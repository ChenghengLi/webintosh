<script setup>
import { onMounted } from 'vue'
import { useSystemStore } from './stores/system'
import BootScreen from './components/BootScreen.vue'
import Desktop from './components/Desktop.vue'

const system = useSystemStore()

onMounted(() => {
  system.hydrate()
  system.$subscribe(() => system.persist())
})
</script>

<template>
  <Desktop />
  <transition name="fade">
    <BootScreen v-if="system.booting" />
  </transition>
</template>

<style>
.fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-leave-to {
  opacity: 0;
}
</style>
