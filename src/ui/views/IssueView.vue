<script setup lang="ts">
  import { computed, ref, onMounted } from 'vue'
  import { useIssue, humanizeRaw } from '../store/useIssue'
  import { adfToText } from '../services/adf'
  import { getUiFieldType } from './fieldRegistry'

  /** Возврат на главную обрабатывает App.vue. */
  defineEmits<{
    back: []
  }>()

  const issue = useIssue()

  // Пользовательские кнопки хранятся в chrome.storage — подтягиваем при открытии.
  onMounted(() => {
    issue.hydrate()
  })

  /** Текущий статус тикета (из воркфлоу). */
  const currentStatus = computed(() => issue.issue.value?.fields?.status?.name ?? '—')

  /** Быстрый доступ к описанию редактируемого поля по его key. */
  const editableByKey = computed(() => {
    const map: Record<string, any> = {}
    for (const f of issue.editableFields.value) map[f.key] = f
    return map
  })

  /** Есть ли у значения содержимое (чтобы не показывать пустые поля). */
  function notEmpty(v: any): boolean {
    return v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)
  }

  /**
   * Список строк-полей: объединяем заполненные поля тикета и редактируемые поля
   * (даже пустые — чтобы их можно было заполнить). Поле comment исключаем — оно
   * показывается отдельным блоком внизу.
   */
  const fieldRows = computed(() => {
    const data = issue.issue.value
    if (!data) return []

    const keys: string[] = []
    const seen = new Set<string>()
    const add = (k: string) => {
      if (k !== 'comment' && !seen.has(k)) {
        seen.add(k)
        keys.push(k)
      }
    }
    // сначала заполненные поля тикета
    for (const [k, v] of Object.entries(data.fields ?? {})) if (notEmpty(v)) add(k)
    // затем редактируемые поля (в т.ч. пустые)
    for (const f of issue.editableFields.value) add(f.key)

    return keys.map((key) => {
      const field = editableByKey.value[key]
      const ui = field ? getUiFieldType(field) : null
      return {
        key,
        name: issue.fieldNames.value[key] ?? key,
        value: humanizeRaw(data.fields?.[key]),
        field,
        ui, // не null → поле редактируемо
      }
    })
  })

  /** Форматирует дату комментария. */
  function formatDate(iso: string): string {
    if (!iso) return ''
    const d = new Date(iso)
    return isNaN(d.getTime()) ? iso : d.toLocaleString('ru-RU')
  }

  // --- Локальная форма создания пользовательской кнопки ---
  const newBtnLabel = ref('')
  const newBtnTransition = ref('')
  const newBtnComment = ref('')

  /** Текстовое описание, что сделает кнопка: переход и/или комментарий. */
  function buttonDescription(btn: { transitionName?: string; comment?: string }): string {
    const parts: string[] = []
    if (btn.transitionName?.trim()) parts.push(`переход → ${btn.transitionName.trim()}`)
    if (btn.comment?.trim()) parts.push(`коммент: «${btn.comment.trim()}»`)
    return parts.length ? parts.join(' · ') : 'ничего не делает'
  }

  function saveButton() {
    if (!newBtnLabel.value.trim()) return
    issue.addButton({
      label: newBtnLabel.value.trim(),
      transitionName: newBtnTransition.value.trim() || undefined,
      comment: newBtnComment.value.trim() || undefined,
    })
    newBtnLabel.value = ''
    newBtnTransition.value = ''
    newBtnComment.value = ''
  }
</script>

