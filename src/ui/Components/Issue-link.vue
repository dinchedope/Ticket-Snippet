<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
    name?: string
    required?: boolean
    multiple?: boolean
}>()

const value = defineModel<string | string[]>()

const text = computed({
    get: () => {
        const v = value.value
        if (Array.isArray(v)) return v.join(', ')
        return v ?? ''
    },
    set: (v: string) => {
        if (props.multiple) {
            value.value = v.split(',').map(s => s.trim()).filter(Boolean)
        } else {
            value.value = v
        }
    }
})
</script>

<template>
    <div class="issue-link">
        <p class="title">
            {{ name }}<span class="required" v-if="required">*</span>
        </p>
        <input
            v-model="text"
            type="text"
            :placeholder="multiple ? 'TEST-1, TEST-2' : 'TEST-123'"
        />
    </div>
</template>

<style scoped>
.issue-link { display: flex; flex-direction: column; gap: 1px; }
.title { margin: 0; font-size: 0.78rem; color: inherit; }
.required { color: red; margin-left: 2px; }
input {
    width: 100%;
    box-sizing: border-box;
    font-size: 14px;
    padding: 5px 8px;
    border: 1px solid color-mix(in srgb, CanvasText 30%, transparent);
    border-radius: 6px;
    background: Field;
    color: FieldText;
}
</style>
