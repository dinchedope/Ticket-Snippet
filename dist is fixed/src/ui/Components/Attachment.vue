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
        <p v-if="files.length" class="hint">{{ files.length }} file(s)</p>
    </div>
</template>

<style scoped>
.attachment { display: flex; flex-direction: column; gap: 2px; }
.title { margin: 0; font-size: 0.85rem; color: inherit; }
.required { color: red; margin-left: 2px; }
.hint { margin: 0; font-size: 0.75rem; color: color-mix(in srgb, CanvasText 70%, transparent); }
input[type="file"] {
    width: 100%;
    box-sizing: border-box;
    font-size: 13px;
    color: FieldText;
}
</style>
