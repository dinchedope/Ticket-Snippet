<script setup lang="ts">
  import { ref, watch, onMounted, toRaw, type Ref } from 'vue'
  import Settings from './Components/Settings.vue'
  import DataPanel from './Components/DataPanel.vue'
  import IssueForm from './Components/IssueForm.vue'
  // swap between './services/jiraApi' (real Jira) and './services/jiraApiMock' (offline mock)
  import { fetchCreateMeta, createIssue, detectApiVersion, type JiraConfig } from './services/jiraApi'
  import { serializeForm } from './services/serializeForm'
  import { getInitialValue } from './services/fieldUtils'
  import type { DataBlock } from './services/configMapping'
  import type { JiraCreateMeta } from './services/jiraTypes'

  type Status = {
    kind: 'idle' | 'ok' | 'error';
    message: string;
    link?: { url: string; label: string };
  };

  const jiraSchemeString = ref('');
  const jiraScheme = ref<JiraCreateMeta>({ fields: [] });
  const form = ref<Record<string, any>>({});
  const status = ref<Status>({ kind: 'idle', message: '' });
  const settingsOpen = ref(false);

  // --- persisted state -------------------------------------------------------

  function persisted<T>(key: string, initial: T): Ref<T> {
    const r = ref(initial) as Ref<T>;
    const isObj = typeof initial === 'object' && initial !== null;
    watch(r, async (v) => {
      await chrome.storage.local.set({ [key]: toRaw(v) });
    }, { deep: isObj });
    return r;
  }

  function normalizeBlocks(value: any): DataBlock[] {
    if (!Array.isArray(value) || !value.length) return [{ id: 1, raw: '' }];
    const blocks: DataBlock[] = [];
    let fallbackId = 1;
    for (const b of value) {
      if (b && typeof b === 'object' && typeof b.raw === 'string') {
        const id = typeof b.id === 'number' ? b.id : fallbackId;
        blocks.push({ id, raw: b.raw });
        fallbackId = Math.max(fallbackId, id) + 1;
      }
    }
    return blocks.length ? blocks : [{ id: 1, raw: '' }];
  }

  const login = persisted('login', '');
  const token = persisted('token', '');
  const request_link = persisted('request_link', '');
  const baseUrl = persisted('baseUrl', '');
  const dataBlocks = persisted<DataBlock[]>('dataBlocks', [{ id: 1, raw: '' }]);
  const configJson = persisted('configJson', '');
  const visibleFields = persisted<Record<string, boolean>>('visibleFields', {});
  const fieldOrder = persisted<string[]>('fieldOrder', []);
  const clearAfterSubmit = persisted('clearAfterSubmit', false);

  // --- Jira API orchestration ------------------------------------------------

  function jiraConfig(): JiraConfig {
    return {
      baseUrl: baseUrl.value,
      email: login.value,
      apiToken: token.value,
      apiVersion: detectApiVersion(request_link.value),
    };
  }

  function validateConnection(): string | null {
    if (!login.value.trim()) return 'Email is not set';
    if (!token.value.trim()) return 'API token is not set';
    if (!request_link.value.trim()) return 'Schema URL is not set';
    return null;
  }

  async function loadSchema() {
    const err = validateConnection();
    if (err) {
      status.value = { kind: 'error', message: err };
      return;
    }
    try {
      status.value = { kind: 'idle', message: 'Loading schema...' };
      const data = await fetchCreateMeta(request_link.value, jiraConfig());
      jiraScheme.value = data;
      jiraSchemeString.value = JSON.stringify(data, null, 2);

      const nextForm: Record<string, any> = {};
      const nextVisibility: Record<string, boolean> = { ...(visibleFields.value ?? {}) };
      const validKeys = new Set<string>();
      for (const field of data.fields ?? []) {
        nextForm[field.key] = getInitialValue(field);
        if (nextVisibility[field.key] === undefined) nextVisibility[field.key] = true;
        validKeys.add(field.key);
      }
      // keep user's ordering, drop dead keys, append new fields at the end
      const nextOrder = (fieldOrder.value ?? []).filter(k => validKeys.has(k));
      for (const field of data.fields ?? []) {
        if (!nextOrder.includes(field.key)) nextOrder.push(field.key);
      }
      form.value = nextForm;
      visibleFields.value = nextVisibility;
      fieldOrder.value = nextOrder;
      status.value = { kind: 'ok', message: 'Schema loaded' };
    } catch (e: any) {
      status.value = { kind: 'error', message: e?.message ?? String(e) };
    }
  }

  async function resetForm(opts: { keepData?: boolean } = {}) {
    const next: Record<string, any> = {};
    for (const field of jiraScheme.value.fields ?? []) next[field.key] = getInitialValue(field);
    form.value = next;
    if (!opts.keepData) {
      // preserve block ids, wipe raw content only
      const cleared = dataBlocks.value.map(b => ({ ...b, raw: '' }));
      dataBlocks.value = cleared.length ? cleared : [{ id: 1, raw: '' }];
    }
  }

  async function submitTicket() {
    if (!baseUrl.value.trim()) {
      status.value = { kind: 'error', message: 'baseUrl is not set' };
      return;
    }
    if (!jiraScheme.value.fields?.length) {
      status.value = { kind: 'error', message: 'Load the schema first' };
      return;
    }
    try {
      status.value = { kind: 'idle', message: 'Creating issue...' };
      const cfg = jiraConfig();
      const payload = serializeForm(form.value, jiraScheme.value.fields, cfg.apiVersion);
      const created = await createIssue(cfg, payload);
      const browseUrl = `${cfg.baseUrl.replace(/\/$/, '')}/browse/${created.key}`;
      status.value = {
        kind: 'ok',
        message: 'Created:',
        link: { url: browseUrl, label: created.key },
      };
      if (clearAfterSubmit.value) resetForm();
    } catch (e: any) {
      status.value = { kind: 'error', message: e?.message ?? String(e) };
    }
  }

  function onStatus(s: Status) {
    status.value = s;
  }

  // --- bootstrap -------------------------------------------------------------

  onMounted(async () => {
    const data = await chrome.storage.local.get([
      'login', 'token', 'request_link', 'baseUrl',
      'dataBlocks', 'configJson', 'visibleFields', 'fieldOrder', 'clearAfterSubmit'
    ]);
    login.value = data.login || '';
    token.value = data.token || '';
    request_link.value = data.request_link || '';
    baseUrl.value = data.baseUrl || '';
    dataBlocks.value = normalizeBlocks(data.dataBlocks);
    configJson.value = data.configJson || '';
    visibleFields.value = data.visibleFields || {};
    fieldOrder.value = Array.isArray(data.fieldOrder) ? data.fieldOrder : [];
    clearAfterSubmit.value = !!data.clearAfterSubmit;
  });
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
      v-model:fieldOrder="fieldOrder"
      :fields="jiraScheme.fields"
      :schemePreview="jiraSchemeString"
      @load-schema="loadSchema"
      @close="settingsOpen = false"
    />

    <template v-else>
      <header :class="$style.topbar">
        <h1 :class="$style.title">Create a Jira issue</h1>
        <div :class="$style.topActions">
          <button class="btn btn--primary" @click="loadSchema">Load schema</button>
          <button :class="$style.gear" @click="settingsOpen = true" title="Settings">⚙</button>
        </div>
      </header>

      <div :class="$style.body">
        <DataPanel
          v-model:dataBlocks="dataBlocks"
          v-model:configJson="configJson"
          v-model:form="form"
          :fields="jiraScheme.fields"
          @status="onStatus"
        />
        <IssueForm
          v-model:form="form"
          v-model:clearAfterSubmit="clearAfterSubmit"
          v-model:fieldOrder="fieldOrder"
          :fields="jiraScheme.fields"
          :visibleFields="visibleFields"
          :status="status"
          @submit="submitTicket"
          @reset="resetForm"
        />
      </div>
    </template>
  </main>
</template>

<style module>
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
</style>
