<script setup lang="ts">
defineProps<{
    name?: string
    required?: boolean
}>()

const value = defineModel<string>({ default: '' })
</script>

<template>
    <div class="date-picker">
        <p class="title">
            {{ name }}<span class="required" v-if="required">*</span>
        </p>
        <input v-model="value" type="date" />
    </div>
</template>

<style scoped>
.date-picker { display: flex; flex-direction: column; gap: 1px; }
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
