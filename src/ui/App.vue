<script setup lang="ts">
  import { ref, watch, onMounted, computed, toRaw, type Ref } from 'vue'
  import TextField from './Components/Text-field.vue';
  import TextArea from './Components/Text-area.vue';
  import Select from './Components/Select.vue';
  import DatePicker from './Components/Date-picker.vue';
  import UserPicker from './Components/User-picker.vue';
  import Attachment from './Components/Attachment.vue';
  import Labels from './Components/Labels.vue';
  import IssueLink from './Components/Issue-link.vue';
  import TimeTracking from './Components/Time-tracking.vue';
  import Settings from './Components/Settings.vue';
  import { fetchCreateMeta, createIssue, type JiraConfig } from './services/jiraApi'
  import { serializeForm } from './services/serializeForm'
  import { parseTsvData, applyConfigToForm, type Config } from './services/configMapping'

  interface JiraIssue {
    fields: any[];
  }

  const jiraSchemeString = ref("");
  const jiraScheme = ref<JiraIssue>({ fields: []});

  const form = ref<Record<string, any>>({});

  const status = ref<{ kind: 'idle' | 'ok' | 'error'; message: string }>({
    kind: 'idle',
    message: ''
  });

  function persisted<T>(key: string, initial: T): Ref<T> {
    const r = ref(initial) as Ref<T>
    const isObj = typeof initial === 'object' && initial !== null
    watch(r, async (v) => {
      await chrome.storage.local.set({ [key]: toRaw(v) })
    }, { deep: isObj })
    return r
  }

  const settingsOpen = ref(false);

  const login = persisted('login', '');
  const token = persisted('token', '');
  const request_link = persisted('request_link', '');
  const baseUrl = persisted('baseUrl', '');
  const pastedData = persisted('pastedData', '');
  const configJson = persisted('configJson', '');
  const visibleFields = persisted<Record<string, boolean>>('visibleFields', {});
  const clearAfterSubmit = persisted('clearAfterSubmit', false);

  function jiraConfig(): JiraConfig {
    return { baseUrl: baseUrl.value, email: login.value, apiToken: token.value };
  }

  function validateConnection(): string | null {
    if (!login.value.trim()) return 'Не указан email';
    if (!token.value.trim()) return 'Не указан API token';
    if (!request_link.value.trim()) return 'Не указан URL для схемы';
    return null;
  }

  async function loadSchema() {
    const err = validateConnection();
    if (err) {
      status.value = { kind: 'error', message: err };
      return;
    }
    try {
      status.value = { kind: 'idle', message: 'Загрузка схемы...' };
      const data = await fetchCreateMeta(request_link.value, jiraConfig());
      jiraScheme.value = data;
      jiraSchemeString.value = JSON.stringify(data, null, 2);

      const nextForm: Record<string, any> = {};
      const nextVisibility: Record<string, boolean> = { ...(visibleFields.value ?? {}) };
      for (const field of data.fields ?? []) {
        nextForm[field.key] = getInitialValue(field);
        if (nextVisibility[field.key] === undefined) {
          nextVisibility[field.key] = true;
        }
      }
      form.value = nextForm;
      visibleFields.value = nextVisibility;
      status.value = { kind: 'ok', message: 'Схема загружена' };
    } catch (e: any) {
      status.value = { kind: 'error', message: e.message ?? String(e) };
    }
  }

  function resetForm() {
    const next: Record<string, any> = {};
    for (const field of jiraScheme.value.fields ?? []) {
      next[field.key] = getInitialValue(field);
    }
    form.value = next;
    pastedData.value = '';
  }

  async function submitTicket() {
    if (!baseUrl.value.trim()) {
      status.value = { kind: 'error', message: 'Не указан baseUrl' };
      return;
    }
    if (!jiraScheme.value.fields?.length) {
      status.value = { kind: 'error', message: 'Сначала загрузите схему' };
      return;
    }
    try {
      status.value = { kind: 'idle', message: 'Создаём тикет...' };
      const payload = serializeForm(form.value, jiraScheme.value.fields);
      const created = await createIssue(jiraConfig(), payload);
      status.value = { kind: 'ok', message: `Создан: ${created.key}` };
      if (clearAfterSubmit.value) resetForm();
    } catch (e: any) {
      status.value = { kind: 'error', message: e.message ?? String(e) };
    }
  }

  function applyConfig() {
    try {
      const parsed = parseTsvData(pastedData.value);
      const config: Config = configJson.value.trim()
        ? JSON.parse(configJson.value)
        : {};
      console.log('[applyConfig] parsed TSV:', parsed);
      console.log('[applyConfig] config:', config);
      form.value = applyConfigToForm(
        form.value,
        config,
        parsed,
        jiraScheme.value.fields ?? []
      );
      console.log('[applyConfig] form after:', form.value);
      status.value = { kind: 'ok', message: 'Конфиг применён' };
    } catch (e: any) {
      status.value = { kind: 'error', message: 'Ошибка конфига: ' + (e.message ?? String(e)) };
    }
  }


  function getUiFieldType(field: any) {
    const schema = field.schema
    if (!schema) return null

    const baseProps = { name: field.name, required: field.required }

    if (schema.type === 'string' && schema.system === 'summary')
      return { component: TextField, props: baseProps }
    if (schema.type === 'string' && schema.system === 'description')
      return { component: TextArea, props: baseProps }
    if (schema.type === 'string')
      return { component: TextField, props: baseProps }

    if (schema.type === 'date')
      return { component: DatePicker, props: baseProps }

    if (
      schema.type === 'option' ||
      schema.type === 'priority' ||
      schema.type === 'project' ||
      schema.type === 'issuetype'
    ) {
      return {
        component: Select,
        props: { ...baseProps, options: field.allowedValues ?? [] }
      }
    }

    if (schema.type === 'user')
      return { component: UserPicker, props: baseProps }

    if (schema.type === 'issuelink')
      return { component: IssueLink, props: baseProps }

    if (schema.type === 'array' && schema.items === 'attachment')
      return { component: Attachment, props: baseProps }

    if (schema.type === 'array' && schema.items === 'string')
      return { component: Labels, props: baseProps }

    if (schema.type === 'array' && schema.items === 'issuelinks')
      return { component: IssueLink, props: { ...baseProps, multiple: true } }

    if (schema.type === 'timetracking')
      return { component: TimeTracking, props: baseProps }

    return null
  }

  function getInitialValue(field: any): any {
    if (field.defaultValue !== undefined && field.defaultValue !== null) {
      if (typeof field.defaultValue === 'object') {
        return String(field.defaultValue.id ?? field.defaultValue.value ?? '')
      }
      return field.defaultValue
    }
    if (Array.isArray(field.allowedValues) && field.allowedValues.length === 1) {
      const only = field.allowedValues[0]
      return String(only.id ?? only.value ?? '')
    }
    const schema = field.schema
    if (schema?.type === 'array') return []
    if (schema?.type === 'timetracking') return {}
    return ''
  }

  const renderedFields = computed(() =>
    (jiraScheme.value.fields ?? [])
      .filter(field => visibleFields.value?.[field.key] !== false)
      .map(field => ({ field, ui: getUiFieldType(field) }))
      .filter(item => item.ui !== null)
  )


  onMounted(async () => {
    const data = await chrome.storage.local.get([
      'login', 'token', 'request_link', 'baseUrl',
      'pastedData', 'configJson', 'visibleFields', 'clearAfterSubmit'
    ]);
    login.value = data.login || '';
    token.value = data.token || '';
    request_link.value = data.request_link || '';
    baseUrl.value = data.baseUrl || '';
    pastedData.value = data.pastedData || '';
    configJson.value = data.configJson || '';
    visibleFields.value = data.visibleFields || {};
    clearAfterSubmit.value = !!data.clearAfterSubmit;
  })