<template>
  <main :class="$style.page">
    <header :class="$style.topbar">
      <button class="btn btn-ghost" @click="$emit('back')" title="Назад">← Назад</button>
      <input
        v-model="issue.issueKey.value"
        :class="$style.keyInput"
        type="text"
        placeholder="PROJ-123"
        @keyup.enter="issue.openIssue"
      />
      <button class="btn btn-primary" @click="issue.openIssue">Открыть</button>
    </header>

    <div :class="$style.scroll">
      <p v-if="!issue.issue.value" :class="$style.empty">
        Введите ключ тикета и нажмите «Открыть»
      </p>

      <template v-else>
        <!-- Заголовок тикета -->
        <div :class="$style.issueHead">
          <span :class="$style.issueKey">{{ issue.issue.value.key }}</span>
          <span :class="$style.issueSummary">{{ issue.issue.value.fields.summary }}</span>
        </div>

        <!-- Воркфлоу: текущий статус и доступные переходы -->
        <section :class="$style.card">
          <div :class="$style.workflowHead">
            <span :class="$style.subLabel">Статус</span>
            <span :class="$style.statusBadge">{{ currentStatus }}</span>
          </div>
          <div v-if="issue.transitions.value.length" :class="$style.chips">
            <button
              v-for="t in issue.transitions.value"
              :key="t.id"
              class="btn"
              :class="$style.chip"
              @click="issue.changeStatus(t.id)"
            >
              {{ t.name }}
              <span v-if="t.to?.name" :class="$style.chipTo">→ {{ t.to.name }}</span>
            </button>
          </div>
          <p v-else :class="$style.subLabel">Нет доступных переходов</p>
        </section>

        <!-- Пользовательские кнопки-действия -->
        <section :class="$style.card">
          <span :class="$style.subLabel">Действия</span>
          <div v-if="issue.customButtons.value.length" :class="$style.customList">
            <div v-for="btn in issue.customButtons.value" :key="btn.id" :class="$style.customBtn">
              <div :class="$style.customBtnHead">
                <button class="btn btn-primary" :class="$style.chip" @click="issue.runButton(btn)">
                  {{ btn.label }}
                </button>
                <button
                  :class="$style.delBtn"
                  title="Удалить кнопку"
                  @click="issue.removeButton(btn.id)"
                >✕</button>
              </div>
              <span :class="$style.customBtnDesc">{{ buttonDescription(btn) }}</span>
            </div>
          </div>

          <details :class="$style.addBtnForm">
            <summary :class="$style.subLabel">+ Добавить кнопку</summary>
            <div :class="$style.addBtnFields">
              <input v-model="newBtnLabel" :class="$style.input" placeholder="Название, напр. Resolve" />
              <select v-model="newBtnTransition" :class="$style.input">
                <option value="">— без перехода воркфлоу —</option>
                <option v-for="t in issue.transitions.value" :key="t.id" :value="t.name">
                  Перейти в: {{ t.name }}
                </option>
              </select>
              <textarea
                v-model="newBtnComment"
                :class="$style.input"
                rows="2"
                placeholder="Автокомментарий, напр. box is sent to packing"
              ></textarea>
              <button class="btn btn-primary" :class="$style.addBtnSubmit" @click="saveButton">
                Создать кнопку
              </button>
            </div>
          </details>
        </section>

        <!-- Поля: просмотр + переключатель редактирования у каждого редактируемого -->
        <section :class="$style.fields">
          <div v-for="row in fieldRows" :key="row.key" :class="$style.fieldRow">
            <div :class="$style.fieldHead">
              <span :class="$style.fieldName">{{ row.name }}</span>
              <button
                v-if="row.ui && !issue.isEditing(row.key)"
                :class="$style.editToggle"
                title="Редактировать"
                @click="issue.startEdit(row.key)"
              >✎</button>
            </div>

            <template v-if="row.ui && issue.isEditing(row.key)">
              <component
                :is="row.ui.component"
                v-bind="row.ui.props"
                v-model="issue.form.value[row.key]"
              />
              <div :class="$style.fieldActions">
                <button class="btn btn-primary" :class="$style.smallBtn" @click="issue.saveField(row.key)">
                  Сохранить
                </button>
                <button class="btn" :class="$style.smallBtn" @click="issue.cancelEdit(row.key)">
                  Отмена
                </button>
              </div>
            </template>
            <span v-else :class="$style.fieldValue">{{ row.value }}</span>
          </div>
        </section>

        <!-- Комментарии — всегда внизу страницы -->
        <section :class="$style.comments">
          <h3 :class="$style.commentsTitle">Комментарии</h3>

          <div v-if="issue.comments.value.length" :class="$style.commentList">
            <div v-for="c in issue.comments.value" :key="c.id" :class="$style.comment">
              <div :class="$style.commentMeta">
                <span :class="$style.commentAuthor">{{ c.author?.displayName ?? 'Кто-то' }}</span>
                <span :class="$style.commentDate">{{ formatDate(c.created) }}</span>
              </div>
              <div :class="$style.commentBody">{{ adfToText(c.body).trim() }}</div>
            </div>
          </div>
          <p v-else :class="$style.subLabel">Комментариев пока нет</p>

          <textarea
            v-model="issue.newComment.value"
            :class="$style.commentInput"
            rows="3"
            placeholder="Написать комментарий..."
          ></textarea>
          <button class="btn btn-primary" :class="$style.commentSubmit" @click="issue.addComment">
            Добавить комментарий
          </button>
        </section>
      </template>
    </div>

    <footer :class="$style.footer">
      <p
        v-if="issue.status.value.message"
        class="status"
        :class="{
          'status-ok': issue.status.value.kind === 'ok',
          'status-error': issue.status.value.kind === 'error',
        }"
      >
        {{ issue.status.value.message }}
      </p>
    </footer>
  </main>
