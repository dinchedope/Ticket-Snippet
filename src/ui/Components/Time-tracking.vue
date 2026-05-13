<script setup lang="ts">
import { computed } from 'vue'

defineProps<{
    name?: string
    required?: boolean
}>()

interface TimeTrackingValue {
    originalEstimate?: string
    remainingEstimate?: string
}

const value = defineModel<TimeTrackingValue>({ default: () => ({}) })

const originalEstimate = computed({
    get: () => value.value?.originalEstimate ?? '',
    set: (v: string) => (value.value = { ...value.value, originalEstimate: v })
})
const remainingEstimate = computed({
    get: () => value.value?.remainingEstimate ?? '',
    set: (v: string) => (value.value = { ...value.value, remainingEstimate: v })
})
</script>

<template>
    <div class="time-tracking">
        <p class="title">
            {{ name }}<span class="required" v-if="required">*</span>
        </p>
        <label class="sub-label">Original estimate</label>
        <input v-model="originalEstimate" type="text" placeholder="2d 4h" />
        <label class="sub-label">Remaining estimate</label>
        <input v-model="remainingEstimate" type="text" placeholder="1d 2h" />
    </div>
</template>

<style scoped>
.time-tracking { display: flex; flex-direction: column; gap: 1px; }
.title { margin: 0; font-size: 0.78rem; color: inherit; }
.required { color: red; margin-left: 2px; }
.sub-label { font-size: 0.75rem; color: color-mix(in srgb, CanvasText 70%, transparent); }
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
