<script setup lang="ts">
const login = defineModel<string>('login')
const token = defineModel<string>('token')
const requestLink = defineModel<string>('requestLink')
const baseUrl = defineModel<string>('baseUrl')
const visibleFields = defineModel<Record<string, boolean>>('visibleFields')
const clearAfterSubmit = defineModel<boolean>('clearAfterSubmit')

import type { JiraField } from '../services/jiraTypes'

defineProps<{
    fields: JiraField[]
    schemePreview?: string
}>()

defineEmits<{
    loadSchema: []
    close: []
}>()

function isFieldVisible(key: string): boolean {
    return visibleFields.value?.[key] !== false
}

function toggleField(key: string) {
    const current = visibleFields.value ?? {}
    visibleFields.value = { ...current, [key]: !isFieldVisible(key) }
}
</script>

<template>
    <div class="settings">
        <header class="settings-header">
            <h2>Settings</h2>
            <button class="close-btn" @click="$emit('close')">✕</button>
        </header>

        <section>
            <h3>Connection</h3>
            <input v-model="login" type="text" placeholder="email" />
            <input v-model="token" type="text" placeholder="api token" />
            <input v-model="requestLink" type="text" placeholder="schema URL (createmeta)" />
            <input v-model="baseUrl" type="text" placeholder="baseUrl (https://...)" />
            <button class="primary" @click="$emit('loadSchema')">Load schema</button>
        </section>

        <section v-if="fields.length">
            <h3>Visible fields</h3>
            <ul class="checklist">
                <li v-for="field in fields" :key="field.key">
                    <label>
                        <input
                            type="checkbox"
                            :checked="isFieldVisible(field.key)"
                            @change="toggleField(field.key)"
                        />
                        <span class="name">
                            {{ field.name }}
                            <span v-if="field.required" class="required">*</span>
                        </span>
                        <span class="key">{{ field.key }}</span>
                    </label>
                </li>
            </ul>
        </section>

        <section>
            <h3>After creating an issue</h3>
            <label class="row">
                <input type="checkbox" v-model="clearAfterSubmit" />
                Clear the form and pasted data
            </label>
        </section>

        <details v-if="schemePreview" class="debug">
            <summary>Schema (debug)</summary>
            <textarea readonly :value="schemePreview" rows="10" class="code"></textarea>
        </details>

        <button class="primary save-btn" @click="$emit('close')">Save and close</button>
    </div>
</template>

<style scoped>
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

.debug textarea {
    width: 100%;
    margin-top: 8px;
    box-sizing: border-box;
    resize: vertical;
}

.settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.close-btn {
    background: transparent;
    color: inherit;
    border: 0;
    font-size: 1.2rem;
    cursor: pointer;
}

section {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

h2, h3 { margin: 0; }
h3 { font-size: 1rem; opacity: 0.85; }

input, textarea {
    padding: 8px 10px;
    border: 1px solid color-mix(in srgb, CanvasText 30%, transparent);
    border-radius: 6px;
    background: Field;
    color: FieldText;
    font-size: 14px;
}

.code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 13px;
    white-space: pre;
}

.checklist {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 240px;
    overflow-y: auto;
    border: 1px solid color-mix(in srgb, CanvasText 20%, transparent);
    border-radius: 6px;
    padding: 8px;
}

.checklist label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
}

.name { flex-grow: 1; }
.required { color: red; }
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

button {
    font: inherit;
    padding: 8px 16px;
    border: 0;
    border-radius: 6px;
    background: color-mix(in srgb, CanvasText 15%, transparent);
    color: inherit;
    cursor: pointer;
}

button.primary {
    background: AccentColor;
    color: AccentColorText;
}

button:hover {
    filter: brightness(1.05);
}

.save-btn {
    margin-top: 8px;
}
</style>