</script>

<template>
  <main :class="$style.app">
    <Settings
      v-if="settingsOpen"
      v-model:login="login"
      v-model:token="token"
      v-model:requestLink="request_link"
      v-model:baseUrl="baseUrl"
      v-model:visibleFields="visibleFields"
      v-model:clearAfterSubmit="clearAfterSubmit"
      :fields="jiraScheme.fields"
      :schemePreview="jiraSchemeString"
      @load-schema="loadSchema"
      @close="settingsOpen = false"
    />

    <template v-else>
      <header :class="$style.topbar">
        <h1 :class="$style.title">Создать тикет в Jira</h1>
        <div :class="$style.topActions">
          <button :class="$style.primaryBtn" @click="loadSchema">Загрузить схему</button>
          <button :class="$style.gear" @click="settingsOpen = true" title="Настройки">⚙</button>
        </div>
      </header>

      <div :class="$style.body">
        <aside :class="$style.leftPanel">
          <label :class="$style.subLabel">Данные (TSV)</label>
          <textarea
            v-model="pastedData"
            :class="[$style.dataArea, $style.tsvArea]"
            placeholder="Entry No.&#9;Box No.&#9;...&#10;73784468&#9;GV14B01ONHOLD&#9;..."
          ></textarea>

          <label :class="$style.subLabel">Конфиг (JSON)</label>
          <textarea
            v-model="configJson"
            :class="[$style.dataArea, $style.configArea]"
            placeholder='{ "summary": { "type": "internal", "value": "Entry No." } }'
          ></textarea>

          <button :class="$style.primaryBtn" @click="applyConfig">Применить конфиг</button>
        </aside>

        <section :class="$style.rightPanel">
          <div :class="$style.formScroll">
            <p v-if="!jiraScheme.fields.length" :class="$style.empty">
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
                v-model="form[field.key]"
              />
            </div>
          </div>

          <footer :class="$style.rightFooter">
            <button
              v-if="renderedFields.length"
              :class="$style.primaryBtn"
              @click="submitTicket"
            >
              Создать тикет
            </button>
            <p
              v-if="status.message"
              :class="[$style.status, status.kind === 'error' && $style.statusError, status.kind === 'ok' && $style.statusOk]"
            >
              {{ status.message }}
            </p>
          </footer>
        </section>
      </div>
    </template>
  </main>
