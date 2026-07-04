<script setup lang="ts">
  import { useAppStore } from '../store/useAppStore'

  const store = useAppStore()
</script>

<template>
  <aside :class="$style.panel">
    <!-- Дата-блоки: вставленные TSV-строки и их предпросмотр -->
    <div :class="$style.dataBlocks">
      <div
        v-for="(block, i) in store.dataBlocks.value"
        :key="block.id"
        :class="$style.dataBlock"
      >
        <div :class="$style.dataBlockHead">
          <span :class="$style.dataName">{{ store.blockName(block.id) }}</span>
          <button
            v-if="store.dataBlocks.value.length > 1"
            :class="$style.iconBtn"
            title="Удалить"
            @click="store.removeDataBlock(block.id)"
          >✕</button>
        </div>
        <textarea
          v-model="store.dataBlocks.value[i].raw"
          :class="$style.miniArea"
          rows="2"
          placeholder="вставьте строку данных (TSV: заголовки + значения)"
        ></textarea>
        <div :class="$style.parsedBox">
          <template v-if="Object.keys(store.parsedBlocks.value[i].parsed).length">
            <div
              v-for="(val, k) in store.parsedBlocks.value[i].parsed"
              :key="k"
              :class="$style.parsedRow"
            >
              <span :class="$style.parsedKey">{{ k }}</span>
              <span :class="$style.parsedVal">{{ val }}</span>
            </div>
          </template>
          <span v-else :class="$style.parsedEmpty">— пусто —</span>
        </div>
      </div>
      <button :class="$style.addBtn" @click="store.addDataBlock">+ Добавить данные</button>
    </div>

    <!-- JSON-конфиг маппинга данных на поля формы -->
    <label :class="$style.subLabel">Конфиг (JSON)</label>
    <textarea
      v-model="store.configJson.value"
      :class="$style.configArea"
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

    <button class="btn btn-primary" @click="store.applyConfig">Применить конфиг</button>
  </aside>
</template>

<style module>
.panel {
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

.dataBlocks {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dataBlock {
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px solid color-mix(in srgb, CanvasText 18%, transparent);
  border-radius: 8px;
  padding: 8px;
}

.dataBlockHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dataName {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8rem;
  font-weight: 600;
  color: AccentColor;
}

.iconBtn {
  background: transparent;
  border: 0;
  color: color-mix(in srgb, CanvasText 60%, transparent);
  cursor: pointer;
  font-size: 0.85rem;
  padding: 2px 6px;
  border-radius: 4px;
}

.iconBtn:hover {
  background: color-mix(in srgb, CanvasText 12%, transparent);
  color: #d33;
}

.miniArea {
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  padding: 6px 8px;
  border: 1px solid color-mix(in srgb, CanvasText 25%, transparent);
  border-radius: 6px;
  background: Field;
  color: FieldText;
  white-space: pre;
  box-sizing: border-box;
  width: 100%;
  min-height: 38px;
}

.parsedBox {
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

.parsedRow {
  display: flex;
  gap: 8px;
  font-size: 11px;
  line-height: 1.4;
}

.parsedKey {
  flex-shrink: 0;
  min-width: 90px;
  max-width: 130px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: color-mix(in srgb, CanvasText 55%, transparent);
  word-break: break-all;
}

.parsedVal {
  flex: 1;
  min-width: 0;
  word-break: break-word;
}

.parsedEmpty {
  font-size: 11px;
  color: color-mix(in srgb, CanvasText 50%, transparent);
}

.addBtn {
  align-self: flex-start;
  background: transparent;
  border: 1px dashed color-mix(in srgb, CanvasText 30%, transparent);
  color: inherit;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 5px 10px;
  border-radius: 6px;
}

.addBtn:hover {
  background: color-mix(in srgb, CanvasText 8%, transparent);
}

.subLabel {
  font-size: 0.8rem;
  color: color-mix(in srgb, CanvasText 70%, transparent);
}

.configArea {
  min-height: 140px;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, CanvasText 25%, transparent);
  border-radius: 6px;
  background: Field;
  color: FieldText;
  white-space: pre;
  box-sizing: border-box;
  width: 100%;
}
</style>
