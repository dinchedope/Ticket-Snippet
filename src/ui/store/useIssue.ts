import { ref } from 'vue'
import { useAppStore } from './useAppStore'
import { persisted } from './persisted'
import { serializeForm } from '../services/serializeForm'
import { adfToText } from '../services/adf'
import {
  fetchIssue,
  fetchEditMeta,
  updateIssue,
  fetchTransitions,
  applyTransition,
  fetchComments,
  postComment,
} from '../services/jiraApi'

/**
 * Состояние и действия страницы «Тикет»: загрузка существующего тикета Jira,
 * просмотр содержимого, редактирование отдельных полей, комментарии, смена
 * статуса (воркфлоу) и пользовательские кнопки-действия.
 *
 * Как и useAppStore — синглтон (состояние на уровне модуля), поэтому при уходе
 * со страницы и возврате открытый тикет сохраняется.
 */

type Status = {
  kind: 'idle' | 'ok' | 'error'
  message: string
}

/** Пользовательская кнопка-действие: может делать переход воркфлоу и/или писать комментарий. */
export interface CustomButton {
  id: number
  label: string // текст на кнопке, напр. "Resolve"
  transitionName?: string // имя перехода воркфлоу (по совпадению имени)
  comment?: string // текст автокомментария
}

// ───────────────────────────────────────────────────────────
// Состояние
// ───────────────────────────────────────────────────────────

const issueKey = ref('') // ключ, введённый пользователем (напр. PROJ-123)
const issue = ref<any | null>(null) // загруженный тикет целиком
const fieldNames = ref<Record<string, string>>({}) // { fieldId: человекочитаемое имя }
const editableFields = ref<any[]>([]) // редактируемые поля из editmeta (с добавленным key)
const form = ref<Record<string, any>>({}) // значения редактируемых полей: { fieldId: value }
const transitions = ref<any[]>([]) // доступные переходы воркфлоу
const comments = ref<any[]>([]) // комментарии тикета
const newComment = ref('') // черновик нового комментария
const editingKeys = ref<Record<string, boolean>>({}) // какие поля сейчас редактируются
const status = ref<Status>({ kind: 'idle', message: '' })

// Пользовательские кнопки — общие для всех тикетов, сохраняются в chrome.storage.
const customButtons = persisted<CustomButton[]>('customButtons', [])

// ───────────────────────────────────────────────────────────
// Преобразование значений Jira → значения формы
// ───────────────────────────────────────────────────────────

/**
 * Превращает значение поля из ответа Jira (read-форма) в значение, которое
 * понимают наши компоненты полей (то же, что готовит getInitialValue/serializeForm).
 */
function toFormValue(field: any, raw: any): any {
  const schema = field.schema
  const type = schema?.type
  const items = schema?.items

  // пустые значения — по типу поля
  if (raw === null || raw === undefined) {
    if (type === 'array') return []
    if (type === 'timetracking') return {}
    return ''
  }

  if (field.key === 'description' || schema?.system === 'description') {
    return adfToText(raw).trim()
  }
  if (type === 'string' || type === 'date') return raw
  if (type === 'option' || type === 'priority' || type === 'project' || type === 'issuetype') {
    return String(raw.id ?? '')
  }
  if (type === 'user') return raw.accountId ?? ''
  if (type === 'issuelink') return raw.key ?? ''
  if (type === 'array') {
    if (items === 'string') return Array.isArray(raw) ? raw : []
    return Array.isArray(raw) ? raw : []
  }
  if (type === 'timetracking') return raw
  return ''
}

/** Человекочитаемое представление произвольного значения тикета (для режима просмотра). */
export function humanizeRaw(v: any): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) return v.length ? v.map(humanizeRaw).join(', ') : '—'
  if (typeof v === 'object') {
    if (v.type === 'doc') return adfToText(v).trim() || '—'
    return v.displayName ?? v.name ?? v.value ?? v.key ?? v.emailAddress ?? JSON.stringify(v)
  }
  return String(v)
}

// ───────────────────────────────────────────────────────────
// Загрузка тикета
// ───────────────────────────────────────────────────────────

/** Загружает тикет, editmeta, переходы и комментарии; заполняет форму. */
async function openIssue(): Promise<void> {
  const store = useAppStore()
  const key = issueKey.value.trim()
  if (!key) {
    status.value = { kind: 'error', message: 'Введите ключ тикета' }
    return
  }
  if (!store.baseUrl.value.trim()) {
    status.value = { kind: 'error', message: 'Не указан baseUrl (в настройках)' }
    return
  }

  try {
    status.value = { kind: 'idle', message: 'Загрузка тикета...' }
    const config = store.jiraConfig()
    const [issueData, meta, trans, comm] = await Promise.all([
      fetchIssue(config, key),
      fetchEditMeta(config, key),
      fetchTransitions(config, key),
      fetchComments(config, key),
    ])

    issue.value = issueData
    fieldNames.value = issueData.names ?? {}
    transitions.value = trans
    comments.value = comm

    // editmeta отдаёт поля объектом { id: {...} } — приводим к массиву с key.
    const fields = Object.entries(meta).map(([k, f]) => ({ key: k, ...(f as any) }))
    editableFields.value = fields

    // начальные значения формы — из текущих значений тикета
    const nextForm: Record<string, any> = {}
    for (const field of fields) {
      nextForm[field.key] = toFormValue(field, issueData.fields?.[field.key])
    }
    form.value = nextForm

    editingKeys.value = {}
    status.value = { kind: 'ok', message: `Загружен ${issueData.key}` }
  } catch (e: any) {
    issue.value = null
    status.value = { kind: 'error', message: e.message ?? String(e) }
  }
}

