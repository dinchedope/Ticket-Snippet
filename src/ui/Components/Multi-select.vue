<script setup lang="ts">
import type { JiraAllowedValue } from '../services/jiraTypes'

defineProps<{
    name?: string
    required?: boolean
    options: JiraAllowedValue[]
}>()

const value = defineModel<string[]>({ default: () => [] })

function getLabel(opt: JiraAllowedValue) {
    return opt.value ?? opt.name ?? String(opt.id ?? '')
}

function getValue(opt: JiraAllowedValue): string {
    return String(opt.id ?? opt.value ?? '')
}

function isChecked(id: string): boolean {
    return (value.value ?? []).includes(id)
}

function toggle(id: string) {
    const cur = value.value ?? []
    value.value = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]
}
</script>

<template>
    <div class="multi-select">
        <p class="title">
            {{ name }}<span class="required" v-if="required">*</span>
        </p>
        <div class="options">
            <label v-for="opt in options" :key="getValue(opt)" class="opt">
                <input
                    type="checkbox"
                    :checked="isChecked(getValue(opt))"
                    @change="toggle(getValue(opt))"
                />
                <span>{{ getLabel(opt) }} ({{ getValue(opt) }})</span>
            </label>
            <span v-if="!options.length" class="empty">— no options —</span>
        </div>
    </div>
</template>

<style scoped>
.multi-select {
    display: flex;
    flex-direction: column;
    gap: 1px;
}

.title {
    margin: 0;
    font-size: 0.78rem;
    color: inherit;
}

.required {
    color: red;
    margin-left: 2px;
}

.options {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 4px 8px;
    border: 1px solid color-mix(in srgb, CanvasText 25%, transparent);
    border-radius: 6px;
    background: Field;
    color: FieldText;
    max-height: 180px;
    overflow-y: auto;
}

.opt {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    font-size: 13px;
}

.opt input {
    width: auto;
}

.empty {
    font-size: 12px;
    color: color-mix(in srgb, CanvasText 50%, transparent);
}
</style>
