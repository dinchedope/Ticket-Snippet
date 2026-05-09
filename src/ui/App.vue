<script setup lang="ts">
  import { ref, watch, onMounted, computed } from 'vue'
  import TextField from './Components/Text-field.vue';
  import TextArea from './Components/Text-area.vue';
  import Select from './Components/Select.vue';
  import DatePicker from './Components/Date-picker.vue';
  import UserPicker from './Components/User-picker.vue';
  import Attachment from './Components/Attachment.vue';
  import Labels from './Components/Labels.vue';
  import IssueLink from './Components/Issue-link.vue';
  import TimeTracking from './Components/Time-tracking.vue';
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

  function persisted(key: string) {
    const r = ref('')
    watch(r, async (v) => {
      await chrome.storage.local.set({ [key]: v })
    })
    return r
  }

  const login = persisted('login');
  const token = persisted('token');
  const request_link = persisted('request_link');
  const baseUrl = persisted('baseUrl');
  const pastedData = persisted('pastedData');
  const configJson = persisted('configJson');

  function jiraConfig(): JiraConfig {
    return { baseUrl: baseUrl.value, email: login.value, apiToken: token.value };
  }

  async function loadSchema() {
    try {
      status.value = { kind: 'idle', message: 'Загрузка схемы...' };
      const data = await fetchCreateMeta(request_link.value, jiraConfig());
      jiraScheme.value = data;
      jiraSchemeString.value = JSON.stringify(data, null, 2);

      const next: Record<string, any> = {};
      for (const field of data.fields ?? []) {
        next[field.key] = getInitialValue(field);
      }
      form.value = next;
      status.value = { kind: 'ok', message: 'Схема загружена' };
    } catch (e: any) {
      status.value = { kind: 'error', message: e.message ?? String(e) };
    }
  }

  async function submitTicket() {
    try {
      status.value = { kind: 'idle', message: 'Создаём тикет...' };
      const payload = serializeForm(form.value, jiraScheme.value.fields);
      const created = await createIssue(jiraConfig(), payload);
      status.value = { kind: 'ok', message: `Создан: ${created.key}` };
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
      .map(field => ({ field, ui: getUiFieldType(field) }))
      .filter(item => item.ui !== null)
  )


  onMounted(async () => {
    const data = await chrome.storage.local.get([
      'login', 'token', 'request_link', 'baseUrl', 'pastedData', 'configJson'
    ]);
    login.value = data.login || '';
    token.value = data.token || '';
    request_link.value = data.request_link || '';
    baseUrl.value = data.baseUrl || '';
    pastedData.value = data.pastedData || '';
    configJson.value = data.configJson || '';
  })
</script>

<template>
  <main>
    <div :class="$style.container">
      <input v-model="login" type="text" placeholder="email" />
      <input v-model="token" type="text" placeholder="api token" />
      <input v-model="request_link" type="text" placeholder="schema URL (createmeta)" />
      <input v-model="baseUrl" type="text" placeholder="baseUrl (https://example.atlassian.net)" />
      <button @click="loadSchema">load</button>
    </div>

    <div :class="$style.container">
      <h2>Импорт данных</h2>
      <label :class="$style.subLabel">Данные (TSV: 1-я строка — заголовки, 2-я — значения)</label>
      <textarea
        v-model="pastedData"
        rows="3"
        placeholder="Entry No.&#9;Box No.&#9;...&#10;73784468&#9;GV14B01ONHOLD&#9;..."
      ></textarea>
      <label :class="$style.subLabel">Конфиг (JSON)</label>
      <textarea
        v-model="configJson"
        rows="8"
        :class="$style.codeArea"
        placeholder='{ "summary": { "type": "internal", "value": "Entry No." } }'
      ></textarea>
      <button @click="applyConfig">Применить конфиг</button>
    </div>

    <div :class="$style.container">
      <h1>Создать тикет в Jira</h1>
        <template v-for="{ field, ui } in renderedFields" :key="field.key">
          <div :class="$style.fieldRow">
            <span :class="$style.fieldKey">{{ field.key }}</span>
            <component
              :is="ui!.component"
              v-bind="ui!.props"
              v-model="form[field.key]"
            />
          </div>
        </template>

        <button v-if="renderedFields.length" @click="submitTicket">
          Создать тикет
        </button>

        <p
          v-if="status.message"
          :class="[$style.status, status.kind === 'error' && $style.statusError, status.kind === 'ok' && $style.statusOk]"
        >
          {{ status.message }}
        </p>
    </div>

    <div :class="$style.container">
    <textarea
      v-model="jiraSchemeString"
      placeholder="Ответ от сервера"
      rows="6"
    ></textarea>
    </div>
  </main>

</template>

<style module>
main{
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    justify-content: center;
    margin-bottom: 300px;
}

.container {
  max-width: 480px;
  min-width: 370px;
  margin: 5px;
  padding: 0 16px;
  display: flex;
  overflow: hidden;
  flex-wrap: wrap;
  flex-direction: column;
  gap: 20px;

}

h1 {
  font-size: 1.5rem;
  margin: 0 0 24px;
}

.fieldRow {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.fieldKey {
  flex-shrink: 0;
  width: 120px;
  padding-top: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8rem;
  color: color-mix(in srgb, CanvasText 60%, transparent);
  word-break: break-all;
}

.status {
  margin: 0;
  font-size: 0.9rem;
  color: color-mix(in srgb, CanvasText 70%, transparent);
}

.statusOk { color: #2a9d2a; }
.statusError { color: #d33; }

.subLabel {
  font-size: 0.85rem;
  color: color-mix(in srgb, CanvasText 70%, transparent);
}

.codeArea {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  white-space: pre;
}

input{
  min-width: 300px;
  font-size: 16px;
}

input,
textarea,
select {
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, CanvasText 30%, transparent);
  border-radius: 6px;
  background: Field;
  color: FieldText;
}

textarea {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: pre;
}

input:focus,
textarea:focus,
select:focus {
  outline: 2px solid AccentColor;
  outline-offset: 1px;
  border-color: transparent;
}

.hint {
  margin: -4px 0 12px;
  font-size: 0.85rem;
  color: color-mix(in srgb, CanvasText 70%, transparent);
}

.hint--error {
  color: #d33;
}

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

button {
  font: inherit;
  padding: 8px 16px;
  border: 0;
  border-radius: 6px;
  background: AccentColor;
  color: AccentColorText;
  cursor: pointer;
}

button:hover:not(:disabled) {
  filter: brightness(1.05);
}

button:disabled {
  opacity: 0.6;
  cursor: progress;
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
