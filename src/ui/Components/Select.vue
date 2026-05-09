<script setup lang="ts">
defineProps<{
    name?: string
    required?: boolean
    options: any[]
}>()

const value = defineModel<string>({ default: '' })

function getLabel(opt: any) {
    return opt.value ?? opt.name ?? String(opt.id ?? '')
}
function getValue(opt: any) {
    return String(opt.id ?? opt.value ?? '')
}
</script>

<template>
    <div class="select-field">
        <p class="title">
            {{ name }}<span class="required" v-if="required">*</span>
        </p>
        <select v-model="value">
            <option value="">—</option>
            <option
                v-for="opt in options"
                :key="getValue(opt)"
                :value="getValue(opt)"
            >
                {{ getLabel(opt) }}
            </option>
        </select>
    </div>
</template>

<style scoped>
.select-field { display: flex; flex-direction: column; gap: 4px; }
.title { margin: 0; color: #fff; }
.required { color: red; margin-left: 2px; }
select {
    min-width: 300px;
    font-size: 16px;
    padding: 8px 10px;
    border: 1px solid color-mix(in srgb, CanvasText 30%, transparent);
    border-radius: 6px;
    background: Field;
    color: FieldText;
}
</style>