/** Перечитывает уже открытый тикет (после сохранения, комментария или перехода). */
async function reload(): Promise<void> {
  if (!issue.value) return
  issueKey.value = issue.value.key
  await openIssue()
}

// ───────────────────────────────────────────────────────────
// Редактирование отдельных полей
// ───────────────────────────────────────────────────────────

/** Открыто ли редактирование конкретного поля. */
function isEditing(key: string): boolean {
  return !!editingKeys.value[key]
}

/** Включает редактирование поля. */
function startEdit(key: string): void {
  editingKeys.value = { ...editingKeys.value, [key]: true }
}

/** Отменяет редактирование поля и возвращает исходное значение. */
function cancelEdit(key: string): void {
  const field = editableFields.value.find((f) => f.key === key)
  if (field) {
    form.value = { ...form.value, [key]: toFormValue(field, issue.value?.fields?.[key]) }
  }
  const next = { ...editingKeys.value }
  delete next[key]
  editingKeys.value = next
}

/** Сохраняет одно поле (PUT только с ним) и перечитывает тикет. */
async function saveField(key: string): Promise<void> {
  const store = useAppStore()
  if (!issue.value) return
  const field = editableFields.value.find((f) => f.key === key)
  if (!field) return
  try {
    status.value = { kind: 'idle', message: 'Сохранение...' }
    const payload = serializeForm({ [key]: form.value[key] }, [field])
    await updateIssue(store.jiraConfig(), issue.value.key, payload)
    status.value = { kind: 'ok', message: 'Сохранено' }
    await reload()
  } catch (e: any) {
    status.value = { kind: 'error', message: e.message ?? String(e) }
  }
}

// ───────────────────────────────────────────────────────────
// Комментарии
// ───────────────────────────────────────────────────────────

/** Добавляет комментарий из черновика и перечитывает список. */
async function addComment(): Promise<void> {
  const store = useAppStore()
  if (!issue.value) return
  const text = newComment.value.trim()
  if (!text) return
  try {
    status.value = { kind: 'idle', message: 'Добавление комментария...' }
    await postComment(store.jiraConfig(), issue.value.key, text)
    newComment.value = ''
    comments.value = await fetchComments(store.jiraConfig(), issue.value.key)
    status.value = { kind: 'ok', message: 'Комментарий добавлен' }
  } catch (e: any) {
    status.value = { kind: 'error', message: e.message ?? String(e) }
  }
}

// ───────────────────────────────────────────────────────────
// Воркфлоу
// ───────────────────────────────────────────────────────────

/** Выполняет переход воркфлоу по id и перечитывает тикет. */
async function changeStatus(transitionId: string): Promise<void> {
  const store = useAppStore()
  if (!issue.value) return
  try {
    status.value = { kind: 'idle', message: 'Смена статуса...' }
    await applyTransition(store.jiraConfig(), issue.value.key, transitionId)
    status.value = { kind: 'ok', message: 'Статус изменён' }
    await reload()
  } catch (e: any) {
    status.value = { kind: 'error', message: e.message ?? String(e) }
  }
}

// ───────────────────────────────────────────────────────────
// Пользовательские кнопки-действия
// ───────────────────────────────────────────────────────────

/** Добавляет пользовательскую кнопку. */
function addButton(button: Omit<CustomButton, 'id'>): void {
  const id = customButtons.value.reduce((max, b) => Math.max(max, b.id), 0) + 1
  customButtons.value = [...customButtons.value, { id, ...button }]
}

/** Удаляет пользовательскую кнопку по id. */
function removeButton(id: number): void {
  customButtons.value = customButtons.value.filter((b) => b.id !== id)
}

/**
 * Выполняет действие кнопки: сначала переход воркфлоу (если задан и доступен),
 * затем автокомментарий (если задан), затем перечитывает тикет.
 */
async function runButton(button: CustomButton): Promise<void> {
  const store = useAppStore()
  if (!issue.value) return
  try {
    status.value = { kind: 'idle', message: `Выполняю «${button.label}»...` }
    const config = store.jiraConfig()

    if (button.transitionName?.trim()) {
      const target = transitions.value.find(
        (t) => t.name?.toLowerCase() === button.transitionName!.trim().toLowerCase()
      )
      if (!target) {
        throw new Error(`Переход «${button.transitionName}» недоступен из текущего статуса`)
      }
      await applyTransition(config, issue.value.key, target.id)
    }

    if (button.comment?.trim()) {
      await postComment(config, issue.value.key, button.comment.trim())
    }

    status.value = { kind: 'ok', message: `«${button.label}» выполнено` }
    await reload()
  } catch (e: any) {
    status.value = { kind: 'error', message: e.message ?? String(e) }
  }
}

/** Читает пользовательские кнопки из chrome.storage. Вызывается при открытии страницы. */
async function hydrate(): Promise<void> {
  const data = await chrome.storage.local.get(['customButtons'])
  if (Array.isArray(data.customButtons)) {
    customButtons.value = data.customButtons
  }
}

/** Точка доступа к состоянию и действиям страницы «Тикет». */
export function useIssue() {
  return {
    // состояние
    issueKey,
    issue,
    fieldNames,
    editableFields,
    form,
    transitions,
    comments,
    newComment,
    status,
    customButtons,
    // редактирование полей
    isEditing,
    startEdit,
    cancelEdit,
    saveField,
    // действия
    openIssue,
    addComment,
    changeStatus,
    addButton,
    removeButton,
    runButton,
    hydrate,
  }
}
