<script setup lang="ts">
import { computed, ref } from 'vue'
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

/** Show parsed-preview boxes and the config textarea. When false, only raw inputs are shown. */
const showDetails = ref(true)

function blockName(id: number): string {
    return `internal${id}`
}

/** Picks the smallest positive integer that no existing block uses. Frees deleted ids for reuse. */
function nextBlockId(): number {
    const used = new Set(dataBlocks.value.map(b => b.id))
    let i = 1
    while (used.has(i)) i++
    return i
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
        <div class="panel-head">
            <button
                class="toggle-btn"
                :title="showDetails ? 'Hide preview & config' : 'Show preview & config'"
                @click="showDetails = !showDetails"
            >
                {{ showDetails ? '▾ Details' : '▸ Details' }}
            </button>
        </div>

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
                <div v-if="showDetails" class="parsed-box">
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

        <template v-if="showDetails">
            <label class="sub-label">Config (JSON)</label>
            <textarea
                v-model="configJson"
                class="config-area mono"
                placeholder='{
  "summary": { "type": "internal1", "value": "Entry No." },
  "priority": { "type": "jira", "valueIsId": false, "value": "Medium" }
}'
            ></textarea>
        </template>

        <button class="btn btn--primary" @click="applyConfig">Apply config</button>
    </aside>
</template>

<style scoped>
.left-panel {
    width: 40%;
    min-width: 280px;
    display: flex;
    flex-direction: column;
    padding: 10px 12px;
    gap: 8px;
    border-right: 1px solid color-mix(in srgb, CanvasText 15%, transparent);
    flex-shrink: 0;
    overflow-y: auto;
}

.panel-head {
    display: flex;
    justify-content: flex-end;
}

.toggle-btn {
    background: transparent;
    border: 0;
    color: color-mix(in srgb, CanvasText 75%, transparent);
    cursor: pointer;
    font-size: 0.8rem;
    padding: 2px 8px;
    border-radius: 4px;
}

.toggle-btn:hover {
    background: color-mix(in srgb, CanvasText 8%, transparent);
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
