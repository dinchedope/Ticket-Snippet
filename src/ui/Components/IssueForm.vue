<script setup lang="ts">
import { computed } from 'vue'
import { getUiFieldType } from '../services/fieldUtils'
import type { JiraField } from '../services/jiraTypes'

const form = defineModel<Record<string, any>>('form', { required: true })

const props = defineProps<{
    fields: JiraField[]
    visibleFields: Record<string, boolean>
    status: { kind: 'idle' | 'ok' | 'error'; message: string }
}>()

defineEmits<{
    submit: []
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
            <p
                v-if="status.message"
                class="status"
                :class="{ 'status--error': status.kind === 'error', 'status--ok': status.kind === 'ok' }"
            >
                {{ status.message }}
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
}

.form-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.field-row {
    display: flex;
    flex-direction: column;
    gap: 1px;
}

.field-key {
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

.right-footer {
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

.status--ok { color: #2a9d2a; }
.status--error { color: #d33; }
</style>
