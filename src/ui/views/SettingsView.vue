<script setup lang="ts">
  import { useAppStore } from '../store/useAppStore'

  /** Возврат на главную обрабатывает App.vue. */
  defineEmits<{
    back: []
  }>()

  const store = useAppStore()

  /** Поле считается видимым, если явно не выключено (по умолчанию — видимо). */
  function isFieldVisible(key: string): boolean {
    return store.visibleFields.value?.[key] !== false
  }

  /** Переключает видимость поля формы. */
  function toggleField(key: string): void {
    const current = store.visibleFields.value ?? {}
    store.visibleFields.value = { ...current, [key]: !isFieldVisible(key) }
  }
</script>

<template>
  <div :class="$style.settings">
    <header :class="$style.header">
      <div :class="$style.headerLeft">
        <button class="btn btn-ghost" @click="$emit('back')" title="Назад">← Назад</button>
        <h2 :class="$style.h2">Настройки</h2>
      </div>
    </header>

    <!-- Подключение к Jira -->
    <section :class="$style.section">
      <h3 :class="$style.h3">Подключение</h3>
      <input v-model="store.login.value" type="text" placeholder="email" :class="$style.input" />
      <input v-model="store.token.value" type="text" placeholder="api token" :class="$style.input" />
      <input v-model="store.request_link.value" type="text" placeholder="schema URL (createmeta)" :class="$style.input" />
      <input v-model="store.baseUrl.value" type="text" placeholder="baseUrl (https://...)" :class="$style.input" />
      <button class="btn btn-primary" @click="store.loadSchema">Загрузить схему</button>
    </section>

    <!-- Выбор отображаемых полей формы -->
    <section v-if="store.jiraScheme.value.fields.length" :class="$style.section">
      <h3 :class="$style.h3">Видимые поля</h3>
      <ul :class="$style.checklist">
        <li v-for="field in store.jiraScheme.value.fields" :key="field.key">
          <label :class="$style.checkRow">
            <input
              type="checkbox"
              :checked="isFieldVisible(field.key)"
              @change="toggleField(field.key)"
            />
            <span :class="$style.name">
              {{ field.name }}
              <span v-if="field.required" :class="$style.required">*</span>
            </span>
            <span :class="$style.key">{{ field.key }}</span>
          </label>
        </li>
      </ul>
    </section>

    <!-- Поведение после создания тикета -->
    <section :class="$style.section">
      <h3 :class="$style.h3">После создания тикета</h3>
      <label :class="$style.row">
        <input type="checkbox" v-model="store.clearAfterSubmit.value" />
        Очищать форму и вставленные данные
      </label>
    </section>

    <!-- Отладочный просмотр загруженной схемы -->
    <details v-if="store.jiraSchemeString.value" :class="$style.debug">
      <summary>Схема (debug)</summary>
      <textarea readonly :value="store.jiraSchemeString.value" rows="10" :class="$style.code"></textarea>
    </details>

    <button class="btn btn-primary" :class="$style.saveBtn" @click="$emit('back')">
      Сохранить и закрыть
    </button>
  </div>
</template>

<style module>
.settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 20px;
  width: 100%;
  box-sizing: border-box;
  height: 100vh;
  overflow-y: auto;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.headerLeft {
  display: flex;
  align-items: center;
  gap: 12px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.h2,
.h3 {
  margin: 0;
}
.h3 {
  font-size: 1rem;
  opacity: 0.85;
}

.input,
.code {
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, CanvasText 30%, transparent);
  border-radius: 6px;
  background: Field;
  color: FieldText;
  font-size: 14px;
}

.debug {
  border: 1px solid color-mix(in srgb, CanvasText 15%, transparent);
  border-radius: 6px;
  padding: 8px 12px;
}

.debug summary {
  cursor: pointer;
  font-size: 0.85rem;
  color: color-mix(in srgb, CanvasText 70%, transparent);
}

.code {
  width: 100%;
  margin-top: 8px;
  box-sizing: border-box;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  white-space: pre;
}

.checklist {
  list-style: none;
  padding: 8px;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid color-mix(in srgb, CanvasText 20%, transparent);
  border-radius: 6px;
}

.checkRow {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.name {
  flex-grow: 1;
}
.required {
  color: red;
}
.key {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75rem;
  color: color-mix(in srgb, CanvasText 60%, transparent);
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.saveBtn {
  margin-top: 8px;
  align-self: flex-start;
}
</style>
