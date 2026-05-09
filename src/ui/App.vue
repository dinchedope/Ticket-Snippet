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

  interface Settings {
    apiToken: string;
    email: string;
    rowInput?: string;
  }

  interface JiraIssue {
    fields: any[];
  }

  const jiraSchemeString = ref("");
  const jiraScheme = ref<JiraIssue>({ fields: []});

  const form = ref<Record<string, any>>({});


  // request_link
  const request_link = ref('');
  watch(request_link, async (newValue) => {
    await chrome.storage.local.set({
      request_link: newValue
    })  
  })

  // Login
  const login = ref('');
  watch(login, async (newValue) => {
    await chrome.storage.local.set({
      login: newValue
    })  
  })

  // Token
  const token =ref('');
  watch(token, async (newValue) => {
    await chrome.storage.local.set({
      token: newValue
    })  
  })


  async function loadPosts(link: string, settings: Settings) {
    const auth = btoa(`${settings.email}:${settings.apiToken}`);
    const response = await fetch(link, {
      method: "GET",
     headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    })
    jiraScheme.value = await response.json();
    jiraSchemeString.value = JSON.stringify(jiraScheme.value, null, 2);

    const next: Record<string, any> = {};
    for (const field of jiraScheme.value.fields ?? []) {
      next[field.key] = getInitialValue(field);
    }
    form.value = next;
  }

  function submitTicket() {
    console.log('form values', form.value);
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
    let data = await chrome.storage.local.get('login');
    login.value = data.login || "";

    data = await chrome.storage.local.get('token');
    token.value = data.token || "";

    data = await chrome.storage.local.get('request_link');
    request_link.value = data.request_link || "";
  })
</script>

<template>
  <main>
    <div :class="$style.container">
      <input 
          v-model="login" 
          type="text" 
          placeholder="login"
      />
      <input 
          v-model="token" 
          type="text" 
          placeholder="token"
      />
      <input 
          v-model="request_link" 
          type="text" 
          placeholder="ticket_request"
      />
      <button @click="loadPosts(request_link, {email: login, apiToken: token} as Settings)">
        load
      </button>
    </div>

    <div :class="$style.container">
      <h1>Создать тикет в Jira</h1>
        <template v-for="{ field, ui } in renderedFields" :key="field.key">
          <component
            :is="ui!.component"
            v-bind="ui!.props"
            v-model="form[field.key]"
          />
        </template>

        <button v-if="renderedFields.length" @click="submitTicket">
          Создать тикет
        </button>
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

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.field__label {
  font-weight: 500;
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
