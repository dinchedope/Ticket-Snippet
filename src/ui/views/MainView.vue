<script setup lang="ts">
  import { computed } from 'vue'
  import { useAppStore } from '../store/useAppStore'
  import { getUiFieldType } from './fieldRegistry'
  import ConfigPanel from './ConfigPanel.vue'

  /** Переход на страницу настроек обрабатывает App.vue. */
  defineEmits<{
    openSettings: []
  }>()

  const store = useAppStore()

  /**
   * Поля, которые реально рендерятся: только видимые (по настройкам) и только
   * те, для чьего типа есть UI-компонент.
   */
  const renderedFields = computed(() =>
    (store.jiraScheme.value.fields ?? [])
      .filter((field) => store.visibleFields.value?.[field.key] !== false)
      .map((field) => ({ field, ui: getUiFieldType(field) }))
      .filter((item) => item.ui !== null)
  )
</script>

<template>
  <main :class="$style.page">
    <header :class="$style.topbar">
      <h1 :class="$style.title">Создать тикет в Jira</h1>
      <div :class="$style.actions">
        <button class="btn btn-primary" @click="store.loadSchema">Загрузить схему</button>
        <button class="btn btn-ghost" @click="$emit('openSettings')" title="Настройки">⚙</button>
      </div>
    </header>

    <div :class="$style.body">
      <!-- Левая колонка: данные и конфиг -->
      <ConfigPanel />

      <!-- Правая колонка: форма тикета -->
      <section :class="$style.rightPanel">
        <div :class="$style.formScroll">
          <p v-if="!store.jiraScheme.value.fields.length" :class="$style.empty">
            Нажмите «Загрузить схему» сверху
          </p>

          <div
            v-for="{ field, ui } in renderedFields"
            :key="field.key"
            :class="$style.fieldRow"
          >
            <span :class="$style.fieldKey">{{ field.key }}</span>
            <component
              :is="ui!.component"
              v-bind="ui!.props"
              v-model="store.form.value[field.key]"
            />
          </div>
        </div>

        <footer :class="$style.footer">
          <button
            v-if="renderedFields.length"
            class="btn btn-primary"
            @click="store.submitTicket"
          >
            Создать тикет
          </button>
          <p
            v-if="store.status.value.message"
            class="status"
            :class="{
              'status-ok': store.status.value.kind === 'ok',
              'status-error': store.status.value.kind === 'error',
            }"
          >
            {{ store.status.value.message }}
          </p>
        </footer>
      </section>
    </div>
  </main>
</template>

<style module>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid color-mix(in srgb, CanvasText 15%, transparent);
  flex-shrink: 0;
}

.title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.rightPanel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.formScroll {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fieldRow {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.fieldKey {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.7rem;
  color: color-mix(in srgb, CanvasText 50%, transparent);
}

.empty {
  margin: 0;
  font-size: 0.9rem;
  color: color-mix(in srgb, CanvasText 60%, transparent);
  text-align: center;
  padding: 32px 16px;
}

.footer {
  flex-shrink: 0;
  padding: 12px 16px;
  border-top: 1px solid color-mix(in srgb, CanvasText 15%, transparent);
  display: flex;
  align-items: center;
  gap: 12px;
  background: color-mix(in srgb, Canvas 95%, CanvasText);
}

.footer .status {
  flex: 1;
}
</style>