</template>

<style module>
:global(html), :global(body), :global(#app) {
  height: 100%;
  margin: 0;
  padding: 0;
}

:global(body) {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  background: Canvas;
  color: CanvasText;
}

.app {
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

.topActions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.gear {
  background: transparent;
  border: 0;
  color: inherit;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}

.gear:hover {
  background: color-mix(in srgb, CanvasText 10%, transparent);
}

.body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.leftPanel {
  width: 38%;
  min-width: 240px;
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 8px;
  border-right: 1px solid color-mix(in srgb, CanvasText 15%, transparent);
  flex-shrink: 0;
}

.dataArea {
  resize: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, CanvasText 25%, transparent);
  border-radius: 6px;
  background: Field;
  color: FieldText;
  white-space: pre;
  box-sizing: border-box;
  width: 100%;
}

.tsvArea {
  flex: 1;
  min-height: 70px;
}

.configArea {
  flex: 2;
  min-height: 120px;
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

.rightFooter {
  flex-shrink: 0;
  padding: 12px 16px;
  border-top: 1px solid color-mix(in srgb, CanvasText 15%, transparent);
  display: flex;
  align-items: center;
  gap: 12px;
  background: color-mix(in srgb, Canvas 95%, CanvasText);
}

.status {
  margin: 0;
  font-size: 0.85rem;
  color: color-mix(in srgb, CanvasText 70%, transparent);
  flex: 1;
  min-width: 0;
  word-break: break-word;
}

.statusOk { color: #2a9d2a; }
.statusError { color: #d33; }

.subLabel {
  font-size: 0.8rem;
  color: color-mix(in srgb, CanvasText 70%, transparent);
}

.primaryBtn {
  font: inherit;
  padding: 7px 14px;
  border: 0;
  border-radius: 6px;
  background: AccentColor;
  color: AccentColorText;
  cursor: pointer;
  font-size: 0.9rem;
}

.primaryBtn:hover:not(:disabled) {
  filter: brightness(1.05);
}

.primaryBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

input:focus,
textarea:focus,
select:focus {
  outline: 2px solid AccentColor;
  outline-offset: 1px;
  border-color: transparent;
}

.status {
  color: color-mix(in srgb, CanvasText 70%, transparent);
  word-break: break-word;
}

.status--error {
  color: #d33;
}

.status a {
  color: inherit;
  text-decoration: underline;
}
</style>
