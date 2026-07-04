<script setup lang="ts">
import { computed } from 'vue'

defineProps<{
    name?: string
    required?: boolean
}>()

const value = defineModel<string[]>({ default: () => [] })

const text = computed({
    get: () => value.value.join(', '),
    set: (v: string) => {
        value.value = v.split(',').map(s => s.trim()).filter(Boolean)
    }
})
</script>

<template>
    <div class="labels">
        <p class="title">
            {{ name }}<span class="required" v-if="required">*</span>
        </p>
        <input
            v-model="text"
            type="text"
            placeholder="bug, frontend, urgent"
        />
        <p v-if="value.length" class="hint">{{ value.length }} label(s)</p>
    </div>
</template>

<style scoped>
.labels { display: flex; flex-direction: column; gap: 2px; }
.title { margin: 0; font-size: 0.85rem; color: inherit; }
.required { color: red; margin-left: 2px; }
.hint { margin: 0; font-size: 0.75rem; color: color-mix(in srgb, CanvasText 70%, transparent); }
input {
    width: 100%;
    box-sizing: border-box;
    font-size: 14px;
    padding: 6px 8px;
    border: 1px solid color-mix(in srgb, CanvasText 30%, transparent);
    border-radius: 6px;
    background: Field;
    color: FieldText;
}
</style>
