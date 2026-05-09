<script setup lang="ts">
    import { ref } from 'vue';

    const value = ref("");

    defineProps({
        name: String,
        // value: String,
        required: Boolean
    })
</script>

<template>
    <div class="container">
        <p class="title">{{ name }}<p class="required" v-if="required">*</p></p>
        <TextArea 
            v-model="value"
            type="text" 
        />
    </div>

</template>

<style scoped>
*{
    display: flex;
    padding: 0;
    margin: 0;
}

.container{
    display: flex;
}

.title{
    color: #fff;
}

.required{
    color: red;
}

input{
    min-width: 300px;
    font-size: 16px;
    padding: 8px 10px;
    border: 1px solid color-mix(in srgb, CanvasText 30%, transparent);
    border-radius: 6px;
    background: Field;
    color: FieldText;
}
</style>