<script setup lang="ts">
    defineProps<{
        name?: string
        required?: boolean
    }>()

    const value = defineModel<string>({ default: '' })
</script>

<template>
    <div class="text-area">
        <p class="title">
            {{ name }}<span class="required" v-if="required">*</span>
        </p>
        <textarea
            v-model="value"
            rows="4"
        />
    </div>
</template>

<style scoped>
.text-area {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.title {
    margin: 0;
    color: #fff;
}

.required {
    color: red;
    margin-left: 2px;
}

textarea {
    min-width: 300px;
    font-size: 16px;
    padding: 8px 10px;
    border: 1px solid color-mix(in srgb, CanvasText 30%, transparent);
    border-radius: 6px;
    background: Field;
    color: FieldText;
    resize: vertical;
}
</style>
