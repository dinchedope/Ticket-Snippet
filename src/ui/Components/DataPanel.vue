<script setup lang="ts">
import { computed } from 'vue'
import {
    parseTsvData,
    applyConfigToForm,
    type Config,
    type DataMap,
    type DataBlock,
} from '../services/configMapping'
import type { JiraField } from '../services/jiraTypes'

const dataBlocks = defineModel<DataBlock[]>('dataBlocks', { required: true })
const configJson = defineModel<string>('configJson', { required: true })
const form = defineModel<Record<string, any>>('form', { required: true })

const props = defineProps<{
    fields: JiraField[]
}>()

const emit = defineEmits<{
    status: [{ kind: 'ok' | 'error'; message: string }]
}>()

function blockName(id: number): string {
    return `internal${id}`
}

function nextBlockId(): number {
    return dataBlocks.value.reduce((max, b) => Math.max(max, b.id), 0) + 1
}

/** Parsed data blocks for the live preview. */
const parsedBlocks = computed(() =>
    dataBlocks.value.map(b => ({ id: b.id, parsed: parseTsvData(b.raw) }))
)

function addDataBlock() {
    dataBlocks.value = [...dataBlocks.value, { id: nextBlockId(), raw: '' }]
}

function removeDataBlock(id: number) {
    const next = dataBlocks.value.filter(b => b.id !== id)
    dataBlocks.value = next.length ? next : [{ id: 1, raw: '' }]
}

function buildDataMap(): DataMap {
    const map: DataMap = {}
    for (const b of dataBlocks.value) map[blockName(b.id)] = parseTsvData(b.raw)
    return map
}

function applyConfig() {
    try {
        const dataMap = buildDataMap()
        const config: Config = configJson.value.trim() ? JSON.parse(configJson.value) : {}
        form.value = applyConfigToForm(form.value, config, dataMap, props.fields ?? [])
        emit('status', { kind: 'ok', message: 'Config applied' })
    } catch (e: any) {
        emit('status', { kind: 'error', message: 'Config error: ' + (e?.message ?? String(e)) })
    }
}
</script>

<template>
    <aside class="left-panel">
        <div class="data-blocks">
            <div v-for="(block, i) in dataBlocks" :key="block.id" class="data-block">
                <div class="data-block-head">
                    <span class="data-name mono">{{ blockName(block.id) }}</span>
                    <button
                        v-if="dataBlocks.length > 1"
                        class="icon-btn"
                        title="Remove"
                        @click="removeDataBlock(block.id)"
                    >✕</button>
                </div>
                <textarea
                    v-model="dataBlocks[i].raw"
                    class="mini-area mono"
                    rows="2"
                    placeholder="paste a data row (TSV: headers + values)"
                ></textarea>
                <div class="parsed-box">
                    <template v-if="Object.keys(parsedBlocks[i].parsed).length">
                        <div
                            v-for="(val, k) in parsedBlocks[i].parsed"
                            :key="k"
                            class="parsed-row"
                        >
                            <span class="parsed-key mono">{{ k }}</span>
                            <span class="parsed-val">{{ val }}</span>
                        </div>
                    </template>
                    <span v-else class="parsed-empty">— empty —</span>
                </div>
            </div>
            <button class="btn btn--ghost add-btn" @click="addDataBlock">+ Add data block</button>
        </div>

        <label class="sub-label">Config (JSON)</label>
        <textarea
            v-model="configJson"
            class="config-area mono"
            placeholder='{
  "summary": { "type": "internal1", "value": "Entry No." },
  "priority": { "type": "jira", "valueIsId": false, "value": "Medium" },
  "issuetype": {
    "type": "jira", "valueIsId": true, "default": "10002",
    "value": {
      "source": { "type": "internal1", "value": "Source Type" },
      "10000": ["Order Picking", "Order Prepicking"],
      "10001": ["Order Packing"]
    }
  }
}'
        ></textarea>

        <button class="btn btn--primary" @click="applyConfig">Apply config</button>
    </aside>
</template>

<style scoped>
.left-panel {
    width: 40%;
    min-width: 280px;
    display: flex;
    flex-direction: column;
    padding: 12px;
    gap: 10px;
    border-right: 1px solid color-mix(in srgb, CanvasText 15%, transparent);
    flex-shrink: 0;
    overflow-y: auto;
}

.data-blocks {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.data-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
    border: 1px solid color-mix(in srgb, CanvasText 18%, transparent);
    border-radius: 8px;
    padding: 8px;
}

.data-block-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.data-name {
    font-size: 0.8rem;
    font-weight: 600;
    color: AccentColor;
}

.icon-btn {
    background: transparent;
    border: 0;
    color: color-mix(in srgb, CanvasText 60%, transparent);
    cursor: pointer;
    font-size: 0.85rem;
    padding: 2px 6px;
    border-radius: 4px;
}

.icon-btn:hover {
    background: color-mix(in srgb, CanvasText 12%, transparent);
    color: #d33;
}

.mini-area {
    resize: vertical;
    font-size: 12px;
    white-space: pre;
    min-height: 38px;
}

.parsed-box {
    max-height: 130px;
    overflow-y: auto;
    border: 1px dashed color-mix(in srgb, CanvasText 20%, transparent);
    border-radius: 6px;
    padding: 6px 8px;
    background: color-mix(in srgb, Canvas 92%, CanvasText);
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.parsed-row {
    display: flex;
    gap: 8px;
    font-size: 11px;
    line-height: 1.4;
}

.parsed-key {
    flex-shrink: 0;
    min-width: 90px;
    max-width: 130px;
    color: color-mix(in srgb, CanvasText 55%, transparent);
    word-break: break-all;
}

.parsed-val {
    flex: 1;
    min-width: 0;
    word-break: break-word;
}

.parsed-empty {
    font-size: 11px;
    color: color-mix(in srgb, CanvasText 50%, transparent);
}

.add-btn {
    align-self: flex-start;
    font-size: 0.85rem;
    padding: 5px 10px;
}

.config-area {
    min-height: 140px;
    resize: vertical;
    font-size: 13px;
    white-space: pre;
}

.sub-label {
    font-size: 0.8rem;
    color: color-mix(in srgb, CanvasText 70%, transparent);
}
</style>
