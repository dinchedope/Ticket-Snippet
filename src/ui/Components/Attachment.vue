<script setup lang="ts">
defineProps<{
    name?: string
    required?: boolean
}>()

const files = defineModel<File[]>({ default: () => [] })

function onChange(e: Event) {
    const input = e.target as HTMLInputElement
    files.value = Array.from(input.files ?? [])
}
</script>

<template>
    <div class="attachment">
        <p class="title">
            {{ name }}<span class="required" v-if="required">*</span>
        </p>
        <input type="file" multiple @change="onChange" />
        <p v-if="files.length" class="hint">{{ files.length }} файл(ов)</p>
    </div>
</template>

<style scoped>
.attachment { display: flex; flex-direction: column; gap: 4px; }
.title { margin: 0; color: #fff; }
.required { color: red; margin-left: 2px; }
.hint { margin: 0; font-size: 0.85rem; color: color-mix(in srgb, CanvasText 70%, transparent); }
input[type="file"] {
    min-width: 300px;
    font-size: 14px;
    color: FieldText;
}
</style>
