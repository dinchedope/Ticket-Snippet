<script setup lang="ts">
import { computed } from 'vue'
import { getUiFieldType } from '../services/fieldUtils'
import type { JiraField } from '../services/jiraTypes'

const form = defineModel<Record<string, any>>('form', { required: true })
const clearAfterSubmit = defineModel<boolean>('clearAfterSubmit', { default: false })

const props = defineProps<{
    fields: JiraField[]
    visibleFields: Record<string, boolean>
    status: {
        kind: 'idle' | 'ok' | 'error'
        message: string
        link?: { url: string; label: string }
    }
}>()

defineEmits<{
    submit: []
    reset: []
}>()

const renderedFields = computed(() =>
    (props.fields ?? [])
        .filter(field => props.visibleFields?.[field.key] !== false)
        .map(field => ({ field, ui: getUiFieldType(field) }))
        .filter(item => item.ui !== null)
)
</script>

<template>
    <section class="right-panel">
        <div class="form-scroll">
            <p v-if="!fields.length" class="empty">Click “Load schema” above</p>

            <div
                v-for="{ field, ui } in renderedFields"
                :key="field.key"
                class="field-row"
            >
                <span class="field-key mono">{{ field.key }}</span>
                <component
                    :is="ui!.component"
                    v-bind="ui!.props"
                    v-model="form[field.key]"
                />
            </div>
        </div>

        <footer class="right-footer">
            <button
                v-if="renderedFields.length"
                class="btn btn--primary"
                @click="$emit('submit')"
            >
                Create issue
            </button>

            <details v-if="renderedFields.length" class="actions-menu">
                <summary class="actions-trigger" title="More actions">⋯</summary>
                <div class="actions-panel">
                    <button class="btn actions-item" @click="$emit('reset')">Reset form</button>
                    <label class="actions-row">
                        <input type="checkbox" v-model="clearAfterSubmit" />
                        Reset after create
                    </label>
                </div>
            </details>

            <p
                v-if="status.message"
                class="status"
                :class="{ 'status--error': status.kind === 'error', 'status--ok': status.kind === 'ok' }"
            >
                {{ status.message }}
                <a
                    v-if="status.link"
                    :href="status.link.url"
                    target="_blank"
                    rel="noopener"
                    class="status-link"
                >
                    {{ status.link.label }}
                </a>
            </p>
        </footer>
    </section>
</template>

<style scoped>
.right-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    width: 500px;
}

.form-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 8px 14px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.field-row {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 4px 8px;
    border-radius: 6px;
    transition: background 120ms;
}

.field-row:hover {
    background: color-mix(in srgb, CanvasText 4%, transparent);
}

.field-row:focus-within {
    background: color-mix(in srgb, AccentColor 6%, transparent);
}

.field-key {
    font-size: 0.68rem;
    line-height: 1.2;
    color: color-mix(in srgb, CanvasText 45%, transparent);
    margin-bottom: 1px;
}

.empty {
    margin: 0;
    font-size: 0.9rem;
    color: color-mix(in srgb, CanvasText 60%, transparent);
    text-align: center;
    padding: 32px 16px;
}

.right-footer {
    flex-shrink: 0;
    padding: 10px 14px;
    border-top: 1px solid color-mix(in srgb, CanvasText 15%, transparent);
    display: flex;
    align-items: center;
    gap: 10px;
    background: color-mix(in srgb, Canvas 95%, CanvasText);
    position: relative;
}

.status {
    margin: 0;
    font-size: 0.85rem;
    color: color-mix(in srgb, CanvasText 70%, transparent);
    flex: 1;
    min-width: 0;
    word-break: break-word;
}

.status--ok { color: #2a9d2a; }
.status--error { color: #d33; }

.status-link {
    color: inherit;
    text-decoration: underline;
    font-weight: 600;
    margin-left: 4px;
}

.actions-menu {
    position: relative;
}

.actions-trigger {
    list-style: none;
    cursor: pointer;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 1rem;
    line-height: 1;
    user-select: none;
    background: color-mix(in srgb, CanvasText 10%, transparent);
}

.actions-trigger::-webkit-details-marker {
    display: none;
}

.actions-trigger:hover {
    background: color-mix(in srgb, CanvasText 16%, transparent);
}

.actions-panel {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 0;
    background: Canvas;
    border: 1px solid color-mix(in srgb, CanvasText 20%, transparent);
    border-radius: 8px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 180px;
    box-shadow: 0 4px 12px color-mix(in srgb, CanvasText 12%, transparent);
    z-index: 10;
}

.actions-item {
    text-align: left;
    font-size: 0.85rem;
}

.actions-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    cursor: pointer;
}
</style>
