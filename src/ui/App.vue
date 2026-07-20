<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { useAppStore } from './store/useAppStore'
  import MainView from './views/MainView.vue'
  import SettingsView from './views/SettingsView.vue'
  import IssueView from './views/IssueView.vue'

  /** Текущая открытая страница. Навигация — через события от страниц. */
  type View = 'main' | 'settings' | 'issue'
  const view = ref<View>('main')

  const store = useAppStore()

  // Один раз при старте подтягиваем сохранённые данные из chrome.storage.
  onMounted(() => {
    store.hydrate()
  })
</script>

<template>
  <MainView
    v-if="view === 'main'"
    @open-settings="view = 'settings'"
    @open-issue="view = 'issue'"
  />
  <IssueView v-else-if="view === 'issue'" @back="view = 'main'" />
  <SettingsView v-else @back="view = 'main'" />
</template>
