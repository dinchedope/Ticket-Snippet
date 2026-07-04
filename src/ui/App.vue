<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { useAppStore } from './store/useAppStore'
  import MainView from './views/MainView.vue'
  import SettingsView from './views/SettingsView.vue'

  /** Текущая открытая страница. Навигация — через события от страниц. */
  type View = 'main' | 'settings'
  const view = ref<View>('main')

  const store = useAppStore()

  // Один раз при старте подтягиваем сохранённые данные из chrome.storage.
  onMounted(() => {
    store.hydrate()
  })
</script>

<template>
  <MainView v-if="view === 'main'" @open-settings="view = 'settings'" />
  <SettingsView v-else @back="view = 'main'" />
</template>