</template>

<style module>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid color-mix(in srgb, CanvasText 15%, transparent);
  flex-shrink: 0;
}

.keyInput {
  flex: 1;
  max-width: 220px;
  padding: 6px 10px;
  border: 1px solid color-mix(in srgb, CanvasText 30%, transparent);
  border-radius: 6px;
  background: Field;
  color: FieldText;
  font-size: 14px;
}

.scroll {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty {
  margin: 0;
  font-size: 0.9rem;
  color: color-mix(in srgb, CanvasText 60%, transparent);
  text-align: center;
  padding: 32px 16px;
}

.issueHead {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.issueKey {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 600;
  color: AccentColor;
}

.issueSummary {
  font-size: 1.05rem;
  font-weight: 600;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid color-mix(in srgb, CanvasText 15%, transparent);
  border-radius: 8px;
}

.workflowHead {
  display: flex;
  align-items: center;
  gap: 10px;
}

.statusBadge {
  padding: 2px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, AccentColor 20%, transparent);
  font-size: 0.85rem;
  font-weight: 600;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.chip {
  font-size: 0.85rem;
}

.chipTo {
  opacity: 0.7;
  margin-left: 4px;
}

.customList {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.customBtn {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, CanvasText 15%, transparent);
  border-radius: 8px;
}

.customBtnHead {
  display: flex;
  align-items: center;
  gap: 2px;
}

.customBtnDesc {
  font-size: 0.75rem;
  color: color-mix(in srgb, CanvasText 55%, transparent);
  max-width: 260px;
  word-break: break-word;
}

.delBtn {
  background: transparent;
  border: 0;
  color: color-mix(in srgb, CanvasText 55%, transparent);
  cursor: pointer;
  font-size: 0.75rem;
  padding: 2px 4px;
  border-radius: 4px;
}

.delBtn:hover {
  background: color-mix(in srgb, CanvasText 12%, transparent);
  color: #d33;
}

.addBtnForm summary {
  cursor: pointer;
}

.addBtnFields {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  max-width: 420px;
}

.addBtnSubmit {
  align-self: flex-start;
}

.input {
  padding: 6px 10px;
  border: 1px solid color-mix(in srgb, CanvasText 30%, transparent);
  border-radius: 6px;
  background: Field;
  color: FieldText;
  font-size: 14px;
  box-sizing: border-box;
  width: 100%;
}

.fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fieldRow {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 10px;
  border-bottom: 1px solid color-mix(in srgb, CanvasText 10%, transparent);
}

.fieldHead {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fieldName {
  font-size: 0.85rem;
  color: color-mix(in srgb, CanvasText 60%, transparent);
}

.editToggle {
  background: transparent;
  border: 0;
  color: color-mix(in srgb, CanvasText 55%, transparent);
  cursor: pointer;
  font-size: 0.85rem;
  padding: 2px 6px;
  border-radius: 4px;
}

.editToggle:hover {
  background: color-mix(in srgb, CanvasText 12%, transparent);
  color: AccentColor;
}

.fieldValue {
  font-size: 0.95rem;
  white-space: pre-wrap;
  word-break: break-word;
}

.fieldActions {
  display: flex;
  gap: 8px;
}

.smallBtn {
  font-size: 0.85rem;
  padding: 5px 12px;
}

.comments {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid color-mix(in srgb, CanvasText 15%, transparent);
  border-radius: 8px;
}

.commentsTitle {
  margin: 0;
  font-size: 1rem;
}

.commentList {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.comment {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 6px;
  background: color-mix(in srgb, Canvas 92%, CanvasText);
}

.commentMeta {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.commentAuthor {
  font-weight: 600;
  font-size: 0.85rem;
}

.commentDate {
  font-size: 0.75rem;
  color: color-mix(in srgb, CanvasText 55%, transparent);
}

.commentBody {
  font-size: 0.9rem;
  white-space: pre-wrap;
  word-break: break-word;
}

.commentInput {
  resize: vertical;
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, CanvasText 30%, transparent);
  border-radius: 6px;
  background: Field;
  color: FieldText;
  font-size: 14px;
  box-sizing: border-box;
  width: 100%;
}

.commentSubmit {
  align-self: flex-start;
}

.subLabel {
  font-size: 0.8rem;
  color: color-mix(in srgb, CanvasText 70%, transparent);
  margin: 0;
}

.footer {
  flex-shrink: 0;
  padding: 12px 16px;
  border-top: 1px solid color-mix(in srgb, CanvasText 15%, transparent);
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 20px;
  background: color-mix(in srgb, Canvas 95%, CanvasText);
}

.footer .status {
  flex: 1;
}
</style>
